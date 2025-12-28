#!/bin/bash
# =============================================================================
# Database Backup Script
# Öğrenci Sistemi - PostgreSQL Backup
# =============================================================================

set -e
set -o pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

# Load environment variables
if [ -f "${PROJECT_ROOT}/.env.production" ]; then
    source "${PROJECT_ROOT}/.env.production"
fi

# Database settings
DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-ogrenci_db}"
DB_USER="${DATABASE_USER:-postgres}"

# S3 settings (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-backups/database}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

create_backup_dir() {
    if [ ! -d "${BACKUP_DIR}" ]; then
        mkdir -p "${BACKUP_DIR}"
        log_info "Created backup directory: ${BACKUP_DIR}"
    fi
}

backup_database() {
    log_info "Starting database backup: ${BACKUP_FILE}"
    
    # Create backup using pg_dump in container
    docker-compose -f "${COMPOSE_FILE}" exec -T postgres \
        pg_dump -U "${DB_USER}" -d "${DB_NAME}" --format=custom | \
        gzip > "${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Verify backup
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ] && [ -s "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        local size=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
        log_success "Backup created successfully: ${BACKUP_FILE} (${size})"
    else
        log_error "Backup file is empty or not created"
        exit 1
    fi
}

backup_to_s3() {
    if [ -z "${S3_BUCKET}" ]; then
        log_info "S3 backup skipped (S3_BUCKET not configured)"
        return 0
    fi
    
    log_info "Uploading backup to S3: s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"
    
    aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
        "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}" \
        --storage-class STANDARD_IA
    
    log_success "Backup uploaded to S3"
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
    
    # Local cleanup
    find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
    
    local remaining=$(ls -1 "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null | wc -l)
    log_info "Remaining local backups: ${remaining}"
    
    # S3 cleanup (using lifecycle policy is recommended)
    if [ -n "${S3_BUCKET}" ]; then
        log_info "S3 cleanup should be handled by lifecycle policy"
    fi
}

list_backups() {
    log_info "Available backups:"
    echo ""
    
    if [ -d "${BACKUP_DIR}" ]; then
        ls -lah "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null || echo "No local backups found"
    fi
    
    if [ -n "${S3_BUCKET}" ]; then
        echo ""
        log_info "S3 backups:"
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" 2>/dev/null || echo "No S3 backups found"
    fi
}

restore_backup() {
    local backup_file="$1"
    
    if [ -z "${backup_file}" ]; then
        log_error "Please specify a backup file to restore"
        exit 1
    fi
    
    if [ ! -f "${backup_file}" ]; then
        # Try to find in backup directory
        if [ -f "${BACKUP_DIR}/${backup_file}" ]; then
            backup_file="${BACKUP_DIR}/${backup_file}"
        else
            log_error "Backup file not found: ${backup_file}"
            exit 1
        fi
    fi
    
    log_warning "This will OVERWRITE the current database!"
    read -p "Are you sure you want to restore from ${backup_file}? (yes/no): " confirm
    
    if [ "${confirm}" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Restoring database from: ${backup_file}"
    
    # Decompress and restore
    gunzip -c "${backup_file}" | docker-compose -f "${COMPOSE_FILE}" exec -T postgres \
        pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists
    
    log_success "Database restored successfully"
}

download_from_s3() {
    local s3_path="$1"
    local local_file="${BACKUP_DIR}/$(basename ${s3_path})"
    
    if [ -z "${S3_BUCKET}" ]; then
        log_error "S3_BUCKET not configured"
        exit 1
    fi
    
    log_info "Downloading from S3: ${s3_path}"
    aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${s3_path}" "${local_file}"
    
    log_success "Downloaded to: ${local_file}"
    echo "${local_file}"
}

# =============================================================================
# MAIN
# =============================================================================

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup        Create database backup"
    echo "  restore       Restore database from backup file"
    echo "  list          List available backups"
    echo "  cleanup       Remove old backups"
    echo "  upload        Upload latest backup to S3"
    echo "  download      Download backup from S3"
    echo "  full          Full backup (local + S3 + cleanup)"
    echo ""
    echo "Options:"
    echo "  --file        Backup file for restore/download"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR             Local backup directory"
    echo "  BACKUP_RETENTION_DAYS  Days to keep backups (default: 30)"
    echo "  BACKUP_S3_BUCKET       S3 bucket for remote backups"
    echo "  BACKUP_S3_PREFIX       S3 prefix/path"
}

main() {
    create_backup_dir
    
    case "${1:-}" in
        backup)
            backup_database
            ;;
        restore)
            restore_backup "${2:-}"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        upload)
            backup_to_s3
            ;;
        download)
            download_from_s3 "${2:-}"
            ;;
        full)
            backup_database
            backup_to_s3
            cleanup_old_backups
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
