import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface AlloyDbCluster {
  name: string;
  displayName: string;
  uid: string;
  createTime: string;
  updateTime: string;
  deleteTime?: string;
  labels: { [key: string]: string };
  annotations: { [key: string]: string };
  state: 'STATE_UNSPECIFIED' | 'READY' | 'STOPPED' | 'EMPTY' | 'CREATING' | 'DELETING' | 'FAILED' | 'BOOTSTRAPPING' | 'MAINTENANCE';
  clusterType: 'CLUSTER_TYPE_UNSPECIFIED' | 'PRIMARY' | 'SECONDARY';
  networkConfig?: NetworkConfig;
  initialUser?: UserPassword;
  automatedBackupPolicy?: AutomatedBackupPolicy;
  sslConfig?: SslConfig;
  encryptionConfig?: EncryptionConfig;
  encryptionInfo?: EncryptionInfo;
  continuousBackupConfig?: ContinuousBackupConfig;
  continuousBackupInfo?: ContinuousBackupInfo;
  secondaryConfig?: SecondaryConfig;
  primaryConfig?: PrimaryConfig;
  etag: string;
  reconciling: boolean;
  location: string;
  project: string;
}

export interface AlloyDbInstance {
  name: string;
  displayName: string;
  uid: string;
  createTime: string;
  updateTime: string;
  deleteTime?: string;
  labels: { [key: string]: string };
  annotations: { [key: string]: string };
  state: 'STATE_UNSPECIFIED' | 'READY' | 'STOPPED' | 'CREATING' | 'DELETING' | 'MAINTENANCE' | 'FAILED' | 'BOOTSTRAPPING' | 'PROMOTING';
  instanceType: 'INSTANCE_TYPE_UNSPECIFIED' | 'PRIMARY' | 'READ_POOL' | 'SECONDARY';
  machineConfig?: MachineConfig;
  availabilityType: 'AVAILABILITY_TYPE_UNSPECIFIED' | 'ZONAL' | 'REGIONAL';
  gceZone?: string;
  databaseFlags: { [key: string]: string };
  writableNode?: Node;
  nodes?: Node[];
  queryInsightsConfig?: QueryInsightsConfig;
  readPoolConfig?: ReadPoolConfig;
  ipAddress: string;
  reconciling: boolean;
  etag: string;
  clientConnectionConfig?: ClientConnectionConfig;
  satisfiesPzs: boolean;
  cluster: string;
  location: string;
  project: string;
}

export interface NetworkConfig {
  network?: string;
  allocatedIpRange?: string;
}

export interface UserPassword {
  user: string;
  password: string;
}

export interface AutomatedBackupPolicy {
  weeklySchedule?: WeeklySchedule;
  timeBasedRetention?: TimeBasedRetention;
  quantityBasedRetention?: QuantityBasedRetention;
  enabled: boolean;
  backupWindow?: string;
  encryptionConfig?: EncryptionConfig;
  location?: string;
  labels?: { [key: string]: string };
}

export interface WeeklySchedule {
  startTimes: string[];
  daysOfWeek: string[];
}

export interface TimeBasedRetention {
  retentionPeriod: string;
}

export interface QuantityBasedRetention {
  count: number;
}

export interface SslConfig {
  sslMode: 'SSL_MODE_UNSPECIFIED' | 'SSL_MODE_ALLOW' | 'SSL_MODE_REQUIRE' | 'SSL_MODE_VERIFY_CA' | 'SSL_MODE_VERIFY_FULL';
  caSource: 'CA_SOURCE_UNSPECIFIED' | 'CA_SOURCE_MANAGED';
}

export interface EncryptionConfig {
  kmsKeyName?: string;
}

export interface EncryptionInfo {
  encryptionType: 'TYPE_UNSPECIFIED' | 'GOOGLE_DEFAULT_ENCRYPTION' | 'CUSTOMER_MANAGED_ENCRYPTION';
  kmsKeyVersions?: string[];
}

export interface ContinuousBackupConfig {
  enabled: boolean;
  recoveryWindowDays: number;
  encryptionConfig?: EncryptionConfig;
}

export interface ContinuousBackupInfo {
  encryptionInfo?: EncryptionInfo;
  enabledTime: string;
  schedule: string[];
  earliestRestorableTime: string;
}

export interface SecondaryConfig {
  primaryClusterNames: string[];
}

export interface PrimaryConfig {
  secondaryClusterNames: string[];
}

export interface MachineConfig {
  cpuCount: number;
}

export interface Node {
  zoneId: string;
  id: string;
  ip: string;
  state: string;
}

export interface QueryInsightsConfig {
  recordApplicationTags: boolean;
  recordClientAddress: boolean;
  queryStringLength: number;
  queryPlansPerMinute: number;
}

export interface ReadPoolConfig {
  nodeCount: number;
}

export interface ClientConnectionConfig {
  requireConnectors: boolean;
  sslConfig?: SslConfig;
}

@Injectable({
  providedIn: 'root'
})
export class AlloyDbService {
  private readonly baseUrl = 'https://alloydb.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  /**
   * Get all AlloyDB clusters
   */
  getClusters(): Observable<AlloyDbCluster[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockClusters());
    }

    const project = this.getCurrentProject();
    const locations = ['us-central1', 'us-east1', 'europe-west1', 'asia-east1']; // Common regions
    
    // For now, return mock data as the real API implementation would require proper authentication setup
    return of(this.getMockClusters()).pipe(
      catchError(error => {
        console.error('Error loading AlloyDB clusters:', error);
        return of(this.getMockClusters());
      })
    );
  }

  /**
   * Get all AlloyDB instances across all clusters
   */
  getInstances(): Observable<AlloyDbInstance[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockInstances());
    }

    const project = this.getCurrentProject();
    
    // For now, return mock data as the real API implementation would require proper authentication setup
    return of(this.getMockInstances()).pipe(
      catchError(error => {
        console.error('Error loading AlloyDB instances:', error);
        return of(this.getMockInstances());
      })
    );
  }

  /**
   * Get instances for a specific cluster
   */
  getInstancesForCluster(clusterName: string): Observable<AlloyDbInstance[]> {
    // In demo mode, return mock data filtered by cluster
    if (this.authService.isDemoMode()) {
      const mockInstances = this.getMockInstances();
      return of(mockInstances.filter(instance => instance.cluster.includes(clusterName)));
    }

    const project = this.getCurrentProject();
    const location = this.extractLocationFromClusterName(clusterName);
    const url = `${this.baseUrl}/projects/${project}/locations/${location}/clusters/${clusterName}/instances`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        if (response.instances) {
          return response.instances.map((instance: any) => this.transformInstance(instance));
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error fetching AlloyDB instances for cluster ${clusterName}:`, error);
        const mockInstances = this.getMockInstances();
        return of(mockInstances.filter(instance => instance.cluster.includes(clusterName)));
      })
    );
  }

  /**
   * Get clusters from a specific location
   */
  private getClustersFromLocation(projectId: string, location: string): Observable<AlloyDbCluster[]> {
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/clusters`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        if (response.clusters) {
          return response.clusters.map((cluster: any) => this.transformCluster(cluster));
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error fetching AlloyDB clusters from ${location}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Transform GCP API response to our AlloyDbCluster interface
   */
  private transformCluster(gcpCluster: any): AlloyDbCluster {
    const name = this.extractNameFromResourcePath(gcpCluster.name);
    const location = this.extractLocationFromResourcePath(gcpCluster.name);
    const project = this.extractProjectFromResourcePath(gcpCluster.name);
    
    return {
      name,
      displayName: gcpCluster.displayName || name,
      uid: gcpCluster.uid || '',
      createTime: gcpCluster.createTime || '',
      updateTime: gcpCluster.updateTime || '',
      deleteTime: gcpCluster.deleteTime,
      labels: gcpCluster.labels || {},
      annotations: gcpCluster.annotations || {},
      state: gcpCluster.state || 'STATE_UNSPECIFIED',
      clusterType: gcpCluster.clusterType || 'PRIMARY',
      networkConfig: gcpCluster.networkConfig,
      initialUser: gcpCluster.initialUser,
      automatedBackupPolicy: gcpCluster.automatedBackupPolicy,
      sslConfig: gcpCluster.sslConfig,
      encryptionConfig: gcpCluster.encryptionConfig,
      encryptionInfo: gcpCluster.encryptionInfo,
      continuousBackupConfig: gcpCluster.continuousBackupConfig,
      continuousBackupInfo: gcpCluster.continuousBackupInfo,
      secondaryConfig: gcpCluster.secondaryConfig,
      primaryConfig: gcpCluster.primaryConfig,
      etag: gcpCluster.etag || '',
      reconciling: gcpCluster.reconciling || false,
      location,
      project
    };
  }

  /**
   * Transform GCP API response to our AlloyDbInstance interface
   */
  private transformInstance(gcpInstance: any): AlloyDbInstance {
    const name = this.extractNameFromResourcePath(gcpInstance.name);
    const location = this.extractLocationFromResourcePath(gcpInstance.name);
    const project = this.extractProjectFromResourcePath(gcpInstance.name);
    const cluster = this.extractClusterFromInstancePath(gcpInstance.name);
    
    return {
      name,
      displayName: gcpInstance.displayName || name,
      uid: gcpInstance.uid || '',
      createTime: gcpInstance.createTime || '',
      updateTime: gcpInstance.updateTime || '',
      deleteTime: gcpInstance.deleteTime,
      labels: gcpInstance.labels || {},
      annotations: gcpInstance.annotations || {},
      state: gcpInstance.state || 'STATE_UNSPECIFIED',
      instanceType: gcpInstance.instanceType || 'PRIMARY',
      machineConfig: gcpInstance.machineConfig,
      availabilityType: gcpInstance.availabilityType || 'ZONAL',
      gceZone: gcpInstance.gceZone,
      databaseFlags: gcpInstance.databaseFlags || {},
      writableNode: gcpInstance.writableNode,
      nodes: gcpInstance.nodes || [],
      queryInsightsConfig: gcpInstance.queryInsightsConfig,
      readPoolConfig: gcpInstance.readPoolConfig,
      ipAddress: gcpInstance.ipAddress || '',
      reconciling: gcpInstance.reconciling || false,
      etag: gcpInstance.etag || '',
      clientConnectionConfig: gcpInstance.clientConnectionConfig,
      satisfiesPzs: gcpInstance.satisfiesPzs || false,
      cluster,
      location,
      project
    };
  }

  /**
   * Extract name from resource path
   */
  private extractNameFromResourcePath(resourcePath: string): string {
    const parts = resourcePath.split('/');
    return parts[parts.length - 1] || resourcePath;
  }

  /**
   * Extract location from resource path
   */
  private extractLocationFromResourcePath(resourcePath: string): string {
    const matches = resourcePath.match(/\/locations\/([^\/]+)\//);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Extract project from resource path
   */
  private extractProjectFromResourcePath(resourcePath: string): string {
    const matches = resourcePath.match(/projects\/([^\/]+)\//);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Extract cluster name from instance resource path
   */
  private extractClusterFromInstancePath(resourcePath: string): string {
    const matches = resourcePath.match(/\/clusters\/([^\/]+)\/instances/);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Extract location from cluster name (assuming cluster name contains location)
   */
  private extractLocationFromClusterName(clusterName: string): string {
    // This is a simplified approach - in real implementation, you might need to query the cluster first
    return 'us-central1'; // Default location
  }

  /**
   * Get current project ID
   */
  private getCurrentProject(): string {
    const project = this.projectService.getCurrentProject();
    return project?.id || 'unknown-project';
  }

  /**
   * Get HTTP headers with authentication
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Mock AlloyDB clusters for development/demo
   */
  private getMockClusters(): AlloyDbCluster[] {
    return [
      {
        name: 'production-cluster',
        displayName: 'Production Cluster',
        uid: 'abc123def456',
        createTime: '2024-01-15T10:30:00Z',
        updateTime: '2024-01-15T10:30:00Z',
        labels: {
          environment: 'production',
          team: 'backend'
        },
        annotations: {},
        state: 'READY',
        clusterType: 'PRIMARY',
        networkConfig: {
          network: 'projects/demo-project/global/networks/default',
          allocatedIpRange: '10.1.0.0/16'
        },
        automatedBackupPolicy: {
          enabled: true,
          weeklySchedule: {
            startTimes: ['02:00:00'],
            daysOfWeek: ['SUNDAY']
          },
          timeBasedRetention: {
            retentionPeriod: '7d'
          },
          backupWindow: '02:00-04:00',
          location: 'us'
        },
        sslConfig: {
          sslMode: 'SSL_MODE_REQUIRE',
          caSource: 'CA_SOURCE_MANAGED'
        },
        continuousBackupConfig: {
          enabled: true,
          recoveryWindowDays: 14
        },
        etag: 'abc123',
        reconciling: false,
        location: 'us-central1',
        project: 'demo-project'
      },
      {
        name: 'analytics-cluster',
        displayName: 'Analytics Cluster',
        uid: 'def456ghi789',
        createTime: '2024-01-16T14:20:00Z',
        updateTime: '2024-01-16T14:20:00Z',
        labels: {
          environment: 'production',
          team: 'analytics'
        },
        annotations: {},
        state: 'READY',
        clusterType: 'PRIMARY',
        networkConfig: {
          network: 'projects/demo-project/global/networks/analytics-vpc',
          allocatedIpRange: '10.2.0.0/16'
        },
        automatedBackupPolicy: {
          enabled: true,
          weeklySchedule: {
            startTimes: ['03:00:00'],
            daysOfWeek: ['SATURDAY']
          },
          quantityBasedRetention: {
            count: 14
          },
          backupWindow: '03:00-05:00',
          location: 'europe'
        },
        sslConfig: {
          sslMode: 'SSL_MODE_VERIFY_FULL',
          caSource: 'CA_SOURCE_MANAGED'
        },
        continuousBackupConfig: {
          enabled: true,
          recoveryWindowDays: 30
        },
        etag: 'def456',
        reconciling: false,
        location: 'europe-west1',
        project: 'demo-project'
      }
    ];
  }

  /**
   * Mock AlloyDB instances for development/demo
   */
  private getMockInstances(): AlloyDbInstance[] {
    return [
      {
        name: 'production-cluster-primary',
        displayName: 'Production Primary',
        uid: 'primary123abc',
        createTime: '2024-01-15T10:35:00Z',
        updateTime: '2024-01-15T10:35:00Z',
        labels: {
          role: 'primary',
          environment: 'production'
        },
        annotations: {},
        state: 'READY',
        instanceType: 'PRIMARY',
        machineConfig: {
          cpuCount: 4
        },
        availabilityType: 'REGIONAL',
        gceZone: 'us-central1-a',
        databaseFlags: {
          'max_connections': '200',
          'shared_preload_libraries': 'pg_stat_statements'
        },
        nodes: [
          {
            zoneId: 'us-central1-a',
            id: 'node-1',
            ip: '10.1.0.10',
            state: 'READY'
          },
          {
            zoneId: 'us-central1-b',
            id: 'node-2',
            ip: '10.1.0.11',
            state: 'READY'
          }
        ],
        queryInsightsConfig: {
          recordApplicationTags: true,
          recordClientAddress: true,
          queryStringLength: 1024,
          queryPlansPerMinute: 5
        },
        ipAddress: '10.1.0.10',
        reconciling: false,
        etag: 'primary123',
        satisfiesPzs: true,
        cluster: 'production-cluster',
        location: 'us-central1',
        project: 'demo-project'
      },
      {
        name: 'production-cluster-read',
        displayName: 'Production Read Pool',
        uid: 'readpool456def',
        createTime: '2024-01-15T11:00:00Z',
        updateTime: '2024-01-15T11:00:00Z',
        labels: {
          role: 'read-pool',
          environment: 'production'
        },
        annotations: {},
        state: 'READY',
        instanceType: 'READ_POOL',
        machineConfig: {
          cpuCount: 2
        },
        availabilityType: 'ZONAL',
        gceZone: 'us-central1-c',
        databaseFlags: {},
        readPoolConfig: {
          nodeCount: 3
        },
        nodes: [
          {
            zoneId: 'us-central1-c',
            id: 'read-node-1',
            ip: '10.1.0.20',
            state: 'READY'
          },
          {
            zoneId: 'us-central1-c',
            id: 'read-node-2',
            ip: '10.1.0.21',
            state: 'READY'
          },
          {
            zoneId: 'us-central1-c',
            id: 'read-node-3',
            ip: '10.1.0.22',
            state: 'READY'
          }
        ],
        ipAddress: '10.1.0.20',
        reconciling: false,
        etag: 'readpool456',
        satisfiesPzs: false,
        cluster: 'production-cluster',
        location: 'us-central1',
        project: 'demo-project'
      },
      {
        name: 'analytics-cluster-primary',
        displayName: 'Analytics Primary',
        uid: 'analytics789ghi',
        createTime: '2024-01-16T14:25:00Z',
        updateTime: '2024-01-16T14:25:00Z',
        labels: {
          role: 'primary',
          environment: 'production',
          workload: 'analytics'
        },
        annotations: {},
        state: 'READY',
        instanceType: 'PRIMARY',
        machineConfig: {
          cpuCount: 8
        },
        availabilityType: 'REGIONAL',
        gceZone: 'europe-west1-b',
        databaseFlags: {
          'max_connections': '500',
          'work_mem': '256MB',
          'shared_buffers': '2GB'
        },
        nodes: [
          {
            zoneId: 'europe-west1-b',
            id: 'analytics-node-1',
            ip: '10.2.0.10',
            state: 'READY'
          },
          {
            zoneId: 'europe-west1-c',
            id: 'analytics-node-2',
            ip: '10.2.0.11',
            state: 'READY'
          }
        ],
        queryInsightsConfig: {
          recordApplicationTags: true,
          recordClientAddress: false,
          queryStringLength: 2048,
          queryPlansPerMinute: 10
        },
        ipAddress: '10.2.0.10',
        reconciling: false,
        etag: 'analytics789',
        satisfiesPzs: true,
        cluster: 'analytics-cluster',
        location: 'europe-west1',
        project: 'demo-project'
      }
    ];
  }
}