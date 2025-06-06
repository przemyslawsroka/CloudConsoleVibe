import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface NetworkHealthMonitor {
  name: string;
  source: {
    type: 'subnetwork' | 'instance' | 'region';
    subnetwork?: string;
    instance?: string;
    region?: string;
    project?: string;
  };
  destination: {
    type: 'subnetwork' | 'instance' | 'region';
    subnetwork?: string;
    instance?: string;
    region?: string;
    project?: string;
  };
  googleNetworkStatus: 'Healthy' | 'Unhealthy' | 'Unknown';
  customerNetworkStatus: 'Operational' | 'Anomaly Detected' | 'Configuration Issue' | 'Network Failure' | 'Unknown';
  packetHeaderConfig?: {
    protocol?: string;
    ports?: number[];
    additionalHeaders?: any;
  };
  createdAt?: string;
  lastUpdated?: string;
}

export interface MonitoringTechnique {
  name: string;
  status: 'Healthy' | 'Warning' | 'Error' | 'Unknown';
  description: string;
  metrics?: any[];
}

export interface MonitorObservations {
  googleInfrastructure: {
    status: 'No issues found' | 'Issues detected';
    message: string;
  };
  sampledTraffic: MonitoringTechnique;
  configAnalysis: MonitoringTechnique;
  syntheticTraffic: MonitoringTechnique;
  trafficData?: {
    timestamp: Date;
    volume: number;
    latency: number;
  }[];
  anomalies?: {
    timestamp: Date;
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class NetworkHealthMonitorService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Create a new network health monitor
  createHealthMonitor(projectId: string, monitor: NetworkHealthMonitor): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networkHealthMonitors`;
    
    // Mock implementation
    return of({
      ...monitor,
      name: `projects/${projectId}/global/networkHealthMonitors/${monitor.name}`,
      googleNetworkStatus: 'Healthy',
      customerNetworkStatus: 'Operational',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }).pipe(
      catchError(error => {
        console.error('Error creating network health monitor:', error);
        throw error;
      })
    );
  }

  // Get all network health monitors for a project
  getHealthMonitors(projectId: string): Observable<NetworkHealthMonitor[]> {
    // Mock data based on the screenshots
    return of([
      {
        name: 'us-eu-monitor',
        source: {
          type: 'subnetwork',
          subnetwork: 'us-central-1',
          project: 'prod-gcp-1'
        },
        destination: {
          type: 'subnetwork',
          subnetwork: 'eu-west-1',
          project: 'prod-gcp-1'
        },
        googleNetworkStatus: 'Healthy',
        customerNetworkStatus: 'Operational',
        createdAt: '2024-01-15T10:30:00Z',
        lastUpdated: '2024-01-15T15:45:00Z'
      },
      {
        name: 'on-prem-to-db',
        source: {
          type: 'instance',
          instance: '35.208.158.96'
        },
        destination: {
          type: 'instance',
          instance: '35.208.158.96'
        },
        googleNetworkStatus: 'Healthy',
        customerNetworkStatus: 'Anomaly Detected',
        createdAt: '2024-01-14T09:15:00Z',
        lastUpdated: '2024-01-15T14:20:00Z'
      },
      {
        name: 'eu-asia-monitor',
        source: {
          type: 'subnetwork',
          subnetwork: 'eu-west-1',
          project: 'prod-gcp-1'
        },
        destination: {
          type: 'subnetwork',
          subnetwork: 'asia-east-1',
          project: 'prod-gcp-1'
        },
        googleNetworkStatus: 'Healthy',
        customerNetworkStatus: 'Configuration Issue',
        createdAt: '2024-01-13T14:00:00Z',
        lastUpdated: '2024-01-15T16:10:00Z'
      },
      {
        name: 'us-asia-monitor',
        source: {
          type: 'subnetwork',
          subnetwork: 'us-central-1',
          project: 'prod-gcp-1'
        },
        destination: {
          type: 'subnetwork',
          subnetwork: 'asia-east-1',
          project: 'prod-gcp-1'
        },
        googleNetworkStatus: 'Unhealthy',
        customerNetworkStatus: 'Network Failure',
        createdAt: '2024-01-12T11:30:00Z',
        lastUpdated: '2024-01-15T13:55:00Z'
      },
      {
        name: 'us-asia2-monitor',
        source: {
          type: 'subnetwork',
          subnetwork: 'us-central-1',
          project: 'prod-gcp-1'
        },
        destination: {
          type: 'subnetwork',
          subnetwork: 'asia-east-2',
          project: 'prod-gcp-1'
        },
        googleNetworkStatus: 'Unhealthy',
        customerNetworkStatus: 'Network Failure',
        createdAt: '2024-01-12T08:45:00Z',
        lastUpdated: '2024-01-15T12:30:00Z'
      }
    ]);
  }

  // Get detailed observations for a specific monitor
  getMonitorObservations(projectId: string, monitorName: string): Observable<MonitorObservations> {
    // Generate mock data based on monitor name and current conditions
    const mockTrafficData = this.generateMockTrafficData();
    const mockAnomalies = this.generateMockAnomalies(monitorName);
    
    return of({
      googleInfrastructure: {
        status: 'No issues found',
        message: 'Google Infrastructure - No issues found'
      },
      sampledTraffic: {
        name: 'Sampled Traffic',
        status: monitorName.includes('asia') ? 'Warning' : 'Healthy',
        description: 'Uses ML on traffic from the last 28 days (volume, latency, loss, throttling) to identify issues, with tunable thresholds.',
        metrics: mockTrafficData
      },
      configAnalysis: {
        name: 'Config Analysis',
        status: monitorName.includes('eu-asia') ? 'Error' : 'Healthy',
        description: 'Identifies potential network setup issues through intelligent configuration checks.',
        metrics: []
      },
      syntheticTraffic: {
        name: 'Synthetic Traffic',
        status: 'Healthy',
        description: 'Measures latency and packet loss between locations, even without traffic.',
        metrics: []
      },
      trafficData: mockTrafficData,
      anomalies: mockAnomalies
    });
  }

  // Get available source and destination options
  getAvailableNetworkSources(projectId: string): Observable<any[]> {
    return of([
      {
        id: 'subnetwork-us-central1',
        name: 'prod-network (us-central1)',
        type: 'Subnetwork',
        region: 'us-central1',
        project: 'prod-gcp-1'
      },
      {
        id: 'subnetwork-eu-west1',
        name: 'prod-network (eu-west-1)',
        type: 'Subnetwork',
        region: 'eu-west-1',
        project: 'prod-gcp-1'
      },
      {
        id: 'subnetwork-asia-east1',
        name: 'prod-network (asia-east-1)',
        type: 'Subnetwork',
        region: 'asia-east-1',
        project: 'prod-gcp-1'
      },
      {
        id: 'subnetwork-asia-east2',
        name: 'prod-network (asia-east-2)',
        type: 'Subnetwork',
        region: 'asia-east-2',
        project: 'prod-gcp-1'
      }
    ]);
  }

  // Delete a network health monitor
  deleteHealthMonitor(projectId: string, monitorName: string): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networkHealthMonitors/${monitorName}`;
    
    return of({ success: true }).pipe(
      catchError(error => {
        console.error('Error deleting network health monitor:', error);
        throw error;
      })
    );
  }

  // Rerun monitor analysis
  rerunMonitor(projectId: string, monitorName: string): Observable<any> {
    return of({ success: true, message: 'Monitor analysis restarted' });
  }

  // Get recommendations for what to monitor
  getMonitoringRecommendations(projectId: string): Observable<any[]> {
    return of([
      {
        title: 'Cross-Region Connectivity',
        description: 'Monitor connectivity between your primary regions',
        priority: 'High',
        estimatedSetupTime: '5 minutes',
        suggestedSources: ['us-central1', 'eu-west1'],
        suggestedDestinations: ['asia-east1', 'asia-southeast1']
      },
      {
        title: 'Critical Application Paths',
        description: 'Monitor key application communication paths',
        priority: 'Medium', 
        estimatedSetupTime: '10 minutes',
        suggestedSources: ['web-tier-subnet'],
        suggestedDestinations: ['database-subnet']
      },
      {
        title: 'Hybrid Cloud Connectivity',
        description: 'Monitor on-premises to cloud connectivity',
        priority: 'High',
        estimatedSetupTime: '15 minutes',
        suggestedSources: ['on-prem-vpn-gateway'],
        suggestedDestinations: ['cloud-vpn-gateway']
      }
    ]);
  }

  // Generate mock traffic data for charts
  private generateMockTrafficData(): any[] {
    const data = [];
    const now = new Date();
    
    for (let i = 72; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // 72 hours ago to now
      data.push({
        timestamp,
        volume: 500 + Math.random() * 100 + (i < 10 ? Math.random() * 200 : 0), // Spike in recent hours
        latency: 20 + Math.random() * 10 + (i < 5 ? Math.random() * 15 : 0) // Latency spike in last 5 hours
      });
    }
    
    return data;
  }

  // Generate mock anomalies based on monitor name
  private generateMockAnomalies(monitorName: string): any[] {
    const anomalies = [];
    
    if (monitorName.includes('asia')) {
      anomalies.push({
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        type: 'Traffic Anomaly Detected',
        severity: 'medium' as const,
        description: 'Major traffic volume change detected - we identified major traffic volume change'
      });
    }
    
    if (monitorName.includes('eu-asia')) {
      anomalies.push({
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        type: 'Configuration Issue',
        severity: 'high' as const,
        description: 'Unreachable - we identified configuration problems with the connectivity'
      });
    }
    
    return anomalies;
  }

  // Validate monitor configuration
  validateMonitorConfig(config: any): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!config.name || config.name.length < 3) {
      errors.push('Monitor name must be at least 3 characters long');
    }
    
    if (!config.source || !config.source.type) {
      errors.push('Source configuration is required');
    }
    
    if (!config.destination || !config.destination.type) {
      errors.push('Destination configuration is required');
    }
    
    if (config.source && config.destination && 
        config.source.type === config.destination.type &&
        config.source.subnetwork === config.destination.subnetwork) {
      errors.push('Source and destination cannot be the same');
    }
    
    return of({
      valid: errors.length === 0,
      errors
    });
  }
} 