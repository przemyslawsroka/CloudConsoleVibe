#!/usr/bin/env node

/**
 * CloudConsoleVibe Backend Server
 * Main entry point with Express API and WebSocket monitoring support
 */

require('dotenv').config();

const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const winston = require('winston');

// Import route modules
const agentRoutes = require('./routes/agents');
const metricsRoutes = require('./routes/metrics');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');

// Import WebSocket handler
const { initializeWebSocket } = require('./websocket/handler');

// Import database
const { initializeDatabase } = require('./database/init');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloudconsolevibe-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create Express app
const app = express();
const server = http.createServer(app);

// Enable WebSocket support
const wsInstance = expressWs(app, server);

// Configure middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));

app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// Proxy routes for Google Cloud APIs (maintain compatibility)
// Enable proxies when BACKEND_ENABLE_PROXIES=true to avoid local CORS issues
if (process.env.BACKEND_ENABLE_PROXIES === 'true') {
  app.use('/api/logging', require('./routes/proxy/logging'));
  app.use('/api/compute', require('./routes/proxy/compute'));
  app.use('/api/cloudrun', require('./routes/proxy/cloudrun'));
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.originalUrl
    }
  });
});

// Initialize database and WebSocket
async function startServer() {
  try {
    // Initialize database (skip for now to test deployment)
    try {
      await initializeDatabase();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.warn('Database initialization failed, continuing without database:', error.message);
    }

    // Initialize WebSocket server (skip for now)
    try {
      const wss = initializeWebSocket(server, logger);
      logger.info('WebSocket server initialized');
    } catch (error) {
      logger.warn('WebSocket initialization failed, continuing without WebSocket:', error.message);
    }

    // Start HTTP server
    const PORT = process.env.PORT || 8080;
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      logger.info(`🚀 CloudConsoleVibe Backend Server started`);
      logger.info(`📡 HTTP Server: http://${HOST}:${PORT}`);
      logger.info(`🔌 WebSocket Server: ws://${HOST}:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Monitoring agents can connect to: ws://${HOST}:${PORT}/api/v1/agents/connect`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections, cleanup resources
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer(); 