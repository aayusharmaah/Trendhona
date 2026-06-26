const cors = require('cors');
const helmet = require('helmet');
const express = require('express');

module.exports = function applyMiddleware(app) {
  // Allow loading CDN resources (fonts, Supabase, Chart.js)
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
};
