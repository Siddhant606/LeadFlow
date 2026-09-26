import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Error encountered: ${err.message}`, {
    stack: err.stack,
    details: err.details,
  });

  // Handle known operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Mongoose / MongoDB duplicate key (E11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    const keyMsg = keys.length ? `Duplicate value for field(s): ${keys.join(', ')}` : 'Duplicate entry';
    res.status(409).json({
      success: false,
      error: {
        message: keyMsg,
        code: 'DUPLICATE_KEY_ERROR',
      },
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        message: `Invalid format for parameter: ${err.path}`,
        code: 'INVALID_ID_FORMAT',
      },
    });
    return;
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: {
        message: `Upload error: ${err.message}`,
        code: 'FILE_UPLOAD_ERROR',
      },
    });
    return;
  }

  // Default internal server error (sanitized in production)
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.nodeEnv !== 'production' ? { stack: err.stack } : {}),
    },
  });
}
