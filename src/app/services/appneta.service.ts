import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNetaNetworkPath, mapAppNetaPathToNetworkPath, AppNetaMonitoringPolicy, mapAppNetaMonitoringPolicyToMonitoringPolicy, AppNetaAppliance, mapAppNetaApplianceToMonitoringPoint, AppNetaWebPath, mapAppNetaWebPathToWebPath } from '../interfaces/appneta-api.interface';
import { AuthService } from './auth.service';

export interface NetworkPath {
  id: string;
  name: string;
  status: 'OK' | 'Failed' | 'Connectivity Loss' | 'Disabled';
  source: string;
  destination: string;
  monitoringPoint: string;
  target: string;
  lastUpdate: Date;
  lastSeen?: Date;
  protocol?: string;
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

// Add new interfaces for network path details
export interface NetworkPathMetrics {
  timestamp: string;
  capacity: number;
  dataLoss: number;
  dataJitter: number;
  latency: number;
  roundTripTime: number;
  voiceLoss: number;
  voiceJitter: number;
  mos: number;
}

export interface RouteHop {
  hopNumber: number;
  ipAddress: string;
  hostname?: string;
  asn?: string;
  location?: string;
  latency: number;
  packetLoss: number;
  responseTime: number;
}

export interface NetworkEvent {
  timestamp: string;
  type: 'Alert Condition' | 'Route Change' | 'Connectivity' | 'Performance';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  details?: string;
}

// AppNeta API Response Interfaces
export interface PathMeasurement {
  start: number; // Unix timestamp in milliseconds
  value: number;
  period: number;
  max: number;
  min: number;
}

export interface PathData {
  pathId: number;
  instrumentation: 'TWO_WAY' | 'ONE_WAY';
  data?: { [metricName: string]: PathMeasurement[] }; // For ONE_WAY paths
  dataInbound?: { [metricName: string]: PathMeasurement[] }; // For TWO_WAY paths
  dataOutbound?: { [metricName: string]: PathMeasurement[] }; // For TWO_WAY paths
}

export interface PathTraceRoute {
  traceRouteRecordTimes: number[]; // Array of Unix timestamps in milliseconds
  numHops: number;
  recentRtt: number;
  avgRtt: number;
  lastSeen: string; // ISO 8601 date string
  duration: number; // in minutes
  occurrences: number;
}

export interface PathEvent {
  eventTime: string; // ISO 8601 date string
  eventType: string;
  eventTypeName: string;
  pathName: string;
  pathState: string;
  pathId: number;
  eventDetail: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppNetaService {
  private readonly API_BASE_URL = environment.production 
    ? environment.appneta.apiBaseUrl 
    : '/appneta-api'; // Use proxy in development
  private readonly API_KEY = environment.appneta.apiKey;
  
  private networkPathsSubject = new BehaviorSubject<NetworkPath[]>([]);
  private webPathsSubject = new BehaviorSubject<WebPath[]>([]);
  private monitoringPointsSubject = new BehaviorSubject<MonitoringPoint[]>([]);
  private monitoringPoliciesSubject = new BehaviorSubject<MonitoringPolicy[]>([]);

  public networkPaths$ = this.networkPathsSubject.asObservable();
  public webPaths$ = this.webPathsSubject.asObservable();
  public monitoringPoints$ = this.monitoringPointsSubject.asObservable();
  public monitoringPolicies$ = this.monitoringPoliciesSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    // Check if we have a valid API key, if not, force demo mode
    const hasValidApiKey = this.API_KEY && this.API_KEY !== 'your-appneta-api-key-here' && this.API_KEY.length > 10;
    
    if (this.authService.isDemoMode() || !hasValidApiKey) {
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
    if (!this.authService.isDemoMode()) {
      console.warn('Falling back to demo mode due to API error');
      this.initializeMockData();
    }
    
    return throwError(errorMessage);
  }

  private loadRealData(): void {
    this.loadNetworkPathsFromAPI();
    this.loadWebPathsFromAPI();
    this.loadMonitoringPointsFromAPI();
    this.loadMonitoringPoliciesFromAPI();
  }

  private loadNetworkPathsFromAPI(): void {
    const url = `${this.API_BASE_URL}/api/v3/path?orgId=19091`;
    
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

  private loadWebPathsFromAPI(): void {
    const url = `${this.API_BASE_URL}/api/v3/webPath?orgId=19091`;
    
    this.http.get<AppNetaWebPath[]>(url, { headers: this.getHeaders() })
      .pipe(
        retry(2),
        map(webPaths => webPaths.map(webPath => mapAppNetaWebPathToWebPath(webPath))),
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (webPaths) => {
          console.log('🌐 Loaded web paths from AppNeta API:', webPaths);
          this.webPathsSubject.next(webPaths);
        },
        error: (error) => {
          console.error('❌ Failed to load web paths:', error);
        }
      });
  }

  private loadMonitoringPoliciesFromAPI(): void {
    const url = `${this.API_BASE_URL}/api/v3/monitoringPolicy?orgId=19091`;
    
    this.http.get<AppNetaMonitoringPolicy[]>(url, { headers: this.getHeaders() })
      .pipe(
        retry(2),
        map(policies => policies.map(policy => mapAppNetaMonitoringPolicyToMonitoringPolicy(policy))),
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (monitoringPolicies) => {
          console.log('🔧 Loaded monitoring policies from AppNeta API:', monitoringPolicies);
          this.monitoringPoliciesSubject.next(monitoringPolicies);
        },
        error: (error) => {
          console.error('❌ Failed to load monitoring policies:', error);
        }
      });
  }

  private loadMonitoringPointsFromAPI(): void {
    const url = `${this.API_BASE_URL}/api/v3/appliance?orgId=19091`;
    
    this.http.get<AppNetaAppliance[]>(url, { headers: this.getHeaders() })
      .pipe(
        retry(2),
        map(appliances => appliances.map(appliance => mapAppNetaApplianceToMonitoringPoint(appliance))),
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (monitoringPoints) => {
          console.log('📍 Loaded monitoring points from AppNeta API:', monitoringPoints);
          this.monitoringPointsSubject.next(monitoringPoints);
        },
        error: (error) => {
          console.error('❌ Failed to load monitoring points:', error);
        }
      });
  }

  // Initialize with mock data for demonstration (used in demo mode or as fallback)
  private initializeMockData(): void {
    const mockNetworkPaths: NetworkPath[] = [
      {
        id: '1',
        name: 'test-mp <> Google CCN POC (dual)',
        status: 'OK',
        source: 'test-mp',
        destination: 'gmt.pm.appneta.com',
        monitoringPoint: 'test-mp',
        target: 'gmt.pm.appneta.com',
        lastUpdate: new Date(),
        lastSeen: new Date(),
        protocol: 'UDP',
        latency: 25,
        packetLoss: 0,
        jitter: 2
      },
      {
        id: '2',
        name: 'test-mp <> Internal Database',
        status: 'Failed',
        source: 'test-mp',
        destination: 'db.internal.com',
        monitoringPoint: 'test-mp',
        target: 'db.internal.com',
        lastUpdate: new Date(Date.now() - 300000),
        lastSeen: new Date(Date.now() - 300000),
        protocol: 'TCP',
        latency: 85,
        packetLoss: 2.5,
        jitter: 15
      },
      {
        id: '3',
        name: 'test-mp <> Cloud Service',
        status: 'Connectivity Loss',
        source: 'test-mp',
        destination: 'api.cloud.com',
        monitoringPoint: 'test-mp',
        target: 'api.cloud.com',
        lastUpdate: new Date(Date.now() - 600000),
        lastSeen: new Date(Date.now() - 600000),
        protocol: 'UDP',
        latency: 0,
        packetLoss: 100,
        jitter: 0
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
    if (!this.authService.isDemoMode()) {
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
    if (this.authService.isDemoMode()) {
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
    return this.authService.isDemoMode() || !hasValidApiKey;
  }

  // Method to test API connectivity
  testConnection(): Observable<boolean> {
    if (this.authService.isDemoMode()) {
      return of(true);
    }

    const url = `${this.API_BASE_URL}/api/v3/path?orgId=19091&limit=1`;
    
    return this.http.get(url, { headers: this.getHeaders() })
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  // Network Path Details Methods
  getNetworkPathMetrics(pathId: string, timeRange: string = '1d'): Observable<NetworkPathMetrics[]> {
    // Temporarily force demo mode for path details until API endpoints are properly configured
    return this.generateMockMetrics(timeRange);
  }

  getNetworkPathEvents(pathId: string, timeRange: string = '1d'): Observable<NetworkEvent[]> {
    // Events endpoint is not documented in Swagger - always use demo mode
    return this.generateMockEvents();
  }

  getNetworkPathRoute(pathId: string, timeRange: string = '1d'): Observable<RouteHop[]> {
    // Temporarily force demo mode for trace route until API endpoints are properly configured
    return this.generateMockRoute();
  }

  // Private helper methods for mock data generation
  private generateMockMetrics(timeRange: string): Observable<NetworkPathMetrics[]> {
    const now = new Date();
    const timeRangeHours = this.getTimeRangeHours(timeRange);
    const intervalMinutes = this.getIntervalMinutes(timeRangeHours);
    const metrics: NetworkPathMetrics[] = [];
    
    for (let i = 0; i < timeRangeHours * (60 / intervalMinutes); i++) {
      const timestamp = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
      metrics.unshift({
        timestamp: timestamp.toISOString(),
        capacity: this.generateMetricValue(800, 1200, 50),
        dataLoss: this.generateMetricValue(0, 2, 0.1),
        dataJitter: this.generateMetricValue(0.5, 5, 0.2),
        latency: this.generateMetricValue(10, 50, 2),
        roundTripTime: this.generateMetricValue(20, 100, 5),
        voiceLoss: this.generateMetricValue(0, 1, 0.05),
        voiceJitter: this.generateMetricValue(0.1, 2, 0.1),
        mos: this.generateMetricValue(3.5, 4.5, 0.1)
      });
    }
    
    return of(metrics);
  }

  private generateMockEvents(): Observable<NetworkEvent[]> {
    const events: NetworkEvent[] = [
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        type: 'Alert Condition',
        severity: 'critical',
        description: 'Connectivity has been lost (Could not connect to target)',
        details: 'Network path test-mp <> gmt.pm.appneta.com failed connectivity check'
      },
      {
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        type: 'Alert Condition',
        severity: 'warning',
        description: 'Connectivity has been restored',
        details: 'Network path connectivity restored after 15 minutes of downtime'
      },
      {
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        type: 'Route Change',
        severity: 'info',
        description: 'Network route has changed',
        details: 'Route changed from 10 hops to 12 hops via different ISP backbone'
      },
      {
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        type: 'Performance',
        severity: 'warning',
        description: 'High latency detected',
        details: 'Average latency increased to 85ms, exceeding threshold of 50ms'
      }
    ];
    
    return of(events);
  }

  private generateMockRoute(): Observable<RouteHop[]> {
    const hops: RouteHop[] = [
      { hopNumber: 1, ipAddress: '192.168.1.1', hostname: 'gateway.local', latency: 1, packetLoss: 0, responseTime: 1 },
      { hopNumber: 2, ipAddress: '10.0.0.1', hostname: 'isp-router-1.example.com', latency: 5, packetLoss: 0, responseTime: 5 },
      { hopNumber: 3, ipAddress: '203.0.113.1', hostname: 'backbone-1.isp.com', latency: 15, packetLoss: 0, responseTime: 15 },
      { hopNumber: 4, ipAddress: '198.51.100.1', hostname: 'backbone-2.isp.com', latency: 25, packetLoss: 0, responseTime: 25 },
      { hopNumber: 5, ipAddress: '203.0.113.50', hostname: 'edge-router.target.com', latency: 35, packetLoss: 0, responseTime: 35 }
    ];
    
    return of(hops);
  }

  private generateMetricValue(min: number, max: number, variance: number): number {
    const base = min + Math.random() * (max - min);
    const variation = (Math.random() - 0.5) * variance * 2;
    return Math.max(min, Math.min(max, base + variation));
  }

  private getTimeRangeHours(range: string): number {
    switch (range) {
      case '1h': return 1;
      case '4h': return 4;
      case '1d': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }

  private getIntervalMinutes(hours: number): number {
    if (hours <= 4) return 1;
    if (hours <= 24) return 5;
    if (hours <= 168) return 30;
    return 60;
  }

  // Time range conversion utility
  private convertTimeRangeToTimestamps(timeRange: string): { from: number; to: number } {
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    let secondsAgo: number;

    switch (timeRange) {
      case '1h':
        secondsAgo = 3600;
        break;
      case '4h':
        secondsAgo = 14400;
        break;
      case '1d':
        secondsAgo = 86400;
        break;
      case '7d':
        secondsAgo = 604800;
        break;
      case '30d':
        secondsAgo = 2592000;
        break;
      default:
        secondsAgo = 86400; // Default to 1 day
    }

    return {
      from: now - secondsAgo,
      to: now
    };
  }

  // API mapping methods (to be implemented when real API is available)
  private mapApiMetricsToNetworkPathMetrics(data: any[]): NetworkPathMetrics[] {
    // TODO: Implement mapping from AppNeta API response to NetworkPathMetrics
    return data.map(item => ({
      timestamp: item.timestamp,
      capacity: item.capacity || 0,
      dataLoss: item.dataLoss || 0,
      dataJitter: item.dataJitter || 0,
      latency: item.latency || 0,
      roundTripTime: item.roundTripTime || 0,
      voiceLoss: item.voiceLoss || 0,
      voiceJitter: item.voiceJitter || 0,
      mos: item.mos || 0
    }));
  }

  private mapApiPathDataToNetworkPathMetrics(pathData: PathData): NetworkPathMetrics[] {
    // Map AppNeta PathData response to NetworkPathMetrics
    const metrics: NetworkPathMetrics[] = [];
    
    if (!pathData) return metrics;
    
    // Use dataOutbound for single direction, or combine both directions
    const data = pathData.dataOutbound || pathData.data || {};
    
    // Get all metric arrays (totalCapacity, latency, dataLoss, etc.)
    const metricKeys = Object.keys(data);
    
    if (metricKeys.length === 0) return metrics;
    
    // Assume all metric arrays have the same length and timestamps
    const firstMetricArray = data[metricKeys[0]] || [];
    
    return firstMetricArray.map((item: any, index: number) => ({
      timestamp: new Date(item.start).toISOString(),
      capacity: this.getMetricValue(data, 'totalCapacity', index),
      dataLoss: this.getMetricValue(data, 'dataLoss', index),
      dataJitter: this.getMetricValue(data, 'dataJitter', index),
      latency: this.getMetricValue(data, 'latency', index),
      roundTripTime: this.getMetricValue(data, 'rtt', index),
      voiceLoss: this.getMetricValue(data, 'voiceLoss', index),
      voiceJitter: this.getMetricValue(data, 'voiceJitter', index),
      mos: this.getMetricValue(data, 'mos', index)
    }));
  }

  private getMetricValue(data: any, metricName: string, index: number): number {
    const metricArray = data[metricName];
    if (metricArray && metricArray[index]) {
      return metricArray[index].value || 0;
    }
    return 0;
  }

  private mapApiEventsToNetworkEvents(data: PathEvent[]): NetworkEvent[] {
    // Map AppNeta Events API response to NetworkEvent
    return data.map(item => ({
      timestamp: item.eventTime,
      type: item.eventTypeName as NetworkEvent['type'] || 'Alert Condition',
      severity: this.mapEventSeverity(item.eventType),
      description: item.eventDetail || '',
      details: item.pathName ? `Path: ${item.pathName}` : undefined
    }));
  }

  private mapEventSeverity(eventType: string): 'critical' | 'warning' | 'info' {
    if (eventType?.toLowerCase().includes('violation') || eventType?.toLowerCase().includes('failed')) {
      return 'critical';
    }
    if (eventType?.toLowerCase().includes('warning') || eventType?.toLowerCase().includes('change')) {
      return 'warning';
    }
    return 'info';
  }

  private mapApiRouteToRouteHops(data: any[]): RouteHop[] {
    // TODO: Implement mapping from AppNeta API response to RouteHop
    return data.map((item, index) => ({
      hopNumber: index + 1,
      ipAddress: item.ipAddress || '',
      hostname: item.hostname,
      asn: item.asn,
      location: item.location,
      latency: item.latency || 0,
      packetLoss: item.packetLoss || 0,
      responseTime: item.responseTime || 0
    }));
  }

  private mapApiTraceRouteToRouteHops(traceRouteData: PathTraceRoute[]): RouteHop[] {
    // Map AppNeta TraceRoute response to RouteHop array
    if (!traceRouteData || traceRouteData.length === 0) {
      return [];
    }

    // Use the most recent trace route (first item or the one with most recent lastSeen)
    const mostRecentRoute = traceRouteData.reduce((latest, current) => {
      const latestTime = new Date(latest.lastSeen || 0).getTime();
      const currentTime = new Date(current.lastSeen || 0).getTime();
      return currentTime > latestTime ? current : latest;
    });

    // Generate route hops based on numHops
    const hops: RouteHop[] = [];
    for (let i = 1; i <= (mostRecentRoute.numHops || 0); i++) {
      hops.push({
        hopNumber: i,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, // Mock IP
        hostname: i === mostRecentRoute.numHops ? 'target.example.com' : `hop${i}.isp.com`,
        asn: `AS${64496 + i}`,
        location: i === 1 ? 'Local' : i === mostRecentRoute.numHops ? 'Destination' : `Transit ${i}`,
        latency: Math.round((mostRecentRoute.recentRtt || 50) * (i / mostRecentRoute.numHops)),
        packetLoss: Math.random() > 0.95 ? Math.round(Math.random() * 2) : 0,
        responseTime: Math.round((mostRecentRoute.avgRtt || 50) * (i / mostRecentRoute.numHops))
      });
    }

    return hops;
  }
} 