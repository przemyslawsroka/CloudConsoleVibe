#!/bin/bash

set -e

echo "🚀 Installing CloudConsoleVibe Monitoring Agent..."

# Configuration variables (will be replaced by deployment script)
AGENT_ID="${AGENT_ID:-agent-$(hostname)}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
COLLECTION_INTERVAL="${COLLECTION_INTERVAL:-30}"
MONITORING_TARGETS="${MONITORING_TARGETS:-8.8.8.8,1.1.1.1,google.com,cloudflare.com}"
AGENT_REGION="${AGENT_REGION:-us-central1}"
AGENT_ZONE="${AGENT_ZONE:-us-central1-a}"
AGENT_NETWORK="${AGENT_NETWORK:-default}"
AGENT_SUBNETWORK="${AGENT_SUBNETWORK:-default}"

# Installation directories
INSTALL_DIR="/opt/monitoring-agent"
CONFIG_DIR="/etc/monitoring-agent"
LOG_DIR="/var/log/monitoring-agent"
SERVICE_FILE="/etc/systemd/system/monitoring-agent.service"

echo "📁 Creating directories..."
sudo mkdir -p ${INSTALL_DIR}
sudo mkdir -p ${CONFIG_DIR}
sudo mkdir -p ${LOG_DIR}

echo "📦 Installing binary..."
sudo cp monitoring-agent-linux-amd64 ${INSTALL_DIR}/monitoring-agent
sudo chmod +x ${INSTALL_DIR}/monitoring-agent

echo "⚙️ Creating configuration..."
sudo tee ${CONFIG_DIR}/config.json > /dev/null <<EOF
{
  "agent_id": "${AGENT_ID}",
  "backend_url": "${BACKEND_URL}",
  "collection_interval": ${COLLECTION_INTERVAL},
  "targets": [$(echo "${MONITORING_TARGETS}" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')],
  "region": "${AGENT_REGION}",
  "zone": "${AGENT_ZONE}",
  "network": "${AGENT_NETWORK}",
  "subnetwork": "${AGENT_SUBNETWORK}"
}
EOF

echo "🔧 Creating systemd service..."
sudo tee ${SERVICE_FILE} > /dev/null <<EOF
[Unit]
Description=CloudConsoleVibe Monitoring Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/monitoring-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=monitoring-agent

# Environment variables
Environment=AGENT_ID=${AGENT_ID}
Environment=BACKEND_URL=${BACKEND_URL}
Environment=COLLECTION_INTERVAL=${COLLECTION_INTERVAL}
Environment=MONITORING_TARGETS=${MONITORING_TARGETS}
Environment=AGENT_REGION=${AGENT_REGION}
Environment=AGENT_ZONE=${AGENT_ZONE}
Environment=AGENT_NETWORK=${AGENT_NETWORK}
Environment=AGENT_SUBNETWORK=${AGENT_SUBNETWORK}

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

echo "🚀 Starting monitoring agent..."
sudo systemctl enable monitoring-agent
sudo systemctl start monitoring-agent

echo "✅ Installation complete!"
echo "📊 Service status:"
sudo systemctl status monitoring-agent --no-pager -l

echo ""
echo "🔍 Useful commands:"
echo "  View logs: sudo journalctl -u monitoring-agent -f"
echo "  Restart:   sudo systemctl restart monitoring-agent"
echo "  Stop:      sudo systemctl stop monitoring-agent"
echo "  Status:    sudo systemctl status monitoring-agent" 