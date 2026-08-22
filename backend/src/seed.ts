import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/database';
import { logger } from './config/logger';
import { User } from './models/User';
import { DeliveryAgent } from './models/DeliveryAgent';
import { Zone } from './models/Zone';
import { Area } from './models/Area';
import { RateCard } from './models/RateCard';
import { CODConfiguration } from './models/CODConfiguration';
import { Order } from './models/Order';
import { TrackingEvent } from './models/TrackingEvent';
import { Reschedule } from './models/Reschedule';
import { AuditLog } from './models/AuditLog';
import {
  UserRole,
  UserStatus,
  CustomerType,
  ZoneType,
  PaymentType,
  CODSurchargeType,
  OrderStatus,
  AgentAvailabilityStatus,
  VehicleType,
  FailureReason
} from './types';

export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    logger.info('Checking / Seeding database collections...');

    await Promise.all([
      User.deleteMany({}),
      DeliveryAgent.deleteMany({}),
      Zone.deleteMany({}),
      Area.deleteMany({}),
      RateCard.deleteMany({}),
      CODConfiguration.deleteMany({}),
      Order.deleteMany({}),
      TrackingEvent.deleteMany({}),
      Reschedule.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);

    // 1. CREATE USERS
    logger.info('Seeding Users...');
    const admin = await User.create({
      name: 'Operations Admin',
      email: 'admin@example.com',
      phone: '9876543210',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    });

    const customer1 = await User.create({
      name: 'Aarav Sharma',
      email: 'customer1@example.com',
      phone: '9811122233',
      passwordHash: defaultPasswordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      companyName: 'Sharma Retail Traders',
      addresses: [
        {
          street: '124 Block C, Rohini Sector 9',
          area: 'Rohini',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110085',
          contactName: 'Aarav Sharma',
          contactPhone: '9811122233',
          coordinates: { lat: 28.7041, lng: 77.1025 }
        }
      ]
    });

    const customer2 = await User.create({
      name: 'Priya Verma',
      email: 'customer2@example.com',
      phone: '9822233344',
      passwordHash: defaultPasswordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      companyName: 'Apex Enterprise Ltd',
      addresses: [
        {
          street: '45 Saket Community Centre',
          area: 'Saket',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110017',
          contactName: 'Priya Verma',
          contactPhone: '9822233344',
          coordinates: { lat: 28.5245, lng: 77.2066 }
        }
      ]
    });

    // 2. CREATE AGENT USERS & FLEET
    logger.info('Seeding Delivery Agents...');
    const agentUsersData = [
      {
        name: 'Rahul Kumar',
        email: 'agent1@example.com',
        phone: '9833344455',
        empId: 'EMP0001',
        zone: 'ZONE_NORTH',
        coords: { lat: 28.7045, lng: 77.103 },
        status: AgentAvailabilityStatus.AVAILABLE,
        vehicle: VehicleType.BIKE,
        reg: 'DL-01-AB-1234'
      },
      {
        name: 'Vikram Singh',
        email: 'agent2@example.com',
        phone: '9844455566',
        empId: 'EMP0002',
        zone: 'ZONE_SOUTH',
        coords: { lat: 28.5355, lng: 77.2588 },
        status: AgentAvailabilityStatus.AVAILABLE,
        vehicle: VehicleType.SCOOTER,
        reg: 'DL-02-CD-5678'
      },
      {
        name: 'Deepak Yadav',
        email: 'agent3@example.com',
        phone: '9855566677',
        empId: 'EMP0003',
        zone: 'ZONE_WEST',
        coords: { lat: 28.6289, lng: 77.0888 },
        status: AgentAvailabilityStatus.BUSY,
        vehicle: VehicleType.VAN,
        reg: 'DL-03-EF-9012'
      },
      {
        name: 'Amit Patel',
        email: 'agent4@example.com',
        phone: '9866677788',
        empId: 'EMP0004',
        zone: 'ZONE_EAST',
        coords: { lat: 28.6304, lng: 77.2773 },
        status: AgentAvailabilityStatus.AVAILABLE,
        vehicle: VehicleType.BIKE,
        reg: 'DL-04-GH-3456'
      },
      {
        name: 'Suresh Raina',
        email: 'agent5@example.com',
        phone: '9877788899',
        empId: 'EMP0005',
        zone: 'ZONE_CENTRAL',
        coords: { lat: 28.6139, lng: 77.209 },
        status: AgentAvailabilityStatus.AVAILABLE,
        vehicle: VehicleType.BIKE,
        reg: 'DL-05-JK-7890'
      }
    ];

    const agents: any[] = [];
    for (const aData of agentUsersData) {
      const u = await User.create({
        name: aData.name,
        email: aData.email,
        phone: aData.phone,
        passwordHash: defaultPasswordHash,
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE
      });

      const agent = await DeliveryAgent.create({
        userId: u._id,
        employeeId: aData.empId,
        phone: aData.phone,
        vehicleType: aData.vehicle,
        vehicleNumber: aData.reg,
        availabilityStatus: aData.status,
        currentLocation: aData.coords,
        currentZone: aData.zone,
        lastLocationUpdate: new Date(),
        activeOrders: 0,
        maxConcurrentOrders: 5
      });
      agents.push(agent);
    }

    // 3. CREATE ZONES
    logger.info('Seeding Zones...');
    const zonesData = [
      { name: 'North Delhi NCR', code: 'ZONE_NORTH', cities: ['Delhi', 'Sonipat'] },
      { name: 'South Delhi NCR', code: 'ZONE_SOUTH', cities: ['Delhi', 'Gurugram', 'Faridabad'] },
      { name: 'West Delhi NCR', code: 'ZONE_WEST', cities: ['Delhi', 'Bahadurgarh'] },
      { name: 'East Delhi NCR', code: 'ZONE_EAST', cities: ['Delhi', 'Noida', 'Ghaziabad'] },
      { name: 'Central Delhi Hub', code: 'ZONE_CENTRAL', cities: ['Delhi'] }
    ];

    const zoneMap: Record<string, any> = {};
    for (const z of zonesData) {
      const createdZone = await Zone.create(z);
      zoneMap[z.code] = createdZone;
    }

    // 4. CREATE AREAS (Pincode mappings)
    logger.info('Seeding Areas & Pincodes...');
    const areasData = [
      // North
      { name: 'Rohini Sector 9', code: 'AREA_ROHINI', pincode: '110085', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_NORTH' },
      { name: 'Pitampura', code: 'AREA_PITAMPURA', pincode: '110034', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_NORTH' },
      { name: 'Model Town', code: 'AREA_MODELTOWN', pincode: '110009', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_NORTH' },
      // South
      { name: 'Saket District Centre', code: 'AREA_SAKET', pincode: '110017', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_SOUTH' },
      { name: 'Hauz Khas', code: 'AREA_HAUZKHAS', pincode: '110016', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_SOUTH' },
      { name: 'Greater Kailash II', code: 'AREA_GK2', pincode: '110048', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_SOUTH' },
      // West
      { name: 'Janakpuri District', code: 'AREA_JANAKPURI', pincode: '110058', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_WEST' },
      { name: 'Punjabi Bagh', code: 'AREA_PUNJABIBAGH', pincode: '110026', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_WEST' },
      { name: 'Rajouri Garden', code: 'AREA_RAJOURI', pincode: '110027', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_WEST' },
      // East
      { name: 'Laxmi Nagar Hub', code: 'AREA_LAXMINAGAR', pincode: '110092', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_EAST' },
      { name: 'Preet Vihar', code: 'AREA_PREETVIHAR', pincode: '110051', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_EAST' },
      { name: 'Mayur Vihar Phase 1', code: 'AREA_MAYURVIHAR', pincode: '110091', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_EAST' },
      // Central
      { name: 'Connaught Place', code: 'AREA_CP', pincode: '110001', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_CENTRAL' },
      { name: 'Karol Bagh', code: 'AREA_KAROLBAGH', pincode: '110005', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_CENTRAL' },
      { name: 'Paharganj', code: 'AREA_PAHARGANJ', pincode: '110055', city: 'Delhi', state: 'Delhi', zoneCode: 'ZONE_CENTRAL' }
    ];

    for (const a of areasData) {
      await Area.create({
        ...a,
        zoneId: zoneMap[a.zoneCode]._id
      });
    }

    // 5. CREATE RATE CARDS
    logger.info('Seeding Rate Cards...');
    const rateCardsData = [
      // B2C Intra Zone
      { name: 'B2C Intra-Zone 0-1kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTRA_ZONE, weightFrom: 0, weightTo: 1, baseRate: 50, incrementalRate: 0 },
      { name: 'B2C Intra-Zone 1-5kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTRA_ZONE, weightFrom: 1, weightTo: 5, baseRate: 80, incrementalRate: 15 },
      { name: 'B2C Intra-Zone 5-20kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTRA_ZONE, weightFrom: 5, weightTo: 20, baseRate: 140, incrementalRate: 12 },

      // B2C Inter Zone
      { name: 'B2C Inter-Zone 0-1kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTER_ZONE, weightFrom: 0, weightTo: 1, baseRate: 90, incrementalRate: 0 },
      { name: 'B2C Inter-Zone 1-5kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTER_ZONE, weightFrom: 1, weightTo: 5, baseRate: 150, incrementalRate: 25 },
      { name: 'B2C Inter-Zone 5-20kg', customerType: CustomerType.B2C, zoneType: ZoneType.INTER_ZONE, weightFrom: 5, weightTo: 20, baseRate: 250, incrementalRate: 20 },

      // B2B Intra Zone
      { name: 'B2B Intra-Zone 0-1kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTRA_ZONE, weightFrom: 0, weightTo: 1, baseRate: 40, incrementalRate: 0 },
      { name: 'B2B Intra-Zone 1-5kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTRA_ZONE, weightFrom: 1, weightTo: 5, baseRate: 65, incrementalRate: 10 },
      { name: 'B2B Intra-Zone 5-20kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTRA_ZONE, weightFrom: 5, weightTo: 20, baseRate: 110, incrementalRate: 8 },

      // B2B Inter Zone
      { name: 'B2B Inter-Zone 0-1kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTER_ZONE, weightFrom: 0, weightTo: 1, baseRate: 75, incrementalRate: 0 },
      { name: 'B2B Inter-Zone 1-5kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTER_ZONE, weightFrom: 1, weightTo: 5, baseRate: 120, incrementalRate: 18 },
      { name: 'B2B Inter-Zone 5-20kg', customerType: CustomerType.B2B, zoneType: ZoneType.INTER_ZONE, weightFrom: 5, weightTo: 20, baseRate: 200, incrementalRate: 15 }
    ];

    for (const rc of rateCardsData) {
      await RateCard.create(rc);
    }

    // 6. CREATE COD CONFIGURATIONS
    logger.info('Seeding COD Configurations...');
    await CODConfiguration.create([
      {
        customerType: CustomerType.B2C,
        surchargeType: CODSurchargeType.FLAT,
        surchargeValue: 30,
        minimumCharge: 30,
        maximumCharge: 150
      },
      {
        customerType: CustomerType.B2B,
        surchargeType: CODSurchargeType.FLAT,
        surchargeValue: 50,
        minimumCharge: 50,
        maximumCharge: 250
      }
    ]);

    // 7. CREATE SAMPLE ORDERS ACROSS DIFFERENT LIFECYCLE STATES
    logger.info('Seeding Historical & Active Orders...');

    // Order 1: Delivered B2C Intra-zone order
    const order1 = await Order.create({
      orderId: 'LM-DEL001',
      customerId: customer1._id,
      createdBy: customer1._id,
      pickupAddress: {
        street: '124 Block C, Rohini Sector 9',
        area: 'Rohini',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110085',
        contactName: 'Aarav Sharma',
        contactPhone: '9811122233',
        coordinates: { lat: 28.7041, lng: 77.1025 }
      },
      dropAddress: {
        street: '88 Pitampura Enclave',
        area: 'Pitampura',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110034',
        contactName: 'Deepika Rao',
        contactPhone: '9899988877',
        coordinates: { lat: 28.6989, lng: 77.1385 }
      },
      pickupZone: 'ZONE_NORTH',
      dropZone: 'ZONE_NORTH',
      orderType: CustomerType.B2C,
      paymentType: PaymentType.PREPAID,
      packageDimensions: { length: 20, breadth: 15, height: 10 },
      actualWeight: 1.5,
      volumetricWeight: 0.6,
      chargeableWeight: 1.5,
      baseCharge: 87.5,
      codSurcharge: 0,
      totalCharge: 87.5,
      currency: 'INR',
      assignedAgentId: agents[0]._id,
      status: OrderStatus.DELIVERED,
      scheduledDeliveryDate: new Date(),
      deliveredAt: new Date()
    });

    await TrackingEvent.create([
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.CREATED, timestamp: new Date(Date.now() - 4 * 3600000), actorRole: 'CUSTOMER', actorName: 'Aarav Sharma', note: 'Order booked' },
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.ASSIGNED, timestamp: new Date(Date.now() - 3.5 * 3600000), actorRole: 'SYSTEM', actorName: 'Auto-Assign', note: 'Assigned to Rahul Kumar' },
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.PICKED_UP, timestamp: new Date(Date.now() - 2.5 * 3600000), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'Package collected' },
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.IN_TRANSIT, timestamp: new Date(Date.now() - 2 * 3600000), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'In transit to destination' },
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.OUT_FOR_DELIVERY, timestamp: new Date(Date.now() - 1 * 3600000), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'Out for final delivery' },
      { orderId: 'LM-DEL001', orderDocId: order1._id, status: OrderStatus.DELIVERED, timestamp: new Date(), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'Delivered to Deepika Rao' }
    ]);

    // Order 2: In-Transit Inter-zone COD order
    const order2 = await Order.create({
      orderId: 'LM-TRN002',
      customerId: customer1._id,
      createdBy: customer1._id,
      pickupAddress: {
        street: '124 Block C, Rohini Sector 9',
        area: 'Rohini',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110085',
        contactName: 'Aarav Sharma',
        contactPhone: '9811122233',
        coordinates: { lat: 28.7041, lng: 77.1025 }
      },
      dropAddress: {
        street: '45 Saket Community Centre',
        area: 'Saket',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110017',
        contactName: 'Priya Verma',
        contactPhone: '9822233344',
        coordinates: { lat: 28.5245, lng: 77.2066 }
      },
      pickupZone: 'ZONE_NORTH',
      dropZone: 'ZONE_SOUTH',
      orderType: CustomerType.B2C,
      paymentType: PaymentType.COD,
      packageDimensions: { length: 50, breadth: 40, height: 30 },
      actualWeight: 5,
      volumetricWeight: 12,
      chargeableWeight: 12,
      baseCharge: 390,
      codSurcharge: 30,
      totalCharge: 420,
      currency: 'INR',
      assignedAgentId: agents[0]._id,
      status: OrderStatus.IN_TRANSIT,
      scheduledDeliveryDate: new Date()
    });

    await TrackingEvent.create([
      { orderId: 'LM-TRN002', orderDocId: order2._id, status: OrderStatus.CREATED, timestamp: new Date(Date.now() - 2 * 3600000), actorRole: 'CUSTOMER', actorName: 'Aarav Sharma', note: 'Shipment created' },
      { orderId: 'LM-TRN002', orderDocId: order2._id, status: OrderStatus.ASSIGNED, timestamp: new Date(Date.now() - 1.8 * 3600000), actorRole: 'SYSTEM', actorName: 'Auto-Assign', note: 'Assigned to Rahul Kumar' },
      { orderId: 'LM-TRN002', orderDocId: order2._id, status: OrderStatus.PICKED_UP, timestamp: new Date(Date.now() - 1 * 3600000), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'Picked up from Rohini' },
      { orderId: 'LM-TRN002', orderDocId: order2._id, status: OrderStatus.IN_TRANSIT, timestamp: new Date(Date.now() - 0.5 * 3600000), actorRole: 'AGENT', actorName: 'Rahul Kumar', note: 'Moving towards South Delhi' }
    ]);

    // Order 3: Failed Order awaiting rescheduling
    const order3 = await Order.create({
      orderId: 'LM-FAIL003',
      customerId: customer2._id,
      createdBy: customer2._id,
      pickupAddress: {
        street: '45 Saket Community Centre',
        area: 'Saket',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110017',
        contactName: 'Priya Verma',
        contactPhone: '9822233344',
        coordinates: { lat: 28.5245, lng: 77.2066 }
      },
      dropAddress: {
        street: '12 Connaught Circle',
        area: 'Connaught Place',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        contactName: 'Kunal Malhotra',
        contactPhone: '9877766655',
        coordinates: { lat: 28.6328, lng: 77.2197 }
      },
      pickupZone: 'ZONE_SOUTH',
      dropZone: 'ZONE_CENTRAL',
      orderType: CustomerType.B2B,
      paymentType: PaymentType.PREPAID,
      packageDimensions: { length: 30, breadth: 20, height: 15 },
      actualWeight: 3.2,
      volumetricWeight: 1.8,
      chargeableWeight: 3.2,
      baseCharge: 159.6,
      codSurcharge: 0,
      totalCharge: 159.6,
      currency: 'INR',
      assignedAgentId: agents[1]._id,
      status: OrderStatus.FAILED,
      failureReason: FailureReason.CUSTOMER_UNAVAILABLE,
      failureNote: 'Customer door locked and phone was unreachable after 3 attempts.',
      scheduledDeliveryDate: new Date()
    });

    await TrackingEvent.create([
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.CREATED, timestamp: new Date(Date.now() - 5 * 3600000), actorRole: 'CUSTOMER', actorName: 'Priya Verma' },
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.ASSIGNED, timestamp: new Date(Date.now() - 4.5 * 3600000), actorRole: 'SYSTEM', actorName: 'Auto-Assign' },
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.PICKED_UP, timestamp: new Date(Date.now() - 3.5 * 3600000), actorRole: 'AGENT', actorName: 'Vikram Singh' },
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.IN_TRANSIT, timestamp: new Date(Date.now() - 2.5 * 3600000), actorRole: 'AGENT', actorName: 'Vikram Singh' },
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.OUT_FOR_DELIVERY, timestamp: new Date(Date.now() - 1.5 * 3600000), actorRole: 'AGENT', actorName: 'Vikram Singh' },
      { orderId: 'LM-FAIL003', orderDocId: order3._id, status: OrderStatus.FAILED, timestamp: new Date(Date.now() - 0.5 * 3600000), actorRole: 'AGENT', actorName: 'Vikram Singh', note: 'Failure Reason: Customer unavailable. Customer door locked.' }
    ]);

    logger.info('================================================================');
    logger.info('Database seeded successfully with test dataset!');
    logger.info('DEMO ACCOUNTS:');
    logger.info('  Admin:    admin@example.com       / Admin@12345');
    logger.info('  Customer: customer1@example.com   / Password@123');
    logger.info('  Customer: customer2@example.com   / Password@123');
    logger.info('  Agent:    agent1@example.com      / Password@123');
    logger.info('  Agent:    agent2@example.com      / Password@123');
    logger.info('================================================================');
  } catch (error: any) {
    logger.error(`Database seeding failed: ${error.message}`);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async err => {
      logger.error(err);
      await disconnectDB();
      process.exit(1);
    });
}
