import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export interface CloudArmorPolicy {
  name: string;
  type: string;
  scope: string;
  rules: number;
  targets: number;
  description?: string;
  selfLink?: string;
  creationTimestamp?: string;
  fingerprint?: string;
  kind?: string;
  id?: string;
}

export interface CloudArmorPolicyRequest {
  name: string;
  description?: string;
  type: string;
  rules: {
    priority: number;
    action: string;
    match: {
      versionedExpr: string;
      config: {
        srcIpRanges: string[];
      };
    };
    description?: string;
  }[];
}

interface GcpSecurityPolicy {
  name: string;
  description?: string;
  selfLink: string;
  creationTimestamp: string;
  fingerprint: string;
  kind: string;
  id: string;
  rules?: any[];
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudArmorService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getCloudArmorPolicies(projectId: string): Observable<CloudArmorPolicy[]> {
    console.log('CloudArmorService.getCloudArmorPolicies called with projectId:', projectId);
    
    if (!projectId || projectId === 'mock-project') {
      console.log('Using mock data for Cloud Armor policies');
      return this.getMockPolicies();
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/securityPolicies`;
    console.log('Making API call to:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('API response received:', response);
        
        // Handle different possible response structures
        let policies: any[] = [];
        if (response.items) {
          policies = response.items;
        } else if (Array.isArray(response)) {
          policies = response;
        } else {
          console.log('Unexpected response structure, using empty array');
          console.log('Response keys:', Object.keys(response));
        }
        
        console.log('Raw policies from API:', policies);
        const convertedPolicies = policies.map(policy => this.convertGcpPolicy(policy));
        console.log('Converted policies:', convertedPolicies);
        return convertedPolicies;
      }),
      catchError(error => {
        console.warn('Google Cloud Compute API call failed, falling back to mock data:', error);
        if (error.status === 400) {
          console.warn('Compute API might not be enabled for this project or requires additional permissions');
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Compute API. Required scopes: https://www.googleapis.com/auth/cloud-platform');
        }
        return this.getMockPolicies();
      })
    );
  }

  getCloudArmorPolicy(projectId: string, policyName: string): Observable<CloudArmorPolicy> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockPolicies().pipe(
        map(policies => policies.find(p => p.name === policyName) || policies[0])
      );
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/securityPolicies/${policyName}`;
    return this.http.get<GcpSecurityPolicy>(url, { headers: this.getHeaders() }).pipe(
      map(policy => this.convertGcpPolicy(policy)),
      catchError(error => {
        console.error('Error fetching Cloud Armor policy:', error);
        throw error;
      })
    );
  }

  createCloudArmorPolicy(projectId: string, policyData: CloudArmorPolicyRequest): Observable<CloudArmorPolicy> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}/projects/${projectId}/global/securityPolicies`;
    
    console.log('Creating Cloud Armor policy:', policyData);
    
    // Transform the request data to match GCP API format
    const gcpPolicyData = {
      name: policyData.name,
      description: policyData.description,
      type: 'CLOUD_ARMOR',
      rules: policyData.rules.map(rule => ({
        priority: rule.priority,
        action: rule.action.toUpperCase(),
        match: rule.match,
        description: rule.description
      }))
    };

    return this.http.post<any>(url, gcpPolicyData, { headers }).pipe(
      map(response => {
        console.log('Cloud Armor policy created:', response);
        // Transform the response back to our format
        return {
          name: response.name || policyData.name,
          type: policyData.type,
          scope: 'Global',
          rules: policyData.rules.length,
          targets: 0,
          description: policyData.description,
          selfLink: response.selfLink,
          id: response.id,
          fingerprint: response.fingerprint,
          creationTimestamp: response.creationTimestamp
        };
      }),
      catchError(error => {
        console.error('Error creating Cloud Armor policy via API:', error);
        // Return mock success response for development
        const mockPolicy: CloudArmorPolicy = {
          name: policyData.name,
          type: policyData.type,
          scope: 'Global',
          rules: policyData.rules.length,
          targets: 0,
          description: policyData.description,
          selfLink: `projects/${projectId}/global/securityPolicies/${policyData.name}`,
          id: Date.now().toString(),
          creationTimestamp: new Date().toISOString()
        };
        console.log('Using mock Cloud Armor policy creation response:', mockPolicy);
        return of(mockPolicy);
      })
    );
  }

  deleteCloudArmorPolicy(projectId: string, policyName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/securityPolicies/${policyName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  private convertGcpPolicy(gcpPolicy: any): CloudArmorPolicy {
    console.log('Converting GCP policy:', gcpPolicy);
    
    try {
      const policyName = this.extractResourceName(gcpPolicy.name || gcpPolicy.Name || '');
      const rulesCount = gcpPolicy.rules ? gcpPolicy.rules.length : (gcpPolicy.Rules ? gcpPolicy.Rules.length : 0);
      
      const convertedPolicy = {
        name: policyName,
        type: gcpPolicy.type || 'Backend security policy',
        scope: 'global',
        rules: rulesCount,
        targets: 0, // Would need additional API call to get target count
        description: gcpPolicy.description || gcpPolicy.Description || '',
        selfLink: gcpPolicy.selfLink || gcpPolicy.SelfLink,
        creationTimestamp: gcpPolicy.creationTimestamp || gcpPolicy.CreationTimestamp,
        fingerprint: gcpPolicy.fingerprint || gcpPolicy.Fingerprint,
        kind: gcpPolicy.kind || gcpPolicy.Kind,
        id: gcpPolicy.id || gcpPolicy.Id
      };
      
      console.log('Converted policy result:', convertedPolicy);
      return convertedPolicy;
    } catch (error) {
      console.error('Error converting GCP policy:', error, gcpPolicy);
      return {
        name: gcpPolicy.name || gcpPolicy.Name || 'unknown-policy',
        type: 'Backend security policy',
        scope: 'global',
        rules: 0,
        targets: 0,
        description: gcpPolicy.description || gcpPolicy.Description || ''
      };
    }
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    
    console.log('Extracting resource name from:', fullPath);
    
    // Handle full resource paths like "projects/PROJECT/global/securityPolicies/POLICY"
    const parts = fullPath.split('/');
    const resourceName = parts[parts.length - 1];
    
    console.log('Extracted resource name:', resourceName);
    return resourceName;
  }

  private getMockPolicies(): Observable<CloudArmorPolicy[]> {
    console.log('getMockPolicies() called');
    const mockPolicies: CloudArmorPolicy[] = [
      {
        name: 'test-michal',
        type: 'Backend security policy',
        scope: 'global',
        rules: 2,
        targets: 0,
        description: 'Test security policy for backend services'
      },
      {
        name: 'default-security-policy',
        type: 'Backend security policy',
        scope: 'global',
        rules: 1,
        targets: 3,
        description: 'Default security policy with basic protection'
      },
      {
        name: 'ddos-protection-policy',
        type: 'Backend security policy',
        scope: 'global',
        rules: 5,
        targets: 1,
        description: 'Advanced DDoS protection policy'
      }
    ];

    console.log('Mock Cloud Armor policies created:', mockPolicies);
    console.log('Number of mock policies:', mockPolicies.length);
    return of(mockPolicies);
  }
} 