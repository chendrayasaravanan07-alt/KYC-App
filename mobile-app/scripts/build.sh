#!/bin/bash

# KYC Mobile App Build Script
# This script handles the complete build process for all platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the mobile-app directory."
    exit 1
fi

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi

    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        print_warning "Expo CLI is not installed. Installing..."
        npm install -g @expo/cli
    fi

    print_success "Prerequisites check completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    if [ ! -d "node_modules" ]; then
        npm ci
    else
        print_status "Dependencies already installed, updating..."
        npm update
    fi

    print_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."

    # Run linting
    print_status "Running ESLint..."
    npm run lint || {
        print_warning "Linting found issues. Continue anyway? (y/n)"
        read -r response
        if [[ ! $response =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }

    # Run unit tests
    print_status "Running unit tests..."
    npm test || {
        print_warning "Some tests failed. Continue anyway? (y/n)"
        read -r response
        if [[ ! $response =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }

    print_success "Tests completed"
}

# Function to build for web
build_web() {
    print_status "Building for web..."

    # Clean previous build
    rm -rf build

    # Export web build
    npx expo export --platform web --output-dir build

    print_success "Web build completed successfully"
}

# Function to build for iOS
build_ios() {
    print_status "Building for iOS..."

    # Check if we have iOS development environment
    if command -v xcodebuild &> /dev/null; then
        print_status "iOS development environment detected"
    else
        print_warning "Xcode not found. This might cause issues with iOS build."
    fi

    # Use EAS Build for production
    if command -v eas &> /dev/null; then
        print_status "Building with EAS Build for iOS..."
        eas build --platform ios --profile production
    else
        print_status "Building locally for iOS..."
        expo build:ios
    fi

    print_success "iOS build completed successfully"
}

# Function to build for Android
build_android() {
    print_status "Building for Android..."

    # Check if we have Android development environment
    if [ -n "$ANDROID_HOME" ]; then
        print_status "Android development environment detected"
    else
        print_warning "ANDROID_HOME not set. Android build might fail."
    fi

    # Use EAS Build for production
    if command -v eas &> /dev/null; then
        print_status "Building with EAS Build for Android..."
        eas build --platform android --profile production
    else
        print_status "Building locally for Android..."
        expo build:android
    fi

    print_success "Android build completed successfully"
}

# Function to create release
create_release() {
    print_status "Creating release package..."

    # Create release directory
    mkdir -p release

    # Copy web build if it exists
    if [ -d "build" ]; then
        cp -r build release/web
        print_status "Web build copied to release directory"
    fi

    # Create version info
    VERSION=$(node -p "require('./package.json').version")
    echo "KYC Mobile App v$VERSION" > release/VERSION.txt
    echo "Build Date: $(date)" >> release/VERSION.txt
    echo "Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')" >> release/VERSION.txt

    # Create build summary
    cat > release/BUILD_SUMMARY.md << EOF
# KYC Mobile App Build Summary

**Version**: $VERSION
**Build Date**: $(date)
**Platform**: React Native with Expo

## Features Implemented
- Multi-step KYC verification form
- Document upload with camera integration
- Liveness detection with anti-spoofing
- Real-time status tracking
- Biometric authentication
- Push notifications
- Professional UI/UX with animations

## Technical Stack
- React Native 0.75.4
- Expo SDK 54
- TypeScript Ready
- Cross-platform support (iOS, Android, Web)

## Build Artifacts
- Web: \`web/\` directory
- iOS: Available via EAS Build
- Android: Available via EAS Build

## Deployment Instructions
See README.md for detailed deployment instructions.
EOF

    print_success "Release package created successfully"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up temporary files..."

    # Remove temporary files
    rm -rf .expo temp

    print_success "Cleanup completed"
}

# Function to show build summary
show_summary() {
    print_status "Build Summary"
    echo "=================="
    echo "Project: KYC Mobile App"
    echo "Version: $(node -p "require('./package.json').version")"
    echo "Build Date: $(date)"
    echo "Build Directory: $(pwd)/release"
    echo ""
    echo "Available builds:"
    if [ -d "release/web" ]; then
        echo "  ✅ Web build: release/web/"
    fi
    echo "  📱 iOS build: Available via EAS Build"
    echo "  📱 Android build: Available via EAS Build"
    echo ""
    echo "Next steps:"
    echo "1. Test the web build by running a local server"
    echo "2. Download iOS/Android builds from EAS dashboard"
    echo "3. Deploy to app stores using the build artifacts"
}

# Main build function
main() {
    echo "🚀 KYC Mobile App Build Script"
    echo "================================="

    # Parse command line arguments
    PLATFORMS="web"
    SKIP_TESTS=false
    SKIP_DEPS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --platforms PLATFORMS    Platforms to build (web,ios,android,all) [default: web]"
                echo "  --skip-tests             Skip running tests"
                echo "  --skip-deps              Skip dependency installation"
                echo "  --help                   Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                       # Build web only"
                echo "  $0 --platforms all       # Build all platforms"
                echo "  $0 --platforms ios       # Build iOS only"
                echo "  $0 --skip-tests          # Build web without tests"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Convert platforms string to array
    if [ "$PLATFORMS" = "all" ]; then
        PLATFORMS="web ios android"
    fi

    # Build process
    check_prerequisites

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi

    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi

    # Build for each platform
    for platform in $PLATFORMS; do
        case $platform in
            web)
                build_web
                ;;
            ios)
                build_ios
                ;;
            android)
                build_android
                ;;
            *)
                print_error "Unknown platform: $platform"
                exit 1
                ;;
        esac
    done

    create_release
    cleanup
    show_summary

    print_success "Build process completed successfully! 🎉"
}

# Handle errors
trap 'print_error "Build process failed!"' ERR

# Run main function with all arguments
main "$@"