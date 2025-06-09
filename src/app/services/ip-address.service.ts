import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface IpAddress {
  name?: string;
  address: string;
  accessType: 'External' | 'Internal';
  region: string;
  type: 'Static' | 'Ephemeral';
  version: 'IPv4' | 'IPv6';
  inUseBy?: string;
  subnetwork?: string;
  vpcNetwork?: string;
  id: string;
}

interface GcpAddress {
  id: string;
  name: string;
  address: string;
  addressType: string;
  region?: string;
  status: string;
  users?: string[];
  subnetwork?: string;
  network?: string;
  selfLink: string;
  ipVersion?: string;
}

interface GcpInstance {
  id: string;
  name: string;
  zone: string;
  networkInterfaces: Array<{
    networkIP: string;
    accessConfigs?: Array<{
      natIP: string;
      type: string;
    }>;
    subnetwork: string;
    network: string;
  }>;
}

/**
 * Service for managing IP addresses across Google Cloud Platform.
 * 
 * This service efficiently fetches IP addresses using Google Cloud Compute Engine's
 * aggregatedList API calls to minimize the number of requests:
 * - Global addresses: Single API call
 * - Regional addresses: aggregatedList across all regions  
 * - Instance IPs: aggregatedList across all zones
 * 
 * This approach is significantly more efficient than making individual API calls 
 * per region or zone, especially for projects with many regions/zones.
 */
@Injectable({
  providedIn: 'root'
})
export class IpAddressService {
  private baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getIpAddresses(projectId: string): Observable<IpAddress[]> {
    // Return enhanced mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getDemoMockData();
    }

    if (!projectId || projectId === 'mock-project') {
      // Return mock data if no project ID
      return this.getMockData();
    }

    // Fetch addresses using aggregatedList API calls for better efficiency:
    // - Global addresses (single call)
    // - Regional addresses (aggregatedList across all regions)
    // - Instance IPs (aggregatedList across all zones)
    const globalAddresses$ = this.getGlobalAddresses(projectId);
    const regionalAddresses$ = this.getRegionalAddresses(projectId);
    const instanceIps$ = this.getInstanceIPs(projectId);

    return forkJoin([globalAddresses$, regionalAddresses$, instanceIps$]).pipe(
      map(([globalAddresses, regionalAddresses, instanceIps]) => {
        const allAddresses = [...globalAddresses, ...regionalAddresses, ...instanceIps];
        return allAddresses.sort((a, b) => a.address.localeCompare(b.address));
      }),
      catchError(error => {
        console.error('Error fetching IP addresses from API:', error);
        // Fallback to mock data on error
        return this.getDemoMockData();
      })
    );
  }

  private getGlobalAddresses(projectId: string): Observable<IpAddress[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/addresses`;
    return this.http.get<{ items: GcpAddress[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => (response.items || []).map(addr => this.convertGcpAddress(addr, 'global'))),
      catchError(error => {
        console.error('Error fetching global addresses:', error);
        return of([]);
      })
    );
  }

  private getRegionalAddresses(projectId: string): Observable<IpAddress[]> {
    // Use aggregatedList to get addresses from all regions in one call
    const url = `${this.baseUrl}/projects/${projectId}/aggregated/addresses`;
    return this.http.get<{ items: { [key: string]: { addresses?: GcpAddress[], warning?: any } }, warning?: any }>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const allAddresses: IpAddress[] = [];
        
        // Handle partial success - log warnings but continue processing successful regions
        if (response.warning && response.warning.length > 0) {
          console.warn('Partial success when fetching regional addresses:', response.warning);
        }

        if (!response.items) {
          console.log('No address items found in aggregated response');
          return allAddresses;
        }

        // Process each region's addresses
        Object.keys(response.items).forEach(regionKey => {
          const regionData = response.items[regionKey];
          
          // Skip regions with errors but log them
          if (regionData.warning) {
            const warnings = Array.isArray(regionData.warning) ? regionData.warning : [regionData.warning];
            warnings.forEach((warning: any) => {
              // Only log warnings that are not "no results" messages
              if (warning.message && !warning.message.includes('No results for the scope')) {
                console.warn(`Warning for region ${regionKey}:`, warning.message);
              }
            });
          }

          // Extract region name from the key (e.g., "regions/us-central1" -> "us-central1")
          const regionName = regionKey.replace('regions/', '');
          
          if (regionData.addresses && regionData.addresses.length > 0) {
            const regionAddresses = regionData.addresses.map(addr => this.convertGcpAddress(addr, regionName));
            allAddresses.push(...regionAddresses);
          }
        });

        console.log(`Successfully fetched ${allAddresses.length} regional addresses from aggregated response`);
        return allAddresses;
      }),
      catchError(error => {
        console.error('Error fetching regional addresses using aggregatedList:', error);
        return of([]);
      })
    );
  }

  private getInstanceIPs(projectId: string): Observable<IpAddress[]> {
    // Use aggregatedList to get instances from all zones in one call
    const url = `${this.baseUrl}/projects/${projectId}/aggregated/instances`;
    return this.http.get<{ items: { [key: string]: { instances?: GcpInstance[], warning?: any } }, warning?: any }>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const allInstances: GcpInstance[] = [];
        
        // Handle partial success - log warnings but continue processing successful zones
        if (response.warning && response.warning.length > 0) {
          console.warn('Partial success when fetching instances:', response.warning);
        }

        if (!response.items) {
          console.log('No instance items found in aggregated response');
          return [];
        }

        // Process each zone's instances
        Object.keys(response.items).forEach(zoneKey => {
          const zoneData = response.items[zoneKey];
          
          // Skip zones with errors but log them
          if (zoneData.warning) {
            const warnings = Array.isArray(zoneData.warning) ? zoneData.warning : [zoneData.warning];
            warnings.forEach((warning: any) => {
              // Only log warnings that are not "no results" messages
              if (warning.message && !warning.message.includes('No results for the scope')) {
                console.warn(`Warning for zone ${zoneKey}:`, warning.message);
              }
            });
          }

          // Extract zone name from the key (e.g., "zones/us-central1-a" -> "us-central1-a")
          const zoneName = zoneKey.replace('zones/', '');
          
          if (zoneData.instances && zoneData.instances.length > 0) {
            // Add zone information to each instance for IP extraction
            const zoneInstances = zoneData.instances.map(instance => ({
              ...instance,
              zone: zoneName
            }));
            allInstances.push(...zoneInstances);
          }
        });

        console.log(`Successfully fetched ${allInstances.length} instances from aggregated response`);
        return this.extractInstanceIPs(allInstances);
      }),
      catchError(error => {
        console.error('Error fetching instance IPs using aggregatedList:', error);
        return of([]);
      })
    );
  }

  private extractInstanceIPs(instances: GcpInstance[]): IpAddress[] {
    const ips: IpAddress[] = [];
    
    instances.forEach(instance => {
      instance.networkInterfaces?.forEach(ni => {
        // Internal IP
        if (ni.networkIP) {
          ips.push({
            id: `${instance.id}-internal-${ni.networkIP}`,
            address: ni.networkIP,
            accessType: 'Internal',
            region: this.extractRegionFromZone(instance.zone),
            type: 'Ephemeral',
            version: 'IPv4',
            inUseBy: `VM instance ${instance.name} (Zone ${instance.zone})`,
            subnetwork: this.extractResourceName(ni.subnetwork),
            vpcNetwork: this.extractResourceName(ni.network)
          });
        }

        // External IPs
        ni.accessConfigs?.forEach(config => {
          if (config.natIP) {
            ips.push({
              id: `${instance.id}-external-${config.natIP}`,
              address: config.natIP,
              accessType: 'External',
              region: this.extractRegionFromZone(instance.zone),
              type: 'Ephemeral',
              version: 'IPv4',
              inUseBy: `VM instance ${instance.name} (Zone ${instance.zone})`,
              subnetwork: this.extractResourceName(ni.subnetwork),
              vpcNetwork: this.extractResourceName(ni.network)
            });
          }
        });
      });
    });

    return ips;
  }

  private convertGcpAddress(gcpAddr: GcpAddress, region: string): IpAddress {
    const inUseBy = gcpAddr.users && gcpAddr.users.length > 0 ? 
      gcpAddr.users.map(user => this.extractResourceName(user)).join(', ') : 
      undefined;

    return {
      id: gcpAddr.id,
      name: gcpAddr.name,
      address: gcpAddr.address,
      accessType: gcpAddr.addressType === 'INTERNAL' ? 'Internal' : 'External',
      region: region === 'global' ? '' : region,
      type: 'Static',
      version: gcpAddr.ipVersion === 'IPV6' ? 'IPv6' : 'IPv4',
      inUseBy,
      subnetwork: gcpAddr.subnetwork ? this.extractResourceName(gcpAddr.subnetwork) : undefined,
      vpcNetwork: gcpAddr.network ? this.extractResourceName(gcpAddr.network) : undefined
    };
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }

  private extractRegionFromZone(zone: string): string {
    // Zone format: projects/PROJECT/zones/ZONE-NAME
    // or just ZONE-NAME
    const zoneName = this.extractResourceName(zone);
    // Extract region from zone name (e.g., us-central1-a -> us-central1)
    const parts = zoneName.split('-');
    if (parts.length >= 3) {
      return parts.slice(0, -1).join('-');
    }
    return zoneName;
  }

  private getMockData(): Observable<IpAddress[]> {
    const mockData: IpAddress[] = [
      {
        id: '1',
        name: 'ip1',
        address: '34.132.159.109',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: undefined
      },
      {
        id: '2',
        name: 'ip2',
        address: '34.71.131.42',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: undefined
      },
      {
        id: '3',
        address: '10.128.0.2',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance przemeksroka-instance-20240521-141207 (Zone us-central1-a)',
        subnetwork: 'przemeksroka-test',
        vpcNetwork: 'przemeksroka-test'
      },
      {
        id: '4',
        address: '10.128.0.3',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance przemeksroka-onprem-vm-test (Zone us-central1-f)',
        subnetwork: 'przemeksroka-test',
        vpcNetwork: 'przemeksroka-test'
      },
      {
        id: '5',
        address: '34.69.191.202',
        accessType: 'External',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance przemeksroka-onprem-vm-test (Zone us-central1-f)',
        subnetwork: 'przemeksroka-test',
        vpcNetwork: 'przemeksroka-test'
      },
      {
        id: '6',
        address: '35.241.59.73',
        accessType: 'External',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'Forwarding rule lb-frontend',
        region: ''
      }
    ];

    return of(mockData);
  }

  private getDemoMockData(): Observable<IpAddress[]> {
    const demoData: IpAddress[] = [
      // External Static IPs
      {
        id: '1',
        name: 'prod-load-balancer-ip',
        address: '34.132.159.109',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: 'Load balancer prod-lb-frontend'
      },
      {
        id: '2',
        name: 'prod-web-service-ip',
        address: '34.71.131.42',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: 'Forwarding rule web-service-frontend'
      },
      {
        id: '3',
        name: 'staging-app-ip',
        address: '35.241.59.73',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: 'VM instance staging-app-server'
      },
      {
        id: '4',
        name: 'dev-test-ip',
        address: '35.208.158.96',
        accessType: 'External',
        region: 'us-west1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: undefined
      },
      // Production VPC Internal IPs
      {
        id: '5',
        address: '10.0.1.10',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance prod-web-server-01 (Zone us-central1-a)',
        subnetwork: 'prod-us-central1',
        vpcNetwork: 'production-vpc'
      },
      {
        id: '6',
        address: '10.0.1.11',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance prod-web-server-02 (Zone us-central1-b)',
        subnetwork: 'prod-us-central1',
        vpcNetwork: 'production-vpc'
      },
      {
        id: '7',
        address: '10.0.2.20',
        accessType: 'Internal',
        region: 'us-east1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance prod-db-server-01 (Zone us-east1-a)',
        subnetwork: 'prod-us-east1',
        vpcNetwork: 'production-vpc'
      },
      {
        id: '8',
        name: 'prod-db-static-ip',
        address: '10.0.2.100',
        accessType: 'Internal',
        region: 'us-east1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: 'Cloud SQL instance prod-database',
        subnetwork: 'prod-us-east1',
        vpcNetwork: 'production-vpc'
      },
      // Development VPC Internal IPs
      {
        id: '9',
        address: '10.1.0.10',
        accessType: 'Internal',
        region: 'us-west1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance dev-web-server (Zone us-west1-a)',
        subnetwork: 'dev-us-west1',
        vpcNetwork: 'development-vpc'
      },
      {
        id: '10',
        address: '10.1.0.20',
        accessType: 'Internal',
        region: 'us-west1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance dev-api-server (Zone us-west1-b)',
        subnetwork: 'dev-us-west1',
        vpcNetwork: 'development-vpc'
      },
      // Staging VPC Internal IPs
      {
        id: '11',
        address: '10.2.0.15',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Ephemeral',
        version: 'IPv4',
        inUseBy: 'VM instance staging-app-server (Zone us-central1-c)',
        subnetwork: 'staging-us-central1',
        vpcNetwork: 'staging-vpc'
      },
      {
        id: '12',
        name: 'staging-lb-internal-ip',
        address: '10.2.0.50',
        accessType: 'Internal',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: 'Internal load balancer staging-internal-lb',
        subnetwork: 'staging-us-central1',
        vpcNetwork: 'staging-vpc'
      },
      // IPv6 addresses
      {
        id: '13',
        name: 'prod-ipv6-external',
        address: '2001:db8:85a3::8a2e:370:7334',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv6',
        inUseBy: 'VM instance prod-ipv6-server'
      },
      // Unused/Available IPs
      {
        id: '14',
        name: 'reserved-backup-ip',
        address: '34.123.45.67',
        accessType: 'External',
        region: 'us-central1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: undefined
      },
      {
        id: '15',
        name: 'future-expansion-ip',
        address: '35.199.88.123',
        accessType: 'External',
        region: 'us-east1',
        type: 'Static',
        version: 'IPv4',
        inUseBy: undefined
      }
    ];

    console.log('🎭 Serving enhanced demo IP addresses');
    return of(demoData);
  }

  reserveExternalStaticIp(projectId: string, data: any): Observable<IpAddress> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating external static IP reservation');
      const newIp: IpAddress = {
        id: Date.now().toString(),
        name: data.name,
        address: `34.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        accessType: 'External',
        region: data.region,
        type: 'Static',
        version: 'IPv4'
      };
      return of(newIp);
    }

    if (!projectId || projectId === 'mock-project') {
      // Mock implementation
      const newIp: IpAddress = {
        id: Date.now().toString(),
        name: data.name,
        address: `34.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        accessType: 'External',
        region: data.region,
        type: 'Static',
        version: 'IPv4'
      };
      return of(newIp);
    }

    const url = data.region ? 
      `${this.baseUrl}/projects/${projectId}/regions/${data.region}/addresses` :
      `${this.baseUrl}/projects/${projectId}/global/addresses`;

    const payload = {
      name: data.name,
      addressType: 'EXTERNAL',
      description: data.description
    };

    return this.http.post<GcpAddress>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.convertGcpAddress(response, data.region || 'global'))
    );
  }

  reserveInternalStaticIp(projectId: string, data: any): Observable<IpAddress> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating internal static IP reservation');
      const newIp: IpAddress = {
        id: Date.now().toString(),
        name: data.name,
        address: `10.${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        accessType: 'Internal',
        region: data.region,
        type: 'Static',
        version: 'IPv4',
        subnetwork: data.subnetwork,
        vpcNetwork: data.vpcNetwork
      };
      return of(newIp);
    }

    if (!projectId || projectId === 'mock-project') {
      // Mock implementation
      const newIp: IpAddress = {
        id: Date.now().toString(),
        name: data.name,
        address: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        accessType: 'Internal',
        region: data.region,
        type: 'Static',
        version: 'IPv4',
        subnetwork: data.subnetwork,
        vpcNetwork: data.vpcNetwork
      };
      return of(newIp);
    }

    const url = `${this.baseUrl}/projects/${projectId}/regions/${data.region}/addresses`;
    
    const payload = {
      name: data.name,
      addressType: 'INTERNAL',
      subnetwork: data.subnetwork,
      description: data.description,
      ...(data.address && { address: data.address })
    };

    return this.http.post<GcpAddress>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => this.convertGcpAddress(response, data.region))
    );
  }

  releaseStaticIp(projectId: string, ipAddress: IpAddress): Observable<any> {
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating static IP release');
      return of({ success: true });
    }

    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = ipAddress.region ? 
      `${this.baseUrl}/projects/${projectId}/regions/${ipAddress.region}/addresses/${ipAddress.name}` :
      `${this.baseUrl}/projects/${projectId}/global/addresses/${ipAddress.name}`;

    return this.http.delete(url, { headers: this.getHeaders() });
  }
} 