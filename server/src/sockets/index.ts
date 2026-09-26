import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { Client } from '../models/Client';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
  });

  // Socket Authentication & Room Assignment Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const payload = verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${socket.id} (User: ${user.email}, Role: ${user.role})`);

    // Tenant isolation: join brokerage room
    if (user.brokerageId) {
      const tenantRoom = `tenant:${user.brokerageId}`;
      socket.join(tenantRoom);
      logger.debug(`Socket ${socket.id} joined room ${tenantRoom}`);
    }

    // Client-specific room for client portal updates
    if (user.role === 'CLIENT') {
      try {
        const clientRecord = await Client.findOne({ userId: user.userId });
        if (clientRecord) {
          const clientRoom = `client:${clientRecord._id.toString()}`;
          socket.join(clientRoom);
          logger.debug(`Socket ${socket.id} joined client room ${clientRoom}`);
        }
      } catch (err) {
        logger.error('Failed to join client room', err);
      }
    }

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

export function emitToTenant(brokerageId: string | object, event: string, data: any): void {
  if (!io) return;
  const bId = brokerageId.toString();
  io.to(`tenant:${bId}`).emit(event, data);
  logger.debug(`Emitted event [${event}] to tenant [${bId}]`);
}

export function emitToClient(clientId: string | object, event: string, data: any): void {
  if (!io) return;
  const cId = clientId.toString();
  io.to(`client:${cId}`).emit(event, data);
  logger.debug(`Emitted event [${event}] to client [${cId}]`);
}
