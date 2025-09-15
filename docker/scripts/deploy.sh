#!/bin/bash

# =============================================================================
# EvalPoint Educational Platform - Deployment Script
# Comprehensive deployment script for educational platform infrastructure
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
LOG_FILE="${PROJECT_ROOT}/logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warn() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

# Check prerequisites
check_prerequisites() {
    log "${BLUE}🔍 Checking deployment prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        if ! command -v docker-compose &> /dev/null; then
            error_exit "Docker Compose is not installed or not in PATH"
        fi
    fi
    
    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            warn "No .env file found. Creating from .env.example"
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            warn "Please review and update the .env file with your configuration"
        else
            error_exit "No .env file found and no .env.example to copy from"
        fi
    fi
    
    # Check required directories
    local required_dirs=(
        "$PROJECT_ROOT/data/mongodb"
        "$PROJECT_ROOT/data/emails"
        "$PROJECT_ROOT/logs/mongodb"
        "$PROJECT_ROOT/logs/backend"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            info "Creating directory: $dir"
            mkdir -p "$dir"
        fi
    done
    
    success "Prerequisites check completed"
}

# Validate environment configuration
validate_environment() {
    log "${BLUE}🔧 Validating environment configuration...${NC}"
    
    # Source environment file
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.env"
    fi
    
    # Check required environment variables
    local required_vars=(
        "MONGODB_PASSWORD"
        "MONGODB_ROOT_PASSWORD"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    # Validate JWT secret length (should be at least 32 characters)
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        error_exit "JWT_SECRET must be at least 32 characters long for security"
    fi
    
    success "Environment configuration is valid"
}

# Build Docker images
build_images() {
    log "${BLUE}🔨 Building Docker images...${NC}"
    
    cd "$PROJECT_ROOT"
    
    if [[ "$DEPLOYMENT_ENV" == "development" ]]; then
        info "Building development images..."
        docker compose -f docker-compose.yml -f docker-compose.dev.yml build --parallel
    else
        info "Building production images..."
        docker compose build --parallel
    fi
    
    success "Docker images built successfully"
}

# Setup data directories and permissions
setup_data_directories() {
    log "${BLUE}📁 Setting up data directories and permissions...${NC}"
    
    # Create necessary directories with proper permissions
    local data_dirs=(
        "$PROJECT_ROOT/data/mongodb"
        "$PROJECT_ROOT/data/emails"
        "$PROJECT_ROOT/data/redis"
        "$PROJECT_ROOT/logs/mongodb"
        "$PROJECT_ROOT/logs/backend"
        "$PROJECT_ROOT/logs/nginx"
    )
    
    for dir in "${data_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            info "Creating directory: $dir"
            mkdir -p "$dir"
        fi
        
        # Set appropriate permissions for Docker containers
        # MongoDB typically runs as user 999
        if [[ "$dir" == *"mongodb"* ]]; then
            sudo chown -R 999:999 "$dir" 2>/dev/null || true
        fi
    done
    
    # Set permissions for log directories
    chmod -R 755 "$PROJECT_ROOT/logs/" 2>/dev/null || true
    
    success "Data directories setup completed"
}

# Deploy services
deploy_services() {
    log "${BLUE}🚀 Deploying educational platform services...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services if running
    info "Stopping existing services..."
    if [[ "$DEPLOYMENT_ENV" == "development" ]]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans
    else
        docker compose down --remove-orphans
    fi
    
    # Remove old volumes if specified
    if [[ "${CLEAN_VOLUMES:-false}" == "true" ]]; then
        warn "Cleaning up existing volumes..."
        docker volume prune -f
    fi
    
    # Start services
    info "Starting services..."
    if [[ "$DEPLOYMENT_ENV" == "development" ]]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    else
        docker compose up -d
    fi
    
    success "Services deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "${BLUE}🔍 Verifying deployment...${NC}"
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    if ! "$SCRIPT_DIR/wait-for-services.sh" platform; then
        error_exit "Services failed to start properly"
    fi
    
    # Run health checks
    info "Running comprehensive health checks..."
    if ! "$SCRIPT_DIR/health-check.sh"; then
        warn "Some health checks failed, but deployment may still be functional"
    fi
    
    # Check container status
    info "Checking container status..."
    docker compose ps
    
    success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Create monitoring directories
    mkdir -p "$PROJECT_ROOT/monitoring/prometheus"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana"
    
    # Setup log rotation
    if command -v logrotate &> /dev/null; then
        info "Setting up log rotation..."
        cat > "$PROJECT_ROOT/monitoring/logrotate.conf" << EOF
$PROJECT_ROOT/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker compose restart backend
    endscript
}
EOF
    fi
    
    success "Monitoring setup completed"
}

# Educational platform specific setup
setup_educational_features() {
    log "${BLUE}🎓 Setting up educational platform specific features...${NC}"
    
    # Setup email storage directory with proper structure
    local email_dirs=(
        "$PROJECT_ROOT/data/emails/sent"
        "$PROJECT_ROOT/data/emails/templates"
        "$PROJECT_ROOT/data/emails/attachments"
    )
    
    for dir in "${email_dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    # Create educational compliance directories
    mkdir -p "$PROJECT_ROOT/data/compliance/audit-logs"
    mkdir -p "$PROJECT_ROOT/data/compliance/exports"
    
    # Setup SSL certificates directory (if using HTTPS)
    if [[ "${HTTPS_ENABLED:-false}" == "true" ]]; then
        mkdir -p "$PROJECT_ROOT/docker/nginx/ssl"
        info "SSL certificates directory created. Please place your certificates there."
    fi
    
    success "Educational platform features setup completed"
}

# Backup current deployment (if exists)
backup_current_deployment() {
    log "${BLUE}💾 Creating backup of current deployment...${NC}"
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup environment file
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$backup_dir/.env.backup"
    fi
    
    # Backup database if MongoDB is running
    if docker ps --filter "name=evalpoint-mongodb" --filter "status=running" --format "{{.Names}}" | grep -q "evalpoint-mongodb"; then
        info "Creating database backup..."
        docker exec evalpoint-mongodb mongodump --out /backup/$(date +%Y%m%d_%H%M%S) || warn "Database backup failed"
    fi
    
    # Backup Docker Compose files
    cp "$PROJECT_ROOT/docker-compose"*.yml "$backup_dir/" 2>/dev/null || true
    
    success "Backup created in $backup_dir"
}

# Post-deployment tasks
post_deployment_tasks() {
    log "${BLUE}📋 Running post-deployment tasks...${NC}"
    
    # Initialize database with sample data (development only)
    if [[ "$DEPLOYMENT_ENV" == "development" ]]; then
        info "Development environment detected - database should be initialized with sample data"
    fi
    
    # Setup cron jobs for educational platform maintenance
    if command -v crontab &> /dev/null; then
        info "Setting up maintenance cron jobs..."
        cat > "$PROJECT_ROOT/maintenance-cron" << EOF
# EvalPoint Educational Platform Maintenance
0 2 * * * $SCRIPT_DIR/health-check.sh > /dev/null 2>&1
0 3 * * 0 docker system prune -f > /dev/null 2>&1
0 1 * * * $SCRIPT_DIR/backup-database.sh > /dev/null 2>&1
EOF
        # Note: Actual installation of cron jobs would require user interaction
        info "Cron job configuration created. Install with: crontab $PROJECT_ROOT/maintenance-cron"
    fi
    
    success "Post-deployment tasks completed"
}

# Display deployment summary
show_deployment_summary() {
    log "${BLUE}📋 Deployment Summary${NC}"
    log "${BLUE}=====================${NC}"
    
    echo ""
    log "${GREEN}🎉 EvalPoint Educational Platform Deployment Completed!${NC}"
    echo ""
    
    # Show service URLs
    local backend_port=${BACKEND_PORT:-5000}
    local nginx_port=${HTTP_PORT:-80}
    local mongo_express_port=${MONGO_EXPRESS_PORT:-8081}
    
    log "${CYAN}🌐 Service URLs:${NC}"
    log "   Backend API: http://localhost:$backend_port"
    log "   API Health: http://localhost:$backend_port/api/health"
    log "   Authentication: http://localhost:$backend_port/api/auth"
    
    if [[ "$DEPLOYMENT_ENV" == "development" ]]; then
        log "   MongoDB Express: http://localhost:$mongo_express_port"
        log "     (Username: admin, Password: admin123)"
    fi
    
    if [[ -n "${NGINX_URL:-}" ]]; then
        log "   Nginx Proxy: http://localhost:$nginx_port"
    fi
    
    echo ""
    log "${CYAN}📁 Important Directories:${NC}"
    log "   Configuration: $PROJECT_ROOT"
    log "   Data: $PROJECT_ROOT/data/"
    log "   Logs: $PROJECT_ROOT/logs/"
    log "   Scripts: $PROJECT_ROOT/docker/scripts/"
    
    echo ""
    log "${CYAN}🛠️  Useful Commands:${NC}"
    log "   View logs: docker compose logs -f"
    log "   Restart services: docker compose restart"
    log "   Stop services: docker compose down"
    log "   Health check: $SCRIPT_DIR/health-check.sh"
    log "   Update deployment: $0 --update"
    
    echo ""
    log "${CYAN}🔒 Security Notes:${NC}"
    log "   - Review and secure your .env file"
    log "   - Change default passwords in production"
    log "   - Setup SSL certificates for HTTPS"
    log "   - Configure firewall rules"
    log "   - Enable audit logging for compliance"
    
    echo ""
}

# =============================================================================
# MAIN DEPLOYMENT LOGIC
# =============================================================================

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy EvalPoint Educational Platform with Docker containers.

Options:
    --env ENVIRONMENT       Set deployment environment (development|production) [default: production]
    --clean-volumes         Remove existing volumes before deployment
    --no-build             Skip image building
    --no-backup            Skip backup creation
    --update               Update existing deployment
    --health-check-only    Only run health checks
    --help                 Show this help message

Environment Variables:
    DEPLOYMENT_ENV         Deployment environment (development|production)
    CLEAN_VOLUMES         Clean volumes before deployment (true|false)
    HTTPS_ENABLED         Enable HTTPS setup (true|false)

Examples:
    $0                                    # Production deployment
    $0 --env development                  # Development deployment
    $0 --clean-volumes                    # Clean deployment with new volumes
    $0 --update                          # Update existing deployment
    $0 --health-check-only               # Only run health checks

Educational Platform Deployment:
    The deployment includes:
    - MongoDB database with educational schema
    - Node.js/Express authentication backend
    - Redis cache for session management
    - Nginx reverse proxy (optional)
    - Health monitoring and logging
    - Educational compliance features
EOF
}

main() {
    local no_build=false
    local no_backup=false
    local update_mode=false
    local health_check_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                DEPLOYMENT_ENV="$2"
                shift 2
                ;;
            --clean-volumes)
                CLEAN_VOLUMES=true
                shift
                ;;
            --no-build)
                no_build=true
                shift
                ;;
            --no-backup)
                no_backup=true
                shift
                ;;
            --update)
                update_mode=true
                shift
                ;;
            --health-check-only)
                health_check_only=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "${PURPLE}🎓 Starting EvalPoint Educational Platform Deployment${NC}"
    log "${PURPLE}Environment: $DEPLOYMENT_ENV${NC}"
    log "${PURPLE}=================================================${NC}"
    
    # Health check only mode
    if [[ "$health_check_only" == "true" ]]; then
        verify_deployment
        exit 0
    fi
    
    # Main deployment steps
    check_prerequisites
    validate_environment
    
    if [[ "$no_backup" != "true" && "$update_mode" == "true" ]]; then
        backup_current_deployment
    fi
    
    setup_data_directories
    setup_educational_features
    
    if [[ "$no_build" != "true" ]]; then
        build_images
    fi
    
    deploy_services
    verify_deployment
    setup_monitoring
    post_deployment_tasks
    
    show_deployment_summary
    
    log "${GREEN}🎉 EvalPoint Educational Platform deployment completed successfully!${NC}"
}

# Execute main function with all arguments
main "$@"