/**
 * Global Error Handler Middleware for Educational Platform
 * Provides comprehensive error handling with educational-specific considerations
 */

/**
 * Global error handling middleware
 * Must be defined after all routes
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for monitoring (in production, use proper logging service)
  console.error('Error Stack:', err.stack);
  console.error('Error Details:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND'
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${field}`;
    error = {
      message,
      statusCode: 400,
      code: 'DUPLICATE_FIELD',
      field,
      value
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    
    error = {
      message: 'Validation Error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      errors
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401,
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401,
      code: 'TOKEN_EXPIRED'
    };
  }

  // Rate limiting errors
  if (err.name === 'RateLimitError' || err.type === 'error.type.rate_limit') {
    error = {
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
    code
  };

  // Include additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = error;
  }

  // Include field-specific errors if available
  if (error.errors) {
    response.errors = error.errors;
  }

  // Educational platform specific error handling
  if (code === 'PARENTAL_CONSENT_REQUIRED') {
    response.educationalCompliance = {
      type: 'COPPA',
      message: 'This action requires parental consent for users under 13',
      supportContact: process.env.SUPPORT_EMAIL || 'support@evalpoint.com'
    };
  }

  if (code === 'EMAIL_VERIFICATION_REQUIRED') {
    response.educationalCompliance = {
      type: 'VERIFICATION',
      message: 'Email verification is required for this action',
      verificationEndpoint: '/api/auth/verify-email'
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};