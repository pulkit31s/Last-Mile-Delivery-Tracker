import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { pricingQuoteSchema, createOrderSchema, rescheduleOrderSchema } from '../validators';

const router = Router();

// Public / Authenticated quote calculation preview
router.post('/quote', validateBody(pricingQuoteSchema), OrderController.getQuote);

// Protected order actions
router.use(authenticate);

router.post('/', validateBody(createOrderSchema), OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.get('/:id/tracking', OrderController.getTracking);
router.post('/:id/reschedule', validateBody(rescheduleOrderSchema), OrderController.rescheduleOrder);
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;
