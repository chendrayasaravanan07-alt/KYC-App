const express = require('express');
const { body, validationResult } = require('express-validator');
const KYC = require('../models/KYC');
const User = require('../models/User');
const OCRService = require('../services/ocr.service');
const FaceService = require('../services/face.service');
const LivenessService = require('../services/liveness.service');
const FlagService = require('../services/flag.service');
const LoanService = require('../services/loan.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const { uploadKYCDocuments, uploadSingleDocument, validateUploadedFiles } = require('../middleware/upload.middleware');

const router = express.Router();

// Initialize services
const ocrService = new OCRService();
const faceService = new FaceService();
const livenessService = new LivenessService();
const flagService = new FlagService();
const loanService = new LoanService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/kyc/initiate
 * @desc    Initiate KYC process for a user
 * @access  Private
 */
router.post('/initiate', async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if KYC already exists
    let existingKYC = await KYC.findOne({ userId });
    if (existingKYC) {
      return res.status(400).json({
        success: false,
        message: 'KYC process already initiated',
        data: {
          applicationId: existingKYC.applicationId,
          status: existingKYC.status
        }
      });
    }

    // Create new KYC application
    const newKYC = new KYC({
      userId,
      additionalData: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: req.body.deviceInfo || 'mobile',
        platform: req.body.platform || 'unknown'
      }
    });

    await newKYC.save();

    // Update user status
    await User.findByIdAndUpdate(userId, {
      'profile.kycStatus': 'in_progress'
    });

    res.status(201).json({
      success: true,
      message: 'KYC process initiated successfully',
      data: {
        applicationId: newKYC.applicationId,
        status: newKYC.status,
        nextSteps: [
          'Upload identity documents (Aadhaar/PAN)',
          'Complete face verification',
          'Submit additional information'
        ]
      }
    });
  } catch (error) {
    console.error('KYC initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating KYC process'
    });
  }
});

/**
 * @route   POST /api/kyc/upload-documents
 * @desc    Upload KYC documents for processing
 * @access  Private
 */
router.post('/upload-documents', uploadKYCDocuments, validateUploadedFiles, async (req, res) => {
  try {
    const userId = req.user._id;
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    // Find KYC application
    let kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found. Please initiate KYC first.'
      });
    }

    // Add processing step
    await kycApplication.addProcessingStep('document_upload', 'processing');

    const processedDocuments = [];

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const validation = req.fileValidation[i];

      try {
        // Perform OCR processing
        const ocrResult = await ocrService.processDocument(file.path, documentType);

        // Create document object
        const document = {
          type: documentType,
          images: [file.path],
          ocrData: {
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            fields: ocrResult.fields,
            processedAt: new Date(),
            processingTime: ocrResult.processingTime
          },
          qualityMetrics: {
            ...validation.metadata.quality,
            isValid: validation.metadata.quality?.overallScore >= 70
          },
          uploadedAt: new Date(),
          verificationStatus: ocrResult.validation.isValid ? 'verified' : 'manual_review'
        };

        // Check if document of this type already exists
        const existingDocIndex = kycApplication.documents.findIndex(doc => doc.type === documentType);
        if (existingDocIndex >= 0) {
          kycApplication.documents[existingDocIndex] = document;
        } else {
          kycApplication.documents.push(document);
        }

        processedDocuments.push({
          type: documentType,
          filename: file.filename,
          ocrConfidence: ocrResult.confidence,
          verificationStatus: document.verificationStatus,
          extractedFields: ocrResult.fields
        });

      } catch (processingError) {
        console.error(`Error processing document ${file.filename}:`, processingError);
        processedDocuments.push({
          type: documentType,
          filename: file.filename,
          error: processingError.message,
          verificationStatus: 'failed'
        });
      }
    }

    // Update KYC status
    kycApplication.status = 'documents_uploaded';
    await kycApplication.addProcessingStep('document_upload', 'completed');

    await kycApplication.save();

    res.json({
      success: true,
      message: 'Documents uploaded and processed successfully',
      data: {
        applicationId: kycApplication.applicationId,
        processedDocuments,
        documentCount: kycApplication.documents.length,
        nextSteps: ['Complete face verification']
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing uploaded documents'
    });
  }
});

/**
 * @route   POST /api/kyc/face-verification
 * @desc    Process face verification with liveness detection
 * @access  Private
 */
router.post('/face-verification', uploadSingleDocument, validateUploadedFiles, async (req, res) => {
  try {
    const userId = req.user._id;
    const { documentType } = req.body; // Document type to match face with

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required for face verification'
      });
    }

    // Find KYC application
    let kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    await kycApplication.addProcessingStep('face_verification', 'processing');

    // Find the document to match face with
    const targetDocument = kycApplication.documents.find(doc => doc.type === documentType);
    if (!targetDocument || !targetDocument.images || targetDocument.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No document found for face matching'
      });
    }

    const selfieImage = req.file.path;
    const documentImage = targetDocument.images[0];

    try {
      // Perform face matching
      const faceMatchResult = await faceService.matchFaceWithDocument(selfieImage, documentImage);

      // Initialize face verification object
      kycApplication.faceVerification = {
        selfieImage,
        documentFaceImage: documentImage,
        faceMatch: {
          confidence: faceMatchResult.confidence,
          match: faceMatchResult.match,
          algorithm: faceMatchResult.algorithm,
          processedAt: new Date(),
          processingTime: faceMatchResult.processingTime
        },
        verifiedAt: new Date()
      };

      await kycApplication.addProcessingStep('face_verification', 'completed');
      await kycApplication.save();

      res.json({
        success: true,
        message: 'Face verification completed',
        data: {
          match: faceMatchResult.match,
          confidence: faceMatchResult.confidence,
          processingTime: faceMatchResult.processingTime,
          nextSteps: ['Complete liveness detection']
        }
      });

    } catch (faceError) {
      console.error('Face verification error:', faceError);
      await kycApplication.addProcessingStep('face_verification', 'failed', faceError.message);

      res.status(400).json({
        success: false,
        message: 'Face verification failed',
        error: faceError.message
      });
    }

  } catch (error) {
    console.error('Face verification processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during face verification'
    });
  }
});

/**
 * @route   POST /api/kyc/liveness-challenge
 * @desc    Generate liveness challenges for user
 * @access  Private
 */
router.post('/liveness-challenge', async (req, res) => {
  try {
    const userId = req.user._id;

    // Find KYC application
    const kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    // Generate liveness challenges
    const challengeSession = livenessService.generateChallenges();

    // Store session data (in production, use Redis or cache)
    // For now, we'll include it in the response

    res.json({
      success: true,
      message: 'Liveness challenges generated',
      data: {
        sessionId: challengeSession.sessionId,
        challenges: challengeSession.challenges,
        totalTimeout: challengeSession.totalTimeout,
        expiresAt: challengeSession.expiresAt
      }
    });

  } catch (error) {
    console.error('Liveness challenge generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating liveness challenges'
    });
  }
});

/**
 * @route   POST /api/kyc/liveness-verification
 * @desc    Process liveness verification responses
 * @access  Private
 */
router.post('/liveness-verification', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('challengeResults').isArray().withMessage('Challenge results must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sessionId, challengeResults } = req.body;
    const userId = req.user._id;

    // Find KYC application
    let kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    await kycApplication.addProcessingStep('liveness_verification', 'processing');

    // Create mock session data (in production, retrieve from cache)
    const sessionData = {
      sessionId,
      challenges: challengeResults.map(cr => ({
        id: cr.challengeId,
        type: cr.type,
        instruction: cr.instruction
      }))
    };

    // Process challenge results
    const processedResults = [];
    for (const result of challengeResults) {
      try {
        // For each challenge, we would process images/videos
        // For now, we'll use mock image paths
        const mockImagePaths = ['mock-image.jpg'];

        const processedResult = await livenessService.processChallenge(
          result.type,
          mockImagePaths,
          result.parameters || {}
        );

        processedResults.push(processedResult);
      } catch (error) {
        processedResults.push({
          type: result.type,
          passed: false,
          confidence: 0,
          error: error.message
        });
      }
    }

    // Evaluate overall liveness session
    const livenessEvaluation = await livenessService.evaluateLivenessSession(
      sessionData,
      processedResults
    );

    // Update KYC with liveness results
    if (kycApplication.faceVerification) {
      kycApplication.faceVerification.livenessCheck = {
        passed: livenessEvaluation.passed,
        confidence: livenessEvaluation.confidence,
        challenges: processedResults,
        antiSpoofingScore: livenessEvaluation.antiSpoofingScore,
        processedAt: new Date(),
        processingTime: livenessEvaluation.summary.processingTime
      };
    }

    await kycApplication.addProcessingStep('liveness_verification', 'completed');
    await kycApplication.save();

    res.json({
      success: true,
      message: 'Liveness verification completed',
      data: {
        passed: livenessEvaluation.passed,
        confidence: livenessEvaluation.confidence,
        antiSpoofingScore: livenessEvaluation.antiSpoofingScore,
        riskFlags: livenessEvaluation.riskFlags,
        nextSteps: ['Complete risk assessment']
      }
    });

  } catch (error) {
    console.error('Liveness verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during liveness verification'
    });
  }
});

/**
 * @route   POST /api/kyc/submit
 * @desc    Submit KYC application for final processing and risk assessment
 * @access  Private
 */
router.post('/submit', async (req, res) => {
  try {
    const userId = req.user._id;

    // Find KYC application
    let kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    // Check if all required steps are completed
    if (kycApplication.documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload required documents first'
      });
    }

    if (!kycApplication.faceVerification) {
      return res.status(400).json({
        success: false,
        message: 'Please complete face verification first'
      });
    }

    await kycApplication.addProcessingStep('risk_assessment', 'processing');

    try {
      // Perform comprehensive risk assessment
      const riskAssessment = await flagService.assessRisk(kycApplication);

      // Update KYC with risk assessment
      kycApplication.riskAssessment = riskAssessment;

      // Update user risk score
      await User.findByIdAndUpdate(userId, {
        'profile.riskScore': riskAssessment.score
      });

      // Determine final status
      if (riskAssessment.score >= 80 || riskAssessment.requiresManualReview) {
        kycApplication.status = 'manual_review';
      } else if (riskAssessment.score >= 60) {
        kycApplication.status = 'pending'; // Pending admin review
      } else {
        kycApplication.status = 'verified';
      }

      await kycApplication.addProcessingStep('risk_assessment', 'completed');

      // Update user KYC status
      if (kycApplication.status === 'verified') {
        await User.findByIdAndUpdate(userId, {
          'profile.kycStatus': 'verified',
          'profile.kycCompletedAt': new Date()
        });
      }

      await kycApplication.save();

      // Prepare response data
      const responseData = {
        applicationId: kycApplication.applicationId,
        status: kycApplication.status,
        riskScore: riskAssessment.score,
        riskLevel: riskAssessment.riskLevel,
        requiresManualReview: riskAssessment.requiresManualReview,
        recommendedActions: riskAssessment.recommendedActions
      };

      // Include risk flags if any
      if (riskAssessment.flags.length > 0) {
        responseData.riskFlags = riskAssessment.flags;
      }

      const message = kycApplication.status === 'verified'
        ? 'KYC verification completed successfully!'
        : kycApplication.status === 'manual_review'
        ? 'KYC submitted for manual review due to risk factors'
        : 'KYC submitted and is pending review';

      res.json({
        success: true,
        message,
        data: responseData
      });

    } catch (riskAssessmentError) {
      console.error('Risk assessment error:', riskAssessmentError);
      await kycApplication.addProcessingStep('risk_assessment', 'failed', riskAssessmentError.message);

      res.status(500).json({
        success: false,
        message: 'Error during risk assessment'
      });
    }

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting KYC application'
    });
  }
});

/**
 * @route   GET /api/kyc/status
 * @desc    Get KYC application status
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user._id;

    // Find KYC application
    const kycApplication = await KYC.findOne({ userId });
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    // Prepare status response
    const statusData = {
      applicationId: kycApplication.applicationId,
      status: kycApplication.status,
      createdAt: kycApplication.createdAt,
      processingSteps: kycApplication.processingSteps,
      isComplete: kycApplication.isComplete,
      overallConfidence: kycApplication.overallConfidence,
      processingTime: kycApplication.processingTime
    };

    // Include document summary
    if (kycApplication.documents.length > 0) {
      statusData.documents = kycApplication.documents.map(doc => ({
        type: doc.type,
        verificationStatus: doc.verificationStatus,
        ocrConfidence: doc.ocrData?.confidence || 0,
        uploadedAt: doc.uploadedAt
      }));
    }

    // Include face verification summary
    if (kycApplication.faceVerification) {
      statusData.faceVerification = {
        match: kycApplication.faceVerification.faceMatch?.match || false,
        confidence: kycApplication.faceVerification.faceMatch?.confidence || 0,
        livenessPassed: kycApplication.faceVerification.livenessCheck?.passed || false,
        livenessConfidence: kycApplication.faceVerification.livenessCheck?.confidence || 0
      };
    }

    // Include risk assessment if available
    if (kycApplication.riskAssessment) {
      statusData.riskAssessment = {
        score: kycApplication.riskAssessment.score,
        riskLevel: kycApplication.riskAssessment.riskLevel,
        requiresManualReview: kycApplication.riskAssessment.requiresManualReview
      };
    }

    res.json({
      success: true,
      data: statusData
    });

  } catch (error) {
    console.error('KYC status fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching KYC status'
    });
  }
});

/**
 * @route   POST /api/kyc/loan-assessment
 * @desc    Assess loan eligibility based on KYC data
 * @access  Private
 */
router.post('/loan-assessment', [
  body('incomeDetails').notEmpty().withMessage('Income details are required'),
  body('employmentDetails').notEmpty().withMessage('Employment details are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const loanDetails = req.body;

    // Find KYC application
    const kycApplication = await KYC.findOne({ userId });
    if (!kycApplication || kycApplication.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'KYC must be verified before loan assessment'
      });
    }

    // Perform loan assessment
    const loanAssessment = await loanService.assessLoanEligibility(
      userId,
      kycApplication,
      loanDetails
    );

    res.json({
      success: true,
      message: 'Loan assessment completed',
      data: loanAssessment
    });

  } catch (error) {
    console.error('Loan assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during loan assessment'
    });
  }
});

module.exports = router;