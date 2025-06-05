import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, of, catchError, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';

// Updated interfaces to match GCP API response format
export interface FirewallRule {
  id?: string;
  name: string;
  description?: string;
  network: string;
  direction: 'INGRESS' | 'EGRESS';
  priority: number;
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  sourceServiceAccounts?: string[];
  targetServiceAccounts?: string[];
  allowed?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  denied?: Array<{
    IPProtocol: string;
    ports?: string[];
  }>;
  logConfig?: {
    enable: boolean;
    metadata?: string;
  };
  disabled?: boolean;
  selfLink?: string;
  creationTimestamp?: string;
  
  // Computed fields for UI display
  type?: 'Ingress' | 'Egress';
  targets?: string;
  filters?: string;
  protocolsPorts?: string;
  action?: 'Allow' | 'Deny';
  logs?: 'On' | 'Off';
  hitCount?: number;
  lastHit?: Date;
}

export interface FirewallPolicy {
  id?: string;
  name: string;
  description?: string;
  fingerprint?: string;
  shortName?: string;
  displayName?: string;
  parent?: string;
  rules?: Array<{
    description?: string;
    direction?: string;
    disabled?: boolean;
    enableLogging?: boolean;
    priority?: number;
    ruleTupleCount?: number;
    targetResources?: string[];
    targetServiceAccounts?: string[];
    match?: any;
    action?: string;
  }>;
  selfLink?: string;
  creationTimestamp?: string;
  
  // Computed fields for UI display
  deploymentScope?: string;
  associatedWith?: string[];
  firewallRules?: number;
  priority?: number;
  type?: 'Regional' | 'Global';
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FirewallService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getFirewallRules(projectId: string): Observable<FirewallRule[]> {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.warn('⚠️  User is not authenticated. Returning mock firewall rules.');
      return of(this.getMockFirewallRules(projectId));
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/firewalls`;
    
    console.log('🔄 Fetching Firewall Rules from Google Cloud API...');
    console.log('   📍 URL:', url);
    console.log('   🔑 Authentication: OAuth Bearer Token');
    
    return this.http.get<{ items: any[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Firewall rules response:', response);
        return this.transformFirewallRules(response.items || []);
      }),
      catchError(error => {
        this.logFirewallApiError(error);
        
        // If it's a CORS error (status 0), provide mock data
        if (error.status === 0) {
          console.log('🔄 CORS error detected - providing mock firewall rules for demonstration');
          return of(this.getMockFirewallRules(projectId));
        }
        
        // If it's a 404 or 403, it might mean no rules exist or insufficient permissions
        if (error.status === 404 || error.status === 403) {
          console.log('Firewall rules not available, returning empty array');
          return of([]);
        }
        
        // For other errors, return mock data for demo purposes
        console.log('🔄 API error - providing mock firewall rules for demonstration');
        return of(this.getMockFirewallRules(projectId));
      })
    );
  }

  getFirewallPolicies(projectId: string): Observable<FirewallPolicy[]> {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.warn('⚠️  User is not authenticated. Returning mock firewall policies.');
      return of(this.getMockFirewallPolicies(projectId));
    }

    // Try to fetch both global and regional network firewall policies
    const globalUrl = `${this.baseUrl}/projects/${projectId}/global/networkFirewallPolicies`;
    
    console.log('🔄 Fetching Firewall Policies from Google Cloud API...');
    console.log('   📍 URL:', globalUrl);
    console.log('   🔑 Authentication: OAuth Bearer Token');
    
    // First try global network firewall policies
    return this.http.get<{ items: any[] }>(globalUrl, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Global firewall policies response:', response);
        return this.transformFirewallPolicies(response.items || []);
      }),
      // If global policies fail, try to get regional policies from common regions
      switchMap(globalPolicies => {
        if (globalPolicies.length > 0) {
          return of(globalPolicies);
        }
        
        // If no global policies, try to fetch regional policies from common regions
        return this.getRegionalFirewallPolicies(projectId).pipe(
          map(regionalPolicies => [...globalPolicies, ...regionalPolicies])
        );
      }),
      // Handle errors gracefully with proper CORS messaging
      catchError(error => {
        this.logFirewallApiError(error);
        
        // If it's a CORS error (status 0), provide mock data
        if (error.status === 0) {
          console.log('🔄 CORS error detected - providing mock firewall policies for demonstration');
          return of(this.getMockFirewallPolicies(projectId));
        }
        
        // If it's a 404 or 403, it might mean the feature isn't enabled or no policies exist
        if (error.status === 404 || error.status === 403) {
          console.log('Network firewall policies not available, returning empty array');
          return of([]);
        }
        
        // For other errors, return mock data for demo purposes
        console.log('🔄 API error - providing mock firewall policies for demonstration');
        return of(this.getMockFirewallPolicies(projectId));
      })
    );
  }

  private getRegionalFirewallPolicies(projectId: string): Observable<FirewallPolicy[]> {
    // Common GCP regions to check for regional firewall policies
    const commonRegions = [
      'us-central1', 'us-east1', 'us-west1', 'us-west2',
      'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4',
      'asia-east1', 'asia-southeast1', 'asia-northeast1'
    ];

    // Try a few common regions (limit to avoid too many API calls)
    const regionChecks = commonRegions.slice(0, 3).map(region => {
      const regionalUrl = `${this.baseUrl}/projects/${projectId}/regions/${region}/networkFirewallPolicies`;
      return this.http.get<{ items: any[] }>(regionalUrl, { headers: this.getHeaders() }).pipe(
        map(response => this.transformFirewallPolicies(response.items || [])),
        catchError(error => {
          // Silently handle errors for regional checks
          return of([]);
        })
      );
    });

    return forkJoin(regionChecks).pipe(
      map(results => results.flat())
    );
  }

  createFirewallRule(projectId: string, rule: Partial<FirewallRule>): Observable<FirewallRule> {
    const url = `${this.baseUrl}/projects/${projectId}/global/firewalls`;
    const payload = this.transformToApiFormat(projectId, rule);
    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.transformSingleFirewallRule(response))
    );
  }

  createFirewallPolicy(projectId: string, policy: Partial<FirewallPolicy>): Observable<FirewallPolicy> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networkFirewallPolicies`;
    const payload = {
      name: policy.name,
      description: policy.description || '',
      shortName: policy.name
    };
    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.transformSingleFirewallPolicy(response))
    );
  }

  updateFirewallRule(projectId: string, ruleName: string, rule: Partial<FirewallRule>): Observable<FirewallRule> {
    const url = `${this.baseUrl}/projects/${projectId}/global/firewalls/${ruleName}`;
    const payload = this.transformToApiFormat(projectId, rule);
    return this.http.put<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.transformSingleFirewallRule(response))
    );
  }

  deleteFirewallRule(projectId: string, ruleName: string): Observable<void> {
    const url = `${this.baseUrl}/projects/${projectId}/global/firewalls/${ruleName}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }

  deleteFirewallPolicy(projectId: string, policyName: string): Observable<void> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networkFirewallPolicies/${policyName}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }

  // Transform GCP API response to our UI format
  private transformFirewallRules(apiRules: any[]): FirewallRule[] {
    return apiRules.map(rule => this.transformSingleFirewallRule(rule));
  }

  private transformSingleFirewallRule(apiRule: any): FirewallRule {
    const rule: FirewallRule = {
      id: apiRule.id?.toString() || apiRule.name,
      name: apiRule.name,
      description: apiRule.description,
      network: this.extractNetworkName(apiRule.network),
      direction: apiRule.direction || 'INGRESS',
      priority: apiRule.priority || 1000,
      sourceRanges: apiRule.sourceRanges || [],
      destinationRanges: apiRule.destinationRanges || [],
      sourceTags: apiRule.sourceTags || [],
      targetTags: apiRule.targetTags || [],
      sourceServiceAccounts: apiRule.sourceServiceAccounts || [],
      targetServiceAccounts: apiRule.targetServiceAccounts || [],
      allowed: apiRule.allowed || [],
      denied: apiRule.denied || [],
      logConfig: apiRule.logConfig,
      disabled: apiRule.disabled || false,
      selfLink: apiRule.selfLink,
      creationTimestamp: apiRule.creationTimestamp,

      // Computed fields for UI
      type: apiRule.direction === 'EGRESS' ? 'Egress' : 'Ingress',
      targets: this.generateTargetsString(apiRule),
      filters: this.generateFiltersString(apiRule),
      protocolsPorts: this.generateProtocolsPortsString(apiRule),
      action: (apiRule.allowed && apiRule.allowed.length > 0) ? 'Allow' : 'Deny',
      logs: (apiRule.logConfig && apiRule.logConfig.enable) ? 'On' : 'Off'
    };

    return rule;
  }

  private transformFirewallPolicies(apiPolicies: any[]): FirewallPolicy[] {
    return apiPolicies.map(policy => this.transformSingleFirewallPolicy(policy));
  }

  private transformSingleFirewallPolicy(apiPolicy: any): FirewallPolicy {
    const policy: FirewallPolicy = {
      id: apiPolicy.id?.toString() || apiPolicy.name,
      name: apiPolicy.name,
      description: apiPolicy.description,
      fingerprint: apiPolicy.fingerprint,
      shortName: apiPolicy.shortName,
      displayName: apiPolicy.displayName,
      parent: apiPolicy.parent,
      rules: apiPolicy.rules || [],
      selfLink: apiPolicy.selfLink,
      creationTimestamp: apiPolicy.creationTimestamp,

      // Computed fields for UI
      deploymentScope: 'Global',
      associatedWith: [],
      firewallRules: (apiPolicy.rules || []).length,
      priority: 1000,
      type: 'Global',
      createdAt: apiPolicy.creationTimestamp ? new Date(apiPolicy.creationTimestamp) : new Date()
    };

    return policy;
  }

  // Transform UI format to GCP API format
  private transformToApiFormat(projectId: string, rule: Partial<FirewallRule>): any {
    const apiRule: any = {
      name: rule.name,
      network: `projects/${projectId}/global/networks/${rule.network || 'default'}`,
      direction: rule.direction || 'INGRESS',
      priority: rule.priority || 1000
    };

    if (rule.description) {
      apiRule.description = rule.description;
    }

    if (rule.sourceRanges && rule.sourceRanges.length > 0) {
      apiRule.sourceRanges = rule.sourceRanges;
    }

    if (rule.targetTags && rule.targetTags.length > 0) {
      apiRule.targetTags = rule.targetTags;
    }

    if (rule.sourceTags && rule.sourceTags.length > 0) {
      apiRule.sourceTags = rule.sourceTags;
    }

    // Handle protocols and ports - this will be expanded when we process the dialog data
    if (rule.action === 'Allow' || !rule.action) {
      apiRule.allowed = this.buildProtocolRules(rule);
    } else {
      apiRule.denied = this.buildProtocolRules(rule);
    }

    // Handle logging
    if (rule.logs === 'On') {
      apiRule.logConfig = {
        enable: true,
        metadata: 'INCLUDE_ALL_METADATA'
      };
    }

    if (rule.disabled) {
      apiRule.disabled = true;
    }

    return apiRule;
  }

  private buildProtocolRules(rule: Partial<FirewallRule>): Array<{ IPProtocol: string; ports?: string[] }> {
    const protocolRules: Array<{ IPProtocol: string; ports?: string[] }> = [];
    
    // If the rule already has allowed/denied rules (from the transformed dialog data), use them
    if (rule.allowed && rule.allowed.length > 0) {
      return rule.allowed;
    }
    
    if (rule.denied && rule.denied.length > 0) {
      return rule.denied;
    }
    
    // Default fallback - allow common web traffic
    return [
      {
        IPProtocol: 'tcp',
        ports: ['80', '443']
      }
    ];
  }

  private extractNetworkName(networkPath: string): string {
    if (!networkPath) return 'default';
    const parts = networkPath.split('/');
    return parts[parts.length - 1];
  }

  private generateTargetsString(apiRule: any): string {
    if (apiRule.targetTags && apiRule.targetTags.length > 0) {
      return apiRule.targetTags.join(', ');
    }
    if (apiRule.targetServiceAccounts && apiRule.targetServiceAccounts.length > 0) {
      return 'Service accounts';
    }
    return 'Apply to all';
  }

  private generateFiltersString(apiRule: any): string {
    const filters = [];
    
    if (apiRule.sourceRanges && apiRule.sourceRanges.length > 0) {
      filters.push(`IP ranges: ${apiRule.sourceRanges.join(', ')}`);
    }
    
    if (apiRule.sourceTags && apiRule.sourceTags.length > 0) {
      filters.push(`Source tags: ${apiRule.sourceTags.join(', ')}`);
    }

    return filters.length > 0 ? filters.join('; ') : 'Any source';
  }

  private generateProtocolsPortsString(apiRule: any): string {
    const protocols = [];
    
    const rules = apiRule.allowed || apiRule.denied || [];
    
    for (const rule of rules) {
      if (rule.ports && rule.ports.length > 0) {
        protocols.push(`${rule.IPProtocol}:${rule.ports.join(',')}`);
      } else {
        protocols.push(rule.IPProtocol);
      }
    }

    return protocols.length > 0 ? protocols.join(', ') : 'All';
  }

  // Additional method to get hierarchical firewall policies (organization-level)
  getHierarchicalFirewallPolicies(projectId: string): Observable<FirewallPolicy[]> {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.warn('⚠️  User is not authenticated. Returning empty hierarchical policies.');
      return of([]);
    }

    // Note: This requires the project to be part of an organization
    // and the user to have permissions to view organization-level policies
    
    console.log('🔄 Attempting to fetch hierarchical firewall policies...');
    console.log('   📍 This requires organization-level permissions');
    
    // First, we need to get the project's organization ID
    const projectUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
    
    return this.http.get<any>(projectUrl, { headers: this.getHeaders() }).pipe(
      switchMap(project => {
        if (project.parent && project.parent.type === 'organization') {
          const orgId = project.parent.id;
          const hierarchicalUrl = `${this.baseUrl}/organizations/${orgId}/locations/global/firewallPolicies`;
          
          console.log(`   📍 Found organization ${orgId}, fetching policies...`);
          
          return this.http.get<{ items: any[] }>(hierarchicalUrl, { headers: this.getHeaders() }).pipe(
            map(response => {
              console.log('✅ Hierarchical firewall policies response:', response);
              return this.transformHierarchicalFirewallPolicies(response.items || []);
            }),
            catchError(error => {
              console.log('⚠️  Could not fetch hierarchical firewall policies (this is normal):');
              console.log('   • Organization policies require special permissions');
              console.log('   • Most projects don\'t have organization-level policies');
              this.logFirewallApiError(error);
              return of([]);
            })
          );
        } else {
          console.log('✅ Project is not part of an organization, no hierarchical policies');
          return of([]);
        }
      }),
      catchError(error => {
        console.log('⚠️  Could not determine project organization (this is normal):');
        if (error.status === 0) {
          console.log('   • CORS policy blocks Resource Manager API calls from browser');
          console.log('   • This doesn\'t affect main firewall functionality');
        } else if (error.status === 403) {
          console.log('   • Project might not have organization or insufficient permissions');
        } else if (error.status === 404) {
          console.log('   • Project might not exist or be accessible');
        }
        console.log('   • Continuing without hierarchical policies...');
        
        // Don't log the full error analysis for this since it's expected
        return of([]);
      })
    );
  }

  private transformHierarchicalFirewallPolicies(apiPolicies: any[]): FirewallPolicy[] {
    return apiPolicies.map(policy => this.transformSingleFirewallPolicy(policy));
  }

  private logFirewallApiError(error: any): void {
    console.error('🚫 FIREWALL API ERROR ANALYSIS:');
    console.error('');
    console.error('📋 CURRENT IMPLEMENTATION:');
    console.error('   • URL: https://compute.googleapis.com/compute/v1');
    console.error('   • Authentication: OAuth 2.0 Bearer Token');
    console.error('   • Method: GET');
    console.error('');
    
    if (error.status === 401) {
      console.error('🔒 AUTHENTICATION ERROR:');
      console.error('   • Status: 401 Unauthorized');
      console.error('   • Required Scopes: https://www.googleapis.com/auth/compute.readonly');
      console.error('   • Solution: Ensure user has proper GCP permissions');
    } else if (error.status === 403) {
      console.error('⛔ PERMISSION ERROR:');
      console.error('   • Status: 403 Forbidden');
      console.error('   • Required: Compute Engine API enabled');
      console.error('   • Solution: Enable Compute Engine API in project');
    } else if (error.status === 404) {
      console.error('❓ NOT FOUND:');
      console.error('   • Status: 404 Not Found');
      console.error('   • Possible: No firewall policies exist');
      console.error('   • Normal: This is expected for new projects');
    } else if (error.status === 0) {
      console.error('🌐 NETWORK/CORS ERROR:');
      console.error('   • Status: 0 (Network blocked)');
      console.error('   • Cause: Browser CORS policy');
      console.error('   • Solution: Deploy to Google Cloud Platform');
    }
    
    console.error('');
    console.error('✅ NEXT STEPS:');
    console.error('   1. Deploy to Google Cloud (App Engine/Cloud Run)');
    console.error('   2. Use Service Account authentication');
    console.error('   3. Enable Compute Engine API');
    console.error('   4. Use backend proxy for browser apps');
  }

  private getMockFirewallPolicies(projectId: string): FirewallPolicy[] {
    console.log('📊 Generating mock firewall policies for project:', projectId);
    
    return [
      {
        id: 'mock-policy-web-servers',
        name: 'web-servers-policy',
        description: 'Policy for web server security',
        shortName: 'web-servers',
        displayName: 'Web Servers Security Policy',
        parent: `projects/${projectId}`,
        rules: [
          {
            description: 'Allow HTTP traffic',
            direction: 'INGRESS',
            disabled: false,
            enableLogging: true,
            priority: 1000,
            ruleTupleCount: 1,
            targetResources: ['web-servers'],
            action: 'allow'
          },
          {
            description: 'Allow HTTPS traffic',
            direction: 'INGRESS',
            disabled: false,
            enableLogging: true,
            priority: 1001,
            ruleTupleCount: 1,
            targetResources: ['web-servers'],
            action: 'allow'
          }
        ],
        deploymentScope: 'Global',
        associatedWith: ['web-servers', 'load-balancers'],
        firewallRules: 2,
        priority: 1000,
        type: 'Global',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        selfLink: `projects/${projectId}/global/networkFirewallPolicies/web-servers-policy`,
        creationTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'mock-policy-database',
        name: 'database-policy',
        description: 'Database security policy',
        shortName: 'database',
        displayName: 'Database Security Policy',
        parent: `projects/${projectId}`,
        rules: [
          {
            description: 'Allow MySQL connections',
            direction: 'INGRESS',
            disabled: false,
            enableLogging: true,
            priority: 2000,
            ruleTupleCount: 1,
            targetResources: ['database-servers'],
            action: 'allow'
          }
        ],
        deploymentScope: 'Global',
        associatedWith: ['database-servers'],
        firewallRules: 1,
        priority: 2000,
        type: 'Global',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        selfLink: `projects/${projectId}/global/networkFirewallPolicies/database-policy`,
        creationTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'mock-policy-internal',
        name: 'internal-services-policy',
        description: 'Internal services communication policy',
        shortName: 'internal',
        displayName: 'Internal Services Policy',
        parent: `projects/${projectId}`,
        rules: [
          {
            description: 'Allow internal service mesh traffic',
            direction: 'INGRESS',
            disabled: false,
            enableLogging: false,
            priority: 3000,
            ruleTupleCount: 3,
            targetResources: ['internal-services'],
            action: 'allow'
          },
          {
            description: 'Block external access to internal services',
            direction: 'INGRESS',
            disabled: false,
            enableLogging: true,
            priority: 3001,
            ruleTupleCount: 1,
            targetResources: ['internal-services'],
            action: 'deny'
          }
        ],
        deploymentScope: 'Global',
        associatedWith: ['internal-services', 'microservices'],
        firewallRules: 2,
        priority: 3000,
        type: 'Global',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        selfLink: `projects/${projectId}/global/networkFirewallPolicies/internal-services-policy`,
        creationTimestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  private getMockFirewallRules(projectId: string): FirewallRule[] {
    console.log('📊 Generating mock firewall rules for project:', projectId);
    
    return [
      {
        id: 'mock-rule-allow-http',
        name: 'allow-http',
        description: 'Allow HTTP traffic from internet',
        network: 'default',
        direction: 'INGRESS',
        priority: 1000,
        sourceRanges: ['0.0.0.0/0'],
        targetTags: ['http-server'],
        allowed: [{ IPProtocol: 'tcp', ports: ['80'] }],
        disabled: false,
        type: 'Ingress',
        targets: 'http-server (tags)',
        filters: 'IP ranges: 0.0.0.0/0',
        protocolsPorts: 'tcp:80',
        action: 'Allow',
        logs: 'Off',
        hitCount: 1245,
        lastHit: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        selfLink: `projects/${projectId}/global/firewalls/allow-http`,
        creationTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      },
      {
        id: 'mock-rule-allow-https',
        name: 'allow-https',
        description: 'Allow HTTPS traffic from internet',
        network: 'default',
        direction: 'INGRESS',
        priority: 1000,
        sourceRanges: ['0.0.0.0/0'],
        targetTags: ['https-server'],
        allowed: [{ IPProtocol: 'tcp', ports: ['443'] }],
        disabled: false,
        type: 'Ingress',
        targets: 'https-server (tags)',
        filters: 'IP ranges: 0.0.0.0/0',
        protocolsPorts: 'tcp:443',
        action: 'Allow',
        logs: 'On',
        hitCount: 3892,
        lastHit: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        selfLink: `projects/${projectId}/global/firewalls/allow-https`,
        creationTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        logConfig: { enable: true, metadata: 'INCLUDE_ALL_METADATA' }
      },
      {
        id: 'mock-rule-allow-ssh',
        name: 'allow-ssh',
        description: 'Allow SSH access from corporate network',
        network: 'default',
        direction: 'INGRESS',
        priority: 1000,
        sourceRanges: ['10.0.0.0/8', '172.16.0.0/12'],
        targetTags: ['ssh-access'],
        allowed: [{ IPProtocol: 'tcp', ports: ['22'] }],
        disabled: false,
        type: 'Ingress',
        targets: 'ssh-access (tags)',
        filters: 'IP ranges: 10.0.0.0/8, 172.16.0.0/12',
        protocolsPorts: 'tcp:22',
        action: 'Allow',
        logs: 'On',
        hitCount: 156,
        lastHit: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        selfLink: `projects/${projectId}/global/firewalls/allow-ssh`,
        creationTimestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        logConfig: { enable: true, metadata: 'INCLUDE_ALL_METADATA' }
      },
      {
        id: 'mock-rule-deny-all',
        name: 'deny-all-external',
        description: 'Deny all external traffic to internal services',
        network: 'private-vpc',
        direction: 'INGRESS',
        priority: 2000,
        sourceRanges: ['0.0.0.0/0'],
        targetTags: ['internal-service'],
        denied: [{ IPProtocol: 'tcp' }, { IPProtocol: 'udp' }],
        disabled: false,
        type: 'Ingress',
        targets: 'internal-service (tags)',
        filters: 'IP ranges: 0.0.0.0/0',
        protocolsPorts: 'tcp, udp (all ports)',
        action: 'Deny',
        logs: 'On',
        hitCount: 45,
        lastHit: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        selfLink: `projects/${projectId}/global/firewalls/deny-all-external`,
        creationTimestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        logConfig: { enable: true, metadata: 'INCLUDE_ALL_METADATA' }
      },
      {
        id: 'mock-rule-allow-internal',
        name: 'allow-internal-communication',
        description: 'Allow communication between internal services',
        network: 'private-vpc',
        direction: 'INGRESS',
        priority: 1500,
        sourceRanges: ['10.0.0.0/8'],
        targetTags: ['internal-service'],
        allowed: [
          { IPProtocol: 'tcp', ports: ['80', '443', '8080', '9090'] },
          { IPProtocol: 'udp', ports: ['53'] }
        ],
        disabled: false,
        type: 'Ingress',
        targets: 'internal-service (tags)',
        filters: 'IP ranges: 10.0.0.0/8',
        protocolsPorts: 'tcp:80,443,8080,9090; udp:53',
        action: 'Allow',
        logs: 'Off',
        hitCount: 8934,
        lastHit: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        selfLink: `projects/${projectId}/global/firewalls/allow-internal-communication`,
        creationTimestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
} 