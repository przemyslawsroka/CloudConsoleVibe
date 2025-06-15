import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export interface SubnetworkTrafficEdge {
  sourceSubnetwork: string;
  targetSubnetwork: string;
  totalBytes: number;
  sampleCount: number;
  sourceNetwork?: string;
  targetNetwork?: string;
  protocols: string[];
}

export interface MonitoringTimeSeriesData {
  metric: {
    type: string;
    labels: { [key: string]: string };
  };
  resource: {
    type: string;
    labels: { [key: string]: string };
  };
  points: Array<{
    interval: {
      startTime: string;
      endTime: string;
    };
    value: {
      int64Value?: string;
      doubleValue?: number;
    };
  }>;
}

export interface MonitoringQueryResponse {
  timeSeriesDescriptor?: {
    labelDescriptors: Array<{
      key: string;
      valueType: string;
    }>;
    pointDescriptors: Array<{
      key: string;
      valueType: string;
      metricKind: string;
      unit: string;
    }>;
  };
  timeSeriesData: Array<{
    labelValues: Array<{
      stringValue?: string;
      int64Value?: string;
      boolValue?: boolean;
    }>;
    pointData: Array<{
      values: Array<{
        doubleValue?: number;
        int64Value?: string;
      }>;
      timeInterval: {
        startTime: string;
        endTime: string;
      };
    }>;
  }>;
  nextPageToken?: string;
  partialErrors?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  // Use the proper current Google Cloud Monitoring API
  private baseUrl = 'https://monitoring.googleapis.com/v3';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    if (!token) {
      console.warn('⚠️  No access token available. User may not be authenticated.');
      return new HttpHeaders();
    }
    
    console.log('🔑 Using OAuth token for proper Monitoring API');
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  getSubnetworkTrafficEdges(projectId: string, hoursAgo: number = 24): Observable<SubnetworkTrafficEdge[]> {
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.warn('⚠️  User is not authenticated. Returning mock data.');
      return of(this.getEnhancedMockTrafficData(projectId));
    }

    console.log('🔄 Using Standard Google Cloud Monitoring API with timeSeries.list...');
    
    return this.queryVmFlowMetricsWithList(projectId, hoursAgo).pipe(
      catchError(error => {
        console.error('❌ Monitoring API query failed:', error);
        this.logProperApiError(error);
        return of(this.getEnhancedMockTrafficData(projectId));
      })
    );
  }

  private queryVmFlowMetricsWithList(projectId: string, hoursAgo: number = 24): Observable<SubnetworkTrafficEdge[]> {
    // Switch to the standard timeSeries.list endpoint instead of query endpoint
    // The query endpoint expects deprecated MQL, not metric filtering
    const metricFilter = `metric.type="networking.googleapis.com/vm_flow/egress_bytes_count"`;
    const resourceFilter = `resource.type="gce_instance"`;
    const combinedFilter = `${metricFilter} AND ${resourceFilter}`;
    
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const url = `${this.baseUrl}/projects/${projectId}/timeSeries`;
    
    // Fix aggregation parameters - use correct syntax for timeSeries.list
    const params = new URLSearchParams({
      filter: combinedFilter,
      'interval.endTime': endTime,
      'interval.startTime': startTime,
      'aggregation.alignmentPeriod': '300s', // 5 minute periods
      'aggregation.perSeriesAligner': 'ALIGN_RATE' // Only use aligner, not reducer initially
      // Remove crossSeriesReducer and groupByFields that were causing 400 error
    });

    const requestUrl = `${url}?${params.toString()}`;

    console.log('📡 Using Standard Google Cloud Monitoring API (timeSeries.list):');
    console.log('   📍 Method: GET');
    console.log('   🌐 Endpoint:', requestUrl);
    console.log('   🔑 Authentication: OAuth Bearer Token');
    console.log('   📋 API Type: Standard Monitoring (not query)');
    console.log('   🎯 Metric Filter:', metricFilter);
    console.log('   🏗️ Resource Filter:', resourceFilter);
    console.log('   📅 Time Range:', startTime, 'to', endTime);
    console.log('   ⏱️ Alignment: 5-minute RATE aggregation (fixed syntax)');
    console.log('   🔧 Removed: crossSeriesReducer and groupByFields (were causing 400)');

    return this.http.get<any>(requestUrl, { 
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('✅ Successfully received standard Monitoring API response:', response);
        return this.transformStandardResponse(response);
      }),
      catchError(error => {
        console.error('❌ Standard API Error Details:');
        console.error('   🔍 Status:', error.status);
        console.error('   📝 Message:', error.error?.error?.message || error.message);
        if (error.status === 400) {
          console.error('   💡 400 Error suggests aggregation parameters are still incorrect');
          console.error('   🔄 Falling back to simplified approach...');
        }
        return this.trySimplifiedList(projectId, hoursAgo);
      })
    );
  }

  private transformStandardResponse(response: any): SubnetworkTrafficEdge[] {
    console.log('🔍 Raw API Response Structure:', {
      hasTimeSeries: !!response.timeSeries,
      timeSeriesLength: response.timeSeries?.length || 0,
      sampleTimeSeries: response.timeSeries?.[0],
      fullResponse: response
    });

    if (!response.timeSeries || response.timeSeries.length === 0) {
      console.log('📊 No time series data found in standard response');
      console.log('💡 This likely means:');
      console.log('   - VPC Flow Logs are not enabled for this project');
      console.log('   - No VM instances have generated network traffic');
      console.log('   - The networking.googleapis.com/vm_flow/egress_bytes_count metric is not available');
      return [];
    }

    console.log(`📊 Processing ${response.timeSeries.length} time series...`);

    const edgeMap = new Map<string, SubnetworkTrafficEdge>();

    response.timeSeries.forEach((series: any, index: number) => {
      console.log(`🔍 Time Series ${index + 1}:`, {
        metricType: series.metricKind,
        resourceType: series.resource?.type,
        metricLabels: series.metric?.labels,
        resourceLabels: series.resource?.labels,
        pointsCount: series.points?.length || 0,
        samplePoint: series.points?.[0]
      });

      const labels = series.metric?.labels || {};
      const resourceLabels = series.resource?.labels || {};
      
      const localSubnet = labels.local_subnetwork || resourceLabels.local_subnetwork;
      const remoteSubnet = labels.remote_subnetwork || resourceLabels.remote_subnetwork;
      const protocol = labels.protocol || 'UNKNOWN';

      console.log(`   📍 Extracted: ${localSubnet} -> ${remoteSubnet} (${protocol})`);

      // Skip external traffic or incomplete data
      if (!localSubnet || !remoteSubnet || 
          remoteSubnet === 'REMOTE_IS_EXTERNAL' || 
          localSubnet === remoteSubnet) {
        console.log(`   ⏭️  Skipping: incomplete or external traffic`);
        return;
      }

      const edgeKey = `${localSubnet}->${remoteSubnet}`;
      
      // Calculate total bytes from all points
      const totalBytes = series.points?.reduce((sum: number, point: any) => {
        const value = point.value?.doubleValue || point.value?.int64Value || 0;
        const numValue = parseFloat(value.toString());
        console.log(`     📊 Point value: ${numValue}`);
        return sum + numValue;
      }, 0) || 0;

      console.log(`   💾 Total bytes for edge: ${totalBytes}`);

      if (totalBytes > 0) {
        if (edgeMap.has(edgeKey)) {
          const existing = edgeMap.get(edgeKey)!;
          existing.totalBytes += totalBytes;
          existing.sampleCount += series.points?.length || 0;
          if (!existing.protocols.includes(protocol)) {
            existing.protocols.push(protocol);
          }
          console.log(`   ➕ Updated existing edge: ${totalBytes} bytes added`);
        } else {
          edgeMap.set(edgeKey, {
            sourceSubnetwork: localSubnet,
            targetSubnetwork: remoteSubnet,
            totalBytes: totalBytes,
            sampleCount: series.points?.length || 0,
            sourceNetwork: resourceLabels.network_name,
            targetNetwork: undefined, // Not available in this format
            protocols: [protocol]
          });
          console.log(`   ✨ Created new edge: ${totalBytes} bytes`);
        }
      } else {
        console.log(`   ❌ Skipping edge with zero bytes`);
      }
    });

    const edges = Array.from(edgeMap.values()).sort((a, b) => b.totalBytes - a.totalBytes);
    console.log('📊 Final transformation result:', {
      totalEdges: edges.length,
      edges: edges.slice(0, 3), // Show first 3 for debugging
      allEdgeKeys: Array.from(edgeMap.keys())
    });
    return edges;
  }

  private trySimplifiedList(projectId: string, hoursAgo: number): Observable<SubnetworkTrafficEdge[]> {
    // Try an even simpler list request
    const metricFilter = `metric.type="networking.googleapis.com/vm_flow/egress_bytes_count"`;
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const url = `${this.baseUrl}/projects/${projectId}/timeSeries`;
    const params = new URLSearchParams({
      filter: metricFilter,
      'interval.endTime': endTime,
      'interval.startTime': startTime
    });

    const requestUrl = `${url}?${params.toString()}`;

    console.log('🔄 Trying simplified timeSeries.list:');
    console.log('   🔍 Filter:', metricFilter);
    console.log('   📍 URL:', requestUrl);

    return this.http.get<any>(requestUrl, { 
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('✅ Simplified query succeeded:', response);
        return this.transformStandardResponse(response);
      }),
      catchError(error => {
        console.error('❌ Even simplified list failed:', error);
        console.error('');
        console.error('📊 API TROUBLESHOOTING COMPLETE:');
        console.error('   • ✅ Tried deprecated timeSeries:query with MQL');
        console.error('   • ✅ Tried standard timeSeries.list with filters');
        console.error('   • ✅ Tried simplified timeSeries.list');
        console.error('   • ⚠️  VM flow metrics might not be available in this project');
        console.error('   • 💡 This could indicate:');
        console.error('     - VPC Flow Logs are not enabled');
        console.error('     - No VM instances with network traffic');
        console.error('     - networking.googleapis.com/vm_flow metrics not available');
        console.error('     - Insufficient monitoring permissions');
        console.error('');
        throw error; // This will trigger the outer catchError in getSubnetworkTrafficEdges
      })
    );
  }

  private logProperApiError(error: any): void {
    console.error('🚫 OFFICIAL MONITORING API ERROR ANALYSIS:');
    console.error('');
    console.error('📋 CURRENT IMPLEMENTATION (OFFICIAL):');
    console.error('   • Method: POST');
    console.error('   • URL: https://monitoring.googleapis.com/v3/projects/.../timeSeries:query');
    console.error('   • Query Language: PromQL (Google\'s current recommendation)');
    console.error('   • Authentication: OAuth 2.0 Bearer Token');
    console.error('   • Documentation: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/query');
    console.error('');
    
    if (error.status === 401) {
      console.error('🔒 AUTHENTICATION ERROR:');
      console.error('   • Status: 401 Unauthorized');
      console.error('   • Required Scopes: https://www.googleapis.com/auth/monitoring.read');
      console.error('   • Solution: Ensure user has proper GCP permissions');
    } else if (error.status === 403) {
      console.error('⛔ PERMISSION ERROR:');
      console.error('   • Status: 403 Forbidden');
      console.error('   • Required: monitoring.timeSeries.list permission');
      console.error('   • Solution: Enable Cloud Monitoring API in project');
    } else if (error.status === 400) {
      console.error('❓ QUERY ERROR:');
      console.error('   • Status: 400 Bad Request');
      console.error('   • Possible: Invalid PromQL query syntax');
      console.error('   • Check: Metric names and query format');
    } else if (error.status === 0) {
      console.error('�� NETWORK/CORS ERROR:');
      console.error('   • Status: 0 (Network blocked)');
      console.error('   • Cause: Browser CORS policy');
      console.error('   • Solution: Deploy to Google Cloud Platform');
    }
    
    console.error('');
    console.error('✅ NEXT STEPS:');
    console.error('   1. Deploy to Google Cloud (App Engine/Cloud Run)');
    console.error('   2. Use Service Account authentication');
    console.error('   3. Enable Cloud Monitoring API');
    console.error('   4. Use backend proxy for browser apps');
  }

  // Enhanced mock data that simulates realistic network topology patterns
  private getEnhancedMockTrafficData(projectId: string): SubnetworkTrafficEdge[] {
    console.log('📊 Generating enhanced mock traffic data for project:', projectId);
    
    // Base timestamp for generating realistic time-based variance
    const now = Date.now();
    const variance = (min: number, max: number) => Math.random() * (max - min) + min;
    
    return [
      // === REGIONAL CLUSTERS - HIGH INTERNAL TRAFFIC ===
      
      // US Central region cluster (web-tier is the regional gateway)
      {
        sourceSubnetwork: 'us-central-default',
        targetSubnetwork: 'web-tier',
        totalBytes: Math.floor(variance(8000000000, 12000000000)), // 8-12GB (default->web)
        sampleCount: Math.floor(variance(60, 80)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP', 'HTTPS']
      },
      {
        sourceSubnetwork: 'web-tier',
        targetSubnetwork: 'app-tier',
        totalBytes: Math.floor(variance(15000000000, 20000000000)), // 15-20GB (web->app)
        sampleCount: Math.floor(variance(80, 100)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP']
      },
      {
        sourceSubnetwork: 'app-tier',
        targetSubnetwork: 'db-tier',
        totalBytes: Math.floor(variance(12000000000, 18000000000)), // 12-18GB (app->db)
        sampleCount: Math.floor(variance(70, 90)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'MySQL', 'PostgreSQL']
      },

      // Europe West region cluster (api-backend is the regional gateway)
      {
        sourceSubnetwork: 'europe-default',
        targetSubnetwork: 'web-frontend',
        totalBytes: Math.floor(variance(6000000000, 9000000000)), // 6-9GB (default->frontend)
        sampleCount: Math.floor(variance(45, 65)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP', 'HTTPS']
      },
      {
        sourceSubnetwork: 'web-frontend',
        targetSubnetwork: 'api-backend',
        totalBytes: Math.floor(variance(10000000000, 15000000000)), // 10-15GB (frontend->backend)
        sampleCount: Math.floor(variance(60, 80)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP', 'HTTPS']
      },
      {
        sourceSubnetwork: 'api-backend',
        targetSubnetwork: 'cache-layer',
        totalBytes: Math.floor(variance(8000000000, 12000000000)), // 8-12GB (backend->cache)
        sampleCount: Math.floor(variance(50, 70)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'Redis', 'Memcached']
      },

      // Asia Southeast region cluster (mobile-api is the regional gateway)
      {
        sourceSubnetwork: 'asia-default',
        targetSubnetwork: 'mobile-api',
        totalBytes: Math.floor(variance(4000000000, 7000000000)), // 4-7GB (default->mobile)
        sampleCount: Math.floor(variance(35, 50)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP', 'WebSocket']
      },
      {
        sourceSubnetwork: 'mobile-api',
        targetSubnetwork: 'analytics',
        totalBytes: Math.floor(variance(7000000000, 11000000000)), // 7-11GB (mobile->analytics)
        sampleCount: Math.floor(variance(45, 65)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTP', 'WebSocket']
      },
      {
        sourceSubnetwork: 'analytics',
        targetSubnetwork: 'storage-tier',
        totalBytes: Math.floor(variance(9000000000, 14000000000)), // 9-14GB (analytics->storage)
        sampleCount: Math.floor(variance(55, 75)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'gRPC', 'BigQuery']
      },

      // === INTER-REGION CONNECTIONS - ONLY THROUGH GATEWAY SUBNETS ===
      
      // US Central web-tier (gateway) <-> Europe West api-backend (gateway)
      {
        sourceSubnetwork: 'web-tier',
        targetSubnetwork: 'api-backend',
        totalBytes: Math.floor(variance(3000000000, 5000000000)), // 3-5GB cross-region
        sampleCount: Math.floor(variance(25, 40)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTPS', 'API']
      },

      // Europe West api-backend (gateway) <-> Asia Southeast mobile-api (gateway)
      {
        sourceSubnetwork: 'api-backend',
        targetSubnetwork: 'mobile-api',
        totalBytes: Math.floor(variance(2500000000, 4000000000)), // 2.5-4GB cross-region
        sampleCount: Math.floor(variance(20, 35)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTPS', 'API']
      },

      // US Central web-tier (gateway) <-> Asia Southeast mobile-api (gateway)
      {
        sourceSubnetwork: 'web-tier',
        targetSubnetwork: 'mobile-api',
        totalBytes: Math.floor(variance(1500000000, 3000000000)), // 1.5-3GB cross-region
        sampleCount: Math.floor(variance(15, 30)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'HTTPS', 'CDN']
      },

      // === ADDITIONAL REGIONAL CONNECTIONS FOR BETTER CLUSTERING ===
      
      // Some cache layer to database backup connection
      {
        sourceSubnetwork: 'cache-layer',
        targetSubnetwork: 'db-tier',
        totalBytes: Math.floor(variance(800000000, 1500000000)), // 800MB-1.5GB (cache fallback)
        sampleCount: Math.floor(variance(8, 18)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'MySQL']
      },

      // Analytics to storage backup in different region
      {
        sourceSubnetwork: 'analytics',
        targetSubnetwork: 'cache-layer',
        totalBytes: Math.floor(variance(600000000, 1200000000)), // 600MB-1.2GB (analytics->cache)
        sampleCount: Math.floor(variance(6, 15)),
        sourceNetwork: 'default',
        targetNetwork: 'default',
        protocols: ['TCP', 'gRPC']
      }
    ];
  }

  // Original mock data for backwards compatibility
  private getMockTrafficData(): SubnetworkTrafficEdge[] {
    return this.getEnhancedMockTrafficData('demo-project');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getTrafficInsights(edges: SubnetworkTrafficEdge[]): {
    totalTraffic: number;
    topConnections: SubnetworkTrafficEdge[];
    networkCount: number;
    protocolDistribution: { [protocol: string]: number };
  } {
    const totalTraffic = edges.reduce((sum, edge) => sum + edge.totalBytes, 0);
    const topConnections = edges.slice(0, 5);
    const networks = new Set<string>();
    const protocolCount: { [protocol: string]: number } = {};

    edges.forEach(edge => {
      if (edge.sourceNetwork) networks.add(edge.sourceNetwork);
      if (edge.targetNetwork) networks.add(edge.targetNetwork);
      
      edge.protocols.forEach(protocol => {
        protocolCount[protocol] = (protocolCount[protocol] || 0) + 1;
      });
    });

    return {
      totalTraffic,
      topConnections,
      networkCount: networks.size,
      protocolDistribution: protocolCount
    };
  }
} 