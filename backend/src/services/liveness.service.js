const winston = require('winston');
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Liveness Detection Service
 * Anti-spoofing system to verify live person vs photo/video attacks
 */

class LivenessService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [LIVENESS]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Generate liveness challenges for user to perform
   */
  generateChallenges() {
    const challengeTypes = ['blink', 'smile', 'head_turn_left', 'head_turn_right', 'head_movement'];
    const numChallenges = 3; // Random 3 challenges
    const challenges = [];

    // Randomly select challenges
    const shuffled = challengeTypes.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numChallenges);

    selected.forEach((type, index) => {
      let challenge = {
        id: `challenge_${index + 1}`,
        type,
        instruction: this.getChallengeInstruction(type),
        timeout: 5000, // 5 seconds per challenge
        completed: false,
        attempts: 0,
        maxAttempts: 3
      };

      // Add specific parameters for each challenge type
      switch (type) {
        case 'head_turn_left':
        case 'head_turn_right':
          challenge.parameters = {
            angle: type.includes('left') ? -30 : 30,
            tolerance: 15
          };
          break;
        case 'blink':
          challenge.parameters = {
            minBlinks: 2,
            maxDuration: 2000
          };
          break;
        case 'smile':
          challenge.parameters = {
            minSmileIntensity: 0.6,
            holdDuration: 1000
          };
          break;
        case 'head_movement':
          challenge.parameters = {
            directions: ['up', 'down', 'left', 'right'],
            movementThreshold: 20
          };
          break;
      }

      challenges.push(challenge);
    });

    return {
      sessionId: this.generateSessionId(),
      challenges,
      totalTimeout: numChallenges * 5000 + 5000, // Extra 5 seconds buffer
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (numChallenges * 5000 + 15000))
    };
  }

  /**
   * Get human-readable instruction for challenge
   */
  getChallengeInstruction(type) {
    const instructions = {
      'blink': 'Please blink your eyes naturally',
      'smile': 'Please smile for the camera',
      'head_turn_left': 'Please slowly turn your head to the left',
      'head_turn_right': 'Please slowly turn your head to the right',
      'head_movement': 'Please move your head in different directions'
    };
    return instructions[type] || 'Please follow the instructions';
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'LIVE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Process liveness challenge response
   */
  async processChallenge(challengeType, imagePaths, parameters = {}) {
    try {
      const startTime = Date.now();

      this.logger.info(`Processing liveness challenge: ${challengeType}`);

      let result = {
        type: challengeType,
        passed: false,
        confidence: 0,
        details: {},
        processingTime: 0,
        error: null
      };

      switch (challengeType) {
        case 'blink':
          result = await this.processBlinkChallenge(imagePaths, parameters);
          break;
        case 'smile':
          result = await this.processSmileChallenge(imagePaths, parameters);
          break;
        case 'head_turn_left':
        case 'head_turn_right':
          result = await this.processHeadTurnChallenge(challengeType, imagePaths, parameters);
          break;
        case 'head_movement':
          result = await this.processHeadMovementChallenge(imagePaths, parameters);
          break;
        default:
          throw new Error(`Unknown challenge type: ${challengeType}`);
      }

      result.processingTime = Date.now() - startTime;

      this.logger.info(`Liveness challenge ${challengeType} completed with ${result.confidence}% confidence`);

      return result;
    } catch (error) {
      this.logger.error(`Liveness challenge processing failed: ${error.message}`);
      return {
        type: challengeType,
        passed: false,
        confidence: 0,
        details: {},
        processingTime: 0,
        error: error.message
      };
    }
  }

  /**
   * Process blink detection challenge
   */
  async processBlinkChallenge(imagePaths, parameters) {
    const minBlinks = parameters.minBlinks || 2;
    const maxDuration = parameters.maxDuration || 2000;

    if (imagePaths.length < 2) {
      throw new Error('Blink detection requires at least 2 images');
    }

    // Simulate blink detection
    // In production, use eye detection and track eye state changes
    const blinkCount = await this.detectBlinks(imagePaths);
    const duration = this.calculateImageSequenceDuration(imagePaths);

    const passed = blinkCount >= minBlinks && duration <= maxDuration;
    const confidence = Math.min(100, (blinkCount / minBlinks) * 80 + (duration <= maxDuration ? 20 : 0));

    return {
      type: 'blink',
      passed,
      confidence: Math.round(confidence),
      details: {
        blinkCount,
        minBlinks,
        duration,
        maxDuration,
        imageCount: imagePaths.length
      }
    };
  }

  /**
   * Process smile detection challenge
   */
  async processSmileChallenge(imagePaths, parameters) {
    const minIntensity = parameters.minSmileIntensity || 0.6;
    const holdDuration = parameters.holdDuration || 1000;

    if (imagePaths.length === 0) {
      throw new Error('Smile detection requires at least 1 image');
    }

    // Simulate smile detection
    // In production, use facial expression recognition
    const smileIntensities = await this.detectSmiles(imagePaths);
    const maxIntensity = Math.max(...smileIntensities);
    const avgIntensity = smileIntensities.reduce((a, b) => a + b, 0) / smileIntensities.length;

    const passed = maxIntensity >= minIntensity;
    const confidence = Math.min(100, (maxIntensity / minIntensity) * 60 + (avgIntensity > minIntensity * 0.5 ? 40 : 0));

    return {
      type: 'smile',
      passed,
      confidence: Math.round(confidence),
      details: {
        maxIntensity: Math.round(maxIntensity * 100),
        avgIntensity: Math.round(avgIntensity * 100),
        minIntensity: Math.round(minIntensity * 100),
        imageCount: imagePaths.length
      }
    };
  }

  /**
   * Process head turn challenge
   */
  async processHeadTurnChallenge(direction, imagePaths, parameters) {
    const targetAngle = parameters.angle || (direction.includes('left') ? -30 : 30);
    const tolerance = parameters.tolerance || 15;

    if (imagePaths.length === 0) {
      throw new Error('Head turn detection requires at least 1 image');
    }

    // Simulate head pose estimation
    // In production, use head pose estimation algorithms
    const headAngles = await this.estimateHeadPose(imagePaths);
    const maxAngle = direction.includes('left') ?
      Math.min(...headAngles) : Math.max(...headAngles);

    const angleDiff = Math.abs(maxAngle - targetAngle);
    const passed = angleDiff <= tolerance;
    const confidence = Math.min(100, Math.max(0, (tolerance - angleDiff) / tolerance * 100));

    return {
      type: direction,
      passed,
      confidence: Math.round(confidence),
      details: {
        detectedAngle: Math.round(maxAngle),
        targetAngle,
        tolerance,
        angleDifference: Math.round(angleDiff),
        imageCount: imagePaths.length
      }
    };
  }

  /**
   * Process head movement challenge
   */
  async processHeadMovementChallenge(imagePaths, parameters) {
    const movementThreshold = parameters.movementThreshold || 20;

    if (imagePaths.length < 3) {
      throw new Error('Head movement detection requires at least 3 images');
    }

    // Simulate movement tracking
    // In production, use optical flow or facial landmark tracking
    const movements = await this.detectHeadMovements(imagePaths);
    const significantMovements = movements.filter(m => m.magnitude >= movementThreshold);

    const passed = significantMovements.length >= 2; // At least 2 significant movements
    const confidence = Math.min(100, (significantMovements.length / movements.length) * 100);

    return {
      type: 'head_movement',
      passed,
      confidence: Math.round(confidence),
      details: {
        totalMovements: movements.length,
        significantMovements: significantMovements.length,
        movementThreshold,
        maxMovement: Math.round(Math.max(...movements.map(m => m.magnitude))),
        imageCount: imagePaths.length
      }
    };
  }

  /**
   * Simulate blink detection
   */
  async detectBlinks(imagePaths) {
    // Simulate blink detection based on image sequence
    // In production, implement actual eye state detection
    const possibleBlinks = Math.floor(imagePaths.length / 3);
    return Math.max(0, possibleBlinks + Math.floor(Math.random() * 2) - 1);
  }

  /**
   * Simulate smile detection
   */
  async detectSmiles(imagePaths) {
    // Simulate smile intensity detection
    // In production, use facial expression recognition
    return imagePaths.map(() => Math.random() * 0.8 + 0.2);
  }

  /**
   * Simulate head pose estimation
   */
  async estimateHeadPose(imagePaths) {
    // Simulate head angle estimation
    // In production, use head pose estimation algorithms
    return imagePaths.map((_, index) => {
      const progress = index / (imagePaths.length - 1);
      return -30 + (progress * 60); // -30 to +30 degrees
    });
  }

  /**
   * Simulate head movement detection
   */
  async detectHeadMovements(imagePaths) {
    // Simulate movement detection
    // In production, use optical flow or landmark tracking
    const movements = [];
    for (let i = 1; i < imagePaths.length; i++) {
      movements.push({
        from: i - 1,
        to: i,
        direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
        magnitude: Math.random() * 40 + 10
      });
    }
    return movements;
  }

  /**
   * Calculate duration of image sequence
   */
  calculateImageSequenceDuration(imagePaths) {
    // Assume 100ms between images (typical for video capture)
    return (imagePaths.length - 1) * 100;
  }

  /**
   * Evaluate overall liveness session
   */
  async evaluateLivenessSession(sessionData, challengeResults) {
    try {
      this.logger.info('Evaluating liveness session');

      const totalChallenges = sessionData.challenges.length;
      const completedChallenges = challengeResults.filter(r => r.passed).length;
      const totalConfidence = challengeResults.reduce((sum, r) => sum + r.confidence, 0);
      const avgConfidence = totalConfidence / totalChallenges;

      // Calculate anti-spoofing score
      const antiSpoofingScore = this.calculateAntiSpoofingScore(challengeResults);

      // Determine if session passed
      const minRequiredChallenges = Math.ceil(totalChallenges * 0.8); // 80% of challenges
      const minConfidence = 70; // 70% minimum confidence
      const passed = completedChallenges >= minRequiredChallenges && avgConfidence >= minConfidence;

      const evaluation = {
        sessionId: sessionData.sessionId,
        passed,
        confidence: Math.round(avgConfidence),
        antiSpoofingScore: Math.round(antiSpoofingScore),
        summary: {
          totalChallenges,
          completedChallenges,
          failedChallenges: totalChallenges - completedChallenges,
          successRate: Math.round((completedChallenges / totalChallenges) * 100),
          processingTime: Date.now() - sessionData.createdAt.getTime()
        },
        challenges: challengeResults,
        riskFlags: this.identifyRiskFlags(challengeResults),
        evaluatedAt: new Date()
      };

      this.logger.info(`Liveness session ${passed ? 'PASSED' : 'FAILED'} with ${avgConfidence}% confidence`);

      return evaluation;
    } catch (error) {
      this.logger.error(`Liveness session evaluation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate anti-spoofing score
   */
  calculateAntiSpoofingScore(challengeResults) {
    let score = 50; // Base score

    challengeResults.forEach(result => {
      if (result.passed) {
        score += result.confidence * 0.4; // Add 40% of confidence for passed challenges
      } else {
        score -= 10; // Penalize failed challenges
      }
    });

    // Bonus for variety of challenge types
    const uniqueTypes = new Set(challengeResults.map(r => r.type)).size;
    score += uniqueTypes * 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Identify potential fraud risk flags
   */
  identifyRiskFlags(challengeResults) {
    const flags = [];

    // Check for consistently low confidence
    const avgConfidence = challengeResults.reduce((sum, r) => sum + r.confidence, 0) / challengeResults.length;
    if (avgConfidence < 60) {
      flags.push({
        severity: 'medium',
        type: 'low_confidence',
        description: 'Consistently low confidence in liveness detection'
      });
    }

    // Check for failed challenges
    const failedChallenges = challengeResults.filter(r => !r.passed);
    if (failedChallenges.length > 0) {
      flags.push({
        severity: 'high',
        type: 'failed_challenges',
        description: `${failedChallenges.length} liveness challenges failed`
      });
    }

    // Check for processing time anomalies
    const processingTimes = challengeResults.map(r => r.processingTime);
    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    if (avgProcessingTime > 10000) { // More than 10 seconds average
      flags.push({
        severity: 'low',
        type: 'slow_processing',
        description: 'Unusually slow response times detected'
      });
    }

    return flags;
  }

  /**
   * Validate session expiry
   */
  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.expiresAt) {
      return false;
    }

    return new Date() < new Date(sessionData.expiresAt);
  }
}

module.exports = LivenessService;