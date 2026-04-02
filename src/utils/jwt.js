'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'change_me_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'change_me_refresh';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN      || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Returns the Date when the refresh token expires (used to persist it in DB).
 */
function refreshTokenExpiresAt() {
  const ms = parseDuration(REFRESH_EXP);
  return new Date(Date.now() + ms);
}

// Simple duration parser for "7d", "1h", "15m" etc.
function parseDuration(str) {
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${str}`);
  return parseInt(match[1], 10) * map[match[2]];
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, refreshTokenExpiresAt };
