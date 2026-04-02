'use strict';

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs:          15 * 60 * 1000, // 15 minutes
  max:               200,             // max requests per window per IP
  standardHeaders:   true,
  legacyHeaders:     false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

module.exports = limiter;
