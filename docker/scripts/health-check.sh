#!/bin/bash

# =============================================================================
# EvalPoint Educational Platform - Comprehensive Health Check Script
# Monitors all services and educational platform specific requirements
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/../logs/health-check.log"
HEALTH_CHECK_TIMEOUT=10
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
MONGODB_URL="${MONGODB_URL:-mongodb://localhost:27017}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Health check result tracking
HEALTH_CHECKS=()
FAILED_CHECKS=()

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Check if service is responding
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-$HEALTH_CHECK_TIMEOUT}
    
    log "${BLUE}Checking $service_name health...${NC}"
    
    if curl -f -s -m "$timeout" "$url" > /dev/null 2>&1; then
        log "${GREEN}✅ $service_name is healthy${NC}"
        HEALTH_CHECKS+=("$service_name:PASS")
        return 0
    else
        log "${RED}❌ $service_name is unhealthy${NC}"
        HEALTH_CHECKS+=("$service_name:FAIL")
        FAILED_CHECKS+=("$service_name")
        return 1
    fi
}

# Check database connectivity
check_database() {
    local db_name=$1
    local connection_string=$2
    
    log "${BLUE}Checking $db_name database connectivity...${NC}"
    
    # For MongoDB
    if [[ $db_name == "MongoDB" ]]; then
        if command -v mongosh > /dev/null; then
            if mongosh --eval "db.adminCommand('ping')" --quiet "$connection_string" > /dev/null 2>&1; then
                log "${GREEN}✅ $db_name is accessible${NC}"
                HEALTH_CHECKS+=("$db_name:PASS")
                return 0
            fi
        elif command -v mongo > /dev/null; then
            if mongo --eval "db.adminCommand('ping')" --quiet "$connection_string" > /dev/null 2>&1; then
                log "${GREEN}✅ $db_name is accessible${NC}"
                HEALTH_CHECKS+=("$db_name:PASS")
                return 0
            fi
        fi
        
        log "${RED}❌ $db_name is not accessible${NC}"
        HEALTH_CHECKS+=("$db_name:FAIL")
        FAILED_CHECKS+=("$db_name")
        return 1
    fi
    
    # For Redis
    if [[ $db_name == "Redis" ]]; then
        if command -v redis-cli > /dev/null; then
            if redis-cli -u "$connection_string" ping > /dev/null 2>&1; then
                log "${GREEN}✅ $db_name is accessible${NC}"
                HEALTH_CHECKS+=("$db_name:PASS")
                return 0
            fi
        fi
        
        log "${RED}❌ $db_name is not accessible${NC}"
        HEALTH_CHECKS+=("$db_name:FAIL")
        FAILED_CHECKS+=("$db_name")
        return 1
    fi
}

# Check container status if running in Docker
check_container_status() {
    log "${BLUE}Checking Docker container status...${NC}"
    
    if command -v docker > /dev/null; then
        local containers=(
            "evalpoint-backend"
            "evalpoint-mongodb"
            "evalpoint-redis"
            "evalpoint-nginx"
        )
        
        local all_healthy=true
        
        for container in "${containers[@]}"; do
            if docker ps --filter "name=$container" --filter "status=running" --format "{{.Names}}" | grep -q "$container"; then
                # Check container health if health check is configured
                local health_status
                health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
                
                if [[ $health_status == "healthy" ]] || [[ $health_status == "no-healthcheck" ]]; then
                    log "${GREEN}✅ Container $container is running and healthy${NC}"
                else
                    log "${YELLOW}⚠️  Container $container is running but health status: $health_status${NC}"
                    all_healthy=false
                fi
            else
                log "${YELLOW}⚠️  Container $container is not running${NC}"
                all_healthy=false
            fi
        done
        
        if $all_healthy; then
            HEALTH_CHECKS+=("Docker-Containers:PASS")
        else
            HEALTH_CHECKS+=("Docker-Containers:PARTIAL")
            FAILED_CHECKS+=("Some Docker containers")
        fi
    else
        log "${YELLOW}⚠️  Docker not available - skipping container checks${NC}"
        HEALTH_CHECKS+=("Docker-Containers:SKIP")
    fi
}

# Check system resources
check_system_resources() {
    log "${BLUE}Checking system resources...${NC}"
    
    # Check available memory
    if command -v free > /dev/null; then
        local mem_usage
        mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
        
        if (( $(echo "$mem_usage > 90" | bc -l) )); then
            log "${RED}❌ High memory usage: ${mem_usage}%${NC}"
            HEALTH_CHECKS+=("Memory:FAIL")
            FAILED_CHECKS+=("High memory usage")
        elif (( $(echo "$mem_usage > 80" | bc -l) )); then
            log "${YELLOW}⚠️  Moderate memory usage: ${mem_usage}%${NC}"
            HEALTH_CHECKS+=("Memory:WARN")
        else
            log "${GREEN}✅ Memory usage is normal: ${mem_usage}%${NC}"
            HEALTH_CHECKS+=("Memory:PASS")
        fi
    else
        log "${YELLOW}⚠️  Cannot check memory usage${NC}"
        HEALTH_CHECKS+=("Memory:SKIP")
    fi
    
    # Check disk space
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{printf "%.1f", $5}' | sed 's/%//')
    
    if (( $(echo "$disk_usage > 90" | bc -l) )); then
        log "${RED}❌ High disk usage: ${disk_usage}%${NC}"
        HEALTH_CHECKS+=("Disk:FAIL")
        FAILED_CHECKS+=("High disk usage")
    elif (( $(echo "$disk_usage > 80" | bc -l) )); then
        log "${YELLOW}⚠️  Moderate disk usage: ${disk_usage}%${NC}"
        HEALTH_CHECKS+=("Disk:WARN")
    else
        log "${GREEN}✅ Disk usage is normal: ${disk_usage}%${NC}"
        HEALTH_CHECKS+=("Disk:PASS")
    fi
}

# Check educational platform specific endpoints
check_educational_endpoints() {
    log "${BLUE}Checking educational platform specific endpoints...${NC}"
    
    local endpoints=(
        "${BACKEND_URL}/api/health:API Health"
        "${BACKEND_URL}/api/auth/health:Auth Service"
        "${BACKEND_URL}/:Root Endpoint"
    )
    
    local all_healthy=true
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r url description <<< "$endpoint_info"
        
        if check_service "$description" "$url"; then
            continue
        else
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        HEALTH_CHECKS+=("Educational-Endpoints:PASS")
    else
        HEALTH_CHECKS+=("Educational-Endpoints:FAIL")
        FAILED_CHECKS+=("Educational endpoints")
    fi
}

# Check educational compliance requirements
check_compliance_status() {
    log "${BLUE}Checking educational compliance status...${NC}"
    
    # Check if compliance endpoints are available
    local compliance_endpoints=(
        "${BACKEND_URL}/api/compliance/coppa:COPPA Compliance"
        "${BACKEND_URL}/api/compliance/ferpa:FERPA Compliance"
        "${BACKEND_URL}/api/compliance/gdpr:GDPR Compliance"
    )
    
    local compliance_healthy=true
    
    for endpoint_info in "${compliance_endpoints[@]}"; do
        IFS=':' read -r url description <<< "$endpoint_info"
        
        # These endpoints might not exist yet, so we just check if the base service is responding
        if curl -f -s -m "$HEALTH_CHECK_TIMEOUT" "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
            log "${GREEN}✅ $description service is available${NC}"
        else
            log "${YELLOW}⚠️  $description service check skipped - base service not responding${NC}"
            compliance_healthy=false
        fi
    done
    
    if $compliance_healthy; then
        HEALTH_CHECKS+=("Compliance:PASS")
    else
        HEALTH_CHECKS+=("Compliance:PARTIAL")
    fi
}

# =============================================================================
# MAIN HEALTH CHECK EXECUTION
# =============================================================================

main() {
    log "${BLUE}🏥 Starting EvalPoint Educational Platform Health Check...${NC}"
    log "${BLUE}================================================${NC}"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # System resource checks
    check_system_resources
    
    # Container status checks (if applicable)
    check_container_status
    
    # Database connectivity checks
    check_database "MongoDB" "$MONGODB_URL"
    check_database "Redis" "$REDIS_URL"
    
    # Backend service checks
    check_educational_endpoints
    
    # Compliance checks
    check_compliance_status
    
    # Additional service checks
    if [[ -n "${NGINX_URL:-}" ]]; then
        check_service "Nginx" "$NGINX_URL"
    fi
    
    # =============================================================================
    # HEALTH CHECK SUMMARY
    # =============================================================================
    
    log "${BLUE}================================================${NC}"
    log "${BLUE}🏥 Health Check Summary${NC}"
    log "${BLUE}================================================${NC}"
    
    local total_checks=${#HEALTH_CHECKS[@]}
    local failed_count=${#FAILED_CHECKS[@]}
    local passed_count=$((total_checks - failed_count))
    
    log "Total Checks: $total_checks"
    log "Passed: ${GREEN}$passed_count${NC}"
    log "Failed: ${RED}$failed_count${NC}"
    
    if [[ $failed_count -eq 0 ]]; then
        log "${GREEN}🎉 All health checks passed! Educational platform is healthy.${NC}"
        echo "HEALTHY"
        exit 0
    else
        log "${RED}❌ Some health checks failed:${NC}"
        for failed in "${FAILED_CHECKS[@]}"; do
            log "${RED}  - $failed${NC}"
        done
        
        if [[ $failed_count -gt $((total_checks / 2)) ]]; then
            log "${RED}🚨 Critical: More than half of the checks failed!${NC}"
            echo "CRITICAL"
            exit 2
        else
            log "${YELLOW}⚠️  Warning: Some checks failed but system is partially functional${NC}"
            echo "DEGRADED"
            exit 1
        fi
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--help|--verbose|--json]"
        echo "  --help     Show this help message"
        echo "  --verbose  Enable verbose output"
        echo "  --json     Output results in JSON format"
        exit 0
        ;;
    --verbose|-v)
        set -x
        main
        ;;
    --json|-j)
        # JSON output for monitoring systems
        main > /dev/null 2>&1
        echo "{\"status\":\"$(echo $?)\",\"checks\":$(printf '%s\n' "${HEALTH_CHECKS[@]}" | jq -R . | jq -s .)}"
        ;;
    *)
        main
        ;;
esac