import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface VmInstance {
  name: string;
  zone: string;
  machineType: string;
  status: string;
  id?: string;
  internalIp?: string;
  externalIp?: string;
  creationTimestamp?: string;
  networkInterfaces?: any[];
  disks?: any[];
  scheduling?: any;
}

export interface InstanceOperation {
  status: string;
}

export interface MachineType {
  name: string;
  description: string;
}

export interface Zone {
  name: string;
  description: string;
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

  private mockInstances: VmInstance[] = [
    {
      id: '1234567890123456789',
      name: 'demo-web-server-1',
      zone: 'projects/demo-project/zones/us-central1-a',
      machineType: 'projects/demo-project/zones/us-central1-a/machineTypes/e2-medium',
      status: 'RUNNING',
      internalIp: '10.128.0.2',
      externalIp: '34.134.123.45',
      creationTimestamp: '2024-01-15T10:30:00.000-08:00',
      networkInterfaces: [
        { network: 'projects/demo-project/global/networks/default', subnetwork: 'projects/demo-project/regions/us-central1/subnetworks/default' }
      ],
      disks: [
        { boot: true, diskSizeGb: '10', type: 'PERSISTENT' }
      ],
      scheduling: { preemptible: false }
    },
    {
      id: '2345678901234567890',
      name: 'demo-database-server',
      zone: 'projects/demo-project/zones/us-central1-b',
      machineType: 'projects/demo-project/zones/us-central1-b/machineTypes/n2-standard-2',
      status: 'RUNNING',
      internalIp: '10.128.1.3',
      externalIp: '35.202.67.89',
      creationTimestamp: '2024-01-10T14:20:00.000-08:00',
      networkInterfaces: [
        { network: 'projects/demo-project/global/networks/demo-vpc-1', subnetwork: 'projects/demo-project/regions/us-central1/subnetworks/demo-subnet-1' }
      ],
      disks: [
        { boot: true, diskSizeGb: '50', type: 'PERSISTENT' }
      ],
      scheduling: { preemptible: false }
    },
    {
      id: '3456789012345678901',
      name: 'demo-app-server',
      zone: 'projects/demo-project/zones/us-east1-a',
      machineType: 'projects/demo-project/zones/us-east1-a/machineTypes/c2-standard-4',
      status: 'STOPPED',
      internalIp: '10.142.0.5',
      externalIp: '',
      creationTimestamp: '2024-01-08T09:15:00.000-08:00',
      networkInterfaces: [
        { network: 'projects/demo-project/global/networks/demo-vpc-2', subnetwork: 'projects/demo-project/regions/us-east1/subnetworks/demo-subnet-2' }
      ],
      disks: [
        { boot: true, diskSizeGb: '20', type: 'PERSISTENT' }
      ],
      scheduling: { preemptible: true }
    },
    {
      id: '4567890123456789012',
      name: 'demo-monitoring-vm',
      zone: 'projects/demo-project/zones/europe-west1-b',
      machineType: 'projects/demo-project/zones/europe-west1-b/machineTypes/e2-small',
      status: 'RUNNING',
      internalIp: '10.132.0.7',
      externalIp: '34.78.123.200',
      creationTimestamp: '2024-01-05T16:45:00.000-08:00',
      networkInterfaces: [
        { network: 'projects/demo-project/global/networks/default', subnetwork: 'projects/demo-project/regions/europe-west1/subnetworks/default' }
      ],
      disks: [
        { boot: true, diskSizeGb: '10', type: 'PERSISTENT' }
      ],
      scheduling: { preemptible: false }
    },
    {
      id: '5678901234567890123',
      name: 'demo-backup-server',
      zone: 'projects/demo-project/zones/asia-southeast1-a',
      machineType: 'projects/demo-project/zones/asia-southeast1-a/machineTypes/n1-standard-1',
      status: 'PROVISIONING',
      internalIp: '10.148.0.9',
      externalIp: '',
      creationTimestamp: '2024-01-20T08:00:00.000-08:00',
      networkInterfaces: [
        { network: 'projects/demo-project/global/networks/default', subnetwork: 'projects/demo-project/regions/asia-southeast1/subnetworks/default' }
      ],
      disks: [
        { boot: true, diskSizeGb: '25', type: 'PERSISTENT' }
      ],
      scheduling: { preemptible: false }
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  loadInstances(): Observable<VmInstance[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) {
      this.instancesSubject.next([]);
      return of([]);
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    if (this.authService.isDemoMode()) {
      console.log('🎯 ComputeEngine Service - Loading mock instances:', this.mockInstances.length);
      this.instancesSubject.next(this.mockInstances);
      this.loadingSubject.next(false);
      return of(this.mockInstances);
    }
    
    const url = `${this.baseUrl}/projects/${project.id}/aggregated/instances`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        const instances: VmInstance[] = [];
        if (response.items) {
          for (const key in response.items) {
            if (response.items[key].instances) {
              instances.push(...response.items[key].instances);
            }
          }
        }
        console.log('🎯 ComputeEngine Service - Loaded real instances:', instances.length);
        this.instancesSubject.next(instances);
        return instances;
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next(error.message || 'Failed to load instances');
        return this.handleError(error);
      })
    );
  }
  
  getVpcNetworks(): Observable<any[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      const mockNetworks = [
        { name: 'demo-vpc-1', description: 'Default VPC network for demo' },
        { name: 'demo-vpc-2', description: 'Secondary VPC network for testing' }
      ];
      return of(mockNetworks);
    }

    const url = `${this.baseUrl}/projects/${project.id}/global/networks`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items || []),
      catchError(this.handleError)
    );
  }

  getVpnTunnels(region: string): Observable<any[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      // Mock data for demo mode
      const mockTunnels = [
        {
          name: 'demo-vpn-tunnel-1',
          description: 'Demo VPN Tunnel to On-Premises',
          region: region,
          peerIp: '203.0.113.1',
          sharedSecret: 'demo-secret',
          status: 'ESTABLISHED'
        },
        {
          name: 'demo-vpn-tunnel-2',
          description: 'Demo VPN Tunnel to Branch Office',
          region: region,
          peerIp: '203.0.113.2',
          sharedSecret: 'demo-secret-2',
          status: 'ESTABLISHED'
        }
      ];
      return of(mockTunnels);
    }

    const url = `${this.baseUrl}/projects/${project.id}/regions/${region}/vpnTunnels`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items || []),
      catchError(this.handleError)
    );
  }

  getInterconnectAttachments(region: string): Observable<any[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      // Mock data for demo mode
      const mockAttachments = [
        {
          name: 'demo-interconnect-1',
          description: 'Demo Interconnect to Data Center',
          region: region,
          type: 'DEDICATED',
          state: 'ACTIVE',
          mtu: 1440,
          edgeAvailabilityDomain: 'AVAILABILITY_DOMAIN_1'
        },
        {
          name: 'demo-interconnect-2',
          description: 'Demo Interconnect to Branch Office',
          region: region,
          type: 'PARTNER',
          state: 'ACTIVE',
          mtu: 1440,
          edgeAvailabilityDomain: 'AVAILABILITY_DOMAIN_2'
        }
      ];
      return of(mockAttachments);
    }

    const url = `${this.baseUrl}/projects/${project.id}/regions/${region}/interconnectAttachments`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items || []),
      catchError(this.handleError)
    );
  }
  
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getSubnetworks(region: string): Observable<any[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      return of([]);
    }

    const url = `${this.baseUrl}/projects/${project.id}/regions/${region}/subnetworks`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items || []),
      catchError(this.handleError)
    );
  }

  getZones(): Observable<any[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      return of([]);
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items || []),
      catchError(this.handleError)
    );
  }

  getNetworks(): Observable<any[]> {
    // Alias for getVpcNetworks for backward compatibility
    return this.getVpcNetworks();
  }

  createInstance(instanceConfig: any): Observable<any> {
    const project = this.projectService.getCurrentProject();
    if (!project) return throwError(() => new Error('No project selected'));

    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones/${instanceConfig.zone}/instances`;
    return this.http.post<any>(url, instanceConfig, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  startInstance(zone: string, instanceName: string): Observable<any> {
    const project = this.projectService.getCurrentProject();
    if (!project) return throwError(() => new Error('No project selected'));

    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones/${zone}/instances/${instanceName}/start`;
    return this.http.post<any>(url, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  stopInstance(zone: string, instanceName: string): Observable<any> {
    const project = this.projectService.getCurrentProject();
    if (!project) return throwError(() => new Error('No project selected'));

    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones/${zone}/instances/${instanceName}/stop`;
    return this.http.post<any>(url, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  restartInstance(zone: string, instanceName: string): Observable<any> {
    const project = this.projectService.getCurrentProject();
    if (!project) return throwError(() => new Error('No project selected'));

    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones/${zone}/instances/${instanceName}/reset`;
    return this.http.post<any>(url, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  deleteInstance(zone: string, instanceName: string): Observable<any> {
    const project = this.projectService.getCurrentProject();
    if (!project) return throwError(() => new Error('No project selected'));

    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${project.id}/zones/${zone}/instances/${instanceName}`;
    return this.http.delete<any>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  extractNetworkName(networkUrl: string): string {
    const match = networkUrl.match(/\/networks\/([^\/]+)$/);
    return match ? match[1] : networkUrl;
  }

  extractZoneName(zoneUrl: string): string {
    const match = zoneUrl.match(/\/zones\/([^\/]+)$/);
    return match ? match[1] : zoneUrl;
  }

  extractMachineTypeName(machineTypeUrl: string): string {
    const match = machineTypeUrl.match(/\/machineTypes\/([^\/]+)$/);
    return match ? match[1] : machineTypeUrl;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'RUNNING': return '#4caf50';
      case 'STOPPED': return '#f44336';
      case 'PENDING': return '#ff9800';
      default: return '#9e9e9e';
    }
  }

  private handleError(error: any) {
    console.error('An error occurred in ComputeEngineService:', error);
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }
}