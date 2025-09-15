// =============================================================================
// EvalPoint Educational Platform - Test MongoDB Initialization Script
// Test database setup for automated testing and CI/CD
// =============================================================================

print('🧪 Initializing EvalPoint Educational Platform Test Database...');

// Switch to the test database
db = db.getSiblingDB('evalpoint_test');

// Create test user
try {
  db.createUser({
    user: 'test_user',
    pwd: 'testpassword123',
    roles: [
      {
        role: 'readWrite',
        db: 'evalpoint_test'
      }
    ]
  });
  print('✅ Test user created successfully');
} catch (error) {
  print('⚠️  Test user might already exist:', error.message);
}

// =============================================================================
// TEST COLLECTIONS SETUP
// =============================================================================

print('🔬 Creating test collections...');

// Users Collection for testing
try {
  db.createCollection('users');
  db.users.createIndex({ email: 1 }, { unique: true, background: true });
  db.users.createIndex({ role: 1 }, { background: true });
  print('✅ Users test collection created');
} catch (error) {
  print('⚠️  Users collection might already exist:', error.message);
}

// Sessions Collection for testing
try {
  db.createCollection('sessions');
  db.sessions.createIndex({ token: 1 }, { unique: true, background: true });
  db.sessions.createIndex({ expiresAt: 1 }, { 
    background: true, 
    expireAfterSeconds: 0
  });
  print('✅ Sessions test collection created');
} catch (error) {
  print('⚠️  Sessions collection might already exist:', error.message);
}

// Schools Collection for testing
try {
  db.createCollection('schools');
  db.schools.createIndex({ name: 1 }, { background: true });
  print('✅ Schools test collection created');
} catch (error) {
  print('⚠️  Schools collection might already exist:', error.message);
}

// Audit Logs Collection (minimal retention for testing)
try {
  db.createCollection('auditlogs');
  db.auditlogs.createIndex({ timestamp: 1 }, { 
    background: true,
    expireAfterSeconds: 300  // Keep audit logs for 5 minutes in tests
  });
  print('✅ Audit logs test collection created (5-minute retention)');
} catch (error) {
  print('⚠️  Audit logs collection might already exist:', error.message);
}

// Email Storage Collection for testing
try {
  db.createCollection('emailstorage');
  db.emailstorage.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 60  // Keep emails for 1 minute in tests
  });
  print('✅ Email storage test collection created (1-minute retention)');
} catch (error) {
  print('⚠️  Email storage collection might already exist:', error.message);
}

// =============================================================================
// TEST-SPECIFIC COLLECTIONS
// =============================================================================

print('🧪 Creating test-specific collections...');

// Test Results Collection - for storing test execution results
try {
  db.createCollection('testresults');
  db.testresults.createIndex({ testSuite: 1, timestamp: -1 }, { background: true });
  db.testresults.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 3600  // Keep test results for 1 hour
  });
  print('✅ Test results collection created');
} catch (error) {
  print('⚠️  Test results collection might already exist:', error.message);
}

// Test Fixtures Collection - for storing test data
try {
  db.createCollection('testfixtures');
  
  // Insert common test fixtures
  const testFixtures = [
    {
      name: 'valid_user_credentials',
      type: 'authentication',
      data: {
        email: 'testuser@example.com',
        password: 'testpassword123',
        hashedPassword: '$2a$04$7fF7Kq6h4jYdXmLh.zjKVO3lE4Q2xQVPl/Tj7F8k3M7L9Q9YxNL4O'
      },
      createdAt: new Date()
    },
    {
      name: 'invalid_user_credentials',
      type: 'authentication',
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      },
      createdAt: new Date()
    },
    {
      name: 'test_school_data',
      type: 'school',
      data: {
        name: 'Test Elementary School',
        type: 'elementary',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA'
        }
      },
      createdAt: new Date()
    },
    {
      name: 'user_roles_test_data',
      type: 'roles',
      data: {
        validRoles: ['student', 'teacher', 'admin', 'parent', 'school_admin'],
        invalidRoles: ['invalid_role', 'super_admin', 'guest']
      },
      createdAt: new Date()
    },
    {
      name: 'jwt_test_secrets',
      type: 'authentication',
      data: {
        secret: 'test_jwt_secret_key_for_testing_only',
        refreshSecret: 'test_refresh_secret_key',
        expiration: '1h'
      },
      createdAt: new Date()
    }
  ];
  
  db.testfixtures.insertMany(testFixtures);
  print('✅ Test fixtures inserted');
} catch (error) {
  print('⚠️  Error creating test fixtures:', error.message);
}

// Test Coverage Collection - for tracking test coverage
try {
  db.createCollection('testcoverage');
  db.testcoverage.createIndex({ module: 1, timestamp: -1 }, { background: true });
  db.testcoverage.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 7200  // Keep coverage data for 2 hours
  });
  print('✅ Test coverage collection created');
} catch (error) {
  print('⚠️  Test coverage collection might already exist:', error.message);
}

// =============================================================================
// TEST UTILITY FUNCTIONS
// =============================================================================

print('🔧 Setting up test utility functions...');

// Helper function to clean test data
try {
  // Create a stored procedure for cleaning test data
  db.system.js.save({
    _id: 'cleanTestData',
    value: function() {
      // Clean up test collections
      db.users.deleteMany({ email: /test/ });
      db.sessions.deleteMany({});
      db.schools.deleteMany({ name: /Test/ });
      db.auditlogs.deleteMany({});
      db.emailstorage.deleteMany({});
      db.testresults.deleteMany({});
      
      return { message: 'Test data cleaned successfully' };
    }
  });
  
  print('✅ Test utility functions created');
} catch (error) {
  print('⚠️  Error creating utility functions:', error.message);
}

// =============================================================================
// PERFORMANCE TESTING SETUP
// =============================================================================

print('⚡ Setting up performance testing collections...');

// Performance Metrics Collection
try {
  db.createCollection('perfmetrics');
  db.perfmetrics.createIndex({ testName: 1, timestamp: -1 }, { background: true });
  db.perfmetrics.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 86400  // Keep performance metrics for 1 day
  });
  
  // Insert sample performance baseline
  db.perfmetrics.insertOne({
    testName: 'user_authentication',
    metrics: {
      averageResponseTime: 50,
      maxResponseTime: 100,
      minResponseTime: 20,
      throughput: 1000,
      errorRate: 0
    },
    baseline: true,
    timestamp: new Date()
  });
  
  print('✅ Performance metrics collection created with baseline');
} catch (error) {
  print('⚠️  Error creating performance metrics:', error.message);
}

// Load Testing Collection
try {
  db.createCollection('loadtests');
  db.loadtests.createIndex({ testId: 1, timestamp: -1 }, { background: true });
  
  print('✅ Load testing collection created');
} catch (error) {
  print('⚠️  Load testing collection might already exist:', error.message);
}

// =============================================================================
// SECURITY TESTING SETUP
// =============================================================================

print('🔒 Setting up security testing collections...');

// Security Test Results Collection
try {
  db.createCollection('securitytests');
  db.securitytests.createIndex({ testType: 1, timestamp: -1 }, { background: true });
  
  // Insert security test scenarios
  const securityTests = [
    {
      testType: 'sql_injection',
      description: 'Test for SQL injection vulnerabilities',
      payloads: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--"
      ],
      expectedResult: 'blocked',
      timestamp: new Date()
    },
    {
      testType: 'xss_prevention',
      description: 'Test for XSS prevention',
      payloads: [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>"
      ],
      expectedResult: 'sanitized',
      timestamp: new Date()
    },
    {
      testType: 'authentication_bypass',
      description: 'Test for authentication bypass attempts',
      scenarios: [
        { type: 'missing_token', expected: 'unauthorized' },
        { type: 'invalid_token', expected: 'unauthorized' },
        { type: 'expired_token', expected: 'unauthorized' }
      ],
      timestamp: new Date()
    }
  ];
  
  db.securitytests.insertMany(securityTests);
  print('✅ Security testing scenarios created');
} catch (error) {
  print('⚠️  Error creating security tests:', error.message);
}

// =============================================================================
// TEST DATABASE CONFIGURATION
// =============================================================================

print('⚙️  Configuring test database settings...');

try {
  // Set minimal profiling for testing
  db.setProfilingLevel(0);  // Disable profiling for tests
  
  // Configure test-specific settings
  db.runCommand({
    "setParameter": 1,
    "logLevel": 0,  // Minimal logging for tests
    "quiet": true
  });
  
  print('✅ Test database configuration applied');
} catch (error) {
  print('⚠️  Some configurations might require instance-level access:', error.message);
}

// =============================================================================
// COMPLETION
// =============================================================================

print('🎉 EvalPoint Educational Platform Test Database Ready!');
print('🧪 Test Features:');
print('   - Clean test collections with short TTL');
print('   - Test fixtures for common scenarios');
print('   - Performance testing baseline data');
print('   - Security testing scenarios');
print('   - Test utility functions');

print('📊 Test Collections:');
print('   - testresults (1-hour retention)');
print('   - testfixtures (common test data)');
print('   - testcoverage (2-hour retention)');
print('   - perfmetrics (1-day retention)');
print('   - securitytests (security scenarios)');

print('🔧 Test Utilities:');
print('   - cleanTestData() function for cleanup');
print('   - Performance baseline metrics');
print('   - Security test scenarios');

print('💡 Usage:');
print('   - Use db.loadCollection("testfixtures") for test data');
print('   - Use cleanTestData() to reset between test runs');
print('   - Monitor db.testresults for test execution tracking');

print('✅ Test database ready for comprehensive testing!');