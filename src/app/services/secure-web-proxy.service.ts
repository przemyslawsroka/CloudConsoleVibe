import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface SecureWebProxy {
  name: string;
  displayName?: string;
  description?: string;
  routingMode: 'EXPLICIT_ROUTING_MODE' | 'TRANSPARENT_ROUTING_MODE';
  addresses: string[];
  ports: number[];
  network: string;
  subnetwork: string;
  gatewaySecurityPolicy?: string;
  certificateUrls?: string[];
  createTime?: string;
  updateTime?: string;
  state?: 'CREATING' | 'ACTIVE' | 'DELETING' | 'FAILED';
  region: string;
  certificates?: string[];
  tlsInspectionPolicy?: string;
  scope?: string;
}

export interface SecurityPolicy {
  name: string;
  displayName?: string;
  description?: string;
  createTime?: string;
  updateTime?: string;
  rules?: SecurityPolicyRule[];
  region: string;
}

export interface SecurityPolicyRule {
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  basicProfile: 'ALLOW' | 'DENY';
  sessionMatcher?: string;
  applicationMatcher?: string;
  tlsInspectionEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface UrlList {
  name: string;
  description?: string;
  values: string[];
  createTime?: string;
  updateTime?: string;
  region: string;
}

export interface TlsInspectionPolicy {
  name: string;
  description?: string;
  caPool: string;
  excludePublicCaSet?: boolean;
  createTime?: string;
  updateTime?: string;
  region: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecureWebProxyService {
  private proxiesSubject = new BehaviorSubject<SecureWebProxy[]>([]);
  public proxies$ = this.proxiesSubject.asObservable();

  private policiesSubject = new BehaviorSubject<SecurityPolicy[]>([]);
  public policies$ = this.policiesSubject.asObservable();

  private urlListsSubject = new BehaviorSubject<UrlList[]>([]);
  public urlLists$ = this.urlListsSubject.asObservable();

  private tlsPoliciesSubject = new BehaviorSubject<TlsInspectionPolicy[]>([]);
  public tlsPolicies$ = this.tlsPoliciesSubject.asObservable();

  private baseNetworkServicesUrl = 'https://networkservices.googleapis.com/v1';
  private baseNetworkSecurityUrl = 'https://networksecurity.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getCurrentProject(): string {
    const project = this.projectService.getCurrentProject();
    if (!project) {
      throw new Error('No project selected');
    }
    return project.id;
  }

  // Network Services API - Secure Web Proxy Gateways
  listProxies(region: string = 'us-central1'): Observable<SecureWebProxy[]> {
    if (this.authService.isDemoMode()) {
      return this.getMockProxies();
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkServicesUrl}/projects/${projectId}/locations/${region}/gateways`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const proxies = (response.gateways || []).map((gateway: any) => this.mapGatewayToProxy(gateway, region));
        this.proxiesSubject.next(proxies);
        return proxies;
      }),
      catchError(error => {
        console.error('Error loading proxies:', error);
        return this.getMockProxies();
      })
    );
  }

  getProxy(name: string, region: string = 'us-central1'): Observable<SecureWebProxy> {
    if (this.authService.isDemoMode()) {
      return this.getMockProxies().pipe(
        map(proxies => proxies.find(p => p.name === name) || proxies[0])
      );
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkServicesUrl}/projects/${projectId}/locations/${region}/gateways/${name}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(gateway => this.mapGatewayToProxy(gateway, region)),
      catchError(error => {
        console.error('Error loading proxy:', error);
        return throwError(error);
      })
    );
  }

  createProxy(proxy: Partial<SecureWebProxy>, region: string = 'us-central1'): Observable<any> {
    if (this.authService.isDemoMode()) {
      return new Observable(observer => {
        setTimeout(() => {
          const newProxy: SecureWebProxy = {
            name: proxy.name || `swp-${Date.now()}`,
            displayName: proxy.displayName,
            description: proxy.description,
            routingMode: proxy.routingMode || 'EXPLICIT_ROUTING_MODE',
            addresses: proxy.addresses || ['10.0.0.100'],
            ports: proxy.ports || [8080],
            network: proxy.network || 'default',
            subnetwork: proxy.subnetwork || 'default',
            gatewaySecurityPolicy: proxy.gatewaySecurityPolicy,
            region,
            state: 'ACTIVE',
            createTime: new Date().toISOString()
          };
          
          const currentProxies = this.proxiesSubject.value;
          this.proxiesSubject.next([...currentProxies, newProxy]);
          observer.next({ name: `operations/operation-${Date.now()}` });
          observer.complete();
        }, 1000);
      });
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkServicesUrl}/projects/${projectId}/locations/${region}/gateways`;

    const gatewayRequest = {
      name: `projects/${projectId}/locations/${region}/gateways/${proxy.name}`,
      type: 'SECURE_WEB_GATEWAY',
      addresses: proxy.addresses,
      ports: proxy.ports,
      gatewaySecurityPolicy: proxy.gatewaySecurityPolicy,
      network: proxy.network,
      subnetwork: proxy.subnetwork,
      routingMode: proxy.routingMode || 'EXPLICIT_ROUTING_MODE',
      description: proxy.description
    };

    return this.http.post<any>(url, gatewayRequest, { 
      headers: this.getHeaders(),
      params: { gatewayId: proxy.name || '' }
    }).pipe(
      catchError(error => {
        console.error('Error creating proxy:', error);
        return throwError(error);
      })
    );
  }

  deleteProxy(name: string, region: string = 'us-central1'): Observable<any> {
    if (this.authService.isDemoMode()) {
      return new Observable(observer => {
        setTimeout(() => {
          const currentProxies = this.proxiesSubject.value;
          const filteredProxies = currentProxies.filter(p => p.name !== name);
          this.proxiesSubject.next(filteredProxies);
          observer.next({ name: `operations/operation-${Date.now()}` });
          observer.complete();
        }, 1000);
      });
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkServicesUrl}/projects/${projectId}/locations/${region}/gateways/${name}`;

    return this.http.delete<any>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting proxy:', error);
        return throwError(error);
      })
    );
  }

  // Network Security API - Security Policies
  listSecurityPolicies(region: string = 'us-central1'): Observable<SecurityPolicy[]> {
    if (this.authService.isDemoMode()) {
      return this.getMockPolicies();
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkSecurityUrl}/projects/${projectId}/locations/${region}/gatewaySecurityPolicies`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const policies = (response.gatewaySecurityPolicies || []).map((policy: any) => this.mapPolicyToSecurityPolicy(policy, region));
        this.policiesSubject.next(policies);
        return policies;
      }),
      catchError(error => {
        console.error('Error loading security policies:', error);
        return this.getMockPolicies();
      })
    );
  }

  createSecurityPolicy(policy: Partial<SecurityPolicy>, region: string = 'us-central1'): Observable<any> {
    if (this.authService.isDemoMode()) {
      return new Observable(observer => {
        setTimeout(() => {
          const newPolicy: SecurityPolicy = {
            name: policy.name || `policy-${Date.now()}`,
            displayName: policy.displayName,
            description: policy.description,
            region,
            createTime: new Date().toISOString(),
            rules: []
          };
          
          const currentPolicies = this.policiesSubject.value;
          this.policiesSubject.next([...currentPolicies, newPolicy]);
          observer.next({ name: `operations/operation-${Date.now()}` });
          observer.complete();
        }, 1000);
      });
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkSecurityUrl}/projects/${projectId}/locations/${region}/gatewaySecurityPolicies`;

    const policyRequest = {
      name: `projects/${projectId}/locations/${region}/gatewaySecurityPolicies/${policy.name}`,
      description: policy.description
    };

    return this.http.post<any>(url, policyRequest, { 
      headers: this.getHeaders(),
      params: { gatewaySecurityPolicyId: policy.name || '' }
    }).pipe(
      catchError(error => {
        console.error('Error creating security policy:', error);
        return throwError(error);
      })
    );
  }

  deleteSecurityPolicy(name: string, region: string = 'us-central1'): Observable<any> {
    if (this.authService.isDemoMode()) {
      return new Observable(observer => {
        setTimeout(() => {
          const currentPolicies = this.policiesSubject.value;
          const filteredPolicies = currentPolicies.filter(p => p.name !== name);
          this.policiesSubject.next(filteredPolicies);
          observer.next({ name: `operations/operation-${Date.now()}` });
          observer.complete();
        }, 1000);
      });
    }

    const projectId = this.getCurrentProject();
    const url = `${this.baseNetworkSecurityUrl}/projects/${projectId}/locations/${region}/gatewaySecurityPolicies/${name}`;

    return this.http.delete<any>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting security policy:', error);
        return throwError(error);
      })
    );
  }

  // Helper methods
  private mapGatewayToProxy(gateway: any, region: string): SecureWebProxy {
    return {
      name: gateway.name?.split('/').pop() || '',
      displayName: gateway.displayName,
      description: gateway.description,
      routingMode: gateway.routingMode || 'EXPLICIT_ROUTING_MODE',
      addresses: gateway.addresses || [],
      ports: gateway.ports || [],
      network: gateway.network,
      subnetwork: gateway.subnetwork,
      gatewaySecurityPolicy: gateway.gatewaySecurityPolicy,
      certificateUrls: gateway.certificateUrls,
      createTime: gateway.createTime,
      updateTime: gateway.updateTime,
      state: gateway.state || 'ACTIVE',
      region,
      certificates: gateway.certificateUrls?.map((url: string) => url.split('/').pop()) || []
    };
  }

  private mapPolicyToSecurityPolicy(policy: any, region: string): SecurityPolicy {
    return {
      name: policy.name?.split('/').pop() || '',
      displayName: policy.displayName,
      description: policy.description,
      createTime: policy.createTime,
      updateTime: policy.updateTime,
      region,
      rules: []
    };
  }

  private getMockProxies(): Observable<SecureWebProxy[]> {
    const mockProxies: SecureWebProxy[] = [
      {
        name: 'blah',
        description: 'Explicit proxy for Next hop routing',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.128.0.154'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/default',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T08:30:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/blah',
        certificates: ['swp-certificate-do-not-delete']
      },
      {
        name: 'kzpcinski-web-proxy',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.128.0.154'],
        ports: [9],
        network: 'projects/przemeksroka-joonix-service/global/networks/default',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/default',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T08:35:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/default',
        certificates: ['another-certificate']
      },
      {
        name: 'kzpcinski-web-proxy-2',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.128.0.236'],
        ports: [1],
        network: 'projects/przemeksroka-joonix-service/global/networks/default',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/default',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T08:40:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/created-with-policy',
        certificates: ['swp-certificate-do-not-delete']
      },
      {
        name: 'pershik-test',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.0.60.64'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/east1/subnetworks/swp-network-do-not-delete',
        region: 'us-east1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:15:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-east1/gatewaySecurityPolicies/another-certificate',
        certificates: ['another-certificate']
      },
      {
        name: 'swp',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.0.60.27'],
        ports: [80],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/swp-network-do-not-delete',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:20:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/swp-policy-do-not-delete',
        certificates: ['swp-certificate-do-not-delete']
      },
      {
        name: 'swp-proxy-do-not-delete',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.0.60.99'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/swp-network-do-not-delete',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:25:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/swp-policy-do-not-delete',
        certificates: ['swp-certificate-do-not-delete']
      },
      {
        name: 'with-ports',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.0.60.24'],
        ports: [90, 91],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/swp-network-do-not-delete',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:30:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/swp-policy-do-not-delete',
        certificates: ['swp-certificate-do-not-delete']
      },
      {
        name: 'yulia-sida-swp',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.0.60.2'],
        ports: [80],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-east1/subnetworks/yulia-sida-test',
        region: 'us-east1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:35:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-east1/gatewaySecurityPolicies/created-with-policy',
        certificates: ['yulia-sida-test']
      },
      {
        name: 'yulia-sida-swp2',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.50.0.2'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/yulia-sida-test',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:40:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/created-with-policy',
        certificates: ['yulia-sida-test']
      },
      {
        name: 'yulia-sida-test',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.128.0.59'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/swp-network-do-not-delete',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:45:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/created-with-policy',
        certificates: ['yulia-sida-test']
      },
      {
        name: 'yulia-sida-test2',
        description: 'Explicit proxy',
        routingMode: 'EXPLICIT_ROUTING_MODE',
        addresses: ['10.128.0.59'],
        ports: [443],
        network: 'projects/przemeksroka-joonix-service/global/networks/swp-network-do-not-delete',
        subnetwork: 'projects/przemeksroka-joonix-service/regions/us-central1/subnetworks/swp-network-do-not-delete',
        region: 'us-central1',
        state: 'ACTIVE',
        createTime: '2024-12-05T09:50:00Z',
        gatewaySecurityPolicy: 'projects/przemeksroka-joonix-service/locations/us-central1/gatewaySecurityPolicies/created-with-policy',
        certificates: ['yulia-sida-test']
      }
    ];

    return new Observable(observer => {
      setTimeout(() => {
        this.proxiesSubject.next(mockProxies);
        observer.next(mockProxies);
        observer.complete();
      }, 500);
    });
  }

  private getMockPolicies(): Observable<SecurityPolicy[]> {
    const mockPolicies: SecurityPolicy[] = [
      {
        name: 'blah',
        description: 'Basic allow policy',
        region: 'us-central1',
        createTime: '2024-12-05T08:30:00Z',
        rules: []
      },
      {
        name: 'default',
        description: 'Default security policy',
        region: 'us-central1',
        createTime: '2024-12-05T08:00:00Z',
        rules: []
      },
      {
        name: 'created-with-policy',
        description: 'Policy with predefined rules',
        region: 'us-central1',
        createTime: '2024-12-05T08:45:00Z',
        rules: []
      },
      {
        name: 'swp-policy-do-not-delete',
        description: 'Production security policy',
        region: 'us-central1',
        createTime: '2024-12-05T08:15:00Z',
        rules: []
      }
    ];

    return new Observable(observer => {
      setTimeout(() => {
        this.policiesSubject.next(mockPolicies);
        observer.next(mockPolicies);
        observer.complete();
      }, 500);
    });
  }
} 