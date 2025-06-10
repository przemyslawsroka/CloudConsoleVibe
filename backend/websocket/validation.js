/**
 * WebSocket Message Validation
 * Joi schemas for validating incoming WebSocket messages
 */

const Joi = require('joi');

// Base message schema
const baseMessageSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object().required(),
  timestamp: Joi.string().isoDate().optional()
});

// Registration message schema
const registrationSchema = Joi.object({
  type: Joi.string().valid('registration').required(),
  data: Joi.object({
    agentId: Joi.string().required(),
    version: Joi.string().required(),
    location: Joi.object({
      provider: Joi.string().valid('gcp', 'aws', 'azure', 'on-premise').required(),
      region: Joi.string().required(),
      zone: Joi.string().optional(),
      instance_id: Joi.string().optional(),
      ip_address: Joi.string().ip().optional()
    }).required(),
    capabilities: Joi.array().items(Joi.string()).optional(),
    config: Joi.object().optional()
  }).required()
});

// Metrics message schema
const metricSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('gauge', 'counter', 'histogram', 'timer').required(),
  value: Joi.alternatives().try(
    Joi.number(),
    Joi.object({
      value: Joi.number().required(),
      min: Joi.number().optional(),
      max: Joi.number().optional(),
      avg: Joi.number().optional(),
      count: Joi.number().optional()
    })
  ).required(),
  unit: Joi.string().optional(),
  tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  timestamp: Joi.string().isoDate().optional()
});

const metricsSchema = Joi.object({
  type: Joi.string().valid('metrics').required(),
  data: Joi.object({
    agentId: Joi.string().required(),
    timestamp: Joi.string().isoDate().required(),
    location: Joi.object({
      provider: Joi.string().required(),
      region: Joi.string().required(),
      zone: Joi.string().optional(),
      instance_id: Joi.string().optional()
    }).optional(),
    metrics: Joi.array().items(metricSchema).min(1).required()
  }).required()
});

// Status update schema
const statusSchema = Joi.object({
  type: Joi.string().valid('status').required(),
  data: Joi.object({
    status: Joi.string().valid('healthy', 'warning', 'error', 'stopped').required(),
    message: Joi.string().optional(),
    details: Joi.object().optional()
  }).required()
});

// Pong response schema
const pongSchema = Joi.object({
  type: Joi.string().valid('pong').required(),
  data: Joi.object({
    timestamp: Joi.string().isoDate().optional()
  }).optional()
});

// Combined validation function
function validateMessage(message) {
  // First validate base structure
  const baseResult = baseMessageSchema.validate(message);
  if (baseResult.error) {
    return baseResult;
  }

  // Then validate specific message type
  switch (message.type) {
    case 'registration':
      return registrationSchema.validate(message);
    
    case 'metrics':
      return metricsSchema.validate(message);
    
    case 'status':
      return statusSchema.validate(message);
    
    case 'pong':
      return pongSchema.validate(message);
    
    default:
      return {
        error: {
          details: [{ message: `Unknown message type: ${message.type}` }]
        }
      };
  }
}

// Query validation for API endpoints
const querySchemas = {
  // Metrics query
  metrics: Joi.object({
    agentId: Joi.string().optional(),
    provider: Joi.string().optional(),
    region: Joi.string().optional(),
    metricName: Joi.string().optional(),
    metricType: Joi.string().valid('gauge', 'counter', 'histogram', 'timer').optional(),
    startTime: Joi.string().isoDate().optional(),
    endTime: Joi.string().isoDate().optional(),
    limit: Joi.number().integer().min(1).max(10000).default(1000),
    offset: Joi.number().integer().min(0).default(0),
    aggregation: Joi.string().valid('avg', 'sum', 'min', 'max', 'count').optional(),
    interval: Joi.string().valid('1m', '5m', '15m', '1h', '6h', '1d').optional()
  }),

  // Agent query
  agents: Joi.object({
    status: Joi.string().valid('connected', 'disconnected', 'all').default('all'),
    provider: Joi.string().optional(),
    region: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  // Dashboard query
  dashboard: Joi.object({
    timeRange: Joi.string().valid('1h', '6h', '24h', '7d', '30d').default('24h'),
    providers: Joi.array().items(Joi.string()).optional(),
    regions: Joi.array().items(Joi.string()).optional(),
    metrics: Joi.array().items(Joi.string()).optional()
  })
};

function validateQuery(type, query) {
  const schema = querySchemas[type];
  if (!schema) {
    return {
      error: {
        details: [{ message: `Unknown query type: ${type}` }]
      }
    };
  }

  return schema.validate(query);
}

// Agent configuration validation
const agentConfigSchema = Joi.object({
  collection_interval: Joi.number().integer().min(1).max(3600).default(30),
  transmission_interval: Joi.number().integer().min(1).max(3600).default(60),
  batch_size: Joi.number().integer().min(1).max(1000).default(100),
  retry_attempts: Joi.number().integer().min(0).max(10).default(3),
  retry_delay: Joi.number().integer().min(100).max(60000).default(5000),
  targets: Joi.object({
    ping: Joi.array().items(Joi.string()).optional(),
    dns: Joi.array().items(Joi.string()).optional()
  }).optional(),
  filters: Joi.object({
    interfaces: Joi.array().items(Joi.string()).optional(),
    metrics: Joi.array().items(Joi.string()).optional()
  }).optional()
});

function validateAgentConfig(config) {
  return agentConfigSchema.validate(config);
}

module.exports = {
  validateMessage,
  validateQuery,
  validateAgentConfig,
  schemas: {
    registration: registrationSchema,
    metrics: metricsSchema,
    status: statusSchema,
    pong: pongSchema,
    agentConfig: agentConfigSchema
  }
}; 