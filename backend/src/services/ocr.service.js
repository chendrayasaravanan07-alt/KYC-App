const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

/**
 * OCR Service - Tesseract.js Integration
 * Handles text extraction from Indian ID documents with specialized parsing
 */

class OCRService {
  constructor() {
    this.worker = null;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [OCR]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Initialize Tesseract worker
   */
  async initializeWorker() {
    try {
      if (this.worker) {
        return this.worker;
      }

      this.logger.info('Initializing Tesseract worker...');
      this.worker = await createWorker('eng+hin', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Set parameters for better ID card recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:/- ',
        tessedit_pageseg_mode: '6', // Assume uniform text block
        preserve_interword_spaces: '1'
      });

      this.logger.info('Tesseract worker initialized successfully');
      return this.worker;
    } catch (error) {
      this.logger.error(`Failed to initialize OCR worker: ${error.message}`);
      throw new Error('OCR initialization failed');
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(/\.[^.]+$/, '_processed.jpg');

      await sharp(imagePath)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen({ sigma: 1, flat: 1, jagged: 2 })
        .threshold(128)
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      this.logger.info(`Image preprocessed: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Image preprocessing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imagePath, documentType = null) {
    try {
      const startTime = Date.now();

      // Initialize worker if not already done
      await this.initializeWorker();

      // Preprocess image for better accuracy
      const processedImagePath = await this.preprocessImage(imagePath);

      this.logger.info(`Starting OCR for ${documentType || 'document'}`);

      // Perform OCR
      const { data: { text, confidence } } = await this.worker.recognize(processedImagePath);

      // Clean up processed image
      try {
        await fs.unlink(processedImagePath);
      } catch (error) {
        this.logger.warn(`Failed to delete processed image: ${error.message}`);
      }

      const processingTime = Date.now() - startTime;

      this.logger.info(`OCR completed in ${processingTime}ms with ${confidence}% confidence`);

      return {
        extractedText: text.trim(),
        confidence: Math.round(confidence),
        processingTime,
        documentType
      };
    } catch (error) {
      this.logger.error(`OCR extraction failed: ${error.message}`);
      throw new Error('OCR text extraction failed');
    }
  }

  /**
   * Parse Aadhaar card specific data
   */
  parseAadhaarData(text) {
    const aadhaarPatterns = {
      name: /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(?:DOB|Date of Birth)/i,
      dob: /(?:DOB|Date of Birth)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4}|[0-9]{4}[\/\-][0-9]{2}[\/\-][0-9]{2})/i,
      aadhaarNumber: /(?:Aadhaar|'>0)?[:\s]*([2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4})/i,
      address: /Address[:\s]*([^\n]*(?:\n[^A-Z0-9]*[a-zA-Z0-9\/\-\s]*)*)/i,
      father: /Father[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      husband: /Husband[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i
    };

    const result = {
      name: null,
      dob: null,
      aadhaarNumber: null,
      address: null,
      fatherName: null,
      husbandName: null
    };

    // Extract each field
    for (const [field, pattern] of Object.entries(aadhaarPatterns)) {
      const match = text.match(pattern);
      if (match) {
        let value = match[1] || match[0];

        // Clean up the extracted value
        value = value.trim().replace(/\s+/g, ' ');

        // Format date of birth
        if (field === 'dob') {
          value = this.formatDate(value);
        }

        // Format Aadhaar number
        if (field === 'aadhaarNumber') {
          value = value.replace(/\s/g, '');
          // Validate Aadhaar number format
          if (!/^[2-9][0-9]{11}$/.test(value)) {
            continue; // Skip invalid format
          }
        }

        result[field === 'father' ? 'fatherName' : field === 'husband' ? 'husbandName' : field] = value;
      }
    }

    return result;
  }

  /**
   * Parse PAN card specific data
   */
  parsePANData(text) {
    const panPatterns = {
      name: /Name[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      fatherName: /Father['']?s?\s*Name[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      panNumber: /(?:PAN|Permanent Account Number)[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/i,
      dob: /(?:DOB|Date of Birth)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i
    };

    const result = {
      name: null,
      fatherName: null,
      panNumber: null,
      dob: null
    };

    for (const [field, pattern] of Object.entries(panPatterns)) {
      const match = text.match(pattern);
      if (match) {
        let value = match[1] || match[0];
        value = value.trim();

        if (field === 'dob') {
          value = this.formatDate(value);
        }

        result[field] = value;
      }
    }

    return result;
  }

  /**
   * Parse address proof data
   */
  parseAddressData(text) {
    const result = {
      name: null,
      address: null,
      city: null,
      state: null,
      pincode: null
    };

    // Extract name (usually at the beginning)
    const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/m);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
    }

    // Extract pincode
    const pincodeMatch = text.match(/([0-9]{6})/);
    if (pincodeMatch) {
      result.pincode = pincodeMatch[1];
    }

    // Extract address (everything between name and pincode)
    if (result.name && result.pincode) {
      const addressText = text.substring(
        text.indexOf(result.name) + result.name.length,
        text.indexOf(result.pincode)
      ).trim();

      result.address = addressText.replace(/[,\n]+/g, ', ').trim();
    }

    return result;
  }

  /**
   * Format date string to ISO format
   */
  formatDate(dateString) {
    const formats = [
      /([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{4})/, // DD/MM/YYYY or DD-MM-YYYY
      /([0-9]{4})[\/\-]([0-9]{2})[\/\-]([0-9]{2})/  // YYYY/MM/DD or YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let [_, part1, part2, part3] = match;

        // Determine format and convert to YYYY-MM-DD
        if (part1.length === 4) {
          // YYYY/MM/DD format
          return `${part1}-${part2}-${part3}`;
        } else {
          // DD/MM/YYYY format (Indian standard)
          return `${part3}-${part2}-${part1}`;
        }
      }
    }

    return dateString; // Return original if cannot parse
  }

  /**
   * Process document with specialized parsing based on type
   */
  async processDocument(imagePath, documentType) {
    try {
      const ocrResult = await this.extractText(imagePath, documentType);

      let parsedFields = {};

      switch (documentType.toLowerCase()) {
        case 'aadhaar':
          parsedFields = this.parseAadhaarData(ocrResult.extractedText);
          break;
        case 'pan':
          parsedFields = this.parsePANData(ocrResult.extractedText);
          break;
        case 'address':
          parsedFields = this.parseAddressData(ocrResult.extractedText);
          break;
        default:
          // For unknown document types, try all parsers
          parsedFields = {
            ...this.parseAadhaarData(ocrResult.extractedText),
            ...this.parsePANData(ocrResult.extractedText),
            ...this.parseAddressData(ocrResult.extractedText)
          };
      }

      // Validate extracted data quality
      const validation = this.validateExtractedData(parsedFields, documentType);

      return {
        ...ocrResult,
        fields: parsedFields,
        validation,
        documentType
      };
    } catch (error) {
      this.logger.error(`Document processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate extracted data quality
   */
  validateExtractedData(fields, documentType) {
    const validation = {
      isValid: true,
      confidence: 0,
      missingFields: [],
      lowQualityFields: []
    };

    const requiredFields = {
      aadhaar: ['name', 'dob', 'aadhaarNumber'],
      pan: ['name', 'panNumber', 'dob'],
      address: ['name', 'address']
    };

    const docType = documentType.toLowerCase();
    const required = requiredFields[docType] || [];

    // Check required fields
    required.forEach(field => {
      if (!fields[field] || fields[field].trim() === '') {
        validation.missingFields.push(field);
        validation.isValid = false;
      }
    });

    // Calculate overall confidence based on field completeness
    const completedFields = required.filter(field => fields[field]).length;
    validation.confidence = Math.round((completedFields / required.length) * 100);

    // Check data quality indicators
    if (fields.aadhaarNumber && !/^[2-9][0-9]{11}$/.test(fields.aadhaarNumber.replace(/\s/g, ''))) {
      validation.lowQualityFields.push('aadhaarNumber');
      validation.isValid = false;
    }

    if (fields.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fields.panNumber)) {
      validation.lowQualityFields.push('panNumber');
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Terminate OCR worker
   */
  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.logger.info('OCR worker terminated');
    }
  }
}

module.exports = OCRService;