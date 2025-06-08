import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin, combineLatest } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export type LoadBalancerType = 
  | 'APPLICATION_CLASSIC' 
  | 'APPLICATION_GLOBAL' 
  | 'NETWORK_PASSTHROUGH' 
  | 'NETWORK_PROXY';

export type AccessType = 'External' | 'Internal';

export interface LoadBalancer {
  name: string;
  type: LoadBalancerType;
  typeDisplay: string;
  accessType: AccessType;
  protocols: string[];
  region?: string;
  backendSummary: string;
  backendStatus: 'healthy' | 'warning' | 'error';
  creationTime: Date;
  description?: string;
  frontendConfig?: {
    ipAddress: string;
    port: number;
  };
  healthChecks?: string[];
  targetPools?: string[];
  instances?: number;
  // Additional GCP-specific fields
  selfLink?: string;
  id?: string;
  loadBalancingScheme?: string;
  target?: string;
  portRange?: string;
}

// Google Cloud API response interfaces
interface GCPForwardingRule {
  name: string;
  description?: string;
  region?: string;
  IPAddress?: string;
  IPProtocol?: string;
  portRange?: string;
  target?: string;
  selfLink: string;
  creationTimestamp: string;
  loadBalancingScheme?: string;
  networkTier?: string;
  id: string;
}

interface GCPBackendService {
  name: string;
  description?: string;
  backends?: Array<{
    group: string;
    balancingMode?: string;
  }>;
  healthChecks?: string[];
  protocol?: string;
  loadBalancingScheme?: string;
  selfLink: string;
  creationTimestamp: string;
}

interface GCPTargetPool {
  name: string;
  description?: string;
  region: string;
  instances?: string[];
  healthChecks?: string[];
  selfLink: string;
  creationTimestamp: string;
}

interface GCPURLMap {
  name: string;
  description?: string;
  defaultService?: string;
  selfLink: string;
  creationTimestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadBalancerService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getLoadBalancers(): Observable<LoadBalancer[]> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using mock load balancers');
      return this.getMockLoadBalancers();
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject?.id) {
      console.warn('No project selected, returning mock data');
      return this.getMockLoadBalancers();
    }

    const projectId = currentProject.id;
    
    // Check if we have authentication token
    const token = this.authService.getAccessToken();
    if (!token) {
      console.warn('No authentication token available, returning mock data');
      return this.getMockLoadBalancers();
    }

    console.log(`🔄 Fetching load balancers for project: ${projectId}`);

    // Start with global resources only, then add regional if needed
    return combineLatest([
      this.getGlobalForwardingRules(projectId),
      this.getGlobalBackendServices(projectId),
      this.getGlobalURLMaps(projectId),
      this.getSelectedRegionalResources(projectId)
    ]).pipe(
      map(([globalFwdRules, globalBackendServices, urlMaps, regionalResources]) => {
        const loadBalancers: LoadBalancer[] = [];
        
        console.log(`📊 API Results:`, {
          globalForwardingRules: globalFwdRules.length,
          globalBackendServices: globalBackendServices.length,
          urlMaps: urlMaps.length,
          regionalForwardingRules: regionalResources.forwardingRules.length,
          regionalBackendServices: regionalResources.backendServices.length,
          targetPools: regionalResources.targetPools.length
        });
        
        // Process global forwarding rules (Application Load Balancers)
        globalFwdRules.forEach(rule => {
          const loadBalancer = this.mapGlobalForwardingRuleToLoadBalancer(rule, globalBackendServices, urlMaps);
          if (loadBalancer) {
            loadBalancers.push(loadBalancer);
          }
        });

        // Process regional forwarding rules (Network Load Balancers)
        regionalResources.forwardingRules.forEach(rule => {
          const loadBalancer = this.mapRegionalForwardingRuleToLoadBalancer(
            rule, 
            regionalResources.backendServices, 
            regionalResources.targetPools
          );
          if (loadBalancer) {
            loadBalancers.push(loadBalancer);
          }
        });

        console.log(`✅ Successfully mapped ${loadBalancers.length} load balancers from Google Cloud APIs`);
        return loadBalancers;
      }),
      catchError(error => {
        console.error('❌ Error fetching load balancers from Google Cloud APIs:', error);
        console.log('🔄 Falling back to mock data...');
        return this.getMockLoadBalancers();
      })
    );
  }

  private getGlobalForwardingRules(projectId: string): Observable<GCPForwardingRule[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/forwardingRules`;
    
    console.log(`🌐 Fetching global forwarding rules: ${url}`);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const rules = response.items || [];
        console.log(`✅ Found ${rules.length} global forwarding rules`);
        return rules;
      }),
      catchError(error => {
        console.error('❌ Error fetching global forwarding rules:', error);
        if (error.status === 403) {
          console.error('🔐 Permission denied. Ensure you have "compute.forwardingRules.list" permission');
        } else if (error.status === 404) {
          console.log('📭 No global forwarding rules found');
        }
        return of([]);
      })
    );
  }

  private getGlobalBackendServices(projectId: string): Observable<GCPBackendService[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/backendServices`;
    
    console.log(`🌐 Fetching global backend services: ${url}`);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const services = response.items || [];
        console.log(`✅ Found ${services.length} global backend services`);
        return services;
      }),
      catchError(error => {
        console.error('❌ Error fetching global backend services:', error);
        return of([]);
      })
    );
  }

  private getGlobalURLMaps(projectId: string): Observable<GCPURLMap[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/urlMaps`;
    
    console.log(`🌐 Fetching global URL maps: ${url}`);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const maps = response.items || [];
        console.log(`✅ Found ${maps.length} global URL maps`);
        return maps;
      }),
      catchError(error => {
        console.error('❌ Error fetching global URL maps:', error);
        return of([]);
      })
    );
  }

  private getSelectedRegionalResources(projectId: string): Observable<{
    forwardingRules: GCPForwardingRule[];
    backendServices: GCPBackendService[];
    targetPools: GCPTargetPool[];
  }> {
    // Only fetch from primary regions to avoid too many 404s
    const primaryRegions = ['us-central1', 'us-east1', 'us-west1', 'europe-west1', 'asia-east1'];
    
    console.log(`🌍 Fetching regional resources from primary regions: ${primaryRegions.join(', ')}`);
    
    return combineLatest([
      this.getRegionalForwardingRulesFromRegions(projectId, primaryRegions),
      this.getRegionalBackendServicesFromRegions(projectId, primaryRegions),
      this.getTargetPoolsFromRegions(projectId, primaryRegions)
    ]).pipe(
      map(([forwardingRules, backendServices, targetPools]) => ({
        forwardingRules: forwardingRules.flat(),
        backendServices: backendServices.flat(),
        targetPools: targetPools.flat()
      })),
      catchError(error => {
        console.error('❌ Error fetching regional resources:', error);
        return of({
          forwardingRules: [],
          backendServices: [],
          targetPools: []
        });
      })
    );
  }

  private getRegionalForwardingRulesFromRegions(projectId: string, regions: string[]): Observable<GCPForwardingRule[][]> {
    const requests = regions.map(region => 
      this.getRegionalForwardingRulesForRegion(projectId, region)
    );
    return forkJoin(requests);
  }

  private getRegionalForwardingRulesForRegion(projectId: string, region: string): Observable<GCPForwardingRule[]> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${region}/forwardingRules`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const rules = response.items || [];
        if (rules.length > 0) {
          console.log(`✅ Found ${rules.length} forwarding rules in region ${region}`);
        }
        // Add region info to each rule
        return rules.map((rule: GCPForwardingRule) => ({ ...rule, region }));
      }),
      catchError(error => {
        // Ignore 404 errors (region may not have forwarding rules)
        if (error.status === 404) {
          return of([]);
        }
        console.error(`❌ Error fetching forwarding rules for region ${region}:`, error.status);
        return of([]);
      })
    );
  }

  private getRegionalBackendServicesFromRegions(projectId: string, regions: string[]): Observable<GCPBackendService[][]> {
    const requests = regions.map(region => 
      this.getRegionalBackendServicesForRegion(projectId, region)
    );
    return forkJoin(requests);
  }

  private getRegionalBackendServicesForRegion(projectId: string, region: string): Observable<GCPBackendService[]> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${region}/backendServices`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const services = response.items || [];
        if (services.length > 0) {
          console.log(`✅ Found ${services.length} backend services in region ${region}`);
        }
        return services;
      }),
      catchError(error => {
        if (error.status === 404) {
          return of([]);
        }
        console.error(`❌ Error fetching backend services for region ${region}:`, error.status);
        return of([]);
      })
    );
  }

  private getTargetPoolsFromRegions(projectId: string, regions: string[]): Observable<GCPTargetPool[][]> {
    const requests = regions.map(region => 
      this.getTargetPoolsForRegion(projectId, region)
    );
    return forkJoin(requests);
  }

  private getTargetPoolsForRegion(projectId: string, region: string): Observable<GCPTargetPool[]> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${region}/targetPools`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const pools = response.items || [];
        if (pools.length > 0) {
          console.log(`✅ Found ${pools.length} target pools in region ${region}`);
        }
        return pools.map((pool: GCPTargetPool) => ({ ...pool, region }));
      }),
      catchError(error => {
        if (error.status === 404) {
          return of([]);
        }
        console.error(`❌ Error fetching target pools for region ${region}:`, error.status);
        return of([]);
      })
    );
  }

  private mapGlobalForwardingRuleToLoadBalancer(
    rule: GCPForwardingRule, 
    backendServices: GCPBackendService[], 
    urlMaps: GCPURLMap[]
  ): LoadBalancer | null {
    // Determine load balancer type based on target
    let type: LoadBalancerType = 'APPLICATION_GLOBAL';
    let typeDisplay = 'Application (Global)';
    
    if (rule.target?.includes('/targetHttpProxies/') || rule.target?.includes('/targetHttpsProxies/')) {
      type = 'APPLICATION_CLASSIC';
      typeDisplay = 'Application (Classic)';
    }

    // Find related backend service
    const relatedBackendService = this.findRelatedBackendService(rule, backendServices, urlMaps);
    const backendSummary = this.generateBackendSummary(relatedBackendService);
    const backendStatus = this.determineBackendStatus(relatedBackendService);

    return {
      name: rule.name,
      type,
      typeDisplay,
      accessType: rule.loadBalancingScheme === 'INTERNAL' ? 'Internal' : 'External',
      protocols: this.extractProtocols(rule, relatedBackendService),
      region: undefined, // Global
      backendSummary,
      backendStatus,
      creationTime: new Date(rule.creationTimestamp),
      description: rule.description,
      frontendConfig: {
        ipAddress: rule.IPAddress || 'Unknown',
        port: this.extractPort(rule.portRange)
      },
      selfLink: rule.selfLink,
      id: rule.id,
      loadBalancingScheme: rule.loadBalancingScheme,
      target: rule.target,
      portRange: rule.portRange
    };
  }

  private mapRegionalForwardingRuleToLoadBalancer(
    rule: GCPForwardingRule,
    backendServices: GCPBackendService[],
    targetPools: GCPTargetPool[]
  ): LoadBalancer | null {
    // Determine load balancer type based on target
    let type: LoadBalancerType = 'NETWORK_PASSTHROUGH';
    let typeDisplay = 'Network (Passthrough target pool)';
    
    if (rule.target?.includes('/targetPools/')) {
      type = 'NETWORK_PASSTHROUGH';
      typeDisplay = 'Network (Passthrough target pool)';
    } else if (rule.target?.includes('/backendServices/')) {
      type = 'NETWORK_PROXY';
      typeDisplay = 'Network (Proxy classic)';
    }

    // Find related target pool or backend service
    const relatedTargetPool = this.findRelatedTargetPool(rule, targetPools);
    const relatedBackendService = this.findRelatedRegionalBackendService(rule, backendServices);
    
    const backendSummary = relatedTargetPool 
      ? this.generateTargetPoolSummary(relatedTargetPool)
      : this.generateBackendSummary(relatedBackendService);
      
    const backendStatus = relatedTargetPool
      ? this.determineTargetPoolStatus(relatedTargetPool)
      : this.determineBackendStatus(relatedBackendService);

    return {
      name: rule.name,
      type,
      typeDisplay,
      accessType: rule.loadBalancingScheme === 'INTERNAL' ? 'Internal' : 'External',
      protocols: [rule.IPProtocol || 'TCP'],
      region: rule.region,
      backendSummary,
      backendStatus,
      creationTime: new Date(rule.creationTimestamp),
      description: rule.description,
      frontendConfig: {
        ipAddress: rule.IPAddress || 'Unknown',
        port: this.extractPort(rule.portRange)
      },
      selfLink: rule.selfLink,
      id: rule.id,
      loadBalancingScheme: rule.loadBalancingScheme,
      target: rule.target,
      portRange: rule.portRange
    };
  }

  private findRelatedBackendService(
    rule: GCPForwardingRule, 
    backendServices: GCPBackendService[], 
    urlMaps: GCPURLMap[]
  ): GCPBackendService | undefined {
    // For HTTP/HTTPS load balancers, the target might be a proxy that points to a URL map
    // which then points to backend services
    if (rule.target?.includes('/targetHttpProxies/') || rule.target?.includes('/targetHttpsProxies/')) {
      // For now, return the first backend service as a simplified approach
      return backendServices[0];
    }
    
    // For other cases, try to find by target
    return backendServices.find(bs => rule.target?.includes(bs.name));
  }

  private findRelatedRegionalBackendService(
    rule: GCPForwardingRule,
    backendServices: GCPBackendService[]
  ): GCPBackendService | undefined {
    return backendServices.find(bs => rule.target?.includes(bs.name));
  }

  private findRelatedTargetPool(
    rule: GCPForwardingRule,
    targetPools: GCPTargetPool[]
  ): GCPTargetPool | undefined {
    return targetPools.find(tp => rule.target?.includes(tp.name));
  }

  private generateBackendSummary(backendService?: GCPBackendService): string {
    if (!backendService) {
      return '0 backend services';
    }
    
    const backendCount = backendService.backends?.length || 0;
    return `1 backend service (${backendCount} instance groups, 0 network endpoint groups)`;
  }

  private generateTargetPoolSummary(targetPool: GCPTargetPool): string {
    const instanceCount = targetPool.instances?.length || 0;
    return `1 target pool (${instanceCount} instances)`;
  }

  private determineBackendStatus(backendService?: GCPBackendService): 'healthy' | 'warning' | 'error' {
    if (!backendService) {
      return 'warning';
    }
    
    // Simplified health check - in real implementation, you'd check actual health
    const hasBackends = (backendService.backends?.length || 0) > 0;
    const hasHealthChecks = (backendService.healthChecks?.length || 0) > 0;
    
    if (hasBackends && hasHealthChecks) {
      return 'healthy';
    } else if (hasBackends) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  private determineTargetPoolStatus(targetPool: GCPTargetPool): 'healthy' | 'warning' | 'error' {
    const hasInstances = (targetPool.instances?.length || 0) > 0;
    const hasHealthChecks = (targetPool.healthChecks?.length || 0) > 0;
    
    if (hasInstances && hasHealthChecks) {
      return 'healthy';
    } else if (hasInstances) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  private extractProtocols(rule: GCPForwardingRule, backendService?: GCPBackendService): string[] {
    const protocols: string[] = [];
    
    if (rule.IPProtocol) {
      protocols.push(rule.IPProtocol);
    }
    
    if (backendService?.protocol) {
      protocols.push(backendService.protocol);
    }
    
    // Deduplicate and handle common cases
    const uniqueProtocols = [...new Set(protocols)];
    
    if (uniqueProtocols.length === 0) {
      return ['HTTP']; // Default fallback
    }
    
    return uniqueProtocols;
  }

  private extractPort(portRange?: string): number {
    if (!portRange) return 80;
    
    // Handle ranges like "80-80" or single ports like "80"
    const parts = portRange.split('-');
    return parseInt(parts[0]) || 80;
  }

  // Fallback to mock data if APIs fail
  private getMockLoadBalancers(): Observable<LoadBalancer[]> {
    const mockLoadBalancers: LoadBalancer[] = [
      {
        name: 'shopping-site-lb',
        type: 'APPLICATION_CLASSIC',
        typeDisplay: 'Application (Classic)',
        accessType: 'External',
        protocols: ['HTTP', 'HTTPS'],
        region: undefined,
        backendSummary: '5 backend services (13 instance groups, 0 network endpoint groups)',
        backendStatus: 'healthy',
        creationTime: new Date('2023-12-01T10:00:00Z'),
        description: 'Main load balancer for shopping site',
        frontendConfig: {
          ipAddress: '34.102.136.180',
          port: 80
        },
        healthChecks: ['shopping-health-check', 'cart-health-check'],
        instances: 13
      },
      {
        name: 'api-gateway-lb',
        type: 'APPLICATION_GLOBAL',
        typeDisplay: 'Application (Global)',
        accessType: 'External',
        protocols: ['HTTPS'],
        region: undefined,
        backendSummary: '3 backend services (8 instance groups, 2 network endpoint groups)',
        backendStatus: 'healthy',
        creationTime: new Date('2023-11-20T09:15:00Z'),
        description: 'Global API gateway load balancer',
        frontendConfig: {
          ipAddress: '34.102.136.181',
          port: 443
        },
        healthChecks: ['api-health-check'],
        instances: 8
      },
      {
        name: 'internal-services-lb',
        type: 'NETWORK_PROXY',
        typeDisplay: 'Network (Proxy classic)',
        accessType: 'Internal',
        protocols: ['TCP'],
        region: 'us-central1',
        backendSummary: '2 backend services (4 instance groups, 0 network endpoint groups)',
        backendStatus: 'warning',
        creationTime: new Date('2023-11-15T14:30:00Z'),
        description: 'Internal services load balancer',
        frontendConfig: {
          ipAddress: '10.128.0.100',
          port: 8080
        },
        healthChecks: ['internal-health-check'],
        instances: 4
      },
      {
        name: 'database-proxy-lb',
        type: 'NETWORK_PASSTHROUGH',
        typeDisplay: 'Network (Passthrough target pool)',
        accessType: 'Internal',
        protocols: ['TCP'],
        region: 'us-east1',
        backendSummary: '1 target pool (3 instances)',
        backendStatus: 'healthy',
        creationTime: new Date('2023-10-10T16:45:00Z'),
        description: 'Database proxy load balancer',
        frontendConfig: {
          ipAddress: '10.128.1.50',
          port: 5432
        },
        targetPools: ['database-pool'],
        instances: 3
      },
      {
        name: 'testing-std-tier',
        type: 'APPLICATION_CLASSIC',
        typeDisplay: 'Application (Classic)',
        accessType: 'External',
        protocols: ['HTTP'],
        region: 'us-central1',
        backendSummary: '1 backend service (1 instance group, 0 network endpoint groups)',
        backendStatus: 'error',
        creationTime: new Date('2023-11-15T14:30:00Z'),
        description: 'Testing standard tier load balancer',
        frontendConfig: {
          ipAddress: '34.102.136.182',
          port: 80
        },
        healthChecks: ['test-health-check'],
        instances: 1
      }
    ];

    console.log('🎭 Serving mock load balancers for demo');
    return of(mockLoadBalancers);
  }

  // Utility methods
  getAvailableRegions(): Observable<string[]> {
    return of([
      'us-central1',
      'us-east1',
      'us-east4',
      'us-west1',
      'us-west2',
      'us-west3',
      'us-west4',
      'europe-west1',
      'europe-west2',
      'europe-west3',
      'europe-west4',
      'europe-west6',
      'europe-north1',
      'asia-east1',
      'asia-east2',
      'asia-northeast1',
      'asia-northeast2',
      'asia-northeast3',
      'asia-south1',
      'asia-southeast1',
      'asia-southeast2'
    ]);
  }

  getAvailableProtocols(): Observable<string[]> {
    return of(['HTTP', 'HTTPS', 'TCP', 'UDP', 'SSL']);
  }

  // Individual API methods for external use
  getLoadBalancer(name: string): Observable<LoadBalancer | undefined> {
    return this.getLoadBalancers().pipe(
      map(loadBalancers => loadBalancers.find(lb => lb.name === name))
    );
  }

  createLoadBalancer(loadBalancer: Partial<LoadBalancer>): Observable<LoadBalancer> {
    // TODO: Implement actual GCP API call for creation
    console.log('Create load balancer API call not yet implemented');
    
    const newLoadBalancer: LoadBalancer = {
      name: loadBalancer.name || 'new-load-balancer',
      type: loadBalancer.type || 'APPLICATION_CLASSIC',
      typeDisplay: this.getTypeDisplay(loadBalancer.type || 'APPLICATION_CLASSIC'),
      accessType: loadBalancer.accessType || 'External',
      protocols: loadBalancer.protocols || ['HTTP'],
      region: loadBalancer.region,
      backendSummary: '0 backend services',
      backendStatus: 'healthy',
      creationTime: new Date(),
      description: loadBalancer.description
    };

    return of(newLoadBalancer);
  }

  updateLoadBalancer(name: string, updates: Partial<LoadBalancer>): Observable<LoadBalancer> {
    // TODO: Implement actual GCP API call for update
    console.log('Update load balancer API call not yet implemented');
    
    return this.getLoadBalancer(name).pipe(
      map(existing => {
        if (existing) {
          return { ...existing, ...updates };
        }
        throw new Error(`Load balancer ${name} not found`);
      })
    );
  }

  deleteLoadBalancer(name: string): Observable<boolean> {
    // TODO: Implement actual GCP API call for deletion
    console.log(`Delete load balancer API call not yet implemented: ${name}`);
    return of(true);
  }

  private getTypeDisplay(type: LoadBalancerType): string {
    switch (type) {
      case 'APPLICATION_CLASSIC':
        return 'Application (Classic)';
      case 'APPLICATION_GLOBAL':
        return 'Application (Global)';
      case 'NETWORK_PASSTHROUGH':
        return 'Network (Passthrough target pool)';
      case 'NETWORK_PROXY':
        return 'Network (Proxy classic)';
      default:
        return 'Unknown';
    }
  }
} 