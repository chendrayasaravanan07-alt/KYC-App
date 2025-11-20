const jwt = require('jsonwebtoken');
const winston = require('winston');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedAdmins = new Map();
    this.connectedUsers = new Map();
  }

  initialize(server) {
    this.io = require('socket.io')(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        socket.role = decoded.role || 'user';

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    winston.info('WebSocket server initialized');
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    const userRole = socket.role;

    winston.info(`WebSocket connection: User ${userId} (${userRole}) connected`);

    // Store connection
    if (userRole === 'admin') {
      this.connectedAdmins.set(userId, socket.id);
    } else {
      this.connectedUsers.set(userId, socket.id);
    }

    // Join appropriate rooms
    if (userRole === 'admin') {
      socket.join('admin_room');
    }
    socket.join(`user_${userId}`);

    // Handle events
    socket.on('join_kyc_room', (data) => {
      const { kycId } = data;
      socket.join(`kyc_${kycId}`);
      winston.debug(`User ${userId} joined KYC room ${kycId}`);
    });

    socket.on('leave_kyc_room', (data) => {
      const { kycId } = data;
      socket.leave(`kyc_${kycId}`);
      winston.debug(`User ${userId} left KYC room ${kycId}`);
    });

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  handleDisconnection(socket) {
    const userId = socket.user.id;
    const userRole = socket.role;

    winston.info(`WebSocket disconnection: User ${userId} (${userRole}) disconnected`);

    // Remove connection
    if (userRole === 'admin') {
      this.connectedAdmins.delete(userId);
    } else {
      this.connectedUsers.delete(userId);
    }
  }

  // KYC Events
  emitKYCStatusUpdate(kycId, status, data = {}) {
    this.io.to(`kyc_${kycId}`).emit('kyc_status_update', {
      kycId,
      status,
      timestamp: new Date(),
      ...data
    });

    // Also notify admins
    this.io.to('admin_room').emit('kyc_status_update', {
      kycId,
      status,
      timestamp: new Date(),
      ...data
    });

    winston.info(`KYC status update emitted: ${kycId} -> ${status}`);
  }

  emitKYCDocumentProcessed(kycId, documentType, result) {
    this.io.to(`kyc_${kycId}`).emit('kyc_document_processed', {
      kycId,
      documentType,
      result,
      timestamp: new Date()
    });

    winston.info(`KYC document processed emitted: ${kycId} - ${documentType}`);
  }

  emitKYCRiskAssessment(kycId, riskData) {
    this.io.to(`kyc_${kycId}`).emit('kyc_risk_assessment', {
      kycId,
      riskData,
      timestamp: new Date()
    });

    // Notify admins for high-risk cases
    if (riskData.score > 60) {
      this.io.to('admin_room').emit('high_risk_alert', {
        kycId,
        riskData,
        timestamp: new Date()
      });
    }

    winston.info(`KYC risk assessment emitted: ${kycId} (Score: ${riskData.score})`);
  }

  emitKYCCompleted(kycId, result) {
    this.io.to(`kyc_${kycId}`).emit('kyc_completed', {
      kycId,
      result,
      timestamp: new Date()
    });

    this.io.to('admin_room').emit('kyc_completed', {
      kycId,
      result,
      timestamp: new Date()
    });

    winston.info(`KYC completion emitted: ${kycId}`);
  }

  // Admin Events
  emitNewKYCApplication(applicationData) {
    this.io.to('admin_room').emit('new_kyc_application', {
      application: applicationData,
      timestamp: new Date()
    });

    winston.info('New KYC application notification emitted to admins');
  }

  emitSystemStats(stats) {
    this.io.to('admin_room').emit('system_stats', {
      stats,
      timestamp: new Date()
    });
  }

  emitSystemAlert(alert) {
    this.io.to('admin_room').emit('system_alert', {
      alert,
      timestamp: new Date()
    });

    winston.warn(`System alert emitted: ${alert.type} - ${alert.message}`);
  }

  // User Events
  emitNotificationToUser(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });

    winston.info(`Notification sent to user ${userId}: ${notification.type}`);
  }

  // Utility methods
  getConnectedAdminsCount() {
    return this.connectedAdmins.size;
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId) || this.connectedAdmins.has(userId);
  }

  // Broadcast events
  broadcastSystemMaintenance(mode) {
    this.io.emit('system_maintenance', {
      mode, // 'starting', 'in_progress', 'completed'
      timestamp: new Date()
    });
  }
}

module.exports = new WebSocketService();