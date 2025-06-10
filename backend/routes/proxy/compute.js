/**
 * Google Cloud Compute API Proxy
 * Maintains compatibility with existing frontend compute calls
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const router = express.Router();

// Proxy to Google Cloud Compute API
router.use('/', createProxyMiddleware({
  target: 'https://compute.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/compute': ''
  },
  headers: {
    'host': 'compute.googleapis.com'
  },
  onError: (err, req, res) => {
    console.error('Compute proxy error:', err);
    res.status(500).json({
      error: 'Failed to proxy to Google Cloud Compute API'
    });
  }
}));

module.exports = router; 