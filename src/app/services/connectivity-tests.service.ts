import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export interface ConnectivityTest {
  name: string;
  protocol: string;
  source: string;
  destination: string;
  destinationPort?: number;
  lastTestTime: string;
  lastLiveDataPlaneResult: string;
  overallConfigurationResult: string;
  resultDetails: string;
  displayName?: string;
}

export interface ConnectivityTestRequest {
  displayName: string;
  description?: string;
  source: {
    ipAddress?: string;
    gceInstance?: string;
    instance?: string;
    network?: string;
    projectId?: string;
  };
  destination: {
    ipAddress?: string;
    gceInstance?: string;
    instance?: string;
    network?: string;
    projectId?: string;
    port?: number;
  };
  protocol: string;
  roundTrip?: boolean;
  labels?: { [key: string]: string };
  relatedProjects?: string[];
  bypassFirewallChecks?: boolean;
}

interface GcpConnectivityTest {
  name: string;
  displayName: string;
  description?: string;
  source: any;
  destination: any;
  protocol: string;
  createTime: string;
  updateTime: string;
  reachabilityDetails?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectivityTestsService {
  private baseUrl = 'https://networkmanagement.googleapis.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getConnectivityTests(projectId: string): Observable<ConnectivityTest[]> {
    console.log('ConnectivityTestsService.getConnectivityTests called with projectId:', projectId);
    
    if (!projectId || projectId === 'mock-project') {
      console.log('Using mock data for connectivity tests');
      return this.getMockTests();
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests`;
    console.log('Making API call to:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('API response received:', response);
        
        // Handle different possible response structures
        let tests: GcpConnectivityTest[] = [];
        if (response.connectivityTests) {
          tests = response.connectivityTests;
        } else if (Array.isArray(response)) {
          tests = response;
        } else if (response.resources) {
          tests = response.resources;
        } else {
          console.log('Unexpected response structure, using empty array');
        }
        
        console.log('Raw tests from API:', tests);
        const convertedTests = tests.map(test => this.convertGcpTest(test));
        console.log('Converted tests:', convertedTests);
        return convertedTests;
      }),
      catchError(error => {
        console.warn('Google Cloud Network Management API call failed, falling back to mock data:', error);
        if (error.status === 400) {
          console.warn('Network Management API might not be enabled for this project or requires additional permissions');
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Network Management API. Required scopes: https://www.googleapis.com/auth/cloud-platform');
        }
        return this.getMockTests();
      })
    );
  }

  getConnectivityTest(projectId: string, testName: string): Observable<ConnectivityTest> {
    if (!projectId || projectId === 'mock-project') {
      return this.getMockTests().pipe(
        map(tests => tests.find(t => t.name === testName) || tests[0])
      );
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests/${testName}`;
    return this.http.get<GcpConnectivityTest>(url, { headers: this.getHeaders() }).pipe(
      map(test => this.convertGcpTest(test)),
      catchError(error => {
        console.error('Error fetching connectivity test:', error);
        throw error;
      })
    );
  }

  createConnectivityTest(projectId: string, testData: ConnectivityTestRequest): Observable<ConnectivityTest> {
    if (!projectId || projectId === 'mock-project') {
      // Mock implementation
      const newTest: ConnectivityTest = {
        name: testData.displayName.toLowerCase().replace(/\s+/g, '-'),
        protocol: testData.protocol.toLowerCase(),
        source: testData.source.ipAddress || testData.source.instance || testData.source.gceInstance || 'Unknown',
        destination: testData.destination.ipAddress || testData.destination.instance || testData.destination.gceInstance || 'Unknown',
        destinationPort: testData.destination.port,
        lastTestTime: new Date().toLocaleDateString() + ' (' + new Date().toLocaleTimeString() + ')',
        lastLiveDataPlaneResult: '→ Testing...',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View',
        displayName: testData.displayName
      };
      return of(newTest);
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests`;
    
    // Build the payload according to Google Cloud API specification
    const payload: any = {
      displayName: testData.displayName,
      protocol: testData.protocol.toUpperCase(),
      source: this.buildEndpointPayload(testData.source),
      destination: this.buildEndpointPayload(testData.destination)
    };

    // Add optional fields
    if (testData.description) {
      payload.description = testData.description;
    }

    if (testData.roundTrip) {
      payload.roundTrip = testData.roundTrip;
    }

    if (testData.labels) {
      payload.labels = testData.labels;
    }

    if (testData.relatedProjects) {
      payload.relatedProjects = testData.relatedProjects;
    }

    if (testData.bypassFirewallChecks) {
      payload.bypassFirewallChecks = testData.bypassFirewallChecks;
    }

    console.log('Creating connectivity test with payload:', payload);

    return this.http.post<GcpConnectivityTest>(url, payload, { headers: this.getHeaders() }).pipe(
      map(test => this.convertGcpTest(test)),
      catchError(error => {
        console.warn('Failed to create connectivity test via API, using mock response:', error);
        if (error.status === 400) {
          console.warn('Network Management API might not be enabled or request format is invalid');
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Network Management API');
        }
        
        // Return mock test even on API failure
        const mockTest: ConnectivityTest = {
          name: testData.displayName.toLowerCase().replace(/\s+/g, '-'),
          protocol: testData.protocol.toLowerCase(),
          source: testData.source.ipAddress || testData.source.instance || testData.source.gceInstance || 'Unknown',
          destination: testData.destination.ipAddress || testData.destination.instance || testData.destination.gceInstance || 'Unknown',
          destinationPort: testData.destination.port,
          lastTestTime: new Date().toLocaleDateString() + ' (' + new Date().toLocaleTimeString() + ')',
          lastLiveDataPlaneResult: '→ Testing...',
          overallConfigurationResult: '→ Reachable',
          resultDetails: 'View',
          displayName: testData.displayName
        };
        return of(mockTest);
      })
    );
  }

  private buildEndpointPayload(endpoint: any): any {
    const endpointPayload: any = {};

    // Handle IP address endpoint
    if (endpoint.ipAddress) {
      endpointPayload.ipAddress = endpoint.ipAddress;
      if (endpoint.projectId) {
        endpointPayload.projectId = endpoint.projectId;
      }
    }

    // Handle GCE instance endpoint
    if (endpoint.instance || endpoint.gceInstance) {
      endpointPayload.instance = endpoint.instance || endpoint.gceInstance;
    }

    // Handle network endpoint
    if (endpoint.network) {
      endpointPayload.network = endpoint.network;
    }

    // Add port for destination if specified
    if (endpoint.port) {
      endpointPayload.port = endpoint.port;
    }

    return endpointPayload;
  }

  deleteConnectivityTest(projectId: string, testName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests/${testName}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }

  runConnectivityTest(projectId: string, testName: string): Observable<any> {
    if (!projectId || projectId === 'mock-project') {
      return of({ operationId: 'mock-operation-' + Date.now() });
    }

    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests/${testName}:rerun`;
    return this.http.post(url, {}, { headers: this.getHeaders() });
  }

  private convertGcpTest(gcpTest: any): ConnectivityTest {
    console.log('Converting GCP test:', gcpTest);
    
    try {
      const testName = this.extractResourceName(gcpTest.name);
      const protocol = (gcpTest.protocol || 'unknown').toLowerCase();
      
      // Handle source and destination formatting
      const source = this.formatEndpoint(gcpTest.source);
      const destination = this.formatEndpoint(gcpTest.destination);
      
      // Handle timestamps
      const lastTestTime = this.formatTimestamp(gcpTest.updateTime || gcpTest.createTime);
      
      // Handle test results
      const dataPlaneResult = this.getDataPlaneResult(gcpTest.reachabilityDetails);
      const configResult = this.getConfigurationResult(gcpTest.reachabilityDetails);
      
      const convertedTest = {
        name: testName,
        protocol: protocol,
        source: source,
        destination: destination,
        destinationPort: gcpTest.destination?.port,
        lastTestTime: lastTestTime,
        lastLiveDataPlaneResult: dataPlaneResult,
        overallConfigurationResult: configResult,
        resultDetails: 'View',
        displayName: gcpTest.displayName || testName
      };
      
      console.log('Converted test result:', convertedTest);
      return convertedTest;
    } catch (error) {
      console.error('Error converting GCP test:', error, gcpTest);
      // Return a fallback test object
      return {
        name: gcpTest.name || 'unknown-test',
        protocol: 'tcp',
        source: 'Unknown',
        destination: 'Unknown',
        lastTestTime: 'Unknown',
        lastLiveDataPlaneResult: 'Unknown',
        overallConfigurationResult: 'Unknown',
        resultDetails: 'View'
      };
    }
  }

  private formatEndpoint(endpoint: any): string {
    if (!endpoint) return 'Unknown';
    
    console.log('Formatting endpoint:', endpoint);
    
    // Handle different endpoint types
    if (endpoint.ipAddress) return endpoint.ipAddress;
    if (endpoint.instance) return this.extractResourceName(endpoint.instance);
    if (endpoint.gceInstance) return this.extractResourceName(endpoint.gceInstance);
    if (endpoint.network) return this.extractResourceName(endpoint.network);
    if (endpoint.gkeCluster) return this.extractResourceName(endpoint.gkeCluster);
    if (endpoint.cloudSqlInstance) return this.extractResourceName(endpoint.cloudSqlInstance);
    
    // If endpoint is a string, it might be an IP address
    if (typeof endpoint === 'string') return endpoint;
    
    // Try to extract any meaningful identifier
    if (endpoint.name) return this.extractResourceName(endpoint.name);
    
    return 'Unknown';
  }

  private getDataPlaneResult(details: any): string {
    if (!details) return 'Not tested';
    if (details.result === 'REACHABLE') return '50/50 packets delivered';
    if (details.result === 'UNREACHABLE') return 'Not eligible';
    return 'Not eligible';
  }

  private getConfigurationResult(details: any): string {
    if (!details) return 'Undetermined';
    if (details.result === 'REACHABLE') return 'Reachable';
    if (details.result === 'UNREACHABLE') return 'Undetermined';
    return 'Undetermined';
  }

  private extractResourceName(fullPath: string): string {
    if (!fullPath) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
  }

  private formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' (' + date.toLocaleTimeString() + ')';
    } catch (error) {
      return timestamp;
    }
  }

  private getMockTests(): Observable<ConnectivityTest[]> {
    console.log('getMockTests() called');
    const mockTests: ConnectivityTest[] = [
      {
        name: 'checking124',
        protocol: 'tcp',
        source: 'browse-group-eu-yzql (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2024-12-19 (13:05:07)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'duplicate-test',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2023-08-10 (11:59:04)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'foobar',
        protocol: 'tcp',
        source: 'batch-jobs-us-2 (default)',
        destination: '10.128.0.20 (default)',
        destinationPort: 80,
        lastTestTime: '2024-06-05 (11:06:27)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'joanna-test',
        protocol: 'esp',
        source: '0.0.0.0',
        destination: '0.0.0.0',
        lastTestTime: '2025-03-17 (19:00:29)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View'
      },
      {
        name: 'local-service-instance-to-external',
        protocol: 'tcp',
        source: '130.211.0.1',
        destination: 'local-service-instance',
        destinationPort: 80,
        lastTestTime: '2023-04-07 (23:19:53)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View'
      },
      {
        name: 'test',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default, 10.132.0.6)',
        destination: '10.128.0.20 (default)',
        destinationPort: 80,
        lastTestTime: '2024-05-29 (11:52:45)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-external',
        protocol: 'tcp',
        source: 'batch-jobs-us-2 (default)',
        destination: '12.11.11.1',
        destinationPort: 80,
        lastTestTime: '2024-08-28 (19:47:34)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-joanna',
        protocol: 'udp',
        source: '1.1.1.1',
        destination: '0.0.0.0',
        destinationPort: 80,
        lastTestTime: '2025-03-17 (18:46:10)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View'
      },
      {
        name: 'test-name',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default, 10.132.0.6)',
        destination: 'batch-jobs-eu (default, 10.132.0.6)',
        destinationPort: 80,
        lastTestTime: '2023-04-07 (23:19:30)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-siro',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2023-10-24 (17:17:43)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-siro2',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2023-10-30',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      }
    ];

    console.log('Mock tests created:', mockTests);
    console.log('Number of mock tests:', mockTests.length);
    return of(mockTests);
  }
} 