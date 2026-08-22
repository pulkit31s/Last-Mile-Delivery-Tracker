import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../config/logger';

export class SocketManager {
  private static io: SocketIOServer | null = null;

  static initialize(httpServer: HttpServer, corsOrigin: string | string[]): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST', 'PATCH'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`[Socket.IO] Client connected: ${socket.id}`);

      // Client joins a specific order room for live tracking updates
      socket.on('join:order', (orderId: string) => {
        if (orderId) {
          socket.join(`order:${orderId}`);
          logger.info(`[Socket.IO] Socket ${socket.id} joined room: order:${orderId}`);
        }
      });

      socket.on('leave:order', (orderId: string) => {
        if (orderId) {
          socket.leave(`order:${orderId}`);
          logger.info(`[Socket.IO] Socket ${socket.id} left room: order:${orderId}`);
        }
      });

      // Admin channel subscription
      socket.on('join:admin', () => {
        socket.join('admin:channel');
        logger.info(`[Socket.IO] Socket ${socket.id} joined admin channel`);
      });

      socket.on('disconnect', reason => {
        logger.info(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
      });
    });

    return this.io;
  }

  static getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcasts order status update to order room and admin channel.
   */
  static emitOrderStatusUpdate(orderId: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`order:${orderId}`).emit('order:status_updated', payload);
    this.io.to('admin:channel').emit('order:status_updated', payload);
  }

  /**
   * Broadcasts agent location update.
   */
  static emitAgentLocationUpdate(agentId: string, orderId: string | undefined, coords: { lat: number; lng: number }): void {
    if (!this.io) return;
    if (orderId) {
      this.io.to(`order:${orderId}`).emit('agent:location_updated', { agentId, coords, timestamp: new Date() });
    }
    this.io.to('admin:channel').emit('agent:location_updated', { agentId, coords, timestamp: new Date() });
  }

  /**
   * Broadcasts new order created event to admin channel.
   */
  static emitOrderCreated(order: any): void {
    if (!this.io) return;
    this.io.to('admin:channel').emit('order:created', order);
  }
}
