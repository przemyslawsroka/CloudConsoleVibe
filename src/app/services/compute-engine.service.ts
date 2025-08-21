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

  private mockInstances: VmInstance[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  loadInstances(): Observable<VmInstance[]> {
    const project = this.projectService.getCurrentProject();
    if (!project) return of([]);

    if (this.authService.isDemoMode()) {
      return of(this.mockInstances);
    }
    
    const url = `${this.baseUrl}/projects/${project.id}/aggregated/instances`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => response.items['vms-and-instances']?.instances || []),
      catchError(this.handleError)
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