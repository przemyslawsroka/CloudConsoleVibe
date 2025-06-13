import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface VpcNetwork {
  id: string;
  name: string;
  description?: string;
  selfLink: string;
  autoCreateSubnetworks: boolean;
  creationTimestamp: string;
  subnetworks?: string[];
  routingConfig?: {
    routingMode: string;
  };
  networkFirewallPolicyEnforcementOrder?: string;
  mtu?: number;
  enableUlaInternalIpv6?: boolean;
  bestPathSelectionMode?: string;
  tags?: string[];
  subnetDetails?: SubnetDetails[];
}

export interface SubnetDetails {
  name: string;
  region: string;
  ipCidrRange: string;
  gatewayAddress: string;
  selfLink: string;
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  network: string;
  destRange: string;
  priority: number;
  tags?: string[];
  nextHopInstance?: string;
  nextHopIp?: string;
  nextHopNetwork?: string;
  nextHopGateway?: string;
  nextHopVpnTunnel?: string;
  nextHopIlb?: string;
  selfLink: string;
}

export interface FlowLog {
  name: string;
  network: string;
  enabled: boolean;
  aggregationInterval?: string;
  flowSampling?: number;
  metadata?: string[];
  filterExpr?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VpcService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getVpcNetworks(projectId: string): Observable<VpcNetwork[]> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getMockVpcNetworks();
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/networks`;
    return this.http.get<{ items: VpcNetwork[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error('Failed to load VPC networks:', error);
        // Don't fall back to mock data when authenticated with real Google account
        // Return empty array to show "No VPC networks found" message
        return of([]);
      })
    );
  }

  getVpcNetwork(projectId: string, networkName: string): Observable<VpcNetwork> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getMockVpcNetwork(networkName);
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/networks/${networkName}`;
    return this.http.get<VpcNetwork>(url, { headers: this.getHeaders() }).pipe(
      switchMap(vpc => {
        if (vpc.subnetworks && vpc.subnetworks.length > 0) {
          // Fetch details for each subnet
          const subnetDetails$ = vpc.subnetworks.map(subnetUrl => this.getSubnetDetails(subnetUrl));
          return forkJoin(subnetDetails$).pipe(
            map(details => {
              return {
                ...vpc,
                subnetDetails: details
              };
            })
          );
        }
        return of(vpc);
      }),
      catchError(error => {
        console.error('Failed to load VPC network:', error);
        // Don't fall back to mock data when authenticated with real Google account
        throw error;
      })
    );
  }

  getRoutes(projectId: string): Observable<Route[]> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getMockRoutes();
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/routes`;
    return this.http.get<{ items: Route[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      catchError(error => {
        console.error('Failed to load routes:', error);
        // Don't fall back to mock data when authenticated with real Google account
        return of([]);
      })
    );
  }

  getFlowLogs(projectId: string, location: string = 'global'): Observable<any[]> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getMockFlowLogs();
    }

    const url = `https://networkmanagement.googleapis.com/v1/projects/${projectId}/locations/${location}/vpcFlowLogsConfigs`;
    return this.http.get<{ vpcFlowLogsConfigs: any[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.vpcFlowLogsConfigs || []),
      catchError(error => {
        console.error('Failed to load flow logs:', error);
        // Don't fall back to mock data when authenticated with real Google account
        return of([]);
      })
    );
  }

  private getMockVpcNetworks(): Observable<VpcNetwork[]> {
    const mockNetworks: VpcNetwork[] = [
      {
        id: '0000000000000000000',
        name: 'default',
        description: 'Default network for the project',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/default',
        autoCreateSubnetworks: true,
        creationTimestamp: '2024-01-01T00:00:00.000-08:00',
        subnetworks: [
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/default',
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-east1/subnetworks/default',
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/europe-west1/subnetworks/default'
        ],
        routingConfig: {
          routingMode: 'REGIONAL'
        },
        networkFirewallPolicyEnforcementOrder: 'AFTER_CLASSIC_FIREWALL',
        mtu: 1460,
        enableUlaInternalIpv6: false,
        bestPathSelectionMode: 'LEGACY',
        subnetDetails: [
          {
            name: 'default',
            region: 'us-central1',
            ipCidrRange: '10.128.0.0/20',
            gatewayAddress: '10.128.0.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/default'
          },
          {
            name: 'default',
            region: 'us-east1',
            ipCidrRange: '10.142.0.0/20',
            gatewayAddress: '10.142.0.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-east1/subnetworks/default'
          },
          {
            name: 'default',
            region: 'europe-west1',
            ipCidrRange: '10.132.0.0/20',
            gatewayAddress: '10.132.0.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/europe-west1/subnetworks/default'
          }
        ]
      },
      {
        id: '1234567890123456789',
        name: 'production-vpc',
        description: 'Production environment VPC network',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/production-vpc',
        autoCreateSubnetworks: false,
        creationTimestamp: '2024-01-15T10:30:00.000-08:00',
        subnetworks: [
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/prod-us-central1',
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-east1/subnetworks/prod-us-east1'
        ],
        routingConfig: {
          routingMode: 'REGIONAL'
        },
        networkFirewallPolicyEnforcementOrder: 'AFTER_CLASSIC_FIREWALL',
        mtu: 1460,
        enableUlaInternalIpv6: false,
        bestPathSelectionMode: 'LEGACY',
        tags: ['gcp-environment:prober', 'gcp-product:network_intelligence'],
        subnetDetails: [
          {
            name: 'prod-us-central1',
            region: 'us-central1',
            ipCidrRange: '10.0.1.0/24',
            gatewayAddress: '10.0.1.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/prod-us-central1'
          },
          {
            name: 'prod-us-east1',
            region: 'us-east1',
            ipCidrRange: '10.0.2.0/24',
            gatewayAddress: '10.0.2.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-east1/subnetworks/prod-us-east1'
          }
        ]
      },
      {
        id: '2345678901234567890',
        name: 'development-vpc',
        description: 'Development and testing environment',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/development-vpc',
        autoCreateSubnetworks: false,
        creationTimestamp: '2024-02-01T14:20:00.000-08:00',
        subnetworks: [
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-west1/subnetworks/dev-us-west1'
        ],
        routingConfig: {
          routingMode: 'REGIONAL'
        },
        networkFirewallPolicyEnforcementOrder: 'BEFORE_CLASSIC_FIREWALL',
        subnetDetails: [
          {
            name: 'dev-us-west1',
            region: 'us-west1',
            ipCidrRange: '10.1.0.0/16',
            gatewayAddress: '10.1.0.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-west1/subnetworks/dev-us-west1'
          }
        ]
      },
      {
        id: '3456789012345678901',
        name: 'staging-vpc',
        description: 'Staging environment for pre-production testing',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/staging-vpc',
        autoCreateSubnetworks: false,
        creationTimestamp: '2024-02-15T09:45:00.000-08:00',
        subnetworks: [
          'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/staging-us-central1'
        ],
        routingConfig: {
          routingMode: 'REGIONAL'
        },
        networkFirewallPolicyEnforcementOrder: 'AFTER_CLASSIC_FIREWALL',
        subnetDetails: [
          {
            name: 'staging-us-central1',
            region: 'us-central1',
            ipCidrRange: '10.2.0.0/20',
            gatewayAddress: '10.2.0.1',
            selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/regions/us-central1/subnetworks/staging-us-central1'
          }
        ]
      }
    ];

    console.log('🎭 Serving mock VPC networks for demo');
    return of(mockNetworks);
  }

  private getMockVpcNetwork(networkName: string): Observable<VpcNetwork> {
    return this.getMockVpcNetworks().pipe(
      map(networks => networks.find(n => n.name === networkName) || networks[0])
    );
  }

  private getMockRoutes(): Observable<Route[]> {
    const mockRoutes: Route[] = [
      {
        id: '1111111111111111111',
        name: 'default-route-internet',
        description: 'Default route to internet gateway',
        network: 'production-vpc',
        destRange: '0.0.0.0/0',
        priority: 1000,
        nextHopGateway: 'default-internet-gateway',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/routes/default-route-internet',
        tags: ['production', 'internet']
      },
      {
        id: '2222222222222222222',
        name: 'internal-route-prod',
        description: 'Internal routing for production subnets',
        network: 'production-vpc',
        destRange: '10.0.0.0/16',
        priority: 100,
        nextHopNetwork: 'production-vpc',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/routes/internal-route-prod',
        tags: ['production', 'internal']
      },
      {
        id: '3333333333333333333',
        name: 'dev-internet-route',
        description: 'Development environment internet access',
        network: 'development-vpc',
        destRange: '0.0.0.0/0',
        priority: 1000,
        nextHopGateway: 'default-internet-gateway',
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/routes/dev-internet-route',
        tags: ['development']
      }
    ];

    console.log('🎭 Serving mock routes for demo');
    return of(mockRoutes);
  }

  private getMockFlowLogs(): Observable<any[]> {
    const mockFlowLogs = [
      {
        name: 'projects/demo-project/locations/global/vpcFlowLogsConfigs/production-flow-logs',
        network: 'production-vpc',
        enabled: true,
        aggregationInterval: 'INTERVAL_5_SEC',
        flowSampling: 0.5,
        metadata: ['INCLUDE_ALL_METADATA'],
        description: 'Production VPC flow logs for security monitoring'
      },
      {
        name: 'projects/demo-project/locations/global/vpcFlowLogsConfigs/dev-flow-logs',
        network: 'development-vpc',
        enabled: false,
        aggregationInterval: 'INTERVAL_30_SEC',
        flowSampling: 0.1,
        metadata: ['INCLUDE_ALL_METADATA'],
        description: 'Development flow logs (disabled to save costs)'
      }
    ];

    console.log('🎭 Serving mock flow logs for demo');
    return of(mockFlowLogs);
  }

  private getSubnetDetails(subnetUrl: string): Observable<SubnetDetails> {
    return this.http.get<SubnetDetails>(subnetUrl, { headers: this.getHeaders() });
  }

  createVpcNetwork(projectId: string, network: Partial<VpcNetwork>): Observable<VpcNetwork> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating VPC network creation');
      const mockCreatedNetwork: VpcNetwork = {
        id: Date.now().toString(),
        name: network.name || 'demo-network',
        description: network.description || 'Demo network created in demo mode',
        selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/${network.name}`,
        autoCreateSubnetworks: network.autoCreateSubnetworks || false,
        creationTimestamp: new Date().toISOString(),
        subnetworks: [],
        routingConfig: { routingMode: 'REGIONAL' },
        networkFirewallPolicyEnforcementOrder: network.networkFirewallPolicyEnforcementOrder || 'AFTER_CLASSIC_FIREWALL'
      };
      return of(mockCreatedNetwork);
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/networks`;
    return this.http.post<any>(url, network, { headers: this.getHeaders() }).pipe(
      switchMap((operation: any) => {
        // Google Cloud API returns an operation, wait for it to complete
        return this.waitForOperation(projectId, operation).pipe(
          map(() => {
            // Return a mock VPC network response based on the input
            const createdNetwork: VpcNetwork = {
              id: Date.now().toString(),
              name: network.name || 'unknown',
              description: network.description,
              selfLink: `https://www.googleapis.com/compute/v1/projects/${projectId}/global/networks/${network.name}`,
              autoCreateSubnetworks: network.autoCreateSubnetworks || false,
              creationTimestamp: new Date().toISOString(),
              subnetworks: [],
              routingConfig: network.routingConfig || { routingMode: 'REGIONAL' },
              networkFirewallPolicyEnforcementOrder: network.networkFirewallPolicyEnforcementOrder || 'AFTER_CLASSIC_FIREWALL'
            };
            return createdNetwork;
          })
        );
      }),
      catchError(error => {
        console.error('Error creating VPC network:', error);
        throw error;
      })
    );
  }

  createVpcNetworkWithSubnets(projectId: string, network: Partial<VpcNetwork>, subnets: any[] | null): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating VPC network creation with subnets');
      const mockCreatedNetwork: VpcNetwork = {
        id: Date.now().toString(),
        name: network.name || 'demo-network',
        description: network.description || 'Demo network created in demo mode',
        selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/global/networks/${network.name}`,
        autoCreateSubnetworks: network.autoCreateSubnetworks || false,
        creationTimestamp: new Date().toISOString(),
        subnetworks: subnets ? subnets.map((subnet, index) => 
          `https://www.googleapis.com/compute/v1/projects/demo-project/regions/${subnet.region}/subnetworks/${subnet.name}`
        ) : [],
        routingConfig: { routingMode: 'REGIONAL' },
        networkFirewallPolicyEnforcementOrder: network.networkFirewallPolicyEnforcementOrder || 'AFTER_CLASSIC_FIREWALL'
      };
      return of(mockCreatedNetwork);
    }

    // First create the VPC network
    return this.createVpcNetwork(projectId, network).pipe(
      switchMap((createdVpc: VpcNetwork) => {
        // If no custom subnets or auto-create is enabled, return the VPC
        if (!subnets || network.autoCreateSubnetworks) {
          return of(createdVpc);
        }

        // Create each subnet
        const subnetCreations = subnets.map(subnet => this.createSubnet(projectId, createdVpc.name, subnet));
        
        // Wait for all subnets to be created
        return forkJoin(subnetCreations).pipe(
          map(() => createdVpc) // Return the original VPC after subnets are created
        );
      })
    );
  }

  private createSubnet(projectId: string, networkName: string, subnetData: any): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${subnetData.region}/subnetworks`;
    
    const subnetPayload = {
      name: subnetData.name,
      network: `projects/${projectId}/global/networks/${networkName}`,
      ipCidrRange: subnetData.ipRange,
      region: subnetData.region,
      privateIpGoogleAccess: subnetData.privateGoogleAccess || false,
      enableFlowLogs: subnetData.flowLogs || false
    };

    return this.http.post(url, subnetPayload, { headers: this.getHeaders() }).pipe(
      switchMap((operation: any) => {
        // Wait for subnet creation operation to complete
        return this.waitForOperation(projectId, operation);
      }),
      catchError(error => {
        console.error('Error creating subnet:', error);
        throw error;
      })
    );
  }

  private waitForOperation(projectId: string, operation: any): Observable<any> {
    if (!operation || !operation.name) {
      return of(operation);
    }

    // Extract operation details
    const operationName = operation.name;
    const isGlobalOperation = operation.zone ? false : operation.region ? false : true;
    
    let operationUrl: string;
    if (isGlobalOperation) {
      operationUrl = `${this.baseUrl}/projects/${projectId}/global/operations/${operationName}`;
    } else if (operation.zone) {
      const zone = operation.zone.split('/').pop();
      operationUrl = `${this.baseUrl}/projects/${projectId}/zones/${zone}/operations/${operationName}`;
    } else if (operation.region) {
      const region = operation.region.split('/').pop();
      operationUrl = `${this.baseUrl}/projects/${projectId}/regions/${region}/operations/${operationName}`;
    } else {
      operationUrl = `${this.baseUrl}/projects/${projectId}/global/operations/${operationName}`;
    }

    return this.pollOperation(operationUrl);
  }

  private pollOperation(operationUrl: string, maxAttempts: number = 30, delayMs: number = 2000): Observable<any> {
    let attempts = 0;
    
    return new Observable(observer => {
      const poll = () => {
        attempts++;
        
        this.http.get<any>(operationUrl, { headers: this.getHeaders() }).subscribe({
          next: (operation: any) => {
            if (operation.status === 'DONE') {
              if (operation.error) {
                observer.error(new Error(`Operation failed: ${JSON.stringify(operation.error)}`));
              } else {
                observer.next(operation);
                observer.complete();
              }
            } else if (attempts >= maxAttempts) {
              observer.error(new Error(`Operation timeout after ${maxAttempts} attempts`));
            } else {
              // Continue polling
              setTimeout(poll, delayMs);
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };
      
      poll();
    });
  }

  updateVpcNetwork(projectId: string, networkName: string, updates: Partial<VpcNetwork>): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating VPC network update');
      return of({ status: 'success', ...updates });
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/networks/${networkName}`;
    
    // Prepare the update payload according to GCP Compute API requirements
    const updatePayload: any = {};
    
    if (updates.description !== undefined) {
      updatePayload.description = updates.description;
    }
    
    if (updates.routingConfig?.routingMode) {
      updatePayload.routingConfig = {
        routingMode: updates.routingConfig.routingMode
      };
    }
    
    if (updates.networkFirewallPolicyEnforcementOrder) {
      updatePayload.networkFirewallPolicyEnforcementOrder = updates.networkFirewallPolicyEnforcementOrder;
    }

    return this.http.patch(url, updatePayload, { headers: this.getHeaders() }).pipe(
      switchMap((operation: any) => {
        return this.waitForOperation(projectId, operation);
      }),
      catchError(error => {
        console.error('Error updating VPC network:', error);
        throw error;
      })
    );
  }

  deleteVpcNetwork(projectId: string, networkName: string): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating VPC network deletion');
      return of({ status: 'success' });
    }

    // First check if the network has subnets that need to be deleted
    return this.getVpcNetwork(projectId, networkName).pipe(
      switchMap((vpc: VpcNetwork) => {
        // If the VPC has custom subnets, delete them first
        if (vpc.subnetworks && vpc.subnetworks.length > 0 && !vpc.autoCreateSubnetworks) {
          console.log(`Deleting ${vpc.subnetworks.length} subnets before deleting VPC`);
          const subnetDeletions = vpc.subnetworks.map(subnetUrl => {
            // Extract region and subnet name from URL
            const parts = subnetUrl.split('/');
            const region = parts[parts.indexOf('regions') + 1];
            const subnetName = parts[parts.length - 1];
            return this.deleteSubnet(projectId, region, subnetName);
          });
          
          // Wait for all subnets to be deleted, then delete the VPC
          return forkJoin(subnetDeletions).pipe(
            switchMap(() => this.performVpcDeletion(projectId, networkName))
          );
        } else {
          // No subnets to delete, proceed with VPC deletion
          return this.performVpcDeletion(projectId, networkName);
        }
      }),
      catchError(error => {
        console.error('Error deleting VPC network:', error);
        // If we can't get VPC details, try to delete it anyway
        return this.performVpcDeletion(projectId, networkName);
      })
    );
  }

  private deleteSubnet(projectId: string, region: string, subnetName: string): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${region}/subnetworks/${subnetName}`;
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      switchMap((operation: any) => {
        return this.waitForOperation(projectId, operation);
      }),
      catchError(error => {
        console.error(`Error deleting subnet ${subnetName}:`, error);
        throw error;
      })
    );
  }

  private performVpcDeletion(projectId: string, networkName: string): Observable<any> {
    const url = `${this.baseUrl}/projects/${projectId}/global/networks/${networkName}`;
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      switchMap((operation: any) => {
        return this.waitForOperation(projectId, operation);
      }),
      catchError(error => {
        console.error('Error in VPC deletion operation:', error);
        throw error;
      })
    );
  }

  createRoute(projectId: string, route: Partial<Route>): Observable<Route> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating route creation');
      const mockCreatedRoute: Route = {
        id: Date.now().toString(),
        name: route.name || 'demo-route',
        description: route.description || 'Demo route created in demo mode',
        network: route.network || 'demo-network',
        destRange: route.destRange || '0.0.0.0/0',
        priority: route.priority || 1000,
        nextHopGateway: route.nextHopGateway || 'default-internet-gateway',
        selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/global/routes/${route.name}`,
        tags: route.tags || []
      };
      return of(mockCreatedRoute);
    }

    const url = `${this.baseUrl}/projects/${projectId}/global/routes`;
    
    // Format the route payload according to GCP Compute API requirements
    const routePayload: Partial<Route> = {
      name: route.name,
      network: route.network,
      destRange: route.destRange,
      priority: route.priority,
      tags: route.tags || [],
      ...(route.description && { description: route.description })
    };

    // Add the appropriate next hop field based on the type
    if (route.nextHopInstance) {
      routePayload.nextHopInstance = `projects/${projectId}/zones/${route.nextHopInstance}/instances/${route.nextHopInstance}`;
    } else if (route.nextHopIp) {
      routePayload.nextHopIp = route.nextHopIp;
    } else if (route.nextHopNetwork) {
      routePayload.nextHopNetwork = route.nextHopNetwork;
    } else if (route.nextHopGateway) {
      routePayload.nextHopGateway = `projects/${projectId}/global/gateways/${route.nextHopGateway}`;
    } else if (route.nextHopVpnTunnel) {
      routePayload.nextHopVpnTunnel = `projects/${projectId}/regions/${route.nextHopVpnTunnel}/vpnTunnels/${route.nextHopVpnTunnel}`;
    } else if (route.nextHopIlb) {
      routePayload.nextHopIlb = `projects/${projectId}/regions/${route.nextHopIlb}/forwardingRules/${route.nextHopIlb}`;
    }

    return this.http.post<Route>(url, routePayload, { headers: this.getHeaders() });
  }

  createFlowLog(projectId: string, payload: any, location: string = 'global'): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating flow log creation');
      return of({
        name: `projects/demo-project/locations/${location}/vpcFlowLogsConfigs/${payload.name || 'demo-flow-log'}`,
        ...payload,
        enabled: true
      });
    }

    const url = `https://networkmanagement.googleapis.com/v1/projects/${projectId}/locations/${location}/vpcFlowLogsConfigs`;
    return this.http.post<any>(url, payload, { headers: this.getHeaders() });
  }

  updateFlowLogs(projectId: string, configName: string, updates: any, location: string = 'global'): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating flow log update');
      return of({ ...updates, name: configName });
    }

    // configName should be the full resource name, e.g. projects/{project}/locations/{location}/vpcFlowLogsConfigs/{config}
    const url = `https://networkmanagement.googleapis.com/v1/${configName}`;
    return this.http.patch<any>(url, updates, { headers: this.getHeaders() });
  }

  deleteFlowLogs(projectId: string, configName: string, location: string = 'global'): Observable<void> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating flow log deletion');
      return of(undefined);
    }

    // configName should be the full resource name, e.g. projects/{project}/locations/{location}/vpcFlowLogsConfigs/{config}
    const url = `https://networkmanagement.googleapis.com/v1/${configName}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }
} 