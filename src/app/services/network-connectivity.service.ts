import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProjectService } from './project.service';

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
}

@Injectable({
  providedIn: 'root'
})
export class NetworkConnectivityService {
  constructor(
    private http: HttpClient,
    private projectService: ProjectService
  ) {}

  getNccRouters(): Observable<any[]> {
    // TODO: Implement actual API call to Network Connectivity API
    // For now, return mock data
    const mockHubs = [
      {
        name: 'projects/my-project/locations/global/hubs/my-hub',
        description: 'Test NCC Router',
          state: 'ACTIVE',
        spokeCount: 3
      }
    ];

    return of(mockHubs);
  }

  getHubs(projectId: string): Observable<NetworkConnectivityHub[]> {
    // TODO: Implement actual API call
    const mockHubs: NetworkConnectivityHub[] = [
      {
        name: 'my-hub',
        description: 'Test hub',
      state: 'ACTIVE',
        spokeCount: 2,
        routingVpcs: ['projects/my-project/global/networks/my-vpc']
      }
    ];

    return of(mockHubs);
  }

  listHubs(projectId: string): Observable<NetworkConnectivityHub[]> {
    // Alias for getHubs to maintain compatibility
    return this.getHubs(projectId);
  }

  getSpokes(projectId: string, hubName?: string): Observable<NetworkConnectivitySpoke[]> {
    // TODO: Implement actual API call
    const mockSpokes: NetworkConnectivitySpoke[] = [
      {
        name: 'my-spoke',
        hub: hubName || 'my-hub',
        description: 'Test spoke',
          state: 'ACTIVE',
          linkedVpcNetwork: {
          uri: 'projects/my-project/global/networks/my-vpc'
        }
      }
    ];

    return of(mockSpokes);
  }

  createHub(projectId: string, hub: Partial<NetworkConnectivityHub>): Observable<any> {
    // TODO: Implement actual API call
    console.log('Creating hub:', hub);
    return of({ success: true });
  }

  deleteHub(projectId: string, hubName: string): Observable<any> {
    // TODO: Implement actual API call
    console.log('Deleting hub:', hubName);
    return of({ success: true });
  }

  createSpoke(projectId: string, spoke: Partial<NetworkConnectivitySpoke>): Observable<any> {
    // TODO: Implement actual API call
    console.log('Creating spoke:', spoke);
    return of({ success: true });
  }

  deleteSpoke(projectId: string, spokeName: string): Observable<any> {
    // TODO: Implement actual API call
    console.log('Deleting spoke:', spokeName);
    return of({ success: true });
  }
} 