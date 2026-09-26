import { Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { ClientService } from '../services/client.service';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

export class DocumentController {
  static async uploadDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      let clientId = req.body.clientId;

      // If user is a CLIENT, determine their own client ID automatically
      if (req.user!.role === 'CLIENT') {
        const client = await ClientService.getClientByUserId(req.user!.userId);
        if (!client) {
          throw new NotFoundError('Associated client account not found');
        }
        clientId = client._id.toString();
      }

      if (!clientId) {
        throw new BadRequestError('Missing clientId for document upload');
      }

      const document = await DocumentService.uploadDocument(
        req.brokerageId!,
        clientId,
        new mongoose.Types.ObjectId(req.user!.userId),
        req.file
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully and queued for background verification',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTenantDocuments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status } = req.query;
      const documents = await DocumentService.getTenantDocuments(req.brokerageId!, {
        status: status as string,
      });
      res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
      next(error);
    }
  }

  static async getClientDocuments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let clientId = req.params.clientId;

      if (req.user!.role === 'CLIENT') {
        const client = await ClientService.getClientByUserId(req.user!.userId);
        if (!client) {
          throw new NotFoundError('Client record not found');
        }
        clientId = client._id.toString();
      }

      const documents = await DocumentService.getDocumentsForClient(req.brokerageId!, clientId);
      res.status(200).json({ success: true, count: documents.length, data: documents });
    } catch (error) {
      next(error);
    }
  }

  static async downloadDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DocumentService.getDocumentForDownload(
        req.brokerageId || null,
        id,
        req.user!.role,
        req.user!.userId
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.originalName)}"`
      );
      res.sendFile(result.filePath);
    } catch (error) {
      next(error);
    }
  }
}
