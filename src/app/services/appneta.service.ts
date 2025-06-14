import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNetaNetworkPath, mapAppNetaPathToNetworkPath } from '../interfaces/appneta-api.interface';

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
  private readonly API_BASE_URL = environment.production 
    ? environment.appneta.apiBaseUrl 
    : '/appneta-api'; // Use proxy in development
  private readonly API_KEY = environment.appneta.apiKey;
  private readonly DEMO_MODE = environment.appneta.demoMode;
  
  private networkPathsSubject = new BehaviorSubject<NetworkPath[]>([]);
  private webPathsSubject = new BehaviorSubject<WebPath[]>([]);
  private monitoringPointsSubject = new BehaviorSubject<MonitoringPoint[]>([]);
  private monitoringPoliciesSubject = new BehaviorSubject<MonitoringPolicy[]>([]);

  public networkPaths$ = this.networkPathsSubject.asObservable();
  public webPaths$ = this.webPathsSubject.asObservable();
  public monitoringPoints$ = this.monitoringPointsSubject.asObservable();
  public monitoringPolicies$ = this.monitoringPoliciesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if we have a valid API key, if not, force demo mode
    const hasValidApiKey = this.API_KEY && this.API_KEY !== 'your-appneta-api-key-here' && this.API_KEY.length > 10;
    
    if (this.DEMO_MODE || !hasValidApiKey) {
      if (!hasValidApiKey) {
        console.log('AppNeta Service: No valid API key found, running in DEMO MODE');
      } else {
        console.log('AppNeta Service running in DEMO MODE - using mock data');
      }
      this.initializeMockData();
    } else {
      console.log('AppNeta Service running in LIVE MODE - using real API');
      this.loadRealData();
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token ${this.API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error('AppNeta API Error:', errorMessage);
    
    // In case of API error, fall back to demo mode
    if (!this.DEMO_MODE) {
      console.warn('Falling back to demo mode due to API error');
      this.initializeMockData();
    }
    
    return throwError(errorMessage);
  }

  private loadRealData(): void {
    this.loadNetworkPathsFromAPI();
    // TODO: Add other data loading methods when we have more API endpoints
  }

  private loadNetworkPathsFromAPI(): void {
    const url = `${this.API_BASE_URL}/api/v3/path`;
    
    this.http.get<AppNetaNetworkPath[]>(url, { headers: this.getHeaders() })
      .pipe(
        retry(2),
        map(paths => paths.map(path => mapAppNetaPathToNetworkPath(path))),
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (networkPaths) => {
          console.log('Loaded network paths from AppNeta API:', networkPaths);
          this.networkPathsSubject.next(networkPaths);
        },
        error: (error) => {
          console.error('Failed to load network paths:', error);
        }
      });
  }

  // Initialize with mock data for demonstration (used in demo mode or as fallback)
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
        ipAddress: '10.0.3.45',
        version: '12.4.8'
      },
      {
        id: '4',
        name: 'asia-east-monitor',
        location: 'asia-east1-a',
        type: 'Cloud',
        status: 'Offline',
        lastSeen: new Date(Date.now() - 3600000),
        ipAddress: '10.0.4.12',
        version: '12.5.0'
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
          packetLoss: 1,
          availability: 99.5
        },
        alertingEnabled: true,
        createdDate: new Date(Date.now() - 86400000 * 7)
      },
      {
        id: '2',
        name: 'Web Application Performance',
        type: 'Web',
        enabled: true,
        targets: ['https://example.com', 'https://api.example.com'],
        thresholds: {
          availability: 99.0
        },
        alertingEnabled: true,
        createdDate: new Date(Date.now() - 86400000 * 3)
      },
      {
        id: '3',
        name: 'Development Environment',
        type: 'Infrastructure',
        enabled: false,
        targets: ['dev.internal.com'],
        thresholds: {
          latency: 200,
          availability: 95.0
        },
        alertingEnabled: false,
        createdDate: new Date(Date.now() - 86400000 * 14)
      }
    ];

    // Set the mock data
    this.networkPathsSubject.next(mockNetworkPaths);
    this.webPathsSubject.next(mockWebPaths);
    this.monitoringPointsSubject.next(mockMonitoringPoints);
    this.monitoringPoliciesSubject.next(mockMonitoringPolicies);
  }

  // Public API methods
  getNetworkPaths(): Observable<NetworkPath[]> {
    if (!this.DEMO_MODE) {
      this.loadNetworkPathsFromAPI();
    }
    return this.networkPaths$;
  }

  getNetworkPath(id: string): Observable<NetworkPath | undefined> {
    return this.networkPaths$.pipe(
      map(paths => paths.find(path => path.id === id))
    );
  }

  createNetworkPath(path: Partial<NetworkPath>): Observable<NetworkPath> {
    // TODO: Implement real API call for creating network paths
    const newPath: NetworkPath = {
      id: Date.now().toString(),
      name: path.name || 'New Network Path',
      status: 'OK',
      source: path.source || '',
      destination: path.destination || '',
      monitoringPoint: path.monitoringPoint || '',
      target: path.target || path.destination || '',
      lastUpdate: new Date(),
      latency: 0,
      packetLoss: 0,
      jitter: 0
    };

    const currentPaths = this.networkPathsSubject.value;
    this.networkPathsSubject.next([...currentPaths, newPath]);
    
    return of(newPath);
  }

  getWebPaths(): Observable<WebPath[]> {
    return this.webPaths$;
  }

  getWebPath(id: string): Observable<WebPath | undefined> {
    return this.webPaths$.pipe(
      map(paths => paths.find(path => path.id === id))
    );
  }

  createWebPath(path: Partial<WebPath>): Observable<WebPath> {
    // TODO: Implement real API call for creating web paths
    const newPath: WebPath = {
      id: Date.now().toString(),
      name: path.name || 'New Web Path',
      status: 'OK',
      url: path.url || '',
      monitoringPoint: path.monitoringPoint || '',
      responseTime: 0,
      availability: 100,
      lastUpdate: new Date(),
      httpStatus: 200
    };

    const currentPaths = this.webPathsSubject.value;
    this.webPathsSubject.next([...currentPaths, newPath]);
    
    return of(newPath);
  }

  getMonitoringPoints(): Observable<MonitoringPoint[]> {
    return this.monitoringPoints$;
  }

  getMonitoringPoint(id: string): Observable<MonitoringPoint | undefined> {
    return this.monitoringPoints$.pipe(
      map(points => points.find(point => point.id === id))
    );
  }

  getMonitoringPolicies(): Observable<MonitoringPolicy[]> {
    return this.monitoringPolicies$;
  }

  createMonitoringPolicy(policy: Partial<MonitoringPolicy>): Observable<MonitoringPolicy> {
    // TODO: Implement real API call for creating monitoring policies
    const newPolicy: MonitoringPolicy = {
      id: Date.now().toString(),
      name: policy.name || 'New Policy',
      type: policy.type || 'Network',
      enabled: policy.enabled !== undefined ? policy.enabled : true,
      targets: policy.targets || [],
      thresholds: policy.thresholds || {},
      alertingEnabled: policy.alertingEnabled !== undefined ? policy.alertingEnabled : true,
      createdDate: new Date()
    };

    const currentPolicies = this.monitoringPoliciesSubject.value;
    this.monitoringPoliciesSubject.next([...currentPolicies, newPolicy]);
    
    return of(newPolicy);
  }

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

  refreshData(): void {
    if (this.DEMO_MODE) {
      console.log('Refreshing mock data...');
      this.initializeMockData();
    } else {
      console.log('Refreshing data from AppNeta API...');
      this.loadRealData();
    }
  }

  // Method to check if we're in demo mode
  isDemoMode(): boolean {
    const hasValidApiKey = this.API_KEY && this.API_KEY !== 'your-appneta-api-key-here' && this.API_KEY.length > 10;
    return this.DEMO_MODE || !hasValidApiKey;
  }

  // Method to test API connectivity
  testConnection(): Observable<boolean> {
    if (this.DEMO_MODE) {
      return of(true);
    }

    const url = `${this.API_BASE_URL}/api/v3/path?limit=1`;
    
    return this.http.get(url, { headers: this.getHeaders() })
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }
} 