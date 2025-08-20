/**
 * Google Cloud Run Admin API Proxy
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const router = express.Router();

// Proxy to Google Cloud Run Admin API
router.use('/', createProxyMiddleware({
  target: 'https://run.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/cloudrun': ''
  },
  headers: {
    host: 'run.googleapis.com'
  },
  onError: (err, req, res) => {
    console.error('Cloud Run proxy error:', err);
    res.status(500).json({ error: 'Failed to proxy to Google Cloud Run API' });
  }
}));

module.exports = router;



