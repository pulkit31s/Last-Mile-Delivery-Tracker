export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum AgentAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

export enum VehicleType {
  BIKE = 'BIKE',
  SCOOTER = 'SCOOTER',
  VAN = 'VAN',
  TRUCK = 'TRUCK'
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

export enum CODSurchargeType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE'
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

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEV_MOCKED = 'DEV_MOCKED'
}

export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  ADMIN_STATUS_OVERRIDE = 'ADMIN_STATUS_OVERRIDE',
  ORDER_RESCHEDULED = 'ORDER_RESCHEDULED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  RATE_CARD_CREATED = 'RATE_CARD_CREATED',
  RATE_CARD_UPDATED = 'RATE_CARD_UPDATED',
  RATE_CARD_DELETED = 'RATE_CARD_DELETED',
  ZONE_CREATED = 'ZONE_CREATED',
  ZONE_UPDATED = 'ZONE_UPDATED',
  AREA_CREATED = 'AREA_CREATED',
  AREA_UPDATED = 'AREA_UPDATED',
  AGENT_STATUS_TOGGLED = 'AGENT_STATUS_TOGGLED'
}

export interface ILocationCoordinates {
  lat: number;
  lng: number;
}

export interface IAddress {
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  contactName?: string;
  contactPhone?: string;
  coordinates?: ILocationCoordinates;
}

export interface IPackageDimensions {
  length: number; // in cm
  breadth: number; // in cm
  height: number; // in cm
}

export interface IPricingQuoteInput {
  pickupPincode: string;
  dropPincode: string;
  customerType: CustomerType;
  paymentType: PaymentType;
  dimensions: IPackageDimensions;
  actualWeight: number; // in kg
  declaredValue?: number;
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
