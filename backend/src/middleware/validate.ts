import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiResponse } from '../utils/apiResponse';
import { ERROR_CODES } from '../constants';

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(
          res,
          ERROR_CODES.INVALID_INPUT,
          'Validation failed for request body',
          400,
          errorDetails
        );
      }
      return ApiResponse.error(
        res,
        ERROR_CODES.INVALID_INPUT,
        'Invalid request data',
        400
      );
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(
          res,
          ERROR_CODES.INVALID_INPUT,
          'Validation failed for query parameters',
          400,
          errorDetails
        );
      }
      next(error);
    }
  };
};
