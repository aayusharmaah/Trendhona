const express = require('express');
const path = require('path');
const config = require('./config');
const applyMiddleware = require('./middleware');
const routes = require('./routes');

const app = express();

applyMiddleware(app);

// Serve the frontend as static files.
// no-cache forces the browser to revalidate JS/CSS/HTML on every load (a cheap
// conditional GET → 304 when unchanged), so a redeploy is picked up immediately
// instead of the browser reusing a stale cached ES module. Hashed asset files
// (images) can still be cached long-term.
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// API routes under /api
app.use('/api', routes);

// SPA fallback — all non-API requests serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(config.port, () => {
  console.log(`Trendhona running at http://localhost:${config.port}`);
});
