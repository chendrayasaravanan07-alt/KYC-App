const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Driven KYC Verification System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mock auth routes for demo
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Mock authentication
  if (email === 'admin@kyc.com' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: 'mock-jwt-token',
        user: {
          id: 'admin-user-1',
          email: 'admin@kyc.com',
          name: 'Admin User',
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'admin-user-1',
      email: 'admin@kyc.com',
      name: 'Admin User',
      role: 'admin'
    }
  });
});

// Mock admin routes
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalApplications: 380,
      verifiedUsers: 245,
      pendingReview: 89,
      flaggedCases: 12,
      applicationsChange: 12,
      verifiedChange: 8,
      pendingChange: -5,
      flaggedChange: 2
    }
  });
});

app.get('/api/admin/users', (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  // Mock users data
  const mockUsers = [
    {
      _id: '1',
      email: 'john.doe@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        kycStatus: 'verified'
      },
      role: 'user',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      email: 'jane.smith@example.com',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+0987654321',
        kycStatus: 'pending'
      },
      role: 'user',
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: false,
      createdAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: {
      users: mockUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 2,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  });
});

app.get('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    data: {
      user: {
        _id: id,
        email: 'john.doe@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          kycStatus: 'verified'
        },
        role: 'user',
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date().toISOString()
      },
      kycApplications: [],
      statistics: {
        totalKYCApplications: 0,
        verifiedKYC: 0,
        pendingKYC: 0,
        rejectedKYC: 0,
        averageRiskScore: 0
      }
    }
  });
});

app.post('/api/admin/users/:id/suspend', (req, res) => {
  res.json({
    success: true,
    message: 'User suspended successfully'
  });
});

app.post('/api/admin/users/:id/activate', (req, res) => {
  res.json({
    success: true,
    message: 'User activated successfully'
  });
});

// Mock KYC routes
app.get('/api/admin/kyc/list', (req, res) => {
  const mockApplications = [
    {
      _id: 'kyc-1',
      applicationId: 'KYC_001',
      userId: {
        _id: '1',
        profile: { firstName: 'John', lastName: 'Doe' },
        email: 'john.doe@example.com'
      },
      status: 'pending',
      riskAssessment: { score: 25 },
      documents: [],
      createdAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: {
      applications: mockApplications,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      }
    }
  });
});

app.get('/api/admin/kyc/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      applicationId: 'KYC_001',
      status: 'pending',
      userId: {
        _id: '1',
        profile: { firstName: 'John', lastName: 'Doe' },
        email: 'john.doe@example.com'
      },
      documents: [],
      riskAssessment: { score: 25 },
      createdAt: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KYC Mock API Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;