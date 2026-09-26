import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import mongoose from 'mongoose';

/**
 * Enforces that non-PLATFORM_ADMIN users operate strictly within their own brokerage tenant.
 */
export function enforceTenant(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // PLATFORM_ADMIN can act across tenants if brokerageId is explicitly passed
  if (req.user.role === 'PLATFORM_ADMIN') {
    const requestedBrokerageId =
      (req.headers['x-brokerage-id'] as string) ||
      (req.query.brokerageId as string) ||
      req.body.brokerageId;

    if (requestedBrokerageId && mongoose.Types.ObjectId.isValid(requestedBrokerageId)) {
      req.brokerageId = new mongoose.Types.ObjectId(requestedBrokerageId);
    }
    return next();
  }

  // For tenant users (BROKERAGE_ADMIN, ADVISOR, CLIENT), they must have a brokerageId
  if (!req.user.brokerageId) {
    return next(new ForbiddenError('User is not associated with any brokerage'));
  }

  // Set and lock the request's tenant scope
  req.brokerageId = new mongoose.Types.ObjectId(req.user.brokerageId);

  // IDOR Protection: If user attempts to tamper with brokerageId in query/body/header, reject
  const paramBrokerageId =
    (req.headers['x-brokerage-id'] as string) ||
    (req.query.brokerageId as string) ||
    (req.body && req.body.brokerageId ? String(req.body.brokerageId) : null);

  if (paramBrokerageId && paramBrokerageId !== req.user.brokerageId) {
    return next(
      new ForbiddenError('Cross-tenant violation: Accessing another brokerage is strictly prohibited')
    );
  }

  next();
}
