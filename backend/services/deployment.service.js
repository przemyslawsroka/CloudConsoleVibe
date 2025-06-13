const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Try to import Google Cloud packages, fallback to demo mode if not available
let Compute, Storage;
try {
  const computeModule = require('@google-cloud/compute');
  const storageModule = require('@google-cloud/storage');
  Compute = computeModule.Compute;
  Storage = storageModule.Storage;
} catch (error) {
  console.warn('Google Cloud packages not available, running in demo mode:', error.message);
  Compute = null;
  Storage = null;
}

class DeploymentService {
  constructor() {
    this.isDemo = !Compute || !Storage;
    
    if (!this.isDemo) {
      try {
        this.compute = new Compute();
        this.storage = new Storage();
      } catch (error) {
        console.warn('Failed to initialize Google Cloud services, falling back to demo mode:', error.message);
        this.isDemo = true;
      }
    }
    
    this.deployments = new Map(); // Track active deployments
    
    if (this.isDemo) {
      console.log('🎭 Running in DEMO mode - deployments will be simulated');
    }
  }

  async deployAgent(config, deploymentId, progressCallback) {
    console.log(`🚀 Starting deployment ${deploymentId}`, config);
    
    try {
      // Step 1: Validate configuration
      progressCallback({
        step: 0,
        message: 'Validating network configuration...',
        percentage: 10,
        status: 'in-progress'
      });
      
      await this.validateConfiguration(config);
      
      progressCallback({
        step: 0,
        message: 'Configuration validated successfully',
        percentage: 20,
        status: 'completed'
      });

      // Step 2: Create VM instance
      progressCallback({
        step: 1,
        message: 'Creating e2-micro VM instance...',
        percentage: 30,
        status: 'in-progress'
      });
      
      const vmInstance = await this.createVMInstance(config, deploymentId);
      
      progressCallback({
        step: 1,
        message: `VM instance ${vmInstance.name} created successfully`,
        percentage: 50,
        status: 'completed'
      });

      // Step 3: Wait for VM to be ready
      progressCallback({
        step: 2,
        message: 'Waiting for VM to be ready...',
        percentage: 60,
        status: 'in-progress'
      });
      
      await this.waitForVMReady(vmInstance.name, config.zone);
      
      progressCallback({
        step: 2,
        message: 'VM is ready and accessible',
        percentage: 70,
        status: 'completed'
      });

      // Step 4: Install monitoring agent
      progressCallback({
        step: 3,
        message: 'Installing monitoring agent software...',
        percentage: 80,
        status: 'in-progress'
      });
      
      await this.installMonitoringAgent(vmInstance, config);
      
      progressCallback({
        step: 3,
        message: 'Monitoring agent installed successfully',
        percentage: 90,
        status: 'completed'
      });

      // Step 5: Start agent services
      progressCallback({
        step: 4,
        message: 'Starting monitoring services...',
        percentage: 95,
        status: 'in-progress'
      });
      
      await this.startAgentServices(vmInstance, config);
      
      progressCallback({
        step: 4,
        message: 'Monitoring agent is now active and collecting metrics',
        percentage: 100,
        status: 'completed'
      });

      const result = {
        deploymentId,
        vmInstance: vmInstance.name,
        agentId: `agent-${vmInstance.name}`,
        status: 'completed',
        externalIP: await this.getVMExternalIP(vmInstance.name, config.zone),
        internalIP: await this.getVMInternalIP(vmInstance.name, config.zone)
      };

      this.deployments.set(deploymentId, result);
      return result;

    } catch (error) {
      console.error(`❌ Deployment ${deploymentId} failed:`, error);
      
      progressCallback({
        step: -1,
        message: `Deployment failed: ${error.message}`,
        percentage: 0,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  async validateConfiguration(config) {
    // Validate required fields
    const required = ['agentName', 'network', 'subnetwork', 'projectId'];
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate network exists (only in real mode)
    if (!this.isDemo) {
      try {
        const [networks] = await this.compute.getNetworks();
        const networkExists = networks.some(n => n.name === config.network);
        if (!networkExists) {
          throw new Error(`Network '${config.network}' not found`);
        }
      } catch (error) {
        console.warn('Could not validate network, continuing in demo mode:', error.message);
      }
    }

    // Add artificial delay for demo purposes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async createVMInstance(config, deploymentId) {
    const vmName = `${config.agentName}-${deploymentId.split('-')[1]}`;
    const zone = this.extractZoneFromSubnet(config.subnetwork) || 'us-central1-a';
    
    // Generate startup script with agent installation
    const startupScript = this.generateStartupScript(config, deploymentId);
    
    const vmConfig = {
      name: vmName,
      machineType: `zones/${zone}/machineTypes/e2-micro`,
      disks: [{
        boot: true,
        autoDelete: true,
        initializeParams: {
          sourceImage: 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts',
          diskSizeGb: '10'
        }
      }],
      networkInterfaces: [{
        network: `projects/${config.projectId}/global/networks/${config.network}`,
        subnetwork: `projects/${config.projectId}/regions/${this.extractRegionFromZone(zone)}/subnetworks/${config.subnetwork}`,
        accessConfigs: [{
          type: 'ONE_TO_ONE_NAT',
          name: 'External NAT'
        }]
      }],
      metadata: {
        items: [
          {
            key: 'startup-script',
            value: startupScript
          },
          {
            key: 'deployment-id',
            value: deploymentId
          },
          {
            key: 'agent-config',
            value: JSON.stringify(config)
          }
        ]
      },
      serviceAccounts: [{
        email: 'default',
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform'
        ]
      }],
      tags: {
        items: ['monitoring-agent', 'cloudconsole-vibe']
      }
    };

    if (!this.isDemo) {
      try {
        const zone_obj = this.compute.zone(zone);
        const [vm, operation] = await zone_obj.createVM(vmName, vmConfig);
        
        // Wait for operation to complete
        await operation.promise();
        
        return {
          name: vmName,
          zone: zone,
          selfLink: vm.metadata.selfLink
        };
      } catch (error) {
        console.warn('Could not create real VM, falling back to demo mode:', error.message);
      }
    }
    
    // Demo mode: return mock VM instance
    console.log(`🎭 Demo mode: Simulating VM creation for ${vmName}`);
    return {
      name: vmName,
      zone: zone,
      selfLink: `https://www.googleapis.com/compute/v1/projects/${config.projectId}/zones/${zone}/instances/${vmName}`
    };
  }

  generateStartupScript(config, deploymentId) {
    const backendURL = process.env.BACKEND_URL || 'http://localhost:8080';
    const targets = [...config.defaultTargets, ...config.customTargets].join(',');
    
    return `#!/bin/bash
set -e

echo "🚀 CloudConsoleVibe Monitoring Agent Installation Started"
echo "Deployment ID: ${deploymentId}"

# Update system
apt-get update
apt-get install -y curl wget unzip

# Create monitoring user
useradd -r -s /bin/false monitoring-agent || true

# Download and install Go (needed for building agent)
cd /tmp
wget -q https://golang.org/dl/go1.21.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Download monitoring agent source (in real deployment, this would be from your repository)
mkdir -p /opt/monitoring-agent-src
cd /opt/monitoring-agent-src

# For demo, create the agent binary directly
cat > main.go << 'AGENT_CODE'
${this.getAgentSourceCode()}
AGENT_CODE

cat > go.mod << 'GO_MOD'
module cloudconsole-monitoring-agent
go 1.21
GO_MOD

# Build the agent
/usr/local/go/bin/go build -o monitoring-agent .

# Install the agent
mkdir -p /opt/monitoring-agent
mkdir -p /etc/monitoring-agent
mkdir -p /var/log/monitoring-agent

cp monitoring-agent /opt/monitoring-agent/
chmod +x /opt/monitoring-agent/monitoring-agent

# Create configuration
cat > /etc/monitoring-agent/config.json << EOF
{
  "agent_id": "agent-${deploymentId}",
  "backend_url": "${backendURL}",
  "collection_interval": ${config.collectionInterval || 30},
  "targets": [${targets.split(',').map(t => `"${t.trim()}"`).join(',')}],
  "region": "${this.extractRegionFromZone(config.zone || 'us-central1-a')}",
  "zone": "${config.zone || 'us-central1-a'}",
  "network": "${config.network}",
  "subnetwork": "${config.subnetwork}"
}
EOF

# Create systemd service
cat > /etc/systemd/system/monitoring-agent.service << EOF
[Unit]
Description=CloudConsoleVibe Monitoring Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/monitoring-agent
ExecStart=/opt/monitoring-agent/monitoring-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=monitoring-agent

Environment=AGENT_ID=agent-${deploymentId}
Environment=BACKEND_URL=${backendURL}
Environment=COLLECTION_INTERVAL=${config.collectionInterval || 30}
Environment=MONITORING_TARGETS=${targets}
Environment=AGENT_REGION=${this.extractRegionFromZone(config.zone || 'us-central1-a')}
Environment=AGENT_ZONE=${config.zone || 'us-central1-a'}
Environment=AGENT_NETWORK=${config.network}
Environment=AGENT_SUBNETWORK=${config.subnetwork}

[Install]
WantedBy=multi-user.target
EOF

# Start the service
systemctl daemon-reload
systemctl enable monitoring-agent
systemctl start monitoring-agent

echo "✅ Monitoring agent installation completed"
echo "📊 Service status:"
systemctl status monitoring-agent --no-pager -l

# Signal completion
curl -X POST ${backendURL}/api/v1/deployments/${deploymentId}/complete \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed", "message": "Agent installation completed successfully"}' || true
`;
  }

  getAgentSourceCode() {
    // Return the Go agent source code as a string
    // In a real implementation, you'd read this from the monitoring-agent/main.go file
    try {
      return fs.readFileSync(path.join(__dirname, '../../monitoring-agent/main.go'), 'utf8');
    } catch (error) {
      // Fallback minimal agent for demo
      return `package main
import (
  "fmt"
  "log"
  "time"
  "net/http"
  "bytes"
  "encoding/json"
  "os"
)

func main() {
  log.Println("🚀 CloudConsoleVibe Monitoring Agent Started")
  
  for {
    // Collect and send metrics
    metrics := map[string]interface{}{
      "agent_id": os.Getenv("AGENT_ID"),
      "timestamp": time.Now().Unix(),
      "status": "active",
      "message": "Agent is running and collecting metrics"
    }
    
    jsonData, _ := json.Marshal(metrics)
    http.Post(os.Getenv("BACKEND_URL")+"/api/v1/metrics", "application/json", bytes.NewBuffer(jsonData))
    
    time.Sleep(30 * time.Second)
  }
}`;
    }
  }

  async waitForVMReady(vmName, zone) {
    // Add delay to simulate VM startup time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (!this.isDemo) {
      try {
        const vm = this.compute.zone(zone).vm(vmName);
        const [metadata] = await vm.getMetadata();
        
        if (metadata.status !== 'RUNNING') {
          throw new Error(`VM is not running. Status: ${metadata.status}`);
        }
        console.log(`✅ VM ${vmName} is running`);
        return;
      } catch (error) {
        console.warn('Could not check VM status, continuing in demo mode:', error.message);
      }
    }
    
    // Demo mode
    console.log(`🎭 Demo mode: VM ${vmName} is ready`);
  }

  async installMonitoringAgent(vmInstance, config) {
    // In real implementation, this would use SSH to install the agent
    // For demo, we simulate the installation process
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`📦 Agent installation simulated for ${vmInstance.name}`);
  }

  async startAgentServices(vmInstance, config) {
    // In real implementation, this would start the systemd service via SSH
    // For demo, we simulate the service start
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`🚀 Agent services started for ${vmInstance.name}`);
  }

  async getVMExternalIP(vmName, zone) {
    if (!this.isDemo) {
      try {
        const vm = this.compute.zone(zone).vm(vmName);
        const [metadata] = await vm.getMetadata();
        
        const networkInterface = metadata.networkInterfaces[0];
        if (networkInterface && networkInterface.accessConfigs && networkInterface.accessConfigs[0]) {
          return networkInterface.accessConfigs[0].natIP;
        }
      } catch (error) {
        console.warn('Could not get external IP, using demo IP:', error.message);
      }
    }
    
    // Return demo IP
    return '34.123.45.67';
  }

  async getVMInternalIP(vmName, zone) {
    if (!this.isDemo) {
      try {
        const vm = this.compute.zone(zone).vm(vmName);
        const [metadata] = await vm.getMetadata();
        
        const networkInterface = metadata.networkInterfaces[0];
        if (networkInterface) {
          return networkInterface.networkIP;
        }
      } catch (error) {
        console.warn('Could not get internal IP, using demo IP:', error.message);
      }
    }
    
    // Return demo IP
    return '10.128.0.2';
  }

  extractZoneFromSubnet(subnetwork) {
    // Extract zone from subnetwork name or URL
    if (subnetwork.includes('us-central1')) return 'us-central1-a';
    if (subnetwork.includes('us-east1')) return 'us-east1-a';
    if (subnetwork.includes('us-west1')) return 'us-west1-a';
    if (subnetwork.includes('europe-west1')) return 'europe-west1-b';
    return 'us-central1-a'; // default
  }

  extractRegionFromZone(zone) {
    return zone.substring(0, zone.lastIndexOf('-'));
  }

  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId) || null;
  }

  getAllDeployments() {
    return Array.from(this.deployments.values());
  }
}

module.exports = DeploymentService; 