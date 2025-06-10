/**
 * Google Cloud Logging API Proxy
 * Maintains compatibility with existing frontend logging calls
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const router = express.Router();

// Proxy to Google Cloud Logging API
router.use('/', createProxyMiddleware({
  target: 'https://logging.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/logging': ''
  },
  headers: {
    'host': 'logging.googleapis.com'
  },
  onError: (err, req, res) => {
    console.error('Logging proxy error:', err);
    res.status(500).json({
      error: 'Failed to proxy to Google Cloud Logging API'
    });
  }
}));

module.exports = router; 