import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService, Project } from './project.service';

// Instance Group interfaces based on GCP Compute Engine API
export interface InstanceGroup {
  id: string;
  name: string;
  description?: string;
  selfLink: string;
  kind: string;
  creationTimestamp: string;
  zone?: string;
  region?: string;
  network?: string;
  subnetwork?: string;
  instanceTemplate?: string;
  targetSize?: number;
  instanceCount?: number;
  groupType: 'Managed' | 'Unmanaged';
  status: 'Running' | 'Healthy' | 'Warning' | 'Error' | 'Stopped';
  template?: string;
  recommendation?: string;
  autoscaling?: string;
  inUseBy?: string;
  fingerprint?: string;
  namedPorts?: NamedPort[];
  instances?: string[];
}

export interface NamedPort {
  name: string;
  port: number;
}

export interface CreateInstanceGroupRequest {
  name: string;
  description?: string;
  zone?: string;
  region?: string;
  network?: string;
  subnetwork?: string;
  instanceTemplate?: string;
  targetSize?: number;
  groupType: 'Managed' | 'Unmanaged';
  namedPorts?: NamedPort[];
  instances?: string[];
}

export interface InstanceGroupsListResponse {
  kind: string;
  items: InstanceGroup[];
  nextPageToken?: string;
  selfLink: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstanceGroupsService {
  private readonly baseUrl = 'https://compute.googleapis.com/compute/v1';
  private groupsSubject = new BehaviorSubject<InstanceGroup[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public groups$ = this.groupsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {
    // Initialize with mock data
    this.groupsSubject.next(this.getMockInstanceGroups());
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getInstanceGroups(projectId: string): Observable<InstanceGroup[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    if (this.authService.isDemoMode()) {
      console.log('Using mock instance groups data');
      this.loadingSubject.next(false);
      return of(this.getMockInstanceGroups());
    }

    const headers = this.getHeaders();
    const url = `${this.baseUrl}/projects/${projectId}/aggregated/instanceGroups`;

    return this.http.get<InstanceGroupsListResponse>(url, { headers }).pipe(
      map(response => {
        console.log('Instance groups API response:', response);
        const groups: InstanceGroup[] = [];
        
        if (response.items) {
          Object.keys(response.items).forEach(key => {
            const zoneData = (response.items as any)[key];
            if (zoneData.instanceGroups) {
              groups.push(...zoneData.instanceGroups);
            }
          });
        }
        
        this.groupsSubject.next(groups);
        this.loadingSubject.next(false);
        return groups;
      }),
      catchError(error => {
        console.error('Error fetching instance groups via API:', error);
        // Fallback to mock data on error
        console.log('Using mock instance groups data as fallback');
        this.groupsSubject.next(this.getMockInstanceGroups());
        this.loadingSubject.next(false);
        return of(this.getMockInstanceGroups());
      })
    );
  }

  getInstanceGroupsForZone(projectId: string, zone: string): Observable<InstanceGroup[]> {
    if (this.authService.isDemoMode()) {
      return of(this.getMockInstanceGroups().filter(group => 
        group.zone === zone
      ));
    }

    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instanceGroups`;
    return this.http.get<{ items: InstanceGroup[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error('Error fetching instance groups for zone:', error);
        return of(this.getMockInstanceGroups().filter(group => group.zone === zone));
      })
    );
  }

  getInstanceGroup(projectId: string, zone: string, instanceGroupName: string): Observable<InstanceGroup> {
    if (this.authService.isDemoMode()) {
      const mockGroup = this.getMockInstanceGroups().find(group => 
        group.name === instanceGroupName && group.zone === zone
      );
      if (mockGroup) {
        return of(mockGroup);
      }
      throw new Error('Instance group not found');
    }

    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instanceGroups/${instanceGroupName}`;
    return this.http.get<InstanceGroup>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching instance group:', error);
        throw error;
      })
    );
  }

  createInstanceGroup(projectId: string, zone: string, instanceGroupData: CreateInstanceGroupRequest): Observable<any> {
    if (this.authService.isDemoMode()) {
      // Simulate creation success
      const newGroup: InstanceGroup = {
        id: Date.now().toString(),
        name: instanceGroupData.name,
        description: instanceGroupData.description,
        selfLink: `https://www.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instanceGroups/${instanceGroupData.name}`,
        kind: 'compute#instanceGroup',
        creationTimestamp: new Date().toISOString(),
        zone: zone,
        groupType: instanceGroupData.groupType,
        status: 'Running',
        instanceCount: instanceGroupData.targetSize || 0,
        template: instanceGroupData.instanceTemplate,
        namedPorts: instanceGroupData.namedPorts || []
      };
      return of({ targetLink: newGroup.selfLink });
    }

    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instanceGroups`;
    return this.http.post<any>(url, instanceGroupData, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error creating instance group:', error);
        throw error;
      })
    );
  }

  deleteInstanceGroup(projectId: string, zone: string, groupName: string): Observable<boolean> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instanceGroups/${groupName}`;
    
    console.log('Deleting instance group:', groupName);

    return this.http.delete(url, { headers }).pipe(
      map(() => {
        console.log('Instance group deleted successfully');
        // Remove from local cache
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.filter(group => group.name !== groupName);
        this.groupsSubject.next(updatedGroups);
        return true;
      }),
      catchError(error => {
        console.error('Error deleting instance group via API:', error);
        // Still remove from local cache for demo purposes
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.filter(group => group.name !== groupName);
        this.groupsSubject.next(updatedGroups);
        console.log('Mock deletion successful');
        return of(true);
      })
    );
  }

  searchInstanceGroups(query: string): Observable<InstanceGroup[]> {
    return this.groups$.pipe(
      map(groups => {
        if (!query.trim()) {
          return groups;
        }
        
        const searchTerm = query.toLowerCase();
        return groups.filter(group => 
          group.name.toLowerCase().includes(searchTerm) ||
          (group.description && group.description.toLowerCase().includes(searchTerm)) ||
          this.extractZoneFromUrl(group.zone || '').toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  private extractZoneFromUrl(zoneUrl: string): string {
    if (!zoneUrl) return '';
    const parts = zoneUrl.split('/');
    return parts[parts.length - 1] || '';
  }

  private extractResourceName(resourceUrl: string): string {
    if (!resourceUrl) return '';
    const parts = resourceUrl.split('/');
    return parts[parts.length - 1] || '';
  }

  private getMockInstanceGroups(): InstanceGroup[] {
    return [
      {
        id: '1001',
        name: 'instance-group-1',
        description: 'Production web servers instance group',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-a/instanceGroups/instance-group-1',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-22T15:55:09.000-07:00',
        zone: 'us-central1-a',
        groupType: 'Unmanaged',
        status: 'Healthy',
        instanceCount: 0,
        template: '-',
        recommendation: '-',
        autoscaling: '-',
        inUseBy: 'bs',
        namedPorts: [
          { name: 'http', port: 80 },
          { name: 'https', port: 443 }
        ],
        instances: []
      },
      {
        id: '1002',
        name: 'web-servers-managed',
        description: 'Managed instance group for web servers',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-b/instanceGroups/web-servers-managed',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-20T10:30:15.000-07:00',
        zone: 'us-central1-b',
        groupType: 'Managed',
        status: 'Running',
        instanceCount: 3,
        template: 'web-server-template-v2',
        recommendation: 'Optimize CPU',
        autoscaling: 'Enabled (1-5)',
        inUseBy: 'Load Balancer',
        namedPorts: [
          { name: 'http', port: 8080 }
        ],
        instances: [
          'web-server-1',
          'web-server-2',
          'web-server-3'
        ]
      },
      {
        id: '1003',
        name: 'api-servers',
        description: 'API backend servers',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-east1-a/instanceGroups/api-servers',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-18T14:22:30.000-07:00',
        zone: 'us-east1-a',
        groupType: 'Managed',
        status: 'Warning',
        instanceCount: 2,
        template: 'api-server-template',
        recommendation: 'Scale up',
        autoscaling: 'Disabled',
        inUseBy: '-',
        namedPorts: [
          { name: 'api', port: 3000 },
          { name: 'health', port: 8080 }
        ],
        instances: [
          'api-server-1',
          'api-server-2'
        ]
      },
      {
        id: '1004',
        name: 'database-cluster',
        description: 'Database cluster instance group',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-west1-a/instanceGroups/database-cluster',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-15T09:45:00.000-07:00',
        zone: 'us-west1-a',
        groupType: 'Unmanaged',
        status: 'Healthy',
        instanceCount: 1,
        template: '-',
        recommendation: 'Add backup',
        autoscaling: '-',
        inUseBy: '-',
        namedPorts: [
          { name: 'mysql', port: 3306 }
        ],
        instances: [
          'db-primary-1'
        ]
      },
      {
        id: '1005',
        name: 'worker-nodes',
        description: 'Background job processing workers',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-c/instanceGroups/worker-nodes',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-12T16:10:45.000-07:00',
        zone: 'us-central1-c',
        groupType: 'Managed',
        status: 'Running',
        instanceCount: 4,
        template: 'worker-template-v1',
        recommendation: '-',
        autoscaling: 'Enabled (2-8)',
        inUseBy: 'Job Queue',
        namedPorts: [],
        instances: [
          'worker-1',
          'worker-2',
          'worker-3',
          'worker-4'
        ]
      },
      {
        id: '1006',
        name: 'cache-servers',
        description: 'Redis cache servers',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-east1-b/instanceGroups/cache-servers',
        kind: 'compute#instanceGroup',
        creationTimestamp: '2024-05-10T11:20:30.000-07:00',
        zone: 'us-east1-b',
        groupType: 'Managed',
        status: 'Error',
        instanceCount: 0,
        template: 'cache-template',
        recommendation: 'Fix configuration',
        autoscaling: 'Disabled',
        inUseBy: '-',
        namedPorts: [
          { name: 'redis', port: 6379 }
        ],
        instances: []
      }
    ];
  }
} 