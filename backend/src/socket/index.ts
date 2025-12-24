import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  workspaceId?: string;
}

export function initializeSocketIO(io: SocketIOServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.workspaceId = decoded.workspaceId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join workspace room
    if (socket.workspaceId) {
      socket.join(`workspace:${socket.workspaceId}`);
    }

    // Handle chat message
    socket.on('chat:message', async (data) => {
      try {
        logger.info('Chat message received', {
          userId: socket.userId,
          conversationId: data.conversationId,
        });

        // Emit acknowledgment
        socket.emit('chat:message:ack', {
          messageId: data.messageId,
          status: 'received',
        });

        // TODO: Process message with AI engine
        // For now, emit a mock response
        socket.emit('chat:message:response', {
          conversationId: data.conversationId,
          role: 'assistant',
          content: 'This is a placeholder response. AI engine integration pending.',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Chat message error:', error);
        socket.emit('chat:error', {
          error: 'Failed to process message',
        });
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Handle stop typing
    socket.on('chat:stop-typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:stop-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Handle join conversation
    socket.on('conversation:join', (data) => {
      socket.join(`conversation:${data.conversationId}`);
      logger.info('User joined conversation', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Handle leave conversation
    socket.on('conversation:leave', (data) => {
      socket.leave(`conversation:${data.conversationId}`);
      logger.info('User left conversation', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
      });
    });
  });

  logger.info('Socket.IO initialized');
}

export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToWorkspace(
  io: SocketIOServer,
  workspaceId: string,
  event: string,
  data: any
): void {
  io.to(`workspace:${workspaceId}`).emit(event, data);
}

export function emitToConversation(
  io: SocketIOServer,
  conversationId: string,
  event: string,
  data: any
): void {
  io.to(`conversation:${conversationId}`).emit(event, data);
}
