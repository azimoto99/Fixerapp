import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Express } from 'express';

// Comprehensive security configuration
export const securityConfig = {
  // Rate limiting configurations
  rateLimits: {
    // Strict rate limiting for authentication endpoints
    auth: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // General API rate limiting
    api: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // Strict rate limiting for job posting (expensive operations)
    jobPosting: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // limit each IP to 10 job posts per hour
      message: {
        error: 'Too many job postings, please try again later.',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // Payment operations rate limiting
    payment: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // limit each IP to 20 payment requests per 15 minutes
      message: {
        error: 'Too many payment requests, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // Admin operations rate limiting
    admin: rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50, // limit each IP to 50 admin requests per 5 minutes
      message: {
        error: 'Too many admin requests, please try again later.',
        retryAfter: '5 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    })
  },

  // Security headers configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://api.mapbox.com", "https://cdnjs.cloudflare.com", "https://*.mapbox.com"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://api.mapbox.com", "https://events.mapbox.com"],
        frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

// Input sanitization and validation
export const sanitizeInput = (input: any): string => {
  if (typeof input !== 'string') {
    return String(input || '');
  }
  
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .trim();
};

// SQL injection prevention
export const validateSqlInput = (input: string): boolean => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(OR|AND)\b.*=.*)/i,
    /['"]\s*(OR|AND)\s*['"]/i,
    /['"]\s*=\s*['"]/i
  ];
  
  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
};

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Phone number validation
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Apply security middleware to Express app
export const applySecurity = (app: Express) => {
  // Apply Helmet for security headers
  app.use(helmet(securityConfig.helmet));
  
  // Trust proxy (important for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);
  
  // Apply general API rate limiting
  app.use('/api/', securityConfig.rateLimits.api);
  
  // Apply specific rate limits
  app.use('/api/auth/', securityConfig.rateLimits.auth);
  app.use('/auth/', securityConfig.rateLimits.auth);
  app.use('/api/jobs/payment-first', securityConfig.rateLimits.jobPosting);
  app.use('/api/stripe/', securityConfig.rateLimits.payment);
  app.use('/api/admin/', securityConfig.rateLimits.admin);
  
  console.log('✓ Security middleware applied successfully');
};

// Security audit logging
export const logSecurityEvent = (event: string, details: any, userId?: number) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} - ${event}`, {
    userId,
    ...details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  });
};