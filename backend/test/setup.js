const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup test database
const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
  console.log('Test database connected');
};

// Cleanup test database
const cleanupTestDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('Test database cleaned up');
};

// Create test user
const createTestUser = async (userData = {}) => {
  const User = require('../src/models/User');

  const defaultUser = {
    email: 'test@example.com',
    password: 'password123',
    profile: {
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890'
    },
    ...userData
  };

  return await User.create(defaultUser);
};

// Create test KYC application
const createTestKYC = async (userId, kycData = {}) => {
  const KYC = require('../src/models/KYC');

  const defaultKYC = {
    userId,
    applicationId: `TEST_${Date.now()}`,
    documents: [],
    faceVerification: {
      status: 'pending',
      confidence: 0
    },
    livenessCheck: {
      status: 'pending',
      challenges: []
    },
    riskAssessment: {
      score: 0,
      level: 'low',
      flags: []
    },
    ...kycData
  };

  return await KYC.create(defaultKYC);
};

module.exports = {
  setupTestDB,
  cleanupTestDB,
  createTestUser,
  createTestKYC
};