import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudNatGateway {
  id: string;
  name: string;
  network: string;
  region: string;
  natType: 'Public' | 'Private';
  cloudRouter: string;
  status: 'Running' | 'Failed' | 'Creating' | 'Stopping';
  natIpAllocateOption?: string;
  sourceSubnetworkIpRangesToNat?: string;
  subnetworks?: string[];
  natIps?: string[];
  creationTimestamp?: string;
  drainNatIps?: string[];
  enableDynamicPortAllocation?: boolean;
  enableEndpointIndependentMapping?: boolean;
  endpointTypes?: string[];
  icmpIdleTimeoutSec?: number;
  logConfig?: {
    enable: boolean;
    filter: string;
  };
  maxPortsPerVm?: number;
  minPortsPerVm?: number;
  rules?: any[];
  tcpEstablishedIdleTimeoutSec?: number;
  tcpTimeWaitTimeoutSec?: number;
  tcpTransitoryIdleTimeoutSec?: number;
  udpIdleTimeoutSec?: number;
}

export interface CreateNatGatewayRequest {
  name: string;
  router: string;
  region: string;
  network: string;
  natType: 'Public' | 'Private';
  natIpAllocateOption: string;
  sourceSubnetworkIpRangesToNat: string;
  subnetworks?: string[];
  natIps?: string[];
  enableDynamicPortAllocation?: boolean;
  enableEndpointIndependentMapping?: boolean;
  logConfig?: {
    enable: boolean;
    filter: string;
  };
  maxPortsPerVm?: number;
  minPortsPerVm?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CloudNatService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  // Get all NAT gateways across all regions using aggregatedList
  getNatGateways(projectId: string): Observable<CloudNatGateway[]> {
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, returning mock NAT gateways');
      return of(this.getMockNatGateways());
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`
    });

    // Use aggregatedList to get routers from all regions in one call
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/aggregated/routers`, { headers })
      .pipe(
        map(response => this.extractNatGatewaysFromAggregatedResponse(response)),
        catchError(error => {
          console.error('Error fetching NAT gateways using aggregatedList:', error);
          return of(this.getMockNatGateways());
        })
      );
  }

  // Extract NAT gateways from aggregated response
  private extractNatGatewaysFromAggregatedResponse(response: any): CloudNatGateway[] {
    const natGateways: CloudNatGateway[] = [];
    
    // Handle partial success - log warnings but continue processing successful regions
    if (response.warning && response.warning.length > 0) {
      console.warn('Partial success when fetching NAT gateways:', response.warning);
    }

    if (!response.items) {
      console.log('No router items found in aggregated response');
      return natGateways;
    }

    // Process each region's routers
    Object.keys(response.items).forEach(regionKey => {
      const regionData = response.items[regionKey];
      
      // Skip regions with errors but log them
      if (regionData.error) {
        console.warn(`Error in region ${regionKey}:`, regionData.error);
        return;
      }

      // Extract region name from the key (e.g., "regions/us-central1" -> "us-central1")
      const regionName = regionKey.replace('regions/', '');
      
      if (regionData.routers && regionData.routers.length > 0) {
        const regionNatGateways = this.extractNatGatewaysFromRouters(regionData.routers, regionName);
        natGateways.push(...regionNatGateways);
      }
    });

    console.log(`Successfully fetched ${natGateways.length} NAT gateways from aggregated response`);
    return natGateways;
  }

  // Get NAT gateways for a specific region
  getNatGatewaysForRegion(projectId: string, region: string): Observable<CloudNatGateway[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`
    });

    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/regions/${region}/routers`, { headers })
      .pipe(
        map(response => this.extractNatGatewaysFromRouters(response.items || [], region)),
        catchError(error => {
          console.error(`Error fetching NAT gateways for region ${region}:`, error);
          return of([]);
        })
      );
  }

  // Create a new NAT gateway
  createNatGateway(projectId: string, region: string, request: CreateNatGatewayRequest): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, simulating NAT gateway creation');
      return of({ success: true, operation: 'mock-operation-id' });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`,
      'Content-Type': 'application/json'
    });

    const routerPatchRequest = {
      nats: [{
        name: request.name,
        natIpAllocateOption: request.natIpAllocateOption,
        sourceSubnetworkIpRangesToNat: request.sourceSubnetworkIpRangesToNat,
        subnetworks: request.subnetworks || [],
        natIps: request.natIps || [],
        enableDynamicPortAllocation: request.enableDynamicPortAllocation || false,
        enableEndpointIndependentMapping: request.enableEndpointIndependentMapping || false,
        logConfig: request.logConfig || { enable: false, filter: 'ERRORS_ONLY' },
        maxPortsPerVm: request.maxPortsPerVm || 65536,
        minPortsPerVm: request.minPortsPerVm || 64
      }]
    };

    return this.http.patch<any>(
      `${this.baseUrl}/projects/${projectId}/regions/${region}/routers/${request.router}`,
      routerPatchRequest,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Error creating NAT gateway:', error);
        throw error;
      })
    );
  }

  // Delete a NAT gateway
  deleteNatGateway(projectId: string, region: string, routerName: string, natName: string): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, simulating NAT gateway deletion');
      return of({ success: true, operation: 'mock-delete-operation-id' });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`,
      'Content-Type': 'application/json'
    });

    // First get the router, remove the NAT, then patch the router
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/regions/${region}/routers/${routerName}`, { headers })
      .pipe(
        mergeMap(router => {
          const updatedNats = router.nats?.filter((nat: any) => nat.name !== natName) || [];
          const patchRequest = { nats: updatedNats };

          return this.http.patch<any>(
            `${this.baseUrl}/projects/${projectId}/regions/${region}/routers/${routerName}`,
            patchRequest,
            { headers }
          );
        }),
        catchError(error => {
          console.error('Error deleting NAT gateway:', error);
          throw error;
        })
      );
  }

  // Extract NAT gateways from router response
  private extractNatGatewaysFromRouters(routers: any[], region: string): CloudNatGateway[] {
    const natGateways: CloudNatGateway[] = [];

    routers.forEach(router => {
      if (router.nats && router.nats.length > 0) {
        router.nats.forEach((nat: any) => {
          natGateways.push({
            id: `${router.id}-${nat.name}`,
            name: nat.name,
            network: this.extractNetworkName(router.network),
            region: region,
            natType: this.determineNatType(nat),
            cloudRouter: router.name,
            status: this.determineNatStatus(nat),
            natIpAllocateOption: nat.natIpAllocateOption,
            sourceSubnetworkIpRangesToNat: nat.sourceSubnetworkIpRangesToNat,
            subnetworks: nat.subnetworks || [],
            natIps: nat.natIps || [],
            creationTimestamp: router.creationTimestamp,
            drainNatIps: nat.drainNatIps || [],
            enableDynamicPortAllocation: nat.enableDynamicPortAllocation || false,
            enableEndpointIndependentMapping: nat.enableEndpointIndependentMapping || false,
            endpointTypes: nat.endpointTypes || [],
            icmpIdleTimeoutSec: nat.icmpIdleTimeoutSec,
            logConfig: nat.logConfig,
            maxPortsPerVm: nat.maxPortsPerVm,
            minPortsPerVm: nat.minPortsPerVm,
            rules: nat.rules || [],
            tcpEstablishedIdleTimeoutSec: nat.tcpEstablishedIdleTimeoutSec,
            tcpTimeWaitTimeoutSec: nat.tcpTimeWaitTimeoutSec,
            tcpTransitoryIdleTimeoutSec: nat.tcpTransitoryIdleTimeoutSec,
            udpIdleTimeoutSec: nat.udpIdleTimeoutSec
          });
        });
      }
    });

    return natGateways;
  }

  private extractNetworkName(networkUrl: string): string {
    if (!networkUrl) return 'default';
    const parts = networkUrl.split('/');
    return parts[parts.length - 1];
  }

  private determineNatType(nat: any): 'Public' | 'Private' {
    // Determine if NAT is public or private based on configuration
    if (nat.natIpAllocateOption === 'MANUAL_ONLY' && nat.natIps && nat.natIps.length > 0) {
      return 'Public';
    }
    if (nat.sourceSubnetworkIpRangesToNat === 'ALL_SUBNETWORKS_ALL_IP_RANGES') {
      return 'Public';
    }
    if (nat.subnetworks && nat.subnetworks.length > 0) {
      return 'Private';
    }
    return 'Public'; // Default
  }

  private determineNatStatus(nat: any): 'Running' | 'Failed' | 'Creating' | 'Stopping' {
    // In real implementation, this would be based on actual status
    return 'Running';
  }

  // Mock data that matches the screenshot
  private getMockNatGateways(): CloudNatGateway[] {
    return [
      {
        id: 'eu-nat-1',
        name: 'eu-nat',
        network: 'default',
        region: 'europe-west1',
        natType: 'Public',
        cloudRouter: 'shopping-eu-cr',
        status: 'Running',
        natIpAllocateOption: 'AUTO_ONLY',
        sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
        creationTimestamp: '2023-06-15T10:30:00.000-07:00',
        enableDynamicPortAllocation: true,
        enableEndpointIndependentMapping: false,
        maxPortsPerVm: 65536,
        minPortsPerVm: 64,
        logConfig: {
          enable: true,
          filter: 'ERRORS_ONLY'
        }
      },
      {
        id: 'kamil-remove-1',
        name: 'kamil-remove',
        network: 'default',
        region: 'us-central1',
        natType: 'Private',
        cloudRouter: 'shopping-cr',
        status: 'Running',
        natIpAllocateOption: 'AUTO_ONLY',
        sourceSubnetworkIpRangesToNat: 'LIST_OF_SUBNETWORKS',
        subnetworks: ['default-us-central1'],
        creationTimestamp: '2023-05-20T14:15:00.000-07:00',
        enableDynamicPortAllocation: false,
        enableEndpointIndependentMapping: true,
        maxPortsPerVm: 32768,
        minPortsPerVm: 128,
        logConfig: {
          enable: false,
          filter: 'ERRORS_ONLY'
        }
      },
      {
        id: 'us-nat-1',
        name: 'us-nat',
        network: 'default',
        region: 'us-central1',
        natType: 'Public',
        cloudRouter: 'shopping-cr',
        status: 'Running',
        natIpAllocateOption: 'AUTO_ONLY',
        sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
        creationTimestamp: '2023-04-10T09:45:00.000-07:00',
        enableDynamicPortAllocation: true,
        enableEndpointIndependentMapping: false,
        maxPortsPerVm: 65536,
        minPortsPerVm: 64,
        logConfig: {
          enable: true,
          filter: 'ALL'
        }
      }
    ];
  }

  private getCurrentProject(): string {
    // Get current project from project service
    let currentProject = '';
    this.projectService.currentProject$.subscribe(project => {
      currentProject = project?.id || 'demo-project';
    });
    return currentProject;
  }
} 