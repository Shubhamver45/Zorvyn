'use strict';

const userService = require('../services/user.service');
const R           = require('../utils/response');

async function listUsers(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await userService.listUsers({
      page:  parseInt(page)  || 1,
      limit: parseInt(limit) || 20,
    });
    return R.success(res, result.users, 'Users retrieved', 200, result.meta);
  } catch (err) { next(err); }
}

async function getUser(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return R.success(res, user);
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return R.success(res, user, 'User updated');
  } catch (err) { next(err); }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await userService.deactivateUser(req.params.id, req.user.id);
    return R.success(res, user, 'User deactivated');
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id, req.user.id);
    return R.noContent(res);
  } catch (err) { next(err); }
}

module.exports = { listUsers, getUser, updateUser, deactivateUser, deleteUser };
