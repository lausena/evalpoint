const Joi = require('joi');

/**
 * Validation middleware for educational platform
 * Implements comprehensive validation with educational-specific rules
 */

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate (body, params, query)
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Return all validation errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: errorDetails
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

/**
 * User registration validation schema
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  role: Joi.string()
    .valid('student', 'teacher', 'admin', 'parent')
    .default('student')
    .messages({
      'any.only': 'Role must be one of: student, teacher, admin, parent'
    }),
  
  grade: Joi.string()
    .valid('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'college', 'adult')
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Grade must be one of: K, 1-12, college, adult',
      'any.required': 'Grade is required for students'
    }),
  
  parentalConsent: Joi.boolean()
    .when('role', {
      is: 'student',
      then: Joi.when('grade', {
        is: Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7'),
        then: Joi.boolean().valid(true).required().messages({
          'any.only': 'Parental consent is required for students in grades K-7',
          'any.required': 'Parental consent is required for students in grades K-7'
        }),
        otherwise: Joi.boolean().optional()
      }),
      otherwise: Joi.boolean().optional()
    }),
  
  accessibilityPreferences: Joi.object({
    screenReader: Joi.boolean().default(false),
    highContrast: Joi.boolean().default(false),
    fontSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').default('medium'),
    reduceMotion: Joi.boolean().default(false)
  }).optional()
});

/**
 * User login validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Password change validation schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Profile update validation schema
 */
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  accessibilityPreferences: Joi.object({
    screenReader: Joi.boolean().optional(),
    highContrast: Joi.boolean().optional(),
    fontSize: Joi.string().valid('small', 'medium', 'large', 'extra-large').optional(),
    reduceMotion: Joi.boolean().optional()
  }).optional()
});

// Export validation middlewares
const validateRegistration = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateChangePassword = validate(changePasswordSchema);
const validateUpdateProfile = validate(updateProfileSchema);

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  // Export schemas for testing
  schemas: {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    updateProfileSchema
  }
};