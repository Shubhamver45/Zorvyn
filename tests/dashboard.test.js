'use strict';

/**
 * Dashboard Analytics Integration Tests
 */

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/app');
const prisma  = require('../src/prisma/client');

let viewerToken;

beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'viewer@dash.zorvyn' } });

  const hash = await bcrypt.hash('Test@1234', 10);
  await prisma.user.create({
    data: { name: 'Dash Viewer', email: 'viewer@dash.zorvyn', password: hash, role: 'VIEWER' },
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'viewer@dash.zorvyn', password: 'Test@1234' });

  viewerToken = res.body.data.accessToken;
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'viewer@dash.zorvyn' } });
  await prisma.$disconnect();
});

describe('GET /api/dashboard/summary', () => {
  it('should return summary with required fields', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('totalIncome');
    expect(d).toHaveProperty('totalExpenses');
    expect(d).toHaveProperty('netBalance');
    expect(d).toHaveProperty('recordCount');
  });

  it('should accept period query param', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary?period=week')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.period).toBe('week');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/categories', () => {
  it('should return category breakdown array', async () => {
    const res = await request(app)
      .get('/api/dashboard/categories')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/dashboard/trends/monthly', () => {
  it('should return monthly trend array', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends/monthly?months=6')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/dashboard/recent', () => {
  it('should return recent activity list', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
