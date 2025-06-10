/**
 * WebSocket Handler for Monitoring Agents
 * Handles agent registration, metric ingestion, and real-time communication
 */

const WebSocket = require('ws');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const { AgentRegistry } = require('./agentRegistry');
const { MetricProcessor } = require('./metricProcessor');
const { validateMessage } = require('./validation');

// Rate limiting for WebSocket connections
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (ws, req) => req.socket.remoteAddress,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

class WebSocketHandler {
  constructor(server, logger) {
    this.server = server;
    this.logger = logger;
    this.agentRegistry = new AgentRegistry(logger);
    this.metricProcessor = new MetricProcessor(logger);
    this.wss = null;
    
    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  setupWebSocketServer() {
    this.wss = new WebSocket.Server({
      server: this.server,
      path: '/api/v1/agents/connect',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    this.logger.info('WebSocket server setup complete');
  }

  async verifyClient(info) {
    try {
      // Rate limiting check
      await rateLimiter.consume(info.req.socket.remoteAddress);

      // Parse query parameters
      const query = url.parse(info.req.url, true).query;
      
      // Basic validation
      if (!query.agent_id) {
        this.logger.warn('Connection rejected: missing agent_id', {
          ip: info.req.socket.remoteAddress
        });
        return false;
      }

      // TODO: Add authentication token validation here
      // if (!this.validateAuthToken(query.token)) {
      //   return false;
      // }

      return true;
    } catch (error) {
      this.logger.warn('Connection rejected due to rate limit:', {
        ip: info.req.socket.remoteAddress,
        error: error.message
      });
      return false;
    }
  }

  handleConnection(ws, req) {
    const query = url.parse(req.url, true).query;
    const agentId = query.agent_id;
    const remoteIP = req.socket.remoteAddress;

    // Set up WebSocket properties
    ws.agentId = agentId;
    ws.isAlive = true;
    ws.connectedAt = new Date();
    ws.lastPing = new Date();
    ws.messageCount = 0;

    this.logger.info('Agent connected', {
      agentId,
      remoteIP,
      provider: query.provider,
      region: query.region
    });

    // Register agent
    this.agentRegistry.registerAgent(agentId, {
      websocket: ws,
      provider: query.provider || 'unknown',
      region: query.region || 'unknown',
      zone: query.zone || 'unknown',
      remoteIP,
      connectedAt: ws.connectedAt
    });

    // Set up message handling
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('pong', () => this.handlePong(ws));
    ws.on('close', (code, reason) => this.handleDisconnection(ws, code, reason));
    ws.on('error', (error) => this.handleError(ws, error));

    // Send welcome message
    this.sendMessage(ws, {
      type: 'welcome',
      data: {
        agentId,
        timestamp: new Date().toISOString(),
        serverInfo: {
          version: '1.0.0',
          features: ['metrics', 'commands', 'config_updates']
        }
      }
    });
  }

  async handleMessage(ws, data) {
    try {
      ws.messageCount++;
      ws.lastActivity = new Date();

      let message;
      try {
        message = JSON.parse(data);
      } catch (error) {
        this.sendError(ws, 'Invalid JSON format');
        return;
      }

      // Validate message structure
      const validation = validateMessage(message);
      if (validation.error) {
        this.sendError(ws, validation.error.details[0].message);
        return;
      }

      // Route message based on type
      switch (message.type) {
        case 'registration':
          await this.handleRegistration(ws, message.data);
          break;

        case 'metrics':
          await this.handleMetrics(ws, message.data);
          break;

        case 'pong':
          this.handlePongMessage(ws, message.data);
          break;

        case 'status':
          await this.handleStatusUpdate(ws, message.data);
          break;

        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }

    } catch (error) {
      this.logger.error('Error handling message:', {
        agentId: ws.agentId,
        error: error.message,
        stack: error.stack
      });
      this.sendError(ws, 'Internal server error');
    }
  }

  async handleRegistration(ws, data) {
    try {
      // Update agent registry with full registration data
      await this.agentRegistry.updateAgent(ws.agentId, {
        location: data.location,
        version: data.version,
        capabilities: data.capabilities || [],
        lastRegistration: new Date()
      });

      this.logger.info('Agent registered successfully', {
        agentId: ws.agentId,
        location: data.location,
        version: data.version
      });

      // Send registration confirmation
      this.sendMessage(ws, {
        type: 'registration_ack',
        data: {
          status: 'success',
          agentId: ws.agentId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Registration failed:', {
        agentId: ws.agentId,
        error: error.message
      });
      this.sendError(ws, 'Registration failed');
    }
  }

  async handleMetrics(ws, data) {
    try {
      // Validate metrics data
      if (!data.metrics || !Array.isArray(data.metrics)) {
        this.sendError(ws, 'Invalid metrics format');
        return;
      }

      // Process metrics
      const result = await this.metricProcessor.processMetrics({
        agentId: ws.agentId,
        timestamp: data.timestamp,
        location: data.location,
        metrics: data.metrics
      });

      // Update agent stats
      await this.agentRegistry.updateAgentStats(ws.agentId, {
        lastMetricTime: new Date(),
        metricsReceived: data.metrics.length
      });

      this.logger.debug('Metrics processed', {
        agentId: ws.agentId,
        metricsCount: data.metrics.length,
        processed: result.processed,
        errors: result.errors
      });

      // Send acknowledgment
      this.sendMessage(ws, {
        type: 'metrics_ack',
        data: {
          processed: result.processed,
          errors: result.errors,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Error processing metrics:', {
        agentId: ws.agentId,
        error: error.message
      });
      this.sendError(ws, 'Failed to process metrics');
    }
  }

  handlePong(ws) {
    ws.isAlive = true;
    ws.lastPing = new Date();
  }

  handlePongMessage(ws, data) {
    ws.isAlive = true;
    ws.lastPing = new Date();
    
    this.logger.debug('Received pong from agent', {
      agentId: ws.agentId,
      timestamp: data?.timestamp
    });
  }

  async handleStatusUpdate(ws, data) {
    try {
      await this.agentRegistry.updateAgent(ws.agentId, {
        status: data.status,
        lastStatusUpdate: new Date()
      });

      this.logger.debug('Agent status updated', {
        agentId: ws.agentId,
        status: data.status
      });

    } catch (error) {
      this.logger.error('Error updating agent status:', {
        agentId: ws.agentId,
        error: error.message
      });
    }
  }

  handleDisconnection(ws, code, reason) {
    this.logger.info('Agent disconnected', {
      agentId: ws.agentId,
      code,
      reason: reason.toString(),
      duration: Date.now() - ws.connectedAt.getTime(),
      messageCount: ws.messageCount
    });

    // Unregister agent
    this.agentRegistry.unregisterAgent(ws.agentId);
  }

  handleError(ws, error) {
    this.logger.error('WebSocket error:', {
      agentId: ws.agentId,
      error: error.message,
      code: error.code
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Error sending message:', {
          agentId: ws.agentId,
          error: error.message
        });
      }
    }
  }

  sendError(ws, message) {
    this.sendMessage(ws, {
      type: 'error',
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.logger.info('Terminating unresponsive agent', {
            agentId: ws.agentId
          });
          return ws.terminate();
        }

        ws.isAlive = false;
        
        // Send ping
        if (ws.readyState === WebSocket.OPEN) {
          this.sendMessage(ws, {
            type: 'ping',
            data: {
              timestamp: new Date().toISOString()
            }
          });
        }
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Public methods for external use
  getConnectedAgents() {
    return this.agentRegistry.getAgents();
  }

  sendCommandToAgent(agentId, command) {
    const agent = this.agentRegistry.getAgent(agentId);
    if (agent && agent.websocket) {
      this.sendMessage(agent.websocket, {
        type: 'command',
        data: command
      });
      return true;
    }
    return false;
  }

  broadcastMessage(message) {
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      }
    });
  }
}

function initializeWebSocket(server, logger) {
  return new WebSocketHandler(server, logger);
}

module.exports = {
  initializeWebSocket,
  WebSocketHandler
}; 