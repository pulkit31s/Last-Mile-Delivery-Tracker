import { Router } from 'express';
import { AgentController } from '../controllers/agentController';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  updateAgentStatusSchema,
  updateAvailabilitySchema,
  updateLocationSchema
} from '../validators';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(UserRole.AGENT, UserRole.ADMIN));

router.get('/orders', AgentController.getAssignedOrders);
router.patch('/availability', validateBody(updateAvailabilitySchema), AgentController.updateAvailability);
router.patch('/location', validateBody(updateLocationSchema), AgentController.updateLocation);
router.patch('/orders/:id/status', validateBody(updateAgentStatusSchema), AgentController.updateOrderStatus);

export default router;
