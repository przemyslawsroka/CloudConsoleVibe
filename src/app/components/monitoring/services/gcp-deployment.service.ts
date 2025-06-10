import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GcpRegion {
  name: string;
  displayName: string;
  zones: string[];
}

export interface GcpMachineType {
  name: string;
  displayName: string;
  cpus: number;
  memory: number;
  cost: string;
}

export interface DeploymentConfig {
  name: string;
  description?: string;
  region: string;
  zone?: string;
  machineType: string;
  deploymentType: 'compute-engine' | 'gke' | 'cloud-run-jobs';
  networkConfig: {
    vpc?: string;
    subnet?: string;
    firewall: string[];
  };
  agentConfig: {
    version: string;
    targets: string[];
    collection_interval: number;
    transmission_interval: number;
  };
  scheduling?: {
    preemptible: boolean;
    automaticRestart: boolean;
  };
}

export interface DeploymentJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: string;
  region: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error?: string;
  progress: number;
  logs: string[];
  resources?: {
    instance_id?: string;
    external_ip?: string;
    internal_ip?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GcpDeploymentService {
  private baseUrl = environment.apiBaseUrl || 'https://cloudconsolevibe-backend-931553324054.us-central1.run.app';

  constructor(private http: HttpClient) {}

  // GCP Resource Discovery
  getRegions(): Observable<GcpRegion[]> {
    return this.http.get<GcpRegion[]>(`${this.baseUrl}/api/v1/gcp/regions`);
  }

  getZones(region: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/api/v1/gcp/regions/${region}/zones`);
  }

  getMachineTypes(region: string): Observable<GcpMachineType[]> {
    return this.http.get<GcpMachineType[]>(`${this.baseUrl}/api/v1/gcp/regions/${region}/machine-types`);
  }

  getNetworks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/v1/gcp/networks`);
  }

  getSubnets(network: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/v1/gcp/networks/${network}/subnets`);
  }

  // Deployment Management
  deployAgent(config: DeploymentConfig): Observable<DeploymentJob> {
    return this.http.post<DeploymentJob>(`${this.baseUrl}/api/v1/gcp/deploy`, config);
  }

  getDeployments(): Observable<DeploymentJob[]> {
    return this.http.get<DeploymentJob[]>(`${this.baseUrl}/api/v1/gcp/deployments`);
  }

  getDeployment(deploymentId: string): Observable<DeploymentJob> {
    return this.http.get<DeploymentJob>(`${this.baseUrl}/api/v1/gcp/deployments/${deploymentId}`);
  }

  cancelDeployment(deploymentId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/gcp/deployments/${deploymentId}/cancel`, {});
  }

  deleteDeployment(deploymentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/v1/gcp/deployments/${deploymentId}`);
  }

  // Compute Engine specific methods
  deployToComputeEngine(config: DeploymentConfig): Observable<DeploymentJob> {
    const ceConfig: DeploymentConfig = {
      ...config,
      deploymentType: 'compute-engine' as const
    };
    return this.deployAgent(ceConfig);
  }

  // GKE specific methods  
  deployToGKE(config: DeploymentConfig & { 
    cluster: string;
    namespace?: string;
    replicas?: number;
  }): Observable<DeploymentJob> {
    const gkeConfig: DeploymentConfig = {
      ...config,
      deploymentType: 'gke' as const
    };
    return this.deployAgent(gkeConfig);
  }

  // Cloud Run Jobs specific methods
  deployToCloudRunJobs(config: DeploymentConfig & {
    schedule?: string;
    maxRetries?: number;
    timeout?: string;
  }): Observable<DeploymentJob> {
    const crConfig: DeploymentConfig = {
      ...config,
      deploymentType: 'cloud-run-jobs' as const
    };
    return this.deployAgent(crConfig);
  }

  // Instance Management
  getInstances(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/v1/gcp/instances`);
  }

  getInstance(instanceId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/gcp/instances/${instanceId}`);
  }

  startInstance(instanceId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/gcp/instances/${instanceId}/start`, {});
  }

  stopInstance(instanceId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/gcp/instances/${instanceId}/stop`, {});
  }

  deleteInstance(instanceId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/v1/gcp/instances/${instanceId}`);
  }

  // Template Generation
  generateStartupScript(agentConfig: any): string {
    return `#!/bin/bash

# Install dependencies
apt-get update
apt-get install -y curl wget unzip

# Create monitoring user
useradd -r -s /bin/false monitoring-agent

# Download and install monitoring agent
cd /opt
wget https://github.com/your-org/cloud-monitoring-agent/releases/latest/download/monitoring-agent-linux.tar.gz
tar -xzf monitoring-agent-linux.tar.gz
chmod +x monitoring-agent

# Create configuration
cat > /etc/monitoring-agent.yaml << 'EOF'
backend:
  url: "${this.baseUrl}/api/v1"
  websocket_url: "${this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws"

collection:
  interval: ${agentConfig.collection_interval}s
  transmission_interval: ${agentConfig.transmission_interval}s

targets:
  ping:${agentConfig.targets.map((t: string) => `\n    - "${t}"`).join('')}

log:
  level: info
  file: /var/log/monitoring-agent.log
EOF

# Create systemd service
cat > /etc/systemd/system/monitoring-agent.service << 'EOF'
[Unit]
Description=Cloud Monitoring Agent
After=network.target

[Service]
Type=simple
User=monitoring-agent
ExecStart=/opt/monitoring-agent --config /etc/monitoring-agent.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable monitoring-agent
systemctl start monitoring-agent
`;
  }

  generateKubernetesManifest(config: DeploymentConfig): string {
    return `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-agent-${config.name}
  namespace: ${(config as any).namespace || 'default'}
spec:
  replicas: ${(config as any).replicas || 1}
  selector:
    matchLabels:
      app: monitoring-agent
      deployment: ${config.name}
  template:
    metadata:
      labels:
        app: monitoring-agent
        deployment: ${config.name}
    spec:
      containers:
      - name: monitoring-agent
        image: gcr.io/your-project/monitoring-agent:${config.agentConfig.version}
        env:
        - name: BACKEND_URL
          value: "${this.baseUrl}/api/v1"
        - name: WEBSOCKET_URL
          value: "${this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws"
        - name: COLLECTION_INTERVAL
          value: "${config.agentConfig.collection_interval}s"
        - name: TRANSMISSION_INTERVAL
          value: "${config.agentConfig.transmission_interval}s"
        - name: PING_TARGETS
          value: "${config.agentConfig.targets.join(',')}"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-agent-config-${config.name}
  namespace: ${(config as any).namespace || 'default'}
data:
  config.yaml: |
    backend:
      url: "${this.baseUrl}/api/v1"
      websocket_url: "${this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws"
    collection:
      interval: ${config.agentConfig.collection_interval}s
      transmission_interval: ${config.agentConfig.transmission_interval}s
    targets:
      ping:${config.agentConfig.targets.map(t => `\n        - "${t}"`).join('')}
`;
  }

  // Cost Estimation
  estimateCost(config: DeploymentConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/gcp/estimate-cost`, config);
  }

  // Validation
  validateDeploymentConfig(config: DeploymentConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/v1/gcp/validate-config`, config);
  }
} 