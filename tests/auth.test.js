'use strict';

/**
 * Auth Integration Tests
 *
 * Uses supertest against the Express app.
 * Database is hit against the test SQLite DB (DATABASE_URL is overridden in jest setup).
 */

const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/prisma/client');

let accessToken; // set during login test, reused in /me test

beforeAll(async () => {
  // Clean slate for test users
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: '@test.zorvyn' } } });
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: '@test.zorvyn' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('should register a new user with VIEWER role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'user@test.zorvyn', password: 'Test@1234' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('VIEWER');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'user@test.zorvyn', password: 'Test@1234' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.zorvyn', password: 'weak1234' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad', email: 'not-an-email', password: 'Test@1234' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should log in with valid credentials and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.zorvyn', password: 'Test@1234' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Store for /me test below – safe because tests run in declaration order
    accessToken = res.body.data.accessToken;
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.zorvyn', password: 'Wrong@1234' });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.zorvyn', password: 'Test@1234' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return the authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('user@test.zorvyn');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
