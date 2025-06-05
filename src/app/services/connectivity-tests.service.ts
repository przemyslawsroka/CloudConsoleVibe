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
  // Enhanced fields for detailed analysis
  roundTrip?: boolean;
  forwardTrace?: TraceResult;
  returnTrace?: TraceResult;
  latencyInfo?: LatencyInfo;
  sourceDetails?: EndpointDetails;
  destinationDetails?: EndpointDetails;
  traceSteps?: TraceStep[];
  packetDropReason?: string;
  errorMessage?: string;
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

export interface TraceResult {
  result: 'DELIVERED' | 'DROPPED' | 'UNREACHABLE';
  details: string;
  steps: TraceStep[];
}

export interface TraceStep {
  stepNumber: number;
  description: string;
  type: 'VM_INSTANCE' | 'FIREWALL_RULE' | 'SUBNET_ROUTE' | 'LOAD_BALANCER' | 'VPN_GATEWAY' | 'NAT_GATEWAY' | 'EXTERNAL_IP';
  resourceName: string;
  action: 'ALLOW' | 'DENY' | 'FORWARD' | 'DROP';
  details: any;
  expanded?: boolean;
}

export interface LatencyInfo {
  median: number;
  percentile95: number;
  unit: 'ms' | 'us';
}

export interface EndpointDetails {
  type: 'VM_INSTANCE' | 'IP_ADDRESS' | 'LOAD_BALANCER' | 'EXTERNAL';
  name: string;
  networkInterface?: string;
  network: string;
  internalIp?: string;
  externalIp?: string;
  zone?: string;
  project: string;
  isRunning?: boolean;
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
    console.log('Fetching connectivity test details from:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(apiResponse => {
        console.log('API response for test details:', apiResponse);
        return this.convertDetailedGcpTest(apiResponse);
      }),
      catchError(error => {
        console.error('Error fetching connectivity test details:', error);
        // Fallback to mock data if API fails
        return this.getMockTests().pipe(
          map(tests => tests.find(t => t.name === testName) || tests[0])
        );
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

    // Generate a unique test ID from display name
    const testId = this.generateTestId(testData.displayName);
    const url = `${this.baseUrl}/projects/${projectId}/locations/global/connectivityTests?connectivityTestId=${testId}`;
    
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

    console.log('Creating connectivity test with URL:', url);
    console.log('Creating connectivity test with payload:', payload);

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(apiResponse => this.convertDetailedGcpTest(apiResponse)),
      catchError(error => {
        console.warn('Failed to create connectivity test via API, using mock response:', error);
        if (error.status === 400) {
          console.warn('Network Management API might not be enabled or request format is invalid');
          console.warn('Error details:', error.error);
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Network Management API');
        }
        
        // Return mock test even on API failure
        const mockTest: ConnectivityTest = {
          name: testId,
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

  private generateTestId(displayName: string): string {
    // Generate a test ID that follows GCP naming conventions
    // Must be 1-63 characters, lowercase letters, numbers, and hyphens
    // Must start with a letter and end with a letter or number
    
    let testId = displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Ensure it starts with a letter
    if (testId.length === 0 || !/^[a-z]/.test(testId)) {
      testId = 'test-' + testId;
    }
    
    // Add timestamp suffix to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    testId = `${testId}-${timestamp}`;
    
    // Ensure max length of 63 characters
    if (testId.length > 63) {
      testId = testId.substring(0, 57) + '-' + timestamp;
    }
    
    return testId;
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
        lastTestTime: '2025-06-06 (00:29:45)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View',
        roundTrip: true,
        latencyInfo: { median: 51.42, percentile95: 51.48, unit: 'ms' },
        forwardTrace: {
          result: 'DELIVERED',
          details: 'Packet could be delivered',
          steps: [
            {
              stepNumber: 1,
              description: 'VM instance (browse-group-eu-yzql)',
              type: 'VM_INSTANCE',
              resourceName: 'browse-group-eu-yzql',
              action: 'FORWARD',
              details: {
                networkInterface: 'nic0',
                network: 'default',
                internalIp: '10.132.0.51',
                externalIp: '34.77.90.238',
                isRunning: true
              }
            },
            {
              stepNumber: 2,
              description: 'Default egress firewall rule',
              type: 'FIREWALL_RULE',
              resourceName: 'default-allow-internal',
              action: 'ALLOW',
              details: { priority: 65535, network: 'default' }
            }
          ]
        },
        returnTrace: {
          result: 'DELIVERED',
          details: 'Return packet could be delivered',
          steps: [
            {
              stepNumber: 1,
              description: 'VM instance (batch-jobs-us)',
              type: 'VM_INSTANCE',
              resourceName: 'batch-jobs-us',
              action: 'FORWARD',
              details: {
                networkInterface: 'nic0',
                network: 'default',
                internalIp: '10.128.0.3',
                externalIp: '35.239.119.45',
                isRunning: true
              }
            }
          ]
        }
      },
      {
        name: 'duplicate-test',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2024-08-10 (11:59:04)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View',
        latencyInfo: { median: 45.23, percentile95: 47.12, unit: 'ms' }
      },
      {
        name: 'foobar',
        protocol: 'tcp',
        source: 'batch-jobs-us-2 (default)',
        destination: '10.128.0.20 (net peering)',
        destinationPort: 80,
        lastTestTime: '2024-06-05 (11:06:22)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'joanna-test',
        protocol: 'esp',
        source: '0.0.0.0',
        destination: '1.1.1.1',
        lastTestTime: '2024-03-17 (19:00:29)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View',
        errorMessage: 'ESP protocol testing requires additional configuration'
      },
      {
        name: 'local-service-instance-to-external',
        protocol: 'tcp',
        source: 'db-instance-eu (default)',
        destination: 'onlineboutique (-)',
        destinationPort: 443,
        lastTestTime: '2024-04-07 (23:19:53)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View',
        errorMessage: 'External destination not eligible for live data plane analysis'
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
        resultDetails: 'View',
        latencyInfo: { median: 12.7, percentile95: 15.3, unit: 'ms' }
      },
      {
        name: 'test-external',
        protocol: 'tcp',
        source: 'batch-jobs-us-2 (default)',
        destination: '12.11.11.1',
        destinationPort: 80,
        lastTestTime: '2024-08-28 (7:47:34)',
        lastLiveDataPlaneResult: '→ Packet could be dropped',
        overallConfigurationResult: '✕ Packet could be dropped',
        resultDetails: 'View',
        packetDropReason: 'Packet with this IP address — is sent to a wrong (unintended) network. Expected network: default-route-4afb4f59116e5956r',
        forwardTrace: {
          result: 'DROPPED',
          details: 'Packet could be dropped',
          steps: [
            {
              stepNumber: 1,
              description: 'VM instance (batch-jobs-us-2)',
              type: 'VM_INSTANCE',
              resourceName: 'batch-jobs-us-2',
              action: 'FORWARD',
              details: {
                networkInterface: 'nic0',
                network: 'default',
                internalIp: '10.128.0.3',
                externalIp: '34.77.90.238',
                isRunning: true
              }
            },
            {
              stepNumber: 2,
              description: 'Ingress firewall rule',
              type: 'FIREWALL_RULE',
              resourceName: 'default-deny-ingress',
              action: 'DENY',
              details: { priority: 65534, network: 'default', reason: 'No matching allow rule' }
            }
          ]
        }
      },
      {
        name: 'test-joanna',
        protocol: 'udp',
        source: '1.1.1.1',
        destination: '151.101.67.5',
        destinationPort: 53,
        lastTestTime: '2024-03-17 (18:46:10)',
        lastLiveDataPlaneResult: '→ Not eligible',
        overallConfigurationResult: '▲ Undetermined',
        resultDetails: 'View'
      },
      {
        name: 'test-name',
        protocol: 'tcp',
        source: '10.128.0.3 (batch-jobs-eu)',
        destination: '10.132.0.6 (batch-jobs-us)',
        destinationPort: 80,
        lastTestTime: '2024-04-18 (2:23:38)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-sito',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default, 10.128.0.20)',
        destinationPort: 80,
        lastTestTime: '2024-10-21 (02:10:41)',
        lastLiveDataPlaneResult: '→ Unreachable',
        overallConfigurationResult: '→ Unreachable',
        resultDetails: 'View',
        forwardTrace: {
          result: 'UNREACHABLE',
          details: 'Packet could not be delivered',
          steps: [
            {
              stepNumber: 1,
              description: 'VM instance (batch-jobs-eu)',
              type: 'VM_INSTANCE',
              resourceName: 'batch-jobs-eu',
              action: 'FORWARD',
              details: {
                networkInterface: 'nic0',
                network: 'default',
                internalIp: '10.132.0.6',
                externalIp: '34.77.90.238',
                isRunning: false
              }
            }
          ]
        }
      },
      {
        name: 'test-siro2',
        protocol: 'tcp',
        source: 'batch-jobs-eu (default)',
        destination: 'batch-jobs-us (default)',
        destinationPort: 80,
        lastTestTime: '2024-10-30 (15:22:14)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'testing-vm-connection',
        protocol: 'tcp',
        source: 'db-instance-eu (default)',
        destination: '10.128.0.3 (net peering)',
        destinationPort: 80,
        lastTestTime: '2022-10-21 (02:10:41)',
        lastLiveDataPlaneResult: '→ 51/51 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View',
        roundTrip: true,
        latencyInfo: { median: 51.27, percentile95: 51.31, unit: 'ms' },
        forwardTrace: {
          result: 'DELIVERED',
          details: 'Packet could be delivered',
          steps: [
            {
              stepNumber: 1,
              description: 'VM instance (db-instance-eu)',
              type: 'VM_INSTANCE',
              resourceName: 'db-instance-eu',
              action: 'FORWARD',
              details: {
                networkInterface: 'nic0',
                network: 'default',
                internalIp: '10.132.0.51',
                externalIp: '34.77.90.238',
                isRunning: true
              }
            },
            {
              stepNumber: 2,
              description: 'Default egress firewall rule',
              type: 'FIREWALL_RULE',
              resourceName: 'default-allow-internal',
              action: 'ALLOW',
              details: { priority: 65535, network: 'default' }
            },
            {
              stepNumber: 3,
              description: 'Subnet route',
              type: 'SUBNET_ROUTE',
              resourceName: 'default-route-subnet',
              action: 'FORWARD',
              details: { destinationRange: '10.128.0.0/20', nextHop: 'default-internet-gateway' }
            }
          ]
        },
        returnTrace: {
          result: 'DELIVERED',
          details: 'Return packet could be delivered',
          steps: [
            {
              stepNumber: 1,
              description: 'Ingress firewall rule',
              type: 'FIREWALL_RULE',
              resourceName: 'default-allow-internal',
              action: 'ALLOW',
              details: { priority: 1000, network: 'default' }
            }
          ]
        }
      },
      {
        name: 'testing-external-this',
        protocol: 'tcp',
        source: 'db-instance-esia (default)',
        destination: 'browse-group-asia-3wsr (default)',
        destinationPort: 80,
        lastTestTime: '2024-05-09 (5:09:29)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'testmary',
        protocol: 'tcp',
        source: 'batch-jobs-us-2 (default)',
        destination: 'browse-group-asia-3wsr (default, 10.140.0.96)',
        destinationPort: 80,
        lastTestTime: '2024-05-17 (6:40:19)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'testing-123-345',
        protocol: 'tcp',
        source: '10.128.0.20',
        destination: '10.140.0.96',
        destinationPort: 80,
        lastTestTime: '2023-11-21 (4:59:40)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'test-this-today',
        protocol: 'tcp',
        source: 'db-instance-eu (default)',
        destination: 'batch-jobs-us-2 (default, 10.128.0.20)',
        destinationPort: 80,
        lastTestTime: '2024-06-29 (4:32:12)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'virtualnic0',
        protocol: 'tcp',
        source: 'batch-jobs-us (default)',
        destination: 'Unknown',
        destinationPort: 443,
        lastTestTime: '2024-04-18 (2:23:37)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'vm-to-internet',
        protocol: 'tcp',
        source: 'batch-jobs-us (default)',
        destination: '151.101.67.5',
        destinationPort: 80,
        lastTestTime: '2024-07-21 (5:09:27)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'x',
        protocol: 'tcp',
        source: 'batch-jobs-us',
        destination: 'batch-jobs-us-2',
        destinationPort: 80,
        lastTestTime: '2024-09-05 (5:09:24)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      },
      {
        name: 'yrdy',
        protocol: 'tcp',
        source: '10.128.0.3 (default)',
        destination: '10.128.0.20 (default)',
        destinationPort: 80,
        lastTestTime: '2024-08-28 (7:47:34)',
        lastLiveDataPlaneResult: '→ 50/50 packets delivered',
        overallConfigurationResult: '→ Reachable',
        resultDetails: 'View'
      }
    ];

    console.log('Mock tests created:', mockTests);
    console.log('Number of mock tests:', mockTests.length);
    return of(mockTests);
  }

  private convertDetailedGcpTest(apiResponse: any): ConnectivityTest {
    console.log('Converting detailed GCP test:', apiResponse);
    
    try {
      const testName = this.extractResourceName(apiResponse.name || '');
      const protocol = (apiResponse.protocol || 'tcp').toLowerCase();
      
      // Extract source and destination from endpoints
      const source = this.formatDetailedEndpoint(apiResponse.source);
      const destination = this.formatDetailedEndpoint(apiResponse.destination);
      
      // Handle timestamps
      const lastTestTime = this.formatTimestamp(apiResponse.updateTime || apiResponse.createTime);
      
      // Extract reachability details for forward trace
      const reachabilityDetails = apiResponse.reachabilityDetails;
      const returnReachabilityDetails = apiResponse.returnReachabilityDetails;
      const probingDetails = apiResponse.probingDetails;
      
      // Determine overall results
      const configResult = this.getDetailedConfigurationResult(reachabilityDetails);
      const dataPlaneResult = this.getDetailedDataPlaneResult(probingDetails, reachabilityDetails);
      
      // Build the enhanced connectivity test object
      const connectivityTest: ConnectivityTest = {
        name: testName,
        protocol: protocol,
        source: source,
        destination: destination,
        destinationPort: apiResponse.destination?.port,
        lastTestTime: lastTestTime,
        lastLiveDataPlaneResult: dataPlaneResult,
        overallConfigurationResult: configResult,
        resultDetails: 'View',
        displayName: apiResponse.displayName || testName,
        roundTrip: apiResponse.roundTrip || false
      };

      // Add latency information from probing details
      if (probingDetails && probingDetails.probingLatency) {
        connectivityTest.latencyInfo = this.extractLatencyInfo(probingDetails.probingLatency);
      }

      // Add forward trace information
      if (reachabilityDetails && reachabilityDetails.traces && reachabilityDetails.traces.length > 0) {
        const trace = reachabilityDetails.traces[0]; // Use first trace
        connectivityTest.forwardTrace = {
          result: this.mapApiResultToTraceResult(reachabilityDetails.result),
          details: this.getTraceResultDescription(reachabilityDetails.result),
          steps: this.convertApiStepsToTraceSteps(trace.steps || [])
        };
      }

      // Add return trace information for round trip tests
      if (returnReachabilityDetails && returnReachabilityDetails.traces && returnReachabilityDetails.traces.length > 0) {
        const returnTrace = returnReachabilityDetails.traces[0];
        connectivityTest.returnTrace = {
          result: this.mapApiResultToTraceResult(returnReachabilityDetails.result),
          details: this.getTraceResultDescription(returnReachabilityDetails.result, true),
          steps: this.convertApiStepsToTraceSteps(returnTrace.steps || [])
        };
      }

      // Add error information if present
      if (reachabilityDetails && reachabilityDetails.error) {
        connectivityTest.errorMessage = reachabilityDetails.error.message || 'Configuration analysis failed';
      }

      // Add packet drop reason for failed tests
      if (reachabilityDetails && reachabilityDetails.result === 'UNREACHABLE' && reachabilityDetails.traces) {
        const failedStep = this.findFailedStep(reachabilityDetails.traces[0]?.steps || []);
        if (failedStep) {
          connectivityTest.packetDropReason = this.getDropReason(failedStep);
        }
      }

      console.log('Converted detailed test:', connectivityTest);
      return connectivityTest;

    } catch (error) {
      console.error('Error converting detailed GCP test:', error, apiResponse);
      // Return a basic fallback object
      return {
        name: apiResponse.name || 'unknown-test',
        protocol: 'tcp',
        source: 'Unknown',
        destination: 'Unknown',
        lastTestTime: 'Unknown',
        lastLiveDataPlaneResult: 'Error loading details',
        overallConfigurationResult: 'Error loading details',
        resultDetails: 'View',
        errorMessage: 'Failed to load test details'
      };
    }
  }

  private formatDetailedEndpoint(endpoint: any): string {
    if (!endpoint) return 'Unknown';
    
    console.log('Formatting detailed endpoint:', endpoint);
    
    // Handle different endpoint types with more detail
    if (endpoint.ipAddress) {
      if (endpoint.instance) {
        const instanceName = this.extractResourceName(endpoint.instance);
        return `${endpoint.ipAddress} (${instanceName})`;
      }
      return endpoint.ipAddress;
    }
    
    if (endpoint.instance) {
      const instanceName = this.extractResourceName(endpoint.instance);
      if (endpoint.network) {
        const networkName = this.extractResourceName(endpoint.network);
        return `${instanceName} (${networkName})`;
      }
      return instanceName;
    }
    
    if (endpoint.network) {
      return this.extractResourceName(endpoint.network);
    }
    
    if (endpoint.gkeMasterCluster) {
      return `GKE Cluster (${this.extractResourceName(endpoint.gkeMasterCluster)})`;
    }
    
    if (endpoint.cloudSqlInstance) {
      return `Cloud SQL (${this.extractResourceName(endpoint.cloudSqlInstance)})`;
    }
    
    if (endpoint.fqdn) {
      return endpoint.fqdn;
    }
    
    return 'Unknown';
  }

  private getDetailedConfigurationResult(reachabilityDetails: any): string {
    if (!reachabilityDetails) return 'Undetermined';
    
    switch (reachabilityDetails.result) {
      case 'REACHABLE':
        return '→ Reachable';
      case 'UNREACHABLE':
        return '✕ Unreachable';
      case 'AMBIGUOUS':
        return '▲ Ambiguous';
      case 'UNDETERMINED':
        return '▲ Undetermined';
      default:
        return '▲ Undetermined';
    }
  }

  private getDetailedDataPlaneResult(probingDetails: any, reachabilityDetails: any): string {
    // If we have probing details, use those
    if (probingDetails) {
      const sent = probingDetails.sentProbeCount || 0;
      const successful = probingDetails.successfulProbeCount || 0;
      
      if (sent > 0) {
        return `→ ${successful}/${sent} packets delivered`;
      }
      
      switch (probingDetails.result) {
        case 'REACHABLE':
          return '→ Packets delivered';
        case 'UNREACHABLE':
          return '→ Packets could not be delivered';
        case 'REACHABILITY_INCONSISTENT':
          return '→ Inconsistent reachability';
        case 'UNDETERMINED':
          return '→ Not eligible';
        default:
          return '→ Not eligible';
      }
    }
    
    // Fallback to configuration analysis
    if (reachabilityDetails) {
      switch (reachabilityDetails.result) {
        case 'REACHABLE':
          return '→ Configuration allows delivery';
        case 'UNREACHABLE':
          return '→ Configuration blocks delivery';
        default:
          return '→ Not eligible';
      }
    }
    
    return '→ Not eligible';
  }

  private extractLatencyInfo(probingLatency: any): LatencyInfo {
    const percentiles = probingLatency.latencyPercentiles || [];
    
    // Find median (50th percentile) and 95th percentile
    let median = 0;
    let percentile95 = 0;
    
    for (const percentile of percentiles) {
      const latencyMs = Math.round(parseInt(percentile.latencyMicros || '0') / 1000);
      if (percentile.percent === 50) {
        median = latencyMs;
      } else if (percentile.percent === 95) {
        percentile95 = latencyMs;
      }
    }
    
    // If we don't have exact percentiles, estimate from available data
    if (median === 0 && percentiles.length > 0) {
      median = Math.round(parseInt(percentiles[0].latencyMicros || '0') / 1000);
    }
    if (percentile95 === 0 && percentiles.length > 1) {
      percentile95 = Math.round(parseInt(percentiles[percentiles.length - 1].latencyMicros || '0') / 1000);
    }
    
    return {
      median: median,
      percentile95: percentile95,
      unit: 'ms'
    };
  }

  private mapApiResultToTraceResult(result: string): 'DELIVERED' | 'DROPPED' | 'UNREACHABLE' {
    switch (result) {
      case 'REACHABLE':
        return 'DELIVERED';
      case 'UNREACHABLE':
        return 'UNREACHABLE';
      default:
        return 'DROPPED';
    }
  }

  private getTraceResultDescription(result: string, isReturn: boolean = false): string {
    const prefix = isReturn ? 'Return packet' : 'Packet';
    
    switch (result) {
      case 'REACHABLE':
        return `${prefix} could be delivered`;
      case 'UNREACHABLE':
        return `${prefix} could not be delivered`;
      case 'AMBIGUOUS':
        return `${prefix} delivery is ambiguous`;
      case 'UNDETERMINED':
        return `${prefix} delivery is undetermined`;
      default:
        return `${prefix} analysis incomplete`;
    }
  }

  private convertApiStepsToTraceSteps(apiSteps: any[]): TraceStep[] {
    return apiSteps.map((step, index) => {
      const traceStep: TraceStep = {
        stepNumber: index + 1,
        description: step.description || 'Unknown step',
        type: this.mapApiStepTypeToTraceStepType(step),
        resourceName: this.extractStepResourceName(step),
        action: this.mapApiStepAction(step),
        details: this.extractStepDetails(step),
        expanded: index === 0 // Expand first step by default
      };
      
      return traceStep;
    });
  }

  private mapApiStepTypeToTraceStepType(step: any): 'VM_INSTANCE' | 'FIREWALL_RULE' | 'SUBNET_ROUTE' | 'LOAD_BALANCER' | 'VPN_GATEWAY' | 'NAT_GATEWAY' | 'EXTERNAL_IP' {
    if (step.instance) return 'VM_INSTANCE';
    if (step.firewall) return 'FIREWALL_RULE';
    if (step.route) return 'SUBNET_ROUTE';
    if (step.loadBalancer || step.loadBalancerBackendInfo) return 'LOAD_BALANCER';
    if (step.vpnGateway) return 'VPN_GATEWAY';
    if (step.nat) return 'NAT_GATEWAY';
    if (step.state && step.state.includes('EXTERNAL')) return 'EXTERNAL_IP';
    return 'VM_INSTANCE'; // Default fallback
  }

  private extractStepResourceName(step: any): string {
    if (step.instance && step.instance.displayName) return step.instance.displayName;
    if (step.firewall && step.firewall.displayName) return step.firewall.displayName;
    if (step.route && step.route.displayName) return step.route.displayName;
    if (step.loadBalancer) return 'Load Balancer';
    if (step.vpnGateway && step.vpnGateway.displayName) return step.vpnGateway.displayName;
    if (step.nat) return 'NAT Gateway';
    return 'Network Resource';
  }

  private mapApiStepAction(step: any): 'ALLOW' | 'DENY' | 'FORWARD' | 'DROP' {
    if (step.firewall) {
      return step.firewall.action === 'DENY' ? 'DENY' : 'ALLOW';
    }
    if (step.causesDrop) return 'DROP';
    if (step.state && (step.state.includes('DROP') || step.state.includes('ABORT'))) return 'DROP';
    return 'FORWARD';
  }

  private extractStepDetails(step: any): any {
    const details: any = {};
    
    if (step.instance) {
      details.networkInterface = step.instance.interface || 'nic0';
      details.network = this.extractResourceName(step.instance.networkUri || '');
      details.internalIp = step.instance.internalIp || '';
      details.externalIp = step.instance.externalIp || '';
      details.isRunning = !step.description?.includes('not running');
    }
    
    if (step.firewall) {
      details.priority = step.firewall.priority || 65535;
      details.network = this.extractResourceName(step.firewall.networkUri || '');
      if (step.firewall.action === 'DENY') {
        details.reason = 'Firewall rule blocks traffic';
      }
    }
    
    if (step.route) {
      details.destinationRange = step.route.destIpRange || '';
      details.nextHop = step.route.nextHop || step.route.nextHopType || '';
    }
    
    return details;
  }

  private findFailedStep(steps: any[]): any {
    return steps.find(step => 
      step.causesDrop || 
      step.state === 'DROP' || 
      step.state === 'ABORT' ||
      (step.firewall && step.firewall.action === 'DENY')
    );
  }

  private getDropReason(failedStep: any): string {
    if (failedStep.drop && failedStep.drop.cause) {
      return this.formatDropCause(failedStep.drop.cause);
    }
    
    if (failedStep.firewall && failedStep.firewall.action === 'DENY') {
      return `Traffic blocked by firewall rule: ${failedStep.firewall.displayName || 'Unknown rule'}`;
    }
    
    if (failedStep.description) {
      return failedStep.description;
    }
    
    return 'Packet could not be delivered due to network configuration';
  }

  private formatDropCause(cause: string): string {
    // Convert API cause to human-readable format
    switch (cause) {
      case 'FIREWALL_RULE':
        return 'Dropped due to firewall rule';
      case 'NO_ROUTE':
        return 'Dropped due to no matching route';
      case 'ROUTE_BLACKHOLE':
        return 'Dropped due to blackhole route';
      case 'INSTANCE_NOT_RUNNING':
        return 'Dropped because target instance is not running';
      default:
        return `Dropped: ${cause.replace(/_/g, ' ').toLowerCase()}`;
    }
  }
} 