'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDir = path.resolve(__dirname, '../../frontend');

function getPublicRuntimeConfig() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  };
}

function parseCorsOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

app.use(morgan('dev'));
app.use(express.json());

if (allowedOrigins.length > 0) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('CORS blocked for origin: ' + origin));
      },
    })
  );
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'besql-backend',
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/config', (_req, res) => {
  res.json(getPublicRuntimeConfig());
});

app.get('/js/config.js', (_req, res) => {
  const cfg = getPublicRuntimeConfig();
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(
    [
      `window.SUPABASE_URL = ${JSON.stringify(cfg.SUPABASE_URL)};`,
      `window.SUPABASE_ANON_KEY = ${JSON.stringify(cfg.SUPABASE_ANON_KEY)};`,
      '',
    ].join('\n')
  );
});

app.use(express.static(frontendDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/api' || req.path === '/health') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`BeSQL backend listening on http://localhost:${port}`);
});
