import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createZoneSchema,
  createAreaSchema,
  createRateCardSchema,
  createCODConfigSchema,
  adminOverrideStatusSchema,
  manualAssignSchema
} from '../validators';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(UserRole.ADMIN));

// Dashboard KPIs
router.get('/dashboard-stats', AdminController.getDashboardStats);

// Zone Management
router.get('/zones', AdminController.getZones);
router.post('/zones', validateBody(createZoneSchema), AdminController.createZone);
router.patch('/zones/:id', AdminController.updateZone);

// Area Management
router.get('/areas', AdminController.getAreas);
router.post('/areas', validateBody(createAreaSchema), AdminController.createArea);

// Rate Cards
router.get('/rates', AdminController.getRateCards);
router.post('/rates', validateBody(createRateCardSchema), AdminController.createRateCard);
router.patch('/rates/:id', AdminController.updateRateCard);

// COD Config
router.get('/cod-config', AdminController.getCODConfig);
router.post('/cod-config', validateBody(createCODConfigSchema), AdminController.upsertCODConfig);

// Delivery Agents Fleet
router.get('/agents', AdminController.getAgents);

// Order Assignments & Overrides
router.post('/orders/:id/assign', validateBody(manualAssignSchema), AdminController.manualAssign);
router.post('/orders/:id/auto-assign', AdminController.triggerAutoAssign);
router.patch('/orders/:id/status', validateBody(adminOverrideStatusSchema), AdminController.adminOverrideStatus);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
