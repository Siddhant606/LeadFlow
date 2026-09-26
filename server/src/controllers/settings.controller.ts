import { Response, NextFunction } from 'express';
import { PipelineService } from '../services/pipeline.service';
import { EmailTemplate } from '../models/EmailTemplate';
import { AuthenticatedRequest } from '../types';
import mongoose from 'mongoose';

export class SettingsController {
  // --- Pipeline Stages ---
  static async getStages(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stages = await PipelineService.getStages(req.brokerageId!);
      res.status(200).json({ success: true, data: stages });
    } catch (error) {
      next(error);
    }
  }

  static async updateStage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stage = await PipelineService.updateStage(req.brokerageId!, req.params.id, req.body);
      res.status(200).json({ success: true, data: stage });
    } catch (error) {
      next(error);
    }
  }

  // --- Email Templates ---
  static async getEmailTemplates(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const templates = await EmailTemplate.find({ brokerageId: req.brokerageId! }).sort({ name: 1 });
      res.status(200).json({ success: true, count: templates.length, data: templates });
    } catch (error) {
      next(error);
    }
  }

  static async createEmailTemplate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const template = await EmailTemplate.create({
        brokerageId: req.brokerageId!,
        ...req.body,
      });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  static async updateEmailTemplate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const template = await EmailTemplate.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(req.params.id), brokerageId: req.brokerageId! },
        req.body,
        { new: true }
      );
      res.status(200).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmailTemplate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await EmailTemplate.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(req.params.id),
        brokerageId: req.brokerageId!,
      });
      res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (error) {
      next(error);
    }
  }
}
