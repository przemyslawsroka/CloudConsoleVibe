import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudSqlInstance {
  name: string;
  project: string;
  region: string;
  databaseVersion: string;
  state: 'RUNNABLE' | 'SUSPENDED' | 'PENDING_DELETE' | 'PENDING_CREATE' | 'MAINTENANCE' | 'FAILED' | 'UNKNOWN';
  connectionName: string;
  ipAddresses: IpMapping[];
  serverCaCert: SslCert;
  instanceType: 'CLOUD_SQL_INSTANCE' | 'ON_PREMISES_INSTANCE' | 'READ_REPLICA_INSTANCE';
  backendType: 'FIRST_GEN' | 'SECOND_GEN' | 'EXTERNAL';
  selfLink: string;
  serviceAccountEmailAddress: string;
  createTime: string;
  masterInstanceName?: string;
  currentDiskSize: string;
  maxDiskSize: string;
  settings: Settings;
  etag: string;
  failoverReplica?: FailoverReplica;
  replicaConfiguration?: ReplicaConfiguration;
  scheduledMaintenance?: MaintenanceWindow;
  rootPassword?: string;
  gceZone?: string;
  onPremisesConfiguration?: OnPremisesConfiguration;
  suspensionReason?: string[];
  diskEncryptionConfiguration?: DiskEncryptionConfiguration;
  diskEncryptionStatus?: DiskEncryptionStatus;
  satisfiesPzs?: boolean;
}

export interface IpMapping {
  type: 'PRIMARY' | 'OUTGOING' | 'PRIVATE' | 'MIGRATED_1ST_GEN';
  ipAddress: string;
  timeToRetire?: string;
}

export interface SslCert {
  kind: string;
  certSerialNumber: string;
  cert: string;
  createTime: string;
  commonName: string;
  expirationTime: string;
  sha1Fingerprint: string;
  instance: string;
}

export interface Settings {
  tier: string;
  kind: string;
  userLabels: { [key: string]: string };
  availabilityType: 'ZONAL' | 'REGIONAL';
  pricingPlan: 'PER_USE' | 'PACKAGE';
  replicationType: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
  activationPolicy: 'ALWAYS' | 'NEVER' | 'ON_DEMAND';
  authorizedGaeApplications: string[];
  dataDiskType: 'PD_SSD' | 'PD_HDD';
  dataDiskSizeGb: string;
  settingsVersion: string;
  storageAutoResizeLimit: string;
  storageAutoResize: boolean;
  ipConfiguration: IpConfiguration;
  locationPreference: LocationPreference;
  databaseFlags: DatabaseFlags[];
  maintenanceWindow: MaintenanceWindow;
  backupConfiguration: BackupConfiguration;
  databaseReplicationEnabled: boolean;
  crashSafeReplicationEnabled: boolean;
}

export interface IpConfiguration {
  ipv4Enabled: boolean;
  privateNetwork?: string;
  requireSsl: boolean;
  authorizedNetworks: AclEntry[];
  allocatedIpRange?: string;
}

export interface AclEntry {
  value: string;
  expirationTime?: string;
  name?: string;
  kind: string;
}

export interface LocationPreference {
  zone?: string;
  secondaryZone?: string;
  kind: string;
}

export interface DatabaseFlags {
  name: string;
  value: string;
}

export interface MaintenanceWindow {
  hour: number;
  day: number;
  updateTrack: 'canary' | 'stable';
  kind: string;
}

export interface BackupConfiguration {
  enabled: boolean;
  startTime: string;
  kind: string;
  location?: string;
  pointInTimeRecoveryEnabled: boolean;
  transactionLogRetentionDays: number;
  backupRetentionSettings: BackupRetentionSettings;
}

export interface BackupRetentionSettings {
  retentionUnit: 'COUNT' | 'DURATION';
  retainedBackups: number;
}

export interface FailoverReplica {
  name: string;
  available: boolean;
}

export interface ReplicaConfiguration {
  kind: string;
  mysqlReplicaConfiguration?: MySqlReplicaConfiguration;
  failoverTarget: boolean;
}

export interface MySqlReplicaConfiguration {
  dumpFilePath?: string;
  username?: string;
  password?: string;
  connectRetryInterval?: number;
  masterHeartbeatPeriod?: string;
  caCertificate?: string;
  clientCertificate?: string;
  clientKey?: string;
  sslCipher?: string;
  verifyServerCertificate?: boolean;
  kind: string;
}

export interface OnPremisesConfiguration {
  hostPort: string;
  kind: string;
  username?: string;
  password?: string;
  caCertificate?: string;
  clientCertificate?: string;
  clientKey?: string;
  dumpFilePath?: string;
}

export interface DiskEncryptionConfiguration {
  kmsKeyName?: string;
  kind: string;
}

export interface DiskEncryptionStatus {
  kmsKeyVersionName?: string;
  kind: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudSqlService {
  private readonly baseUrl = 'https://sqladmin.googleapis.com/sql/v1beta4';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  /**
   * Get all Cloud SQL instances
   */
  getInstances(): Observable<CloudSqlInstance[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockInstances());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/instances`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        if (response.items) {
          return response.items.map((instance: any) => this.transformInstance(instance));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching Cloud SQL instances:', error);
        return of(this.getMockInstances());
      })
    );
  }

  /**
   * Get a specific Cloud SQL instance
   */
  getInstance(instanceName: string): Observable<CloudSqlInstance> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      const mockInstance = this.getMockInstances().find(i => i.name === instanceName);
      return of(mockInstance || this.getMockInstances()[0]);
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/instances/${instanceName}`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => this.transformInstance(response)),
      catchError(error => {
        console.error(`Error fetching Cloud SQL instance ${instanceName}:`, error);
        return of(this.getMockInstances()[0]);
      })
    );
  }

  /**
   * Get databases for a specific instance
   */
  getDatabases(instanceName: string): Observable<any[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockDatabases());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/instances/${instanceName}/databases`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error(`Error fetching databases for instance ${instanceName}:`, error);
        return of(this.getMockDatabases());
      })
    );
  }

  /**
   * Get users for a specific instance
   */
  getUsers(instanceName: string): Observable<any[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockUsers());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/instances/${instanceName}/users`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error(`Error fetching users for instance ${instanceName}:`, error);
        return of(this.getMockUsers());
      })
    );
  }

  /**
   * Transform GCP API response to our CloudSqlInstance interface
   */
  private transformInstance(gcpInstance: any): CloudSqlInstance {
    return {
      name: gcpInstance.name || '',
      project: gcpInstance.project || '',
      region: gcpInstance.region || '',
      databaseVersion: gcpInstance.databaseVersion || '',
      state: this.mapGcpStateToOurState(gcpInstance.state),
      connectionName: gcpInstance.connectionName || '',
      ipAddresses: gcpInstance.ipAddresses || [],
      serverCaCert: gcpInstance.serverCaCert || {},
      instanceType: gcpInstance.instanceType || 'CLOUD_SQL_INSTANCE',
      backendType: gcpInstance.backendType || 'SECOND_GEN',
      selfLink: gcpInstance.selfLink || '',
      serviceAccountEmailAddress: gcpInstance.serviceAccountEmailAddress || '',
      createTime: gcpInstance.createTime || '',
      masterInstanceName: gcpInstance.masterInstanceName,
      currentDiskSize: gcpInstance.currentDiskSize || '0',
      maxDiskSize: gcpInstance.maxDiskSize || '0',
      settings: gcpInstance.settings || {},
      etag: gcpInstance.etag || '',
      failoverReplica: gcpInstance.failoverReplica,
      replicaConfiguration: gcpInstance.replicaConfiguration,
      scheduledMaintenance: gcpInstance.scheduledMaintenance,
      gceZone: gcpInstance.gceZone,
      onPremisesConfiguration: gcpInstance.onPremisesConfiguration,
      suspensionReason: gcpInstance.suspensionReason,
      diskEncryptionConfiguration: gcpInstance.diskEncryptionConfiguration,
      diskEncryptionStatus: gcpInstance.diskEncryptionStatus,
      satisfiesPzs: gcpInstance.satisfiesPzs
    };
  }

  /**
   * Map GCP instance state to our state enum
   */
  private mapGcpStateToOurState(state: string): 'RUNNABLE' | 'SUSPENDED' | 'PENDING_DELETE' | 'PENDING_CREATE' | 'MAINTENANCE' | 'FAILED' | 'UNKNOWN' {
    switch (state) {
      case 'RUNNABLE':
        return 'RUNNABLE';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'PENDING_DELETE':
        return 'PENDING_DELETE';
      case 'PENDING_CREATE':
        return 'PENDING_CREATE';
      case 'MAINTENANCE':
        return 'MAINTENANCE';
      case 'FAILED':
        return 'FAILED';
      default:
        return 'UNKNOWN';
    }
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
   * Mock Cloud SQL instances for development/demo
   */
  private getMockInstances(): CloudSqlInstance[] {
    return [
      {
        name: 'main-database',
        project: 'demo-project',
        region: 'us-central1',
        databaseVersion: 'POSTGRES_13',
        state: 'RUNNABLE',
        connectionName: 'demo-project:us-central1:main-database',
        ipAddresses: [
          {
            type: 'PRIMARY',
            ipAddress: '34.123.45.67'
          },
          {
            type: 'PRIVATE',
            ipAddress: '10.1.2.3'
          }
        ],
        serverCaCert: {
          kind: 'sql#sslCert',
          certSerialNumber: '0',
          cert: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
          createTime: '2024-01-15T10:30:00Z',
          commonName: 'Google Cloud SQL Server CA',
          expirationTime: '2034-01-15T10:30:00Z',
          sha1Fingerprint: 'abc123def456',
          instance: 'main-database'
        },
        instanceType: 'CLOUD_SQL_INSTANCE',
        backendType: 'SECOND_GEN',
        selfLink: 'https://sqladmin.googleapis.com/sql/v1beta4/projects/demo-project/instances/main-database',
        serviceAccountEmailAddress: 'demo-project@gcp-sa-cloud-sql.iam.gserviceaccount.com',
        createTime: '2024-01-15T10:30:00Z',
        currentDiskSize: '50',
        maxDiskSize: '500',
        settings: {
          tier: 'db-custom-2-8192',
          kind: 'sql#settings',
          userLabels: {
            environment: 'production',
            team: 'backend'
          },
          availabilityType: 'REGIONAL',
          pricingPlan: 'PER_USE',
          replicationType: 'SYNCHRONOUS',
          activationPolicy: 'ALWAYS',
          authorizedGaeApplications: [],
          dataDiskType: 'PD_SSD',
          dataDiskSizeGb: '100',
          settingsVersion: '1',
          storageAutoResizeLimit: '500',
          storageAutoResize: true,
          ipConfiguration: {
            ipv4Enabled: true,
            privateNetwork: 'projects/demo-project/global/networks/default',
            requireSsl: true,
            authorizedNetworks: []
          },
          locationPreference: {
            zone: 'us-central1-a',
            kind: 'sql#locationPreference'
          },
          databaseFlags: [],
          maintenanceWindow: {
            hour: 2,
            day: 7,
            updateTrack: 'stable',
            kind: 'sql#maintenanceWindow'
          },
          backupConfiguration: {
            enabled: true,
            startTime: '02:00',
            kind: 'sql#backupConfiguration',
            location: 'us',
            pointInTimeRecoveryEnabled: true,
            transactionLogRetentionDays: 7,
            backupRetentionSettings: {
              retentionUnit: 'COUNT',
              retainedBackups: 7
            }
          },
          databaseReplicationEnabled: false,
          crashSafeReplicationEnabled: false
        },
        etag: '"abc123def456"'
      },
      {
        name: 'analytics-db',
        project: 'demo-project',
        region: 'europe-west1',
        databaseVersion: 'MYSQL_8_0',
        state: 'RUNNABLE',
        connectionName: 'demo-project:europe-west1:analytics-db',
        ipAddresses: [
          {
            type: 'PRIMARY',
            ipAddress: '35.234.56.78'
          }
        ],
        serverCaCert: {
          kind: 'sql#sslCert',
          certSerialNumber: '1',
          cert: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
          createTime: '2024-01-16T14:20:00Z',
          commonName: 'Google Cloud SQL Server CA',
          expirationTime: '2034-01-16T14:20:00Z',
          sha1Fingerprint: 'def456ghi789',
          instance: 'analytics-db'
        },
        instanceType: 'CLOUD_SQL_INSTANCE',
        backendType: 'SECOND_GEN',
        selfLink: 'https://sqladmin.googleapis.com/sql/v1beta4/projects/demo-project/instances/analytics-db',
        serviceAccountEmailAddress: 'demo-project@gcp-sa-cloud-sql.iam.gserviceaccount.com',
        createTime: '2024-01-16T14:20:00Z',
        currentDiskSize: '100',
        maxDiskSize: '1000',
        settings: {
          tier: 'db-custom-4-16384',
          kind: 'sql#settings',
          userLabels: {
            environment: 'production',
            team: 'analytics'
          },
          availabilityType: 'ZONAL',
          pricingPlan: 'PER_USE',
          replicationType: 'ASYNCHRONOUS',
          activationPolicy: 'ALWAYS',
          authorizedGaeApplications: [],
          dataDiskType: 'PD_SSD',
          dataDiskSizeGb: '200',
          settingsVersion: '1',
          storageAutoResizeLimit: '1000',
          storageAutoResize: true,
          ipConfiguration: {
            ipv4Enabled: true,
            requireSsl: false,
            authorizedNetworks: []
          },
          locationPreference: {
            zone: 'europe-west1-b',
            kind: 'sql#locationPreference'
          },
          databaseFlags: [],
          maintenanceWindow: {
            hour: 3,
            day: 1,
            updateTrack: 'stable',
            kind: 'sql#maintenanceWindow'
          },
          backupConfiguration: {
            enabled: true,
            startTime: '03:00',
            kind: 'sql#backupConfiguration',
            location: 'europe',
            pointInTimeRecoveryEnabled: true,
            transactionLogRetentionDays: 7,
            backupRetentionSettings: {
              retentionUnit: 'COUNT',
              retainedBackups: 14
            }
          },
          databaseReplicationEnabled: false,
          crashSafeReplicationEnabled: false
        },
        etag: '"def456ghi789"'
      }
    ];
  }

  /**
   * Mock databases for development/demo
   */
  private getMockDatabases(): any[] {
    return [
      {
        kind: 'sql#database',
        charset: 'UTF8',
        collation: 'en_US.UTF8',
        etag: '"abc123"',
        instance: 'main-database',
        name: 'production',
        project: 'demo-project',
        selfLink: 'https://sqladmin.googleapis.com/sql/v1beta4/projects/demo-project/instances/main-database/databases/production'
      },
      {
        kind: 'sql#database',
        charset: 'UTF8',
        collation: 'en_US.UTF8',
        etag: '"def456"',
        instance: 'main-database',
        name: 'staging',
        project: 'demo-project',
        selfLink: 'https://sqladmin.googleapis.com/sql/v1beta4/projects/demo-project/instances/main-database/databases/staging'
      }
    ];
  }

  /**
   * Mock users for development/demo
   */
  private getMockUsers(): any[] {
    return [
      {
        kind: 'sql#user',
        etag: '"abc123"',
        name: 'postgres',
        instance: 'main-database',
        project: 'demo-project'
      },
      {
        kind: 'sql#user',
        etag: '"def456"',
        name: 'app_user',
        instance: 'main-database',
        project: 'demo-project'
      }
    ];
  }
}