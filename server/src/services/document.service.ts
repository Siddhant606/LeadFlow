import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mongoose from 'mongoose';
import { DocumentModel, IDocument } from '../models/Document';
import { Client } from '../models/Client';
import { config } from '../config/env';
import { queueDocumentVerification } from '../queues/document.queue';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

// Ensure storage directory exists
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

// Multer storage engine
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storageDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, safeName);
  },
});

export const documentUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Unsupported file type. Only PDF, JPEG, PNG, and WebP are allowed.'));
    }
  },
});

export class DocumentService {
  /**
   * Fast document upload & metadata registration. Returns immediately after queuing background processing.
   */
  static async uploadDocument(
    brokerageId: mongoose.Types.ObjectId,
    clientId: string,
    uploadedBy: mongoose.Types.ObjectId,
    file: Express.Multer.File
  ): Promise<IDocument> {
    if (!file) {
      throw new BadRequestError('No file provided for upload');
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    // Verify client belongs to this brokerage
    const client = await Client.findOne({
      _id: new mongoose.Types.ObjectId(clientId),
      brokerageId,
    });

    if (!client) {
      // Clean up uploaded file if client is invalid
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new NotFoundError('Client not found in this brokerage');
    }

    // 1. Create document metadata record in MongoDB
    const document = await DocumentModel.create({
      brokerageId,
      clientId: client._id,
      uploadedBy,
      originalName: file.originalname,
      storageKey: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      status: 'UPLOADED',
    });

    logger.info(
      `Document uploaded: "${file.originalname}" (${file.size} bytes) for client ${clientId} in brokerage ${brokerageId}`
    );

    // 2. Queue asynchronous background verification in BullMQ
    try {
      await queueDocumentVerification({
        documentId: document._id.toString(),
        brokerageId: brokerageId.toString(),
        clientId: client._id.toString(),
        storageKey: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
    } catch (queueErr) {
      logger.error('Failed to enqueue document verification job', queueErr);
      // Even if queue push has temporary hiccup, document is stored with status UPLOADED
    }

    // 3. Return immediately (fast response requirement)
    return document;
  }

  static async getDocumentsForClient(
    brokerageId: mongoose.Types.ObjectId,
    clientId: string
  ): Promise<IDocument[]> {
    return DocumentModel.find({
      brokerageId,
      clientId: new mongoose.Types.ObjectId(clientId),
    })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
  }

  static async getTenantDocuments(
    brokerageId: mongoose.Types.ObjectId,
    filter: { status?: string }
  ): Promise<IDocument[]> {
    const query: any = { brokerageId };
    if (filter.status) {
      query.status = filter.status;
    }

    return DocumentModel.find(query)
      .populate('clientId')
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
  }

  static async getDocumentForDownload(
    brokerageId: mongoose.Types.ObjectId | null,
    documentId: string,
    userRole: string,
    userId: string
  ): Promise<{ filePath: string; mimeType: string; originalName: string }> {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // Platform admin has universal access
    if (userRole !== 'PLATFORM_ADMIN') {
      // Must belong to the user's brokerage
      if (!brokerageId || doc.brokerageId.toString() !== brokerageId.toString()) {
        throw new ForbiddenError('Cross-tenant document access denied');
      }

      // If client role, can only download own document
      if (userRole === 'CLIENT') {
        const client = await Client.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!client || doc.clientId.toString() !== client._id.toString()) {
          throw new ForbiddenError('Access to other client documents denied');
        }
      }
    }

    const filePath = path.join(config.storageDir, doc.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Document file not found in storage');
    }

    return {
      filePath,
      mimeType: doc.mimeType,
      originalName: doc.originalName,
    };
  }
}
