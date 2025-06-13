import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService, Project } from './project.service';

// TypeScript interfaces based on GCP Compute Engine API
export interface VmInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: 'PROVISIONING' | 'STAGING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'SUSPENDING' | 'SUSPENDED' | 'TERMINATED';
  internalIp: string;
  externalIp?: string;
  networkInterfaces: NetworkInterface[];
  disks: Disk[];
  serviceAccounts: ServiceAccount[];
  metadata: Metadata;
  tags: Tags;
  labels: { [key: string]: string };
  creationTimestamp: string;
  selfLink: string;
  kind: string;
  cpuPlatform: string;
  scheduling: Scheduling;
  canIpForward: boolean;
  fingerprint: string;
  startRestricted: boolean;
  deletionProtection: boolean;
  reservationAffinity: ReservationAffinity;
  displayDevice: DisplayDevice;
  shieldedInstanceConfig: ShieldedInstanceConfig;
  confidentialInstanceConfig: ConfidentialInstanceConfig;
  lastStartTimestamp?: string;
  lastStopTimestamp?: string;
  sourceMachineImage?: string;
  description?: string;
}

export interface NetworkInterface {
  name: string;
  network: string;
  subnetwork: string;
  networkIP: string;
  accessConfigs: AccessConfig[];
  fingerprint: string;
  kind: string;
  stackType: string;
}

export interface AccessConfig {
  type: string;
  name: string;
  natIP?: string;
  networkTier: string;
  kind: string;
}

export interface Disk {
  boot: boolean;
  deviceName: string;
  index: number;
  kind: string;
  source: string;
  type: 'PERSISTENT' | 'SCRATCH';
  mode: 'READ_WRITE' | 'READ_ONLY';
  autoDelete: boolean;
  interface: 'SCSI' | 'NVME';
  guestOsFeatures: GuestOsFeature[];
  diskEncryptionKey?: DiskEncryptionKey;
  diskSizeGb: string;
}

export interface GuestOsFeature {
  type: string;
}

export interface DiskEncryptionKey {
  rawKey?: string;
  kmsKeyName?: string;
  sha256?: string;
}

export interface ServiceAccount {
  email: string;
  scopes: string[];
}

export interface Metadata {
  fingerprint: string;
  items: MetadataItem[];
  kind: string;
}

export interface MetadataItem {
  key: string;
  value: string;
}

export interface Tags {
  items: string[];
  fingerprint: string;
}

export interface Scheduling {
  automaticRestart: boolean;
  onHostMaintenance: 'MIGRATE' | 'TERMINATE';
  preemptible: boolean;
}

export interface ReservationAffinity {
  consumeReservationType: 'ANY_RESERVATION' | 'SPECIFIC_RESERVATION' | 'NO_RESERVATION';
  key?: string;
  values?: string[];
}

export interface DisplayDevice {
  enableDisplay: boolean;
}

export interface ShieldedInstanceConfig {
  enableSecureBoot: boolean;
  enableVtpm: boolean;
  enableIntegrityMonitoring: boolean;
}

export interface ConfidentialInstanceConfig {
  enableConfidentialCompute: boolean;
}

export interface MachineType {
  id: string;
  name: string;
  description: string;
  guestCpus: number;
  memoryMb: number;
  zone: string;
  selfLink: string;
  kind: string;
  maximumPersistentDisks: number;
  maximumPersistentDisksSizeGb: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  status: 'UP' | 'DOWN';
  region: string;
  selfLink: string;
  kind: string;
  availableCpuPlatforms: string[];
}

export interface InstancesListResponse {
  kind: string;
  id: string;
  items: VmInstance[];
  selfLink: string;
  nextPageToken?: string;
  warning?: {
    code: string;
    message: string;
    data: any[];
  };
}

export interface InstanceOperation {
  kind: string;
  id: string;
  name: string;
  zone: string;
  operationType: string;
  targetLink: string;
  targetId: string;
  status: 'PENDING' | 'RUNNING' | 'DONE';
  user: string;
  progress: number;
  insertTime: string;
  startTime?: string;
  endTime?: string;
  error?: {
    errors: Array<{
      code: string;
      location: string;
      message: string;
    }>;
  };
  warnings?: Array<{
    code: string;
    message: string;
    data: Array<{
      key: string;
      value: string;
    }>;
  }>;
  httpErrorStatusCode?: number;
  httpErrorMessage?: string;
  selfLink: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComputeEngineService {
  private readonly baseUrl = 'https://compute.googleapis.com/compute/v1';
  private instancesSubject = new BehaviorSubject<VmInstance[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public instances$ = this.instancesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // Demo mode mock data
  private mockInstances: VmInstance[] = [
    {
      id: '1234567890123456789',
      name: 'web-server-1',
      zone: 'projects/my-project/zones/us-central1-a',
      machineType: 'projects/my-project/zones/us-central1-a/machineTypes/e2-medium',
      status: 'RUNNING',
      internalIp: '10.128.0.2',
      externalIp: '34.72.45.123',
      networkInterfaces: [{
        name: 'nic0',
        network: 'projects/my-project/global/networks/default',
        subnetwork: 'projects/my-project/regions/us-central1/subnetworks/default',
        networkIP: '10.128.0.2',
        accessConfigs: [{
          type: 'ONE_TO_ONE_NAT',
          name: 'External NAT',
          natIP: '34.72.45.123',
          networkTier: 'PREMIUM',
          kind: 'compute#accessConfig'
        }],
        fingerprint: 'abc123==',
        kind: 'compute#networkInterface',
        stackType: 'IPV4_ONLY'
      }],
      disks: [{
        boot: true,
        deviceName: 'persistent-disk-0',
        index: 0,
        kind: 'compute#attachedDisk',
        source: 'projects/my-project/zones/us-central1-a/disks/web-server-1',
        type: 'PERSISTENT',
        mode: 'READ_WRITE',
        autoDelete: true,
        interface: 'SCSI',
        guestOsFeatures: [{ type: 'UEFI_COMPATIBLE' }, { type: 'VIRTIO_SCSI_MULTIQUEUE' }],
        diskSizeGb: '20'
      }],
      serviceAccounts: [{
        email: 'default-compute@my-project.iam.gserviceaccount.com',
        scopes: [
          'https://www.googleapis.com/auth/devstorage.read_only',
          'https://www.googleapis.com/auth/logging.write',
          'https://www.googleapis.com/auth/monitoring.write'
        ]
      }],
      metadata: {
        fingerprint: 'def456==',
        items: [
          { key: 'startup-script', value: '#!/bin/bash\nsudo apt-get update\nsudo apt-get install -y nginx' },
          { key: 'ssh-keys', value: 'user:ssh-rsa AAAAB3...' }
        ],
        kind: 'compute#metadata'
      },
      tags: {
        items: ['http-server', 'https-server'],
        fingerprint: 'ghi789=='
      },
      labels: {
        'environment': 'production',
        'team': 'backend',
        'application': 'web-server'
      },
      creationTimestamp: '2024-01-15T10:30:00.000-08:00',
      selfLink: 'projects/my-project/zones/us-central1-a/instances/web-server-1',
      kind: 'compute#instance',
      cpuPlatform: 'Intel Broadwell',
      scheduling: {
        automaticRestart: true,
        onHostMaintenance: 'MIGRATE',
        preemptible: false
      },
      canIpForward: false,
      fingerprint: 'jkl012==',
      startRestricted: false,
      deletionProtection: false,
      reservationAffinity: {
        consumeReservationType: 'ANY_RESERVATION'
      },
      displayDevice: {
        enableDisplay: false
      },
      shieldedInstanceConfig: {
        enableSecureBoot: false,
        enableVtpm: true,
        enableIntegrityMonitoring: true
      },
      confidentialInstanceConfig: {
        enableConfidentialCompute: false
      },
      lastStartTimestamp: '2024-01-15T10:35:00.000-08:00',
      description: 'Web server for production environment'
    },
    {
      id: '9876543210987654321',
      name: 'database-server',
      zone: 'projects/my-project/zones/us-central1-b',
      machineType: 'projects/my-project/zones/us-central1-b/machineTypes/n1-standard-4',
      status: 'RUNNING',
      internalIp: '10.128.0.3',
      networkInterfaces: [{
        name: 'nic0',
        network: 'projects/my-project/global/networks/default',
        subnetwork: 'projects/my-project/regions/us-central1/subnetworks/default',
        networkIP: '10.128.0.3',
        accessConfigs: [],
        fingerprint: 'mno345==',
        kind: 'compute#networkInterface',
        stackType: 'IPV4_ONLY'
      }],
      disks: [{
        boot: true,
        deviceName: 'persistent-disk-0',
        index: 0,
        kind: 'compute#attachedDisk',
        source: 'projects/my-project/zones/us-central1-b/disks/database-server',
        type: 'PERSISTENT',
        mode: 'READ_WRITE',
        autoDelete: true,
        interface: 'SCSI',
        guestOsFeatures: [{ type: 'UEFI_COMPATIBLE' }],
        diskSizeGb: '100'
      }],
      serviceAccounts: [{
        email: 'database-sa@my-project.iam.gserviceaccount.com',
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform'
        ]
      }],
      metadata: {
        fingerprint: 'pqr678==',
        items: [
          { key: 'enable-oslogin', value: 'TRUE' }
        ],
        kind: 'compute#metadata'
      },
      tags: {
        items: ['database', 'private'],
        fingerprint: 'stu901=='
      },
      labels: {
        'environment': 'production',
        'team': 'data',
        'application': 'postgresql'
      },
      creationTimestamp: '2024-01-20T14:20:00.000-08:00',
      selfLink: 'projects/my-project/zones/us-central1-b/instances/database-server',
      kind: 'compute#instance',
      cpuPlatform: 'Intel Skylake',
      scheduling: {
        automaticRestart: true,
        onHostMaintenance: 'MIGRATE',
        preemptible: false
      },
      canIpForward: false,
      fingerprint: 'vwx234==',
      startRestricted: false,
      deletionProtection: true,
      reservationAffinity: {
        consumeReservationType: 'ANY_RESERVATION'
      },
      displayDevice: {
        enableDisplay: false
      },
      shieldedInstanceConfig: {
        enableSecureBoot: true,
        enableVtpm: true,
        enableIntegrityMonitoring: true
      },
      confidentialInstanceConfig: {
        enableConfidentialCompute: false
      },
      lastStartTimestamp: '2024-01-20T14:25:00.000-08:00',
      description: 'PostgreSQL database server'
    },
    {
      id: '5555444433332222111',
      name: 'worker-node-1',
      zone: 'projects/my-project/zones/us-west1-a',
      machineType: 'projects/my-project/zones/us-west1-a/machineTypes/e2-standard-2',
      status: 'STOPPED',
      internalIp: '10.138.0.2',
      networkInterfaces: [{
        name: 'nic0',
        network: 'projects/my-project/global/networks/vpc-prod',
        subnetwork: 'projects/my-project/regions/us-west1/subnetworks/private-subnet',
        networkIP: '10.138.0.2',
        accessConfigs: [],
        fingerprint: 'yza567==',
        kind: 'compute#networkInterface',
        stackType: 'IPV4_ONLY'
      }],
      disks: [{
        boot: true,
        deviceName: 'persistent-disk-0',
        index: 0,
        kind: 'compute#attachedDisk',
        source: 'projects/my-project/zones/us-west1-a/disks/worker-node-1',
        type: 'PERSISTENT',
        mode: 'READ_WRITE',
        autoDelete: true,
        interface: 'SCSI',
        guestOsFeatures: [{ type: 'UEFI_COMPATIBLE' }],
        diskSizeGb: '50'
      }],
      serviceAccounts: [{
        email: 'worker-sa@my-project.iam.gserviceaccount.com',
        scopes: [
          'https://www.googleapis.com/auth/devstorage.read_only',
          'https://www.googleapis.com/auth/logging.write'
        ]
      }],
      metadata: {
        fingerprint: 'bcd890==',
        items: [],
        kind: 'compute#metadata'
      },
      tags: {
        items: ['worker', 'batch-processing'],
        fingerprint: 'efg123=='
      },
      labels: {
        'environment': 'staging',
        'team': 'ml',
        'workload': 'batch'
      },
      creationTimestamp: '2024-02-01T09:15:00.000-08:00',
      selfLink: 'projects/my-project/zones/us-west1-a/instances/worker-node-1',
      kind: 'compute#instance',
      cpuPlatform: 'Intel Cascade Lake',
      scheduling: {
        automaticRestart: false,
        onHostMaintenance: 'TERMINATE',
        preemptible: true
      },
      canIpForward: false,
      fingerprint: 'hij456==',
      startRestricted: false,
      deletionProtection: false,
      reservationAffinity: {
        consumeReservationType: 'ANY_RESERVATION'
      },
      displayDevice: {
        enableDisplay: false
      },
      shieldedInstanceConfig: {
        enableSecureBoot: false,
        enableVtpm: true,
        enableIntegrityMonitoring: true
      },
      confidentialInstanceConfig: {
        enableConfidentialCompute: false
      },
      lastStopTimestamp: '2024-02-05T16:30:00.000-08:00',
      description: 'Worker node for ML batch processing'
    },
    {
      id: '7777888899990000111',
      name: 'api-gateway',
      zone: 'projects/my-project/zones/europe-west1-b',
      machineType: 'projects/my-project/zones/europe-west1-b/machineTypes/e2-small',
      status: 'RUNNING',
      internalIp: '10.132.0.2',
      externalIp: '35.195.123.45',
      networkInterfaces: [{
        name: 'nic0',
        network: 'projects/my-project/global/networks/default',
        subnetwork: 'projects/my-project/regions/europe-west1/subnetworks/default',
        networkIP: '10.132.0.2',
        accessConfigs: [{
          type: 'ONE_TO_ONE_NAT',
          name: 'External NAT',
          natIP: '35.195.123.45',
          networkTier: 'PREMIUM',
          kind: 'compute#accessConfig'
        }],
        fingerprint: 'klm789==',
        kind: 'compute#networkInterface',
        stackType: 'IPV4_ONLY'
      }],
      disks: [{
        boot: true,
        deviceName: 'persistent-disk-0',
        index: 0,
        kind: 'compute#attachedDisk',
        source: 'projects/my-project/zones/europe-west1-b/disks/api-gateway',
        type: 'PERSISTENT',
        mode: 'READ_WRITE',
        autoDelete: true,
        interface: 'SCSI',
        guestOsFeatures: [{ type: 'UEFI_COMPATIBLE' }],
        diskSizeGb: '30'
      }],
      serviceAccounts: [{
        email: 'api-gateway-sa@my-project.iam.gserviceaccount.com',
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform'
        ]
      }],
      metadata: {
        fingerprint: 'nop012==',
        items: [
          { key: 'startup-script-url', value: 'gs://my-bucket/startup-script.sh' }
        ],
        kind: 'compute#metadata'
      },
      tags: {
        items: ['api', 'loadbalanced'],
        fingerprint: 'qrs345=='
      },
      labels: {
        'environment': 'production',
        'team': 'api',
        'service': 'gateway'
      },
      creationTimestamp: '2024-01-25T11:45:00.000-08:00',
      selfLink: 'projects/my-project/zones/europe-west1-b/instances/api-gateway',
      kind: 'compute#instance',
      cpuPlatform: 'Intel Broadwell',
      scheduling: {
        automaticRestart: true,
        onHostMaintenance: 'MIGRATE',
        preemptible: false
      },
      canIpForward: false,
      fingerprint: 'tuv678==',
      startRestricted: false,
      deletionProtection: false,
      reservationAffinity: {
        consumeReservationType: 'ANY_RESERVATION'
      },
      displayDevice: {
        enableDisplay: false
      },
      shieldedInstanceConfig: {
        enableSecureBoot: true,
        enableVtpm: true,
        enableIntegrityMonitoring: true
      },
      confidentialInstanceConfig: {
        enableConfidentialCompute: false
      },
      lastStartTimestamp: '2024-01-25T11:50:00.000-08:00',
      description: 'API Gateway for microservices'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {
    console.log('ComputeEngineService constructor called');
    console.log('Is demo mode:', this.authService.isDemoMode());
    console.log('Mock instances length:', this.mockInstances.length);
    
    // Always initialize with mock data for testing
    console.log('Setting mock instances in constructor');
    this.instancesSubject.next(this.mockInstances);
  }

  /**
   * Load VM instances for the current project
   */
  loadInstances(): Observable<VmInstance[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Use demo mode if authenticated in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using mock VM instances');
      setTimeout(() => {
        this.instancesSubject.next(this.mockInstances);
        this.loadingSubject.next(false);
      }, 1000);
      return of(this.mockInstances);
    }

    // Production mode: Use real GCP API
    console.log('🔄 Production mode: Fetching VM instances from Google Cloud Compute API...');

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      const error = 'No project selected';
      this.errorSubject.next(error);
      this.loadingSubject.next(false);
      return throwError(() => new Error(error));
    }

    const token = this.authService.getAccessToken();
    if (!token || !this.authService.isAuthenticated()) {
      console.warn('⚠️  No valid authentication token. Falling back to mock data...');
      setTimeout(() => {
        this.instancesSubject.next(this.mockInstances);
        this.loadingSubject.next(false);
      }, 1000);
      return of(this.mockInstances);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    console.log(`📍 Fetching instances for project: ${currentProject.id}`);
    console.log(`🔑 Using OAuth token: ${token.substring(0, 20)}...`);
    
    // Get instances from all zones
    return this.getInstancesFromAllZones(currentProject.id, headers).pipe(
      tap(instances => {
        console.log(`✅ Successfully loaded ${instances.length} VM instances from GCP`);
        this.instancesSubject.next(instances);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('❌ Error loading VM instances from GCP API:', error);
        this.logApiError(error);
        
        // Fall back to mock data on error
        console.log('🔄 Falling back to mock data...');
        this.instancesSubject.next(this.mockInstances);
        this.loadingSubject.next(false);
        
        // Don't throw error, just show warning
        this.errorSubject.next(`API Error (showing mock data): ${error.message || 'Failed to load VM instances'}`);
        return of(this.mockInstances);
      })
    );
  }

  /**
   * Get instances from all zones in the project
   */
  private getInstancesFromAllZones(projectId: string, headers: HttpHeaders): Observable<VmInstance[]> {
    const url = `${this.baseUrl}/projects/${projectId}/aggregated/instances`;
    
    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        const instances: VmInstance[] = [];
        
        console.log('🔍 Raw GCP API Response:', response);
        
        // Parse aggregated response
        if (response.items) {
          Object.keys(response.items).forEach(key => {
            const zoneData = response.items[key];
            if (zoneData.instances) {
              // Transform each GCP instance to our VmInstance interface
              const transformedInstances = zoneData.instances.map((gcpInstance: any) => 
                this.transformGcpInstanceToVmInstance(gcpInstance)
              );
              instances.push(...transformedInstances);
            }
          });
        }
        
        console.log('✅ Transformed instances:', instances);
        return instances;
      })
    );
  }

  /**
   * Transform GCP API instance to our VmInstance interface
   */
  private transformGcpInstanceToVmInstance(gcpInstance: any): VmInstance {
    // Extract IPs from network interfaces
    const networkInterface = gcpInstance.networkInterfaces?.[0];
    const internalIp = networkInterface?.networkIP || '';
    const externalIp = networkInterface?.accessConfigs?.[0]?.natIP || undefined;

    // Extract boot disk info
    const bootDisk = gcpInstance.disks?.find((disk: any) => disk.boot) || {};
    
    // Handle scheduling info
    const scheduling = gcpInstance.scheduling || {};

    return {
      id: gcpInstance.id || '',
      name: gcpInstance.name || '',
      zone: gcpInstance.zone || '',
      machineType: gcpInstance.machineType || '',
      status: gcpInstance.status || 'UNKNOWN',
      internalIp: internalIp,
      externalIp: externalIp,
      networkInterfaces: gcpInstance.networkInterfaces || [],
      disks: gcpInstance.disks || [],
      serviceAccounts: gcpInstance.serviceAccounts || [],
      metadata: gcpInstance.metadata || { fingerprint: '', items: [], kind: 'compute#metadata' },
      tags: gcpInstance.tags || { items: [], fingerprint: '' },
      labels: gcpInstance.labels || {},
      creationTimestamp: gcpInstance.creationTimestamp || new Date().toISOString(),
      selfLink: gcpInstance.selfLink || '',
      kind: gcpInstance.kind || 'compute#instance',
      cpuPlatform: gcpInstance.cpuPlatform || '',
      scheduling: {
        automaticRestart: scheduling.automaticRestart !== false,
        onHostMaintenance: scheduling.onHostMaintenance || 'MIGRATE',
        preemptible: scheduling.preemptible === true
      },
      canIpForward: gcpInstance.canIpForward === true,
      fingerprint: gcpInstance.fingerprint || '',
      startRestricted: gcpInstance.startRestricted === true,
      deletionProtection: gcpInstance.deletionProtection === true,
      reservationAffinity: gcpInstance.reservationAffinity || {
        consumeReservationType: 'ANY_RESERVATION'
      },
      displayDevice: gcpInstance.displayDevice || { enableDisplay: false },
      shieldedInstanceConfig: gcpInstance.shieldedInstanceConfig || {
        enableSecureBoot: false,
        enableVtpm: false,
        enableIntegrityMonitoring: false
      },
      confidentialInstanceConfig: gcpInstance.confidentialInstanceConfig || {
        enableConfidentialCompute: false
      },
      lastStartTimestamp: gcpInstance.lastStartTimestamp,
      lastStopTimestamp: gcpInstance.lastStopTimestamp,
      sourceMachineImage: gcpInstance.sourceMachineImage,
      description: gcpInstance.description
    };
  }

  /**
   * Start a VM instance
   */
  startInstance(zone: string, instanceName: string): Observable<InstanceOperation> {
    if (this.authService.isDemoMode()) {
      // Update mock data
      const instance = this.mockInstances.find(i => i.name === instanceName);
      if (instance) {
        instance.status = 'RUNNING';
        instance.lastStartTimestamp = new Date().toISOString();
        this.instancesSubject.next([...this.mockInstances]);
      }
      
      const mockOperation: InstanceOperation = {
        kind: 'compute#operation',
        id: '123456789',
        name: `start-${instanceName}-${Date.now()}`,
        zone: zone,
        operationType: 'start',
        targetLink: `${zone}/instances/${instanceName}`,
        targetId: '123456789',
        status: 'DONE',
        user: 'user@example.com',
        progress: 100,
        insertTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        selfLink: `${zone}/operations/start-${instanceName}-${Date.now()}`
      };
      
      return of(mockOperation);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const zoneName = zone.split('/').pop();
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${zoneName}/instances/${instanceName}/start`;
    
    return this.http.post<InstanceOperation>(url, {}, { headers });
  }

  /**
   * Stop a VM instance
   */
  stopInstance(zone: string, instanceName: string): Observable<InstanceOperation> {
    if (this.authService.isDemoMode()) {
      // Update mock data
      const instance = this.mockInstances.find(i => i.name === instanceName);
      if (instance) {
        instance.status = 'STOPPED';
        instance.lastStopTimestamp = new Date().toISOString();
        this.instancesSubject.next([...this.mockInstances]);
      }
      
      const mockOperation: InstanceOperation = {
        kind: 'compute#operation',
        id: '987654321',
        name: `stop-${instanceName}-${Date.now()}`,
        zone: zone,
        operationType: 'stop',
        targetLink: `${zone}/instances/${instanceName}`,
        targetId: '987654321',
        status: 'DONE',
        user: 'user@example.com',
        progress: 100,
        insertTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        selfLink: `${zone}/operations/stop-${instanceName}-${Date.now()}`
      };
      
      return of(mockOperation);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const zoneName = zone.split('/').pop();
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${zoneName}/instances/${instanceName}/stop`;
    
    return this.http.post<InstanceOperation>(url, {}, { headers });
  }

  /**
   * Restart a VM instance
   */
  restartInstance(zone: string, instanceName: string): Observable<InstanceOperation> {
    if (this.authService.isDemoMode()) {
      // Update mock data
      const instance = this.mockInstances.find(i => i.name === instanceName);
      if (instance) {
        instance.status = 'RUNNING';
        instance.lastStartTimestamp = new Date().toISOString();
        this.instancesSubject.next([...this.mockInstances]);
      }
      
      const mockOperation: InstanceOperation = {
        kind: 'compute#operation',
        id: '555666777',
        name: `restart-${instanceName}-${Date.now()}`,
        zone: zone,
        operationType: 'restart',
        targetLink: `${zone}/instances/${instanceName}`,
        targetId: '555666777',
        status: 'DONE',
        user: 'user@example.com',
        progress: 100,
        insertTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        selfLink: `${zone}/operations/restart-${instanceName}-${Date.now()}`
      };
      
      return of(mockOperation);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const zoneName = zone.split('/').pop();
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${zoneName}/instances/${instanceName}/reset`;
    
    return this.http.post<InstanceOperation>(url, {}, { headers });
  }

  /**
   * Delete a VM instance
   */
  deleteInstance(zone: string, instanceName: string): Observable<InstanceOperation> {
    if (this.authService.isDemoMode()) {
      // Update mock data
      const index = this.mockInstances.findIndex(i => i.name === instanceName);
      if (index !== -1) {
        this.mockInstances.splice(index, 1);
        this.instancesSubject.next([...this.mockInstances]);
      }
      
      const mockOperation: InstanceOperation = {
        kind: 'compute#operation',
        id: '111222333',
        name: `delete-${instanceName}-${Date.now()}`,
        zone: zone,
        operationType: 'delete',
        targetLink: `${zone}/instances/${instanceName}`,
        targetId: '111222333',
        status: 'DONE',
        user: 'user@example.com',
        progress: 100,
        insertTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        selfLink: `${zone}/operations/delete-${instanceName}-${Date.now()}`
      };
      
      return of(mockOperation);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const zoneName = zone.split('/').pop();
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${zoneName}/instances/${instanceName}`;
    
    return this.http.delete<InstanceOperation>(url, { headers });
  }

  /**
   * Create a new VM instance
   */
  createInstance(instanceConfig: any): Observable<InstanceOperation> {
    if (this.authService.isDemoMode()) {
      // Create mock instance
      const mockInstance: VmInstance = {
        id: Math.random().toString(36).substr(2, 9),
        name: instanceConfig.name,
        zone: instanceConfig.zone,
        machineType: instanceConfig.machineType,
        status: 'PROVISIONING',
        internalIp: '10.128.0.' + Math.floor(Math.random() * 255),
        externalIp: instanceConfig.externalIp ? '34.123.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255) : undefined,
        networkInterfaces: [{
          name: 'nic0',
          network: instanceConfig.network,
          subnetwork: instanceConfig.subnet,
          networkIP: '10.128.0.' + Math.floor(Math.random() * 255),
          accessConfigs: instanceConfig.externalIp ? [{
            type: 'ONE_TO_ONE_NAT',
            name: 'External NAT',
            natIP: '34.123.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
            networkTier: 'PREMIUM',
            kind: 'compute#accessConfig'
          }] : [],
          fingerprint: 'fingerprint',
          kind: 'compute#networkInterface',
          stackType: 'IPV4_ONLY'
        }],
        disks: [{
          boot: true,
          deviceName: 'persistent-disk-0',
          index: 0,
          kind: 'compute#attachedDisk',
          source: 'projects/project/zones/' + instanceConfig.zone + '/disks/' + instanceConfig.name,
          type: 'PERSISTENT',
          mode: 'READ_WRITE',
          autoDelete: true,
          interface: 'SCSI',
          guestOsFeatures: [],
          diskSizeGb: instanceConfig.bootDiskSize.toString()
        }],
        serviceAccounts: [{
          email: 'default',
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        }],
        metadata: {
          fingerprint: 'fingerprint',
          items: [],
          kind: 'compute#metadata'
        },
        tags: {
          items: instanceConfig.networkTags || [],
          fingerprint: 'fingerprint'
        },
        labels: {},
        creationTimestamp: new Date().toISOString(),
        selfLink: 'projects/project/zones/' + instanceConfig.zone + '/instances/' + instanceConfig.name,
        kind: 'compute#instance',
        cpuPlatform: 'Intel Broadwell',
        scheduling: {
          automaticRestart: true,
          onHostMaintenance: 'MIGRATE',
          preemptible: false
        },
        canIpForward: false,
        fingerprint: 'fingerprint',
        startRestricted: false,
        deletionProtection: false,
        reservationAffinity: {
          consumeReservationType: 'ANY_RESERVATION'
        },
        displayDevice: {
          enableDisplay: false
        },
        shieldedInstanceConfig: {
          enableSecureBoot: false,
          enableVtpm: true,
          enableIntegrityMonitoring: true
        },
        confidentialInstanceConfig: {
          enableConfidentialCompute: false
        }
      };

      // Add to mock instances
      this.mockInstances.push(mockInstance);
      this.instancesSubject.next([...this.mockInstances]);

      const mockOperation: InstanceOperation = {
        kind: 'compute#operation',
        id: '111222333',
        name: `create-${instanceConfig.name}-${Date.now()}`,
        zone: instanceConfig.zone,
        operationType: 'insert',
        targetLink: `${instanceConfig.zone}/instances/${instanceConfig.name}`,
        targetId: '111222333',
        status: 'DONE',
        user: 'user@example.com',
        progress: 100,
        insertTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        selfLink: `${instanceConfig.zone}/operations/create-${instanceConfig.name}-${Date.now()}`
      };

      // Simulate instance starting after creation
      setTimeout(() => {
        const instance = this.mockInstances.find(i => i.name === instanceConfig.name);
        if (instance) {
          instance.status = 'RUNNING';
          this.instancesSubject.next([...this.mockInstances]);
        }
      }, 2000);

      return of(mockOperation);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Build the instance configuration for GCP API
    const instanceBody = {
      name: instanceConfig.name,
      machineType: `zones/${instanceConfig.zone}/machineTypes/${instanceConfig.machineType}`,
      disks: [
        {
          boot: true,
          autoDelete: true,
          initializeParams: {
            sourceImage: instanceConfig.sourceImage,
            diskType: `zones/${instanceConfig.zone}/diskTypes/${instanceConfig.bootDiskType}`,
            diskSizeGb: instanceConfig.bootDiskSize.toString()
          }
        }
      ],
      networkInterfaces: this.buildNetworkInterfaces(instanceConfig, currentProject.id),
      tags: {
        items: [...(instanceConfig.networkTags || [])]
      },
      metadata: {
        items: []
      },
      serviceAccounts: [
        {
          email: 'default',
          scopes: [
            'https://www.googleapis.com/auth/cloud-platform'
          ]
        }
      ]
    };

    // Add firewall tags based on traffic settings
    if (instanceConfig.allowHttpTraffic) {
      instanceBody.tags.items.push('http-server');
    }
    if (instanceConfig.allowHttpsTraffic) {
      instanceBody.tags.items.push('https-server');
    }

    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${instanceConfig.zone}/instances`;

    return this.http.post<InstanceOperation>(url, instanceBody, { headers }).pipe(
      tap(() => {
        // Refresh instances list after creation
        this.loadInstances().subscribe();
      }),
      catchError(error => {
        const errorMessage = `Failed to create instance ${instanceConfig.name}: ${error.error?.error?.message || error.message}`;
        this.logApiError(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Build network interfaces configuration for instance creation
   */
  private buildNetworkInterfaces(instanceConfig: any, projectId: string): any[] {
    const networkInterfaces = [];
    
    // Primary network interface
    const primaryInterface: any = {
      network: `global/networks/${instanceConfig.network}`,
      accessConfigs: []
    };

    // Add subnetwork if not using default network
    if (instanceConfig.subnet && instanceConfig.subnet !== 'default') {
      const region = instanceConfig.zone.substring(0, instanceConfig.zone.lastIndexOf('-'));
      primaryInterface.subnetwork = `regions/${region}/subnetworks/${instanceConfig.subnet}`;
    }

    // Add external IP configuration
    if (instanceConfig.externalIp) {
      primaryInterface.accessConfigs.push({
        type: 'ONE_TO_ONE_NAT',
        name: 'External NAT',
        networkTier: 'PREMIUM'
      });
    }

    // Add IP stack configuration (IPv4 only by default, can be extended)
    primaryInterface.stackType = 'IPV4_ONLY';

    networkInterfaces.push(primaryInterface);

    // Support for additional network interfaces (from instanceConfig.additionalNetworkInterfaces if provided)
    if (instanceConfig.additionalNetworkInterfaces && Array.isArray(instanceConfig.additionalNetworkInterfaces)) {
      instanceConfig.additionalNetworkInterfaces.forEach((additionalInterface: any, index: number) => {
        const networkInterface: any = {
          network: `global/networks/${additionalInterface.network}`,
          accessConfigs: []
        };

        if (additionalInterface.subnet && additionalInterface.subnet !== 'default') {
          const region = instanceConfig.zone.substring(0, instanceConfig.zone.lastIndexOf('-'));
          networkInterface.subnetwork = `regions/${region}/subnetworks/${additionalInterface.subnet}`;
        }

        if (additionalInterface.externalIp) {
          networkInterface.accessConfigs.push({
            type: 'ONE_TO_ONE_NAT',
            name: `External NAT ${index + 1}`,
            networkTier: additionalInterface.networkTier || 'PREMIUM'
          });
        }

        networkInterface.stackType = additionalInterface.stackType || 'IPV4_ONLY';

        // Add alias IP ranges if specified
        if (additionalInterface.aliasIpRanges && Array.isArray(additionalInterface.aliasIpRanges)) {
          networkInterface.aliasIpRanges = additionalInterface.aliasIpRanges;
        }

        networkInterfaces.push(networkInterface);
      });
    }

    return networkInterfaces;
  }

  /**
   * Get networks for the current project
   */
  getNetworks(): Observable<any> {
    if (this.authService.isDemoMode()) {
      // Return mock networks for demo mode
      const mockNetworks = {
        items: [
          {
            name: 'default',
            description: 'Default network for the project',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/default',
            autoCreateSubnetworks: true,
            routingConfig: { routingMode: 'REGIONAL' }
          },
          {
            name: 'custom-network',
            description: 'Custom network',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/custom-network',
            autoCreateSubnetworks: false,
            routingConfig: { routingMode: 'REGIONAL' }
          }
        ]
      };
      return of(mockNetworks);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const url = `https://compute.googleapis.com/compute/v1/projects/${currentProject.id}/global/networks`;
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(url, { headers });
  }

  /**
   * Get subnetworks for a specific region
   */
  getSubnetworks(region: string, networkName?: string): Observable<any> {
    if (this.authService.isDemoMode()) {
      // Return mock subnetworks for demo mode
      const mockSubnetworks = {
        items: [
          {
            name: 'default',
            description: 'Default subnetwork',
            network: `https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/${networkName || 'default'}`,
            ipCidrRange: '10.128.0.0/20',
            region: `https://www.googleapis.com/compute/v1/projects/demo-project/regions/${region}`,
            selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/regions/${region}/subnetworks/default`
          }
        ]
      };
      return of(mockSubnetworks);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    const url = `https://compute.googleapis.com/compute/v1/projects/${currentProject.id}/regions/${region}/subnetworks`;
    const headers = this.getAuthHeaders();
    
    return this.http.get<any>(url, { headers });
  }

  /**
   * Get machine types for a specific zone
   */
  getMachineTypes(zone: string): Observable<MachineType[]> {
    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    if (this.authService.isDemoMode()) {
      const mockMachineTypes: MachineType[] = [
        {
          id: '1',
          name: 'e2-micro',
          description: 'E2 micro instance',
          guestCpus: 2,
          memoryMb: 1024,
          zone: zone,
          selfLink: `${zone}/machineTypes/e2-micro`,
          kind: 'compute#machineType',
          maximumPersistentDisks: 16,
          maximumPersistentDisksSizeGb: '65536'
        },
        {
          id: '2',
          name: 'e2-small',
          description: 'E2 small instance',
          guestCpus: 2,
          memoryMb: 2048,
          zone: zone,
          selfLink: `${zone}/machineTypes/e2-small`,
          kind: 'compute#machineType',
          maximumPersistentDisks: 16,
          maximumPersistentDisksSizeGb: '65536'
        },
        {
          id: '3',
          name: 'e2-medium',
          description: 'E2 medium instance',
          guestCpus: 2,
          memoryMb: 4096,
          zone: zone,
          selfLink: `${zone}/machineTypes/e2-medium`,
          kind: 'compute#machineType',
          maximumPersistentDisks: 16,
          maximumPersistentDisksSizeGb: '65536'
        }
      ];
      return of(mockMachineTypes);
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const zoneName = zone.split('/').pop();
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones/${zoneName}/machineTypes`;
    
    return this.http.get<{ items: MachineType[] }>(url, { headers }).pipe(
      map(response => response.items || [])
    );
  }

  /**
   * Get zones for the current project
   */
  getZones(): Observable<Zone[]> {
    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      return throwError(() => new Error('No project selected'));
    }

    if (this.authService.isDemoMode()) {
      const mockZones: Zone[] = [
        {
          id: '1',
          name: 'us-central1-a',
          description: 'us-central1-a',
          status: 'UP',
          region: 'projects/my-project/regions/us-central1',
          selfLink: 'projects/my-project/zones/us-central1-a',
          kind: 'compute#zone',
          availableCpuPlatforms: ['Intel Skylake', 'Intel Broadwell']
        },
        {
          id: '2',
          name: 'us-central1-b',
          description: 'us-central1-b',
          status: 'UP',
          region: 'projects/my-project/regions/us-central1',
          selfLink: 'projects/my-project/zones/us-central1-b',
          kind: 'compute#zone',
          availableCpuPlatforms: ['Intel Skylake', 'Intel Broadwell']
        },
        {
          id: '3',
          name: 'us-west1-a',
          description: 'us-west1-a',
          status: 'UP',
          region: 'projects/my-project/regions/us-west1',
          selfLink: 'projects/my-project/zones/us-west1-a',
          kind: 'compute#zone',
          availableCpuPlatforms: ['Intel Cascade Lake']
        }
      ];
      return of(mockZones);
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No authentication token available'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${this.baseUrl}/projects/${currentProject.id}/zones`;
    
    return this.http.get<{ items: Zone[] }>(url, { headers }).pipe(
      map(response => response.items || [])
    );
  }

  /**
   * Get current instances from the subject (for immediate access)
   */
  getCurrentInstances(): VmInstance[] {
    return this.instancesSubject.value;
  }

  /**
   * Filter instances by zone
   */
  filterInstancesByZone(zoneName: string): VmInstance[] {
    const instances = this.getCurrentInstances();
    if (!zoneName || zoneName === 'all') {
      return instances;
    }
    return instances.filter(instance => instance.zone.includes(zoneName));
  }

  /**
   * Filter instances by status
   */
  filterInstancesByStatus(status: string): VmInstance[] {
    const instances = this.getCurrentInstances();
    if (!status || status === 'all') {
      return instances;
    }
    return instances.filter(instance => instance.status === status);
  }

  /**
   * Search instances by name or label
   */
  searchInstances(query: string): VmInstance[] {
    const instances = this.getCurrentInstances();
    if (!query) {
      return instances;
    }
    
    const lowercaseQuery = query.toLowerCase();
    return instances.filter(instance => 
      instance.name.toLowerCase().includes(lowercaseQuery) ||
      Object.values(instance.labels).some(label => 
        label.toLowerCase().includes(lowercaseQuery)
      ) ||
      instance.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Extract zone name from zone URL
   */
  extractZoneName(zone: string): string {
    return zone.split('/').pop() || zone;
  }

  /**
   * Extract machine type name from machine type URL
   */
  extractMachineTypeName(machineType: string): string {
    return machineType.split('/').pop() || machineType;
  }

  /**
   * Extract network name from network URL
   */
  extractNetworkName(network: string): string {
    return network.split('/').pop() || network;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'RUNNING': return 'green';
      case 'STOPPED': return 'red';
      case 'STOPPING': return 'orange';
      case 'PROVISIONING': return 'blue';
      case 'STAGING': return 'blue';
      case 'SUSPENDING': return 'orange';
      case 'SUSPENDED': return 'yellow';
      case 'TERMINATED': return 'red';
      default: return 'grey';
    }
  }

  /**
   * Log detailed API error information for debugging
   */
  private logApiError(error: any): void {
    console.error('🚫 VM INSTANCES API ERROR ANALYSIS:');
    console.error('');
    console.error('📋 CURRENT IMPLEMENTATION:');
    console.error('   • URL: https://compute.googleapis.com/compute/v1');
    console.error('   • Authentication: OAuth 2.0 Bearer Token');
    console.error('   • Method: GET aggregated/instances');
    console.error('');
    
    if (error.status === 401) {
      console.error('🔒 AUTHENTICATION ERROR:');
      console.error('   • Status: 401 Unauthorized');
      console.error('   • Required Scopes: https://www.googleapis.com/auth/compute.readonly');
      console.error('   • Solution: Ensure user has proper GCP permissions');
    } else if (error.status === 403) {
      console.error('⛔ PERMISSION ERROR:');
      console.error('   • Status: 403 Forbidden');
      console.error('   • Required: Compute Engine API enabled');
      console.error('   • Solution: Enable Compute Engine API in project');
    } else if (error.status === 404) {
      console.error('❓ NOT FOUND:');
      console.error('   • Status: 404 Not Found');
      console.error('   • Possible: No VM instances exist');
      console.error('   • Normal: This is expected for new projects');
    } else if (error.status === 0) {
      console.error('🌐 NETWORK/CORS ERROR:');
      console.error('   • Status: 0 (Network blocked)');
      console.error('   • Cause: Browser CORS policy');
      console.error('   • Solution: Deploy to Google Cloud Platform');
    }
    
    console.error('');
    console.error('✅ NEXT STEPS:');
    console.error('   1. Deploy to Google Cloud (App Engine/Cloud Run)');
    console.error('   2. Use Service Account authentication');
    console.error('   3. Enable Compute Engine API');
    console.error('   4. Use backend proxy for browser apps');
  }
}