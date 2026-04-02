'use strict';

const bcrypt  = require('bcryptjs');
const prisma  = require('../prisma/client');

const SALT_ROUNDS = 10;

/**
 * List all users (ADMIN only).
 * Supports pagination.
 */
async function listUsers({ page = 1, limit = 20 } = {}) {
  const skip  = (page - 1) * limit;
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take:    limit,
      select:  { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single user by ID.
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.isOperational = true;
    throw err;
  }

  return user;
}

/**
 * Update name, role, or status (ADMIN only).
 */
async function updateUser(id, data) {
  await getUserById(id); // throws 404 if missing

  return prisma.user.update({
    where:  { id },
    data,
    select: { id: true, name: true, email: true, role: true, status: true, updatedAt: true },
  });
}

/**
 * Deactivate a user (soft delete via status).
 * ADMIN cannot deactivate themselves.
 */
async function deactivateUser(id, requesterId) {
  if (id === requesterId) {
    const err = new Error('You cannot deactivate your own account');
    err.statusCode = 400;
    err.isOperational = true;
    throw err;
  }

  await getUserById(id);

  return prisma.user.update({
    where: { id },
    data:  { status: 'INACTIVE' },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}

/**
 * Hard delete a user (ADMIN only).
 * Cannot delete yourself.
 */
async function deleteUser(id, requesterId) {
  if (id === requesterId) {
    const err = new Error('You cannot delete your own account');
    err.statusCode = 400;
    err.isOperational = true;
    throw err;
  }
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
}

module.exports = { listUsers, getUserById, updateUser, deactivateUser, deleteUser };
