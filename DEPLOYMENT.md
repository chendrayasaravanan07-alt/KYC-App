# KYC Verification System - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Monitoring and Health Checks](#monitoring-and-health-checks)
7. [Backup and Recovery](#backup-and-recovery)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: Minimum 50GB free space
- **CPU**: Minimum 4 cores, Recommended 8+ cores

### Software Dependencies

- **Docker**: 20.10+ and Docker Compose 2.0+
- **Node.js**: 18.x (for manual deployment)
- **MongoDB**: 7.0+ (for manual deployment)
- **Redis**: 7.0+ (for manual deployment)
- **Git**: Latest version

## Quick Start

### Using Docker (Recommended)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd KYC-App
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy the System**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

4. **Access the Application**
   - Admin Panel: http://localhost:3000
   - Backend API: http://localhost:5000
   - Mobile API: http://localhost:5001

### Default Credentials

- **Admin Login**: admin@kyc.com / admin123
- **MongoDB**: admin / password123
- **Redis**: No authentication (default)

## Environment Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Database Configuration
```bash
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DATABASE=kyc_system
```

#### Application Configuration
```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=24h
ALLOWED_ORIGINS=https://yourdomain.com
```

#### File Upload Configuration
```bash
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
```

#### Cloudinary (Optional)
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Docker Deployment

### Production Deployment

1. **Update Environment**
   ```bash
   # Production environment
   NODE_ENV=production

   # Security
   JWT_SECRET=your-production-jwt-secret
   MONGO_ROOT_PASSWORD=your-secure-db-password

   # Domains
   ALLOWED_ORIGINS=https://yourdomain.com
   VITE_API_URL=https://api.yourdomain.com
   ```

2. **Deploy with Nginx Proxy**
   ```bash
   # Deploy with nginx reverse proxy
   docker-compose --profile production up -d
   ```

3. **SSL Configuration**
   ```bash
   # Place your SSL certificates in nginx/ssl/
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

### Service Scaling

Scale individual services as needed:

```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Scale admin panel
docker-compose up -d --scale admin-panel=2
```

### Volume Management

```bash
# List volumes
docker volume ls

# Backup volumes
docker run --rm -v kyc-app_mongodb_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mongodb-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v kyc-app_mongodb_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mongodb-backup.tar.gz -C /data
```

## Manual Deployment

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install --production
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env file
   ```

3. **Database Setup**
   ```bash
   # Ensure MongoDB is running
   sudo systemctl start mongod

   # Create database user
   mongosh
   > use kyc_system
   > db.createUser({
     user: "kyc_user",
     pwd: "secure_password",
     roles: ["readWrite"]
   })
   ```

4. **Start the Application**
   ```bash
   npm start
   # Or with PM2 for production
   pm2 start server.js --name kyc-backend
   ```

### Admin Panel Setup

1. **Install Dependencies**
   ```bash
   cd admin-panel
   npm install
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Serve with Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           root /path/to/admin-panel/dist;
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:5000/;
       }
   }
   ```

## Monitoring and Health Checks

### Health Check Endpoints

- **Backend**: `GET /health`
- **Admin Panel**: `GET /`

### Monitoring Setup

1. **Application Monitoring**
   ```bash
   # View logs
   docker-compose logs -f backend
   docker-compose logs -f admin-panel
   ```

2. **System Monitoring**
   ```bash
   # Resource usage
   docker stats

   # Disk usage
   df -h
   ```

3. **Database Monitoring**
   ```bash
   # MongoDB status
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ismaster')"
   ```

### Alert Configuration

Create monitoring alerts for:

- High memory usage (>80%)
- High CPU usage (>90%)
- Disk space low (<10% free)
- Service downtime
- Database connection failures

## Backup and Recovery

### Automated Backups

1. **Database Backups**
   ```bash
   # Create backup script
   cat > scripts/backup-db.sh << 'EOF'
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   docker-compose exec mongodb mongodump --out /tmp/backup_$DATE
   docker cp $(docker-compose ps -q mongodb):/tmp/backup_$DATE ./backups/
   EOF

   chmod +x scripts/backup-db.sh
   ```

2. **Scheduled Backups**
   ```bash
   # Add to crontab
   0 2 * * * /path/to/KYC-App/scripts/backup-db.sh
   ```

### Recovery Procedures

1. **Restore Database**
   ```bash
   # Stop services
   docker-compose down

   # Restore from backup
   docker-compose up -d mongodb
   docker cp ./backups/backup_20231201_020000 $(docker-compose ps -q mongodb):/tmp/
   docker-compose exec mongodb mongorestore /tmp/backup_20231201_020000

   # Start all services
   docker-compose up -d
   ```

## Security Considerations

### Production Security

1. **Network Security**
   - Use HTTPS/TLS encryption
   - Configure firewall rules
   - Use VPN for database access

2. **Application Security**
   - Change default passwords
   - Use strong JWT secrets
   - Enable rate limiting
   - Configure CORS properly

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Use secure file storage
   - Implement audit logging
   - Regular security updates

### SSL/TLS Configuration

1. **Generate SSL Certificates**
   ```bash
   # Self-signed (development)
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

   # Let's Encrypt (production)
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Update Nginx Configuration**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       # SSL settings
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
   }
   ```

## Troubleshooting

### Common Issues

1. **Services Won't Start**
   ```bash
   # Check logs
   docker-compose logs [service-name]

   # Check port conflicts
   netstat -tulpn | grep [port]

   # Check disk space
   df -h
   ```

2. **Database Connection Issues**
   ```bash
   # Test MongoDB connection
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

   # Check network connectivity
   docker network ls
   docker network inspect kyc-app_kyc-network
   ```

3. **High Memory Usage**
   ```bash
   # Check container memory usage
   docker stats

   # Restart high-memory containers
   docker-compose restart [service-name]
   ```

4. **File Upload Issues**
   ```bash
   # Check upload permissions
   ls -la uploads/

   # Check disk space
   df -h uploads/

   # Clear old files
   find uploads/ -type f -mtime +30 -delete
   ```

### Performance Optimization

1. **Database Optimization**
   ```bash
   # Create indexes
   docker-compose exec mongodb mongosh kyc_system --eval "db.users.createIndex({email: 1})"
   docker-compose exec mongodb mongosh kyc_system --eval "db.kycapplications.createIndex({applicationId: 1})"
   ```

2. **Application Scaling**
   ```bash
   # Scale horizontally
   docker-compose up -d --scale backend=3

   # Configure load balancer
   # (Update nginx.conf with upstream configuration)
   ```

3. **Cache Optimization**
   ```bash
   # Clear Redis cache
   docker-compose exec redis redis-cli FLUSHALL

   # Monitor Redis usage
   docker-compose exec redis redis-cli INFO memory
   ```

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily**: Monitor system health and logs
- **Weekly**: Review security updates and patch systems
- **Monthly**: Update dependencies and clean up old data
- **Quarterly**: Review performance metrics and optimize

### Getting Help

1. **Documentation**: Check all `.md` files in the repository
2. **Logs**: Review application and system logs
3. **Health Checks**: Run `/health` endpoints
4. **Community**: Open issues on the project repository

### Emergency Contacts

- **System Administrator**: [admin-email]
- **Development Team**: [dev-email]
- **Support Portal**: [support-url]

---

**Note**: This guide assumes you have basic knowledge of Docker, Linux administration, and web application deployment. For production deployments, consider consulting with a DevOps professional.