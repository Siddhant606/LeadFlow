import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthenticatedRequest, UserRole } from '../types';
import { User } from '../models/User';
import mongoose from 'mongoose';

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    
    // Check if user still exists and is active
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return next(new UnauthorizedError('User account not found or deactivated'));
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
      name: user.name,
    };

    if (user.brokerageId) {
      req.brokerageId = user.brokerageId as mongoose.Types.ObjectId;
    }

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token has expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Forbidden: User role '${req.user.role}' lacks required permissions`)
      );
    }

    next();
  };
}
