import { body, param, query } from 'express-validator';
import { sanitizeInput, validateEmail, validatePhoneNumber, logSecurityEvent } from './security-config';
import { JOB_CATEGORIES, SKILLS } from '@shared/schema';

// Comprehensive input validation for all endpoints
export const validators = {
  // User registration validation
  userRegistration: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('fullName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Full name must be between 1 and 100 characters')
  ],

  // User profile update validation
  userUpdate: [
    body('fullName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Full name must be between 1 and 100 characters'),
    body('bio')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Bio must be less than 1000 characters'),
    body('skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array'),
    body('skills.*')
      .optional()
      .isString()
      .withMessage('Each skill must be a string'),
    body('hourlyRate')
      .optional()
      .isFloat({ min: 0.01, max: 1000 })
      .withMessage('Hourly rate must be between $0.01 and $1000'),
    body('phoneNumber')
      .optional()
      .custom((value) => {
        if (value && !validatePhoneNumber(value)) {
          throw new Error('Invalid phone number format');
        }
        return true;
      })
  ],

  // Job creation validation (for payment-first endpoint)
  jobCreation: [
    body('title')
      .isLength({ min: 5, max: 200 })
      .withMessage('Job title must be between 5 and 200 characters')
      .custom((value) => {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          throw new Error('Job title contains invalid characters');
        }
        return true;
      }),
    body('description')
      .isLength({ min: 20, max: 2000 })
      .withMessage('Job description must be between 20 and 2000 characters')
      .custom((value) => {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          throw new Error('Job description contains invalid characters');
        }
        return true;
      }),
    body('category')
      .isIn(JOB_CATEGORIES)
      .withMessage('Invalid job category'),
    body('paymentType')
      .isIn(['fixed', 'hourly'])
      .withMessage('Payment type must be either fixed or hourly'),
    body('paymentAmount')
      .isFloat({ min: 0.01, max: 10000 })
      .withMessage('Payment amount must be between $0.01 and $10,000'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude coordinate'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude coordinate'),
    body('address')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Address must be less than 500 characters'),
    body('requiredSkills')
      .optional()
      .isArray()
      .withMessage('Required skills must be an array'),
    body('requiredSkills.*')
      .optional()
      .isString()
      .withMessage('Each required skill must be a string'),
    body('dateNeeded')
      .optional()
      .isISO8601()
      .withMessage('Date needed must be a valid ISO 8601 date'),
    body('estimatedHours')
      .optional()
      .isFloat({ min: 0.25, max: 168 })
      .withMessage('Estimated hours must be between 0.25 and 168 hours')
  ],

  // Payment validation
  payment: [
    body('paymentMethodId')
      .matches(/^pm_[a-zA-Z0-9]+$/)
      .withMessage('Invalid payment method ID format'),
    body('amount')
      .isFloat({ min: 0.01, max: 10000 })
      .withMessage('Amount must be between $0.01 and $10,000')
  ],

  // Message validation
  message: [
    body('message')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters')
      .custom((value) => {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          throw new Error('Message contains invalid characters');
        }
        return true;
      }),
    body('jobId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Job ID must be a positive integer'),
    body('recipientId')
      .isInt({ min: 1 })
      .withMessage('Recipient ID must be a positive integer')
  ],

  // Review validation
  review: [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Comment must be less than 500 characters')
      .custom((value) => {
        if (value) {
          const sanitized = sanitizeInput(value);
          if (sanitized !== value) {
            throw new Error('Comment contains invalid characters');
          }
        }
        return true;
      }),
    body('jobId')
      .isInt({ min: 1 })
      .withMessage('Job ID must be a positive integer'),
    body('reviewedUserId')
      .isInt({ min: 1 })
      .withMessage('Reviewed user ID must be a positive integer')
  ],

  // Admin validation
  adminAction: [
    body('reason')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason must be between 1 and 500 characters')
      .custom((value) => {
        if (value) {
          const sanitized = sanitizeInput(value);
          if (sanitized !== value) {
            throw new Error('Reason contains invalid characters');
          }
        }
        return true;
      })
  ],

  // ID parameter validation
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer')
  ],

  // Search query validation
  searchQuery: [
    query('q')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
      .custom((value) => {
        const sanitized = sanitizeInput(value);
        if (sanitized !== value) {
          throw new Error('Search query contains invalid characters');
        }
        return true;
      })
  ]
};

// Security middleware for sanitizing request data
export const sanitizeRequest = (req: any, res: any, next: any) => {
  // Sanitize all string inputs in body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }

  next();
};

// Enhanced admin middleware with additional security checks
export const enhancedAdminAuth = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user) {
    logSecurityEvent('ADMIN_ACCESS_DENIED_NO_AUTH', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    
    // Direct admin access for verified admin user
    if (userId === 20) {
      logSecurityEvent('ADMIN_ACCESS_GRANTED', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      }, userId);
      return next();
    }
    
    // Additional security check for other potential admin users
    const { storage } = await import('./storage');
    const adminUser = await storage.getUser(userId);

    if (adminUser && adminUser.isAdmin === true) {
      logSecurityEvent('ADMIN_ACCESS_GRANTED', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      }, userId);
      return next();
    }
    
    logSecurityEvent('ADMIN_ACCESS_DENIED_INSUFFICIENT_PRIVILEGES', {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    }, userId);
    
    return res.status(403).json({ error: 'Admin access required' });
  } catch (error) {
    logSecurityEvent('ADMIN_ACCESS_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(500).json({ error: 'Admin verification failed' });
  }
};