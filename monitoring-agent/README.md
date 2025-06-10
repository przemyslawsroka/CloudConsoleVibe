# Network Monitor Agent

A lightweight, cross-platform network monitoring agent designed for multi-cloud environments. Collects network metrics, performance data, and connectivity information from GCP, AWS, Azure, and on-premise infrastructure.

## 🚀 Features

- **Multi-Cloud Support**: Works seamlessly across GCP, AWS, Azure, and on-premise environments
- **Comprehensive Metrics**: Network interface stats, ping latency, packet loss, bandwidth utilization
- **Real-time Transmission**: WebSocket-based real-time metric streaming to backend
- **Auto-Discovery**: Automatic cloud provider and location detection
- **Lightweight**: Minimal resource footprint with efficient Go implementation
- **Configurable**: Flexible YAML configuration with environment variable support
- **Cross-Platform**: Supports Linux, macOS, and Windows

## 📊 Collected Metrics

### Network Interface Metrics
- Bytes/packets received and transmitted (rates and totals)
- Network errors and drops
- Interface utilization

### Connectivity Metrics
- ICMP ping latency (min/avg/max)
- Packet loss percentage
- Network reachability tests

### System Context
- Cloud provider metadata
- Geographic location information
- Network topology details

## 🛠 Installation

### Download Binary
```bash
# Download for your platform from releases
curl -L https://github.com/your-org/CloudConsoleVibe/releases/latest/download/network-monitor-agent-linux-amd64.tar.gz | tar -xz
```

### Build from Source
```bash
# Clone the repository
git clone https://github.com/your-org/CloudConsoleVibe.git
cd CloudConsoleVibe/monitoring-agent

# Build the agent
make build

# Or install to GOPATH/bin
make install
```

## ⚙️ Configuration

### Generate Default Configuration
```bash
./bin/network-monitor-agent generate-config
```

This creates `agent-config.yaml` with default settings:

```yaml
agent_id: "auto-generated-uuid"
backend_url: "ws://localhost:8080"
collect_interval: "30s"
batch_size: 100
log_level: "info"

# Auto-detected or manually specified
location:
  provider: "gcp"        # gcp, aws, azure, on-premise
  region: "us-central1"
  zone: "us-central1-a"
  network: "default"
  subnet: "default"
  instance_id: "auto-detected"
  private_ip: "10.0.0.5"
  public_ip: "34.123.45.67"

# Enabled metric collectors
collectors:
  - "network_interface"
  - "ping"

# Custom monitoring targets
custom_targets:
  ping_targets:
    - "8.8.8.8"
    - "1.1.1.1"
    - "google.com"
  
  http_targets:
    - url: "https://google.com"
      method: "GET"
      expected_code: 200
      timeout: "10s"
      follow_redirect: true
  
  tcp_ports: [80, 443, 22, 53]
  dns_servers: ["8.8.8.8", "1.1.1.1"]
```

### Environment Variables
Override configuration using environment variables:

```bash
export NETMON_BACKEND_URL="wss://your-backend.com"
export NETMON_AGENT_ID="your-custom-agent-id"
export NETMON_LOG_LEVEL="debug"
export NETMON_LOCATION_PROVIDER="aws"
```

## 🏃 Usage

### Basic Usage
```bash
# Run with default configuration
./bin/network-monitor-agent run

# Run with custom config file
./bin/network-monitor-agent run -c /path/to/config.yaml

# Run with command line overrides
./bin/network-monitor-agent run \
  --backend-url wss://your-backend.com \
  --log-level debug
```

### Status and Monitoring
```bash
# Show agent status and configuration
./bin/network-monitor-agent status

# Show version information
./bin/network-monitor-agent version
```

### Development Mode
```bash
# Run in development mode with debug logging
make dev
```

## 🏗 Architecture

```
┌─────────────────────────────────────────────┐
│              Monitoring Agent               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │   Network   │  │    Ping     │          │
│  │  Collector  │  │  Collector  │   ...    │
│  └─────────────┘  └─────────────┘          │
│         │                 │                │
│         └─────────┬───────┘                │
│                   │                        │
│         ┌─────────▼─────────┐              │
│         │   Metric Queue    │              │
│         └─────────┬─────────┘              │
│                   │                        │
│         ┌─────────▼─────────┐              │
│         │   WebSocket TX    │              │
│         └─────────┬─────────┘              │
└───────────────────┼─────────────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   Backend Server    │
         │   (CloudConsole)    │
         └─────────────────────┘
```

## 📡 Backend Integration

The agent connects to your CloudConsoleVibe backend via WebSocket:

### Connection Flow
1. Agent connects to `wss://your-backend.com/api/v1/agents/connect`
2. Sends registration message with agent metadata
3. Establishes persistent connection with automatic reconnection
4. Streams metric batches in real-time

### Message Format
```json
{
  "type": "metrics",
  "data": {
    "agent_id": "uuid",
    "timestamp": "2024-01-01T12:00:00Z",
    "location": { ... },
    "metrics": [
      {
        "name": "network_interface_rx_bytes_per_sec",
        "value": 1048576,
        "unit": "bytes/sec",
        "timestamp": "2024-01-01T12:00:00Z",
        "tags": { "interface": "eth0" },
        "type": "gauge"
      }
    ]
  }
}
```

## 🔧 Development

### Prerequisites
- Go 1.21 or later
- Make (for build automation)

### Build Commands
```bash
# Download dependencies
make deps

# Build for current platform
make build

# Build for all platforms
make build-all

# Run tests
make test

# Format code
make fmt

# Lint code
make lint

# Full check (fmt + lint + test + build)
make check
```

### Project Structure
```
monitoring-agent/
├── cmd/agent/              # Main entry point
├── internal/
│   ├── agent/             # Core agent orchestration
│   ├── collectors/        # Metric collectors
│   ├── config/           # Configuration management
│   └── transmitter/      # Backend communication
├── pkg/metrics/          # Shared types and interfaces
├── configs/              # Sample configurations
├── scripts/              # Deployment and utility scripts
├── Makefile             # Build automation
└── README.md           # This file
```

## 🚀 Deployment

### Systemd Service (Linux)
```bash
# Create service file
sudo tee /etc/systemd/system/network-monitor-agent.service > /dev/null <<EOF
[Unit]
Description=Network Monitor Agent
After=network.target

[Service]
Type=simple
User=networkmon
ExecStart=/usr/local/bin/network-monitor-agent run -c /etc/network-monitor/config.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable network-monitor-agent
sudo systemctl start network-monitor-agent
```

### Docker Deployment
```bash
# Build container
make docker-build

# Run container
docker run -d \
  --name network-monitor-agent \
  --restart unless-stopped \
  -e NETMON_BACKEND_URL="wss://your-backend.com" \
  network-monitor-agent:1.0.0
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-monitor-agent
spec:
  selector:
    matchLabels:
      app: network-monitor-agent
  template:
    metadata:
      labels:
        app: network-monitor-agent
    spec:
      hostNetwork: true
      containers:
      - name: agent
        image: network-monitor-agent:1.0.0
        env:
        - name: NETMON_BACKEND_URL
          value: "wss://your-backend.com"
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
```

## 📈 Performance

- **CPU Usage**: < 1% on idle, ~2-3% during collection
- **Memory Usage**: ~10-20 MB RSS
- **Network**: ~1-5 KB/s depending on collection frequency
- **Disk**: Minimal (configuration files only)

## 🛡 Security

- **TLS**: All backend communication uses WSS (WebSocket Secure)
- **Authentication**: Bearer token or API key authentication
- **Minimal Privileges**: Runs with minimal system permissions
- **No Data Storage**: No persistent storage of sensitive data

## 📝 License

This project is part of CloudConsoleVibe and is licensed under the same terms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/CloudConsoleVibe/issues)
- **Documentation**: [CloudConsoleVibe Docs](https://docs.cloudconsolevibe.com)
- **Community**: [Discord/Slack Channel]

---

**Built with ❤️ for multi-cloud network monitoring** 