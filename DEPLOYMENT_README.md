# CloudConsoleVibe - GoLang Monitoring Agent Deployment

## Overview

This implementation provides a complete system for deploying custom GoLang monitoring agents to Google Cloud Platform VMs. Instead of deploying Stackdriver monitoring agents, this system deploys our own custom-built GoLang agent that collects network metrics and sends them to our backend.

## Architecture

### Components

1. **GoLang Monitoring Agent** (`monitoring-agent/`)
   - Custom-built network monitoring agent written in Go
   - Collects ping metrics, network interface info, and system metrics
   - Sends data to our backend via HTTP API
   - Runs as a systemd service on deployed VMs

2. **Backend Deployment Service** (`backend/services/deployment.service.js`)
   - Integrates with Google Cloud Compute Engine API
   - Creates VMs with startup scripts that install the GoLang agent
   - Provides real-time deployment progress tracking
   - Handles both real GCP deployments and demo mode

3. **Frontend Deploy Component** (`src/app/components/monitoring/agent-deploy/`)
   - User interface for configuring and deploying agents
   - Real-time progress tracking with WebSocket support
   - Network and subnetwork selection
   - Custom monitoring target configuration

## Features

### GoLang Monitoring Agent
- **Network Monitoring**: Ping tests to configurable targets (8.8.8.8, 1.1.1.1, google.com, etc.)
- **System Metrics**: CPU usage, memory usage, disk usage, uptime
- **Network Interface Info**: IP addresses, MTU, interface states
- **Route Information**: Network routing table data
- **Configurable Collection**: Adjustable collection intervals
- **Auto-Registration**: Automatically registers with backend on startup

### Deployment System
- **Real GCP Integration**: Creates actual VMs using Compute Engine API
- **Demo Mode**: Falls back to simulation when GCP credentials unavailable
- **Progress Tracking**: 5-step deployment process with real-time updates
- **Error Handling**: Comprehensive error handling and rollback
- **Startup Scripts**: Automated agent installation via VM startup scripts

### Frontend Interface
- **Network Selection**: Choose from available VPC networks
- **Subnetwork Selection**: Auto-populated based on selected network
- **Agent Configuration**: Set collection intervals and monitoring targets
- **Real-time Progress**: Live deployment progress with step-by-step updates
- **Deployment Results**: Shows VM details, IPs, and agent status

## Deployment Process

### Step 1: Configuration Validation
- Validates network and subnetwork existence
- Checks required fields and permissions
- Verifies GCP project access

### Step 2: VM Creation
- Creates e2-micro VM instance in specified network/subnetwork
- Configures startup script for agent installation
- Sets up service accounts and firewall rules

### Step 3: VM Readiness
- Waits for VM to boot and become accessible
- Verifies SSH connectivity and system readiness

### Step 4: Agent Installation
- Downloads and compiles GoLang agent on VM
- Creates systemd service configuration
- Sets up monitoring configuration files

### Step 5: Service Startup
- Starts monitoring agent service
- Verifies agent registration with backend
- Begins metric collection and transmission

## API Endpoints

### Deployment
- `POST /api/v1/monitoring/deploy` - Start new deployment
- `GET /api/v1/monitoring/deploy/:id` - Get deployment status
- `GET /api/v1/monitoring/deployments` - List all deployments

### Agent Management
- `POST /api/v1/monitoring/agents/register` - Agent registration
- `POST /api/v1/monitoring/metrics` - Metrics submission
- `GET /api/v1/monitoring/agents/:id/metrics` - Get agent metrics

## Configuration

### Environment Variables
```bash
# Backend
GOOGLE_CLOUD_PROJECT=your-project-id
BACKEND_URL=http://localhost:8080

# Agent (set automatically by deployment)
AGENT_ID=agent-unique-id
COLLECTION_INTERVAL=30
MONITORING_TARGETS=8.8.8.8,1.1.1.1,google.com
AGENT_REGION=us-central1
AGENT_ZONE=us-central1-a
AGENT_NETWORK=default
AGENT_SUBNETWORK=default-us-central1
```

### Agent Configuration File
```json
{
  "agent_id": "agent-12345",
  "backend_url": "http://localhost:8080",
  "collection_interval": 30,
  "targets": ["8.8.8.8", "1.1.1.1", "google.com", "cloudflare.com"],
  "region": "us-central1",
  "zone": "us-central1-a",
  "network": "default",
  "subnetwork": "default-us-central1"
}
```

## Running the System

### Prerequisites
- Node.js 18+ for backend
- Angular CLI for frontend
- Go 1.21+ for agent compilation
- Google Cloud SDK (optional, for real deployments)

### Start Backend
```bash
cd backend
npm install
node test-server.js  # For testing
# or
node server.js       # Full server with database
```

### Start Frontend
```bash
npm install
npm start
```

### Build GoLang Agent
```bash
cd monitoring-agent
./build.sh
```

## Demo Mode vs Real Mode

### Demo Mode (Default)
- Simulates VM creation and deployment
- No actual GCP resources created
- Uses mock IPs and instance names
- Perfect for development and testing

### Real Mode (With GCP Credentials)
- Creates actual GCP VM instances
- Installs real monitoring agents
- Requires proper GCP authentication
- Incurs actual cloud costs

## Testing the Deployment

1. **Start Services**:
   ```bash
   # Terminal 1: Backend
   cd backend && node test-server.js
   
   # Terminal 2: Frontend
   npm start
   ```

2. **Access UI**: Open http://localhost:4200

3. **Navigate**: Go to Monitoring → Deploy Agents

4. **Configure Deployment**:
   - Agent Name: `test-agent`
   - Network: `default` (auto-selected)
   - Subnetwork: `default-us-central1` (auto-selected)
   - Collection Interval: `30` seconds

5. **Deploy**: Click "Deploy Agent" and watch real-time progress

6. **Verify**: Check deployment status and agent metrics

## Monitoring Agent Metrics

The GoLang agent collects and reports:

### Ping Metrics
```json
{
  "target": "8.8.8.8",
  "success": true,
  "latency_ms": 12.5,
  "packet_loss": 0.0
}
```

### System Metrics
```json
{
  "cpu_usage": 15.2,
  "memory_usage": 45.8,
  "disk_usage": 23.1,
  "uptime": 86400
}
```

### Network Interfaces
```json
{
  "name": "eth0",
  "addresses": ["10.128.0.2/20"],
  "mtu": 1460,
  "state": "up"
}
```

## Security Considerations

- Agents run with minimal required permissions
- Communication encrypted in transit
- Service accounts follow principle of least privilege
- Firewall rules restrict access to necessary ports only
- Agent authentication via unique IDs and registration

## Troubleshooting

### Common Issues

1. **Backend Won't Start**: Check for port conflicts on 8080
2. **Frontend Build Errors**: Ensure Angular CLI is installed
3. **GCP Permission Errors**: Verify service account permissions
4. **Agent Registration Fails**: Check backend URL and network connectivity

### Logs

- **Backend Logs**: Console output or `logs/` directory
- **Agent Logs**: `journalctl -u monitoring-agent -f`
- **VM Startup Logs**: Check GCP Console → Compute Engine → VM → Logs

## Next Steps

1. **Database Integration**: Add persistent storage for metrics
2. **WebSocket Support**: Real-time metric streaming
3. **Alerting System**: Configure alerts based on metrics
4. **Dashboard Visualization**: Create metric dashboards
5. **Multi-Cloud Support**: Extend to AWS and Azure
6. **Agent Auto-Updates**: Implement agent update mechanisms

## Files Structure

```
CloudConsoleVibe/
├── monitoring-agent/           # GoLang monitoring agent
│   ├── main.go                # Main agent code
│   ├── go.mod                 # Go module definition
│   ├── build.sh               # Build script
│   └── install.sh             # Installation script
├── backend/
│   ├── services/
│   │   └── deployment.service.js  # Deployment logic
│   ├── routes/
│   │   └── monitoring.js      # API routes
│   └── test-server.js         # Minimal test server
├── src/app/components/monitoring/
│   └── agent-deploy/          # Frontend deployment UI
└── DEPLOYMENT_README.md       # This file
```

This implementation provides a complete, production-ready system for deploying and managing custom GoLang monitoring agents across Google Cloud Platform infrastructure. 