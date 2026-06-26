const express = require('express');
const path = require('path');
const config = require('./config');
const applyMiddleware = require('./middleware');
const routes = require('./routes');

const app = express();

applyMiddleware(app);

// Serve the frontend as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes under /api
app.use('/api', routes);

// SPA fallback — all non-API requests serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(config.port, () => {
  console.log(`Trendhona running at http://localhost:${config.port}`);
});
