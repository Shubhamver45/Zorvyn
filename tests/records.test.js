'use strict';

/**
 * Financial Records Integration Tests
 * Tests CRUD operations and access control for different roles.
 */

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/app');
const prisma  = require('../src/prisma/client');

let adminToken, analystToken, viewerToken;
let createdRecordId;

// ── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Clean up
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: '@rec.zorvyn' } } });

  // Create users directly in DB to avoid role restriction on public register
  const hash = await bcrypt.hash('Test@1234', 10);
  await prisma.user.createMany({
    data: [
      { name: 'Rec Admin',   email: 'admin@rec.zorvyn',   password: hash, role: 'ADMIN'   },
      { name: 'Rec Analyst', email: 'analyst@rec.zorvyn', password: hash, role: 'ANALYST' },
      { name: 'Rec Viewer',  email: 'viewer@rec.zorvyn',  password: hash, role: 'VIEWER'  },
    ],
  });

  // Login all three
  const [a, b, c] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@rec.zorvyn',   password: 'Test@1234' }),
    request(app).post('/api/auth/login').send({ email: 'analyst@rec.zorvyn', password: 'Test@1234' }),
    request(app).post('/api/auth/login').send({ email: 'viewer@rec.zorvyn',  password: 'Test@1234' }),
  ]);

  adminToken   = a.body.data.accessToken;
  analystToken = b.body.data.accessToken;
  viewerToken  = c.body.data.accessToken;
});

afterAll(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: '@rec.zorvyn' } } });
  await prisma.$disconnect();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/records – create record', () => {
  const payload = {
    amount:      5000,
    type:        'INCOME',
    category:    'Salary',
    date:        '2026-03-01T00:00:00.000Z',
    description: 'March Salary',
    tags:        ['monthly', 'primary'],
  };

  it('ANALYST should create a record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(5000);
    expect(res.body.data.tags).toEqual(['monthly', 'primary']);
    createdRecordId = res.body.data.id;
  });

  it('VIEWER should be forbidden from creating records', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(payload);

    expect(res.status).toBe(403);
  });

  it('should reject missing amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ ...payload, amount: undefined });

    expect(res.status).toBe(400);
  });

  it('should reject negative amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ ...payload, amount: -100 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/records – list records', () => {
  it('VIEWER should be able to list records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('should support type filter', async () => {
    const res = await request(app)
      .get('/api/records?type=INCOME')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.type).toBe('INCOME'));
  });

  it('should paginate correctly', async () => {
    const res = await request(app)
      .get('/api/records?page=1&limit=1')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.meta.limit).toBe(1);
  });
});

describe('GET /api/records/:id', () => {
  it('should return a single record', async () => {
    const res = await request(app)
      .get(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdRecordId);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/records/nonexistent-id')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/records/:id', () => {
  it('ANALYST (author) should update own record', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated description');
  });

  it('ADMIN should update any record', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 6000 });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(6000);
  });

  it('VIEWER should be forbidden', async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 999 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/records/:id – soft delete', () => {
  it('ANALYST (author) should soft-delete own record', async () => {
    const res = await request(app)
      .delete(`/api/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(204);
  });

  it('deleted record should no longer appear in list', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);

    const ids = res.body.data.map((r) => r.id);
    expect(ids).not.toContain(createdRecordId);
  });
});
