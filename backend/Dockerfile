# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install dependencies for Tesseract
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-osd \
    tesseract-ocr-data-ben \
    tesseract-ocr-data-hin \
    tesseract-ocr-data-tam \
    tesseract-ocr-data-tel \
    tesseract-ocr-data-mar \
    tesseract-ocr-data-guj \
    tesseract-ocr-data-pan \
    tesseract-ocr-data-kan \
    tesseract-ocr-data-mal \
    tesseract-ocr-data-ori \
    tesseract-ocr-data-pun \
    tesseract-ocr-data-asm \
    tesseract-ocr-data-urd \
    tesseract-ocr-data-nep \
    tesseract-ocr-data-sin \
    tesseract-ocr-data-bod \
    tesseract-ocr-data-mya \
    jpeg-dev \
    png-dev \
    giflib-dev \
    libwebp-dev \
    imagemagick-dev \
    make \
    gcc \
    g++ \
    python3 \
    pixman-dev \
    cairo-dev \
    pango-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Create uploads directory
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Set proper permissions
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]