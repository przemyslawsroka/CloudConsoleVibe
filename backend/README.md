# CloudConsoleVibe Backend

Node.js backend server with WebSocket support for monitoring agents and REST API for the CloudConsoleVibe frontend.

## Features

### Core Features
- **WebSocket Server**: Real-time communication with monitoring agents
- **REST API**: Comprehensive endpoints for agent and metric management
- **SQLite Database**: Lightweight storage for metrics and agent data
- **Real-time Monitoring**: Live metric ingestion and dashboard data
- **Multi-cloud Support**: Works with GCP, AWS, Azure, and on-premise agents

### API Endpoints

#### Agent Management (`/api/v1/agents`)
- `GET /` - List all agents with filtering and pagination
- `GET /:agentId` - Get specific agent details
- `GET /:agentId/stats` - Get agent statistics 
- `GET /:agentId/config` - Get agent configuration
- `PUT /:agentId/config` - Update agent configuration
- `DELETE /:agentId` - Delete agent (admin only)
- `GET /summary/stats` - Get overall agent statistics

#### Metrics (`/api/v1/metrics`)
- `GET /` - Query metrics with filtering
- `GET /aggregated` - Get aggregated metrics
- `GET /history/:metricName` - Get metric history
- `GET /agent/:agentId` - Get metrics for specific agent
- `GET /names` - Get available metric names
- `GET /stats` - Get metric statistics
- `GET /realtime` - Get real-time metrics (last 5 minutes)
- `GET /search` - Search metrics by name pattern

#### Dashboard (`/api/v1/dashboard`)
- `GET /overview` - Dashboard overview data
- `GET /health` - System health status
- `GET /activity` - Real-time activity feed

#### WebSocket (`ws://host:port/api/v1/agents/connect`)
- Agent registration and authentication
- Real-time metric ingestion
- Bidirectional communication
- Heartbeat monitoring
- Rate limiting

### Proxy Routes (Compatibility)
- `/api/logging/*` - Google Cloud Logging API proxy
- `/api/compute/*` - Google Cloud Compute API proxy

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp config.env.example .env
   # Edit .env with your configuration
   ```

3. **Create logs directory**:
   ```bash
   mkdir -p logs
   ```

4. **Start the server**:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Configuration

### Environment Variables

#### Server Configuration
- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:4200)

#### Database
- `DB_TYPE` - Database type (sqlite/postgresql)
- `DB_PATH` - SQLite database path (default: ./data/monitoring.db)

#### WebSocket
- `WS_HEARTBEAT_INTERVAL` - Heartbeat interval in ms (default: 30000)
- `WS_CONNECTION_TIMEOUT` - Connection timeout in ms (default: 60000)

### Database Schema

The backend automatically creates the following tables:

#### `agents`
- Agent registration and metadata
- Connection status and statistics
- Provider/region/zone information

#### `metrics`
- Time-series metric data
- Support for multiple metric types (gauge, counter, histogram, timer)
- JSON storage for complex values

#### `metric_batches`
- Batch processing tracking
- Error monitoring and statistics

#### `agent_configs`
- Agent-specific configurations
- Version control for config changes

#### `alert_rules` & `alert_instances`
- Alert rule definitions
- Active alert tracking

## WebSocket Protocol

### Connection
```
ws://host:port/api/v1/agents/connect?agent_id=<ID>&provider=<PROVIDER>&region=<REGION>
```

### Message Format
```json
{
  "type": "message_type",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Message Types

#### Agent → Server
- `registration` - Agent registration with metadata
- `metrics` - Batch metric data transmission
- `status` - Agent status updates
- `pong` - Heartbeat response

#### Server → Agent
- `welcome` - Connection acknowledgment
- `ping` - Heartbeat request
- `command` - Server commands to agent
- `config_update` - Configuration changes
- `error` - Error messages

### Example Registration Message
```json
{
  "type": "registration",
  "data": {
    "agentId": "agent-001",
    "version": "1.0.0",
    "location": {
      "provider": "gcp",
      "region": "us-central1",
      "zone": "us-central1-a",
      "instance_id": "i-1234567890"
    },
    "capabilities": ["network", "ping", "dns"]
  }
}
```

### Example Metrics Message
```json
{
  "type": "metrics",
  "data": {
    "agentId": "agent-001",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "location": {
      "provider": "gcp",
      "region": "us-central1"
    },
    "metrics": [
      {
        "name": "network.eth0.rx_bytes_rate",
        "type": "gauge",
        "value": 1234567.89,
        "unit": "bytes/sec",
        "tags": {
          "interface": "eth0",
          "direction": "rx"
        }
      }
    ]
  }
}
```

## API Usage Examples

### Get All Agents
```bash
curl "http://localhost:8080/api/v1/agents?status=connected&limit=10"
```

### Query Metrics
```bash
curl "http://localhost:8080/api/v1/metrics?agentId=agent-001&startTime=2024-01-01T00:00:00Z&limit=100"
```

### Get Dashboard Overview
```bash
curl "http://localhost:8080/api/v1/dashboard/overview?timeRange=24h"
```

### Update Agent Configuration
```bash
curl -X PUT "http://localhost:8080/api/v1/agents/agent-001/config" \
  -H "Content-Type: application/json" \
  -d '{
    "collection_interval": 30,
    "transmission_interval": 60,
    "targets": {
      "ping": ["8.8.8.8", "1.1.1.1"]
    }
  }'
```

## Development

### Project Structure
```
backend/
├── server.js              # Main server entry point
├── package.json           # Dependencies and scripts
├── config.env.example     # Environment configuration template
├── websocket/             # WebSocket handling
│   ├── handler.js         # Main WebSocket handler
│   ├── agentRegistry.js   # Agent connection management
│   ├── metricProcessor.js # Metric processing logic
│   └── validation.js      # Message validation schemas
├── database/              # Database layer
│   ├── init.js           # Database initialization
│   └── metricStore.js    # Metric storage operations
├── routes/               # REST API routes
│   ├── agents.js        # Agent management endpoints
│   ├── metrics.js       # Metric query endpoints
│   ├── dashboard.js     # Dashboard data endpoints
│   └── proxy/           # API proxy routes
└── logs/                # Application logs
```

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

## Production Deployment

### Docker
```bash
# Build image
docker build -t cloudconsolevibe-backend .

# Run container
docker run -p 8080:8080 -v ./data:/app/data cloudconsolevibe-backend
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure proper database (PostgreSQL recommended)
3. Set up log rotation
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL/TLS termination
6. Configure monitoring and alerting

### Performance Tuning
- Use PostgreSQL for production workloads
- Enable Redis for caching
- Configure connection pooling
- Set up database indexing
- Monitor memory usage and WebSocket connections

## Monitoring

### Health Endpoints
- `GET /health` - Basic health check
- `GET /api/v1/dashboard/health` - Detailed system health

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output in development

### Metrics
The backend exposes its own operational metrics:
- WebSocket connection count
- Metric ingestion rate
- Database query performance
- Error rates and types

## Security

### Authentication
- WebSocket connections support query parameter authentication
- REST API can be secured with JWT tokens
- Rate limiting on all endpoints

### Data Protection
- Input validation on all endpoints
- SQL injection protection
- XSS protection headers
- CORS configuration

### Network Security
- Configurable CORS origins
- Request size limits
- Connection limits
- Rate limiting per IP

## Troubleshooting

### Common Issues

#### WebSocket Connection Failures
- Check firewall settings
- Verify agent_id parameter
- Check rate limiting logs
- Verify server is listening on correct port

#### Database Issues
- Ensure data directory is writable
- Check disk space
- Verify SQLite file permissions

#### High Memory Usage
- Monitor WebSocket connection count
- Check for metric batching issues
- Verify database cleanup is running

### Debug Mode
Set `LOG_LEVEL=debug` for verbose logging.

### Health Checks
Use the health endpoints to monitor system status:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/dashboard/health
```

## License

MIT License - see LICENSE file for details. 