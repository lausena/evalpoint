const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword
} = require('../middleware/validation');

const router = express.Router();

/**
 * Rate limiting for authentication routes
 * Educational platforms need to protect against brute force attacks
 * while being accessible to legitimate users
 */

// General auth rate limiting - 100 requests per 15 minutes
const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for login attempts - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration rate limiting - 3 registrations per hour per IP
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  registrationLimiter,
  validateRegistration,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  loginLimiter,
  validateLogin,
  login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  generalAuthLimiter,
  authenticate,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  generalAuthLimiter,
  authenticate,
  validateUpdateProfile,
  updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  generalAuthLimiter,
  authenticate,
  validateChangePassword,
  changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private
 */
router.post('/logout',
  generalAuthLimiter,
  authenticate,
  logout
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if token is still valid
 * @access  Private
 */
router.get('/verify-token',
  generalAuthLimiter,
  authenticate,
  (req, res) => {
    // If we reach here, the token is valid (middleware passed)
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          fullName: req.user.fullName
        }
      }
    });
  }
);

module.exports = router;