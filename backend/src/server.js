const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import configuration and middleware
const { connectDB } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');

/**
 * Educational Platform Backend Server
 * Implements secure, scalable authentication system
 * with educational-specific features and compliance considerations
 */

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for educational tools
}));

// CORS configuration for educational platform
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, specify allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://evalpoint.com',
      'https://app.evalpoint.com',
      // Add your production domain here
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb', // Limit request body size for security
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // Only log errors in production
  }));
}

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Health check endpoint (before rate limiting)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EvalPoint Educational Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      api: '/api',
      health: '/api/health',
      auth: '/api/auth',
      docs: '/api/info'
    }
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 EvalPoint Educational Platform Backend Server Started
📍 Environment: ${NODE_ENV}
🌐 Server running on port ${PORT}
📊 API available at: http://localhost:${PORT}/api
🏥 Health check: http://localhost:${PORT}/api/health
📚 API info: http://localhost:${PORT}/api/info
🔐 Authentication: http://localhost:${PORT}/api/auth
  `);

  // Log important environment variables (without sensitive data)
  console.log('Configuration:');
  console.log(`- Node Environment: ${NODE_ENV}`);
  console.log(`- Port: ${PORT}`);
  console.log(`- MongoDB URI: ${process.env.MONGODB_URI ? '[CONFIGURED]' : '[DEFAULT]'}`);
  console.log(`- JWT Secret: ${process.env.JWT_SECRET ? '[CONFIGURED]' : '[DEFAULT]'}`);
  console.log(`- JWT Expires In: ${process.env.JWT_EXPIRES_IN || '7d'}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.log('🛑 Shutting down server due to unhandled promise rejection');
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.log('🛑 Shutting down server due to uncaught exception');
  process.exit(1);
});

module.exports = app;