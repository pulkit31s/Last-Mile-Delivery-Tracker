import { z } from 'zod';
import {
  CustomerType,
  PaymentType,
  UserRole,
  AgentAvailabilityStatus,
  VehicleType,
  OrderStatus,
  FailureReason,
  ZoneType,
  CODSurchargeType
} from '../types';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CUSTOMER),
  companyName: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const addressSchema = z.object({
  street: z.string().min(3, 'Street address is required'),
  area: z.string().min(2, 'Area is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{4,10}$/, 'Invalid pincode format'),
  contactName: z.string().min(2, 'Contact name is required'),
  contactPhone: z.string().min(10, 'Contact phone is required'),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
    .optional()
});

export const dimensionsSchema = z.object({
  length: z.number().positive('Length must be greater than 0'),
  breadth: z.number().positive('Breadth must be greater than 0'),
  height: z.number().positive('Height must be greater than 0')
});

export const pricingQuoteSchema = z.object({
  pickupPincode: z.string().min(3, 'Pickup pincode is required'),
  dropPincode: z.string().min(3, 'Drop pincode is required'),
  customerType: z.nativeEnum(CustomerType),
  paymentType: z.nativeEnum(PaymentType),
  dimensions: dimensionsSchema,
  actualWeight: z.number().positive('Actual weight must be greater than 0 kg'),
  declaredValue: z.number().min(0).optional()
});

export const createOrderSchema = z.object({
  customerId: z.string().optional(), // For admin creating on customer's behalf
  pickupAddress: addressSchema,
  dropAddress: addressSchema,
  orderType: z.nativeEnum(CustomerType),
  paymentType: z.nativeEnum(PaymentType),
  packageDimensions: dimensionsSchema,
  actualWeight: z.number().positive('Actual weight must be positive'),
  scheduledDeliveryDate: z.string().datetime().optional().or(z.date().optional()),
  notes: z.string().max(500).optional(),
  autoAssign: z.boolean().optional().default(true)
});

export const updateAgentStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  failureReason: z.string().optional(),
  notes: z.string().max(500).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      addressText: z.string().optional()
    })
    .optional()
});

export const adminOverrideStatusSchema = z.object({
  newStatus: z.nativeEnum(OrderStatus),
  reason: z.string().min(5, 'Override reason must be at least 5 characters'),
  notes: z.string().max(500).optional()
});

export const rescheduleOrderSchema = z.object({
  newDeliveryDate: z.string().min(1, 'New delivery date is required'),
  reason: z.string().min(3, 'Reschedule reason is required')
});

export const manualAssignSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required')
});

export const updateAvailabilitySchema = z.object({
  availabilityStatus: z.nativeEnum(AgentAvailabilityStatus)
});

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  currentZone: z.string().optional()
});

export const createZoneSchema = z.object({
  name: z.string().min(2, 'Zone name must be at least 2 characters'),
  code: z.string().min(2, 'Zone code is required').toUpperCase(),
  description: z.string().optional(),
  cities: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const createAreaSchema = z.object({
  name: z.string().min(2, 'Area name is required'),
  code: z.string().min(2, 'Area code is required').toUpperCase(),
  pincode: z.string().min(4, 'Pincode is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zoneCode: z.string().min(2, 'Zone code is required').toUpperCase(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const createRateCardSchema = z.object({
  name: z.string().min(2, 'Rate card name is required'),
  customerType: z.nativeEnum(CustomerType),
  zoneType: z.nativeEnum(ZoneType),
  weightFrom: z.number().min(0, 'Weight from must be >= 0'),
  weightTo: z.number().positive('Weight to must be positive'),
  baseRate: z.number().min(0, 'Base rate must be >= 0'),
  incrementalRate: z.number().min(0, 'Incremental rate must be >= 0').default(0),
  effectiveFrom: z.string().optional().or(z.date().optional()),
  effectiveTo: z.string().optional().or(z.date().optional()),
  active: z.boolean().default(true)
});

export const createCODConfigSchema = z.object({
  customerType: z.nativeEnum(CustomerType),
  surchargeType: z.nativeEnum(CODSurchargeType),
  surchargeValue: z.number().min(0, 'Surcharge value must be >= 0'),
  minimumCharge: z.number().min(0).default(0),
  maximumCharge: z.number().min(0).default(999999),
  active: z.boolean().default(true)
});
