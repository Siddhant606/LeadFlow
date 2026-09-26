import { Response, NextFunction } from 'express';
import { LeadService } from '../services/lead.service';
import { AuthenticatedRequest } from '../types';

export class LeadController {
  static async getLeads(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { stage, advisorId, search } = req.query;
      const leads = await LeadService.getLeads(req.brokerageId!, {
        stage: stage as string,
        advisorId: advisorId as string,
        search: search as string,
      });
      res.status(200).json({ success: true, count: leads.length, data: leads });
    } catch (error) {
      next(error);
    }
  }

  static async getLeadById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const lead = await LeadService.getLeadById(req.brokerageId!, req.params.id);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  static async createLead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await LeadService.createManualLead(req.brokerageId!, req.body);
      res.status(201).json({
        success: true,
        duplicatePersonDetected: result.duplicatePersonDetected,
        data: result.lead,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLeadStage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { stage } = req.body;
      const lead = await LeadService.updateLeadStage(req.brokerageId!, req.params.id, stage);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  static async updateLead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const lead = await LeadService.updateLead(req.brokerageId!, req.params.id, req.body);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }
}
