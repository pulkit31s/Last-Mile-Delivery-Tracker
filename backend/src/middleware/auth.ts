import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { DeliveryAgent, IDeliveryAgent } from '../models/DeliveryAgent';
import { UserRole } from '../types';
import { ApiResponse } from '../utils/apiResponse';
import { ERROR_CODES } from '../constants';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  agent?: IDeliveryAgent;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if ((req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      return ApiResponse.error(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication token is required. Please login.',
        401
      );
    }

    const secret = process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_98374982374';
    const decoded = jwt.verify(token, secret) as { id: string; role: UserRole };

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      return ApiResponse.error(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'User account is not active or no longer exists.',
        401
      );
    }

    req.user = user;

    // If role is AGENT, populate delivery agent profile
    if (user.role === UserRole.AGENT) {
      const agent = await DeliveryAgent.findOne({ userId: user._id });
      if (agent) {
        req.agent = agent;
      }
    }

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Session expired. Please log in again.',
        401
      );
    }
    return ApiResponse.error(
      res,
      ERROR_CODES.UNAUTHORIZED,
      'Invalid authentication token.',
      401
    );
  }
};

export const authorizeRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return ApiResponse.error(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required.',
        401
      );
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        ERROR_CODES.FORBIDDEN,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        403
      );
    }

    next();
  };
};
