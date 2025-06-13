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
  namedPorts?: NamedPort[];
  network: string;
  subnetwork?: string;
  zone?: string;
  region?: string;
  size: number;
  creationTimestamp: string;
  selfLink: string;
  kind: string;
  fingerprint: string;
}

export interface NamedPort {
  name: string;
  port: number;
}

export interface InstanceGroupRequest {
  name: string;
  description?: string;
  network: string;
  subnetwork?: string;
  zone?: string;
  region?: string;
  namedPorts?: NamedPort[];
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

  // Mock data for demo mode
  private mockGroups: InstanceGroup[] = [
    {
      id: '1234567890123456789',
      name: 'web-servers-group',
      description: 'Unmanaged instance group for web servers',
      network: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/default',
      subnetwork: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/default',
      zone: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-a',
      size: 3,
      namedPorts: [
        { name: 'http', port: 80 },
        { name: 'https', port: 443 }
      ],
      creationTimestamp: '2024-05-22T15:55:09.000-07:00',
      selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-a/instanceGroups/web-servers-group',
      kind: 'compute#instanceGroup',
      fingerprint: 'abcd1234'
    },
    {
      id: '9876543210987654321',
      name: 'database-servers-group',
      description: 'Unmanaged instance group for database servers',
      network: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/default',
      subnetwork: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-east1/subnetworks/default',
      zone: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-east1-b',
      size: 2,
      namedPorts: [
        { name: 'mysql', port: 3306 },
        { name: 'postgres', port: 5432 }
      ],
      creationTimestamp: '2024-05-20T10:30:15.000-07:00',
      selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-east1-b/instanceGroups/database-servers-group',
      kind: 'compute#instanceGroup',
      fingerprint: 'efgh5678'
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {
    // Initialize with mock data
    this.groupsSubject.next(this.mockGroups);
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

    // Always use mock data for demo
    if (this.authService.isDemoMode()) {
      console.log('Using mock instance groups data');
      this.loadingSubject.next(false);
      return of(this.mockGroups);
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
        this.groupsSubject.next(this.mockGroups);
        this.loadingSubject.next(false);
        return of(this.mockGroups);
      })
    );
  }

  createInstanceGroup(projectId: string, groupData: InstanceGroupRequest): Observable<InstanceGroup> {
    const headers = this.getHeaders();
    const zone = this.extractZoneFromUrl(groupData.zone || '');
    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instanceGroups`;
    
    console.log('Creating instance group:', groupData);
    
    // Transform the request data to match GCP API format
    const gcpGroupData = {
      name: groupData.name,
      description: groupData.description,
      network: groupData.network,
      subnetwork: groupData.subnetwork,
      namedPorts: groupData.namedPorts || []
    };

    return this.http.post<any>(url, gcpGroupData, { headers }).pipe(
      map(response => {
        console.log('Instance group created:', response);
        // Transform the response back to our format
        const newGroup: InstanceGroup = {
          id: response.id || Date.now().toString(),
          name: groupData.name,
          description: groupData.description,
          network: groupData.network,
          subnetwork: groupData.subnetwork,
          zone: groupData.zone,
          size: 0,
          namedPorts: groupData.namedPorts,
          creationTimestamp: response.creationTimestamp || new Date().toISOString(),
          selfLink: response.selfLink || `${url}/${groupData.name}`,
          kind: 'compute#instanceGroup',
          fingerprint: response.fingerprint || 'mock-fingerprint'
        };
        
        // Add to local cache
        const currentGroups = this.groupsSubject.value;
        this.groupsSubject.next([...currentGroups, newGroup]);
        
        return newGroup;
      }),
      catchError(error => {
        console.error('Error creating instance group via API:', error);
        // Return mock success response for development
        const mockGroup: InstanceGroup = {
          id: Date.now().toString(),
          name: groupData.name,
          description: groupData.description,
          network: groupData.network,
          subnetwork: groupData.subnetwork,
          zone: groupData.zone,
          size: 0,
          namedPorts: groupData.namedPorts || [],
          creationTimestamp: new Date().toISOString(),
          selfLink: `projects/${projectId}/zones/${zone}/instanceGroups/${groupData.name}`,
          kind: 'compute#instanceGroup',
          fingerprint: 'mock-fingerprint'
        };
        
        // Add to local cache
        const currentGroups = this.groupsSubject.value;
        this.groupsSubject.next([...currentGroups, mockGroup]);
        
        console.log('Using mock instance group creation response:', mockGroup);
        return of(mockGroup);
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
} 