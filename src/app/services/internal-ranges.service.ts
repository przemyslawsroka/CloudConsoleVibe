import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface InternalRange {
  id: string;
  name: string;
  ipRange: string;
  ipVersion: 'IPv4' | 'IPv6';
  status: 'In use' | 'Not in use';
  immutable: boolean;
  vpcNetwork: string;
  usage: 'For VPC' | 'External to VPC';
  peering: string;
  labels: { [key: string]: string };
  region?: string;
  selfLink: string;
  creationTimestamp: string;
  description?: string;
}

interface GcpInternalRange {
  id: string;
  name: string;
  ipCidrRange: string;
  network?: string;
  purpose?: string;
  region?: string;
  selfLink: string;
  status?: string;
  users?: string[];
  creationTimestamp: string;
  description?: string;
  labels?: { [key: string]: string };
  ipVersion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InternalRangesService {
  private readonly baseUrl = 'https://compute.googleapis.com/compute/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getInternalRanges(): Observable<InternalRange[]> {
    if (this.authService.isDemoMode()) {
      return this.getMockInternalRanges();
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject?.id) {
      return this.getMockInternalRanges();
    }

    const projectId = currentProject.id;
    
    // Fetch global and regional internal address ranges
    const globalRanges$ = this.getGlobalInternalRanges(projectId);
    const regionalRanges$ = this.getRegionalInternalRanges(projectId);

    return forkJoin([globalRanges$, regionalRanges$]).pipe(
      map(([globalRanges, regionalRanges]) => {
        const allRanges = [...globalRanges, ...regionalRanges];
        return allRanges.sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error fetching internal ranges from API:', error);
        return this.getMockInternalRanges();
      })
    );
  }

  private getGlobalInternalRanges(projectId: string): Observable<InternalRange[]> {
    const url = `${this.baseUrl}/projects/${projectId}/global/addresses`;
    return this.http.get<{ items: GcpInternalRange[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const addresses = response.items || [];
        // Filter for internal addresses only
        const internalAddresses = addresses.filter(addr => 
          addr.purpose === 'VPC_PEERING' || 
          (addr.ipCidrRange && this.isInternalIPRange(addr.ipCidrRange))
        );
        return internalAddresses.map(addr => this.convertGcpRangeToInternalRange(addr, 'global'));
      }),
      catchError(error => {
        console.error('Error fetching global internal ranges:', error);
        return of([]);
      })
    );
  }

  private getRegionalInternalRanges(projectId: string): Observable<InternalRange[]> {
    const url = `${this.baseUrl}/projects/${projectId}/aggregated/addresses`;
    return this.http.get<{ items: { [key: string]: { addresses?: GcpInternalRange[] } } }>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const allRanges: InternalRange[] = [];
        
        if (!response.items) {
          return allRanges;
        }

        Object.keys(response.items).forEach(regionKey => {
          const regionData = response.items[regionKey];
          const regionName = regionKey.replace('regions/', '');
          
          if (regionData.addresses && regionData.addresses.length > 0) {
            // Filter for internal addresses only
            const internalAddresses = regionData.addresses.filter(addr => 
              addr.purpose === 'VPC_PEERING' || 
              (addr.ipCidrRange && this.isInternalIPRange(addr.ipCidrRange))
            );
            const regionRanges = internalAddresses.map(addr => this.convertGcpRangeToInternalRange(addr, regionName));
            allRanges.push(...regionRanges);
          }
        });

        return allRanges;
      }),
      catchError(error => {
        console.error('Error fetching regional internal ranges:', error);
        return of([]);
      })
    );
  }

  private convertGcpRangeToInternalRange(gcpRange: GcpInternalRange, region: string): InternalRange {
    const isInUse = gcpRange.users && gcpRange.users.length > 0;
    const vpcNetwork = gcpRange.network ? this.extractNetworkName(gcpRange.network) : 'default';
    
    return {
      id: gcpRange.id,
      name: gcpRange.name,
      ipRange: gcpRange.ipCidrRange || '',
      ipVersion: gcpRange.ipVersion === 'IPV6' ? 'IPv6' : 'IPv4',
      status: isInUse ? 'In use' : 'Not in use',
      immutable: gcpRange.purpose === 'VPC_PEERING',
      vpcNetwork: vpcNetwork,
      usage: gcpRange.purpose === 'VPC_PEERING' ? 'External to VPC' : 'For VPC',
      peering: 'For self',
      labels: gcpRange.labels || {},
      region: region === 'global' ? undefined : region,
      selfLink: gcpRange.selfLink,
      creationTimestamp: gcpRange.creationTimestamp,
      description: gcpRange.description
    };
  }

  private extractNetworkName(networkUrl: string): string {
    if (!networkUrl) return 'default';
    const parts = networkUrl.split('/');
    return parts[parts.length - 1];
  }

  private isInternalIPRange(ipCidr: string): boolean {
    if (!ipCidr) return false;
    
    // Check for RFC 1918 private IP ranges
    const ip = ipCidr.split('/')[0];
    const octets = ip.split('.').map(Number);
    
    // 10.0.0.0/8
    if (octets[0] === 10) return true;
    
    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true;
    
    // Google Cloud specific ranges (169.254.0.0/16)
    if (octets[0] === 169 && octets[1] === 254) return true;
    
    return false;
  }

  private getMockInternalRanges(): Observable<InternalRange[]> {
    const mockRanges: InternalRange[] = [
      {
        id: '1234567890123456789',
        name: 'dorian-range-test1',
        ipRange: '10.10.0.0/23',
        ipVersion: 'IPv4',
        status: 'In use',
        immutable: false,
        vpcNetwork: 'dorianvetra-test',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/dorian-range-test1',
        creationTimestamp: '2024-01-15T10:30:00.000-08:00'
      },
      {
        id: '2234567890123456789',
        name: 'dorian-test-range4',
        ipRange: '10.30.0.0/16',
        ipVersion: 'IPv4',
        status: 'In use',
        immutable: false,
        vpcNetwork: 'dorianvetra test',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/dorian-test-range4',
        creationTimestamp: '2024-01-16T14:20:00.000-08:00'
      },
      {
        id: '3234567890123456789',
        name: 'efengler-deleteme',
        ipRange: '172.24.0.0/14',
        ipVersion: 'IPv4',
        status: 'Not in use',
        immutable: false,
        vpcNetwork: 'doledzki-net',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/efengler-deleteme',
        creationTimestamp: '2024-01-17T09:15:00.000-08:00'
      },
      {
        id: '4234567890123456789',
        name: 'efengler-deleteme2',
        ipRange: '10.64.0.0/10',
        ipVersion: 'IPv4',
        status: 'Not in use',
        immutable: false,
        vpcNetwork: 'doledzki-net',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/efengler-deleteme2',
        creationTimestamp: '2024-01-18T16:45:00.000-08:00'
      },
      {
        id: '5234567890123456789',
        name: 'faha-test-immutable-1',
        ipRange: '10.138.155.0/24',
        ipVersion: 'IPv4',
        status: 'Not in use',
        immutable: true,
        vpcNetwork: 'default',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/faha-test-immutable-1',
        creationTimestamp: '2024-01-19T11:30:00.000-08:00'
      },
      {
        id: '6234567890123456789',
        name: 'faha-test-immutable-2',
        ipRange: '10.61.155.0/24',
        ipVersion: 'IPv4',
        status: 'In use',
        immutable: false,
        vpcNetwork: 'default',
        usage: 'For VPC',
        peering: 'For self',
        labels: {},
        selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/faha-test-immutable-2',
        creationTimestamp: '2024-01-20T13:20:00.000-08:00'
      }
    ];

    return of(mockRanges);
  }

  /**
   * Reserve a new internal IP range
   */
  reserveInternalRange(rangeConfig: Partial<InternalRange>): Observable<InternalRange> {
    if (this.authService.isDemoMode()) {
      // Return mock created range
      const mockRange: InternalRange = {
        id: Date.now().toString(),
        name: rangeConfig.name || 'new-range',
        ipRange: rangeConfig.ipRange || '10.0.0.0/24',
        ipVersion: rangeConfig.ipVersion || 'IPv4',
        status: 'Not in use',
        immutable: false,
        vpcNetwork: rangeConfig.vpcNetwork || 'default',
        usage: 'For VPC',
        peering: 'For self',
        labels: rangeConfig.labels || {},
        selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/global/addresses/${rangeConfig.name}`,
        creationTimestamp: new Date().toISOString(),
        description: rangeConfig.description
      };
      return of(mockRange);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject?.id) {
      throw new Error('No project selected');
    }

    const url = `${this.baseUrl}/projects/${currentProject.id}/global/addresses`;
    const requestBody = {
      name: rangeConfig.name,
      ipCidrRange: rangeConfig.ipRange,
      purpose: 'VPC_PEERING',
      network: rangeConfig.vpcNetwork ? `global/networks/${rangeConfig.vpcNetwork}` : undefined,
      description: rangeConfig.description,
      labels: rangeConfig.labels
    };

    return this.http.post<any>(url, requestBody, { headers: this.getHeaders() }).pipe(
      map(() => {
        // Return the created range (simplified for demo)
        const createdRange: InternalRange = {
          id: Date.now().toString(),
          name: rangeConfig.name || 'new-range',
          ipRange: rangeConfig.ipRange || '',
          ipVersion: rangeConfig.ipVersion || 'IPv4',
          status: 'Not in use',
          immutable: false,
          vpcNetwork: rangeConfig.vpcNetwork || 'default',
          usage: 'For VPC',
          peering: 'For self',
          labels: rangeConfig.labels || {},
          selfLink: `${url}/${rangeConfig.name}`,
          creationTimestamp: new Date().toISOString(),
          description: rangeConfig.description
        };
        return createdRange;
      }),
      catchError(error => {
        console.error('Error reserving internal range:', error);
        throw error;
      })
    );
  }

  /**
   * Delete an internal IP range
   */
  deleteInternalRange(rangeName: string): Observable<void> {
    if (this.authService.isDemoMode()) {
      return of(void 0);
    }

    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject?.id) {
      throw new Error('No project selected');
    }

    const url = `${this.baseUrl}/projects/${currentProject.id}/global/addresses/${rangeName}`;
    
    return this.http.delete<void>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting internal range:', error);
        throw error;
      })
    );
  }
} 