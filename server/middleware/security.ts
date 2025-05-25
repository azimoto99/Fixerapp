import { Request, Response, NextFunction } from "express";
import { applySecurity, sanitizeInput, validatePasswordStrength, validateEmail, validatePhoneNumber, logSecurityEvent } from '../security-config';
import { sqlInjectionProtection } from '../sql-injection-protection';
import { validators, sanitizeRequest } from '../secure-endpoints';

// Centralized security middleware
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  applySecurity(req, res, next);
}

// SQL injection protection middleware
export function sqlProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  sqlInjectionProtection(req, res, next);
}

// Request sanitization middleware
export function sanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  sanitizeRequest(req, res, next);
}

export { sanitizeInput, validatePasswordStrength, validateEmail, validatePhoneNumber, logSecurityEvent };