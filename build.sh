#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

APP_NAME="jump-game"
VERSION=""
ENV="prod"
SKIP_CHECK=false
SKIP_DOCKER=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Build script for ${APP_NAME}

Options:
    -v, --version VERSION   Set image version tag (default: auto from package.json + git short SHA)
    -e, --env ENV           Set environment: dev|prod (default: prod)
    --skip-check            Skip lint and typecheck
    --skip-docker           Skip docker build (only run checks)
    -h, --help              Show this help message

Examples:
    $(basename "$0")                          # Full build with auto version
    $(basename "$0") -v 1.2.0                 # Build with explicit version
    $(basename "$0") -e dev -v 1.0.0-beta.1   # Dev build with beta tag
    $(basename "$0") --skip-docker            # Only run lint + typecheck
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -v|--version)
                VERSION="$2"; shift 2 ;;
            -e|--env)
                ENV="$2"; shift 2 ;;
            --skip-check)
                SKIP_CHECK=true; shift ;;
            --skip-docker)
                SKIP_DOCKER=true; shift ;;
            -h|--help)
                usage; exit 0 ;;
            *)
                log_fail "Unknown option: $1"; usage; exit 1 ;;
        esac
    done
}

resolve_version() {
    if [[ -n "$VERSION" ]]; then
        return
    fi

    local pkg_version
    pkg_version=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")

    local git_sha=""
    if git rev-parse --short HEAD &>/dev/null; then
        git_sha="-g$(git rev-parse --short HEAD)"
    fi

    local timestamp=""
    if [[ "$ENV" == "dev" ]]; then
        timestamp=".$(date +%Y%m%d%H%M%S)"
    fi

    VERSION="${pkg_version}${git_sha}${timestamp}"
    log_info "Auto-resolved version: ${VERSION}"
}

step_install_deps() {
    log_info "Installing dependencies..."
    if [[ -f package.json ]]; then
        npm install --silent 2>/dev/null || npm install
    fi
    log_ok "Dependencies installed"
}

step_lint() {
    log_info "Running ESLint..."
    if npx eslint 'assets/scripts/**/*.ts' 2>&1; then
        log_ok "Lint passed"
    else
        log_fail "Lint failed"
        return 1
    fi
}

step_typecheck() {
    log_info "Running TypeScript type check..."
    if npx tsc --noEmit 2>&1; then
        log_ok "Type check passed"
    else
        log_fail "Type check failed"
        return 1
    fi
}

step_docker_build() {
    local image_name="${APP_NAME}"
    local full_tag="${image_name}:${VERSION}"
    local env_tag="${image_name}:${ENV}"
    local build_date
    build_date="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    local vcs_ref
    vcs_ref="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

    log_info "Building Docker image: ${full_tag}"

    APP_VERSION="${VERSION}" \
    BUILD_DATE="${build_date}" \
    VCS_REF="${vcs_ref}" \
    docker compose build

    docker tag "${full_tag}" "${env_tag}"
    docker tag "${full_tag}" "${image_name}:latest"

    log_ok "Docker image built:"
    log_ok "  → ${full_tag}"
    log_ok "  → ${env_tag}"
    log_ok "  → ${image_name}:latest"

    local image_size
    image_size=$(docker images "${full_tag}" --format "{{.Size}}" 2>/dev/null || echo "unknown")
    log_info "Image size: ${image_size}"
}

main() {
    parse_args "$@"
    resolve_version

    echo ""
    echo "========================================"
    echo "  ${APP_NAME} Build"
    echo "  Version : ${VERSION}"
    echo "  Env     : ${ENV}"
    echo "========================================"
    echo ""

    step_install_deps

    if [[ "$SKIP_CHECK" == false ]]; then
        step_lint
        step_typecheck
    else
        log_warn "Skipping lint and typecheck (--skip-check)"
    fi

    if [[ "$SKIP_DOCKER" == false ]]; then
        step_docker_build
    else
        log_warn "Skipping Docker build (--skip-docker)"
    fi

    echo ""
    echo "========================================"
    log_ok "Build completed successfully!"
    if [[ "$SKIP_DOCKER" == false ]]; then
        echo "  Image: ${APP_NAME}:${VERSION}"
        echo ""
        echo "  Run with:"
        echo "    docker run -p 3000:80 ${APP_NAME}:${VERSION}"
    fi
    echo "========================================"
}

main "$@"
