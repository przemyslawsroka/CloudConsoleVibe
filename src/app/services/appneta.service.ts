import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface NetworkPath {
  id: string;
  name: string;
  status: 'OK' | 'Failed' | 'Connectivity Loss' | 'Disabled';
  source: string;
  destination: string;
  monitoringPoint: string;
  target: string;
  lastUpdate: Date;
  latency?: number;
  packetLoss?: number;
  jitter?: number;
}

export interface WebPath {
  id: string;
  name: string;
  status: 'OK' | 'Failed' | 'Warning' | 'Disabled';
  url: string;
  monitoringPoint: string;
  responseTime?: number;
  availability?: number;
  lastUpdate: Date;
  httpStatus?: number;
}

export interface MonitoringPoint {
  id: string;
  name: string;
  location: string;
  type: 'Physical' | 'Virtual' | 'Cloud';
  status: 'Online' | 'Offline' | 'Maintenance';
  lastSeen: Date;
  ipAddress: string;
  version: string;
}

export interface MonitoringPolicy {
  id: string;
  name: string;
  type: 'Network' | 'Web' | 'Infrastructure';
  enabled: boolean;
  targets: string[];
  thresholds: {
    latency?: number;
    packetLoss?: number;
    availability?: number;
  };
  alertingEnabled: boolean;
  createdDate: Date;
}

export interface NetworkInsightsSummary {
  totalPaths: number;
  connectivityLoss: number;
  okPaths: number;
  failedPaths: number;
  disabledPaths: number;
  totalWebPaths: number;
  okWebPaths: number;
  failedWebPaths: number;
  warningWebPaths: number;
  disabledWebPaths: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppNetaService {
  private readonly API_BASE_URL = 'https://api.appneta.com/v2';
  private readonly ACCESS_TOKEN = '6e15633455954589a10a2fba23345b72';
  
  private networkPathsSubject = new BehaviorSubject<NetworkPath[]>([]);
  private webPathsSubject = new BehaviorSubject<WebPath[]>([]);
  private monitoringPointsSubject = new BehaviorSubject<MonitoringPoint[]>([]);
  private monitoringPoliciesSubject = new BehaviorSubject<MonitoringPolicy[]>([]);

  public networkPaths$ = this.networkPathsSubject.asObservable();
  public webPaths$ = this.webPathsSubject.asObservable();
  public monitoringPoints$ = this.monitoringPointsSubject.asObservable();
  public monitoringPolicies$ = this.monitoringPoliciesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeMockData();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Initialize with mock data for demonstration (replace with actual API calls)
  private initializeMockData(): void {
    const mockNetworkPaths: NetworkPath[] = [
      {
        id: '1',
        name: 'appneta-gcp <-> Azure Target',
        status: 'OK',
        source: 'appneta-gcp',
        destination: 'gmt.pm.appneta.com',
        monitoringPoint: 'appneta-gcp',
        target: 'gmt.pm.appneta.com',
        lastUpdate: new Date(),
        latency: 45.2,
        packetLoss: 0.1,
        jitter: 2.3
      },
      {
        id: '2',
        name: 'gcp-west <-> database-cluster',
        status: 'Connectivity Loss',
        source: 'gcp-west',
        destination: 'db.internal.com',
        monitoringPoint: 'gcp-west-monitor',
        target: 'db.internal.com',
        lastUpdate: new Date(Date.now() - 300000),
        latency: 0,
        packetLoss: 100,
        jitter: 0
      },
      {
        id: '3',
        name: 'europe-central <-> api-gateway',
        status: 'OK',
        source: 'europe-central',
        destination: 'api.gateway.com',
        monitoringPoint: 'eu-central-1',
        target: 'api.gateway.com',
        lastUpdate: new Date(),
        latency: 23.8,
        packetLoss: 0,
        jitter: 1.1
      }
    ];

    const mockWebPaths: WebPath[] = [
      {
        id: '1',
        name: 'Main Website Health Check',
        status: 'OK',
        url: 'https://example.com',
        monitoringPoint: 'gcp-us-central',
        responseTime: 1250,
        availability: 99.9,
        lastUpdate: new Date(),
        httpStatus: 200
      },
      {
        id: '2',
        name: 'API Endpoint Monitoring',
        status: 'Warning',
        url: 'https://api.example.com/health',
        monitoringPoint: 'gcp-europe-west',
        responseTime: 3200,
        availability: 98.5,
        lastUpdate: new Date(),
        httpStatus: 200
      },
      {
        id: '3',
        name: 'CDN Performance Check',
        status: 'Failed',
        url: 'https://cdn.example.com/status',
        monitoringPoint: 'gcp-asia-east',
        responseTime: 0,
        availability: 85.2,
        lastUpdate: new Date(Date.now() - 600000),
        httpStatus: 503
      }
    ];

    const mockMonitoringPoints: MonitoringPoint[] = [
      {
        id: '1',
        name: 'appneta-gcp',
        location: 'us-central1-a',
        type: 'Cloud',
        status: 'Online',
        lastSeen: new Date(),
        ipAddress: '10.0.1.15',
        version: '12.5.2'
      },
      {
        id: '2',
        name: 'gcp-west-monitor',
        location: 'us-west1-b',
        type: 'Virtual',
        status: 'Online',
        lastSeen: new Date(),
        ipAddress: '10.0.2.22',
        version: '12.5.1'
      },
      {
        id: '3',
        name: 'eu-central-1',
        location: 'europe-west1-c',
        type: 'Physical',
        status: 'Maintenance',
        lastSeen: new Date(Date.now() - 1800000),
        ipAddress: '10.0.3.33',
        version: '12.4.8'
      }
    ];

    const mockMonitoringPolicies: MonitoringPolicy[] = [
      {
        id: '1',
        name: 'Critical Infrastructure Monitoring',
        type: 'Network',
        enabled: true,
        targets: ['gmt.pm.appneta.com', 'db.internal.com'],
        thresholds: {
          latency: 100,
          packetLoss: 5,
          availability: 99
        },
        alertingEnabled: true,
        createdDate: new Date(Date.now() - 86400000 * 30)
      },
      {
        id: '2',
        name: 'Web Application Performance',
        type: 'Web',
        enabled: true,
        targets: ['https://example.com', 'https://api.example.com'],
        thresholds: {
          availability: 98
        },
        alertingEnabled: true,
        createdDate: new Date(Date.now() - 86400000 * 15)
      }
    ];

    this.networkPathsSubject.next(mockNetworkPaths);
    this.webPathsSubject.next(mockWebPaths);
    this.monitoringPointsSubject.next(mockMonitoringPoints);
    this.monitoringPoliciesSubject.next(mockMonitoringPolicies);
  }

  // Network Paths API methods
  getNetworkPaths(): Observable<NetworkPath[]> {
    // In production, replace with actual API call
    // return this.http.get<NetworkPath[]>(`${this.API_BASE_URL}/network-paths`, { headers: this.getHeaders() });
    return this.networkPaths$;
  }

  getNetworkPath(id: string): Observable<NetworkPath | undefined> {
    return this.networkPaths$.pipe(
      map(paths => paths.find(path => path.id === id))
    );
  }

  createNetworkPath(path: Partial<NetworkPath>): Observable<NetworkPath> {
    const newPath: NetworkPath = {
      id: Date.now().toString(),
      name: path.name || '',
      status: 'OK',
      source: path.source || '',
      destination: path.destination || '',
      monitoringPoint: path.monitoringPoint || '',
      target: path.target || '',
      lastUpdate: new Date(),
      ...path
    };

    const currentPaths = this.networkPathsSubject.value;
    this.networkPathsSubject.next([...currentPaths, newPath]);
    return of(newPath);
  }

  // Web Paths API methods
  getWebPaths(): Observable<WebPath[]> {
    return this.webPaths$;
  }

  getWebPath(id: string): Observable<WebPath | undefined> {
    return this.webPaths$.pipe(
      map(paths => paths.find(path => path.id === id))
    );
  }

  createWebPath(path: Partial<WebPath>): Observable<WebPath> {
    const newPath: WebPath = {
      id: Date.now().toString(),
      name: path.name || '',
      status: 'OK',
      url: path.url || '',
      monitoringPoint: path.monitoringPoint || '',
      lastUpdate: new Date(),
      ...path
    };

    const currentPaths = this.webPathsSubject.value;
    this.webPathsSubject.next([...currentPaths, newPath]);
    return of(newPath);
  }

  // Monitoring Points API methods
  getMonitoringPoints(): Observable<MonitoringPoint[]> {
    return this.monitoringPoints$;
  }

  getMonitoringPoint(id: string): Observable<MonitoringPoint | undefined> {
    return this.monitoringPoints$.pipe(
      map(points => points.find(point => point.id === id))
    );
  }

  // Monitoring Policies API methods
  getMonitoringPolicies(): Observable<MonitoringPolicy[]> {
    return this.monitoringPolicies$;
  }

  createMonitoringPolicy(policy: Partial<MonitoringPolicy>): Observable<MonitoringPolicy> {
    const newPolicy: MonitoringPolicy = {
      id: Date.now().toString(),
      name: policy.name || '',
      type: policy.type || 'Network',
      enabled: policy.enabled !== undefined ? policy.enabled : true,
      targets: policy.targets || [],
      thresholds: policy.thresholds || {},
      alertingEnabled: policy.alertingEnabled !== undefined ? policy.alertingEnabled : true,
      createdDate: new Date(),
      ...policy
    };

    const currentPolicies = this.monitoringPoliciesSubject.value;
    this.monitoringPoliciesSubject.next([...currentPolicies, newPolicy]);
    return of(newPolicy);
  }

  // Summary and analytics methods
  getNetworkInsightsSummary(): Observable<NetworkInsightsSummary> {
    return this.networkPaths$.pipe(
      map(networkPaths => {
        const webPaths = this.webPathsSubject.value;
        
        return {
          totalPaths: networkPaths.length,
          connectivityLoss: networkPaths.filter(p => p.status === 'Connectivity Loss').length,
          okPaths: networkPaths.filter(p => p.status === 'OK').length,
          failedPaths: networkPaths.filter(p => p.status === 'Failed').length,
          disabledPaths: networkPaths.filter(p => p.status === 'Disabled').length,
          totalWebPaths: webPaths.length,
          okWebPaths: webPaths.filter(p => p.status === 'OK').length,
          failedWebPaths: webPaths.filter(p => p.status === 'Failed').length,
          warningWebPaths: webPaths.filter(p => p.status === 'Warning').length,
          disabledWebPaths: webPaths.filter(p => p.status === 'Disabled').length
        };
      })
    );
  }

  // Refresh data (simulate API refresh)
  refreshData(): void {
    this.initializeMockData();
  }
} 