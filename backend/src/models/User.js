const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for Educational Platform
 * Designed with COPPA/FERPA compliance and accessibility in mind
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't return password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'parent'],
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  // Educational platform specific fields
  grade: {
    type: String,
    enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'college', 'adult'],
    required: function() {
      return this.role === 'student';
    }
  },
  // Accessibility preferences
  accessibilityPreferences: {
    screenReader: {
      type: Boolean,
      default: false
    },
    highContrast: {
      type: Boolean,
      default: false
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium'
    },
    reduceMotion: {
      type: Boolean,
      default: false
    }
  },
  // Privacy settings for educational compliance
  parentalConsent: {
    type: Boolean,
    default: false,
    required: function() {
      // Required for students under 13 (COPPA compliance)
      return this.role === 'student' && ['K', '1', '2', '3', '4', '5', '6', '7'].includes(this.grade);
    }
  }
}, {
  timestamps: true,
  // Ensure virtual fields are included in JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it's been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find user by email (for authentication)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);