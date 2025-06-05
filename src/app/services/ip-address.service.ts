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
    if (!projectId || projectId === 'mock-project') {
      // Return mock data if no project ID
      return this.getMockData();
    }

    // Fetch both global and regional addresses, plus instance IPs
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
        return this.getMockData();
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
    // First get list of regions
    const regionsUrl = `${this.baseUrl}/projects/${projectId}/regions`;
    return this.http.get<{ items: Array<{ name: string }> }>(regionsUrl, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      switchMap(regions => {
        if (regions.length === 0) return of([]);
        const requests = regions.map(region => this.getRegionAddresses(projectId, region.name));
        return forkJoin(requests).pipe(
          map(addressArrays => addressArrays.reduce((acc, addresses) => acc.concat(addresses), []))
        );
      }),
      catchError(error => {
        console.error('Error fetching regional addresses:', error);
        return of([]);
      })
    );
  }

  private getRegionAddresses(projectId: string, region: string): Observable<IpAddress[]> {
    const url = `${this.baseUrl}/projects/${projectId}/regions/${region}/addresses`;
    return this.http.get<{ items: GcpAddress[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => (response.items || []).map(addr => this.convertGcpAddress(addr, region))),
      catchError(error => {
        console.warn(`Error fetching addresses for region ${region}:`, error);
        return of([]);
      })
    );
  }

  private getInstanceIPs(projectId: string): Observable<IpAddress[]> {
    // Get all zones first
    const zonesUrl = `${this.baseUrl}/projects/${projectId}/zones`;
    return this.http.get<{ items: Array<{ name: string }> }>(zonesUrl, { headers: this.getHeaders() }).pipe(
      map(response => response.items || []),
      switchMap(zones => {
        if (zones.length === 0) return of([]);
        const requests = zones.map(zone => this.getZoneInstances(projectId, zone.name));
        return forkJoin(requests).pipe(
          map(instanceArrays => instanceArrays.reduce((acc, instances) => acc.concat(instances), [])),
          map(instances => this.extractInstanceIPs(instances))
        );
      }),
      catchError(error => {
        console.error('Error fetching instance IPs:', error);
        return of([]);
      })
    );
  }

  private getZoneInstances(projectId: string, zone: string): Observable<GcpInstance[]> {
    const url = `${this.baseUrl}/projects/${projectId}/zones/${zone}/instances`;
    return this.http.get<{ items: GcpInstance[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => (response.items || []).map(instance => ({ ...instance, zone }))),
      catchError(error => {
        console.warn(`Error fetching instances for zone ${zone}:`, error);
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

  reserveExternalStaticIp(projectId: string, data: any): Observable<IpAddress> {
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
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = ipAddress.region ? 
      `${this.baseUrl}/projects/${projectId}/regions/${ipAddress.region}/addresses/${ipAddress.name}` :
      `${this.baseUrl}/projects/${projectId}/global/addresses/${ipAddress.name}`;

    return this.http.delete(url, { headers: this.getHeaders() });
  }
} 