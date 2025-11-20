const express = require('express');
const { body, validationResult, query } = require('express-validator');
const KYC = require('../models/KYC');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Admin rate limiting (more restrictive)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and rate limiting to all admin routes
router.use(authMiddleware);
router.use(adminLimiter);

/**
 * Middleware to check admin role
 * For this implementation, we'll use a simple check.
 * In production, implement proper role-based access control.
 */
const requireAdminRole = async (req, res, next) => {
  try {
    // Simple admin check - in production, use proper role management
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@kyc.com'];
    const isAdmin = adminEmails.includes(req.user.email);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin role check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying admin role'
    });
  }
};

// Apply admin role check to all routes
router.use(requireAdminRole);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get overall statistics
    const userStats = await User.getStatistics();
    const kycStats = await KYC.getStatistics();

    // Get recent KYC applications
    const recentKYCs = await KYC.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'email phone profile.name')
      .select('applicationId status createdAt userId riskAssessment');

    // Get high-risk applications
    const highRiskKYCs = await KYC.findHighRiskApplications(70);

    // Get pending review applications
    const pendingReviews = await KYC.findPendingReview();

    // Calculate processing metrics
    const processingMetrics = await calculateProcessingMetrics();

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        statistics: {
          users: userStats,
          kyc: kycStats,
          processing: processingMetrics
        },
        recentApplications: recentKYCs.map(kyc => ({
          applicationId: kyc.applicationId,
          userName: kyc.userId?.profile?.name || 'Unknown',
          userEmail: kyc.userId?.email || 'Unknown',
          status: kyc.status,
          riskScore: kyc.riskAssessment?.score || 0,
          createdAt: kyc.createdAt
        })),
        highRiskApplications: highRiskKYCs.length,
        pendingReviews: pendingReviews.length,
        alerts: await generateSystemAlerts()
      }
    });

  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

/**
 * @route   GET /api/admin/kyc/list
 * @desc    Get list of KYC applications with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/kyc/list', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['initiated', 'documents_uploaded', 'processing', 'verified', 'rejected', 'manual_review', 'pending']),
  query('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
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

    const {
      page = 1,
      limit = 20,
      status,
      riskLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (riskLevel) {
      query['riskAssessment.riskLevel'] = riskLevel;
    }

    if (search) {
      query.$or = [
        { 'applicationId': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } },
        { 'userId.profile.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [kycApplications, total] = await Promise.all([
      KYC.find(query)
        .populate('userId', 'email phone profile.name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('applicationId status createdAt userId riskAssessment documents faceVerification'),
      KYC.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        applications: kycApplications.map(kyc => ({
          applicationId: kyc.applicationId,
          user: {
            id: kyc.userId._id,
            name: kyc.userId.profile?.name || 'Unknown',
            email: kyc.userId.email,
            phone: kyc.userId.phone
          },
          status: kyc.status,
          riskScore: kyc.riskAssessment?.score || 0,
          riskLevel: kyc.riskAssessment?.riskLevel || 'unknown',
          documentsCount: kyc.documents.length,
          hasFaceVerification: !!kyc.faceVerification,
          createdAt: kyc.createdAt,
          updatedAt: kyc.updatedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalApplications: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          status,
          riskLevel,
          search
        }
      }
    });

  } catch (error) {
    console.error('KYC list fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching KYC applications'
    });
  }
});

/**
 * @route   GET /api/admin/kyc/:id
 * @desc    Get detailed KYC application
 * @access  Private (Admin only)
 */
router.get('/kyc/:id', [
  query('id').isMongoId().withMessage('Invalid KYC ID')
], async (req, res) => {
  try {
    const { id } = req.params;

    const kycApplication = await KYC.findById(id)
      .populate('userId', 'email phone profile profile.kycStatus profile.riskScore')
      .populate('reviewedBy', 'email');

    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    // Decrypt user sensitive data for admin view
    if (kycApplication.userId) {
      kycApplication.userId.decryptSensitiveFields();
    }

    res.json({
      success: true,
      data: {
        application: {
          applicationId: kycApplication.applicationId,
          user: kycApplication.userId,
          status: kycApplication.status,
          documents: kycApplication.documents.map(doc => ({
            type: doc.type,
            images: doc.images,
            verificationStatus: doc.verificationStatus,
            ocrData: doc.ocrData,
            qualityMetrics: doc.qualityMetrics,
            uploadedAt: doc.uploadedAt,
            verifiedAt: doc.verifiedAt
          })),
          faceVerification: kycApplication.faceVerification,
          riskAssessment: kycApplication.riskAssessment,
          additionalData: kycApplication.additionalData,
          processingSteps: kycApplication.processingSteps,
          reviewedBy: kycApplication.reviewedBy,
          reviewedAt: kycApplication.reviewedAt,
          adminNotes: kycApplication.adminNotes,
          rejectionReason: kycApplication.rejectionReason,
          createdAt: kycApplication.createdAt,
          updatedAt: kycApplication.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('KYC detail fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching KYC application details'
    });
  }
});

/**
 * @route   POST /api/admin/kyc/:id/approve
 * @desc    Approve KYC application
 * @access  Private (Admin only)
 */
router.post('/kyc/:id/approve', [
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long'),
  body('sendNotification').optional().isBoolean().withMessage('sendNotification must be boolean')
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

    const { id } = req.params;
    const { notes, sendNotification = true } = req.body;

    const kycApplication = await KYC.findById(id);
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    if (kycApplication.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'KYC application is already verified'
      });
    }

    // Update KYC status
    await kycApplication.updateStatus('verified', req.user._id, notes);

    // Update user KYC status
    await User.findByIdAndUpdate(kycApplication.userId, {
      'profile.kycStatus': 'verified',
      'profile.kycCompletedAt': new Date()
    });

    // Log admin action
    const user = await User.findById(kycApplication.userId);
    await user.addAuditLog('kyc_approved_by_admin', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      applicationId: kycApplication.applicationId,
      notes
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'KYC application approved successfully',
      data: {
        applicationId: kycApplication.applicationId,
        status: 'verified',
        approvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('KYC approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving KYC application'
    });
  }
});

/**
 * @route   POST /api/admin/kyc/:id/reject
 * @desc    Reject KYC application
 * @access  Private (Admin only)
 */
router.post('/kyc/:id/reject', [
  body('reason').notEmpty().withMessage('Rejection reason is required').isLength({ max: 500 }).withMessage('Reason too long'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
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

    const { id } = req.params;
    const { reason, notes } = req.body;

    const kycApplication = await KYC.findById(id);
    if (!kycApplication) {
      return res.status(404).json({
        success: false,
        message: 'KYC application not found'
      });
    }

    if (kycApplication.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'KYC application is already rejected'
      });
    }

    // Update KYC status
    kycApplication.status = 'rejected';
    kycApplication.rejectionReason = reason;
    kycApplication.reviewedBy = req.user._id;
    kycApplication.reviewedAt = new Date();
    kycApplication.adminNotes = notes;
    await kycApplication.save();

    // Update user KYC status
    await User.findByIdAndUpdate(kycApplication.userId, {
      'profile.kycStatus': 'rejected'
    });

    // Log admin action
    const user = await User.findById(kycApplication.userId);
    await user.addAuditLog('kyc_rejected_by_admin', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      applicationId: kycApplication.applicationId,
      reason,
      notes
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'KYC application rejected',
      data: {
        applicationId: kycApplication.applicationId,
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date()
      }
    });

  } catch (error) {
    console.error('KYC rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting KYC application'
    });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get detailed analytics and reporting data
 * @access  Private (Admin only)
 */
router.get('/analytics', [
  query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
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

    const { period = 'month', startDate, endDate } = req.query;

    // Calculate date range
    const now = new Date();
    let dateRange = {};

    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'day':
          dateRange = {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lte: new Date(now.setHours(23, 59, 59, 999))
          };
          break;
        case 'week':
          dateRange = {
            $gte: new Date(now.setDate(now.getDate() - 7)),
            $lte: new Date()
          };
          break;
        case 'month':
          dateRange = {
            $gte: new Date(now.setMonth(now.getMonth() - 1)),
            $lte: new Date()
          };
          break;
        case 'year':
          dateRange = {
            $gte: new Date(now.setFullYear(now.getFullYear() - 1)),
            $lte: new Date()
          };
          break;
      }
    }

    // Get analytics data
    const analytics = await Promise.all([
      getKYCVolumeAnalytics(dateRange),
      getProcessingTimeAnalytics(dateRange),
      getRiskScoreDistribution(dateRange),
      getDocumentTypeAnalytics(dateRange),
      getRejectionReasonAnalytics(dateRange)
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        kycVolume: analytics[0],
        processingTimes: analytics[1],
        riskDistribution: analytics[2],
        documentTypes: analytics[3],
        rejectionReasons: analytics[4]
      }
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get list of users with filtering and search
 * @access  Private (Admin only)
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'suspended', 'inactive', 'pending']),
  query('kycStatus').optional().isIn(['pending', 'verified', 'rejected', 'not_started', 'in_progress']),
  query('role').optional().isIn(['user', 'admin', 'verifier']),
  query('search').optional().isLength({ max: 100 }),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
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

    const {
      page = 1,
      limit = 10,
      status,
      kycStatus,
      role,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'suspended') {
        query.isSuspended = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'pending') {
        query.isActive = false;
        query.isEmailVerified = false;
      }
    }

    if (kycStatus) {
      query['profile.kycStatus'] = kycStatus;
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.phone': { $regex: search, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
              regex: search,
              options: 'i'
            }
          }
        }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -emailVerificationToken -phoneVerificationOTP -passwordResetToken')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          _id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role || 'user',
          status: user.isSuspended ? 'suspended' : (user.isActive ? 'active' : 'inactive'),
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          lastLoginAt: user.lastLoginAt,
          loginAttempts: user.loginAttempts,
          lockUntil: user.lockUntil,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Users list fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get detailed user information
 * @access  Private (Admin only)
 */
router.get('/users/:id', [
  query('id').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -emailVerificationToken -phoneVerificationOTP -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's KYC applications
    const kycApplications = await KYC.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('applicationId status createdAt riskAssessment');

    // Decrypt sensitive data for admin view
    user.decryptSensitiveFields();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role || 'user',
          status: user.isSuspended ? 'suspended' : (user.isActive ? 'active' : 'inactive'),
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          lastLoginAt: user.lastLoginAt,
          loginAttempts: user.loginAttempts,
          lockUntil: user.lockUntil,
          auditLog: user.auditLog?.slice(-20), // Last 20 audit entries
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        kycApplications,
        statistics: {
          totalKYCApplications: kycApplications.length,
          verifiedKYC: kycApplications.filter(kyc => kyc.status === 'verified').length,
          pendingKYC: kycApplications.filter(kyc => kyc.status === 'pending').length,
          rejectedKYC: kycApplications.filter(kyc => kyc.status === 'rejected').length,
          averageRiskScore: kycApplications.reduce((acc, kyc) => acc + (kyc.riskAssessment?.score || 0), 0) / kycApplications.length || 0
        }
      }
    });

  } catch (error) {
    console.error('User detail fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Private (Admin only)
 */
router.put('/users/:id', [
  body('profile.firstName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('profile.lastName').optional().isLength({ min: 1, max: 50 }).trim(),
  body('profile.phone').optional().isMobilePhone('any'),
  body('profile.address').optional().isLength({ max: 200 }).trim(),
  body('role').optional().isIn(['user', 'admin', 'verifier']),
  body('notes').optional().isLength({ max: 1000 }).trim()
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

    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    const allowedUpdates = ['profile', 'role'];
    const actualUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'profile') {
          actualUpdates[key] = { ...user.profile, ...updates[key] };
        } else {
          actualUpdates[key] = updates[key];
        }
      }
    });

    // Don't allow admin to change their own role
    if (updates.role && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...actualUpdates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -phoneVerificationOTP -passwordResetToken');

    // Log admin action
    await user.addAuditLog('user_updated_by_admin', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      updatedFields: Object.keys(actualUpdates),
      notes: updates.notes
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend user account
 * @access  Private (Admin only)
 */
router.post('/users/:id/suspend', [
  body('reason').notEmpty().withMessage('Suspension reason is required').isLength({ max: 500 }).trim(),
  body('notes').optional().isLength({ max: 1000 }).trim()
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

    const { id } = req.params;
    const { reason, notes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admin to suspend themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend your own account'
      });
    }

    if (user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: 'User is already suspended'
      });
    }

    // Suspend user
    user.isSuspended = true;
    user.suspensionReason = reason;
    user.suspendedAt = new Date();
    user.suspendedBy = req.user._id;
    await user.save();

    // Log admin action
    await user.addAuditLog('user_suspended_by_admin', {
      adminId: req.user._id,
      adminEmail: req.user.email,
      reason,
      notes
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: {
        userId: user._id,
        suspensionReason: reason,
        suspendedAt: user.suspendedAt
      }
    });

  } catch (error) {
    console.error('User suspension error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending user'
    });
  }
});

/**
 * @route   POST /api/admin/users/:id/activate
 * @desc    Activate suspended user account
 * @access  Private (Admin only)
 */
router.post('/users/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: 'User is not suspended'
      });
    }

    // Activate user
    user.isSuspended = false;
    user.suspensionReason = undefined;
    user.suspendedAt = undefined;
    user.suspendedBy = undefined;
    user.activatedAt = new Date();
    user.activatedBy = req.user._id;
    await user.save();

    // Log admin action
    await user.addAuditLog('user_activated_by_admin', {
      adminId: req.user._id,
      adminEmail: req.user.email
    }, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      message: 'User activated successfully',
      data: {
        userId: user._id,
        activatedAt: user.activatedAt
      }
    });

  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
});

/**
 * Helper functions for analytics
 */
async function calculateProcessingMetrics() {
  const pipeline = [
    {
      $group: {
        _id: null,
        avgProcessingTime: { $avg: '$processingTime' },
        totalApplications: { $sum: 1 },
        verifiedApplications: {
          $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
        },
        rejectedApplications: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ];

  const result = await KYC.aggregate(pipeline);
  return result[0] || {
    avgProcessingTime: 0,
    totalApplications: 0,
    verifiedApplications: 0,
    rejectedApplications: 0
  };
}

async function generateSystemAlerts() {
  const alerts = [];

  // Check for high pending review count
  const pendingCount = await KYC.countDocuments({
    status: { $in: ['pending', 'manual_review'] }
  });

  if (pendingCount > 50) {
    alerts.push({
      type: 'warning',
      message: `High number of pending reviews: ${pendingCount}`,
      level: 'medium'
    });
  }

  // Check for system health
  const avgProcessingTime = await calculateProcessingMetrics();
  if (avgProcessingTime.avgProcessingTime > 300000) { // 5 minutes
    alerts.push({
      type: 'error',
      message: 'Processing times are higher than usual',
      level: 'high'
    });
  }

  return alerts;
}

async function getKYCVolumeAnalytics(dateRange) {
  const dailyStats = await KYC.aggregate([
    {
      $match: {
        createdAt: dateRange
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  return dailyStats;
}

async function getProcessingTimeAnalytics(dateRange) {
  const pipeline = [
    {
      $match: {
        createdAt: dateRange,
        'processingSteps.0.completedAt': { $exists: true }
      }
    },
    {
      $project: {
        processingTime: {
          $subtract: ['$processingSteps.0.completedAt', '$createdAt']
        },
        status: 1
      }
    },
    {
      $group: {
        _id: '$status',
        avgTime: { $avg: '$processingTime' },
        minTime: { $min: '$processingTime' },
        maxTime: { $max: '$processingTime' },
        count: { $sum: 1 }
      }
    }
  ];

  return await KYC.aggregate(pipeline);
}

async function getRiskScoreDistribution(dateRange) {
  const distribution = await KYC.aggregate([
    {
      $match: {
        createdAt: dateRange,
        'riskAssessment.score': { $exists: true }
      }
    },
    {
      $bucket: {
        groupBy: '$riskAssessment.score',
        boundaries: [0, 20, 40, 60, 80, 100],
        default: 'other',
        output: {
          count: { $sum: 1 }
        }
      }
    }
  ]);

  return distribution;
}

async function getDocumentTypeAnalytics(dateRange) {
  const docStats = await KYC.aggregate([
    {
      $match: {
        createdAt: dateRange
      }
    },
    {
      $unwind: '$documents'
    },
    {
      $group: {
        _id: '$documents.type',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$documents.ocrData.confidence' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return docStats;
}

async function getRejectionReasonAnalytics(dateRange) {
  const rejectionStats = await KYC.aggregate([
    {
      $match: {
        createdAt: dateRange,
        status: 'rejected'
      }
    },
    {
      $group: {
        _id: '$rejectionReason',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return rejectionStats;
}

module.exports = router;