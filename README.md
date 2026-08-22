# 🚚 Production-Ready Last-Mile Delivery Tracker Platform

A full-stack, enterprise-grade Last-Mile Delivery Management & Live Tracking SaaS platform engineered from the ground up with TypeScript, Next.js 14, Express.js, MongoDB, and Socket.IO.

---

## 🌟 Key Highlights & Features

1. **Intelligent Volumetric Pricing Engine**:
   - Computes Volumetric Weight: $\frac{\text{Length} \times \text{Breadth} \times \text{Height}}{5000}$ (cm to kg).
   - Evaluates Chargeable Weight: $\max(\text{Actual Weight}, \text{Volumetric Weight})$.
   - Matches active multi-slab rate cards across B2B/B2C tiers and Intra-zone/Inter-zone routes.
   - Calculates dynamic Cash on Delivery (COD) surcharges (Flat or Percentage with configurable caps).
   - Generates live quote previews with complete mathematical breakdowns before order confirmation.

2. **Automated Geo-Aware Agent Auto-Assignment**:
   - Evaluates real-time proximity using the **Haversine formula** between agent GPS coordinates and pickup locations.
   - Filters candidate delivery agents by status (`AVAILABLE`), active capacity, and zone proximity.
   - Utilizes atomic MongoDB updates (`findOneAndUpdate`) to prevent concurrent assignment race conditions.
   - Provides explainable assignment decision logs.

3. **Controlled State Machine & Immutable Tracking**:
   - Enforces strict status transitions: `CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED | FAILED`.
   - Append-only event history: tracking events are strictly immutable and never overwritten.
   - Real-time updates delivered to client browsers via Socket.IO with HTTP polling fallback.

4. **Complete Failed Delivery & Rescheduling Flow**:
   - Mandatory failure reasons (`Customer unavailable`, `Incorrect address`, `Customer refused`, `Premises inaccessible`, `Other`) with agent notes.
   - Instant customer notification & interactive rescheduling modal.
   - Automated re-assignment upon new delivery date selection.

5. **Multi-Role Role-Based Access Control (RBAC)**:
   - **Customer Portal**: Booking wizard with live pricing calculator, order history, and real-time shipment timeline.
   - **Delivery Agent Portal**: Availability status toggles (`AVAILABLE`, `BUSY`, `OFFLINE`), live GPS broadcaster, and delivery status progression actions.
   - **Admin Operations Hub**: Real-time KPI dashboard, auto & manual dispatch controls, audited status override modal, zone & area builders, rate card manager, and interactive **Pricing Engine Sandbox**.

---

## 🏗️ Architecture & Tech Stack

```
Frontend (Next.js 14 / TypeScript / Tailwind CSS / Lucide)
   │
   ├─► REST API (Express.js / Node.js 22 / TypeScript / Zod / Helmet)
   ├─► Real-Time WebSockets (Socket.IO Rooms)
   └─► Database (MongoDB 7.0 / Mongoose ODM with Compound Indexes)
```

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons, Axios, Socket.IO Client.
- **Backend**: Node.js v22, Express.js, TypeScript, Mongoose ODM, Zod Schema Validation, bcryptjs, jsonwebtoken, Winston, Morgan, Express Rate Limit, Helmet, CORS.
- **Testing**: Jest, Supertest, ts-jest.
- **DevOps**: Docker, Docker Compose.

---

## 🔑 Demo & Evaluator Credentials

The database seed script initializes ready-to-test accounts across all roles:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Admin@12345` | Operations Lead / Full access |
| **Customer 1** | `customer1@example.com` | `Password@123` | Aarav Sharma (Retail Customer) |
| **Customer 2** | `customer2@example.com` | `Password@123` | Priya Verma (Apex Enterprise B2B) |
| **Delivery Agent 1** | `agent1@example.com` | `Password@123` | Rahul Kumar (`EMP0001` - Zone North) |
| **Delivery Agent 2** | `agent2@example.com` | `Password@123` | Vikram Singh (`EMP0002` - Zone South) |
| **Delivery Agent 3** | `agent3@example.com` | `Password@123` | Deepak Yadav (`EMP0003` - Zone West) |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 20+ installed
- MongoDB instance running locally on `mongodb://localhost:27017` or MongoDB Atlas URI

### 1. Clone & Configure Environment
```bash
git clone <repo-url>
cd unthinkable

# Setup Backend Environment
cp backend/.env.example backend/.env

# Setup Frontend Environment
cp frontend/.env.local frontend/.env.local
```

### 2. Install Dependencies & Seed Database
```bash
# Backend Setup
cd backend
npm install
npm run seed     # Populates admin, customers, agents, zones, rate cards, and test orders

# Frontend Setup
cd ../frontend
npm install
```

### 3. Run Development Servers
```bash
# Terminal 1: Start Backend API (runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Start Frontend Next.js App (runs on http://localhost:3000)
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser. Use the 1-click Quick Login cards on the landing page to explore all portals.

---

## 🐳 Docker Deployment

To launch the full stack (MongoDB, Express API, Next.js Frontend) in containers:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

---

## 🧪 Automated Testing Suite

To run the unit and integration tests:
```bash
cd backend
npm test
```

### Test Coverage includes:
- **Pricing Engine**: Volumetric calculation, actual vs volumetric comparisons, slab boundaries, intra-zone vs inter-zone rules, flat vs percentage COD surcharges, and invalid dimension handling.
- **State Machine**: Enforces all valid lifecycle progressions and asserts rejection of illegal transitions and unauthorized cancellations.
- **Geo & Haversine Utilities**: Distance accuracy and GPS location staleness checks.

---

## 📖 API Documentation & Endpoints

See [API.md](file:///c:/Users/pulki/Desktop/pulkit_projects/unthinkable/API.md) for full request/response schemas.

- **Health Check**: `GET /api/health`
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Orders & Pricing**: `POST /api/orders/quote`, `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `GET /api/orders/:id/tracking`, `POST /api/orders/:id/reschedule`, `POST /api/orders/:id/cancel`
- **Agent Actions**: `GET /api/agent/orders`, `PATCH /api/agent/availability`, `PATCH /api/agent/location`, `PATCH /api/agent/orders/:id/status`
- **Admin Management**: `GET /api/admin/dashboard-stats`, `GET / POST / PATCH /api/admin/zones`, `GET / POST /api/admin/areas`, `GET / POST / PATCH /api/admin/rates`, `POST /api/admin/orders/:id/assign`, `POST /api/admin/orders/:id/auto-assign`, `PATCH /api/admin/orders/:id/status`, `GET /api/admin/audit-logs`

---

## 💡 System Design

See [SYSTEM_DESIGN.md](file:///c:/Users/pulki/Desktop/pulkit_projects/unthinkable/SYSTEM_DESIGN.md) for the 800-word architectural and mathematical summary.
