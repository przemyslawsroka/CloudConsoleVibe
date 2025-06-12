import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface NetworkConnectivityHub {
  name: string;
  description?: string;
  labels?: { [key: string]: string };
  createTime?: string;
  updateTime?: string;
  routingVpcs?: string[];
  state?: 'ACTIVE' | 'CREATING' | 'DELETING' | 'UPDATING';
  spokeCount?: number;
  policyBasedRoutingSupported?: boolean;
}

export interface NetworkConnectivitySpoke {
  name: string;
  hub: string;
  description?: string;
  labels?: { [key: string]: string };
  createTime?: string;
  updateTime?: string;
  linkedVpnTunnels?: any[];
  linkedInterconnectAttachments?: any[];
  linkedRouterApplianceInstances?: any[];
  linkedVpcNetwork?: any;
  state?: 'ACTIVE' | 'CREATING' | 'DELETING' | 'UPDATING';
  spokeType?: string;
}

export interface PolicyBasedRoute {
  name: string;
  description?: string;
  labels?: { [key: string]: string };
  network: string;
  filter: {
    protocolVersion: 'IPV4' | 'IPV6';
    ipProtocol?: string;
    srcRange?: string;
    destRange?: string;
  };
  priority: number;
  nextHopHub?: string;
  nextHopIlbIp?: string;
  createTime?: string;
  updateTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkConnectivityService {
  private baseUrl = 'https://networkconnectivity.googleapis.com/v1';
  private projectId = 'demo-project'; // This should come from configuration

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      // In real implementation, add Authorization header with OAuth token
      // 'Authorization': `Bearer ${this.authService.getAccessToken()}`
    });
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }

  // Hub operations
  listHubs(projectId?: string): Observable<{ hubs: NetworkConnectivityHub[] }> {
    const project = projectId || this.projectId;
    
    // Real API call (commented out for demo)
    // return this.http.get<{ hubs: NetworkConnectivityHub[] }>(
    //   `${this.baseUrl}/projects/${project}/locations/global/hubs`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('listHubs', { hubs: [] }))
    // );
    
    // Mock implementation for demo
    return of({
      hubs: [
        {
          name: `projects/${project}/locations/global/hubs/main-hub`,
          description: 'Main connectivity hub for hybrid network',
          labels: { environment: 'production', team: 'networking' },
          state: 'ACTIVE',
          spokeCount: 5,
          policyBasedRoutingSupported: true,
          createTime: '2024-01-15T10:30:00Z',
          updateTime: '2024-01-15T10:30:00Z'
        },
        {
          name: `projects/${project}/locations/global/hubs/dev-hub`,
          description: 'Development environment hub',
          labels: { environment: 'development', team: 'dev-ops' },
          state: 'ACTIVE',
          spokeCount: 2,
          policyBasedRoutingSupported: false,
          createTime: '2024-01-10T14:20:00Z',
          updateTime: '2024-01-12T09:15:00Z'
        }
      ]
    });
  }

  createHub(hubId: string, hub: Partial<NetworkConnectivityHub>, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.post(
    //   `${this.baseUrl}/projects/${project}/locations/global/hubs?hubId=${hubId}`,
    //   hub,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('createHub'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/global/operations/create-hub-${hubId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/global/hubs/${hubId}`,
        verb: 'create'
      }
    });
  }

  getHub(hubId: string, projectId?: string): Observable<NetworkConnectivityHub> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get<NetworkConnectivityHub>(
    //   `${this.baseUrl}/projects/${project}/locations/global/hubs/${hubId}`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('getHub'))
    // );
    
    return of({
      name: `projects/${project}/locations/global/hubs/${hubId}`,
      description: 'Hub details',
      state: 'ACTIVE',
      spokeCount: 3,
      createTime: '2024-01-15T10:30:00Z',
      updateTime: '2024-01-15T10:30:00Z'
    });
  }

  updateHub(hubId: string, hub: Partial<NetworkConnectivityHub>, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.patch(
    //   `${this.baseUrl}/projects/${project}/locations/global/hubs/${hubId}`,
    //   hub,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('updateHub'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/global/operations/update-hub-${hubId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/global/hubs/${hubId}`,
        verb: 'update'
      }
    });
  }

  deleteHub(hubId: string, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.delete(
    //   `${this.baseUrl}/projects/${project}/locations/global/hubs/${hubId}`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('deleteHub'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/global/operations/delete-hub-${hubId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/global/hubs/${hubId}`,
        verb: 'delete'
      }
    });
  }

  // Spoke operations
  listSpokes(region: string, projectId?: string): Observable<{ spokes: NetworkConnectivitySpoke[] }> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get<{ spokes: NetworkConnectivitySpoke[] }>(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/spokes`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('listSpokes', { spokes: [] }))
    // );
    
    return of({
      spokes: [
        {
          name: `projects/${project}/locations/${region}/spokes/vpc-spoke`,
          hub: `projects/${project}/locations/global/hubs/main-hub`,
          description: 'VPC network spoke',
          state: 'ACTIVE',
          spokeType: 'VPC_NETWORK',
          linkedVpcNetwork: {
            uri: `projects/${project}/global/networks/default`
          },
          createTime: '2024-01-15T11:00:00Z',
          updateTime: '2024-01-15T11:00:00Z'
        },
        {
          name: `projects/${project}/locations/${region}/spokes/vpn-spoke`,
          hub: `projects/${project}/locations/global/hubs/main-hub`,
          description: 'VPN tunnel spoke',
          state: 'ACTIVE',
          spokeType: 'VPN_TUNNEL',
          linkedVpnTunnels: [
            {
              uri: `projects/${project}/regions/${region}/vpnTunnels/tunnel-1`
            }
          ],
          createTime: '2024-01-16T09:30:00Z',
          updateTime: '2024-01-16T09:30:00Z'
        }
      ]
    });
  }

  createSpoke(region: string, spokeId: string, spoke: Partial<NetworkConnectivitySpoke>, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.post(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/spokes?spokeId=${spokeId}`,
    //   spoke,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('createSpoke'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/${region}/operations/create-spoke-${spokeId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/${region}/spokes/${spokeId}`,
        verb: 'create'
      }
    });
  }

  getSpoke(region: string, spokeId: string, projectId?: string): Observable<NetworkConnectivitySpoke> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get<NetworkConnectivitySpoke>(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/spokes/${spokeId}`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('getSpoke'))
    // );
    
    return of({
      name: `projects/${project}/locations/${region}/spokes/${spokeId}`,
      hub: `projects/${project}/locations/global/hubs/main-hub`,
      description: 'Spoke details',
      state: 'ACTIVE',
      spokeType: 'VPC_NETWORK',
      createTime: '2024-01-15T11:00:00Z',
      updateTime: '2024-01-15T11:00:00Z'
    });
  }

  updateSpoke(region: string, spokeId: string, spoke: Partial<NetworkConnectivitySpoke>, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.patch(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/spokes/${spokeId}`,
    //   spoke,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('updateSpoke'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/${region}/operations/update-spoke-${spokeId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/${region}/spokes/${spokeId}`,
        verb: 'update'
      }
    });
  }

  deleteSpoke(region: string, spokeId: string, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.delete(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/spokes/${spokeId}`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('deleteSpoke'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/${region}/operations/delete-spoke-${spokeId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/${region}/spokes/${spokeId}`,
        verb: 'delete'
      }
    });
  }

  // Policy-based routing operations
  listPolicyBasedRoutes(projectId?: string): Observable<{ policyBasedRoutes: PolicyBasedRoute[] }> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get<{ policyBasedRoutes: PolicyBasedRoute[] }>(
    //   `${this.baseUrl}/projects/${project}/locations/global/policyBasedRoutes`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('listPolicyBasedRoutes', { policyBasedRoutes: [] }))
    // );
    
    return of({ 
      policyBasedRoutes: [
        {
          name: `projects/${project}/locations/global/policyBasedRoutes/route-1`,
          description: 'Route traffic to security hub',
          network: `projects/${project}/global/networks/default`,
          filter: {
            protocolVersion: 'IPV4',
            srcRange: '10.0.0.0/8',
            destRange: '0.0.0.0/0'
          },
          priority: 1000,
          nextHopHub: `projects/${project}/locations/global/hubs/security-hub`,
          createTime: '2024-01-15T12:00:00Z',
          updateTime: '2024-01-15T12:00:00Z'
        }
      ]
    });
  }

  createPolicyBasedRoute(routeId: string, route: Partial<PolicyBasedRoute>, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.post(
    //   `${this.baseUrl}/projects/${project}/locations/global/policyBasedRoutes?policyBasedRouteId=${routeId}`,
    //   route,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('createPolicyBasedRoute'))
    // );
    
    return of({ 
      name: `operations/projects/${project}/locations/global/operations/create-route-${routeId}`,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
        createTime: new Date().toISOString(),
        target: `projects/${project}/locations/global/policyBasedRoutes/${routeId}`,
        verb: 'create'
      }
    });
  }

  // Service connection operations
  listServiceConnections(region: string, projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get(
    //   `${this.baseUrl}/projects/${project}/locations/${region}/serviceConnections`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('listServiceConnections', { serviceConnections: [] }))
    // );
    
    return of({ 
      serviceConnections: [
        {
          name: `projects/${project}/locations/${region}/serviceConnections/connection-1`,
          description: 'Service connection to managed service',
          network: `projects/${project}/global/networks/default`,
          pscConfig: {
            subnetworks: [`projects/${project}/regions/${region}/subnetworks/subnet-1`]
          },
          createTime: '2024-01-15T13:00:00Z',
          updateTime: '2024-01-15T13:00:00Z'
        }
      ]
    });
  }

  // Operations management
  getOperation(operationName: string): Observable<any> {
    // Real API call
    // return this.http.get(
    //   `${this.baseUrl}/${operationName}`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('getOperation'))
    // );
    
    return of({
      name: operationName,
      done: true,
      response: {
        '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.Hub',
        name: 'projects/demo-project/locations/global/hubs/test-hub',
        state: 'ACTIVE'
      }
    });
  }

  listOperations(projectId?: string): Observable<any> {
    const project = projectId || this.projectId;
    
    // Real API call
    // return this.http.get(
    //   `${this.baseUrl}/projects/${project}/locations/global/operations`,
    //   { headers: this.getHeaders() }
    // ).pipe(
    //   catchError(this.handleError('listOperations', { operations: [] }))
    // );
    
    return of({ 
      operations: [
        {
          name: `projects/${project}/locations/global/operations/operation-1`,
          done: true,
          metadata: {
            '@type': 'type.googleapis.com/google.cloud.networkconnectivity.v1.OperationMetadata',
            createTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-15T10:35:00Z',
            target: `projects/${project}/locations/global/hubs/main-hub`,
            verb: 'create'
          }
        }
      ]
    });
  }
} 