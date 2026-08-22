import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes';
import orderRoutes from './orderRoutes';
import agentRoutes from './agentRoutes';
import adminRoutes from './adminRoutes';
import { ApiResponse } from '../utils/apiResponse';
import { seedDatabase } from '../seed';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  return ApiResponse.success(res, {
    status: isDbConnected ? 'healthy' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Demo seed endpoint (useful for judges & evaluators to populate live cloud database)
router.get('/seed', async (_req: Request, res: Response) => {
  try {
    await seedDatabase();
    return ApiResponse.success(res, {
      message: 'Database seeded successfully with demo users, zones, rate cards, and test orders.',
      credentials: {
        admin: 'admin@example.com / Admin@12345',
        customer1: 'customer1@example.com / Password@123',
        customer2: 'customer2@example.com / Password@123',
        agent1: 'agent1@example.com / Password@123',
        agent2: 'agent2@example.com / Password@123'
      }
    });
  } catch (err: any) {
    return ApiResponse.error(res, 'SEED_ERROR', err.message, 500);
  }
});

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/agent', agentRoutes);
router.use('/admin', adminRoutes);

export default router;
