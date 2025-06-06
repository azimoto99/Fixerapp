import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';

/**
 * Express-validator error handler
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    });
  }
  next();
}

/**
 * Zod schema validation middleware factory
 */
export function validateSchema(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: result.error.errors.map(error => ({
            field: error.path.join('.'),
            message: error.message,
            code: error.code
          }))
        });
      }
      
      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      console.error('Schema validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.query.page = page.toString();
  req.query.limit = limit.toString();
  next();
}

/**
 * Validate numeric ID parameter
 */
export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params[paramName]);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
        code: 'INVALID_ID'
      });
    }
    req.params[paramName] = id.toString();
    next();
  };
}