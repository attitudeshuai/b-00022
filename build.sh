#!/bin/bash

set -e

echo "=========================================="
echo "  Jump Game - Build Script"
echo "=========================================="

VERSION=""
BUILD_DOCKER=false
SKIP_LINT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --docker)
            BUILD_DOCKER=true
            shift
            ;;
        --no-lint)
            SKIP_LINT=true
            shift
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

if [ -z "$VERSION" ]; then
    VERSION="$(node -p "require('./package.json').version")"
fi

echo ""
echo "Version: $VERSION"
echo ""

if [ "$SKIP_LINT" = false ]; then
    echo "=========================================="
    echo "  Step 1: Running lint check..."
    echo "=========================================="
    npm run lint
    echo "✓ Lint check passed"
    echo ""
fi

echo "=========================================="
echo "  Step 2: Preparing build..."
echo "=========================================="

mkdir -p build
echo "Version: $VERSION" > build/version.txt
echo "Build Time: $(date '+%Y-%m-%d %H:%M:%S')" >> build/version.txt
echo "✓ Version info saved to build/version.txt"
echo ""

if [ "$BUILD_DOCKER" = true ]; then
    echo "=========================================="
    echo "  Step 3: Building Docker image..."
    echo "=========================================="
    IMAGE_NAME="jump-game"
    IMAGE_TAG="$IMAGE_NAME:$VERSION"
    IMAGE_LATEST="$IMAGE_NAME:latest"
    BUILD_TIME="$(date '+%Y-%m-%d %H:%M:%S')"
    
    docker build \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        -t "$IMAGE_TAG" \
        -t "$IMAGE_LATEST" \
        .
    
    echo ""
    echo "✓ Docker image built:"
    echo "  - $IMAGE_TAG"
    echo "  - $IMAGE_LATEST"
    echo ""
    echo "✓ To verify version, run:"
    echo "  docker inspect $IMAGE_TAG | grep -A5 org.opencontainers"
    echo ""
fi

echo "=========================================="
echo "  Build completed successfully!"
echo "=========================================="
echo "Version: $VERSION"
if [ "$BUILD_DOCKER" = true ]; then
    echo "Docker image: jump-game:$VERSION"
fi
echo ""
