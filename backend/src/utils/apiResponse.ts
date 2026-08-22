import { Response } from 'express';

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiResponse {
  static success<T>(res: Response, data?: T, message?: string, statusCode = 200, meta?: any): Response {
    const payload: IApiResponse<T> = {
      success: true,
      message,
      data,
      meta
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data?: T, message = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, code: string, message: string, statusCode = 400, details?: any): Response {
    const payload: IApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      }
    };
    return res.status(statusCode).json(payload);
  }
}
