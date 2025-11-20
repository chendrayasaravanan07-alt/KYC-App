const mongoose = require('mongoose');

/**
 * KYC Schema - Know Your Customer Application Model
 * Handles document verification, facial recognition, and risk assessment
 */

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['aadhaar', 'pan', 'address', 'passport', 'voter_id', 'driving_license'],
    required: true
  },
  images: [{
    type: String,
    required: true // File paths or URLs
  }],
  ocrData: {
    extractedText: String,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    fields: {
      name: String,
      dob: String,
      aadhaarNumber: String,
      panNumber: String,
      passportNumber: String,
      voterIdNumber: String,
      drivingLicenseNumber: String,
      address: String,
      fatherName: String,
      issueDate: String,
      expiryDate: String
    },
    processedAt: Date,
    processingTime: Number // in milliseconds
  },
  qualityMetrics: {
    blurScore: Number,
    glareScore: Number,
    brightness: Number,
    contrast: Number,
    sharpness: Number,
    isValid: Boolean
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'manual_review'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: String
}, { _id: true });

const faceVerificationSchema = new mongoose.Schema({
  selfieImage: String,
  documentFaceImage: String,
  faceMatch: {
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    match: Boolean,
    algorithm: {
      type: String,
      default: 'deep_learning'
    },
    processedAt: Date,
    processingTime: Number
  },
  livenessCheck: {
    passed: Boolean,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    challenges: [{
      type: {
        type: String,
        enum: ['blink', 'smile', 'head_turn', 'head_movement']
      },
      completed: Boolean,
      confidence: Number,
      duration: Number,
      timestamp: Date
    }],
    antiSpoofingScore: Number,
    videoAnalysis: {
      hasMotion: Boolean,
      faceConsistency: Number,
      lightingVariation: Boolean,
      backgroundAnalysis: String
    },
    processedAt: Date,
    processingTime: Number
  },
  verifiedAt: Date
}, { _id: true });

const riskAssessmentSchema = new mongoose.Schema({
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  factors: {
    documentQuality: Number,
    identityMatch: Number,
    livenessScore: Number,
    dataConsistency: Number,
    locationRisk: Number,
    deviceRisk: Number,
    behaviorPattern: Number,
    historicalData: Number
  },
  flags: [{
    type: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    detectedAt: {
      type: Date,
      default: Date.now
    }
  }],
  recommendedActions: [String],
  requiresManualReview: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assessedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const kycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  applicationId: {
    type: String,
    required: true,
    unique: true
  },
  documents: [documentSchema],
  faceVerification: faceVerificationSchema,
  riskAssessment: riskAssessmentSchema,
  additionalData: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop']
    },
    platform: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number],
      city: String,
      state: String,
      country: String
    },
    sessionDuration: Number,
    completionTime: Number // Total time to complete KYC
  },
  status: {
    type: String,
    enum: ['initiated', 'documents_uploaded', 'processing', 'verified', 'rejected', 'manual_review'],
    default: 'initiated'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  approvedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  processingSteps: [{
    step: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    error: String
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KYC'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
kycSchema.index({ userId: 1 });
kycSchema.index({ applicationId: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ createdAt: -1 });
kycSchema.index({ 'riskAssessment.score': -1 });
kycSchema.index({ 'documents.verificationStatus': 1 });

// Generate unique application ID
kycSchema.pre('save', function(next) {
  if (!this.applicationId) {
    this.applicationId = 'KYC' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// Virtual fields for computed properties
kycSchema.virtual('isComplete').get(function() {
  return this.documents.length > 0 && this.faceVerification && this.riskAssessment;
});

kycSchema.virtual('overallConfidence').get(function() {
  if (!this.isComplete) return 0;

  const docConfidence = this.documents.reduce((acc, doc) => {
    return acc + (doc.ocrData.confidence || 0);
  }, 0) / this.documents.length;

  const faceConfidence = this.faceVerification.faceMatch.confidence || 0;
  const livenessConfidence = this.faceVerification.livenessCheck.confidence || 0;

  return (docConfidence + faceConfidence + livenessConfidence) / 3;
});

kycSchema.virtual('processingTime').get(function() {
  if (!this.processingSteps || this.processingSteps.length === 0) return 0;

  return this.processingSteps.reduce((total, step) => {
    return total + (step.duration || 0);
  }, 0);
});

// Instance methods
kycSchema.methods.addProcessingStep = function(step, status, error = null) {
  const existingStep = this.processingSteps.find(s => s.step === step);

  if (existingStep) {
    existingStep.status = status;
    if (status === 'completed') {
      existingStep.completedAt = new Date();
      existingStep.duration = existingStep.completedAt - existingStep.startedAt;
    }
    if (error) existingStep.error = error;
  } else {
    this.processingSteps.push({
      step,
      status,
      startedAt: new Date(),
      completedAt: status === 'completed' ? new Date() : undefined,
      duration: status === 'completed' ? 0 : undefined,
      error
    });
  }

  return this.save();
};

kycSchema.methods.updateStatus = function(status, reviewedBy = null, notes = '') {
  this.status = status;

  if (status === 'verified') {
    this.approvedAt = new Date();
  }

  if (reviewedBy) {
    this.reviewedBy = reviewedBy;
    this.reviewedAt = new Date();
  }

  if (notes) {
    this.adminNotes = notes;
  }

  return this.save();
};

// Static methods
kycSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$additionalData.completionTime' },
        avgRiskScore: { $avg: '$riskAssessment.score' }
      }
    }
  ]);

  const total = await this.countDocuments();
  const verified = await this.countDocuments({ status: 'verified' });
  const rejected = await this.countDocuments({ status: 'rejected' });
  const pending = await this.countDocuments({ status: 'pending' });

  return {
    total,
    verified,
    rejected,
    pending,
    verificationRate: total > 0 ? (verified / total * 100).toFixed(2) : 0,
    rejectionRate: total > 0 ? (rejected / total * 100).toFixed(2) : 0,
    breakdown: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        avgProcessingTime: Math.round(stat.avgProcessingTime || 0),
        avgRiskScore: Math.round(stat.avgRiskScore || 0)
      };
      return acc;
    }, {})
  };
};

kycSchema.statics.findHighRiskApplications = function(threshold = 70) {
  return this.find({
    'riskAssessment.score': { $gte: threshold },
    status: { $in: ['processing', 'manual_review'] }
  })
  .populate('userId', 'email phone profile.name')
  .sort({ 'riskAssessment.score': -1 });
};

kycSchema.statics.findPendingReview = function() {
  return this.find({
    status: { $in: ['processing', 'manual_review'] }
  })
  .populate('userId', 'email phone profile.name')
  .sort({ createdAt: 1 });
};

module.exports = mongoose.model('KYC', kycSchema);