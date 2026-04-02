'use strict';

const authService = require('../services/auth.service');
const R           = require('../utils/response');

async function register(req, res, next) {
  try {
    // Only admins may set a role other than VIEWER.
    // If caller is not yet authenticated (public registration), default to VIEWER.
    const role = req.user?.role === 'ADMIN' ? req.body.role : 'VIEWER';
    const user  = await authService.register({ ...req.body, role });
    return R.created(res, user, 'User registered successfully');
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return R.success(res, result, 'Login successful');
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    return R.success(res, result, 'Token refreshed');
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.body);
    return R.success(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return R.success(res, user);
  } catch (err) { next(err); }
}

module.exports = { register, login, refresh, logout, getProfile };
