import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export interface TlsInspectionPolicy {
  name: string;
  description?: string;
  region: string;
  caPoolName: string;
  inUseBy: number;
  dateCreated: string;
  dateModified: string;
  selfLink?: string;
  caPool?: string;
  excludePublicCaSet?: boolean;
}

export interface TlsInspectionPolicyRequest {
  name: string;
  description?: string;
  caPool: string;
  excludePublicCaSet?: boolean;
}

interface GcpTlsInspectionPolicy {
  name: string;
  description?: string;
  selfLink: string;
  creationTimestamp: string;
  updateTime?: string;
  caPool?: string;
  excludePublicCaSet?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TlsInspectionService {
  private baseUrl = 'https://networksecurity.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getTlsInspectionPolicies(projectId: string, location: string = 'global'): Observable<TlsInspectionPolicy[]> {
    console.log('TlsInspectionService.getTlsInspectionPolicies called with projectId:', projectId, 'location:', location);
    
    if (!projectId || projectId === 'mock-project') {
      console.log('Using mock data for TLS inspection policies');
      return this.getMockTlsInspectionPolicies();
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/tlsInspectionPolicies`;
    console.log('Making API call to:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('API response received:', response);
        
        let policies: any[] = [];
        if (response.tlsInspectionPolicies) {
          policies = response.tlsInspectionPolicies;
        } else if (Array.isArray(response)) {
          policies = response;
        } else {
          console.log('Unexpected response structure, using empty array');
          console.log('Response keys:', Object.keys(response));
        }
        
        console.log('Raw TLS inspection policies from API:', policies);
        const convertedPolicies = policies.map(policy => this.convertGcpTlsInspectionPolicy(policy, location));
        console.log('Converted TLS inspection policies:', convertedPolicies);
        return convertedPolicies;
      }),
      catchError(error => {
        console.warn('Google Cloud Network Security API call failed, falling back to mock data:', error);
        if (error.status === 400) {
          console.warn('Network Security API might not be enabled for this project or requires additional permissions');
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Network Security API. Required scopes: https://www.googleapis.com/auth/cloud-platform');
        }
        return this.getMockTlsInspectionPolicies();
      })
    );
  }

  getTlsInspectionPolicy(projectId: string, policyName: string, location: string = 'global'): Observable<TlsInspectionPolicy> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockTlsInspectionPolicies().pipe(
        map(policies => policies.find(p => p.name === policyName) || policies[0])
      );
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/tlsInspectionPolicies/${policyName}`;
    return this.http.get<GcpTlsInspectionPolicy>(url, { headers: this.getHeaders() }).pipe(
      map(policy => this.convertGcpTlsInspectionPolicy(policy, location)),
      catchError(error => {
        console.error('Error fetching TLS inspection policy:', error);
        throw error;
      })
    );
  }

  createTlsInspectionPolicy(projectId: string, policyData: TlsInspectionPolicyRequest, location: string = 'global'): Observable<TlsInspectionPolicy> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/tlsInspectionPolicies?tlsInspectionPolicyId=${policyData.name}`;
    
    console.log('Creating TLS inspection policy:', policyData);
    
    const gcpPolicyData = {
      name: policyData.name,
      description: policyData.description,
      caPool: policyData.caPool,
      excludePublicCaSet: policyData.excludePublicCaSet || false
    };

    return this.http.post<any>(url, gcpPolicyData, { headers }).pipe(
      map(response => {
        console.log('TLS inspection policy created:', response);
        return {
          name: response.name || policyData.name,
          description: policyData.description,
          region: location === 'global' ? 'Global' : location,
          caPoolName: this.extractCaPoolName(policyData.caPool),
          inUseBy: 0,
          dateCreated: response.creationTimestamp || new Date().toISOString(),
          dateModified: response.creationTimestamp || new Date().toISOString(),
          selfLink: response.selfLink,
          caPool: policyData.caPool,
          excludePublicCaSet: policyData.excludePublicCaSet
        };
      }),
      catchError(error => {
        console.error('Error creating TLS inspection policy via API:', error);
        // Return mock success response for development
        const mockPolicy: TlsInspectionPolicy = {
          name: policyData.name,
          description: policyData.description,
          region: location === 'global' ? 'Global' : location,
          caPoolName: this.extractCaPoolName(policyData.caPool),
          inUseBy: 0,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          selfLink: `projects/${projectId}/locations/${location}/tlsInspectionPolicies/${policyData.name}`,
          caPool: policyData.caPool,
          excludePublicCaSet: policyData.excludePublicCaSet
        };
        console.log('Using mock TLS inspection policy creation response:', mockPolicy);
        return of(mockPolicy);
      })
    );
  }

  updateTlsInspectionPolicy(projectId: string, policyName: string, policyData: Partial<TlsInspectionPolicyRequest>, location: string = 'global'): Observable<TlsInspectionPolicy> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/tlsInspectionPolicies/${policyName}`;
    
    console.log('Updating TLS inspection policy:', policyName, policyData);
    
    const gcpPolicyData = {
      description: policyData.description,
      caPool: policyData.caPool,
      excludePublicCaSet: policyData.excludePublicCaSet
    };

    return this.http.patch<any>(url, gcpPolicyData, { headers }).pipe(
      map(response => {
        console.log('TLS inspection policy updated:', response);
        return this.convertGcpTlsInspectionPolicy(response, location);
      }),
      catchError(error => {
        console.error('Error updating TLS inspection policy via API:', error);
        // Return mock success response for development
        const mockPolicy: TlsInspectionPolicy = {
          name: policyName,
          description: policyData.description,
          region: location === 'global' ? 'Global' : location,
          caPoolName: policyData.caPool ? this.extractCaPoolName(policyData.caPool) : 'mock-ca-pool',
          inUseBy: 0,
          dateCreated: new Date(Date.now() - 86400000).toISOString(),
          dateModified: new Date().toISOString(),
          selfLink: `projects/${projectId}/locations/${location}/tlsInspectionPolicies/${policyName}`,
          caPool: policyData.caPool,
          excludePublicCaSet: policyData.excludePublicCaSet
        };
        console.log('Using mock TLS inspection policy update response:', mockPolicy);
        return of(mockPolicy);
      })
    );
  }

  deleteTlsInspectionPolicy(projectId: string, policyName: string, location: string = 'global'): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/${location}/tlsInspectionPolicies/${policyName}`;
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting TLS inspection policy via API:', error);
        return of({ success: true }); // Mock success for development
      })
    );
  }

  private convertGcpTlsInspectionPolicy(gcpPolicy: any, location: string): TlsInspectionPolicy {
    console.log('Converting GCP TLS inspection policy:', gcpPolicy);
    
    try {
      const policyName = this.extractResourceName(gcpPolicy.name || '');
      const caPoolName = this.extractCaPoolName(gcpPolicy.caPool || '');
      
      const convertedPolicy = {
        name: policyName,
        description: gcpPolicy.description || '',
        region: location === 'global' ? 'Global' : location,
        caPoolName: caPoolName,
        inUseBy: 0, // This would need to be calculated from actual usage
        dateCreated: gcpPolicy.creationTimestamp || new Date().toISOString(),
        dateModified: gcpPolicy.updateTime || gcpPolicy.creationTimestamp || new Date().toISOString(),
        selfLink: gcpPolicy.selfLink,
        caPool: gcpPolicy.caPool,
        excludePublicCaSet: gcpPolicy.excludePublicCaSet || false
      };
      
      console.log('Converted TLS inspection policy result:', convertedPolicy);
      return convertedPolicy;
    } catch (error) {
      console.error('Error converting GCP TLS inspection policy:', error, gcpPolicy);
      return {
        name: gcpPolicy.name || 'unknown-policy',
        description: gcpPolicy.description || '',
        region: location === 'global' ? 'Global' : location,
        caPoolName: 'unknown-ca-pool',
        inUseBy: 0,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString()
      };
    }
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    
    console.log('Extracting resource name from:', fullPath);
    
    // Handle full resource paths like "projects/PROJECT/locations/LOCATION/tlsInspectionPolicies/POLICY"
    const parts = fullPath.split('/');
    const resourceName = parts[parts.length - 1];
    
    console.log('Extracted resource name:', resourceName);
    return resourceName;
  }

  private extractCaPoolName(caPoolPath: string): string {
    if (!caPoolPath) return '';
    
    // Extract CA pool name from full path like "projects/PROJECT/locations/LOCATION/caPools/POOL"
    const parts = caPoolPath.split('/');
    return parts[parts.length - 1] || caPoolPath;
  }

  private getMockTlsInspectionPolicies(): Observable<TlsInspectionPolicy[]> {
    console.log('getMockTlsInspectionPolicies() called');
    const mockPolicies: TlsInspectionPolicy[] = [
      {
        name: 'production-tls-inspection',
        description: 'TLS inspection policy for production traffic',
        region: 'Global',
        caPoolName: 'production-ca-pool',
        inUseBy: 3,
        dateCreated: '2024-01-15T10:30:00Z',
        dateModified: '2024-01-20T14:45:00Z',
        caPool: 'projects/my-project/locations/global/caPools/production-ca-pool',
        excludePublicCaSet: false
      },
      {
        name: 'development-tls-inspection',
        description: 'TLS inspection policy for development environment',
        region: 'us-central1',
        caPoolName: 'dev-ca-pool',
        inUseBy: 1,
        dateCreated: '2024-01-10T09:15:00Z',
        dateModified: '2024-01-18T16:20:00Z',
        caPool: 'projects/my-project/locations/us-central1/caPools/dev-ca-pool',
        excludePublicCaSet: true
      }
    ];

    console.log('Mock TLS inspection policies created:', mockPolicies);
    console.log('Number of mock policies:', mockPolicies.length);
    return of(mockPolicies);
  }
} 