import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface InterceptDeploymentGroup {
  name: string;
  network: string;
  deployments?: string[];
  consumerEndpointGroups?: string[];
  consumerEndpointGroupAssociations?: { [key: string]: string[] };
}

export interface InterceptDeployment {
  name: string;
  forwardingRule: string;
  deploymentGroup: string;
}

export interface InterceptEndpointGroup {
  name: string;
  deploymentGroup: string;
  endpointGroupAssociations?: string[];
}

export interface InterceptEndpointGroupAssociation {
  name: string;
  network: string;
  endpointGroup: string;
  deployedZones?: string[];
}

export interface SecurityProfile {
  name: string;
  type: 'CustomIntercept';
  interceptEndpointGroup: string;
}

export interface SecurityProfileGroup {
  name: string;
  profiles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TPPIService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Producer APIs - Intercept Deployment Groups
  createInterceptDeploymentGroup(organizationId: string, location: string, data: InterceptDeploymentGroup): Observable<any> {
    const url = `${this.baseUrl}/organizations/${organizationId}/locations/${location}/interceptDeploymentGroups`;
    
    // Mock implementation for now
    return of({
      ...data,
      name: `organizations/${organizationId}/locations/${location}/interceptDeploymentGroups/${data.name}`,
      deployments: [],
      consumerEndpointGroups: [],
      consumerEndpointGroupAssociations: {}
    }).pipe(
      catchError(error => {
        console.error('Error creating intercept deployment group:', error);
        throw error;
      })
    );
  }

  getInterceptDeploymentGroups(organizationId: string, location: string): Observable<InterceptDeploymentGroup[]> {
    // Mock data for demonstration
    return of([
      {
        name: 'security-service-group',
        network: 'projects/my-project/global/networks/default',
        deployments: ['security-deployment-us-central1-a', 'security-deployment-us-east1-a'],
        consumerEndpointGroups: ['corp-endpoints'],
        consumerEndpointGroupAssociations: {
          'corp-endpoints': ['association-1', 'association-2']
        }
      }
    ]);
  }

  // Producer APIs - Intercept Deployments
  createInterceptDeployment(projectId: string, zone: string, data: InterceptDeployment): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/interceptDeployments`;
    
    // Mock implementation
    return of({
      ...data,
      name: `projects/${projectId}/zones/${zone}/interceptDeployments/${data.name}`
    }).pipe(
      catchError(error => {
        console.error('Error creating intercept deployment:', error);
        throw error;
      })
    );
  }

  getInterceptDeployments(projectId: string, zone?: string): Observable<InterceptDeployment[]> {
    // Mock data
    return of([
      {
        name: 'security-deployment-us-central1-a',
        forwardingRule: 'projects/my-project/regions/us-central1/forwardingRules/security-ilb',
        deploymentGroup: 'security-service-group'
      }
    ]);
  }

  // Consumer APIs - Intercept Endpoint Groups
  createInterceptEndpointGroup(organizationId: string, location: string, data: InterceptEndpointGroup): Observable<any> {
    const url = `${this.baseUrl}/organizations/${organizationId}/locations/${location}/interceptEndpointGroups`;
    
    // Mock implementation
    return of({
      ...data,
      name: `organizations/${organizationId}/locations/${location}/interceptEndpointGroups/${data.name}`,
      endpointGroupAssociations: []
    }).pipe(
      catchError(error => {
        console.error('Error creating intercept endpoint group:', error);
        throw error;
      })
    );
  }

  getInterceptEndpointGroups(organizationId: string, location: string): Observable<InterceptEndpointGroup[]> {
    // Mock data
    return of([
      {
        name: 'corp-security-endpoints',
        deploymentGroup: 'organizations/security-org/locations/global/interceptDeploymentGroups/security-service-group',
        endpointGroupAssociations: ['association-vpc-1', 'association-vpc-2']
      }
    ]);
  }

  // Consumer APIs - Endpoint Group Associations
  createInterceptEndpointGroupAssociation(projectId: string, data: InterceptEndpointGroupAssociation): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/global/interceptEndpointGroupAssociations`;
    
    // Mock implementation
    return of({
      ...data,
      name: `projects/${projectId}/global/interceptEndpointGroupAssociations/${data.name}`,
      deployedZones: ['us-central1-a', 'us-central1-b', 'us-east1-a']
    }).pipe(
      catchError(error => {
        console.error('Error creating intercept endpoint group association:', error);
        throw error;
      })
    );
  }

  getInterceptEndpointGroupAssociations(projectId: string): Observable<InterceptEndpointGroupAssociation[]> {
    // Mock data
    return of([
      {
        name: 'vpc-security-association',
        network: 'projects/my-project/global/networks/default',
        endpointGroup: 'organizations/my-org/locations/global/interceptEndpointGroups/corp-security-endpoints',
        deployedZones: ['us-central1-a', 'us-central1-b', 'us-east1-a']
      }
    ]);
  }

  // Security Profile APIs
  createSecurityProfile(organizationId: string, location: string, data: SecurityProfile): Observable<any> {
    const url = `${this.baseUrl}/organizations/${organizationId}/locations/${location}/securityProfiles`;
    
    // Mock implementation
    return of({
      ...data,
      name: `organizations/${organizationId}/locations/${location}/securityProfiles/${data.name}`
    }).pipe(
      catchError(error => {
        console.error('Error creating security profile:', error);
        throw error;
      })
    );
  }

  getSecurityProfiles(organizationId: string, location: string): Observable<SecurityProfile[]> {
    // Mock data
    return of([
      {
        name: 'custom-intercept-profile',
        type: 'CustomIntercept',
        interceptEndpointGroup: 'organizations/my-org/locations/global/interceptEndpointGroups/corp-security-endpoints'
      }
    ]);
  }

  // Security Profile Group APIs
  createSecurityProfileGroup(organizationId: string, location: string, data: SecurityProfileGroup): Observable<any> {
    const url = `${this.baseUrl}/organizations/${organizationId}/locations/${location}/securityProfileGroups`;
    
    // Mock implementation
    return of({
      ...data,
      name: `organizations/${organizationId}/locations/${location}/securityProfileGroups/${data.name}`
    }).pipe(
      catchError(error => {
        console.error('Error creating security profile group:', error);
        throw error;
      })
    );
  }

  getSecurityProfileGroups(organizationId: string, location: string): Observable<SecurityProfileGroup[]> {
    // Mock data
    return of([
      {
        name: 'tppi-profile-group',
        profiles: ['custom-intercept-profile']
      }
    ]);
  }

  // Utility methods
  getAvailableSecurityProviders(): Observable<any[]> {
    // Mock external security providers that consumers can choose from
    return of([
      {
        id: 'provider-1',
        name: 'Enterprise Firewall Service',
        organization: 'Security Corp',
        deploymentGroup: 'organizations/security-corp/locations/global/interceptDeploymentGroups/enterprise-fw',
        description: 'Advanced firewall with threat intelligence',
        capabilities: ['Firewall', 'IDS', 'IPS', 'Threat Intelligence']
      },
      {
        id: 'provider-2',
        name: 'Advanced IDS/IPS',
        organization: 'CyberSec Inc',
        deploymentGroup: 'organizations/cybersec-inc/locations/global/interceptDeploymentGroups/ids-ips-service',
        description: 'Real-time intrusion detection and prevention',
        capabilities: ['IDS', 'IPS', 'Behavioral Analysis', 'ML-based Detection']
      },
      {
        id: 'provider-3',
        name: 'Cloud Security Suite',
        organization: 'SecureNet Ltd',
        deploymentGroup: 'organizations/securenet-ltd/locations/global/interceptDeploymentGroups/cloud-security',
        description: 'Comprehensive cloud security platform',
        capabilities: ['Firewall', 'DLP', 'CASB', 'Web Security', 'Email Security']
      }
    ]);
  }

  // Validate TPPI configuration
  validateConfiguration(config: any): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Mock validation logic
    if (!config.name || config.name.length < 3) {
      errors.push('Name must be at least 3 characters long');
    }
    
    if (config.role === 'producer' && (!config.zones || config.zones.length === 0)) {
      errors.push('At least one deployment zone must be selected');
    }
    
    if (config.role === 'consumer' && (!config.networks || config.networks.length === 0)) {
      errors.push('At least one VPC network must be selected');
    }
    
    return of({
      valid: errors.length === 0,
      errors
    });
  }
} 