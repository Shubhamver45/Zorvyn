# Zorvyn — Finance Data Processing & Access Control Backend

A production-quality REST API backend for a multi-role finance dashboard system, built with **Node.js**, **Express**, **Prisma ORM**, and **SQLite**.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 18+ | Fast async I/O, wide ecosystem |
| Framework | Express 4 | Minimal, flexible, well-documented |
| ORM | Prisma 5 | Type-safe queries, easy migrations |
| Database | SQLite | Zero-config, portable, great for demo/dev |
| Auth | JWT (access + refresh tokens) | Stateless, scalable |
| Validation | Zod | Schema-first, excellent error messages |
| Security | Helmet, CORS, express-rate-limit | Standard hardening |
| Testing | Jest + Supertest | Integration tests against real DB |

---

## Project Structure

```
zorvyn/
├── prisma/
│   └── schema.prisma         # Data models
├── src/
│   ├── app.js                # Express app factory
│   ├── server.js             # HTTP server entry point
│   ├── constants/index.js    # Roles, statuses, type enums, hierarchy helper
│   ├── controllers/          # Thin request/response handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── record.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT authentication
│   │   ├── rbac.middleware.js        # Role-based authorization
│   │   ├── validate.middleware.js    # Zod schema validation
│   │   ├── error.middleware.js       # Global error handler + 404
│   │   └── rateLimiter.middleware.js # IP-based rate limiting
│   ├── prisma/
│   │   ├── client.js         # Singleton Prisma instance
│   │   └── seed.js           # Initial data seed
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── record.routes.js
│   │   └── dashboard.routes.js
│   ├── services/             # All business logic lives here
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── record.service.js
│   │   └── dashboard.service.js
│   ├── utils/
│   │   ├── jwt.js            # Token sign/verify helpers
│   │   └── response.js       # Standardised response helpers
│   └── validators/index.js   # Zod schemas for all request bodies
└── tests/
    ├── auth.test.js
    ├── records.test.js
    └── dashboard.test.js
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
# .env is already provided for development. Review it:
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=...
```

### 3. Run database migration

```bash
npm run db:migrate
```

### 4. Seed the database

```bash
npm run db:seed
```

### 5. Start the server

```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server starts at **http://localhost:3000**

---

## Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@zorvyn.dev | Admin@1234 |
| Analyst | analyst@zorvyn.dev | Analyst@1234 |
| Viewer | viewer@zorvyn.dev | Viewer@1234 |

---

## API Reference

All responses follow this envelope:

```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

---

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user (always VIEWER) |
| POST | `/api/auth/login` | Public | Login, get access + refresh tokens |
| POST | `/api/auth/refresh` | Public | Refresh the access token |
| POST | `/api/auth/logout` | Public | Revoke refresh token |
| GET | `/api/auth/me` | Required | Get current user profile |

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Secure@123"
}
```

Password rules: ≥ 8 chars, at least 1 uppercase, at least 1 digit.

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@zorvyn.dev",
  "password": "Admin@1234"
}
```

Response includes `accessToken` (15 min) and `refreshToken` (7 days).

#### Using the Access Token

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

---

### User Endpoints (ADMIN only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List all users (paginated) |
| GET | `/api/users/:id` | Get a user by ID |
| PATCH | `/api/users/:id` | Update name / role / status |
| PATCH | `/api/users/:id/deactivate` | Deactivate (soft disable) user |
| DELETE | `/api/users/:id` | Hard delete a user |

#### Update User

```http
PATCH /api/users/:id
Authorization: Bearer <adminToken>

{
  "role": "ANALYST",
  "status": "ACTIVE"
}
```

Valid roles: `VIEWER`, `ANALYST`, `ADMIN`  
Valid statuses: `ACTIVE`, `INACTIVE`

---

### Financial Records Endpoints

| Method | Path | Min Role | Description |
|---|---|---|---|
| POST | `/api/records` | ANALYST | Create a record |
| GET | `/api/records` | VIEWER | List records (filtered, paginated) |
| GET | `/api/records/:id` | VIEWER | Get a single record |
| PATCH | `/api/records/:id` | ANALYST | Update own record (ADMIN: any) |
| DELETE | `/api/records/:id` | ANALYST | Soft-delete own record (ADMIN: any) |

#### Create Record

```http
POST /api/records
Authorization: Bearer <analystOrAdminToken>
Content-Type: application/json

{
  "amount": 5000,
  "type": "INCOME",
  "category": "Salary",
  "date": "2026-03-01",
  "description": "Monthly salary",
  "tags": ["monthly", "primary"]
}
```

Valid types: `INCOME`, `EXPENSE`

#### List Records — Query Parameters

| Param | Type | Description |
|---|---|---|
| `type` | `INCOME\|EXPENSE` | Filter by type |
| `category` | string | Filter by category (case-insensitive) |
| `startDate` | ISO date | Filter records from this date |
| `endDate` | ISO date | Filter records up to this date |
| `search` | string | Full-text search in description |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sortBy` | `date\|amount\|createdAt` | Sort field (default: `date`) |
| `sortOrder` | `asc\|desc` | Sort direction (default: `desc`) |

Example:

```http
GET /api/records?type=EXPENSE&category=Groceries&startDate=2026-01-01&limit=10
```

---

### Dashboard / Analytics Endpoints

All require at least `VIEWER` role.

| Method | Path | Query Params | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | `period` | Total income, expenses, net balance |
| GET | `/api/dashboard/categories` | `period` | Per-category income/expense breakdown |
| GET | `/api/dashboard/trends/monthly` | `months` (default 12) | Monthly aggregated trends |
| GET | `/api/dashboard/trends/weekly` | `weeks` (default 8) | Weekly aggregated trends |
| GET | `/api/dashboard/recent` | `limit` (default 10) | Most recent financial activity |

**Period values:** `week`, `month` (default), `quarter`, `year`

#### Summary Response Example

```json
{
  "success": true,
  "message": "Dashboard summary",
  "data": {
    "period": "month",
    "dateRange": { "from": "2026-03-02", "to": "2026-04-02" },
    "totalIncome": 112000,
    "totalExpenses": 18100,
    "netBalance": 93900,
    "recordCount": 12
  }
}
```

---

## Role & Access Control Matrix

| Action | VIEWER | ANALYST | ADMIN |
|---|:---:|:---:|:---:|
| View dashboard & summaries | ✅ | ✅ | ✅ |
| List / view records | ✅ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update own records | ❌ | ✅ | ✅ |
| Update any record | ❌ | ❌ | ✅ |
| Delete own records | ❌ | ✅ | ✅ |
| Delete any record | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## Running Tests

```bash
npm test
```

Tests use the same SQLite database and isolate test data via unique email domains.  
Test suites: `auth.test.js`, `records.test.js`, `dashboard.test.js`

---

## Design Decisions & Assumptions

### Authentication
- **Access tokens** expire in 15 minutes (configurable). Short-lived to limit exposure.
- **Refresh tokens** expire in 7 days and are persisted in the DB for revocation.
- Logout deletes the refresh token from the DB, invalidating future refresh calls.

### Roles
- Public registration always creates a `VIEWER`. An Admin must explicitly upgrade roles via `PATCH /api/users/:id`.
- `hasMinRole()` uses a linear hierarchy: `VIEWER < ANALYST < ADMIN`, making permission checks simple and predictable.

### Financial Records
- **Soft delete** (`isDeleted = true`) is used instead of hard deletes, preserving data integrity and audit trails.
- `tags` are stored as a JSON string in SQLite (which lacks native array types) and serialised/deserialised transparently by the service layer.
- Ownership checks for update/delete are done in the service layer (not just routing), so the business rule is centralised and testable.

### Dashboard
- All analytics are computed in-process from Prisma query results rather than complex raw SQL, keeping the logic readable and portable.
- The `period` parameter supports `week`, `month`, `quarter`, `year`. Unknown values default to `month`.

### Database
- SQLite was chosen for zero-config portability. Switching to PostgreSQL only requires changing `DATABASE_URL` in `.env` and the `provider` in `prisma/schema.prisma`.

### Error Handling
- A global `errorHandler` middleware catches all errors, translating Prisma-specific error codes (P2002, P2025) into meaningful HTTP responses.
- All operational errors are thrown with `err.isOperational = true`, separating expected domain errors from unexpected bugs.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | 3000 | HTTP server port |
| `NODE_ENV` | No | development | Controls logging verbosity |
| `DATABASE_URL` | Yes | file:./dev.db | Prisma database connection URL |
| `JWT_SECRET` | Yes | — | Secret for access token signing |
| `JWT_EXPIRES_IN` | No | 15m | Access token lifetime |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for refresh token signing |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token lifetime |
