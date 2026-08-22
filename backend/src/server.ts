import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB, disconnectDB } from './config/database';
import { logger } from './config/logger';
import { SocketManager } from './sockets/socketManager';

const PORT = Number(process.env.PORT) || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL || '*'
];
SocketManager.initialize(server, allowedOrigins);

import { User } from './models/User';
import { seedDatabase } from './seed';

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      logger.info('Empty database detected. Auto-seeding initial dataset...');
      await seedDatabase();
    }

    server.listen(PORT, () => {
      logger.info(`===================================================`);
      logger.info(`  Last-Mile Delivery REST & Realtime API Running   `);
      logger.info(`  Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  Health Check: http://localhost:${PORT}/api/health`);
      logger.info(`===================================================`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP Server closed.');
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
