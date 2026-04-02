'use strict';

const bcrypt = require('bcryptjs');
const prisma  = require('../prisma/client');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiresAt,
} = require('../utils/jwt');

const SALT_ROUNDS = 10;

/**
 * Register a new user.
 * Only ADMIN users can assign roles other than VIEWER (enforced at the route level).
 */
async function register({ name, email, password, role = 'VIEWER' }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email is already registered');
    err.statusCode = 409;
    err.isOperational = true;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  return user;
}

/**
 * Authenticate a user and return access + refresh tokens.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  if (user.status === 'INACTIVE') {
    const err = new Error('Account is inactive – contact an administrator');
    err.statusCode = 403;
    err.isOperational = true;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Persist refresh token
  await prisma.refreshToken.create({
    data: {
      token:     refreshToken,
      userId:    user.id,
      expiresAt: refreshTokenExpiresAt(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Issue a new access token using a valid, non-expired refresh token.
 */
async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    const err = new Error('Refresh token revoked or expired');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.status === 'INACTIVE') {
    const err = new Error('User account is inactive');
    err.statusCode = 403;
    err.isOperational = true;
    throw err;
  }

  const newPayload   = { id: user.id, email: user.email, role: user.role };
  const accessToken  = signAccessToken(newPayload);

  return { accessToken };
}

/**
 * Revoke a refresh token (logout).
 */
async function logout({ refreshToken }) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

/**
 * Return profile for the currently authenticated user.
 */
async function getProfile(userId) {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
}

module.exports = { register, login, refresh, logout, getProfile };
