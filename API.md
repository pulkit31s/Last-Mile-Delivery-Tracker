# Last-Mile Delivery Tracker — Complete API Specification

All API endpoints follow standardized JSON envelopes:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "meta": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}
```

---

## 1. Authentication & Users

### `POST /api/auth/register`
Creates a new customer or delivery agent account.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "customer1@example.com",
    "phone": "9811122233",
    "password": "Password@123",
    "role": "CUSTOMER",
    "companyName": "Sharma Traders"
  }
  ```
- **Response**: `201 Created` with JWT `token` and `user` payload.

### `POST /api/auth/login`
Authenticates email and password.
- **Request Body**:
  ```json
  { "email": "customer1@example.com", "password": "Password@123" }
  ```
- **Response**: `200 OK` with JWT `token` and `user` payload.

### `GET /api/auth/me`
- **Auth**: Bearer Token
- **Response**: Returns profile of authenticated user (and Agent fleet profile if applicable).

---

## 2. Pricing & Orders

### `POST /api/orders/quote`
Calculates volumetric weight, chargeable weight, zone type, rate card slab, and COD surcharge.
- **Request Body**:
  ```json
  {
    "pickupPincode": "110085",
    "dropPincode": "110017",
    "customerType": "B2C",
    "paymentType": "COD",
    "dimensions": { "length": 50, "breadth": 40, "height": 30 },
    "actualWeight": 5.0
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "actualWeight": 5,
      "volumetricWeight": 12,
      "chargeableWeight": 12,
      "pickupZone": "ZONE_NORTH",
      "dropZone": "ZONE_SOUTH",
      "zoneType": "INTER_ZONE",
      "customerType": "B2C",
      "paymentType": "COD",
      "baseCharge": 390,
      "codSurcharge": 30,
      "totalCharge": 420,
      "currency": "INR",
      "breakdown": {
        "baseRate": 250,
        "incrementalRate": 20,
        "weightSlab": "5 kg - 20 kg"
      }
    }
  }
  ```

### `POST /api/orders`
Creates a confirmed delivery order, calculates authoritative price, appends initial `CREATED` tracking event, and triggers auto-assignment.
- **Auth**: Customer or Admin

### `GET /api/orders`
Retrieves paginated orders (Customer: their orders; Admin: all orders) with status and search query filtering.

### `GET /api/orders/:id`
Retrieves order details by human-readable Order ID (e.g. `LM-DEL001`) or MongoDB ID with ownership authorization checks.

### `GET /api/orders/:id/tracking`
Retrieves the append-only chronological tracking timeline.

### `POST /api/orders/:id/reschedule`
Customer/Admin rescheduling for a `FAILED` order:
- **Request Body**:
  ```json
  {
    "newDeliveryDate": "2026-08-25T10:00:00.000Z",
    "reason": "Customer was unavailable during first delivery attempt"
  }
  ```
- **Response**: Updates status to `RESCHEDULED`, records `Reschedule` entry, and dispatches re-assignment.

### `POST /api/orders/:id/cancel`
Cancels an order if in `CREATED` or `ASSIGNED` state.

---

## 3. Delivery Agent Actions

### `GET /api/agent/orders`
Retrieves orders assigned to the logged-in agent.

### `PATCH /api/agent/availability`
Updates availability state (`AVAILABLE`, `BUSY`, `OFFLINE`).

### `PATCH /api/agent/location`
Updates agent GPS latitude/longitude and broadcasts via WebSocket.

### `PATCH /api/agent/orders/:id/status`
Advances shipment status through state machine:
- Picked Up (`PICKED_UP`)
- In Transit (`IN_TRANSIT`)
- Out for Delivery (`OUT_FOR_DELIVERY`)
- Delivered (`DELIVERED`)
- Failed (`FAILED` with mandatory `failureReason`)

---

## 4. Admin Management & Operations

### `GET /api/admin/dashboard-stats`
Returns operations KPIs (total orders, active in-flight, delivered today, failed count, fleet breakdown, revenue).

### `GET / POST / PATCH /api/admin/zones`
Zone CRUD operations.

### `GET / POST /api/admin/areas`
Area & pincode-to-zone mappings.

### `GET / POST / PATCH /api/admin/rates`
Rate Card slabs CRUD.

### `POST /api/admin/orders/:id/assign`
Manually assigns a specific agent to an order.

### `POST /api/admin/orders/:id/auto-assign`
Triggers the intelligent auto-assignment algorithm on demand.

### `PATCH /api/admin/orders/:id/status`
Admin status override with mandatory audited reason.

### `GET /api/admin/audit-logs`
Paginated inspection of all administrative actions.

---

## 5. System Health Check

### `GET /api/health`
Returns system status, MongoDB connectivity, and uptime.
