const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * File Upload Middleware
 * Handles file uploads with validation, processing, and security checks
 */

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `kyc-${uniqueSuffix}${ext}`);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  // Check file type
  if (!allowedMimes.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    const error = new Error('Invalid file extension.');
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Maximum 10 files per request
  }
});

/**
 * Multiple file upload middleware for KYC documents
 */
const uploadKYCDocuments = upload.array('documents', 10);

/**
 * Single file upload middleware for specific documents
 */
const uploadSingleDocument = upload.single('document');

/**
 * File validation middleware
 */
const validateUploadedFiles = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = req.files || [req.file];
    const validationResults = [];

    for (const file of files) {
      const result = await validateFile(file);
      validationResults.push(result);
    }

    // Check if any files failed validation
    const failedValidations = validationResults.filter(result => !result.isValid);

    if (failedValidations.length > 0) {
      // Clean up uploaded files
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      });

      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        errors: failedValidations.map(v => v.error)
      });
    }

    // Attach validation results to request
    req.fileValidation = validationResults;
    next();

  } catch (error) {
    console.error('File validation error:', error);

    // Clean up uploaded files on error
    const files = req.files || [req.file];
    if (files) {
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error validating uploaded files'
    });
  }
};

/**
 * Validate individual file
 */
async function validateFile(file) {
  const result = {
    filename: file.filename,
    isValid: true,
    error: null,
    metadata: {}
  };

  try {
    // Check if file exists
    if (!fs.existsSync(file.path)) {
      result.isValid = false;
      result.error = 'File not found after upload';
      return result;
    }

    // Get file stats
    const stats = fs.statSync(file.path);
    result.metadata.size = stats.size;

    // Validate file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
    if (stats.size > maxSize) {
      result.isValid = false;
      result.error = 'File size exceeds maximum limit';
      return result;
    }

    // For images, perform additional validation
    if (file.mimetype.startsWith('image/')) {
      const imageInfo = await sharp(file.path).metadata();
      result.metadata.width = imageInfo.width;
      result.metadata.height = imageInfo.height;
      result.metadata.format = imageInfo.format;

      // Validate image dimensions
      if (imageInfo.width < 300 || imageInfo.height < 300) {
        result.isValid = false;
        result.error = 'Image dimensions too small (minimum 300x300)';
        return result;
      }

      if (imageInfo.width > 4000 || imageInfo.height > 4000) {
        result.isValid = false;
        result.error = 'Image dimensions too large (maximum 4000x4000)';
        return result;
      }

      // Calculate image quality metrics
      result.metadata.quality = await calculateImageQuality(file.path);
    }

    // For PDFs, perform basic validation
    if (file.mimetype === 'application/pdf') {
      // Basic PDF validation would go here
      result.metadata.pages = 1; // Placeholder
    }

  } catch (error) {
    result.isValid = false;
    result.error = 'Error validating file: ' + error.message;
  }

  return result;
}

/**
 * Calculate image quality metrics
 */
async function calculateImageQuality(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const stats = await image.stats();

    const quality = {
      resolution: {
        width: metadata.width,
        height: metadata.height,
        megapixels: Math.round((metadata.width * metadata.height) / 1000000 * 100) / 100
      },
      brightness: calculateBrightness(stats),
      contrast: calculateContrast(stats),
      sharpness: await estimateSharpness(imagePath),
      overallScore: 0
    };

    // Calculate overall quality score (0-100)
    let score = 0;

    // Resolution score (30%)
    const minResolution = 800 * 600; // 0.48MP
    const resolutionScore = Math.min(100, (metadata.width * metadata.height) / minResolution * 30);
    score += resolutionScore;

    // Brightness score (25%)
    const brightnessScore = quality.brightness >= 30 && quality.brightness <= 70 ? 25 : Math.abs(50 - quality.brightness) * 0.5;
    score += brightnessScore;

    // Contrast score (25%)
    const contrastScore = Math.min(25, quality.contrast * 0.5);
    score += contrastScore;

    // Sharpness score (20%)
    const sharpnessScore = Math.min(20, quality.sharpness * 0.4);
    score += sharpnessScore;

    quality.overallScore = Math.round(score);

    return quality;
  } catch (error) {
    console.error('Error calculating image quality:', error);
    return { overallScore: 50 }; // Default medium quality
  }
}

/**
 * Calculate image brightness
 */
function calculateBrightness(stats) {
  if (!stats || !stats.channels) return 50;

  const avgBrightness = stats.channels.reduce((sum, channel) => {
    return sum + (channel.mean / 255) * 100;
  }, 0) / stats.channels.length;

  return Math.round(avgBrightness);
}

/**
 * Calculate image contrast
 */
function calculateContrast(stats) {
  if (!stats || !stats.channels) return 50;

  const avgContrast = stats.channels.reduce((sum, channel) => {
    return sum + (channel.stdev / 255) * 100;
  }, 0) / stats.channels.length;

  return Math.round(avgContrast);
}

/**
 * Estimate image sharpness
 */
async function estimateSharpness(imagePath) {
  try {
    // Convert to grayscale and apply edge detection
    const { data, info } = await sharp(imagePath)
      .resize(200, 200, { fit: 'inside' })
      .greyscale()
      .sharp({ sigma: 1, flat: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate edge detection score
    const pixels = new Uint8Array(data);
    let edgeCount = 0;

    for (let i = 1; i < pixels.length - 1; i++) {
      const diff = Math.abs(pixels[i] - pixels[i - 1]);
      if (diff > 30) edgeCount++;
    }

    return Math.min(100, (edgeCount / pixels.length) * 1000);
  } catch (error) {
    console.error('Error estimating sharpness:', error);
    return 50;
  }
}

/**
 * Clean up uploaded files middleware
 */
const cleanupUploadedFiles = (req, res, next) => {
  // Store files for cleanup after response
  res.on('finish', () => {
    const files = req.files || [req.file];
    if (files) {
      files.forEach(file => {
        // Don't delete files immediately in case they're needed
        // In production, implement a cleanup job that runs after processing
      });
    }
  });

  next();
};

module.exports = {
  uploadKYCDocuments,
  uploadSingleDocument,
  validateUploadedFiles,
  cleanupUploadedFiles,
  calculateImageQuality,
  validateFile
};