import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export interface DnsZone {
  id: string;
  name: string;
  dnsName: string;
  description?: string;
  visibility: 'public' | 'private';
  dnssecConfig?: {
    state: string;
  };
  creationTime: string;
  nameServers?: string[];
  inUseBy?: string;
  recordCount?: number;
}

export interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  rrdatas: string[];
}

export interface CreateZoneRequest {
  name: string;
  dnsName: string;
  description?: string;
  visibility: 'public' | 'private';
  networks?: string[];
}

interface GcpManagedZone {
  id: string;
  name: string;
  dnsName: string;
  description?: string;
  visibility: string;
  creationTime: string;
  nameServers?: string[];
  dnssecConfig?: {
    state: string;
  };
  privateVisibilityConfig?: {
    networks: Array<{
      networkUrl: string;
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DnsService {
  private baseUrl = 'https://dns.googleapis.com/dns/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getDnsZones(projectId: string): Observable<DnsZone[]> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockZones();
    }

    const url = `${this.baseUrl}/projects/${projectId}/managedZones`;
    return this.http.get<{ managedZones: GcpManagedZone[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => (response.managedZones || []).map(zone => this.convertGcpZone(zone))),
      catchError(error => {
        console.error('Error fetching DNS zones:', error);
        return this.getMockZones();
      })
    );
  }

  getDnsZone(projectId: string, zoneName: string): Observable<DnsZone> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockZones().pipe(
        map(zones => zones.find(z => z.name === zoneName) || zones[0])
      );
    }

    const url = `${this.baseUrl}/projects/${projectId}/managedZones/${zoneName}`;
    return this.http.get<GcpManagedZone>(url, { headers: this.getHeaders() }).pipe(
      map(zone => this.convertGcpZone(zone)),
      catchError(error => {
        console.error('Error fetching DNS zone:', error);
        throw error;
      })
    );
  }

  createDnsZone(projectId: string, zoneData: CreateZoneRequest): Observable<DnsZone> {
    if (!projectId || projectId === 'mock-project') {
      // Mock implementation
      const newZone: DnsZone = {
        id: Date.now().toString(),
        name: zoneData.name,
        dnsName: zoneData.dnsName,
        description: zoneData.description,
        visibility: zoneData.visibility,
        creationTime: new Date().toISOString(),
        nameServers: [
          'ns-cloud-a1.googledomains.com.',
          'ns-cloud-a2.googledomains.com.',
          'ns-cloud-a3.googledomains.com.',
          'ns-cloud-a4.googledomains.com.'
        ]
      };
      return of(newZone);
    }

    const url = `${this.baseUrl}/projects/${projectId}/managedZones`;
    
    const payload: any = {
      name: zoneData.name,
      dnsName: zoneData.dnsName,
      description: zoneData.description,
      visibility: zoneData.visibility
    };

    if (zoneData.visibility === 'private' && zoneData.networks) {
      payload.privateVisibilityConfig = {
        networks: zoneData.networks.map(network => ({
          networkUrl: network
        }))
      };
    }

    return this.http.post<GcpManagedZone>(url, payload, { headers: this.getHeaders() }).pipe(
      map(zone => this.convertGcpZone(zone))
    );
  }

  deleteDnsZone(projectId: string, zoneName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/managedZones/${zoneName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  getDnsRecords(projectId: string, zoneName: string): Observable<DnsRecord[]> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockRecords();
    }

    const url = `${this.baseUrl}/projects/${projectId}/managedZones/${zoneName}/rrsets`;
    return this.http.get<{ rrsets: any[] }>(url, { headers: this.getHeaders() }).pipe(
      map(response => (response.rrsets || []).map(record => ({
        name: record.name,
        type: record.type,
        ttl: record.ttl || 300,
        rrdatas: record.rrdatas || []
      }))),
      catchError(error => {
        console.error('Error fetching DNS records:', error);
        return this.getMockRecords();
      })
    );
  }

  private convertGcpZone(gcpZone: GcpManagedZone): DnsZone {
    const inUseBy = gcpZone.privateVisibilityConfig?.networks && gcpZone.privateVisibilityConfig.networks.length > 0 
      ? gcpZone.privateVisibilityConfig.networks.map(n => this.extractResourceName(n.networkUrl)).join(', ')
      : undefined;

    return {
      id: gcpZone.id,
      name: gcpZone.name,
      dnsName: gcpZone.dnsName,
      description: gcpZone.description,
      visibility: gcpZone.visibility as 'public' | 'private',
      dnssecConfig: gcpZone.dnssecConfig,
      creationTime: gcpZone.creationTime,
      nameServers: gcpZone.nameServers,
      inUseBy
    };
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }

  private getMockZones(): Observable<DnsZone[]> {
    const mockZones: DnsZone[] = [
      {
        id: '1',
        name: 'test-zone-mchololowicz',
        dnsName: 'test-dns-name.',
        description: 'Test zone for development',
        visibility: 'public',
        creationTime: '2024-01-15T10:30:00Z',
        nameServers: [
          'ns-cloud-a1.googledomains.com.',
          'ns-cloud-a2.googledomains.com.',
          'ns-cloud-a3.googledomains.com.',
          'ns-cloud-a4.googledomains.com.'
        ],
        dnssecConfig: {
          state: 'off'
        }
      },
      {
        id: '2',
        name: 'test-zone-name',
        dnsName: 'test-dns-mchololowicz.',
        description: 'Another test zone',
        visibility: 'private',
        creationTime: '2024-01-20T14:45:00Z',
        nameServers: [
          'ns-cloud-b1.googledomains.com.',
          'ns-cloud-b2.googledomains.com.',
          'ns-cloud-b3.googledomains.com.',
          'ns-cloud-b4.googledomains.com.'
        ],
        inUseBy: 'net-top-viz-demo-208511.test-vpc',
        dnssecConfig: {
          state: 'off'
        }
      }
    ];

    return of(mockZones);
  }

  private getMockRecords(): Observable<DnsRecord[]> {
    const mockRecords: DnsRecord[] = [
      {
        name: 'test-dns-name.',
        type: 'NS',
        ttl: 21600,
        rrdatas: [
          'ns-cloud-a1.googledomains.com.',
          'ns-cloud-a2.googledomains.com.',
          'ns-cloud-a3.googledomains.com.',
          'ns-cloud-a4.googledomains.com.'
        ]
      },
      {
        name: 'test-dns-name.',
        type: 'SOA',
        ttl: 21600,
        rrdatas: [
          'ns-cloud-a1.googledomains.com. cloud-dns-hostmaster.google.com. 1 21600 3600 259200 300'
        ]
      }
    ];

    return of(mockRecords);
  }
} 