const express = require('express');
const authRoutes = require('./auth');

const router = express.Router();

/**
 * Main router for Educational Platform API
 * Centralizes all API route definitions
 */

/**
 * Health check endpoint
 * @route GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EvalPoint API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

/**
 * API information endpoint
 * @route GET /api/info
 */
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'EvalPoint Educational Platform API',
      description: 'Backend API for educational platform with authentication',
      version: '1.0.0',
      documentation: {
        authentication: '/api/auth',
        health: '/api/health'
      },
      features: [
        'User Registration & Authentication',
        'JWT Token Management',
        'Educational Role Management',
        'Accessibility Support',
        'COPPA/FERPA Compliance Ready'
      ]
    }
  });
});

// Mount authentication routes
router.use('/auth', authRoutes);

// 404 handler for undefined API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

module.exports = router;