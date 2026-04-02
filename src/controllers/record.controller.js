'use strict';

const recordService = require('../services/record.service');
const R             = require('../utils/response');

async function createRecord(req, res, next) {
  try {
    const record = await recordService.createRecord(req.body, req.user.id);
    return R.created(res, record, 'Record created');
  } catch (err) { next(err); }
}

async function listRecords(req, res, next) {
  try {
    const result = await recordService.listRecords(req.query);
    return R.success(res, result.records, 'Records retrieved', 200, result.meta);
  } catch (err) { next(err); }
}

async function getRecord(req, res, next) {
  try {
    const record = await recordService.getRecordById(req.params.id);
    return R.success(res, record);
  } catch (err) { next(err); }
}

async function updateRecord(req, res, next) {
  try {
    const record = await recordService.updateRecord(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role,
    );
    return R.success(res, record, 'Record updated');
  } catch (err) { next(err); }
}

async function deleteRecord(req, res, next) {
  try {
    await recordService.deleteRecord(req.params.id, req.user.id, req.user.role);
    return R.noContent(res);
  } catch (err) { next(err); }
}

module.exports = { createRecord, listRecords, getRecord, updateRecord, deleteRecord };
