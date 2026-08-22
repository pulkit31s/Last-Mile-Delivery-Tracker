import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiResponse } from '../utils/apiResponse';
import { ERROR_CODES } from '../constants';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code: string = ERROR_CODES.INVALID_INPUT, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${err.message}`, {
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (err instanceof AppError) {
    return ApiResponse.error(res, err.code, err.message, err.statusCode, err.details);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return ApiResponse.error(
      res,
      ERROR_CODES.DUPLICATE_RESOURCE,
      `A resource with this ${field} already exists.`,
      409
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.error(
      res,
      ERROR_CODES.INVALID_INPUT,
      'Database validation error',
      400,
      details
    );
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(
      res,
      ERROR_CODES.INVALID_INPUT,
      `Invalid identifier format: ${err.value}`,
      400
    );
  }

  // Fallback internal server error
  return ApiResponse.error(
    res,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message || 'Internal server error',
    500
  );
};
