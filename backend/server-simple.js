#!/usr/bin/env node

/**
 * CloudConsoleVibe Backend Server - Simplified Version
 * Basic Express server with health check for initial deployment
 */

const express = require('express');
const cors = require('cors');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-simple',
    uptime: process.uptime()
  });
});

// Basic info endpoint
app.get('/api/v1/info', (req, res) => {
  res.json({
    service: 'CloudConsoleVibe Backend',
    version: '1.0.0-simple',
    status: 'running',
    endpoints: [
      'GET /health',
      'GET /api/v1/info',
      'GET /api/v1/agents (placeholder)',
      'GET /api/v1/metrics (placeholder)'
    ]
  });
});

// Placeholder endpoints
app.get('/api/v1/agents', (req, res) => {
  res.json({
    agents: [],
    message: 'Agent management will be available in full version'
  });
});

app.get('/api/v1/metrics', (req, res) => {
  res.json({
    metrics: [],
    message: 'Metrics collection will be available in full version'
  });
});

app.get('/api/v1/dashboard/overview', (req, res) => {
  res.json({
    totalAgents: 0,
    activeAgents: 0,
    totalMetrics: 0,
    systemHealth: 'healthy',
    message: 'Dashboard data will be available in full version'
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info(`🚀 CloudConsoleVibe Backend (Simple) started`);
  logger.info(`📡 Server: http://${HOST}:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
}); 