#!/bin/bash

# Network Monitor Agent - Simulation
# This script demonstrates what the agent would do when running

echo "🚀 Starting Network Monitor Agent..."
echo "📊 Agent ID: 550e8400-e29b-41d4-a716-446655440000"
echo "🌐 Backend URL: ws://localhost:8080"
echo "📍 Location: $(uname -s)/unknown/unknown"
echo "⏱️  Collection Interval: 30s"
echo "📦 Batch Size: 100"
echo "🔧 Collectors: [network_interface ping]"
echo ""

echo "INFO[$(date '+%Y-%m-%dT%H:%M:%SZ')] Starting monitoring agent"
echo "INFO[$(date '+%Y-%m-%dT%H:%M:%SZ')] Starting network interface collector"
echo "INFO[$(date '+%Y-%m-%dT%H:%M:%SZ')] Starting ping collector"
echo "INFO[$(date '+%Y-%m-%dT%H:%M:%SZ')] Connecting to backend"

# Simulate connection attempt
sleep 1
echo "WARN[$(date '+%Y-%m-%dT%H:%M:%SZ')] Failed to connect to backend: connection refused"
echo "INFO[$(date '+%Y-%m-%dT%H:%M:%SZ')] Will retry connection in 10 seconds..."

echo "✅ Agent started successfully!"
echo "📡 Collecting and transmitting network metrics..."
echo "Press Ctrl+C to stop"
echo ""

echo "=== SIMULATION: Metric Collection Cycle ==="

# Simulate network interface collection
echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Collecting network interface metrics"

# Get actual network interfaces
if command -v ifconfig >/dev/null 2>&1; then
    interfaces=$(ifconfig | grep "^[a-z]" | cut -d: -f1 | head -3)
    for interface in $interfaces; do
        if [ "$interface" != "lo" ]; then
            echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Collected 8 metrics from interface: $interface"
        fi
    done
elif command -v ip >/dev/null 2>&1; then
    interfaces=$(ip link show | grep "^[0-9]" | cut -d: -f2 | tr -d ' ' | head -3)
    for interface in $interfaces; do
        if [ "$interface" != "lo" ]; then
            echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Collected 8 metrics from interface: $interface"
        fi
    done
else
    echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Collected 8 metrics from interface: en0"
    echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Collected 8 metrics from interface: en1"
fi

# Simulate ping collection
echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Performing ping tests"

targets=("8.8.8.8" "1.1.1.1" "google.com" "cloudflare.com")
for target in "${targets[@]}"; do
    # Actually ping if possible, or simulate
    if command -v ping >/dev/null 2>&1; then
        if ping -c 1 -W 1000 "$target" >/dev/null 2>&1; then
            echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Ping to $target: success"
        else
            echo "WARN[$(date '+%Y-%m-%dT%H:%M:%SZ')] Ping to $target: failed"
        fi
    else
        echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Ping to $target: success (simulated)"
    fi
done

echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Completed metric collection cycle"
echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Total metrics collected: 20"

# Simulate metric transmission
echo "DEBUG[$(date '+%Y-%m-%dT%H:%M:%SZ')] Attempting to send metric batch"
echo "ERROR[$(date '+%Y-%m-%dT%H:%M:%SZ')] Failed to send metric batch: not connected to backend"

echo ""
echo "=== SAMPLE METRICS THAT WOULD BE COLLECTED ==="

cat << 'EOF'
{
  "type": "metrics",
  "data": {
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-06-09T23:30:00Z",
    "location": {
      "provider": "on-premise",
      "region": "unknown",
      "zone": "unknown"
    },
    "metrics": [
      {
        "name": "network_interface_rx_bytes_per_sec",
        "value": 1048576,
        "unit": "bytes/sec",
        "tags": { "interface": "en0" },
        "type": "gauge"
      },
      {
        "name": "ping_rtt_avg_ms",
        "value": 12.5,
        "unit": "ms",
        "tags": { "target": "8.8.8.8" },
        "type": "gauge"
      }
    ]
  }
}
EOF

echo ""
echo "🛑 Simulation complete. In real usage:"
echo "  • Agent would continuously collect metrics every 30s"
echo "  • WebSocket connection would stream data to backend"
echo "  • Automatic reconnection on connection loss"
echo "  • Graceful shutdown on SIGINT/SIGTERM" 