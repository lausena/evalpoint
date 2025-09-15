const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Controller for Educational Platform
 * Handles user registration, login, and profile management
 * with educational-specific features and compliance considerations
 */

/**
 * Generate JWT token for user
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'evalpoint-platform'
    }
  );
};

/**
 * Send token response
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  
  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      token,
      user: userObj
    }
  });
};

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      grade,
      parentalConsent,
      accessibilityPreferences
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address',
        code: 'USER_EXISTS'
      });
    }

    // Create user data object
    const userData = {
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role || 'student'
    };

    // Add grade for students
    if (userData.role === 'student' && grade) {
      userData.grade = grade;
    }

    // Add parental consent for young students
    if (parentalConsent !== undefined) {
      userData.parentalConsent = parentalConsent;
    }

    // Add accessibility preferences if provided
    if (accessibilityPreferences) {
      userData.accessibilityPreferences = {
        screenReader: accessibilityPreferences.screenReader || false,
        highContrast: accessibilityPreferences.highContrast || false,
        fontSize: accessibilityPreferences.fontSize || 'medium',
        reduceMotion: accessibilityPreferences.reduceMotion || false
      };
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Log registration for educational compliance
    console.log(`New user registered: ${user.email} (${user.role})`);

    sendTokenResponse(user, 201, res, 'User registered successfully');

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address',
        code: 'USER_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email and include password for comparison
    const user = await User.findByEmail(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login timestamp
    await user.updateLastLogin();

    // Log successful login for educational compliance
    console.log(`User login: ${user.email} (${user.role})`);

    sendTokenResponse(user, 200, res, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = req.user.toObject();
    delete user.password; // Ensure password is not included

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      code: 'PROFILE_ERROR'
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, accessibilityPreferences } = req.body;
    const user = req.user;

    // Update allowed fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    
    // Update accessibility preferences
    if (accessibilityPreferences) {
      user.accessibilityPreferences = {
        ...user.accessibilityPreferences.toObject(),
        ...accessibilityPreferences
      };
    }

    await user.save();

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userObj
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'UPDATE_ERROR'
    });
  }
};

/**
 * Change user password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change for security
    console.log(`Password changed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

/**
 * Logout user (client-side token invalidation)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // In a JWT setup, logout is typically handled client-side by removing the token
    // Here we just acknowledge the logout request
    
    // Log logout for educational compliance
    console.log(`User logout: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};