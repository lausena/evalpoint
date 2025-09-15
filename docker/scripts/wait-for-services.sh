#!/bin/bash

# =============================================================================
# EvalPoint Educational Platform - Wait for Services Script
# Ensures all dependencies are ready before starting dependent services
# =============================================================================

set -euo pipefail

# Configuration
TIMEOUT=${TIMEOUT:-60}
INTERVAL=${INTERVAL:-2}
QUIET=${QUIET:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    if [[ "$QUIET" != "true" ]]; then
        echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    fi
}

# Wait for a TCP service to be available
wait_for_tcp() {
    local host=$1
    local port=$2
    local service_name=${3:-"$host:$port"}
    local timeout=${4:-$TIMEOUT}
    local interval=${5:-$INTERVAL}
    
    log "${BLUE}Waiting for $service_name to be available...${NC}"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        if timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            log "${GREEN}✅ $service_name is available${NC}"
            return 0
        fi
        
        log "${YELLOW}⏳ Waiting for $service_name... ($(($(date +%s) - start_time))s elapsed)${NC}"
        sleep "$interval"
    done
    
    log "${RED}❌ Timeout waiting for $service_name after ${timeout}s${NC}"
    return 1
}

# Wait for HTTP service to respond
wait_for_http() {
    local url=$1
    local service_name=${2:-"$url"}
    local timeout=${3:-$TIMEOUT}
    local interval=${4:-$INTERVAL}
    local expected_status=${5:-200}
    
    log "${BLUE}Waiting for $service_name to respond to HTTP requests...${NC}"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        if command -v curl > /dev/null; then
            if curl -f -s -m 5 "$url" > /dev/null 2>&1; then
                log "${GREEN}✅ $service_name is responding${NC}"
                return 0
            fi
        elif command -v wget > /dev/null; then
            if wget -q -T 5 -O - "$url" > /dev/null 2>&1; then
                log "${GREEN}✅ $service_name is responding${NC}"
                return 0
            fi
        else
            log "${RED}❌ Neither curl nor wget available for HTTP checks${NC}"
            return 1
        fi
        
        log "${YELLOW}⏳ Waiting for $service_name... ($(($(date +%s) - start_time))s elapsed)${NC}"
        sleep "$interval"
    done
    
    log "${RED}❌ Timeout waiting for $service_name after ${timeout}s${NC}"
    return 1
}

# Wait for MongoDB to be ready
wait_for_mongodb() {
    local connection_string=$1
    local timeout=${2:-$TIMEOUT}
    local service_name="MongoDB"
    
    log "${BLUE}Waiting for $service_name to be ready...${NC}"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Try with mongosh first (newer MongoDB versions)
        if command -v mongosh > /dev/null; then
            if mongosh --eval "db.adminCommand('ping')" --quiet "$connection_string" > /dev/null 2>&1; then
                log "${GREEN}✅ $service_name is ready${NC}"
                return 0
            fi
        elif command -v mongo > /dev/null; then
            if mongo --eval "db.adminCommand('ping')" --quiet "$connection_string" > /dev/null 2>&1; then
                log "${GREEN}✅ $service_name is ready${NC}"
                return 0
            fi
        else
            # Fallback to TCP check if mongo client not available
            local host port
            if [[ $connection_string =~ mongodb://([^:]+):([0-9]+) ]]; then
                host="${BASH_REMATCH[1]}"
                port="${BASH_REMATCH[2]}"
                return wait_for_tcp "$host" "$port" "$service_name" "$timeout"
            fi
        fi
        
        log "${YELLOW}⏳ Waiting for $service_name... ($(($(date +%s) - start_time))s elapsed)${NC}"
        sleep "$INTERVAL"
    done
    
    log "${RED}❌ Timeout waiting for $service_name after ${timeout}s${NC}"
    return 1
}

# Wait for Redis to be ready
wait_for_redis() {
    local connection_string=$1
    local timeout=${2:-$TIMEOUT}
    local service_name="Redis"
    
    log "${BLUE}Waiting for $service_name to be ready...${NC}"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        if command -v redis-cli > /dev/null; then
            if redis-cli -u "$connection_string" ping > /dev/null 2>&1; then
                log "${GREEN}✅ $service_name is ready${NC}"
                return 0
            fi
        else
            # Fallback to TCP check if redis-cli not available
            local host port
            if [[ $connection_string =~ redis://([^:]+):([0-9]+) ]]; then
                host="${BASH_REMATCH[1]}"
                port="${BASH_REMATCH[2]}"
                return wait_for_tcp "$host" "$port" "$service_name" "$timeout"
            fi
        fi
        
        log "${YELLOW}⏳ Waiting for $service_name... ($(($(date +%s) - start_time))s elapsed)${NC}"
        sleep "$INTERVAL"
    done
    
    log "${RED}❌ Timeout waiting for $service_name after ${timeout}s${NC}"
    return 1
}

# Wait for multiple services
wait_for_services() {
    local services=("$@")
    local failed_services=()
    
    log "${BLUE}🚀 Starting to wait for ${#services[@]} services...${NC}"
    
    for service in "${services[@]}"; do
        IFS='|' read -r type connection_string service_name timeout <<< "$service"
        
        # Set default timeout if not provided
        timeout=${timeout:-$TIMEOUT}
        
        case "$type" in
            tcp)
                IFS=':' read -r host port <<< "$connection_string"
                if ! wait_for_tcp "$host" "$port" "${service_name:-$host:$port}" "$timeout"; then
                    failed_services+=("$service_name")
                fi
                ;;
            http)
                if ! wait_for_http "$connection_string" "${service_name:-$connection_string}" "$timeout"; then
                    failed_services+=("$service_name")
                fi
                ;;
            mongodb)
                if ! wait_for_mongodb "$connection_string" "$timeout"; then
                    failed_services+=("${service_name:-MongoDB}")
                fi
                ;;
            redis)
                if ! wait_for_redis "$connection_string" "$timeout"; then
                    failed_services+=("${service_name:-Redis}")
                fi
                ;;
            *)
                log "${RED}❌ Unknown service type: $type${NC}"
                failed_services+=("$service_name")
                ;;
        esac
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log "${GREEN}🎉 All services are ready!${NC}"
        return 0
    else
        log "${RED}❌ Failed to connect to: ${failed_services[*]}${NC}"
        return 1
    fi
}

# =============================================================================
# EDUCATIONAL PLATFORM SPECIFIC WAIT FUNCTIONS
# =============================================================================

# Wait for educational platform backend to be fully ready
wait_for_backend() {
    local backend_url=${1:-"http://localhost:5000"}
    local timeout=${2:-$TIMEOUT}
    
    log "${BLUE}Waiting for Educational Platform Backend to be fully ready...${NC}"
    
    # First wait for basic HTTP response
    if ! wait_for_http "$backend_url" "Backend HTTP" "$timeout"; then
        return 1
    fi
    
    # Then wait for health endpoint
    if ! wait_for_http "$backend_url/api/health" "Backend Health" "$timeout"; then
        return 1
    fi
    
    # Finally check if authentication endpoints are ready
    if ! wait_for_http "$backend_url/api/auth/health" "Auth Service" 30; then
        log "${YELLOW}⚠️  Auth service health check failed, but continuing...${NC}"
    fi
    
    log "${GREEN}✅ Educational Platform Backend is fully ready${NC}"
    return 0
}

# Wait for all educational platform services
wait_for_educational_platform() {
    local mongodb_url=${MONGODB_URL:-"mongodb://localhost:27017"}
    local redis_url=${REDIS_URL:-"redis://localhost:6379"}
    local backend_url=${BACKEND_URL:-"http://localhost:5000"}
    local nginx_url=${NGINX_URL:-""}
    
    log "${BLUE}🎓 Waiting for EvalPoint Educational Platform services...${NC}"
    
    local services=(
        "mongodb|$mongodb_url|MongoDB Database|60"
        "redis|$redis_url|Redis Cache|30"
    )
    
    # Add nginx if URL is provided
    if [[ -n "$nginx_url" ]]; then
        services+=("http|$nginx_url|Nginx Proxy|30")
    fi
    
    # Wait for infrastructure services first
    if ! wait_for_services "${services[@]}"; then
        log "${RED}❌ Infrastructure services failed to start${NC}"
        return 1
    fi
    
    # Then wait for backend application
    if ! wait_for_backend "$backend_url" 60; then
        log "${RED}❌ Backend application failed to start${NC}"
        return 1
    fi
    
    log "${GREEN}🎉 EvalPoint Educational Platform is ready!${NC}"
    return 0
}

# =============================================================================
# MAIN FUNCTION AND ARGUMENT PARSING
# =============================================================================

show_help() {
    cat << EOF
Usage: $0 [OPTIONS] [COMMAND] [ARGUMENTS]

Wait for services to become available before proceeding.

Commands:
    tcp HOST PORT [NAME] [TIMEOUT]     Wait for TCP service
    http URL [NAME] [TIMEOUT]          Wait for HTTP service
    mongodb CONNECTION_STRING [TIMEOUT] Wait for MongoDB
    redis CONNECTION_STRING [TIMEOUT]   Wait for Redis
    backend [URL] [TIMEOUT]            Wait for Educational Platform Backend
    platform                          Wait for all Educational Platform services

Options:
    -t, --timeout SECONDS     Maximum time to wait (default: 60)
    -i, --interval SECONDS    Check interval (default: 2)
    -q, --quiet              Quiet mode - minimal output
    -h, --help               Show this help

Environment Variables:
    TIMEOUT                  Default timeout in seconds
    INTERVAL                 Default check interval in seconds  
    MONGODB_URL             MongoDB connection string
    REDIS_URL               Redis connection string
    BACKEND_URL             Backend service URL
    NGINX_URL               Nginx proxy URL
    QUIET                   Enable quiet mode

Examples:
    $0 tcp mongodb 27017
    $0 http http://localhost:5000/api/health
    $0 mongodb mongodb://localhost:27017/evalpoint
    $0 backend http://localhost:5000
    $0 platform
    $0 -t 30 tcp redis 6379
    
Educational Platform Example:
    MONGODB_URL=mongodb://db:27017/evalpoint \\
    BACKEND_URL=http://backend:5000 \\
    $0 platform
EOF
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -i|--interval)
                INTERVAL="$2"
                shift 2
                ;;
            -q|--quiet)
                QUIET=true
                shift
                ;;
            tcp)
                wait_for_tcp "$2" "$3" "${4:-}" "${5:-$TIMEOUT}"
                exit $?
                ;;
            http)
                wait_for_http "$2" "${3:-}" "${4:-$TIMEOUT}"
                exit $?
                ;;
            mongodb)
                wait_for_mongodb "$2" "${3:-$TIMEOUT}"
                exit $?
                ;;
            redis)
                wait_for_redis "$2" "${3:-$TIMEOUT}"
                exit $?
                ;;
            backend)
                wait_for_backend "${2:-}" "${3:-$TIMEOUT}"
                exit $?
                ;;
            platform)
                wait_for_educational_platform
                exit $?
                ;;
            *)
                echo "Unknown command: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # If no command provided, show help
    show_help
    exit 1
}

# Execute main function with all arguments
main "$@"