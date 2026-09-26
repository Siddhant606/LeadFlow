import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { Brokerage } from '../models/Brokerage';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async registerBrokerage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.registerBrokerage(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId);
      const brokerage = user?.brokerageId ? await Brokerage.findById(user.brokerageId) : null;

      res.status(200).json({
        success: true,
        data: {
          user,
          brokerage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await AuthService.createUser(req.brokerageId!, req.body);
      res.status(201).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdvisors(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const advisors = await AuthService.getAdvisors(req.brokerageId!);
      res.status(200).json({ success: true, data: advisors });
    } catch (error) {
      next(error);
    }
  }
}
