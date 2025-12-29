#!/bin/bash
# =============================================================================
# System Health Monitoring Script
# Öğrenci Sistemi - Production Health Checks
# =============================================================================

set -o pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

# Thresholds
CPU_THRESHOLD="${CPU_THRESHOLD:-80}"
MEMORY_THRESHOLD="${MEMORY_THRESHOLD:-85}"
DISK_THRESHOLD="${DISK_THRESHOLD:-90}"

# Notification settings
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_RECIPIENTS="${ALERT_EMAIL:-}"

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
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

send_alert() {
    local level="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "${SLACK_WEBHOOK}" ]; then
        local color="good"
        [ "${level}" = "warning" ] && color="warning"
        [ "${level}" = "error" ] && color="danger"
        
        curl -s -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"Öğrenci Sistemi Alert\",
                    \"text\": \"${message}\",
                    \"footer\": \"$(hostname) | $(date)\",
                    \"mrkdwn_in\": [\"text\"]
                }]
            }" 2>/dev/null || true
    fi
    
    # Email notification (requires mail command)
    if [ -n "${EMAIL_RECIPIENTS}" ] && command -v mail &> /dev/null; then
        echo "${message}" | mail -s "[${level^^}] Öğrenci Sistemi Alert" "${EMAIL_RECIPIENTS}"
    fi
}

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_api_health() {
    log_info "Checking API health..."
    
    local api_url="http://localhost/health"
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" "${api_url}" 2>/dev/null)
    http_code=$(echo "${response}" | tail -n1)
    body=$(echo "${response}" | head -n-1)
    
    if [ "${http_code}" = "200" ]; then
        log_success "API is healthy (HTTP ${http_code})"
        echo "${body}" | jq -r '.status // "ok"' 2>/dev/null || true
        return 0
    else
        log_error "API health check failed (HTTP ${http_code})"
        send_alert "error" "API health check failed with HTTP ${http_code}"
        return 1
    fi
}

check_readiness() {
    log_info "Checking readiness..."
    
    local ready_url="http://localhost/health/ready"
    local response
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${ready_url}" 2>/dev/null)
    
    if [ "${response}" = "200" ]; then
        log_success "API is ready"
        return 0
    else
        log_error "API is not ready (HTTP ${response})"
        return 1
    fi
}

check_database() {
    log_info "Checking database connection..."
    
    if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_success "PostgreSQL is accepting connections"
        
        # Check replication lag if applicable
        local lag=$(docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql -U postgres -t -c \
            "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;" 2>/dev/null || echo "0")
        
        if [ "${lag:-0}" -gt 60 ]; then
            log_warning "Replication lag: ${lag}s"
        fi
        
        return 0
    else
        log_error "PostgreSQL is not accepting connections"
        send_alert "error" "PostgreSQL health check failed"
        return 1
    fi
}

check_redis() {
    log_info "Checking Redis connection..."
    
    if docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis is responding"
        
        # Check memory usage
        local used_memory=$(docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli info memory | \
            grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        log_info "Redis memory usage: ${used_memory}"
        
        return 0
    else
        log_error "Redis is not responding"
        send_alert "error" "Redis health check failed"
        return 1
    fi
}

check_celery() {
    log_info "Checking Celery workers..."
    
    local workers=$(docker-compose -f "${COMPOSE_FILE}" exec -T celery celery -A celery_worker.celery inspect ping 2>/dev/null | grep -c "pong" || echo "0")
    
    if [ "${workers}" -gt 0 ]; then
        log_success "Celery workers active: ${workers}"
        return 0
    else
        log_error "No Celery workers responding"
        send_alert "warning" "Celery workers are not responding"
        return 1
    fi
}

check_disk_space() {
    log_info "Checking disk space..."
    
    local usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    
    if [ "${usage}" -ge "${DISK_THRESHOLD}" ]; then
        log_error "Disk usage critical: ${usage}%"
        send_alert "error" "Disk usage is at ${usage}% (threshold: ${DISK_THRESHOLD}%)"
        return 1
    elif [ "${usage}" -ge $((DISK_THRESHOLD - 10)) ]; then
        log_warning "Disk usage high: ${usage}%"
        return 0
    else
        log_success "Disk usage: ${usage}%"
        return 0
    fi
}

check_memory() {
    log_info "Checking system memory..."
    
    local usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    if [ "${usage}" -ge "${MEMORY_THRESHOLD}" ]; then
        log_error "Memory usage critical: ${usage}%"
        send_alert "error" "Memory usage is at ${usage}% (threshold: ${MEMORY_THRESHOLD}%)"
        return 1
    elif [ "${usage}" -ge $((MEMORY_THRESHOLD - 10)) ]; then
        log_warning "Memory usage high: ${usage}%"
        return 0
    else
        log_success "Memory usage: ${usage}%"
        return 0
    fi
}

check_cpu() {
    log_info "Checking CPU usage..."
    
    local usage=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | cut -d. -f1)
    
    if [ "${usage}" -ge "${CPU_THRESHOLD}" ]; then
        log_error "CPU usage critical: ${usage}%"
        send_alert "error" "CPU usage is at ${usage}% (threshold: ${CPU_THRESHOLD}%)"
        return 1
    elif [ "${usage}" -ge $((CPU_THRESHOLD - 15)) ]; then
        log_warning "CPU usage high: ${usage}%"
        return 0
    else
        log_success "CPU usage: ${usage}%"
        return 0
    fi
}

check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    local domain="${DOMAIN:-ogrenci-sistemi.com}"
    local expiry_days
    
    expiry_days=$(echo | openssl s_client -servername "${domain}" -connect "${domain}:443" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2 | \
        xargs -I {} bash -c 'echo $(( ( $(date -d "{}" +%s) - $(date +%s) ) / 86400 ))') || expiry_days="-1"
    
    if [ "${expiry_days}" -le 0 ]; then
        log_warning "Could not check SSL certificate"
        return 0
    elif [ "${expiry_days}" -le 7 ]; then
        log_error "SSL certificate expires in ${expiry_days} days!"
        send_alert "error" "SSL certificate expires in ${expiry_days} days!"
        return 1
    elif [ "${expiry_days}" -le 30 ]; then
        log_warning "SSL certificate expires in ${expiry_days} days"
        return 0
    else
        log_success "SSL certificate valid for ${expiry_days} days"
        return 0
    fi
}

check_container_health() {
    log_info "Checking container health..."
    
    local unhealthy=$(docker-compose -f "${COMPOSE_FILE}" ps --format json 2>/dev/null | \
        jq -r 'select(.Health == "unhealthy") | .Name' 2>/dev/null | wc -l)
    
    if [ "${unhealthy}" -gt 0 ]; then
        log_error "Unhealthy containers: ${unhealthy}"
        docker-compose -f "${COMPOSE_FILE}" ps --format json | \
            jq -r 'select(.Health == "unhealthy") | .Name' 2>/dev/null
        return 1
    else
        log_success "All containers healthy"
        return 0
    fi
}

# =============================================================================
# MAIN
# =============================================================================

run_all_checks() {
    local failures=0
    
    echo "================================================"
    echo "Öğrenci Sistemi - Health Check Report"
    echo "Date: $(date)"
    echo "Host: $(hostname)"
    echo "================================================"
    echo ""
    
    check_api_health || ((failures++))
    check_readiness || ((failures++))
    check_database || ((failures++))
    check_redis || ((failures++))
    check_celery || ((failures++))
    check_container_health || ((failures++))
    
    echo ""
    echo "--- System Resources ---"
    check_disk_space || ((failures++))
    check_memory || ((failures++))
    check_cpu || ((failures++))
    
    echo ""
    echo "--- Security ---"
    check_ssl_certificate || ((failures++))
    
    echo ""
    echo "================================================"
    if [ ${failures} -eq 0 ]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "${failures} health check(s) failed!"
        return 1
    fi
}

usage() {
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  all           Run all health checks"
    echo "  api           Check API health"
    echo "  database      Check database connection"
    echo "  redis         Check Redis connection"
    echo "  celery        Check Celery workers"
    echo "  containers    Check container health"
    echo "  resources     Check system resources"
    echo "  ssl           Check SSL certificate"
    echo ""
    echo "Environment Variables:"
    echo "  SLACK_WEBHOOK  Slack webhook URL for alerts"
    echo "  ALERT_EMAIL    Email for alerts"
    echo "  CPU_THRESHOLD  CPU usage threshold (default: 80)"
    echo "  MEMORY_THRESHOLD Memory usage threshold (default: 85)"
    echo "  DISK_THRESHOLD Disk usage threshold (default: 90)"
}

main() {
    case "${1:-all}" in
        all)
            run_all_checks
            ;;
        api)
            check_api_health
            check_readiness
            ;;
        database)
            check_database
            ;;
        redis)
            check_redis
            ;;
        celery)
            check_celery
            ;;
        containers)
            check_container_health
            ;;
        resources)
            check_disk_space
            check_memory
            check_cpu
            ;;
        ssl)
            check_ssl_certificate
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
