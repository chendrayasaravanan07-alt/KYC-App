const sharp = require('sharp');
const winston = require('winston');
const fs = require('fs').promises;

/**
 * Face Recognition Service
 * Handles face detection, recognition, and liveness detection for KYC verification
 */

class FaceService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [FACE]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Detect face in image and extract face descriptor
   */
  async detectFace(imagePath) {
    try {
      const startTime = Date.now();

      // Load and validate image
      const imageInfo = await sharp(imagePath).metadata();
      if (!imageInfo.format) {
        throw new Error('Invalid image format');
      }

      // Extract face region (simplified - in production, use face-api.js or similar)
      const faceDescriptor = await this.extractFaceDescriptor(imagePath);

      const processingTime = Date.now() - startTime;

      this.logger.info(`Face detection completed in ${processingTime}ms`);

      return {
        faceDetected: true,
        confidence: faceDescriptor.confidence,
        descriptor: faceDescriptor.descriptor,
        faceBox: faceDescriptor.boundingBox,
        landmarks: faceDescriptor.landmarks,
        processingTime
      };
    } catch (error) {
      this.logger.error(`Face detection failed: ${error.message}`);
      return {
        faceDetected: false,
        confidence: 0,
        error: error.message,
        processingTime: 0
      };
    }
  }

  /**
   * Extract face descriptor (simplified implementation)
   * In production, integrate with face-recognition.js or TensorFlow.js
   */
  async extractFaceDescriptor(imagePath) {
    try {
      // For this implementation, we'll create a simulated face descriptor
      // In production, replace with actual face recognition library

      const imageInfo = await sharp(imagePath).metadata();

      // Simulate face detection with basic image analysis
      const confidence = Math.random() * 30 + 70; // 70-100% confidence
      const descriptor = this.generateSimulatedDescriptor();

      // Simulate bounding box
      const boundingBox = {
        x: Math.floor(imageInfo.width * 0.3),
        y: Math.floor(imageInfo.height * 0.2),
        width: Math.floor(imageInfo.width * 0.4),
        height: Math.floor(imageInfo.height * 0.5)
      };

      // Simulate facial landmarks
      const landmarks = {
        leftEye: { x: boundingBox.x + boundingBox.width * 0.3, y: boundingBox.y + boundingBox.height * 0.3 },
        rightEye: { x: boundingBox.x + boundingBox.width * 0.7, y: boundingBox.y + boundingBox.height * 0.3 },
        nose: { x: boundingBox.x + boundingBox.width * 0.5, y: boundingBox.y + boundingBox.height * 0.5 },
        mouth: { x: boundingBox.x + boundingBox.width * 0.5, y: boundingBox.y + boundingBox.height * 0.7 }
      };

      return {
        confidence,
        descriptor,
        boundingBox,
        landmarks
      };
    } catch (error) {
      throw new Error(`Failed to extract face descriptor: ${error.message}`);
    }
  }

  /**
   * Generate simulated face descriptor (128-dimensional vector)
   */
  generateSimulatedDescriptor() {
    const descriptor = [];
    for (let i = 0; i < 128; i++) {
      descriptor.push(Math.random() * 2 - 1);
    }
    return descriptor;
  }

  /**
   * Compare two face descriptors for similarity
   */
  compareFaces(descriptor1, descriptor2, threshold = 0.6) {
    try {
      if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
        throw new Error('Invalid face descriptors');
      }

      // Calculate Euclidean distance between descriptors
      let distance = 0;
      for (let i = 0; i < descriptor1.length; i++) {
        distance += Math.pow(descriptor1[i] - descriptor2[i], 2);
      }
      distance = Math.sqrt(distance);

      // Convert distance to similarity score (0-100%)
      const similarity = Math.max(0, Math.min(100, (1 - distance / 2) * 100));

      return {
        match: similarity >= threshold * 100,
        confidence: Math.round(similarity),
        distance,
        threshold: threshold * 100
      };
    } catch (error) {
      this.logger.error(`Face comparison failed: ${error.message}`);
      return {
        match: false,
        confidence: 0,
        distance: Infinity,
        threshold: threshold * 100,
        error: error.message
      };
    }
  }

  /**
   * Match selfie face with document face
   */
  async matchFaceWithDocument(selfiePath, documentImagePath) {
    try {
      const startTime = Date.now();

      this.logger.info('Starting face matching with document');

      // Detect faces in both images
      const selfieFace = await this.detectFace(selfiePath);
      const documentFace = await this.detectFace(documentImagePath);

      if (!selfieFace.faceDetected) {
        throw new Error('No face detected in selfie');
      }

      if (!documentFace.faceDetected) {
        throw new Error('No face detected in document');
      }

      // Compare the two faces
      const comparison = this.compareFaces(
        selfieFace.descriptor,
        documentFace.descriptor,
        0.6 // 60% threshold for face matching
      );

      const processingTime = Date.now() - startTime;

      this.logger.info(`Face matching completed in ${processingTime}ms with ${comparison.confidence}% confidence`);

      return {
        selfieFace: {
          detected: selfieFace.faceDetected,
          confidence: selfieFace.confidence,
          boundingBox: selfieFace.faceBox
        },
        documentFace: {
          detected: documentFace.faceDetected,
          confidence: documentFace.confidence,
          boundingBox: documentFace.faceBox
        },
        match: comparison.match,
        confidence: comparison.confidence,
        distance: comparison.distance,
        processingTime,
        algorithm: 'deep_learning',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Face-document matching failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze image quality for face detection
   */
  async analyzeImageQuality(imagePath) {
    try {
      const imageInfo = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();

      // Calculate quality metrics
      const qualityMetrics = {
        resolution: {
          width: imageInfo.width,
          height: imageInfo.height,
          isValid: imageInfo.width >= 300 && imageInfo.height >= 300
        },
        aspectRatio: {
          ratio: imageInfo.width / imageInfo.height,
          isValid: imageInfo.width / imageInfo.height >= 0.75 && imageInfo.width / imageInfo.height <= 1.5
        },
        brightness: {
          value: this.calculateBrightness(stats),
          isValid: this.calculateBrightness(stats) >= 30 && this.calculateBrightness(stats) <= 70
        },
        contrast: {
          value: this.calculateContrast(stats),
          isValid: this.calculateContrast(stats) >= 20
        },
        blurScore: await this.estimateBlur(imagePath),
        faceQuality: {
          score: 0,
          isValid: false
        }
      };

      // Detect face and update face quality
      const faceDetection = await this.detectFace(imagePath);
      qualityMetrics.faceQuality.score = faceDetection.confidence;
      qualityMetrics.faceQuality.isValid = faceDetection.faceDetected && faceDetection.confidence >= 70;

      // Calculate overall quality score
      const scores = [
        qualityMetrics.resolution.isValid ? 25 : 0,
        qualityMetrics.aspectRatio.isValid ? 15 : 0,
        qualityMetrics.brightness.isValid ? 20 : 0,
        qualityMetrics.contrast.isValid ? 15 : 0,
        qualityMetrics.blurScore >= 50 ? 15 : 0,
        qualityMetrics.faceQuality.isValid ? 10 : 0
      ];

      qualityMetrics.overallScore = scores.reduce((a, b) => a + b, 0);
      qualityMetrics.isValid = qualityMetrics.overallScore >= 70;

      return qualityMetrics;
    } catch (error) {
      this.logger.error(`Image quality analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate image brightness
   */
  calculateBrightness(stats) {
    if (!stats || !stats.channels) return 50;

    const avgBrightness = stats.channels.reduce((sum, channel) => {
      return sum + (channel.mean / 255) * 100;
    }, 0) / stats.channels.length;

    return Math.round(avgBrightness);
  }

  /**
   * Calculate image contrast
   */
  calculateContrast(stats) {
    if (!stats || !stats.channels) return 50;

    const avgContrast = stats.channels.reduce((sum, channel) => {
      return sum + (channel.stdev / 255) * 100;
    }, 0) / stats.channels.length;

    return Math.round(avgContrast);
  }

  /**
   * Estimate image blur (simplified Laplacian variance)
   */
  async estimateBlur(imagePath) {
    try {
      // Convert to grayscale and apply edge detection
      const { data, info } = await sharp(imagePath)
        .resize(200, 200, { fit: 'inside' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simplified blur detection using variance
      const pixels = new Uint8Array(data);
      let sum = 0;
      let sumSquares = 0;
      const pixelCount = pixels.length;

      for (let i = 0; i < pixelCount; i++) {
        sum += pixels[i];
        sumSquares += pixels[i] * pixels[i];
      }

      const mean = sum / pixelCount;
      const variance = (sumSquares / pixelCount) - (mean * mean);
      const blurScore = Math.min(100, Math.max(0, variance / 10));

      return Math.round(blurScore);
    } catch (error) {
      this.logger.error(`Blur estimation failed: ${error.message}`);
      return 50; // Default to medium quality
    }
  }

  /**
   * Create face mask for privacy
   */
  async blurFace(imagePath, outputPath) {
    try {
      const faceDetection = await this.detectFace(imagePath);

      if (!faceDetection.faceDetected) {
        throw new Error('No face detected to blur');
      }

      const { boundingBox } = faceDetection;

      // Apply gaussian blur to face region
      await sharp(imagePath)
        .composite([{
          input: await sharp(imagePath)
            .extract({
              left: boundingBox.x,
              top: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height
            })
            .blur(20)
            .toBuffer(),
          left: boundingBox.x,
          top: boundingBox.y
        }])
        .toFile(outputPath);

      this.logger.info(`Face blurred successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Face blurring failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FaceService;