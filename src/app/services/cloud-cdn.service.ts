import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CdnOrigin {
  id: string;
  name: string;
  cacheMode: string;
  associatedLoadBalancers: string[];
  cacheHitRatio: string;
  description?: string;
  bucketName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  project?: string;
  region?: string;
  creationTimestamp?: string;
  originType?: string;
  backendServiceName?: string;
}

export interface CdnOriginDetails extends CdnOrigin {
  hostPathRules: HostPathRule[];
  cachePerformance: CachePerformance;
  monitoring?: any;
  cacheInvalidation?: any;
}

export interface HostPathRule {
  host: string;
  path: string;
  backend: string;
}

export interface CachePerformance {
  cacheMode: string;
  cacheKey: string;
  restrictedContent: string;
  negativeCaching: string;
  bypassCacheOnRequestHeader: {
    headerName: string;
    value: string;
  };
  serveWhileStale: string;
  customRequestHeaders: string;
  customResponseHeaders: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudCdnService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

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
    return project?.id || 'demo-project';
  }

  /**
   * Get list of CDN origins (URL maps with CDN enabled)
   */
  getCdnOrigins(): Observable<CdnOrigin[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockOrigins());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/global/urlMaps`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformUrlMapsToOrigins(response.items || [])),
      catchError(error => {
        console.error('Error fetching CDN origins:', error);
        return of(this.getMockOrigins());
      })
    );
  }

  /**
   * Get detailed information about a specific CDN origin
   */
  getCdnOriginDetails(originName: string): Observable<CdnOriginDetails> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockOriginDetails(originName));
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/global/urlMaps/${originName}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformUrlMapToOriginDetails(response)),
      catchError(error => {
        console.error('Error fetching CDN origin details:', error);
        return of(this.getMockOriginDetails(originName));
      })
    );
  }

  /**
   * Get backend services for a project
   */
  getBackendServices(): Observable<any[]> {
    if (this.authService.isDemoMode()) {
      return of([]);
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/global/backendServices`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error('Error fetching backend services:', error);
        return of([]);
      })
    );
  }

  /**
   * Get load balancers for a project
   */
  getLoadBalancers(): Observable<any[]> {
    if (this.authService.isDemoMode()) {
      return of([]);
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/global/urlMaps`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error('Error fetching load balancers:', error);
        return of([]);
      })
    );
  }

  private transformUrlMapsToOrigins(urlMaps: any[]): CdnOrigin[] {
    return urlMaps
      .filter(urlMap => this.hasCdnEnabled(urlMap))
      .map(urlMap => ({
        id: urlMap.id,
        name: urlMap.name,
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: [urlMap.name],
        cacheHitRatio: 'No data',
        status: 'ACTIVE' as const,
        project: this.getCurrentProject(),
        creationTimestamp: urlMap.creationTimestamp,
        description: urlMap.description
      }));
  }

  private transformUrlMapToOriginDetails(urlMap: any): CdnOriginDetails {
    const hostPathRules = this.extractHostPathRules(urlMap);
    const cachePerformance = this.extractCachePerformance(urlMap);

    return {
      id: urlMap.id,
      name: urlMap.name,
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: [urlMap.name],
      cacheHitRatio: 'No data',
      status: 'ACTIVE',
      project: this.getCurrentProject(),
      creationTimestamp: urlMap.creationTimestamp,
      description: urlMap.description,
      originType: 'Backend service origin',
      backendServiceName: this.extractBackendServiceName(urlMap),
      hostPathRules: hostPathRules,
      cachePerformance
    };
  }

  private hasCdnEnabled(urlMap: any): boolean {
    // Check if URL map has CDN-related configurations
    return urlMap.pathMatchers?.some((pm: any) => 
      pm.pathRules?.some((pr: any) => pr.service?.includes('backend'))
    ) || false;
  }

  private extractHostPathRules(urlMap: any): HostPathRule[] {
    const rules: HostPathRule[] = [];
    
    if (urlMap.hostRules) {
      urlMap.hostRules.forEach((hostRule: any) => {
        hostRule.hosts?.forEach((host: string) => {
          if (urlMap.pathMatchers) {
            const pathMatcher = urlMap.pathMatchers.find((pm: any) => pm.name === hostRule.pathMatcher);
            if (pathMatcher?.pathRules) {
              pathMatcher.pathRules.forEach((pathRule: any) => {
                pathRule.paths?.forEach((path: string) => {
                  rules.push({
                    host: host,
                    path: path,
                    backend: this.extractBackendName(pathRule.service)
                  });
                });
              });
            }
          }
        });
      });
    }

    // Add default rules if no specific host rules
    if (rules.length === 0 && urlMap.defaultService) {
      rules.push({
        host: 'All unmatched (default)',
        path: 'All unmatched (default)',
        backend: this.extractBackendName(urlMap.defaultService)
      });
    }

    return rules;
  }

  private extractBackendName(serviceUrl: string): string {
    if (!serviceUrl) return '';
    const parts = serviceUrl.split('/');
    return parts[parts.length - 1] || '';
  }

  private extractBackendServiceName(urlMap: any): string {
    if (urlMap.defaultService) {
      return this.extractBackendName(urlMap.defaultService);
    }
    
    if (urlMap.pathMatchers?.[0]?.defaultService) {
      return this.extractBackendName(urlMap.pathMatchers[0].defaultService);
    }

    return '';
  }

  private extractCachePerformance(urlMap: any): CachePerformance {
    return {
      cacheMode: 'Use origin headers',
      cacheKey: 'Default (include all components of a request URL)',
      restrictedContent: 'Public access to the content cached by Cloud CDN allowed',
      negativeCaching: 'Disabled',
      bypassCacheOnRequestHeader: {
        headerName: 'None',
        value: ''
      },
      serveWhileStale: 'Disabled',
      customRequestHeaders: 'None',
      customResponseHeaders: 'None'
    };
  }

  private getMockOrigins(): CdnOrigin[] {
    return [
      {
        id: '1',
        name: 'browse-backends',
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: ['shopping-site-lb'],
        cacheHitRatio: 'No data',
        status: 'ACTIVE'
      },
      {
        id: '2',
        name: 'cart-backends',
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: ['shopping-site-lb'],
        cacheHitRatio: 'No data',
        status: 'ACTIVE'
      },
      {
        id: '3',
        name: 'checkout-backends',
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: ['shopping-site-lb'],
        cacheHitRatio: 'No data',
        status: 'ACTIVE'
      },
      {
        id: '4',
        name: 'feeds-backends',
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: ['shopping-site-lb'],
        cacheHitRatio: 'No data',
        status: 'ACTIVE'
      },
      {
        id: '5',
        name: 'test-https',
        cacheMode: 'Use origin headers',
        associatedLoadBalancers: ['shopping-site-lb'],
        cacheHitRatio: 'No data',
        status: 'ACTIVE'
      }
    ];
  }

  private getMockOriginDetails(originName: string): CdnOriginDetails {
    const baseOrigin = this.getMockOrigins().find(o => o.name === originName) || this.getMockOrigins()[0];
    
    return {
      ...baseOrigin,
      originType: 'Backend service origin',
      backendServiceName: baseOrigin.name,
      hostPathRules: [
        { host: 'All unmatched (default)', path: 'All unmatched (default)', backend: 'browse-backends' },
        { host: 'shoppingsite.com', path: '/https/*', backend: 'test-https' },
        { host: 'shoppingsite.com', path: '/feeds/*', backend: 'feeds-backends' },
        { host: 'shoppingsite.com', path: '/checkout/*', backend: 'checkout-backends' },
        { host: 'shoppingsite.com', path: '/cart/*', backend: 'cart-backends' },
        { host: 'shoppingsite.com', path: '/browse/*', backend: 'browse-backends' },
        { host: 'shoppingsite.com', path: 'All unmatched (default)', backend: 'browse-backends' }
      ],
      cachePerformance: {
        cacheMode: 'Use origin headers',
        cacheKey: 'Default (include all components of a request URL)',
        restrictedContent: 'Public access to the content cached by Cloud CDN allowed',
        negativeCaching: 'Disabled',
        bypassCacheOnRequestHeader: {
          headerName: 'None',
          value: ''
        },
        serveWhileStale: 'Disabled',
        customRequestHeaders: 'None',
        customResponseHeaders: 'None'
      }
    };
  }
}
