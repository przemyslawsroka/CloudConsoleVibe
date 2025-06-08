import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudRouter {
  id: string;
  name: string;
  network: string;
  region: string;
  interconnectEncryption: string;
  cloudRouterASN: number;
  interconnectVpnGateway: string;
  connection: string;
  bgpSessions: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  project?: string;
  creationTimestamp?: string;
  description?: string;
  bgpPeers?: BgpPeer[];
  natGateways?: NatGateway[];
}

export interface BgpPeer {
  name: string;
  interfaceName: string;
  ipAddress: string;
  peerAsn: number;
  peerIpAddress: string;
  advertiseMode: string;
  advertisedGroups: string[];
  status: string;
}

export interface NatGateway {
  name: string;
  natIpAllocateOption: string;
  sourceSubnetworkIpRangesToNat: string;
  status: string;
}

export interface CloudRouterDetails extends CloudRouter {
  bgpPeers: BgpPeer[];
  natGateways: NatGateway[];
  interfaces: RouterInterface[];
  logs?: any;
}

export interface RouterInterface {
  name: string;
  ipRange: string;
  vpnTunnel?: string;
  interconnectAttachment?: string;
}

export interface CreateRouterRequest {
  name: string;
  region: string;
  network: string;
  asn: number;
  bgpKeepaliveInterval: number;
  advertiseMode: string;
  advertisedGroups: string[];
  description: string;
}

export interface NetworkOption {
  id: string;
  name: string;
  selfLink: string;
  autoCreateSubnetworks: boolean;
  description: string;
}

export interface RegionOption {
  id: string;
  name: string;
  selfLink: string;
  description: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudRouterService {
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
   * Get list of Cloud Routers from all regions using aggregatedList
   */
  getCloudRouters(): Observable<CloudRouter[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockRouters());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/aggregated/routers`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const routers: CloudRouter[] = [];
        const errors: string[] = [];
        
        // Handle partial success - only log actual errors, not "no results" warnings
        if (response.warning) {
          const warnings = Array.isArray(response.warning) ? response.warning : [response.warning];
          warnings.forEach((warning: any) => {
            // Only log warnings that are not "no results" messages
            if (warning.message && !warning.message.includes('No results for the scope')) {
              console.warn(`Warning for ${warning.code}:`, warning.message);
              errors.push(`${warning.code}: ${warning.message}`);
            }
          });
        }

        // Process items from each region
        if (response.items) {
          Object.keys(response.items).forEach(regionKey => {
            const regionData = response.items[regionKey];
            
            // Handle region-specific warnings - only log actual errors, not "no results" warnings
            if (regionData.warning) {
              const warnings = Array.isArray(regionData.warning) ? regionData.warning : [regionData.warning];
              warnings.forEach((warning: any) => {
                // Only log warnings that are not "no results" messages
                if (warning.message && !warning.message.includes('No results for the scope')) {
                  console.warn(`Warning for region ${regionKey}:`, warning.message);
                  errors.push(`${regionKey}: ${warning.message}`);
                }
              });
            }
            
            // Process routers if they exist
            if (regionData.routers && regionData.routers.length > 0) {
              const regionName = this.extractRegionFromKey(regionKey);
              const regionRouters = this.transformRoutersResponse(regionData.routers, regionName);
              routers.push(...regionRouters);
            }
          });
        }
        
        // Log any actual errors (excluding normal "no results" responses)
        if (errors.length > 0) {
          console.warn('Some regions had errors:', errors);
        }
        
        return routers;
      }),
      catchError(error => {
        console.error('Error fetching Cloud Routers:', error);
        return of([]);
      })
    );
  }

  /**
   * Get detailed information about a specific Cloud Router
   */
  getCloudRouterDetails(routerName: string, region: string): Observable<CloudRouterDetails> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockRouterDetails(routerName, region));
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/regions/${region}/routers/${routerName}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformRouterToDetails(response, region)),
      catchError(error => {
        console.error('Error fetching Cloud Router details:', error);
        throw error;
      })
    );
  }

  /**
   * Get BGP sessions for a router
   */
  getBgpSessions(routerName: string, region: string): Observable<any[]> {
    if (this.authService.isDemoMode()) {
      return of([]);
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/regions/${region}/routers/${routerName}/getRouterStatus`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => response.bgpPeerStatus || []),
      catchError(error => {
        console.error('Error fetching BGP sessions:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new Cloud Router
   */
  createCloudRouter(routerData: CreateRouterRequest): Observable<any> {
    if (this.authService.isDemoMode()) {
      // Return mock success response
      return of({
        kind: 'compute#operation',
        operationType: 'insert',
        status: 'DONE',
        name: 'operation-create-router-' + Date.now(),
        targetLink: `projects/demo-project/regions/${routerData.region}/routers/${routerData.name}`
      });
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/regions/${routerData.region}/routers`;

    const requestBody = {
      name: routerData.name,
      description: routerData.description,
      network: `projects/${project}/global/networks/${routerData.network}`,
      asn: routerData.asn,
      bgp: {
        asn: routerData.asn,
        keepaliveInterval: routerData.bgpKeepaliveInterval,
        advertiseMode: routerData.advertiseMode,
        advertisedGroups: routerData.advertisedGroups
      }
    };

    return this.http.post<any>(url, requestBody, { headers: this.getHeaders() });
  }

  /**
   * Get available networks for router creation
   */
  getNetworks(): Observable<NetworkOption[]> {
    if (this.authService.isDemoMode()) {
      return of(this.getMockNetworks());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/global/networks`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformNetworksResponse(response.items || [])),
      catchError(error => {
        console.error('Error fetching networks:', error);
        return of([]);
      })
    );
  }

  /**
   * Get available regions for router creation
   */
  getRegions(): Observable<RegionOption[]> {
    if (this.authService.isDemoMode()) {
      return of(this.getMockRegions());
    }

    const project = this.getCurrentProject();
    const url = `${this.baseUrl}/projects/${project}/regions`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => this.transformRegionsResponse(response.items || [])),
      catchError(error => {
        console.error('Error fetching regions:', error);
        return of([]);
      })
    );
  }

  private transformRoutersResponse(routers: any[], region: string): CloudRouter[] {
    return routers.map(router => ({
      id: router.id,
      name: router.name,
      network: this.extractNetworkName(router.network),
      region: region,
      interconnectEncryption: this.getInterconnectEncryption(router),
      cloudRouterASN: router.asn || 64512,
      interconnectVpnGateway: this.getInterconnectVpnGateway(router),
      connection: this.getConnection(router),
      bgpSessions: router.bgpPeers?.length || 0,
      status: 'ACTIVE' as const,
      project: this.getCurrentProject(),
      creationTimestamp: router.creationTimestamp,
      description: router.description
    }));
  }

  private transformRouterToDetails(router: any, region: string): CloudRouterDetails {
    const bgpPeers = router.bgpPeers?.map((peer: any) => ({
      name: peer.name,
      interfaceName: peer.interfaceName,
      ipAddress: peer.ipAddress,
      peerAsn: peer.peerAsn,
      peerIpAddress: peer.peerIpAddress,
      advertiseMode: peer.advertiseMode || 'DEFAULT',
      advertisedGroups: peer.advertisedGroups || [],
      status: 'ESTABLISHED'
    })) || [];

    const natGateways = router.nats?.map((nat: any) => ({
      name: nat.name,
      natIpAllocateOption: nat.natIpAllocateOption || 'AUTO_ONLY',
      sourceSubnetworkIpRangesToNat: nat.sourceSubnetworkIpRangesToNat || 'ALL_SUBNETWORKS_ALL_IP_RANGES',
      status: 'ACTIVE'
    })) || [];

    const interfaces = router.interfaces?.map((intf: any) => ({
      name: intf.name,
      ipRange: intf.ipRange,
      vpnTunnel: intf.vpnTunnel,
      interconnectAttachment: intf.interconnectAttachment
    })) || [];

    return {
      id: router.id,
      name: router.name,
      network: this.extractNetworkName(router.network),
      region: region,
      interconnectEncryption: this.getInterconnectEncryption(router),
      cloudRouterASN: router.asn || 64512,
      interconnectVpnGateway: this.getInterconnectVpnGateway(router),
      connection: this.getConnection(router),
      bgpSessions: router.bgpPeers?.length || 0,
      status: 'ACTIVE',
      project: this.getCurrentProject(),
      creationTimestamp: router.creationTimestamp,
      description: router.description,
      bgpPeers,
      natGateways,
      interfaces
    };
  }

  private extractNetworkName(networkUrl: string): string {
    if (!networkUrl) return 'default';
    const parts = networkUrl.split('/');
    return parts[parts.length - 1];
  }

  private extractRegionFromKey(regionKey: string): string {
    // regionKey format is usually "regions/region-name"
    const parts = regionKey.split('/');
    return parts[parts.length - 1];
  }

  private getInterconnectEncryption(router: any): string {
    // Check if router has encrypted connections
    const hasEncryptedConnections = router.interfaces?.some((intf: any) => 
      intf.interconnectAttachment && intf.interconnectAttachment.includes('encrypted')
    );
    return hasEncryptedConnections ? 'Encrypted' : 'Unencrypted';
  }

  private getInterconnectVpnGateway(router: any): string {
    // Look for VPN gateway connections
    const vpnTunnel = router.interfaces?.find((intf: any) => intf.vpnTunnel);
    if (vpnTunnel) {
      const parts = vpnTunnel.vpnTunnel.split('/');
      return parts[parts.length - 1].replace('-tunnel', '');
    }
    return 'None';
  }

  private getConnection(router: any): string {
    // Get connection name from interfaces
    const connection = router.interfaces?.find((intf: any) => 
      intf.vpnTunnel || intf.interconnectAttachment
    );
    
    if (connection?.vpnTunnel) {
      const parts = connection.vpnTunnel.split('/');
      return parts[parts.length - 1];
    }
    
    if (connection?.interconnectAttachment) {
      const parts = connection.interconnectAttachment.split('/');
      return parts[parts.length - 1];
    }
    
    return '';
  }

  private getMockRouters(): CloudRouter[] {
    return [
      {
        id: '7506832236912495280',
        name: 'shopping-cr',
        network: 'default',
        region: 'us-central1',
        interconnectEncryption: 'Unencrypted',
        cloudRouterASN: 64512,
        interconnectVpnGateway: 'shopping-vpn-1',
        connection: 'shopping-vpn-tunnel',
        bgpSessions: 1,
        status: 'ACTIVE',
        project: 'demo-project',
        creationTimestamp: '2018-06-27T04:26:23.174-07:00',
        description: 'Cloud Router for shopping site VPN'
      },
      {
        id: '7506832236912495281',
        name: 'shopping-eu-cr',
        network: 'default',
        region: 'europe-west1',
        interconnectEncryption: 'Unencrypted',
        cloudRouterASN: 64512,
        interconnectVpnGateway: 'None',
        connection: '',
        bgpSessions: 0,
        status: 'ACTIVE',
        project: 'demo-project',
        creationTimestamp: '2018-06-27T04:26:23.174-07:00',
        description: 'Cloud Router for Europe region'
      },
      {
        id: '7506832236912495282',
        name: 'production-cr',
        network: 'production-vpc',
        region: 'us-east1',
        interconnectEncryption: 'Encrypted',
        cloudRouterASN: 65001,
        interconnectVpnGateway: 'prod-vpn-gateway',
        connection: 'prod-interconnect-attachment',
        bgpSessions: 2,
        status: 'ACTIVE',
        project: 'demo-project',
        creationTimestamp: '2019-03-15T08:30:00.000-07:00',
        description: 'Production Cloud Router with encrypted interconnect'
      }
    ];
  }

  private getMockRouterDetails(routerName: string, region: string): CloudRouterDetails {
    const baseRouter = this.getMockRouters().find(r => r.name === routerName);
    
    if (!baseRouter) {
      // Return default if router not found
      return {
        id: '7506832236912495280',
        name: routerName,
        network: 'default',
        region: region,
        interconnectEncryption: 'Unencrypted',
        cloudRouterASN: 64512,
        interconnectVpnGateway: 'None',
        connection: '',
        bgpSessions: 0,
        status: 'ACTIVE',
        project: 'demo-project',
        creationTimestamp: '2018-06-27T04:26:23.174-07:00',
        description: 'Cloud Router details',
        bgpPeers: [],
        natGateways: [],
        interfaces: []
      };
    }
    
    // Enhanced BGP peer data based on router
    const bgpPeers: BgpPeer[] = [];
    const natGateways: NatGateway[] = [];
    const interfaces: RouterInterface[] = [];

    if (routerName === 'shopping-cr') {
      bgpPeers.push({
        name: 'bgp-shopping',
        interfaceName: 'if-tunnel-1',
        ipAddress: '169.254.1.1',
        peerAsn: 64513,
        peerIpAddress: '169.254.1.2',
        advertiseMode: 'DEFAULT',
        advertisedGroups: ['ALL_SUBNETS'],
        status: 'ESTABLISHED'
      });

      interfaces.push({
        name: 'if-tunnel-1',
        ipRange: '169.254.1.0/30',
        vpnTunnel: 'shopping-vpn-tunnel'
      });

      natGateways.push({
        name: 'kamil-remove',
        natIpAllocateOption: 'AUTO_ONLY',
        sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
        status: 'Running'
      });

      natGateways.push({
        name: 'us-nat',
        natIpAllocateOption: 'AUTO_ONLY',
        sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
        status: 'Running'
      });
    }

    return {
      ...baseRouter,
      region,
      bgpPeers,
      natGateways,
      interfaces
    };
  }

  private transformNetworksResponse(networks: any[]): NetworkOption[] {
    return networks.map(network => ({
      id: network.id,
      name: network.name,
      selfLink: network.selfLink,
      autoCreateSubnetworks: network.autoCreateSubnetworks,
      description: network.description
    }));
  }

  private transformRegionsResponse(regions: any[]): RegionOption[] {
    return regions.map(region => ({
      id: region.id,
      name: region.name,
      selfLink: region.selfLink,
      description: region.description,
      status: region.status
    }));
  }

  private getMockNetworks(): NetworkOption[] {
    return [
      {
        id: '1',
        name: 'default',
        selfLink: 'projects/demo-project/global/networks/default',
        autoCreateSubnetworks: true,
        description: 'Default network for the project'
      },
      {
        id: '2',
        name: 'production-vpc',
        selfLink: 'projects/demo-project/global/networks/production-vpc',
        autoCreateSubnetworks: false,
        description: 'Production VPC network'
      },
      {
        id: '3',
        name: 'staging-vpc',
        selfLink: 'projects/demo-project/global/networks/staging-vpc',
        autoCreateSubnetworks: false,
        description: 'Staging VPC network'
      }
    ];
  }

  private getMockRegions(): RegionOption[] {
    return [
      {
        id: '1',
        name: 'us-central1',
        selfLink: 'projects/demo-project/regions/us-central1',
        description: 'Iowa',
        status: 'UP'
      },
      {
        id: '2',
        name: 'us-east1',
        selfLink: 'projects/demo-project/regions/us-east1',
        description: 'South Carolina',
        status: 'UP'
      },
      {
        id: '3',
        name: 'europe-west1',
        selfLink: 'projects/demo-project/regions/europe-west1',
        description: 'Belgium',
        status: 'UP'
      },
      {
        id: '4',
        name: 'asia-east1',
        selfLink: 'projects/demo-project/regions/asia-east1',
        description: 'Taiwan',
        status: 'UP'
      }
    ];
  }
} 