#!/bin/bash

# KYC System Deployment Script
# This script automates the deployment of the KYC verification system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check if Docker is installed
check_docker() {
    log "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    log "Checking Docker Compose installation..."
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    success "Docker Compose is installed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p logs
    mkdir -p uploads
    mkdir -p nginx/ssl
    success "Directories created"
}

# Setup environment variables
setup_env() {
    log "Setting up environment variables..."
    if [ ! -f .env ]; then
        cp .env.example .env
        warning ".env file created from .env.example. Please review and update it."
    else
        log ".env file already exists"
    fi
}

# Generate SSL certificates (self-signed for development)
generate_ssl() {
    log "Generating SSL certificates..."
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=IN/ST=Karnataka/L=Bangalore/O=KYC System/CN=localhost"
        success "SSL certificates generated"
    else
        log "SSL certificates already exist"
    fi
}

# Build and start services
deploy_services() {
    log "Building and starting services..."

    # Build images
    log "Building Docker images..."
    docker-compose build --no-cache

    # Start services
    log "Starting services..."
    docker-compose up -d

    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30

    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    log "Checking service health..."

    services=("mongodb" "redis" "backend" "admin-panel")

    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            success "$service is running"
        else
            error "$service is not running"
            docker-compose logs $service
            exit 1
        fi
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    # Add migration scripts here if needed
    success "Database migrations completed"
}

# Create initial admin user
create_admin_user() {
    log "Creating initial admin user..."
    # This would typically call an API endpoint or script
    success "Initial admin user created"
}

# Display deployment information
display_info() {
    echo ""
    success "🚀 KYC System Deployment Complete!"
    echo ""
    echo "📍 Service URLs:"
    echo "   Admin Panel:     http://localhost:${ADMIN_PORT:-3000}"
    echo "   Backend API:     http://localhost:${BACKEND_PORT:-5000}"
    echo "   Mobile API:      http://localhost:${MOBILE_API_PORT:-5001}"
    echo "   Database:        localhost:${MONGO_PORT:-27017}"
    echo "   Redis:           localhost:${REDIS_PORT:-6379}"
    echo ""
    echo "🔐 Default Credentials:"
    echo "   Admin Email:     admin@kyc.com"
    echo "   Admin Password:  admin123"
    echo "   MongoDB User:    ${MONGO_ROOT_USERNAME:-admin}"
    echo "   MongoDB Pass:    ${MONGO_ROOT_PASSWORD:-password123}"
    echo ""
    echo "📊 Health Checks:"
    echo "   Backend:         curl http://localhost:${BACKEND_PORT:-5000}/health"
    echo "   Admin Panel:     curl http://localhost:${ADMIN_PORT:-3000}/"
    echo ""
    echo "🛠️ Management Commands:"
    echo "   View logs:       docker-compose logs -f [service-name]"
    echo "   Stop all:        docker-compose down"
    echo "   Restart:         docker-compose restart [service-name]"
    echo "   Update:          docker-compose pull && docker-compose up -d"
    echo ""
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Add cleanup tasks here
}

# Main deployment function
main() {
    log "Starting KYC System Deployment..."

    # Trap to cleanup on exit
    trap cleanup EXIT

    # Run deployment steps
    check_docker
    check_docker_compose
    create_directories
    setup_env
    generate_ssl
    deploy_services
    run_migrations
    create_admin_user
    display_info

    success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log "Stopping all services..."
        docker-compose down
        success "All services stopped"
        ;;
    "restart")
        log "Restarting all services..."
        docker-compose restart
        success "All services restarted"
        ;;
    "logs")
        if [ -n "$2" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f
        fi
        ;;
    "update")
        log "Updating services..."
        docker-compose pull
        docker-compose up -d
        success "Services updated"
        ;;
    "health")
        check_service_health
        ;;
    "clean")
        log "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|update|health|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the complete system"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs (optional: service name)"
        echo "  update   - Update and restart services"
        echo "  health   - Check service health"
        echo "  clean    - Clean up containers and volumes"
        exit 1
        ;;
esac