const winston = require('winston');
const sharp = require('sharp');

/**
 * Fraud Detection and Risk Assessment Service
 * Analyzes KYC data for fraud patterns and calculates risk scores
 */

class FlagService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [RISK]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });

    // Risk factor weights
    this.riskWeights = {
      documentQuality: 0.25,
      identityMatch: 0.30,
      livenessScore: 0.20,
      dataConsistency: 0.15,
      locationRisk: 0.10
    };
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assessRisk(kycData) {
    try {
      this.logger.info('Starting comprehensive risk assessment');

      const assessment = {
        score: 0,
        riskLevel: 'low',
        factors: {},
        flags: [],
        recommendedActions: [],
        requiresManualReview: false,
        assessedAt: new Date()
      };

      // Assess each risk factor
      assessment.factors.documentQuality = await this.assessDocumentQuality(kycData.documents);
      assessment.factors.identityMatch = await this.assessIdentityMatch(kycData);
      assessment.factors.livenessScore = await this.assessLivenessScore(kycData.faceVerification);
      assessment.factors.dataConsistency = await this.assessDataConsistency(kycData);
      assessment.factors.locationRisk = await this.assessLocationRisk(kycData.additionalData);

      // Calculate overall risk score (0-100, higher = more risky)
      assessment.score = this.calculateOverallRiskScore(assessment.factors);

      // Determine risk level
      assessment.riskLevel = this.determineRiskLevel(assessment.score);

      // Generate risk flags
      assessment.flags = this.generateRiskFlags(assessment.factors, assessment.score);

      // Generate recommended actions
      assessment.recommendedActions = this.generateRecommendedActions(assessment.riskLevel, assessment.flags);

      // Determine if manual review is required
      assessment.requiresManualReview = assessment.score >= 70 || assessment.flags.some(f => f.severity === 'critical');

      this.logger.info(`Risk assessment completed: ${assessment.score} (${assessment.riskLevel} risk)`);

      return assessment;
    } catch (error) {
      this.logger.error(`Risk assessment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assess document quality and authenticity
   */
  async assessDocumentQuality(documents) {
    if (!documents || documents.length === 0) {
      return { score: 100, issues: ['No documents provided'] };
    }

    const qualityScores = [];
    const issues = [];

    for (const doc of documents) {
      let docScore = 0;

      // Check OCR confidence
      if (doc.ocrData && doc.ocrData.confidence) {
        const ocrScore = Math.max(0, 100 - doc.ocrData.confidence);
        docScore += ocrScore * 0.4;

        if (doc.ocrData.confidence < 70) {
          issues.push(`Low OCR confidence for ${doc.type}: ${doc.ocrData.confidence}%`);
        }
      }

      // Check image quality metrics
      if (doc.qualityMetrics) {
        const quality = doc.qualityMetrics;
        let qualityScore = 0;

        // Blur detection
        if (quality.blurScore !== undefined) {
          const blurRisk = quality.blurScore < 50 ? 20 : 0;
          qualityScore += blurRisk;
          if (quality.blurScore < 50) {
            issues.push(`Blurry ${doc.type} document detected`);
          }
        }

        // Glare detection
        if (quality.glareScore !== undefined && quality.glareScore > 70) {
          qualityScore += 15;
          issues.push(`Glare detected on ${doc.type} document`);
        }

        // Brightness/contrast
        if (quality.brightness !== undefined && (quality.brightness < 30 || quality.brightness > 70)) {
          qualityScore += 10;
          issues.push(`Poor lighting on ${doc.type} document`);
        }

        docScore += qualityScore * 0.3;
      }

      // Check for tampering indicators
      const tamperingScore = await this.detectTampering(doc);
      docScore += tamperingScore * 0.3;

      qualityScores.push(Math.min(100, docScore));
    }

    const avgScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    return {
      score: Math.round(avgScore),
      issues,
      documentCount: documents.length,
      averageQuality: Math.round(100 - avgScore)
    };
  }

  /**
   * Assess identity match between documents and selfie
   */
  async assessIdentityMatch(kycData) {
    let matchScore = 50; // Default to medium risk
    const issues = [];

    if (kycData.faceVerification && kycData.faceVerification.faceMatch) {
      const faceMatch = kycData.faceVerification.faceMatch;
      matchScore = Math.max(0, 100 - faceMatch.confidence);

      if (faceMatch.confidence < 60) {
        issues.push(`Low face match confidence: ${faceMatch.confidence}%`);
      }
    } else {
      issues.push('No face verification performed');
      matchScore = 80;
    }

    // Check name consistency across documents
    const nameConsistency = this.checkNameConsistency(kycData.documents);
    if (nameConsistency.score > 50) {
      matchScore += nameConsistency.score * 0.2;
      issues.push(...nameConsistency.issues);
    }

    // Check document type appropriateness
    const docTypeCheck = this.validateDocumentTypes(kycData.documents);
    matchScore += docTypeCheck.score * 0.1;
    if (docTypeCheck.issues.length > 0) {
      issues.push(...docTypeCheck.issues);
    }

    return {
      score: Math.min(100, Math.round(matchScore)),
      faceMatchConfidence: kycData.faceVerification?.faceMatch?.confidence || 0,
      nameConsistency: nameConsistency.score,
      issues
    };
  }

  /**
   * Assess liveness detection score
   */
  async assessLivenessScore(faceVerification) {
    if (!faceVerification || !faceVerification.livenessCheck) {
      return { score: 80, issues: ['No liveness check performed'] };
    }

    const liveness = faceVerification.livenessCheck;
    let riskScore = 0;
    const issues = [];

    // Check if liveness check passed
    if (!liveness.passed) {
      riskScore += 40;
      issues.push('Liveness check failed');
    }

    // Check confidence score
    if (liveness.confidence < 70) {
      riskScore += (70 - liveness.confidence) * 0.5;
      issues.push(`Low liveness confidence: ${liveness.confidence}%`);
    }

    // Check challenge completion
    if (liveness.challenges) {
      const failedChallenges = liveness.challenges.filter(c => !c.completed);
      if (failedChallenges.length > 0) {
        riskScore += failedChallenges.length * 10;
        issues.push(`${failedChallenges.length} liveness challenges failed`);
      }
    }

    // Check anti-spoofing score
    if (liveness.antiSpoofingScore !== undefined && liveness.antiSpoofingScore < 60) {
      riskScore += 20;
      issues.push(`Low anti-spoofing score: ${liveness.antiSpoofingScore}`);
    }

    // Check video analysis
    if (liveness.videoAnalysis) {
      const video = liveness.videoAnalysis;
      if (!video.hasMotion) {
        riskScore += 15;
        issues.push('No motion detected in liveness video');
      }
      if (video.faceConsistency < 70) {
        riskScore += 10;
        issues.push('Inconsistent face detection during liveness check');
      }
    }

    return {
      score: Math.min(100, Math.round(riskScore)),
      confidence: liveness.confidence || 0,
      antiSpoofingScore: liveness.antiSpoofingScore || 0,
      challengesCompleted: liveness.challenges?.filter(c => c.completed).length || 0,
      issues
    };
  }

  /**
   * Assess data consistency across documents
   */
  async assessDataConsistency(kycData) {
    let consistencyScore = 0;
    const issues = [];

    if (!kycData.documents || kycData.documents.length < 2) {
      return { score: 30, issues: ['Insufficient documents for consistency check'] };
    }

    // Extract data from all documents
    const extractedData = kycData.documents.map(doc => ({
      type: doc.type,
      name: doc.ocrData?.fields?.name,
      dob: doc.ocrData?.fields?.dob,
      address: doc.ocrData?.fields?.address
    }));

    // Check name consistency
    const nameCheck = this.checkNameConsistency(kycData.documents);
    consistencyScore += nameCheck.score * 0.4;
    issues.push(...nameCheck.issues);

    // Check date of birth consistency
    const dobCheck = this.checkDOBConsistency(extractedData);
    consistencyScore += dobCheck.score * 0.3;
    issues.push(...dobCheck.issues);

    // Check address consistency
    const addressCheck = this.checkAddressConsistency(extractedData);
    consistencyScore += addressCheck.score * 0.3;
    issues.push(...addressCheck.issues);

    return {
      score: Math.min(100, Math.round(consistencyScore)),
      nameConsistency: nameCheck.score,
      dobConsistency: dobCheck.score,
      addressConsistency: addressCheck.score,
      issues
    };
  }

  /**
   * Assess location-based risk
   */
  async assessLocationRisk(additionalData) {
    if (!additionalData || !additionalData.location) {
      return { score: 20, issues: ['No location data available'] };
    }

    let riskScore = 20; // Base risk
    const issues = [];

    const location = additionalData.location;

    // Check for high-risk locations (simplified)
    const highRiskRegions = ['XX', 'YY', 'ZZ']; // Replace with actual risk regions
    if (location.state && highRiskRegions.includes(location.state)) {
      riskScore += 30;
      issues.push(`High-risk location detected: ${location.state}`);
    }

    // Check for impossible travel (if multiple KYC attempts)
    if (additionalData.previousLocations) {
      const travelRisk = this.assessTravelRisk(location, additionalData.previousLocations);
      riskScore += travelRisk.score;
      issues.push(...travelRisk.issues);
    }

    // Check IP-based risk (simplified)
    if (additionalData.ipAddress) {
      const ipRisk = await this.assessIPRisk(additionalData.ipAddress);
      riskScore += ipRisk.score;
      issues.push(...ipRisk.issues);
    }

    return {
      score: Math.min(100, Math.round(riskScore)),
      location: location,
      issues
    };
  }

  /**
   * Calculate overall risk score from individual factors
   */
  calculateOverallRiskScore(factors) {
    let totalScore = 0;

    Object.entries(this.riskWeights).forEach(([factor, weight]) => {
      const factorScore = factors[factor]?.score || 0;
      totalScore += factorScore * weight;
    });

    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate risk flags based on assessment
   */
  generateRiskFlags(factors, overallScore) {
    const flags = [];

    // Document quality flags
    if (factors.documentQuality.score > 60) {
      flags.push({
        type: 'document_quality',
        severity: factors.documentQuality.score > 80 ? 'high' : 'medium',
        description: 'Poor document quality detected',
        details: factors.documentQuality.issues
      });
    }

    // Identity match flags
    if (factors.identityMatch.score > 70) {
      flags.push({
        type: 'identity_mismatch',
        severity: factors.identityMatch.score > 85 ? 'high' : 'medium',
        description: 'Identity verification issues',
        details: factors.identityMatch.issues
      });
    }

    // Liveness flags
    if (factors.livenessScore.score > 50) {
      flags.push({
        type: 'liveness_suspicious',
        severity: factors.livenessScore.score > 70 ? 'high' : 'medium',
        description: 'Suspicious liveness detection',
        details: factors.livenessScore.issues
      });
    }

    // Data consistency flags
    if (factors.dataConsistency.score > 60) {
      flags.push({
        type: 'data_inconsistency',
        severity: factors.dataConsistency.score > 80 ? 'critical' : 'high',
        description: 'Data inconsistencies found',
        details: factors.dataConsistency.issues
      });
    }

    return flags;
  }

  /**
   * Generate recommended actions based on risk level
   */
  generateRecommendedActions(riskLevel, flags) {
    const actions = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('Immediate manual review required');
        actions.push('Consider temporarily suspending account');
        actions.push('Additional documentation required');
        break;
      case 'high':
        actions.push('Manual review recommended');
        actions.push('Enhanced verification procedures');
        break;
      case 'medium':
        actions.push('Additional verification checks');
        if (flags.some(f => f.type === 'document_quality')) {
          actions.push('Request better quality documents');
        }
        break;
      case 'low':
        actions.push('Standard processing');
        break;
    }

    return actions;
  }

  /**
   * Detect document tampering (simplified implementation)
   */
  async detectTampering(document) {
    // In production, implement actual tampering detection algorithms
    // This is a simplified simulation
    return Math.random() * 20; // 0-20 risk score
  }

  /**
   * Check name consistency across documents
   */
  checkNameConsistency(documents) {
    const names = documents
      .map(doc => doc.ocrData?.fields?.name)
      .filter(name => name && name.trim() !== '');

    if (names.length < 2) {
      return { score: 0, issues: [] };
    }

    // Simple name similarity check
    const similarity = this.calculateNameSimilarity(names);
    const riskScore = Math.max(0, 100 - similarity * 100);

    const issues = similarity < 0.8 ? [`Name inconsistency detected: ${names.join(', ')}`] : [];

    return { score: riskScore, similarity, issues };
  }

  /**
   * Calculate name similarity
   */
  calculateNameSimilarity(names) {
    if (names.length < 2) return 1;

    let totalSimilarity = 0;
    const baseName = names[0].toLowerCase().replace(/\s+/g, '');

    for (let i = 1; i < names.length; i++) {
      const compareName = names[i].toLowerCase().replace(/\s+/g, '');
      const similarity = this.stringSimilarity(baseName, compareName);
      totalSimilarity += similarity;
    }

    return totalSimilarity / (names.length - 1);
  }

  /**
   * String similarity calculation
   */
  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check DOB consistency
   */
  checkDOBConsistency(extractedData) {
    const dobs = extractedData
      .map(data => data.dob)
      .filter(dob => dob && dob.trim() !== '');

    if (dobs.length < 2) {
      return { score: 0, issues: [] };
    }

    const normalizedDobs = dobs.map(dob => new Date(dob).toISOString().split('T')[0]);
    const uniqueDobs = [...new Set(normalizedDobs)];

    const riskScore = uniqueDobs.length > 1 ? 50 : 0;
    const issues = uniqueDobs.length > 1 ? [`DOB inconsistency: ${uniqueDobs.join(', ')}`] : [];

    return { score: riskScore, issues };
  }

  /**
   * Check address consistency
   */
  checkAddressConsistency(extractedData) {
    const addresses = extractedData
      .map(data => data.address)
      .filter(addr => addr && addr.trim() !== '');

    if (addresses.length < 2) {
      return { score: 0, issues: [] };
    }

    // Simplified address comparison
    const similarity = this.calculateAddressSimilarity(addresses);
    const riskScore = Math.max(0, 50 - similarity * 50);

    const issues = similarity < 0.6 ? [`Address inconsistency detected`] : [];

    return { score: riskScore, similarity, issues };
  }

  /**
   * Calculate address similarity
   */
  calculateAddressSimilarity(addresses) {
    if (addresses.length < 2) return 1;

    let totalSimilarity = 0;
    const baseAddress = addresses[0].toLowerCase().replace(/[^a-z0-9\s]/g, '');

    for (let i = 1; i < addresses.length; i++) {
      const compareAddress = addresses[i].toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const similarity = this.stringSimilarity(baseAddress, compareAddress);
      totalSimilarity += similarity;
    }

    return totalSimilarity / (addresses.length - 1);
  }

  /**
   * Validate document types
   */
  validateDocumentTypes(documents) {
    const validTypes = ['aadhaar', 'pan', 'address', 'passport', 'voter_id', 'driving_license'];
    const issues = [];
    let riskScore = 0;

    documents.forEach(doc => {
      if (!validTypes.includes(doc.type)) {
        riskScore += 20;
        issues.push(`Invalid document type: ${doc.type}`);
      }
    });

    // Check for required document combinations
    const hasAadhaar = documents.some(doc => doc.type === 'aadhaar');
    const hasPAN = documents.some(doc => doc.type === 'pan');

    if (!hasAadhaar && !hasPAN) {
      riskScore += 15;
      issues.push('Missing primary identity document (Aadhaar/PAN)');
    }

    return { score: riskScore, issues };
  }

  /**
   * Assess travel risk
   */
  assessTravelRisk(currentLocation, previousLocations) {
    // Simplified travel risk assessment
    return { score: 0, issues: [] };
  }

  /**
   * Assess IP-based risk
   */
  async assessIPRisk(ipAddress) {
    // Simplified IP risk assessment
    return { score: 0, issues: [] };
  }
}

module.exports = FlagService;