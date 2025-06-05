import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface VpcNetwork {
  id: string;
  name: string;
  description?: string;
  selfLink: string;
  autoCreateSubnetworks: boolean;
  creationTimestamp: string;
  subnetworks: string[];
  routingConfig?: {
    routingMode: string;
  };
  subnetDetails?: SubnetDetails[];
}

export interface SubnetDetails {
  name: string;
  region: string;
  ipCidrRange: string;
  gatewayAddress: string;
  selfLink: string;
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  network: string;
  destRange: string;
  priority: number;
  tags?: string[];
  nextHopInstance?: string;
  nextHopIp?: string;
  nextHopNetwork?: string;
  nextHopGateway?: string;
  nextHopVpnTunnel?: string;
  nextHopIlb?: string;
  selfLink: string;
}

export interface FlowLog {
  name: string;
  network: string;
  enabled: boolean;
  aggregationInterval?: string;
  flowSampling?: number;
  metadata?: string[];
  filterExpr?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VpcService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getVpcNetworks(projectId: string): Observable<VpcNetwork[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networks`;
    return this.http.get<{ items: VpcNetwork[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || [])
    );
  }

  getVpcNetwork(projectId: string, networkName: string): Observable<VpcNetwork> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networks/${networkName}`;
    return this.http.get<VpcNetwork>(url, { headers: this.getHeaders() }).pipe(
      switchMap(vpc => {
        if (vpc.subnetworks && vpc.subnetworks.length > 0) {
          // Fetch details for each subnet
          const subnetDetails$ = vpc.subnetworks.map(subnetUrl => this.getSubnetDetails(subnetUrl));
          return forkJoin(subnetDetails$).pipe(
            map(details => {
              return {
                ...vpc,
                subnetDetails: details
              };
            })
          );
        }
        return of(vpc);
      })
    );
  }

  getRoutes(projectId: string): Observable<Route[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/routes`;
    return this.http.get<{ items: Route[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || [])
    );
  }

  private getSubnetDetails(subnetUrl: string): Observable<SubnetDetails> {
    return this.http.get<SubnetDetails>(subnetUrl, { headers: this.getHeaders() });
  }

  createVpcNetwork(projectId: string, network: Partial<VpcNetwork>): Observable<VpcNetwork> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networks`;
    return this.http.post<VpcNetwork>(url, network, { headers: this.getHeaders() });
  }

  deleteVpcNetwork(projectId: string, networkName: string): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networks/${networkName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  createRoute(projectId: string, route: Partial<Route>): Observable<Route> {
    const url = `${this.baseUrl}/projects/${projectId}/global/routes`;
    
    // Format the route payload according to GCP Compute API requirements
    const routePayload: Partial<Route> = {
      name: route.name,
      network: route.network,
      destRange: route.destRange,
      priority: route.priority,
      tags: route.tags || [],
      ...(route.description && { description: route.description })
    };

    // Add the appropriate next hop field based on the type
    if (route.nextHopInstance) {
      routePayload.nextHopInstance = `projects/${projectId}/zones/${route.nextHopInstance}/instances/${route.nextHopInstance}`;
    } else if (route.nextHopIp) {
      routePayload.nextHopIp = route.nextHopIp;
    } else if (route.nextHopNetwork) {
      routePayload.nextHopNetwork = route.nextHopNetwork;
    } else if (route.nextHopGateway) {
      routePayload.nextHopGateway = `projects/${projectId}/global/gateways/${route.nextHopGateway}`;
    } else if (route.nextHopVpnTunnel) {
      routePayload.nextHopVpnTunnel = `projects/${projectId}/regions/${route.nextHopVpnTunnel}/vpnTunnels/${route.nextHopVpnTunnel}`;
    } else if (route.nextHopIlb) {
      routePayload.nextHopIlb = `projects/${projectId}/regions/${route.nextHopIlb}/forwardingRules/${route.nextHopIlb}`;
    }

    return this.http.post<Route>(url, routePayload, { headers: this.getHeaders() });
  }

  getFlowLogs(projectId: string, location: string = 'global'): Observable<any[]> {
    const url = `https://networkmanagement.googleapis.com/v1/projects/${projectId}/locations/${location}/vpcFlowLogsConfigs`;
    return this.http.get<{ vpcFlowLogsConfigs: any[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.vpcFlowLogsConfigs || [])
    );
  }

  createFlowLog(projectId: string, payload: any, location: string = 'global'): Observable<any> {
    const url = `https://networkmanagement.googleapis.com/v1/projects/${projectId}/locations/${location}/vpcFlowLogsConfigs`;
    return this.http.post<any>(url, payload, { headers: this.getHeaders() });
  }

  updateFlowLogs(projectId: string, configName: string, updates: any, location: string = 'global'): Observable<any> {
    // configName should be the full resource name, e.g. projects/{project}/locations/{location}/vpcFlowLogsConfigs/{config}
    const url = `https://networkmanagement.googleapis.com/v1/${configName}`;
    return this.http.patch<any>(url, updates, { headers: this.getHeaders() });
  }

  deleteFlowLogs(projectId: string, configName: string, location: string = 'global'): Observable<void> {
    // configName should be the full resource name, e.g. projects/{project}/locations/{location}/vpcFlowLogsConfigs/{config}
    const url = `https://networkmanagement.googleapis.com/v1/${configName}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }
} 