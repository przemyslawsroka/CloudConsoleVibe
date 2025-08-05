import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin, combineLatest } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// PSC Endpoint interfaces
export interface PSCEndpoint {
  name: string;
  status: 'Accepted' | 'Pending' | 'Rejected' | 'Closed';
  target: string;
  targetApi: string;
  scope: string;
  globalAccess: 'Enabled' | 'Disabled';
  network: string;
  subnetwork: string;
  ipAddress: string;
  labels?: { [key: string]: string };
  createTime?: string;
  updateTime?: string;
  description?: string;
  producerAcceptList?: string[];
  producerRejectList?: string[];
}

// PSC Published Service interfaces  
export interface PSCPublishedService {
  name: string;
  targetService: string;
  publishedService: string;
  loadBalancers: string[];
  dnsZone?: string;
  visibility: 'VPC_NETWORK' | 'DNS_ZONE';
  autoAcceptConnections: boolean;
  acceptedConsumers?: string[];
  rejectedConsumers?: string[];
  createTime?: string;
  updateTime?: string;
}

// Load Balancer endpoint for PSC
export interface LoadBalancerEndpoint {
  name: string;
  type: string;
  numberOfNEGs: number;
  network: string;
  region: string;
  ipAddresses: string[];
}

// Request interfaces
export interface CreatePSCEndpointRequest {
  name: string;
  description?: string;
  network: string;
  subnetwork?: string;
  target: string;
  labels?: { [key: string]: string };
  enableGlobalAccess?: boolean;
  producerAcceptList?: string[];
  producerRejectList?: string[];
}

export interface CreatePSCPublishedServiceRequest {
  name: string;
  description?: string;
  targetService: string;
  autoAcceptConnections?: boolean;
  acceptedProjects?: string[];
  dnsConfig?: {
    zone: string;
    recordType: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PrivateServiceConnectService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';
  private servicenetworkingUrl = 'https://servicenetworking.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Connected Endpoints operations
  getConnectedEndpoints(projectId: string): Observable<PSCEndpoint[]> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockEndpoints();
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const attachments = response.items || [];
        return attachments.map((attachment: any) => this.convertGCPEndpoint(attachment));
      }),
      catchError(error => {
        console.warn('PSC Endpoints API call failed, falling back to mock data:', error);
        return this.getMockEndpoints();
      })
    );
  }

  getConnectedEndpoint(projectId: string, endpointName: string): Observable<PSCEndpoint> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockEndpoints().pipe(
        map(endpoints => endpoints.find(e => e.name === endpointName) || endpoints[0])
      );
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments/${endpointName}`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.convertGCPEndpoint(response)),
      catchError(error => {
        console.error('Error fetching PSC endpoint details:', error);
        return this.getMockEndpoints().pipe(
          map(endpoints => endpoints.find(e => e.name === endpointName) || endpoints[0])
        );
      })
    );
  }

  createConnectedEndpoint(projectId: string, request: CreatePSCEndpointRequest): Observable<PSCEndpoint> {
    if (!projectId || projectId === 'mock-project') {
      const mockEndpoint: PSCEndpoint = {
        name: request.name,
        status: 'Pending',
        target: request.target,
        targetApi: 'Published service',
        scope: 'europe-west1',
        globalAccess: request.enableGlobalAccess ? 'Enabled' : 'Disabled',
        network: this.extractResourceName(request.network),
        subnetwork: request.subnetwork ? this.extractResourceName(request.subnetwork) : '',
        ipAddress: '10.132.0.' + Math.floor(Math.random() * 255),
        labels: request.labels,
        createTime: new Date().toISOString()
      };
      return of(mockEndpoint);
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments`;
    const payload = this.buildEndpointPayload(request);

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.convertGCPEndpoint(response)),
      catchError(error => {
        console.warn('Failed to create PSC endpoint via API, using mock response:', error);
        const mockEndpoint: PSCEndpoint = {
          name: request.name,
          status: 'Pending',
          target: request.target,
          targetApi: 'Published service',
          scope: 'europe-west1',
          globalAccess: request.enableGlobalAccess ? 'Enabled' : 'Disabled',
          network: this.extractResourceName(request.network),
          subnetwork: request.subnetwork ? this.extractResourceName(request.subnetwork) : '',
          ipAddress: '10.132.0.' + Math.floor(Math.random() * 255),
          labels: request.labels
        };
        return of(mockEndpoint);
      })
    );
  }

  deleteConnectedEndpoint(projectId: string, endpointName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments/${endpointName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // Published Services operations
  getPublishedServices(projectId: string): Observable<PSCPublishedService[]> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockPublishedServices();
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const services = response.items || [];
        return services.map((service: any) => this.convertGCPPublishedService(service));
      }),
      catchError(error => {
        console.warn('PSC Published Services API call failed, falling back to mock data:', error);
        return this.getMockPublishedServices();
      })
    );
  }

  createPublishedService(projectId: string, request: CreatePSCPublishedServiceRequest): Observable<PSCPublishedService> {
    if (!projectId || projectId === 'mock-project') {
      const mockService: PSCPublishedService = {
        name: request.name,
        targetService: request.targetService,
        publishedService: `projects/${projectId}/global/serviceAttachments/${request.name}`,
        loadBalancers: [request.targetService],
        visibility: 'VPC_NETWORK',
        autoAcceptConnections: request.autoAcceptConnections || false,
        createTime: new Date().toISOString()
      };
      return of(mockService);
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments`;
    const payload = this.buildPublishedServicePayload(request);

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.convertGCPPublishedService(response)),
      catchError(error => {
        console.warn('Failed to create PSC published service via API, using mock response:', error);
        const mockService: PSCPublishedService = {
          name: request.name,
          targetService: request.targetService,
          publishedService: `projects/${projectId}/global/serviceAttachments/${request.name}`,
          loadBalancers: [request.targetService],
          visibility: 'VPC_NETWORK',
          autoAcceptConnections: request.autoAcceptConnections || false
        };
        return of(mockService);
      })
    );
  }

  deletePublishedService(projectId: string, serviceName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/serviceAttachments/${serviceName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  // Load Balancer endpoints
  getLoadBalancerEndpoints(projectId: string): Observable<LoadBalancerEndpoint[]> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockLoadBalancerEndpoints();
    }

    // Get load balancers from multiple APIs
    return forkJoin([
      this.getGlobalForwardingRules(projectId),
      this.getRegionalForwardingRules(projectId)
    ]).pipe(
      map(([globalRules, regionalRules]) => {
        const allRules = [...globalRules, ...regionalRules];
        return allRules.map(rule => this.convertToLoadBalancerEndpoint(rule));
      }),
      catchError(error => {
        console.warn('Load Balancer endpoints API call failed, falling back to mock data:', error);
        return this.getMockLoadBalancerEndpoints();
      })
    );
  }

  private getGlobalForwardingRules(projectId: string): Observable<any[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/forwardingRules`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(() => of([]))
    );
  }

  private getRegionalForwardingRules(projectId: string): Observable<any[]> {
    // For simplicity, we'll just return empty array. In real implementation,
    // you would need to get all regions first, then query each region
    return of([]);
  }

  private convertToLoadBalancerEndpoint(rule: any): LoadBalancerEndpoint {
    return {
      name: rule.name || 'Unknown',
      type: this.determineLBType(rule),
      numberOfNEGs: 0, // Would need to query backend services
      network: this.extractResourceName(rule.network || ''),
      region: this.extractResourceName(rule.region || 'global'),
      ipAddresses: [rule.IPAddress || '0.0.0.0']
    };
  }

  private determineLBType(rule: any): string {
    if (rule.loadBalancingScheme === 'EXTERNAL') {
      return rule.IPProtocol === 'TCP' ? 'Network Load Balancer' : 'Application Load Balancer';
    } else {
      return 'Internal Load Balancer';
    }
  }

  // Helper methods
  private buildEndpointPayload(request: CreatePSCEndpointRequest): any {
    return {
      name: request.name,
      description: request.description,
      connectionPreference: 'ACCEPT_AUTOMATIC',
      natSubnets: request.subnetwork ? [request.subnetwork] : [],
      targetService: request.target,
      enableProxyProtocol: false,
      producerAcceptList: request.producerAcceptList || [],
      producerRejectList: request.producerRejectList || []
    };
  }

  private buildPublishedServicePayload(request: CreatePSCPublishedServiceRequest): any {
    return {
      name: request.name,
      description: request.description,
      targetService: request.targetService,
      connectionPreference: request.autoAcceptConnections ? 'ACCEPT_AUTOMATIC' : 'ACCEPT_MANUAL',
      enableProxyProtocol: false
    };
  }

  private convertGCPEndpoint(gcpEndpoint: any): PSCEndpoint {
    return {
      name: gcpEndpoint.name || 'Unknown',
      status: this.mapGCPStatusToEndpointStatus(gcpEndpoint.connectionPreference),
      target: gcpEndpoint.targetService || 'Unknown',
      targetApi: 'Published service',
      scope: this.extractResourceName(gcpEndpoint.region || 'global'),
      globalAccess: gcpEndpoint.enableProxyProtocol ? 'Enabled' : 'Disabled',
      network: this.extractResourceName(gcpEndpoint.network || ''),
      subnetwork: gcpEndpoint.natSubnets && gcpEndpoint.natSubnets.length > 0 ? 
                  this.extractResourceName(gcpEndpoint.natSubnets[0]) : '',
      ipAddress: gcpEndpoint.serviceAttachmentUri || '10.132.0.2',
      labels: gcpEndpoint.labels,
      createTime: gcpEndpoint.creationTimestamp,
      description: gcpEndpoint.description
    };
  }

  private convertGCPPublishedService(gcpService: any): PSCPublishedService {
    return {
      name: gcpService.name || 'Unknown',
      targetService: gcpService.targetService || 'Unknown',
      publishedService: gcpService.selfLink || '',
      loadBalancers: [gcpService.targetService || 'Unknown'],
      visibility: 'VPC_NETWORK',
      autoAcceptConnections: gcpService.connectionPreference === 'ACCEPT_AUTOMATIC',
      acceptedConsumers: gcpService.consumerAcceptLists || [],
      rejectedConsumers: gcpService.consumerRejectLists || [],
      createTime: gcpService.creationTimestamp
    };
  }

  private mapGCPStatusToEndpointStatus(connectionPreference: string): 'Accepted' | 'Pending' | 'Rejected' | 'Closed' {
    switch (connectionPreference) {
      case 'ACCEPT_AUTOMATIC':
        return 'Accepted';
      case 'ACCEPT_MANUAL':
        return 'Pending';
      case 'REJECT_AUTOMATIC':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }

  // Mock data methods
  private getMockEndpoints(): Observable<PSCEndpoint[]> {
    const mockEndpoints: PSCEndpoint[] = [
      {
        name: 'gk3-online-boutique-cluster-cdbf055c-0d8e03c8-pe',
        status: 'Accepted',
        target: 'Published service',
        targetApi: 'Published service',
        scope: 'europe-west1',
        globalAccess: 'Disabled',
        network: 'default',
        subnetwork: 'default',
        ipAddress: '10.132.0.2',
        labels: {}
      },
      {
        name: 'inventory-psc-endpoint-europe',
        status: 'Accepted',
        target: 'Published service',
        targetApi: 'Published service',
        scope: 'europe-west1',
        globalAccess: 'Disabled',
        network: 'default',
        subnetwork: 'default',
        ipAddress: '10.132.0.21',
        labels: {}
      }
    ];
    return of(mockEndpoints);
  }

  private getMockPublishedServices(): Observable<PSCPublishedService[]> {
    const mockServices: PSCPublishedService[] = [
      {
        name: 'example-published-service',
        targetService: 'my-load-balancer',
        publishedService: 'projects/my-project/global/serviceAttachments/example-published-service',
        loadBalancers: ['my-load-balancer'],
        visibility: 'VPC_NETWORK',
        autoAcceptConnections: true,
        acceptedConsumers: ['consumer-project-1'],
        rejectedConsumers: []
      }
    ];
    return of(mockServices);
  }

  private getMockLoadBalancerEndpoints(): Observable<LoadBalancerEndpoint[]> {
    const mockEndpoints: LoadBalancerEndpoint[] = [];
    return of(mockEndpoints);
  }
}