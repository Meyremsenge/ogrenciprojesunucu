#!/bin/bash
# =============================================================================
# SSL Certificate Management Script
# Öğrenci Sistemi - Let's Encrypt SSL
# =============================================================================

set -e
set -o pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

# Domain settings
DOMAIN="${DOMAIN:-ogrenci-sistemi.com}"
DOMAINS="${DOMAINS:-${DOMAIN},www.${DOMAIN},api.${DOMAIN}}"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

# Paths
CERTBOT_PATH="${PROJECT_ROOT}/docker/certbot"
CERTS_PATH="${CERTBOT_PATH}/conf"
WEBROOT_PATH="${CERTBOT_PATH}/www"

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# SSL FUNCTIONS
# =============================================================================

init_directories() {
    log_info "Initializing SSL directories..."
    
    mkdir -p "${CERTS_PATH}"
    mkdir -p "${WEBROOT_PATH}"
    
    log_success "Directories created"
}

generate_dhparam() {
    local dhparam_file="${CERTS_PATH}/ssl-dhparams.pem"
    
    if [ -f "${dhparam_file}" ]; then
        log_info "DH parameters already exist"
        return 0
    fi
    
    log_info "Generating DH parameters (this may take a few minutes)..."
    
    openssl dhparam -out "${dhparam_file}" 2048
    
    log_success "DH parameters generated"
}

request_certificate() {
    local staging="${1:-}"
    local staging_arg=""
    
    if [ "${staging}" = "--staging" ]; then
        staging_arg="--staging"
        log_warning "Using Let's Encrypt staging environment"
    fi
    
    log_info "Requesting SSL certificate for: ${DOMAINS}"
    
    # Create domain arguments
    local domain_args=""
    IFS=',' read -ra DOMAIN_ARRAY <<< "${DOMAINS}"
    for domain in "${DOMAIN_ARRAY[@]}"; do
        domain_args="${domain_args} -d ${domain}"
    done
    
    # Run certbot
    docker-compose -f "${COMPOSE_FILE}" run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        ${staging_arg} \
        ${domain_args}
    
    log_success "Certificate obtained successfully"
    
    # Reload nginx
    reload_nginx
}

renew_certificate() {
    log_info "Renewing SSL certificates..."
    
    docker-compose -f "${COMPOSE_FILE}" run --rm certbot renew
    
    log_success "Certificate renewal completed"
    
    # Reload nginx to pick up new certificates
    reload_nginx
}

reload_nginx() {
    log_info "Reloading Nginx..."
    
    docker-compose -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload 2>/dev/null || {
        log_warning "Could not reload Nginx (may not be running)"
    }
    
    log_success "Nginx reloaded"
}

check_certificate() {
    log_info "Checking certificate status..."
    
    local cert_file="${CERTS_PATH}/live/${DOMAIN}/fullchain.pem"
    
    if [ ! -f "${cert_file}" ]; then
        log_warning "Certificate not found for ${DOMAIN}"
        return 1
    fi
    
    # Check expiration
    local expiry=$(openssl x509 -enddate -noout -in "${cert_file}" | cut -d= -f2)
    local expiry_epoch=$(date -d "${expiry}" +%s)
    local now_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
    
    echo ""
    echo "Domain: ${DOMAIN}"
    echo "Expiry: ${expiry}"
    echo "Days remaining: ${days_left}"
    echo ""
    
    if [ ${days_left} -lt 30 ]; then
        log_warning "Certificate expires in less than 30 days!"
        return 1
    else
        log_success "Certificate is valid"
        return 0
    fi
}

create_self_signed() {
    log_info "Creating self-signed certificate for development..."
    
    local cert_dir="${CERTS_PATH}/live/${DOMAIN}"
    mkdir -p "${cert_dir}"
    
    openssl req -x509 -nodes -newkey rsa:4096 \
        -keyout "${cert_dir}/privkey.pem" \
        -out "${cert_dir}/fullchain.pem" \
        -days 365 \
        -subj "/CN=${DOMAIN}"
    
    # Create symlinks
    ln -sf fullchain.pem "${cert_dir}/cert.pem"
    ln -sf privkey.pem "${cert_dir}/privkey.pem"
    
    log_success "Self-signed certificate created"
}

setup_auto_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create cron job for renewal
    local cron_file="/etc/cron.d/certbot-renew"
    
    cat << 'EOF' | sudo tee "${cron_file}" > /dev/null
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root cd /opt/ogrenci-sistemi && ./scripts/ssl-renew.sh renew >> /var/log/certbot-renew.log 2>&1
EOF
    
    sudo chmod 644 "${cron_file}"
    
    log_success "Auto-renewal cron job created"
}

# =============================================================================
# MAIN
# =============================================================================

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init          Initialize SSL directories and DH params"
    echo "  request       Request new SSL certificate from Let's Encrypt"
    echo "  renew         Renew existing certificates"
    echo "  check         Check certificate status and expiration"
    echo "  self-signed   Create self-signed certificate (development)"
    echo "  auto-renew    Setup automatic renewal cron job"
    echo ""
    echo "Options:"
    echo "  --staging     Use Let's Encrypt staging (for testing)"
    echo ""
    echo "Environment Variables:"
    echo "  DOMAIN        Primary domain name"
    echo "  DOMAINS       Comma-separated list of domains"
    echo "  SSL_EMAIL     Email for Let's Encrypt notifications"
}

main() {
    case "${1:-}" in
        init)
            init_directories
            generate_dhparam
            ;;
        request)
            init_directories
            generate_dhparam
            request_certificate "${2:-}"
            ;;
        renew)
            renew_certificate
            ;;
        check)
            check_certificate
            ;;
        self-signed)
            init_directories
            create_self_signed
            ;;
        auto-renew)
            setup_auto_renewal
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
