const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware for educational platform
 * Implements JWT token verification with educational-specific considerations
 */

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID (exclude password)
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error occurred.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if user has specific role(s)
 * @param {string|Array} roles - Required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware for optional authentication
 * Adds user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication on token errors
    next();
  }
};

/**
 * Educational-specific middleware to ensure parental consent for young students
 */
const requireParentalConsent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user is a young student who requires parental consent
  const requiresConsent = req.user.role === 'student' && 
                         ['K', '1', '2', '3', '4', '5', '6', '7'].includes(req.user.grade);

  if (requiresConsent && !req.user.parentalConsent) {
    return res.status(403).json({
      success: false,
      message: 'Parental consent required for this action.',
      code: 'PARENTAL_CONSENT_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware to ensure email verification for sensitive operations
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required for this action.',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireParentalConsent,
  requireEmailVerification
};