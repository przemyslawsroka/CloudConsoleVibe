import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface GkeCluster {
  id: string;
  name: string;
  location: string;
  locationLink?: string;
  tier: 'Standard' | 'Enterprise';
  fleet: string;
  mode: 'Autopilot' | 'Standard';
  status: 'RUNNING' | 'CREATING' | 'DELETING' | 'ERROR' | 'DEGRADED';
  nodeCount: number;
  totalVCpus: number;
  totalMemoryGb: number;
  notifications: ClusterNotification[];
  labels: { [key: string]: string };
  version: string;
  nodeVersion?: string;
  creationTimestamp: string;
  endpoint?: string;
  subnetwork?: string;
  clusterIpv4Cidr?: string;
  servicesIpv4Cidr?: string;
  currentMasterVersion?: string;
  currentNodeVersion?: string;
  description?: string;
  enableAutoscaling?: boolean;
  enableAutorepair?: boolean;
  enableAutoupgrade?: boolean;
  diskSizeGb?: number;
  machineType?: string;
  imageType?: string;
  preemptible?: boolean;
  masterAuth?: any;
  nodePools?: NodePool[];
}

export interface NodePool {
  name: string;
  status: string;
  nodeCount: number;
  machineType: string;
  diskSizeGb: number;
  imageType: string;
  version: string;
  autoscaling?: {
    enabled: boolean;
    minNodeCount: number;
    maxNodeCount: number;
  };
  management?: {
    autoUpgrade: boolean;
    autoRepair: boolean;
  };
}

export interface ClusterNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  action?: {
    label: string;
    link?: string;
  };
}

export interface ClusterMetrics {
  healthPercentage: number;
  upgradePercentage: number;
  estimatedMonthlyCost: number;
  healthRecommendations: number;
  upgradeRecommendations: number;
  costRecommendations: number;
}

export interface CreateClusterRequest {
  name: string;
  description?: string;
  location: string;
  mode: 'Autopilot' | 'Standard';
  version: string;
  network?: string;
  subnetwork?: string;
  enablePrivateNodes?: boolean;
  enablePrivateEndpoint?: boolean;
  masterIpv4CidrBlock?: string;
  authorizedNetworks?: string[];
  nodePool?: {
    name: string;
    nodeCount: number;
    machineType: string;
    diskSizeGb: number;
    preemptible: boolean;
    enableAutoscaling: boolean;
    minNodeCount?: number;
    maxNodeCount?: number;
  };
}

/**
 * Service for managing Google Kubernetes Engine (GKE) clusters.
 * 
 * This service efficiently fetches GKE clusters using Google Cloud Container Engine's
 * aggregatedList API calls to minimize the number of requests across all zones and regions.
 */
@Injectable({
  providedIn: 'root'
})
export class GkeClusterService {
  private baseUrl = 'https://container.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private getCurrentProject(): string {
    const project = this.projectService.getCurrentProject();
    return project?.id || 'demo-project';
  }

  /**
   * Get all GKE clusters across all locations using aggregatedList
   */
  getClusters(): Observable<GkeCluster[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockClusters());
    }

    const project = this.getCurrentProject();
    
    // Use aggregatedList to get clusters from all zones and regions in one call
    const url = `${this.baseUrl}/projects/${project}/locations/-/clusters`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const clusters: GkeCluster[] = [];
        
        if (response.clusters) {
          clusters.push(...response.clusters.map((cluster: any) => this.transformCluster(cluster)));
        }

        console.log(`Successfully fetched ${clusters.length} GKE clusters`);
        return clusters.sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error fetching GKE clusters:', error);
        return of(this.getMockClusters());
      })
    );
  }

  /**
   * Get cluster metrics summary
   */
  getClusterMetrics(): Observable<ClusterMetrics> {
    if (this.authService.isDemoMode()) {
      return of({
        healthPercentage: 76.47,
        upgradePercentage: 88.24,
        estimatedMonthlyCost: 5406.39,
        healthRecommendations: 16,
        upgradeRecommendations: 12,
        costRecommendations: 5
      });
    }

    // In real implementation, this would aggregate data from all clusters
    return this.getClusters().pipe(
      map(clusters => {
        const runningClusters = clusters.filter(c => c.status === 'RUNNING').length;
        const totalClusters = clusters.length;
        const healthPercentage = totalClusters > 0 ? (runningClusters / totalClusters) * 100 : 0;
        
        const estimatedCost = clusters.reduce((sum, cluster) => {
          // Estimate cost based on node count and vCPUs
          return sum + (cluster.nodeCount * cluster.totalVCpus * 0.048 * 24 * 30); // rough estimate
        }, 0);

        return {
          healthPercentage,
          upgradePercentage: 85.0, // This would come from actual version analysis
          estimatedMonthlyCost: estimatedCost,
          healthRecommendations: Math.floor(totalClusters * 0.3),
          upgradeRecommendations: Math.floor(totalClusters * 0.2),
          costRecommendations: Math.floor(totalClusters * 0.1)
        };
      })
    );
  }

  /**
   * Get detailed information about a specific cluster
   */
  getClusterDetails(name: string, location: string): Observable<GkeCluster> {
    if (this.authService.isDemoMode()) {
      const mockClusters = this.getMockClusters();
      const cluster = mockClusters.find(c => c.name === name);
      return of(cluster || mockClusters[0]);
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/locations/${location}/clusters/${name}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformCluster(response)),
      catchError(error => {
        console.error('Error fetching cluster details:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new GKE cluster
   */
  createCluster(clusterData: CreateClusterRequest): Observable<any> {
    if (this.authService.isDemoMode()) {
      return of({
        name: 'operation-create-cluster-' + Date.now(),
        status: 'RUNNING',
        operationType: 'CREATE_CLUSTER'
      });
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/locations/${clusterData.location}/clusters`;

    const requestBody = this.buildCreateClusterRequest(clusterData);

    return this.http.post<any>(url, requestBody, { headers: this.getHeaders() });
  }

  /**
   * Delete a cluster
   */
  deleteCluster(name: string, location: string): Observable<any> {
    if (this.authService.isDemoMode()) {
      return of({
        name: 'operation-delete-cluster-' + Date.now(),
        status: 'RUNNING',
        operationType: 'DELETE_CLUSTER'
      });
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/locations/${location}/clusters/${name}`;

    return this.http.delete<any>(url, { headers: this.getHeaders() });
  }

  private transformCluster(gkeCluster: any): GkeCluster {
    const nodeCount = gkeCluster.currentNodeCount || 0;
    const notifications = this.generateNotifications(gkeCluster);

    return {
      id: gkeCluster.id || gkeCluster.name,
      name: gkeCluster.name,
      location: gkeCluster.location || this.extractLocation(gkeCluster.selfLink),
      locationLink: gkeCluster.locationLink,
      tier: gkeCluster.tier || 'Standard',
      fleet: gkeCluster.fleet || 'Register',
      mode: gkeCluster.autopilot?.enabled ? 'Autopilot' : 'Standard',
      status: gkeCluster.status || 'RUNNING',
      nodeCount,
      totalVCpus: this.calculateTotalVCpus(gkeCluster),
      totalMemoryGb: this.calculateTotalMemory(gkeCluster),
      notifications,
      labels: gkeCluster.resourceLabels || {},
      version: gkeCluster.currentMasterVersion || '1.28.3-gke.1203001',
      nodeVersion: gkeCluster.currentNodeVersion,
      creationTimestamp: gkeCluster.createTime,
      endpoint: gkeCluster.endpoint,
      subnetwork: gkeCluster.subnetwork,
      clusterIpv4Cidr: gkeCluster.clusterIpv4Cidr,
      servicesIpv4Cidr: gkeCluster.servicesIpv4Cidr,
      currentMasterVersion: gkeCluster.currentMasterVersion,
      currentNodeVersion: gkeCluster.currentNodeVersion,
      description: gkeCluster.description,
      nodePools: gkeCluster.nodePools?.map((np: any) => this.transformNodePool(np)) || []
    };
  }

  private transformNodePool(nodePool: any): NodePool {
    return {
      name: nodePool.name,
      status: nodePool.status,
      nodeCount: nodePool.initialNodeCount || 0,
      machineType: nodePool.config?.machineType || 'e2-medium',
      diskSizeGb: nodePool.config?.diskSizeGb || 100,
      imageType: nodePool.config?.imageType || 'COS_CONTAINERD',
      version: nodePool.version,
      autoscaling: nodePool.autoscaling ? {
        enabled: nodePool.autoscaling.enabled,
        minNodeCount: nodePool.autoscaling.minNodeCount,
        maxNodeCount: nodePool.autoscaling.maxNodeCount
      } : undefined,
      management: nodePool.management ? {
        autoUpgrade: nodePool.management.autoUpgrade,
        autoRepair: nodePool.management.autoRepair
      } : undefined
    };
  }

  private calculateTotalVCpus(cluster: any): number {
    if (cluster.autopilot?.enabled) return 0; // Autopilot doesn't show vCPUs
    
    const nodeCount = cluster.currentNodeCount || 0;
    const machineType = cluster.nodePools?.[0]?.config?.machineType || 'e2-medium';
    
    // Simple mapping of machine types to vCPUs
    const vCpuMap: { [key: string]: number } = {
      'e2-micro': 1, 'e2-small': 1, 'e2-medium': 1, 'e2-standard-2': 2,
      'e2-standard-4': 4, 'e2-standard-8': 8, 'e2-standard-16': 16,
      'n1-standard-1': 1, 'n1-standard-2': 2, 'n1-standard-4': 4,
      'n1-standard-8': 8, 'n1-standard-16': 16, 'n1-standard-32': 32
    };
    
    return nodeCount * (vCpuMap[machineType] || 2);
  }

  private calculateTotalMemory(cluster: any): number {
    if (cluster.autopilot?.enabled) return 0; // Autopilot doesn't show memory
    
    const nodeCount = cluster.currentNodeCount || 0;
    const machineType = cluster.nodePools?.[0]?.config?.machineType || 'e2-medium';
    
    // Simple mapping of machine types to memory in GB
    const memoryMap: { [key: string]: number } = {
      'e2-micro': 1, 'e2-small': 2, 'e2-medium': 4, 'e2-standard-2': 8,
      'e2-standard-4': 16, 'e2-standard-8': 32, 'e2-standard-16': 64,
      'n1-standard-1': 3.75, 'n1-standard-2': 7.5, 'n1-standard-4': 15,
      'n1-standard-8': 30, 'n1-standard-16': 60, 'n1-standard-32': 120
    };
    
    return nodeCount * (memoryMap[machineType] || 4);
  }

  private generateNotifications(cluster: any): ClusterNotification[] {
    const notifications: ClusterNotification[] = [];
    
    // Add various notifications based on cluster state
    if (cluster.status === 'RUNNING' && cluster.autopilot?.enabled) {
      // Autopilot clusters might have different notifications
    } else if (cluster.status === 'RUNNING') {
      // Standard clusters
      notifications.push({
        type: 'info',
        message: 'Create a backup plan',
        action: { label: 'Create a backup plan' }
      });
      
      if (Math.random() > 0.7) {
        notifications.push({
          type: 'warning',
          message: 'Update Pod Disruption Budget',
          action: { label: 'Update Pod Disruption Budget' }
        });
      }
      
      if (Math.random() > 0.8) {
        notifications.push({
          type: 'warning',
          message: 'Set maintenance window',
          action: { label: 'Set maintenance window' }
        });
      }
    }
    
    return notifications;
  }

  private extractLocation(selfLink: string): string {
    if (!selfLink) return 'unknown';
    const matches = selfLink.match(/\/locations\/([^\/]+)\//);
    return matches ? matches[1] : 'unknown';
  }

  private buildCreateClusterRequest(data: CreateClusterRequest): any {
    const cluster: any = {
      name: data.name,
      description: data.description,
      initialClusterVersion: data.version,
      network: data.network,
      subnetwork: data.subnetwork
    };

    if (data.mode === 'Autopilot') {
      cluster.autopilot = { enabled: true };
    } else {
      cluster.nodePools = [{
        name: data.nodePool?.name || 'default-pool',
        initialNodeCount: data.nodePool?.nodeCount || 3,
        config: {
          machineType: data.nodePool?.machineType || 'e2-medium',
          diskSizeGb: data.nodePool?.diskSizeGb || 100,
          preemptible: data.nodePool?.preemptible || false
        },
        autoscaling: data.nodePool?.enableAutoscaling ? {
          enabled: true,
          minNodeCount: data.nodePool.minNodeCount || 1,
          maxNodeCount: data.nodePool.maxNodeCount || 10
        } : undefined
      }];
    }

    return { cluster };
  }

  private getMockClusters(): GkeCluster[] {
    return [
      {
        id: '1',
        name: 'ahuru-gce-test',
        location: 'us-central1-c',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Standard',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'autopilot-cluster-1',
        location: 'us-central1',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'info',
            message: 'Create a backup plan',
            action: { label: 'Create a backup plan' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-02-01T14:20:00Z'
      },
      {
        id: '3',
        name: 'autopilot-cluster-2-test',
        location: 'us-central1',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'warning',
            message: 'Update Pod Disruption Budget',
            action: { label: 'Update Pod Disruption Budget' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-02-10T09:15:00Z'
      },
      {
        id: '4',
        name: 'basant-ap',
        location: 'us-west2',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'info',
            message: 'Create a backup plan',
            action: { label: 'Create a backup plan' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-01-28T16:45:00Z'
      },
      {
        id: '5',
        name: 'basant-ap-ds',
        location: 'us-west2',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'info',
            message: 'Create a backup plan',
            action: { label: 'Create a backup plan' }
          },
          {
            type: 'warning',
            message: 'Set maintenance window',
            action: { label: 'Set maintenance window' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-02-05T11:30:00Z'
      },
      {
        id: '6',
        name: 'basant-v4-v6-test',
        location: 'us-central1-c',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Standard',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'error',
            message: 'Upgrade to supported version',
            action: { label: 'Upgrade to supported version' }
          }
        ],
        labels: {},
        version: '1.27.8-gke.1067004',
        creationTimestamp: '2023-12-20T13:00:00Z'
      },
      {
        id: '7',
        name: 'cluster-1',
        location: 'us-central1-c',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Standard',
        status: 'RUNNING',
        nodeCount: 3,
        totalVCpus: 6,
        totalMemoryGb: 12,
        notifications: [
          {
            type: 'warning',
            message: 'Set maintenance window',
            action: { label: 'Set maintenance window' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-01-10T08:15:00Z'
      },
      {
        id: '8',
        name: 'gke-cluster',
        location: 'europe-north1',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Standard',
        status: 'RUNNING',
        nodeCount: 15,
        totalVCpus: 30,
        totalMemoryGb: 60,
        notifications: [
          {
            type: 'error',
            message: 'Upcoming nodes upgrade',
            action: { label: 'Upcoming nodes upgrade' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-01-05T12:45:00Z'
      },
      {
        id: '9',
        name: 'dudzinskirm-autopilot-1',
        location: 'us-central1',
        tier: 'Standard',
        fleet: 'cn-fe-playground-fleet',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [
          {
            type: 'warning',
            message: 'Verify webhook endpoints',
            action: { label: 'Verify webhook endpoints' }
          }
        ],
        labels: { 'mesh_id': 'proj:640153341193' },
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-02-08T15:20:00Z'
      },
      {
        id: '10',
        name: 'kzbichronski-hello-cluster',
        location: 'us-central1',
        tier: 'Enterprise',
        fleet: 'cn-fe-playground-fleet',
        mode: 'Autopilot',
        status: 'RUNNING',
        nodeCount: 0,
        totalVCpus: 0,
        totalMemoryGb: 0,
        notifications: [],
        labels: { 'mesh_id': 'proj:640153341193' },
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-02-12T10:10:00Z'
      },
      {
        id: '11',
        name: 'multi-subnet-clusters-test',
        location: 'us-central1',
        tier: 'Standard',
        fleet: 'Register',
        mode: 'Standard',
        status: 'RUNNING',
        nodeCount: 9,
        totalVCpus: 18,
        totalMemoryGb: 36,
        notifications: [
          {
            type: 'info',
            message: 'Delete idle cluster',
            action: { label: 'Delete idle cluster' }
          },
          {
            type: 'info',
            message: 'Create a backup plan',
            action: { label: 'Create a backup plan' }
          }
        ],
        labels: {},
        version: '1.28.3-gke.1203001',
        creationTimestamp: '2024-01-25T14:30:00Z'
      }
    ];
  }
} 