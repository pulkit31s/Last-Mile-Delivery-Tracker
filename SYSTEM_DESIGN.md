# System Design — Last-Mile Delivery Tracker

## 1. High-Level Architecture
The platform is architected as an event-driven, decoupled logistics platform featuring:
- **Client Tier**: Next.js 14+ SPA with App Router, TypeScript, and responsive Tailwind CSS. Employs WebSocket (Socket.IO) client for live shipment tracking and polling fallbacks.
- **API Gateway & Core Logic**: Express.js REST API with strict Zod validation, JWT authentication, and centralized error handling.
- **Data Persistence**: MongoDB with Mongoose ODM, enforcing compound indexes, atomic update operations, and append-only audit histories.
- **Real-Time & Notification Layer**: Socket.IO room routing with multi-channel asynchronous notification dispatchers (Email/SMS).

---

## 2. Rate Calculation Engine
Shipping charges are calculated deterministically on the backend:
1. **Volumetric Weight Calculation**:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$
2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
3. **Zone Resolution**: Pincodes map through active Area records to resolved Zone codes (`INTRA_ZONE` if pickup zone equals drop zone; otherwise `INTER_ZONE`).
4. **Rate Card Slab Matching**: Queries active rate cards by customer tier (`B2B`/`B2C`), zone type, and weight slabs (`weightFrom` $\le$ chargeable weight $\le$ `weightTo`).
   $$\text{Base Charge} = \text{Base Rate} + \max(0, \text{Chargeable Weight} - \text{WeightFrom}) \times \text{Incremental Rate}$$
5. **Cash on Delivery (COD) Surcharge**: Prepaid orders incur 0 surcharge. COD orders evaluate flat fees or percentage surcharges bounded by configured minimum and maximum limits.

---

## 3. Intelligent Auto-Assignment Engine
The dispatch algorithm ranks eligible delivery agents based on:
1. **Filter Criteria**: Agent status is `AVAILABLE` and current active orders are below `maxConcurrentOrders`.
2. **Proximity Ranking**:
   - Computes great-circle distance between agent GPS coordinates and pickup coordinates via the **Haversine formula**:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
   - Candidates are ranked by proximity, active workload, and zone match bonus.
   - If GPS coordinates are stale (>15 minutes) or absent, the engine falls back deterministically to pickup zone matching.
3. **Race Condition Prevention**: Employs atomic MongoDB operations (`findOneAndUpdate` with capacity constraints) to eliminate double-assignment races during simultaneous dispatches.
4. **Explainability**: Every assignment records an explainable decision trail (e.g., *“Assigned Agent EMP0001: Same Zone, 1.85 km away, 0 active orders”*).

---

## 4. Controlled State Machine & Immutable Tracking
Orders traverse an enforced lifecycle:
```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED | FAILED
FAILED → RESCHEDULED → ASSIGNED → ...
```
- **Append-Only History**: Every transition creates an immutable `TrackingEvent` recording `orderId`, `status`, `actorRole`, `actorName`, timestamp, and location notes. Historical records are never modified or purged.
- **Admin Overrides**: Administrators can adjust status across lifecycle states, requiring a mandatory recorded justification which generates both a tracking event and a permanent `AuditLog` entry.

---

## 5. Failed Delivery & Rescheduling Workflow
When an agent reports a failed delivery attempt:
1. The agent selects a mandatory categorized reason (`Customer unavailable`, `Incorrect address`, `Customer refused`, `Premises inaccessible`, or `Other`) with optional delivery notes.
2. The order status transitions to `FAILED`, the previous agent's active load is decremented, and the customer is notified via email/SMS.
3. The customer portal displays a prominent rescheduling banner and modal.
4. Upon customer confirmation of a new delivery date, the system transitions status to `RESCHEDULED`, logs the reschedule entry, and automatically dispatches the order to an available agent.

---

## 6. Security, Scalability & Reliability
- **RBAC**: Protected routes with token verification separating Customer, Agent, and Admin roles. Strict ownership checks ensure customers only access their own orders.
- **Resilience**: Asynchronous email and SMS services gracefully fallback to internal logging without interrupting order creation or status transitions.
- **Indexing**: MongoDB compound indexes on `[status, createdAt]`, `[customerId, createdAt]`, `[availabilityStatus, currentZone, activeOrders]`, and `[pincode, status]` ensure constant-time query latency under high read loads.
