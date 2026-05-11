#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

PACKAGE_VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date +"%Y%m%d")
BUILD_TIME=$(date +"%H%M%S")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
FULL_VERSION="${PACKAGE_VERSION}-${BUILD_DATE}"
IMAGE_NAME="jump-game"
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}

if [ -n "$DOCKER_REGISTRY" ]; then
    IMAGE_FULL_NAME="${DOCKER_REGISTRY}/${IMAGE_NAME}:${FULL_VERSION}"
    IMAGE_LATEST="${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
else
    IMAGE_FULL_NAME="${IMAGE_NAME}:${FULL_VERSION}"
    IMAGE_LATEST="${IMAGE_NAME}:latest"
fi

print_usage() {
    echo -e "${BLUE}Jump Game Build Script${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --lint        Run ESLint check only"
    echo "  --lint-fix    Run ESLint with auto-fix"
    echo "  --docker      Build Docker image"
    echo "  --version     Show version info"
    echo "  --push        Push Docker image after build"
    echo "  --no-cache    Build Docker image without cache"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --lint                    # Run lint check"
    echo "  $0 --docker                  # Build Docker image with version tag"
    echo "  $0 --docker --push           # Build and push Docker image"
    echo "  $0 --docker --no-cache       # Build Docker image without cache"
}

show_version() {
    echo -e "${BLUE}Version Information:${NC}"
    echo "  Package version: ${GREEN}${PACKAGE_VERSION}${NC}"
    echo "  Build date:      ${GREEN}${BUILD_DATE}${NC}"
    echo "  Build time:      ${GREEN}${BUILD_TIME}${NC}"
    echo "  Git commit:      ${GREEN}${GIT_COMMIT}${NC}"
    echo "  Full version:    ${GREEN}${FULL_VERSION}${NC}"
    echo "  Docker image:    ${GREEN}${IMAGE_FULL_NAME}${NC}"
}

run_lint() {
    echo -e "${BLUE}Running ESLint check...${NC}"
    if npx eslint assets/scripts/**/*.ts --ext .ts; then
        echo -e "${GREEN}ESLint check passed!${NC}"
        return 0
    else
        echo -e "${RED}ESLint check failed!${NC}"
        return 1
    fi
}

run_lint_fix() {
    echo -e "${BLUE}Running ESLint with auto-fix...${NC}"
    npx eslint assets/scripts/**/*.ts --ext .ts --fix
    echo -e "${GREEN}ESLint auto-fix completed!${NC}"
}

generate_version_file() {
    echo -e "${BLUE}Generating version information file...${NC}"
    cat > build/web-desktop/version.json << EOF
{
    "version": "${PACKAGE_VERSION}",
    "buildDate": "${BUILD_DATE}",
    "buildTime": "${BUILD_TIME}",
    "gitCommit": "${GIT_COMMIT}",
    "fullVersion": "${FULL_VERSION}"
}
EOF
    echo -e "${GREEN}Version file generated: build/web-desktop/version.json${NC}"
}

build_docker() {
    local NO_CACHE=""
    if [ "$1" == "no-cache" ]; then
        NO_CACHE="--no-cache"
        echo -e "${YELLOW}Building without cache...${NC}"
    fi

    if [ ! -d "build/web-desktop" ]; then
        echo -e "${YELLOW}Warning: build/web-desktop directory not found!${NC}"
        echo "Please build the project in Cocos Creator first."
        exit 1
    fi

    run_lint

    generate_version_file

    echo -e "${BLUE}Building Docker image...${NC}"
    echo "  Image name: ${GREEN}${IMAGE_FULL_NAME}${NC}"
    echo "  Latest tag: ${GREEN}${IMAGE_LATEST}${NC}"
    echo ""

    docker build ${NO_CACHE} \
        --build-arg VERSION="${FULL_VERSION}" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT}" \
        -t "${IMAGE_FULL_NAME}" \
        -t "${IMAGE_LATEST}" \
        .

    echo ""
    echo -e "${GREEN}Docker image built successfully!${NC}"
    echo ""
    echo "To run the container:"
    echo -e "  ${BLUE}docker run -p 3000:80 ${IMAGE_FULL_NAME}${NC}"
    echo ""
    echo "Available images:"
    docker images | grep -E "(jump-game|TAG)" | head -5
}

push_docker() {
    if [ -z "$DOCKER_REGISTRY" ]; then
        echo -e "${RED}Error: DOCKER_REGISTRY environment variable not set!${NC}"
        echo "Example: export DOCKER_REGISTRY=registry.example.com"
        exit 1
    fi

    echo -e "${BLUE}Pushing Docker image...${NC}"
    docker push "${IMAGE_FULL_NAME}"
    docker push "${IMAGE_LATEST}"
    echo -e "${GREEN}Docker image pushed successfully!${NC}"
}

LINT_ONLY=false
LINT_FIX=false
BUILD_DOCKER=false
SHOW_VERSION=false
PUSH_IMAGE=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --lint)
            LINT_ONLY=true
            shift
            ;;
        --lint-fix)
            LINT_FIX=true
            shift
            ;;
        --docker)
            BUILD_DOCKER=true
            shift
            ;;
        --version)
            SHOW_VERSION=true
            shift
            ;;
        --push)
            PUSH_IMAGE=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

if [ "$SHOW_VERSION" == true ]; then
    show_version
    exit 0
fi

if [ "$LINT_FIX" == true ]; then
    run_lint_fix
    exit 0
fi

if [ "$LINT_ONLY" == true ]; then
    run_lint
    exit 0
fi

if [ "$BUILD_DOCKER" == true ]; then
    if [ "$NO_CACHE" == true ]; then
        build_docker "no-cache"
    else
        build_docker
    fi
    
    if [ "$PUSH_IMAGE" == true ]; then
        push_docker
    fi
    exit 0
fi

print_usage
