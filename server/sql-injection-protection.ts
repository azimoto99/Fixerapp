/**
 * Comprehensive SQL Injection Protection for Fixer Platform
 * Implements multiple layers of security against malicious SQL queries
 */
import { body, param, query, validationResult } from 'express-validator';
import xss from 'xss';
import { Request, Response, NextFunction } from 'express';

// SQL Injection Detection Patterns
const SQL_INJECTION_PATTERNS = [
  // Basic SQL injection attempts
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  // SQL comments and terminators
  /(--|\/\*|\*\/|;|'|"|`)/g,
  // SQL functions and operators
  /(\b(OR|AND|NOT|LIKE|IN|BETWEEN|IS|NULL|TRUE|FALSE)\s*[=<>!]+)/gi,
  // Hex encoding attempts
  /(0x[0-9a-f]+)/gi,
  // SQL injection with encoding
  /(%27|%22|%2D%2D|%2F%2A|%2A%2F)/gi,
  // Database specific functions
  /(\b(CONCAT|SUBSTRING|ASCII|CHAR|CAST|CONVERT|COUNT|SUM|AVG|MIN|MAX)\b)/gi,
  // Time-based injection patterns
  /(\b(SLEEP|DELAY|WAITFOR|BENCHMARK)\b)/gi,
  // Information schema access
  /(\b(INFORMATION_SCHEMA|SYS\.|\$\$)\b)/gi
];

// Dangerous characters that should be escaped or blocked
const DANGEROUS_CHARS = [
  "'", '"', ';', '--', '/*', '*/', '\\', '`',
  '0x', '%27', '%22', '%2D%2D', '%2F%2A', '%2A%2F'
];

/**
 * Detects potential SQL injection attempts in input
 */
export function detectSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const normalizedInput = input.toLowerCase().trim();
  
  // Check against known SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(normalizedInput)) {
      return true;
    }
  }
  
  // Check for multiple dangerous characters in sequence
  let dangerousCharCount = 0;
  for (const char of DANGEROUS_CHARS) {
    if (normalizedInput.includes(char)) {
      dangerousCharCount++;
    }
  }
  
  // If multiple dangerous characters are present, likely malicious
  return dangerousCharCount >= 2;
}

/**
 * Sanitizes input to prevent SQL injection
 */
export function sanitizeSqlInput(input: any): string {
  if (!input) return '';
  
  let sanitized = String(input);
  
  // Remove/escape dangerous characters
  sanitized = sanitized
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/"/g, '""')  // Escape double quotes
    .replace(/;/g, '')    // Remove semicolons
    .replace(/--/g, '')   // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/`/g, '')    // Remove backticks
    .replace(/0x/gi, '')  // Remove hex prefixes
    .replace(/%27/gi, '') // Remove URL encoded single quotes
    .replace(/%22/gi, '') // Remove URL encoded double quotes
    .replace(/%2D%2D/gi, '') // Remove URL encoded comments
    .replace(/%2F%2A/gi, '') // Remove URL encoded block comments
    .replace(/%2A%2F/gi, ''); // Remove URL encoded block comments
  
  // Apply XSS protection as well
  sanitized = xss(sanitized, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
  
  return sanitized.trim();
}

/**
 * Express middleware to protect against SQL injection
 */
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction) {
  const checkInput = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        if (detectSqlInjection(value)) {
          console.error(`🚨 SQL injection attempt detected in ${currentPath}:`, value);
          return res.status(400).json({
            message: 'Invalid input detected',
            error: 'Security violation: Potential SQL injection attempt'
          });
        }
        
        // Sanitize the input
        obj[key] = sanitizeSqlInput(value);
      } else if (typeof value === 'object' && value !== null) {
        checkInput(value, currentPath);
      }
    }
  };
  
  // Check all input sources
  checkInput(req.body, 'body');
  checkInput(req.query, 'query');
  checkInput(req.params, 'params');
  
  next();
}

/**
 * Enhanced validation schemas for critical forms
 */
export const secureValidationSchemas = {
  // User registration validation
  userRegistration: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('fullName')
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Full name can only contain letters, spaces, apostrophes, and hyphens'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('accountType')
      .isIn(['worker', 'poster'])
      .withMessage('Account type must be either worker or poster')
  ],

  // Job posting validation
  jobPosting: [
    body('title')
      .isLength({ min: 5, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
      .withMessage('Job title contains invalid characters'),
    body('description')
      .isLength({ min: 20, max: 2000 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()'\n\r]+$/)
      .withMessage('Job description contains invalid characters'),
    body('paymentAmount')
      .isFloat({ min: 1, max: 10000 })
      .withMessage('Payment amount must be between $1 and $10,000'),
    body('location')
      .isLength({ min: 5, max: 200 })
      .matches(/^[a-zA-Z0-9\s\-.,#()]+$/)
      .withMessage('Location contains invalid characters'),
    body('category')
      .isIn([
        'Cleaning', 'Pet Care', 'Tutoring', 'Organization', 'Decoration',
        'Heavy Lifting', 'Driving', 'Computer Repair', 'Gardening', 'Cooking',
        'Child Care', 'Electrical', 'Plumbing', 'Painting', 'Assembly',
        'Photography', 'Writing', 'Other'
      ])
      .withMessage('Invalid job category')
  ],

  // Support ticket validation
  supportTicket: [
    body('title')
      .isLength({ min: 5, max: 200 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
      .withMessage('Ticket title contains invalid characters'),
    body('description')
      .isLength({ min: 10, max: 5000 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()'\n\r]+$/)
      .withMessage('Ticket description contains invalid characters'),
    body('category')
      .isIn(['general', 'technical', 'account', 'payment', 'dispute'])
      .withMessage('Invalid ticket category'),
    body('priority')
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level')
  ],

  // Admin response validation
  adminResponse: [
    body('response')
      .isLength({ min: 10, max: 5000 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()'\n\r]+$/)
      .withMessage('Response contains invalid characters'),
    body('status')
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status')
  ],

  // Message validation
  messageValidation: [
    body('message')
      .isLength({ min: 1, max: 1000 })
      .matches(/^[a-zA-Z0-9\s\-.,!?()'\n\r]+$/)
      .withMessage('Message contains invalid characters')
  ]
};

/**
 * Validation error handler
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.error('🚨 Validation errors detected:', errors.array());
    return res.status(400).json({
      message: 'Invalid input provided',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  
  next();
}

/**
 * Database query protection wrapper
 */
export function protectedDbQuery<T>(queryFn: () => Promise<T>, operationType: string): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`🔒 Executing protected ${operationType} query`);
      const result = await queryFn();
      console.log(`✅ Protected ${operationType} query completed successfully`);
      resolve(result);
    } catch (error) {
      console.error(`🚨 Protected ${operationType} query failed:`, error);
      reject(new Error(`Database operation failed: ${operationType}`));
    }
  });
}

/**
 * Parameter sanitization for database queries
 */
export function sanitizeDbParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeSqlInput(value);
    } else if (typeof value === 'number') {
      // Ensure it's a valid number
      sanitized[key] = isNaN(value) ? 0 : value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = Boolean(value);
    } else if (value === null || value === undefined) {
      sanitized[key] = null;
    } else {
      // For complex objects, stringify and sanitize
      sanitized[key] = sanitizeSqlInput(JSON.stringify(value));
    }
  }
  
  return sanitized;
}

export default {
  detectSqlInjection,
  sanitizeSqlInput,
  sqlInjectionProtection,
  secureValidationSchemas,
  handleValidationErrors,
  protectedDbQuery,
  sanitizeDbParams
};