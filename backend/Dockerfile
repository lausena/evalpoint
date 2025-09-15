# =============================================================================
# Educational Platform Backend - Production Dockerfile
# Multi-stage build optimized for security, performance, and small image size
# =============================================================================

# Base image with specific version for reproducible builds
ARG NODE_VERSION=18.17.0
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates and necessary system packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# =============================================================================
# Dependencies stage - Install and cache dependencies
# =============================================================================
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm install for production
RUN npm install --only=production && \
    npm cache clean --force && \
    chown -R backend:nodejs /app

# =============================================================================
# Development stage - For development environment
# =============================================================================
FROM base AS development

WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source code
COPY --chown=backend:nodejs . .

# Switch to non-root user
USER backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start with nodemon for development
CMD ["npm", "run", "dev"]

# =============================================================================
# Production builder stage - Prepare production artifacts
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy source code and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove unnecessary files for production
RUN rm -rf \
    tests/ \
    __tests__/ \
    *.test.js \
    *.spec.js \
    coverage/ \
    .nyc_output/ \
    docs/ \
    *.md \
    .git/ \
    .gitignore \
    .dockerignore \
    docker-compose*.yml \
    Dockerfile*

# =============================================================================
# Production stage - Final lightweight image
# =============================================================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy production dependencies and application code from builder
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R backend:nodejs /app/logs

# Switch to non-root user
USER backend

# Expose port
EXPOSE 5000

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "src/server.js"]

# =============================================================================
# Metadata labels for educational platform compliance
# =============================================================================
LABEL maintainer="EvalPoint Educational Platform Team"
LABEL version="1.0.0"
LABEL description="EvalPoint Educational Platform Authentication Backend"
LABEL org.opencontainers.image.title="EvalPoint Backend"
LABEL org.opencontainers.image.description="Secure, scalable authentication backend for educational platforms"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2024-12-07"
LABEL org.opencontainers.image.source="https://github.com/evalpoint/backend"
LABEL org.opencontainers.image.licenses="MIT"

# Security and compliance labels
LABEL security.compliance="COPPA,FERPA,GDPR"
LABEL security.scan="trivy,snyk"
LABEL platform.type="educational"
LABEL platform.accessibility="WCAG2.1-AA"