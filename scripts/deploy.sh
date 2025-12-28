#!/bin/bash
# =============================================================================
# Production Deployment Script
# Öğrenci Sistemi - Flask Application
# =============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/your-org}"
IMAGE_NAME="${IMAGE_NAME:-ogrenci-sistemi}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "${PROJECT_ROOT}/.env.production" ]; then
        log_error ".env.production file not found"
        log_info "Copy .env.production.template to .env.production and configure it"
        exit 1
    fi
    
    log_success "All requirements met"
}

# =============================================================================
# BUILD FUNCTIONS
# =============================================================================

build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    docker build \
        --target production \
        --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
        --tag "${IMAGE_NAME}:latest" \
        --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --build-arg VCS_REF="${IMAGE_TAG}" \
        --file "${PROJECT_ROOT}/Dockerfile" \
        "${PROJECT_ROOT}"
    
    log_success "Image built successfully"
}

push_image() {
    log_info "Pushing image to registry: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    docker tag "${IMAGE_NAME}:latest" "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
    
    docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
    
    log_success "Image pushed successfully"
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if database is accessible
    docker-compose -f "${COMPOSE_FILE}" run --rm api python -c "
from app import create_app
from app.extensions import db
app = create_app()
with app.app_context():
    db.engine.execute('SELECT 1')
    print('Database connection successful')
" 2>/dev/null || {
        log_warning "Could not verify database connection"
    }
    
    log_success "Pre-deployment checks completed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    docker-compose -f "${COMPOSE_FILE}" run --rm api flask db upgrade
    
    log_success "Migrations completed"
}

deploy() {
    log_info "Starting deployment..."
    
    # Pull latest images
    docker-compose -f "${COMPOSE_FILE}" pull
    
    # Start/update services
    docker-compose -f "${COMPOSE_FILE}" up -d --remove-orphans
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    check_health
    
    log_success "Deployment completed successfully!"
}

rolling_update() {
    log_info "Performing rolling update..."
    
    # Update API instances one by one
    for service in api-1 api-2; do
        log_info "Updating ${service}..."
        docker-compose -f "${COMPOSE_FILE}" up -d --no-deps --build "${service}"
        
        # Wait for health check
        sleep 30
        
        # Verify health
        docker-compose -f "${COMPOSE_FILE}" exec -T "${service}" curl -sf http://localhost:8000/health/ready || {
            log_error "${service} health check failed"
            exit 1
        }
        
        log_success "${service} updated successfully"
    done
    
    # Update Celery workers
    log_info "Updating Celery workers..."
    docker-compose -f "${COMPOSE_FILE}" up -d --no-deps --build celery
    
    log_success "Rolling update completed"
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_health() {
    log_info "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost/health/ready > /dev/null 2>&1; then
            log_success "Services are healthy"
            return 0
        fi
        
        log_info "Waiting for services... (attempt ${attempt}/${max_attempts})"
        sleep 5
        ((attempt++))
    done
    
    log_error "Services failed to become healthy"
    return 1
}

show_status() {
    log_info "Service Status:"
    docker-compose -f "${COMPOSE_FILE}" ps
    
    echo ""
    log_info "Container Health:"
    docker-compose -f "${COMPOSE_FILE}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        $(docker-compose -f "${COMPOSE_FILE}" ps -q) 2>/dev/null || true
}

show_logs() {
    local service="${1:-}"
    local lines="${2:-100}"
    
    if [ -n "$service" ]; then
        docker-compose -f "${COMPOSE_FILE}" logs --tail="${lines}" -f "${service}"
    else
        docker-compose -f "${COMPOSE_FILE}" logs --tail="${lines}" -f
    fi
}

# =============================================================================
# MAINTENANCE FUNCTIONS
# =============================================================================

stop() {
    log_info "Stopping all services..."
    docker-compose -f "${COMPOSE_FILE}" down
    log_success "Services stopped"
}

restart() {
    log_info "Restarting services..."
    docker-compose -f "${COMPOSE_FILE}" restart
    log_success "Services restarted"
}

cleanup() {
    log_info "Cleaning up unused resources..."
    
    docker system prune -f
    docker volume prune -f
    docker image prune -f
    
    log_success "Cleanup completed"
}

backup_database() {
    log_info "Creating database backup..."
    "${SCRIPT_DIR}/backup.sh"
}

# =============================================================================
# MAIN
# =============================================================================

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build         Build Docker image"
    echo "  push          Push image to registry"
    echo "  deploy        Deploy application"
    echo "  update        Perform rolling update"
    echo "  migrate       Run database migrations"
    echo "  status        Show service status"
    echo "  logs [svc]    Show logs (optionally for specific service)"
    echo "  health        Check health status"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  backup        Backup database"
    echo "  cleanup       Clean up unused Docker resources"
    echo "  full          Full deployment (build + migrate + deploy)"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_ENV      Deployment environment (default: production)"
    echo "  DOCKER_REGISTRY Docker registry URL"
    echo "  IMAGE_NAME      Docker image name"
    echo "  IMAGE_TAG       Docker image tag"
}

main() {
    case "${1:-}" in
        build)
            check_requirements
            build_image
            ;;
        push)
            push_image
            ;;
        deploy)
            check_requirements
            deploy
            ;;
        update)
            check_requirements
            rolling_update
            ;;
        migrate)
            run_migrations
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-}" "${3:-100}"
            ;;
        health)
            check_health
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        backup)
            backup_database
            ;;
        cleanup)
            cleanup
            ;;
        full)
            check_requirements
            build_image
            run_migrations
            deploy
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
