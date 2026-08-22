import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes';
import orderRoutes from './orderRoutes';
import agentRoutes from './agentRoutes';
import adminRoutes from './adminRoutes';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  return ApiResponse.success(res, {
    status: isDbConnected ? 'healthy' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/agent', agentRoutes);
router.use('/admin', adminRoutes);

export default router;
