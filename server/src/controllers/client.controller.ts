import { Response, NextFunction } from 'express';
import { ClientService } from '../services/client.service';
import { AuthenticatedRequest } from '../types';
import { NotFoundError } from '../utils/errors';

export class ClientController {
  static async convertLead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { leadId } = req.params;
      const { password, notes } = req.body;
      const result = await ClientService.convertLeadToClient(req.brokerageId!, leadId, {
        password,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Lead converted to client successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getClients(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { caseStatus, search } = req.query;
      const clients = await ClientService.getClients(req.brokerageId!, {
        caseStatus: caseStatus as string,
        search: search as string,
      });
      res.status(200).json({ success: true, count: clients.length, data: clients });
    } catch (error) {
      next(error);
    }
  }

  static async getClientById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const client = await ClientService.getClientById(req.brokerageId!, req.params.id);
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  static async getMyClientProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const client = await ClientService.getClientByUserId(req.user!.userId);
      if (!client) {
        throw new NotFoundError('Client record not found for logged in user');
      }
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }

  static async updateCaseStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { caseStatus, notes } = req.body;
      const client = await ClientService.updateCaseStatus(
        req.brokerageId!,
        req.params.id,
        caseStatus,
        notes
      );
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  }
}
