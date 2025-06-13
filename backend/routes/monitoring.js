const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const DeploymentService = require('../services/deployment.service');

// Initialize deployment service
const deploymentService = new DeploymentService();

// Store active deployments and WebSocket connections
const activeDeployments = new Map();
const wsConnections = new Map();

// Deploy monitoring agent
router.post('/deploy', async (req, res) => {
  try {
    const deploymentId = uuidv4();
    const config = {
      ...req.body,
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'demo-project',
      deploymentId
    };

    console.log('🚀 Starting agent deployment:', deploymentId);
    
    // Store deployment info
    activeDeployments.set(deploymentId, {
      id: deploymentId,
      status: 'starting',
      config,
      startTime: new Date(),
      steps: []
    });

    // Start deployment asynchronously
    deploymentService.deployAgent(config, deploymentId, (progress) => {
      // Update deployment status
      const deployment = activeDeployments.get(deploymentId);
      if (deployment) {
        deployment.status = progress.status;
        deployment.currentStep = progress.step;
        deployment.steps.push({
          step: progress.step,
          message: progress.message,
          percentage: progress.percentage,
          status: progress.status,
          timestamp: new Date(),
          error: progress.error
        });
        
        // Send progress to WebSocket clients
        const wsConnection = wsConnections.get(deploymentId);
        if (wsConnection && wsConnection.readyState === 1) {
          wsConnection.send(JSON.stringify({
            type: 'deployment-progress',
            deploymentId,
            progress
          }));
        }
      }
    }).then((result) => {
      console.log('✅ Deployment completed:', result);
      
      // Update final status
      const deployment = activeDeployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'completed';
        deployment.result = result;
        deployment.endTime = new Date();
      }
      
    }).catch((error) => {
      console.error('❌ Deployment failed:', error);
      
      // Update error status
      const deployment = activeDeployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'failed';
        deployment.error = error.message;
        deployment.endTime = new Date();
      }
    });

    res.json({
      success: true,
      deploymentId,
      message: 'Deployment started successfully'
    });

  } catch (error) {
    console.error('❌ Failed to start deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get deployment status
router.get('/deploy/:deploymentId', (req, res) => {
  const { deploymentId } = req.params;
  const deployment = activeDeployments.get(deploymentId);
  
  if (!deployment) {
    return res.status(404).json({
      success: false,
      error: 'Deployment not found'
    });
  }
  
  res.json({
    success: true,
    deployment
  });
});

// Get all deployments
router.get('/deployments', (req, res) => {
  const deployments = Array.from(activeDeployments.values());
  res.json({
    success: true,
    deployments
  });
});

// WebSocket endpoint for real-time deployment progress
// Note: WebSocket routes will be handled separately in server.js

// Agent registration endpoint
router.post('/agents/register', (req, res) => {
  const agentData = req.body;
  console.log('🤖 Agent registered:', agentData);
  
  // Store agent information
  // In a real implementation, you'd store this in a database
  
  res.json({
    success: true,
    message: 'Agent registered successfully',
    agentId: agentData.id
  });
});

// Metrics collection endpoint
router.post('/metrics', (req, res) => {
  const metrics = req.body;
  console.log('📊 Metrics received from agent:', metrics.agent_id);
  
  // Process and store metrics
  // In a real implementation, you'd store this in a time-series database
  
  res.json({
    success: true,
    message: 'Metrics received successfully'
  });
});

// Get agent metrics
router.get('/agents/:agentId/metrics', (req, res) => {
  const { agentId } = req.params;
  
  // Return mock metrics for demo
  const mockMetrics = {
    agentId,
    lastUpdate: new Date(),
    status: 'active',
    metrics: {
      pingResults: [
        { target: '8.8.8.8', success: true, latency: 12.5, packetLoss: 0 },
        { target: '1.1.1.1', success: true, latency: 8.3, packetLoss: 0 },
        { target: 'google.com', success: true, latency: 15.2, packetLoss: 0 },
        { target: 'cloudflare.com', success: true, latency: 9.8, packetLoss: 0 }
      ],
      systemInfo: {
        cpuUsage: 15.2,
        memoryUsage: 45.8,
        diskUsage: 23.1,
        uptime: 86400
      }
    }
  };
  
  res.json({
    success: true,
    metrics: mockMetrics
  });
});

// Deployment completion callback (called by VM startup script)
router.post('/deployments/:deploymentId/complete', (req, res) => {
  const { deploymentId } = req.params;
  const { status, message } = req.body;
  
  console.log(`📋 Deployment ${deploymentId} completion callback:`, status, message);
  
  const deployment = activeDeployments.get(deploymentId);
  if (deployment) {
    deployment.vmStatus = status;
    deployment.vmMessage = message;
    deployment.vmCompletedAt = new Date();
    
    // Notify WebSocket clients
    const wsConnection = wsConnections.get(deploymentId);
    if (wsConnection && wsConnection.readyState === 1) {
      wsConnection.send(JSON.stringify({
        type: 'vm-completion',
        deploymentId,
        status,
        message
      }));
    }
  }
  
  res.json({ success: true });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    activeDeployments: activeDeployments.size,
    activeConnections: wsConnections.size
  });
});

module.exports = router; 