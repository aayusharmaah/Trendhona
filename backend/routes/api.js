const express = require('express');
const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Future endpoints go here:
// router.use('/creators', require('./creators'));
// router.use('/campaigns', require('./campaigns'));

module.exports = router;
