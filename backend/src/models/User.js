const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto-js');

/**
 * User Schema - KYC System User Model
 * Handles user authentication, profile data, and KYC status tracking
 */

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't return password in queries by default
  },
  profile: {
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    dateOfBirth: {
      type: Date,
      required: false
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'in_progress'],
      default: 'pending'
    },
    kycCompletedAt: Date,
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: false,
        validate: {
          validator: function(coordinates) {
            return coordinates.length === 2 &&
                   coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
                   coordinates[1] >= -90 && coordinates[1] <= 90;     // latitude
          },
          message: 'Invalid GPS coordinates'
        }
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerificationOTP: String,
  phoneVerificationExpiry: Date,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  lastLoginAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  role: {
    type: String,
    enum: ['user', 'admin', 'verifier'],
    default: 'user'
  },
  // Suspension fields
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspendedAt: Date,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  activatedAt: Date,
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditLogs: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location-based queries
userSchema.index({ 'profile.lastLocation': '2dsphere' });

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'profile.kycStatus': 1 });
userSchema.index({ role: 1 });
userSchema.index({ isSuspended: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost factor of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for email/phone encryption
userSchema.pre('save', async function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) return next();

  try {
    if (this.isModified('email') && this.email) {
      this.email = crypto.AES.encrypt(this.email, encryptionKey).toString();
    }
    if (this.isModified('phone') && this.phone) {
      this.phone = crypto.AES.encrypt(this.phone, encryptionKey).toString();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.loginAttempts >= 5 && this.isLocked) {
    return false;
  }

  const isMatch = await bcrypt.compare(candidatePassword, this.password);

  if (isMatch) {
    // Reset login attempts on successful login
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  } else {
    // Increment login attempts on failed login
    this.loginAttempts += 1;

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }
  }

  await this.save();
  return isMatch;
};

// Instance method to add audit log
userSchema.methods.addAuditLog = function(action, details = {}, ipAddress = '', userAgent = '') {
  this.auditLogs.push({
    action,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    details
  });

  // Keep only last 100 audit log entries
  if (this.auditLogs.length > 100) {
    this.auditLogs = this.auditLogs.slice(-100);
  }

  return this.save();
};

// Static method to find and decrypt email
userSchema.statics.findByEmail = async function(email) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  try {
    const encryptedEmail = crypto.AES.encrypt(email.toLowerCase(), encryptionKey).toString();
    return this.findOne({ email: encryptedEmail }).select('+password');
  } catch (error) {
    // Fallback to unencrypted search for development
    return this.findOne({ email: email.toLowerCase() }).select('+password');
  }
};

// Static method to decrypt sensitive fields
userSchema.methods.decryptSensitiveFields = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) return this;

  try {
    if (this.email) {
      const decryptedEmail = crypto.AES.decrypt(this.email, encryptionKey).toString(crypto.enc.Utf8);
      if (decryptedEmail) this.email = decryptedEmail;
    }

    if (this.phone) {
      const decryptedPhone = crypto.AES.decrypt(this.phone, encryptionKey).toString(crypto.enc.Utf8);
      if (decryptedPhone) this.phone = decryptedPhone;
    }
  } catch (error) {
    // Field might already be decrypted (development mode)
  }

  return this;
};

// Static method to get user statistics
userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$profile.kycStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalUsers = await this.countDocuments();
  const verifiedUsers = await this.countDocuments({ 'profile.kycStatus': 'verified' });

  return {
    total: totalUsers,
    verified: verifiedUsers,
    verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,
    breakdown: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('User', userSchema);