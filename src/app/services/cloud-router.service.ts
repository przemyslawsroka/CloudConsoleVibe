import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
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
   * Get list of Cloud Routers from all regions
   */
  getCloudRouters(): Observable<CloudRouter[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockRouters());
    }

    const project = this.getCurrentProject();
    
    // First get all regions
    const regionsUrl = `${this.baseUrl}/projects/${project}/regions`;
    
    return this.http.get<any>(regionsUrl, { headers: this.getHeaders() }).pipe(
      mergeMap(regionsResponse => {
        const regions = regionsResponse.items || [];
        
        // Create requests for each region
        const routerRequests = regions.map((region: any) => {
          const regionName = region.name;
          const routersUrl = `${this.baseUrl}/projects/${project}/regions/${regionName}/routers`;
          
          return this.http.get<any>(routersUrl, { headers: this.getHeaders() }).pipe(
            map(routersResponse => this.transformRoutersResponse(routersResponse.items || [], regionName)),
            catchError(error => {
              console.warn(`Error fetching routers for region ${regionName}:`, error);
              return of([]);
            })
          );
        });

        return forkJoin(routerRequests as Observable<CloudRouter[]>[]).pipe(
          map((routerArrays: CloudRouter[][]) => routerArrays.flat())
        );
      }),
      catchError(error => {
        console.error('Error fetching Cloud Routers:', error);
        return of(this.getMockRouters());
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
        return of(this.getMockRouterDetails(routerName, region));
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
    const baseRouter = this.getMockRouters().find(r => r.name === routerName) || this.getMockRouters()[0];
    
    return {
      ...baseRouter,
      region,
      bgpPeers: [
        {
          name: 'bgp-peer-1',
          interfaceName: 'if-tunnel-1',
          ipAddress: '169.254.1.1',
          peerAsn: 65002,
          peerIpAddress: '169.254.1.2',
          advertiseMode: 'DEFAULT',
          advertisedGroups: ['ALL_SUBNETS'],
          status: 'ESTABLISHED'
        }
      ],
      natGateways: [
        {
          name: 'nat-gateway-1',
          natIpAllocateOption: 'AUTO_ONLY',
          sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
          status: 'ACTIVE'
        }
      ],
      interfaces: [
        {
          name: 'if-tunnel-1',
          ipRange: '169.254.1.0/30',
          vpnTunnel: 'shopping-vpn-tunnel'
        }
      ]
    };
  }
} 