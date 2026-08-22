export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN'
}

export enum AgentAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

export enum CustomerType {
  B2B = 'B2B',
  B2C = 'B2C'
}

export enum ZoneType {
  INTRA_ZONE = 'INTRA_ZONE',
  INTER_ZONE = 'INTER_ZONE'
}

export enum PaymentType {
  PREPAID = 'PREPAID',
  COD = 'COD'
}

export enum OrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED'
}

export enum FailureReason {
  CUSTOMER_UNAVAILABLE = 'Customer unavailable',
  INCORRECT_ADDRESS = 'Incorrect address',
  CUSTOMER_REFUSED = 'Customer refused',
  PREMISES_INACCESSIBLE = 'Premises inaccessible',
  OTHER = 'Other'
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  companyName?: string;
  addresses?: any[];
  agentProfile?: any;
}

export interface ITrackingEvent {
  _id: string;
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  actorRole: string;
  actorName?: string;
  note?: string;
  location?: {
    lat?: number;
    lng?: number;
    addressText?: string;
  };
  metadata?: Record<string, any>;
}

export interface IOrder {
  _id: string;
  orderId: string;
  customerId: any;
  pickupAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    contactName: string;
    contactPhone: string;
    coordinates?: { lat: number; lng: number };
  };
  dropAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    contactName: string;
    contactPhone: string;
    coordinates?: { lat: number; lng: number };
  };
  pickupZone: string;
  dropZone: string;
  orderType: CustomerType;
  paymentType: PaymentType;
  packageDimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  currency: string;
  assignedAgentId?: any;
  status: OrderStatus;
  failureReason?: string;
  failureNote?: string;
  scheduledDeliveryDate: string;
  deliveredAt?: string;
  assignmentDetails?: {
    assignedAt: string;
    method: 'AUTO' | 'MANUAL';
    reason?: string;
    distanceKm?: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPricingQuoteResult {
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  pickupZone: string;
  dropZone: string;
  zoneType: ZoneType;
  customerType: CustomerType;
  paymentType: PaymentType;
  rateCardId: string;
  baseCharge: number;
  codSurcharge: number;
  totalCharge: number;
  currency: string;
  breakdown: {
    baseRate: number;
    incrementalRate: number;
    weightSlab: string;
    volumetricFormula: string;
    roundingRule: string;
    codType?: string;
    codValue?: number;
  };
}
