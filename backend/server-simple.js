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
      'GET /api/v1/metrics (placeholder)',
      'GET /api/v1/dashboard/overview',
      'GET /api/v1/gcp/regions',
      'GET /api/v1/gcp/networks',
      'GET /api/v1/gcp/machine-types/:region',
      'POST /api/v1/agents/deploy',
      'GET /api/v1/jobs/:jobId/status'
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

// GCP Resource endpoints for monitoring deployment
app.get('/api/v1/gcp/regions', (req, res) => {
  res.json([
    {
      name: 'us-central1',
      displayName: 'Iowa',
      zones: ['us-central1-a', 'us-central1-b', 'us-central1-c', 'us-central1-f']
    },
    {
      name: 'us-east1',
      displayName: 'South Carolina',
      zones: ['us-east1-a', 'us-east1-b', 'us-east1-c', 'us-east1-d']
    },
    {
      name: 'us-west1',
      displayName: 'Oregon',
      zones: ['us-west1-a', 'us-west1-b', 'us-west1-c']
    },
    {
      name: 'europe-west1',
      displayName: 'Belgium',
      zones: ['europe-west1-b', 'europe-west1-c', 'europe-west1-d']
    },
    {
      name: 'asia-east1',
      displayName: 'Taiwan',
      zones: ['asia-east1-a', 'asia-east1-b', 'asia-east1-c']
    }
  ]);
});

app.get('/api/v1/gcp/networks', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'default',
      displayName: 'Default Network',
      subnets: ['default-us-central1', 'default-us-east1', 'default-europe-west1']
    },
    {
      id: '2',
      name: 'production-vpc',
      displayName: 'Production VPC',
      subnets: ['prod-us-central1', 'prod-us-east1']
    },
    {
      id: '3',
      name: 'development-vpc',
      displayName: 'Development VPC',
      subnets: ['dev-us-west1']
    }
  ]);
});

app.get('/api/v1/gcp/machine-types/:region', (req, res) => {
  const region = req.params.region;
  res.json([
    {
      name: 'e2-micro',
      description: '1 vCPU, 1 GB RAM - Shared CPU',
      vcpus: 1,
      memoryMB: 1024,
      pricePerHour: 0.0056
    },
    {
      name: 'e2-small',
      description: '1 vCPU, 2 GB RAM - Shared CPU',
      vcpus: 1,
      memoryMB: 2048,
      pricePerHour: 0.0112
    },
    {
      name: 'e2-medium',
      description: '1 vCPU, 4 GB RAM - Shared CPU',
      vcpus: 1,
      memoryMB: 4096,
      pricePerHour: 0.0224
    },
    {
      name: 'e2-standard-2',
      description: '2 vCPUs, 8 GB RAM',
      vcpus: 2,
      memoryMB: 8192,
      pricePerHour: 0.0448
    },
    {
      name: 'e2-standard-4',
      description: '4 vCPUs, 16 GB RAM',
      vcpus: 4,
      memoryMB: 16384,
      pricePerHour: 0.0896
    }
  ]);
});

// Additional endpoints for the monitoring deployment service
app.get('/api/v1/gcp/regions/:region/zones', (req, res) => {
  const region = req.params.region;
  const regionZones = {
    'us-central1': ['us-central1-a', 'us-central1-b', 'us-central1-c', 'us-central1-f'],
    'us-east1': ['us-east1-a', 'us-east1-b', 'us-east1-c', 'us-east1-d'],
    'us-west1': ['us-west1-a', 'us-west1-b', 'us-west1-c'],
    'europe-west1': ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'],
    'asia-east1': ['asia-east1-a', 'asia-east1-b', 'asia-east1-c']
  };
  res.json(regionZones[region] || []);
});

app.get('/api/v1/gcp/regions/:region/machine-types', (req, res) => {
  // Same as the machine-types endpoint above, just with different URL structure
  const region = req.params.region;
  res.json([
    {
      name: 'e2-micro',
      displayName: 'e2-micro (1 vCPU, 1 GB)',
      cpus: 1,
      memory: 1024,
      cost: '$0.0056/hour'
    },
    {
      name: 'e2-small',
      displayName: 'e2-small (1 vCPU, 2 GB)',
      cpus: 1,
      memory: 2048,
      cost: '$0.0112/hour'
    },
    {
      name: 'e2-medium',
      displayName: 'e2-medium (1 vCPU, 4 GB)',
      cpus: 1,
      memory: 4096,
      cost: '$0.0224/hour'
    },
    {
      name: 'e2-standard-2',
      displayName: 'e2-standard-2 (2 vCPUs, 8 GB)',
      cpus: 2,
      memory: 8192,
      cost: '$0.0448/hour'
    },
    {
      name: 'e2-standard-4',
      displayName: 'e2-standard-4 (4 vCPUs, 16 GB)',
      cpus: 4,
      memory: 16384,
      cost: '$0.0896/hour'
    }
  ]);
});

app.get('/api/v1/gcp/networks/:network/subnets', (req, res) => {
  const network = req.params.network;
  const networkSubnets = {
    'default': [
      { name: 'default-us-central1', region: 'us-central1', cidr: '10.128.0.0/20' },
      { name: 'default-us-east1', region: 'us-east1', cidr: '10.142.0.0/20' },
      { name: 'default-europe-west1', region: 'europe-west1', cidr: '10.132.0.0/20' }
    ],
    'production-vpc': [
      { name: 'prod-us-central1', region: 'us-central1', cidr: '10.0.1.0/24' },
      { name: 'prod-us-east1', region: 'us-east1', cidr: '10.0.2.0/24' }
    ],
    'development-vpc': [
      { name: 'dev-us-west1', region: 'us-west1', cidr: '10.1.0.0/16' }
    ]
  };
  res.json(networkSubnets[network] || []);
});

// Deployment endpoints
app.post('/api/v1/agents/deploy', (req, res) => {
  const deploymentConfig = req.body;
  res.json({
    jobId: `deploy-${Date.now()}`,
    status: 'started',
    message: 'Deployment initiated successfully',
    config: deploymentConfig
  });
});

app.get('/api/v1/jobs/:jobId/status', (req, res) => {
  const jobId = req.params.jobId;
  res.json({
    jobId,
    status: 'completed',
    progress: 100,
    steps: [
      { name: 'Validating configuration', status: 'completed' },
      { name: 'Creating GCP resources', status: 'completed' },
      { name: 'Deploying monitoring agent', status: 'completed' },
      { name: 'Verifying deployment', status: 'completed' }
    ],
    result: {
      agentId: `agent-${Date.now()}`,
      endpoint: 'https://monitoring-agent.example.com',
      status: 'active'
    }
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