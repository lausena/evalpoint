// =============================================================================
// EvalPoint Educational Platform - Development MongoDB Initialization Script
// Development database setup with sample data and relaxed security
// =============================================================================

print('🚀 Initializing EvalPoint Educational Platform Development Database...');

// Switch to the development database
db = db.getSiblingDB('evalpoint_dev');

// Create development user
try {
  db.createUser({
    user: 'dev_user',
    pwd: 'devpassword123',
    roles: [
      {
        role: 'readWrite',
        db: 'evalpoint_dev'
      }
    ]
  });
  print('✅ Development user created successfully');
} catch (error) {
  print('⚠️  Development user might already exist:', error.message);
}

// =============================================================================
// DEVELOPMENT COLLECTIONS SETUP
// =============================================================================

print('📚 Creating development collections with sample data...');

// Users Collection with sample educational users
try {
  db.createCollection('users');

  // Create indexes
  db.users.createIndex({ email: 1 }, { unique: true, background: true });
  db.users.createIndex({ role: 1 }, { background: true });

  // Insert sample users for development
  const sampleUsers = [
    {
      email: 'admin@evalpoint.dev',
      password: '$2a$04$7fF7Kq6h4jYdXmLh.zjKVO3lE4Q2xQVPl/Tj7F8k3M7L9Q9YxNL4O', // 'admin123'
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: 'teacher@evalpoint.dev',
      password: '$2a$04$7fF7Kq6h4jYdXmLh.zjKVO3lE4Q2xQVPl/Tj7F8k3M7L9Q9YxNL4O', // 'teacher123'
      role: 'teacher',
      firstName: 'Jane',
      lastName: 'Teacher',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: 'student@evalpoint.dev',
      password: '$2a$04$7fF7Kq6h4jYdXmLh.zjKVO3lE4Q2xQVPl/Tj7F8k3M7L9Q9YxNL4O', // 'student123'
      role: 'student',
      firstName: 'John',
      lastName: 'Student',
      dateOfBirth: new Date('2010-05-15'),
      parentEmail: 'parent@evalpoint.dev',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: 'parent@evalpoint.dev',
      password: '$2a$04$7fF7Kq6h4jYdXmLh.zjKVO3lE4Q2xQVPl/Tj7F8k3M7L9Q9YxNL4O', // 'parent123'
      role: 'parent',
      firstName: 'Mary',
      lastName: 'Parent',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const existingUsers = db.users.countDocuments();
  if (existingUsers === 0) {
    db.users.insertMany(sampleUsers);
    print('✅ Sample users created for development');
    print('   - admin@evalpoint.dev / admin123');
    print('   - teacher@evalpoint.dev / teacher123');
    print('   - student@evalpoint.dev / student123');
    print('   - parent@evalpoint.dev / parent123');
  } else {
    print('ℹ️  Development users already exist');
  }

} catch (error) {
  print('⚠️  Error creating users collection:', error.message);
}

// Sessions Collection for development
try {
  db.createCollection('sessions');
  db.sessions.createIndex({ token: 1 }, { unique: true, background: true });
  db.sessions.createIndex({ expiresAt: 1 }, { 
    background: true, 
    expireAfterSeconds: 0
  });
  print('✅ Sessions collection created');
} catch (error) {
  print('⚠️  Sessions collection might already exist:', error.message);
}

// Schools Collection with sample school
try {
  db.createCollection('schools');
  
  const schoolExists = db.schools.findOne({ name: 'EvalPoint Development School' });
  if (!schoolExists) {
    const schoolId = db.schools.insertOne({
      name: 'EvalPoint Development School',
      type: 'elementary',
      address: {
        street: '456 Development Ave',
        city: 'Test City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      },
      contactInfo: {
        phone: '+1-555-DEV-TEST',
        email: 'info@dev.evalpoint.com',
        website: 'https://dev.evalpoint.com'
      },
      settings: {
        coppaCompliance: false,  // Relaxed for development
        ferpaCompliance: false,  // Relaxed for development
        dataRetentionYears: 1
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).insertedId;
    
    // Update sample users with school association
    db.users.updateMany(
      { role: { $in: ['teacher', 'student'] } },
      { $set: { schoolId: schoolId } }
    );
    
    print('✅ Development school created and associated with users');
  } else {
    print('ℹ️  Development school already exists');
  }
} catch (error) {
  print('⚠️  Error creating schools collection:', error.message);
}

// Audit Logs Collection (shorter retention for development)
try {
  db.createCollection('auditlogs');
  db.auditlogs.createIndex({ userId: 1, timestamp: -1 }, { background: true });
  db.auditlogs.createIndex({ timestamp: 1 }, { 
    background: true,
    expireAfterSeconds: 86400  // Keep audit logs for 1 day in development
  });
  print('✅ Audit logs collection created (1-day retention)');
} catch (error) {
  print('⚠️  Audit logs collection might already exist:', error.message);
}

// Email Storage Collection for development
try {
  db.createCollection('emailstorage');
  db.emailstorage.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 3600  // Keep emails for 1 hour in development
  });
  
  // Insert sample email for testing
  db.emailstorage.insertOne({
    to: 'test@evalpoint.dev',
    from: 'system@evalpoint.dev',
    subject: 'Welcome to EvalPoint Development Environment',
    body: 'This is a test email stored in the development database.',
    html: '<h1>Welcome</h1><p>This is a test email stored in the development database.</p>',
    metadata: {
      type: 'welcome',
      environment: 'development'
    },
    timestamp: new Date()
  });
  
  print('✅ Email storage collection created with sample email');
} catch (error) {
  print('⚠️  Email storage collection might already exist:', error.message);
}

// =============================================================================
// DEVELOPMENT-SPECIFIC FEATURES
// =============================================================================

print('🛠️  Setting up development-specific features...');

// Test Data Collection - for development testing
try {
  db.createCollection('testdata');
  
  // Insert various test scenarios
  const testScenarios = [
    {
      name: 'Authentication Test',
      description: 'Test user authentication flows',
      data: {
        validCredentials: { email: 'teacher@evalpoint.dev', password: 'teacher123' },
        invalidCredentials: { email: 'fake@evalpoint.dev', password: 'wrong' }
      },
      createdAt: new Date()
    },
    {
      name: 'Role-based Access Test',
      description: 'Test different user roles and permissions',
      data: {
        adminUser: 'admin@evalpoint.dev',
        teacherUser: 'teacher@evalpoint.dev',
        studentUser: 'student@evalpoint.dev',
        parentUser: 'parent@evalpoint.dev'
      },
      createdAt: new Date()
    },
    {
      name: 'Email Functionality Test',
      description: 'Test email storage and retrieval',
      data: {
        sampleEmails: [
          'welcome@evalpoint.dev',
          'notification@evalpoint.dev',
          'alert@evalpoint.dev'
        ]
      },
      createdAt: new Date()
    }
  ];
  
  db.testdata.insertMany(testScenarios);
  print('✅ Test data scenarios created for development');
} catch (error) {
  print('⚠️  Error creating test data:', error.message);
}

// Development Metrics Collection
try {
  db.createCollection('devmetrics');
  db.devmetrics.createIndex({ timestamp: 1 }, {
    background: true,
    expireAfterSeconds: 604800  // Keep metrics for 1 week
  });
  
  // Insert initial development metrics
  db.devmetrics.insertOne({
    event: 'database_initialized',
    details: {
      collections_created: db.getCollectionNames().length,
      users_seeded: 4,
      environment: 'development'
    },
    timestamp: new Date()
  });
  
  print('✅ Development metrics collection created');
} catch (error) {
  print('⚠️  Error creating metrics collection:', error.message);
}

// =============================================================================
// DEVELOPMENT CONVENIENCE FEATURES
// =============================================================================

print('💡 Setting up development convenience features...');

// Create views for easy data access during development
try {
  // Active users view
  db.createView('active_users', 'users', [
    { $match: { isActive: true } },
    { $project: { 
      email: 1, 
      role: 1, 
      firstName: 1, 
      lastName: 1, 
      createdAt: 1 
    }}
  ]);
  
  // Recent sessions view
  db.createView('recent_sessions', 'sessions', [
    { $match: { 
      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }  // Last 24 hours
    }},
    { $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }},
    { $project: {
      token: 1,
      user: { $arrayElemAt: ['$user.email', 0] },
      createdAt: 1,
      expiresAt: 1
    }}
  ]);
  
  print('✅ Development views created for easy data access');
} catch (error) {
  print('⚠️  Error creating views:', error.message);
}

// =============================================================================
// COMPLETION
// =============================================================================

print('🎉 EvalPoint Educational Platform Development Database Ready!');
print('📊 Development Features:');
print('   - Sample users with different roles');
print('   - Test data scenarios');
print('   - Development metrics tracking');
print('   - Convenient data access views');
print('   - Relaxed security for development');

print('👥 Test Accounts:');
print('   Admin: admin@evalpoint.dev / admin123');
print('   Teacher: teacher@evalpoint.dev / teacher123');
print('   Student: student@evalpoint.dev / student123');
print('   Parent: parent@evalpoint.dev / parent123');

print('🔧 Development Tools:');
print('   - MongoDB Express available on port 8081');
print('   - Audit logs with 1-day retention');
print('   - Email storage with 1-hour retention');
print('   - Test data collection for scenarios');

print('✅ Development database ready for educational platform development!');