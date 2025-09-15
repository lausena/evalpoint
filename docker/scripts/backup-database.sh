#!/bin/bash

# =============================================================================
# EvalPoint Educational Platform - Database Backup Script
# Automated backup solution for educational data with compliance requirements
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups/database"
LOG_FILE="${PROJECT_ROOT}/logs/backup.log"

# Default values
RETENTION_DAYS=${RETENTION_DAYS:-30}
MONGODB_CONTAINER=${MONGODB_CONTAINER:-evalpoint-mongodb}
BACKUP_PREFIX=${BACKUP_PREFIX:-evalpoint}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
# BACKUP FUNCTIONS
# =============================================================================

# Create backup directory structure
setup_backup_directories() {
    log "${BLUE}📁 Setting up backup directories...${NC}"
    
    local backup_dirs=(
        "$BACKUP_DIR/full"
        "$BACKUP_DIR/incremental"
        "$BACKUP_DIR/exports"
        "$BACKUP_DIR/compliance"
    )
    
    for dir in "${backup_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            info "Created directory: $dir"
        fi
    done
    
    success "Backup directories setup completed"
}

# Check if MongoDB container is running
check_mongodb_container() {
    log "${BLUE}🔍 Checking MongoDB container status...${NC}"
    
    if ! docker ps --filter "name=$MONGODB_CONTAINER" --filter "status=running" --format "{{.Names}}" | grep -q "$MONGODB_CONTAINER"; then
        error_exit "MongoDB container '$MONGODB_CONTAINER' is not running"
    fi
    
    success "MongoDB container is running"
}

# Perform full database backup
perform_full_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${BACKUP_PREFIX}_full_${timestamp}"
    local backup_path="$BACKUP_DIR/full/$backup_name"
    
    log "${BLUE}💾 Starting full database backup...${NC}"
    info "Backup name: $backup_name"
    info "Backup path: $backup_path"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Perform mongodump
    if docker exec "$MONGODB_CONTAINER" mongodump \
        --out "/tmp/backup_$timestamp" \
        --gzip \
        --oplog; then
        
        # Copy backup from container to host
        docker cp "$MONGODB_CONTAINER:/tmp/backup_$timestamp" "$backup_path/"
        
        # Clean up temporary files in container
        docker exec "$MONGODB_CONTAINER" rm -rf "/tmp/backup_$timestamp"
        
        # Create backup metadata
        cat > "$backup_path/metadata.json" << EOF
{
    "backup_type": "full",
    "timestamp": "$timestamp",
    "container": "$MONGODB_CONTAINER",
    "platform": "EvalPoint Educational Platform",
    "compliance": {
        "coppa": true,
        "ferpa": true,
        "gdpr": true
    },
    "retention_days": $RETENTION_DAYS
}
EOF
        
        # Calculate backup size
        local backup_size=$(du -sh "$backup_path" | cut -f1)
        
        success "Full backup completed successfully"
        info "Backup size: $backup_size"
        
        return 0
    else
        error_exit "Full backup failed"
    fi
}

# Perform incremental backup (oplog only)
perform_incremental_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${BACKUP_PREFIX}_incremental_${timestamp}"
    local backup_path="$BACKUP_DIR/incremental/$backup_name"
    
    log "${BLUE}📊 Starting incremental backup...${NC}"
    info "Backup name: $backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Get the last full backup timestamp for oplog replay
    local last_full_backup
    last_full_backup=$(find "$BACKUP_DIR/full" -name "${BACKUP_PREFIX}_full_*" -type d | sort | tail -n1)
    
    if [[ -z "$last_full_backup" ]]; then
        warn "No full backup found. Performing full backup instead..."
        perform_full_backup
        return $?
    fi
    
    # Extract timestamp from last full backup
    local last_timestamp
    last_timestamp=$(basename "$last_full_backup" | sed "s/${BACKUP_PREFIX}_full_//")
    
    # Perform oplog dump since last backup
    if docker exec "$MONGODB_CONTAINER" mongodump \
        --db local \
        --collection oplog.rs \
        --out "/tmp/incremental_$timestamp" \
        --query "{ \"ts\": { \"\$gte\": { \"\$timestamp\": { \"t\": $(date -d "@$(date -d "$last_timestamp" +%s)" +%s), \"i\": 1 } } } }" \
        --gzip; then
        
        # Copy incremental backup from container to host
        docker cp "$MONGODB_CONTAINER:/tmp/incremental_$timestamp" "$backup_path/"
        
        # Clean up temporary files in container
        docker exec "$MONGODB_CONTAINER" rm -rf "/tmp/incremental_$timestamp"
        
        # Create incremental backup metadata
        cat > "$backup_path/metadata.json" << EOF
{
    "backup_type": "incremental",
    "timestamp": "$timestamp",
    "last_full_backup": "$last_timestamp",
    "container": "$MONGODB_CONTAINER",
    "platform": "EvalPoint Educational Platform"
}
EOF
        
        success "Incremental backup completed successfully"
        return 0
    else
        error_exit "Incremental backup failed"
    fi
}

# Export specific collections for compliance
export_compliance_data() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local export_path="$BACKUP_DIR/compliance/compliance_export_$timestamp"
    
    log "${BLUE}📋 Exporting compliance-related data...${NC}"
    
    # Create export directory
    mkdir -p "$export_path"
    
    # Educational compliance collections to export
    local compliance_collections=(
        "users"
        "auditlogs"
        "sessions"
        "schools"
    )
    
    # Get database name from environment or use default
    local database_name=${MONGODB_DATABASE:-evalpoint}
    
    for collection in "${compliance_collections[@]}"; do
        info "Exporting collection: $collection"
        
        # Export as JSON for compliance readability
        if docker exec "$MONGODB_CONTAINER" mongoexport \
            --db "$database_name" \
            --collection "$collection" \
            --out "/tmp/${collection}_$timestamp.json" \
            --pretty; then
            
            # Copy export from container to host
            docker cp "$MONGODB_CONTAINER:/tmp/${collection}_$timestamp.json" "$export_path/"
            
            # Clean up temporary file in container
            docker exec "$MONGODB_CONTAINER" rm -f "/tmp/${collection}_$timestamp.json"
        else
            warn "Failed to export collection: $collection"
        fi
    done
    
    # Create compliance export metadata
    cat > "$export_path/compliance_metadata.json" << EOF
{
    "export_type": "compliance",
    "timestamp": "$timestamp",
    "database": "$database_name",
    "collections": $(printf '%s\n' "${compliance_collections[@]}" | jq -R . | jq -s .),
    "platform": "EvalPoint Educational Platform",
    "regulations": {
        "coppa": "Children's Online Privacy Protection Act",
        "ferpa": "Family Educational Rights and Privacy Act", 
        "gdpr": "General Data Protection Regulation"
    },
    "retention_notice": "This export contains educational data subject to regulatory compliance requirements"
}
EOF
    
    success "Compliance data export completed"
}

# Clean up old backups based on retention policy
cleanup_old_backups() {
    log "${BLUE}🧹 Cleaning up old backups...${NC}"
    
    local cleanup_dirs=(
        "$BACKUP_DIR/full"
        "$BACKUP_DIR/incremental"
        "$BACKUP_DIR/compliance"
    )
    
    for dir in "${cleanup_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            info "Cleaning up old backups in: $dir"
            
            # Find and remove backups older than retention days
            local old_backups
            old_backups=$(find "$dir" -type d -name "${BACKUP_PREFIX}_*" -mtime +$RETENTION_DAYS)
            
            if [[ -n "$old_backups" ]]; then
                echo "$old_backups" | while read -r backup; do
                    info "Removing old backup: $(basename "$backup")"
                    rm -rf "$backup"
                done
            else
                info "No old backups found in $dir"
            fi
        fi
    done
    
    success "Backup cleanup completed"
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_path=$1
    
    log "${BLUE}🔍 Verifying backup integrity...${NC}"
    
    if [[ ! -d "$backup_path" ]]; then
        error_exit "Backup path does not exist: $backup_path"
    fi
    
    # Check if backup contains expected files
    local expected_files=(
        "metadata.json"
    )
    
    for file in "${expected_files[@]}"; do
        if [[ ! -f "$backup_path/$file" ]]; then
            warn "Missing expected file: $file"
            return 1
        fi
    done
    
    # Check backup size (should not be empty)
    local backup_size
    backup_size=$(du -sb "$backup_path" | cut -f1)
    
    if [[ $backup_size -lt 1024 ]]; then
        warn "Backup seems too small: $backup_size bytes"
        return 1
    fi
    
    success "Backup integrity verification passed"
    return 0
}

# Send backup notification (placeholder for email/webhook integration)
send_backup_notification() {
    local backup_type=$1
    local status=$2
    local details=$3
    
    log "${BLUE}📧 Sending backup notification...${NC}"
    
    # Create notification log entry
    cat >> "$PROJECT_ROOT/logs/backup_notifications.log" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_type": "$backup_type",
    "status": "$status",
    "details": "$details",
    "platform": "EvalPoint Educational Platform"
}
EOF
    
    # TODO: Integrate with actual notification system (email, Slack, etc.)
    info "Backup notification logged (integrate with actual notification system)"
}

# =============================================================================
# MAIN BACKUP LOGIC
# =============================================================================

show_help() {
    cat << EOF
Usage: $0 [OPTIONS] [BACKUP_TYPE]

Backup EvalPoint Educational Platform database with compliance features.

Backup Types:
    full            Full database backup (default)
    incremental     Incremental backup (oplog since last full backup)
    compliance      Export compliance data for regulatory requirements
    all             Perform all backup types

Options:
    --retention-days DAYS   Set backup retention period [default: 30]
    --container NAME        MongoDB container name [default: evalpoint-mongodb]
    --prefix PREFIX         Backup file prefix [default: evalpoint]
    --no-cleanup           Skip cleanup of old backups
    --verify-only PATH     Only verify existing backup
    --help                 Show this help message

Environment Variables:
    RETENTION_DAYS         Backup retention period in days
    MONGODB_CONTAINER      MongoDB container name
    BACKUP_PREFIX          Backup file prefix
    MONGODB_DATABASE       Database name for exports

Examples:
    $0                              # Full backup with default settings
    $0 full                         # Explicit full backup
    $0 incremental                  # Incremental backup
    $0 compliance                   # Compliance data export
    $0 all                          # All backup types
    $0 --retention-days 60 full     # Full backup with 60-day retention
    $0 --verify-only /path/to/backup # Verify existing backup

Educational Platform Features:
    - COPPA, FERPA, GDPR compliance data exports
    - Audit log preservation
    - Student data protection
    - Automated retention management
EOF
}

main() {
    local backup_type="full"
    local no_cleanup=false
    local verify_only=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --retention-days)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --container)
                MONGODB_CONTAINER="$2"
                shift 2
                ;;
            --prefix)
                BACKUP_PREFIX="$2"
                shift 2
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            --verify-only)
                verify_only="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            full|incremental|compliance|all)
                backup_type="$1"
                shift
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
    
    log "${BLUE}💾 Starting EvalPoint Educational Platform Database Backup${NC}"
    log "${BLUE}Backup Type: $backup_type${NC}"
    log "${BLUE}Retention: $RETENTION_DAYS days${NC}"
    log "${BLUE}================================================${NC}"
    
    # Verify only mode
    if [[ -n "$verify_only" ]]; then
        if verify_backup_integrity "$verify_only"; then
            success "Backup verification completed successfully"
            exit 0
        else
            error_exit "Backup verification failed"
        fi
    fi
    
    # Main backup execution
    setup_backup_directories
    check_mongodb_container
    
    case $backup_type in
        full)
            if perform_full_backup; then
                send_backup_notification "full" "success" "Full backup completed successfully"
            else
                send_backup_notification "full" "failed" "Full backup failed"
                exit 1
            fi
            ;;
        incremental)
            if perform_incremental_backup; then
                send_backup_notification "incremental" "success" "Incremental backup completed successfully"
            else
                send_backup_notification "incremental" "failed" "Incremental backup failed"
                exit 1
            fi
            ;;
        compliance)
            if export_compliance_data; then
                send_backup_notification "compliance" "success" "Compliance export completed successfully"
            else
                send_backup_notification "compliance" "failed" "Compliance export failed"
                exit 1
            fi
            ;;
        all)
            local all_success=true
            
            if ! perform_full_backup; then
                all_success=false
            fi
            
            if ! perform_incremental_backup; then
                all_success=false
            fi
            
            if ! export_compliance_data; then
                all_success=false
            fi
            
            if $all_success; then
                send_backup_notification "all" "success" "All backup types completed successfully"
            else
                send_backup_notification "all" "partial" "Some backup operations failed"
                exit 1
            fi
            ;;
        *)
            error_exit "Unknown backup type: $backup_type"
            ;;
    esac
    
    # Cleanup old backups unless disabled
    if [[ "$no_cleanup" != "true" ]]; then
        cleanup_old_backups
    fi
    
    log "${GREEN}🎉 Database backup process completed successfully!${NC}"
}

# Execute main function with all arguments
main "$@"