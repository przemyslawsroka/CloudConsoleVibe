import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export interface FlowLogEntry {
  timestamp: Date;
  sourceIp: string;
  sourceVpcNetworkProject: string;
  sourceVpcNetwork: string;
  destinationIp: string;
  destinationVpcNetworkProject?: string;
  destinationVpcNetwork?: string;
  protocol: string;
  sourcePort: number;
  destinationPort: number;
  bytes: number;
  packets: number;
  rttMsec?: number;
  action: 'ACCEPT' | 'REJECT';
  region: string;
  connection: string;
  // Enhanced fields from the sophisticated query
  sourceInstanceName?: string;
  destinationInstanceName?: string;
  sourceInstanceProjectId?: string;
  destinationInstanceProjectId?: string;
  sourceGcpZone?: string;
  destinationGcpZone?: string;
  metricValueSum?: number;
  details?: any;
}

export interface FlowMetrics {
  timestamp: Date;
  value: number;
  sourceIp?: string;
  destinationIp?: string;
  protocol?: string;
  bytes?: number;
  packets?: number;
  rttMsec?: number;
}

export interface FlowAnalysisResult {
  timeSeriesData: FlowMetrics[];
  flowLogs: FlowLogEntry[];
  totalRows: number;
  queryExecutionTime: number;
  error?: string;
}

export interface FilterOptions {
  sourceIp?: string;
  destinationIp?: string;
  vpcNetworkProject?: string;
  vpcNetwork?: string;
  protocol?: string;
  port?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export type MetricType = 'bytes' | 'packets' | 'connections' | 'latency';
export type AggregationPeriod = '1m' | '5m' | '15m' | '1h' | '6h' | '1d';

@Injectable({
  providedIn: 'root'
})
export class FlowAnalyzerService {
  private baseUrl = 'https://logging.googleapis.com/v2';
  private logAnalyticsBaseUrl = 'https://logging.googleapis.com/v2';
  
  // Use proxy URLs for development to avoid CORS issues
  private isDevelopment = window.location.hostname === 'localhost';
  private proxyBaseUrl = '/api/logging/v2';
  
  // Demo data cache for consistent results
  private demoDataCache: FlowAnalysisResult | null = null;
  private lastDemoQuery: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
    // Use proxy URLs in development
    if (this.isDevelopment) {
      this.baseUrl = this.proxyBaseUrl;
      this.logAnalyticsBaseUrl = this.proxyBaseUrl;
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  queryFlowLogs(
    projectId: string,
    filters: FilterOptions,
    metricType: MetricType = 'bytes',
    aggregationPeriod: AggregationPeriod = '5m',
    customQuery?: string,
    logBucket?: string,
    location?: string,
    logView?: string
  ): Observable<FlowAnalysisResult> {
    // Return demo data in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Generating mock Flow Analyzer data');
      
      // Create a cache key based on the query parameters
      const queryKey = JSON.stringify({
        filters: filters,
        metricType: metricType,
        aggregationPeriod: aggregationPeriod,
        customQuery: customQuery
      });
      
      // Return cached data if the query hasn't changed
      if (this.demoDataCache && this.lastDemoQuery === queryKey) {
        console.log('🎭 Demo mode: Using cached data for consistency');
        return of(this.demoDataCache);
      }
      
      // Generate new demo data and cache it
      const newDemoData = this.generateDemoFlowData(filters, metricType, aggregationPeriod);
      this.demoDataCache = newDemoData;
      this.lastDemoQuery = queryKey;
      
      return of(newDemoData);
    }
    
    // Default Log Analytics bucket configuration
    const bucketName = logBucket || '_Default';
    const bucketLocation = location || 'global';
    const viewName = logView || '_AllLogs';
    
    // Check if we have authentication token
    const token = this.authService.getAccessToken();
    if (!token) {
      console.warn('No authentication token available, using mock data');
      return of(this.createEmptyResult('Authentication required. Please sign in to Google Cloud.'));
    }
    
    const query = customQuery || this.buildLogAnalyticsQuery(
      projectId, 
      bucketName, 
      bucketLocation, 
      filters, 
      metricType, 
      aggregationPeriod,
      viewName
    );
    
    const url = `${this.logAnalyticsBaseUrl}/projects/${projectId}/locations/${bucketLocation}/buckets/${bucketName}/views/${viewName}:queryRequest`;
    
    const payload = {
      query: query,
      pageSize: 1000
    };

    console.log('=== TRYING LOG ANALYTICS API ===');
    console.log('Request URL:', url);
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('=== END LOG ANALYTICS REQUEST ===');

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Log Analytics API successful:', response);
        return this.transformLogAnalyticsResponse(response, metricType);
      }),
      catchError(error => {
        console.error('❌ Log Analytics API failed:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        // Check for specific syntax errors
        if (error.error && error.error.message && error.error.message.includes('Unparseable filter')) {
          console.error('🚨 SQL Syntax Error detected:', error.error.message);
          console.log('🔄 Falling back to standard Cloud Logging API due to syntax error...');
          return this.queryFlowLogsStandardAPI(projectId, filters, metricType, aggregationPeriod, customQuery);
        }
        
        // Check if it's a specific API error
        if (error.status === 404) {
          console.log('🔄 Log Analytics not available, trying standard Logging API...');
          return this.queryFlowLogsStandardAPI(projectId, filters, metricType, aggregationPeriod, customQuery);
        } else if (error.status === 401 || error.status === 403) {
          console.error('🔐 Authentication/Permission error');
          return of(this.createEmptyResult(`Authentication error: ${error.message}. Please check your Google Cloud permissions.`));
        } else {
          console.log('🔄 Falling back to standard Cloud Logging API...');
          return this.queryFlowLogsStandardAPI(projectId, filters, metricType, aggregationPeriod, customQuery);
        }
      })
    );
  }

  private queryFlowLogsStandardAPI(
    projectId: string,
    filters: FilterOptions,
    metricType: MetricType,
    aggregationPeriod: AggregationPeriod,
    customQuery?: string
  ): Observable<FlowAnalysisResult> {
    const query = customQuery || this.buildStandardLoggingQuery(filters);
    
    const url = `${this.baseUrl}/entries:list`;
    const payload = {
      resourceNames: [`projects/${projectId}`],
      filter: query,
      orderBy: 'timestamp desc',
      pageSize: 1000
    };

    console.log('=== TRYING STANDARD LOGGING API ===');
    console.log('Request URL:', url);
    console.log('Query:', query);
    console.log('=== END STANDARD LOGGING REQUEST ===');

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Standard Logging API successful:', response);
        return this.transformStandardLoggingResponse(response, metricType);
      }),
      catchError(error => {
        console.error('❌ Standard Logging API also failed:', error);
        
        // Provide helpful guidance based on error type
        let errorMessage = 'Unable to fetch VPC Flow Logs. ';
        
        if (error.status === 401) {
          errorMessage += 'Please sign in to your Google Cloud account.';
        } else if (error.status === 403) {
          errorMessage += 'You need "Logging Viewer" permissions to access VPC Flow Logs.';
        } else if (error.status === 404) {
          errorMessage += 'VPC Flow Logs may not be enabled for this project, or the project was not found.';
        } else if (error.status === 0) {
          errorMessage += 'Network connectivity issue. Check your internet connection and try again.';
        } else {
          errorMessage += `API Error: ${error.status} ${error.statusText}`;
        }
        
        return of(this.createEmptyResult(errorMessage));
      })
    );
  }

  private buildLogAnalyticsQuery(
    projectId: string,
    bucketName: string,
    location: string,
    filters: FilterOptions,
    metricType: MetricType,
    aggregationPeriod: AggregationPeriod,
    viewName: string
  ): string {
    const timeCondition = this.buildTimeCondition(filters.timeRange);
    const filterConditions = this.buildAdvancedFilterConditions(filters);
    
    // Construct the FROM clause for Log Analytics
    const fromClause = `\`${projectId}.${location}.${bucketName}.${viewName}\``;
    
    // Get the metric field based on type
    const metricField = this.getMetricField(metricType);
    
    // Build the WHERE clause properly
    let whereClause = `log_id IN ('compute.googleapis.com/vpc_flows', 'networkmanagement.googleapis.com/vpc_flows')
          AND ${timeCondition}
          AND JSON_VALUE(json_payload.reporter) = 'SRC'`;
    
    // Only add filter conditions if they exist
    if (filterConditions.trim()) {
      whereClause += filterConditions;
    }
    
    // Build a simplified but effective query
    return `
      SELECT
        JSON_VALUE(json_payload.connection.src_ip) AS src_ip,
        JSON_VALUE(json_payload.src_vpc.project_id) AS src_vpc_project_id,
        JSON_VALUE(json_payload.src_vpc.vpc_name) AS src_vpc_name,
        JSON_VALUE(json_payload.connection.dest_ip) AS dest_ip,
        JSON_VALUE(json_payload.connection.protocol) AS protocol,
        CAST(JSON_VALUE(json_payload.connection.src_port) AS INT64) AS src_port,
        CAST(JSON_VALUE(json_payload.connection.dest_port) AS INT64) AS dest_port,
        JSON_VALUE(json_payload.src_instance.project_id) AS src_instance_project_id,
        JSON_VALUE(json_payload.src_instance.zone) AS src_gcp_zone,
        JSON_VALUE(json_payload.src_instance.vm_name) AS src_instance_name,
        JSON_VALUE(json_payload.dest_instance.project_id) AS dest_instance_project_id,
        JSON_VALUE(json_payload.dest_instance.zone) AS dest_gcp_zone,
        JSON_VALUE(json_payload.dest_instance.vm_name) AS dest_instance_name,
        SUM(CAST(JSON_VALUE(json_payload.${metricField}) AS INT64)) AS metric_value_sum
      FROM ${fromClause}
      WHERE ${whereClause}
      GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
      ORDER BY metric_value_sum DESC
      LIMIT 5000
    `.trim();
  }

  private getMetricField(metricType: MetricType): string {
    switch (metricType) {
      case 'bytes':
        return 'bytes_sent';
      case 'packets':
        return 'packets';
      case 'connections':
        return 'bytes_sent'; // Use bytes_sent as a proxy for connections
      case 'latency':
        return 'rtt_msec';
      default:
        return 'bytes_sent';
    }
  }

  private getAggregationWindowMs(period: AggregationPeriod): number {
    switch (period) {
      case '1m': return 60000; // 1 minute
      case '5m': return 300000; // 5 minutes
      case '15m': return 900000; // 15 minutes
      case '1h': return 3600000; // 1 hour
      case '6h': return 21600000; // 6 hours
      case '1d': return 86400000; // 1 day
      default: return 300000; // Default to 5 minutes
    }
  }

  private buildAdvancedFilterConditions(filters: FilterOptions): string {
    const conditions: string[] = [];

    if (filters.sourceIp) {
      conditions.push(`JSON_VALUE(json_payload.connection.src_ip) = "${filters.sourceIp}"`);
    }

    if (filters.destinationIp) {
      conditions.push(`JSON_VALUE(json_payload.connection.dest_ip) = "${filters.destinationIp}"`);
    }

    if (filters.vpcNetworkProject) {
      conditions.push(`JSON_VALUE(json_payload.src_vpc.project_id) = "${filters.vpcNetworkProject}"`);
    }

    if (filters.vpcNetwork) {
      conditions.push(`JSON_VALUE(json_payload.src_vpc.vpc_name) = "${filters.vpcNetwork}"`);
    }

    if (filters.protocol) {
      conditions.push(`JSON_VALUE(json_payload.connection.protocol) = "${filters.protocol.toUpperCase()}"`);
    }

    if (filters.port) {
      conditions.push(`(JSON_VALUE(json_payload.connection.src_port) = "${filters.port}" OR JSON_VALUE(json_payload.connection.dest_port) = "${filters.port}")`);
    }

    return conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  }

  private buildStandardLoggingQuery(filters: FilterOptions): string {
    const timeCondition = `timestamp>="${filters.timeRange.start.toISOString()}" AND timestamp<="${filters.timeRange.end.toISOString()}"`;
    
    let filterConditions = [
      // Use proper logName syntax for VPC Flow Logs
      '(logName=~"projects/.*/logs/compute.googleapis.com%2Fvpc_flows" OR logName=~"projects/.*/logs/networkmanagement.googleapis.com%2Fvpc_flows")',
      'jsonPayload.reporter="SRC"',
      timeCondition
    ];

    if (filters.sourceIp) {
      filterConditions.push(`jsonPayload.connection.src_ip="${filters.sourceIp}"`);
    }

    if (filters.destinationIp) {
      filterConditions.push(`jsonPayload.connection.dest_ip="${filters.destinationIp}"`);
    }

    if (filters.vpcNetworkProject) {
      filterConditions.push(`jsonPayload.src_vpc.project_id="${filters.vpcNetworkProject}"`);
    }

    if (filters.vpcNetwork) {
      filterConditions.push(`jsonPayload.src_vpc.vpc_name="${filters.vpcNetwork}"`);
    }

    if (filters.protocol) {
      filterConditions.push(`jsonPayload.connection.protocol="${filters.protocol}"`);
    }

    if (filters.port) {
      filterConditions.push(`(jsonPayload.connection.src_port="${filters.port}" OR jsonPayload.connection.dest_port="${filters.port}")`);
    }

    return filterConditions.join(' AND ');
  }

  private buildTimeCondition(timeRange: { start: Date; end: Date }): string {
    const startTime = timeRange.start.toISOString();
    const endTime = timeRange.end.toISOString();
    return `timestamp >= TIMESTAMP("${startTime}") AND timestamp <= TIMESTAMP("${endTime}")`;
  }

  private transformLogAnalyticsResponse(response: any, metricType: MetricType): FlowAnalysisResult {
    console.log('Transforming Log Analytics response:', response);
    
    if (!response || !response.rows) {
      console.warn('No rows in Log Analytics response');
      return {
        timeSeriesData: [],
        flowLogs: [],
        totalRows: 0,
        queryExecutionTime: response?.executionTime || 0
      };
    }

    const timeSeriesData: FlowMetrics[] = [];
    const flowLogs: FlowLogEntry[] = [];

    response.rows.forEach((row: any, index: number) => {
      try {
        // The sophisticated query returns these columns in order:
        // [src_ip, src_vpc_project_id, src_vpc_name, dest_ip, protocol, src_port, dest_port,
        //  src_instance_project_id, src_gcp_zone, src_instance_name, 
        //  dest_instance_project_id, dest_gcp_zone, dest_instance_name, metric_value_sum]
        
        const [
          srcIp, srcVpcProjectId, srcVpcName, destIp, protocol, srcPort, destPort,
          srcInstanceProjectId, srcGcpZone, srcInstanceName,
          destInstanceProjectId, destGcpZone, destInstanceName, metricValueSum
        ] = row;
        
        const timestamp = new Date(); // Use current time since we don't have time dimension in aggregated results
        const value = parseFloat(metricValueSum) || 0;

        // Create time series data point
        timeSeriesData.push({
          timestamp,
          value,
          sourceIp: srcIp || 'Unknown',
          destinationIp: destIp || 'Unknown',
          protocol: protocol || 'Unknown',
          bytes: metricType === 'bytes' ? value : undefined,
          packets: metricType === 'packets' ? value : undefined,
          rttMsec: metricType === 'latency' ? value : undefined
        });

        // Create enhanced flow log entry
        flowLogs.push({
          timestamp,
          sourceIp: srcIp || 'Unknown',
          sourceVpcNetworkProject: srcVpcProjectId || 'Unknown',
          sourceVpcNetwork: srcVpcName || 'Unknown',
          destinationIp: destIp || 'Unknown',
          destinationVpcNetworkProject: destInstanceProjectId,
          destinationVpcNetwork: 'Unknown', // Not available in this query
          protocol: protocol || 'Unknown',
          sourcePort: parseInt(srcPort) || 0,
          destinationPort: parseInt(destPort) || 0,
          bytes: metricType === 'bytes' ? value : 0,
          packets: metricType === 'packets' ? value : 0,
          rttMsec: metricType === 'latency' ? value : undefined,
          action: 'ACCEPT',
          region: 'Unknown', // Would need additional query
          connection: `conn-${index}-${timestamp.getTime()}`,
          // Enhanced fields
          sourceInstanceName: srcInstanceName,
          destinationInstanceName: destInstanceName,
          sourceInstanceProjectId: srcInstanceProjectId,
          destinationInstanceProjectId: destInstanceProjectId,
          sourceGcpZone: srcGcpZone,
          destinationGcpZone: destGcpZone,
          metricValueSum: value,
          details: { 
            aggregated: true,
            queryType: 'sophisticated',
            metricType: metricType
          }
        });
      } catch (error) {
        console.warn('Error processing row:', row, error);
      }
    });

    // Sort by metric value descending (most significant flows first)
    const sortedFlowLogs = flowLogs.sort((a, b) => (b.metricValueSum || 0) - (a.metricValueSum || 0));
    const sortedTimeSeriesData = timeSeriesData.sort((a, b) => b.value - a.value);

    return {
      timeSeriesData: sortedTimeSeriesData,
      flowLogs: sortedFlowLogs.slice(0, 100), // Limit for display
      totalRows: response.rows.length,
      queryExecutionTime: response.executionTime || 0
    };
  }

  private transformStandardLoggingResponse(response: any, metricType: MetricType): FlowAnalysisResult {
    const entries = response.entries || [];
    const flowLogs: FlowLogEntry[] = entries.map((entry: any) => {
      const payload = entry.jsonPayload || {};
      const connection = payload.connection || {};
      const srcVpc = payload.src_vpc || {};
      const destVpc = payload.dest_vpc || {};
      const srcInstance = payload.src_instance || {};
      const destInstance = payload.dest_instance || {};
      
      return {
        timestamp: new Date(entry.timestamp),
        sourceIp: connection.src_ip || payload.src_ip || 'Unknown',
        sourceVpcNetworkProject: srcVpc.project_id || payload.src_vpc_project_id || 'Unknown',
        sourceVpcNetwork: srcVpc.vpc_name || payload.src_vpc_name || 'Unknown',
        destinationIp: connection.dest_ip || payload.dest_ip || 'Unknown',
        destinationVpcNetworkProject: destVpc.project_id || payload.dest_vpc_project_id,
        destinationVpcNetwork: destVpc.vpc_name || payload.dest_vpc_name,
        protocol: connection.protocol || payload.protocol || 'Unknown',
        sourcePort: parseInt(connection.src_port || payload.src_port) || 0,
        destinationPort: parseInt(connection.dest_port || payload.dest_port) || 0,
        bytes: parseInt(payload.bytes_sent) || 0,
        packets: parseInt(payload.packets) || 0,
        rttMsec: parseFloat(payload.rtt_msec),
        action: payload.action || 'ACCEPT',
        region: payload.region || srcInstance.region || 'Unknown',
        connection: payload.connection_name || connection.name || 'Unknown',
        // Enhanced fields
        sourceInstanceName: srcInstance.vm_name || payload.src_instance_name,
        destinationInstanceName: destInstance.vm_name || payload.dest_instance_name,
        sourceInstanceProjectId: srcInstance.project_id,
        destinationInstanceProjectId: destInstance.project_id,
        sourceGcpZone: srcInstance.zone,
        destinationGcpZone: destInstance.zone,
        details: payload
      };
    });

    const timeSeriesData: FlowMetrics[] = this.aggregateTimeSeriesData(flowLogs, metricType);

    return {
      timeSeriesData,
      flowLogs: flowLogs.slice(0, 100), // Limit for display
      totalRows: entries.length,
      queryExecutionTime: response.executionTime || 0
    };
  }

  private aggregateTimeSeriesData(flowLogs: FlowLogEntry[], metricType: MetricType): FlowMetrics[] {
    const aggregated = new Map<string, FlowMetrics>();

    flowLogs.forEach(log => {
      // Round timestamp to 5-minute intervals for aggregation
      const roundedTime = new Date(Math.floor(log.timestamp.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));
      const key = `${roundedTime.getTime()}-${log.sourceIp}-${log.destinationIp}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          timestamp: roundedTime,
          value: 0,
          sourceIp: log.sourceIp,
          destinationIp: log.destinationIp,
          protocol: log.protocol,
          bytes: 0,
          packets: 0,
          rttMsec: 0
        });
      }

      const metrics = aggregated.get(key)!;
      
      switch (metricType) {
        case 'bytes':
          metrics.value += log.bytes;
          metrics.bytes = (metrics.bytes || 0) + log.bytes;
          break;
        case 'packets':
          metrics.value += log.packets;
          metrics.packets = (metrics.packets || 0) + log.packets;
          break;
        case 'connections':
          metrics.value += 1;
          break;
        case 'latency':
          metrics.value = log.rttMsec || 0;
          metrics.rttMsec = log.rttMsec;
          break;
      }
    });

    return Array.from(aggregated.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getAvailableVpcNetworks(projectId: string): Observable<string[]> {
    // Return demo data in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using demo VPC networks');
      return of([
        'default',
        'vpc-prod',
        'vpc-dev',
        'shared-vpc',
        'management-vpc'
      ]);
    }
    
    // This would normally query the Compute API for VPC networks
    return of([
      'default',
      'przemekroka-test',
      'custom-vpc-1',
      'custom-vpc-2'
    ]);
  }

  getCommonProtocols(): string[] {
    return ['TCP', 'UDP', 'ICMP', 'ESP', 'AH', 'SCTP'];
  }

  // Log Analytics setup and validation helpers
  async checkLogAnalyticsAvailability(
    projectId: string, 
    location: string = 'global', 
    bucketName: string = '_Default'
  ): Promise<{ available: boolean; message: string; setupInstructions?: string[] }> {
    // Return demo availability in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Simulating Log Analytics availability');
      return {
        available: true,
        message: 'Log Analytics is available in demo mode with sample data.'
      };
    }
    
    try {
      const url = `${this.logAnalyticsBaseUrl}/projects/${projectId}/locations/${location}/buckets/${bucketName}`;
      
      const response = await this.http.get<any>(url, { headers: this.getHeaders() }).toPromise();
      
      if (response) {
        return {
          available: true,
          message: 'Log Analytics is available for this project and location.'
        };
      }
      
      return {
        available: false,
        message: 'Log Analytics bucket not found.',
        setupInstructions: this.getLogAnalyticsSetupInstructions()
      };
    } catch (error: any) {
      console.error('Error checking Log Analytics availability:', error);
      
      if (error.status === 404) {
        return {
          available: false,
          message: 'Log Analytics bucket not found or not upgraded.',
          setupInstructions: this.getLogAnalyticsSetupInstructions()
        };
      }
      
      if (error.status === 403) {
        return {
          available: false,
          message: 'Insufficient permissions to access Log Analytics. You need "roles/logging.viewer" or "roles/logging.viewAccessor" permissions.',
          setupInstructions: this.getPermissionSetupInstructions()
        };
      }
      
      return {
        available: false,
        message: `Error checking Log Analytics: ${error.message || 'Unknown error'}`,
        setupInstructions: this.getLogAnalyticsSetupInstructions()
      };
    }
  }

  private getLogAnalyticsSetupInstructions(): string[] {
    return [
      '1. Enable VPC Flow Logs for your VPC networks',
      '2. Upgrade your log bucket to use Log Analytics:',
      '   • Go to Cloud Logging > Log Analytics',
      '   • Select your project and location',
      '   • Upgrade the _Default bucket or create a new one',
      '3. Ensure VPC Flow Logs are routed to the upgraded bucket',
      '4. Wait for logs to start flowing (may take 5-10 minutes)',
      '5. Verify IAM permissions: "roles/logging.viewer" or "roles/logging.viewAccessor"'
    ];
  }

  private getPermissionSetupInstructions(): string[] {
    return [
      '1. Grant the required IAM role to your account:',
      '   • "roles/logging.viewer" (for full log access), or',
      '   • "roles/logging.viewAccessor" (for specific log views)',
      '2. The role can be granted at project, folder, or organization level',
      '3. Contact your GCP administrator if you need help with permissions'
    ];
  }

  getLogAnalyticsQueryExample(projectId: string): string {
    return `
-- Example Log Analytics query for VPC Flow Logs
SELECT
  DATETIME_TRUNC(DATETIME(timestamp), MINUTE) as time_window,
  jsonPayload.src_ip as source_ip,
  jsonPayload.dest_ip as destination_ip,
  jsonPayload.protocol,
  SUM(CAST(jsonPayload.bytes_sent as INT64)) as total_bytes,
  COUNT(*) as flow_count
FROM \`${projectId}.global._Default._AllLogs\`
WHERE
  timestamp >= TIMESTAMP("2024-01-01T00:00:00Z") 
  AND timestamp <= TIMESTAMP("2024-01-01T23:59:59Z")
  AND logName LIKE "projects/${projectId}/logs/compute.googleapis.com%vpc_flows"
  AND jsonPayload.reporter = "SRC"
GROUP BY time_window, source_ip, destination_ip, protocol
ORDER BY time_window DESC, total_bytes DESC
LIMIT 100
    `.trim();
  }

  // Log Buckets and Views API methods
  getLogBuckets(projectId: string, location: string = 'global'): Observable<LogBucket[]> {
    // Return demo buckets in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using demo log buckets');
      return of([
        {
          name: '_Default',
          displayName: '_Default',
          description: 'Default log bucket (Demo)',
          location: location,
          analyticsEnabled: true,
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/_Default`
        },
        {
          name: '_Required',
          displayName: '_Required',
          description: 'Required log bucket (Demo)',
          location: location,
          analyticsEnabled: false,
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/_Required`
        },
        {
          name: 'vpc-flow-logs',
          displayName: 'VPC Flow Logs',
          description: 'Dedicated bucket for VPC Flow Logs (Demo)',
          location: location,
          analyticsEnabled: true,
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/vpc-flow-logs`
        }
      ]);
    }
    
    const baseUrl = this.isDevelopment ? this.proxyBaseUrl : 'https://logging.googleapis.com/v2';
    const url = `${baseUrl}/projects/${projectId}/locations/${location}/buckets`;
    
    console.log('Getting log buckets from:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const buckets = response.buckets || [];
        console.log('Received buckets:', buckets);
        return buckets.map((bucket: any) => ({
          name: this.extractBucketName(bucket.name),
          displayName: bucket.displayName || this.extractBucketName(bucket.name),
          description: bucket.description || '',
          location: location,
          analyticsEnabled: bucket.analyticsEnabled || false,
          createTime: bucket.createTime,
          updateTime: bucket.updateTime,
          resourceName: bucket.name
        }));
      }),
      catchError(error => {
        console.error('Error fetching log buckets:', error);
        console.log('Falling back to standard bucket names...');
        
        // Provide fallback with standard bucket names that exist in most projects
        return of([
          {
            name: '_Default',
            displayName: '_Default',
            description: 'Default log bucket',
            location: location,
            analyticsEnabled: false,
            createTime: '',
            updateTime: '',
            resourceName: `projects/${projectId}/locations/${location}/buckets/_Default`
          },
          {
            name: '_Required',
            displayName: '_Required',
            description: 'Required log bucket',
            location: location,
            analyticsEnabled: false,
            createTime: '',
            updateTime: '',
            resourceName: `projects/${projectId}/locations/${location}/buckets/_Required`
          }
        ]);
      })
    );
  }

  getLogViews(projectId: string, location: string = 'global', bucketName: string = '_Default'): Observable<LogView[]> {
    // Return demo views in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using demo log views');
      return of([
        {
          name: '_AllLogs',
          displayName: '_AllLogs',
          description: 'Access to all logs (Demo)',
          filter: '',
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/${bucketName}/views/_AllLogs`
        },
        {
          name: '_Default',
          displayName: '_Default',
          description: 'Default view (Demo)',
          filter: '',
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/${bucketName}/views/_Default`
        },
        {
          name: 'vpc-flows-only',
          displayName: 'VPC Flows Only',
          description: 'Filtered view for VPC Flow Logs only (Demo)',
          filter: 'logName:"projects/' + projectId + '/logs/compute.googleapis.com%2Fvpc_flows"',
          createTime: '2024-01-01T00:00:00Z',
          updateTime: '2024-01-01T00:00:00Z',
          resourceName: `projects/${projectId}/locations/${location}/buckets/${bucketName}/views/vpc-flows-only`
        }
      ]);
    }
    
    const baseUrl = this.isDevelopment ? this.proxyBaseUrl : 'https://logging.googleapis.com/v2';
    const url = `${baseUrl}/projects/${projectId}/locations/${location}/buckets/${bucketName}/views`;
    
    console.log('Getting log views from:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const views = response.views || [];
        console.log('Received views:', views);
        return views.map((view: any) => ({
          name: this.extractViewName(view.name),
          displayName: view.displayName || this.extractViewName(view.name),
          description: view.description || '',
          filter: view.filter || '',
          createTime: view.createTime,
          updateTime: view.updateTime,
          resourceName: view.name
        }));
      }),
      catchError(error => {
        console.error('Error fetching log views:', error);
        console.log('Falling back to standard view names...');
        
        // Provide fallback with standard view names
        return of([
          {
            name: '_AllLogs',
            displayName: '_AllLogs',
            description: 'Access to all logs',
            filter: '',
            createTime: '',
            updateTime: '',
            resourceName: `projects/${projectId}/locations/${location}/buckets/${bucketName}/views/_AllLogs`
          },
          {
            name: '_Default',
            displayName: '_Default',
            description: 'Default view',
            filter: '',
            createTime: '',
            updateTime: '',
            resourceName: `projects/${projectId}/locations/${location}/buckets/${bucketName}/views/_Default`
          }
        ]);
      })
    );
  }

  private extractBucketName(fullName: string): string {
    // Extract bucket name from full resource path
    // e.g., "projects/project-id/locations/global/buckets/_Default" -> "_Default"
    const parts = fullName.split('/');
    return parts[parts.length - 1] || fullName;
  }

  private extractViewName(fullName: string): string {
    // Extract view name from full resource path
    // e.g., "projects/project-id/locations/global/buckets/_Default/views/_AllLogs" -> "_AllLogs"
    const parts = fullName.split('/');
    return parts[parts.length - 1] || fullName;
  }

  // Check if VPC Flow Logs are available in a specific bucket/view
  checkVpcFlowLogsAvailability(
    projectId: string, 
    location: string = 'global', 
    bucketName: string = '_Default',
    viewName: string = '_AllLogs'
  ): Observable<{ available: boolean; sampleCount: number; message: string }> {
    // Use standard Cloud Logging API to check for VPC Flow Logs
    // This is more reliable than Log Analytics which may not be available
    const url = `${this.baseUrl}/entries:list`;
    
    // Create a simple filter to check for VPC Flow Logs in the last hour
    // Use proper Cloud Logging API syntax with logName and OR operator
    const filter = [
      `timestamp >= "${new Date(Date.now() - 60 * 60 * 1000).toISOString()}"`,
      `(logName:"projects/${projectId}/logs/compute.googleapis.com%2Fvpc_flows" OR logName:"projects/${projectId}/logs/networkmanagement.googleapis.com%2Fvpc_flows")`,
      'jsonPayload.reporter="SRC"'
    ].join(' AND ');
    
    const payload = {
      resourceNames: [`projects/${projectId}`],
      filter: filter,
      orderBy: 'timestamp desc',
      pageSize: 10 // Just need a small sample to check availability
    };

    console.log('Checking VPC Flow Logs availability with standard API...');
    console.log('URL:', url);
    console.log('Filter:', filter);

    return this.http.post<any>(url, payload, { headers: this.getHeaders() }).pipe(
      map(response => {
        const entries = response.entries || [];
        const logCount = entries.length;
        
        console.log('VPC Flow Logs check response:', response);
        console.log(`Found ${logCount} VPC Flow Logs in the last hour`);
        
        return {
          available: logCount > 0,
          sampleCount: logCount,
          message: logCount > 0 
            ? `Found ${logCount} VPC Flow Logs in the last hour`
            : 'No VPC Flow Logs found in the last hour. VPC Flow Logs may not be enabled.'
        };
      }),
      catchError(error => {
        console.error('Error checking VPC Flow Logs availability:', error);
        
        let errorMessage = 'Error checking logs: ';
        if (error.status === 401) {
          errorMessage += 'Authentication required. Please sign in to Google Cloud.';
        } else if (error.status === 403) {
          errorMessage += 'Insufficient permissions. You need "Logging Viewer" role.';
        } else if (error.status === 404) {
          errorMessage += 'Project not found or VPC Flow Logs not enabled.';
        } else {
          errorMessage += `${error.status} ${error.statusText}`;
        }
        
        return of({
          available: false,
          sampleCount: 0,
          message: errorMessage
        });
      })
    );
  }

  private generateDemoFlowData(
    filters: FilterOptions,
    metricType: MetricType,
    aggregationPeriod: AggregationPeriod
  ): FlowAnalysisResult {
    console.log('🎭 Generating demo flow data with filters:', filters);
    
    const endTime = filters.timeRange.end;
    const startTime = filters.timeRange.start;
    const timeSpanMs = endTime.getTime() - startTime.getTime();
    const intervalMs = this.getAggregationWindowMs(aggregationPeriod);
    
    // Generate realistic VPC flow log entries
    const flowLogs = this.generateDemoFlowLogEntries(filters, startTime, endTime);
    
    // Generate time series data from the flow logs
    const timeSeriesData = this.generateTimeSeriesFromFlows(flowLogs, metricType, startTime, endTime, intervalMs);
    
    // Simulate query execution time
    const queryExecutionTime = Math.floor(Math.random() * 500) + 200; // 200-700ms
    
    return {
      timeSeriesData,
      flowLogs,
      totalRows: flowLogs.length,
      queryExecutionTime,
      error: undefined
    };
  }

  private generateDemoFlowLogEntries(
    filters: FilterOptions,
    startTime: Date,
    endTime: Date
  ): FlowLogEntry[] {
    const flows: FlowLogEntry[] = [];
    const timeSpanMs = endTime.getTime() - startTime.getTime();
    
    // Generate more flows for better visualization (200-500 entries)
    const numFlows = Math.floor(Math.random() * 300) + 200;
    
    // Demo VPC networks and projects
    const demoProjects = ['demo-project-prod', 'demo-project-dev', 'shared-vpc-host'];
    const demoNetworks = ['default', 'vpc-prod', 'vpc-dev', 'shared-vpc', 'management-vpc'];
    const demoRegions = ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'];
    const demoZones = ['us-central1-a', 'us-central1-b', 'us-east1-a', 'europe-west1-b'];
    const protocols = ['TCP', 'UDP', 'ICMP', 'ESP'];
    const commonPorts = [80, 443, 22, 3306, 5432, 6379, 8080, 9090, 3389, 53];
    
    // Generate realistic IP ranges - Create fewer source IPs for better sankey visualization
    const sourceIpPool = [
      '10.128.0.10', '10.128.0.15', '10.128.0.25', '10.128.0.35', '10.128.0.50',
      '10.132.0.12', '10.132.0.20', '10.132.0.30',
      '172.16.0.5', '172.16.0.15', '172.16.0.25',
      '192.168.1.10', '192.168.1.20', '192.168.1.30'
    ];
    
    // Generate diverse destination pool for rich sankey
    const destinationIpPool = [
      // Internal destinations
      '10.140.0.10', '10.140.0.20', '10.140.0.30', '10.140.0.40', '10.140.0.50',
      '10.150.0.15', '10.150.0.25', '10.150.0.35', '10.150.0.45',
      '172.17.0.10', '172.17.0.20', '172.17.0.30', '172.17.0.40',
      '172.18.0.5', '172.18.0.15', '172.18.0.25',
      '192.168.10.5', '192.168.10.15', '192.168.10.25', '192.168.10.35',
      '192.168.100.10', '192.168.100.20', '192.168.100.30',
      // External destinations (popular services)
      '8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1',
      '104.209.224.181', '142.250.191.14', '216.58.194.174',
      '52.86.25.184', '34.102.136.180', '35.186.224.25',
      '185.199.108.153', '185.199.109.153', '185.199.110.153'
    ];
    
    // Create source-to-destination mappings for richer sankey
    const sourceDestinationMappings = new Map<string, string[]>();
    sourceIpPool.forEach(sourceIp => {
      // Each source connects to 3-8 different destinations
      const numDestinations = Math.floor(Math.random() * 6) + 3;
      const destinations: string[] = [];
      const shuffledDestinations = [...destinationIpPool].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numDestinations && i < shuffledDestinations.length; i++) {
        destinations.push(shuffledDestinations[i]);
      }
      sourceDestinationMappings.set(sourceIp, destinations);
    });
    
    // Generate flows with better time distribution for continuous chart
    for (let i = 0; i < numFlows; i++) {
      // Create more even time distribution across the entire time range
      const timeProgress = i / numFlows; // Even distribution
      const randomOffset = (Math.random() - 0.5) * 0.1; // Small random variation
      const adjustedProgress = Math.max(0, Math.min(1, timeProgress + randomOffset));
      const timestamp = new Date(startTime.getTime() + adjustedProgress * timeSpanMs);
      
      const sourceProject = this.getRandomItem(demoProjects);
      const sourceNetwork = this.getRandomItem(demoNetworks);
      const protocol = this.getRandomItem(protocols);
      const region = this.getRandomItem(demoRegions);
      const zone = this.getRandomItem(demoZones);
      
      // Use predefined source IPs for better sankey visualization
      const sourceIp = this.getRandomItem(sourceIpPool);
      
      // Get mapped destinations for this source IP
      const possibleDestinations = sourceDestinationMappings.get(sourceIp) || destinationIpPool;
      const destinationIp = this.getRandomItem(possibleDestinations);
      
      // Apply filters if specified
      if (filters.sourceIp && !sourceIp.includes(filters.sourceIp)) continue;
      if (filters.destinationIp && !destinationIp.includes(filters.destinationIp)) continue;
      if (filters.vpcNetworkProject && sourceProject !== filters.vpcNetworkProject) continue;
      if (filters.vpcNetwork && sourceNetwork !== filters.vpcNetwork) continue;
      if (filters.protocol && protocol !== filters.protocol) continue;
      
      const sourcePort = protocol === 'TCP' || protocol === 'UDP' 
        ? (Math.random() > 0.7 ? this.getRandomItem(commonPorts) : Math.floor(Math.random() * 65535))
        : 0;
      const destinationPort = protocol === 'TCP' || protocol === 'UDP'
        ? (Math.random() > 0.5 ? this.getRandomItem(commonPorts) : Math.floor(Math.random() * 65535))
        : 0;
      
      // Apply port filter
      if (filters.port && destinationPort.toString() !== filters.port && sourcePort.toString() !== filters.port) continue;
      
      // Generate realistic traffic volumes with some correlation to time
      const baseTraffic = this.generateTrafficVolume();
      // Add some time-based patterns (higher traffic during business hours simulation)
      const hourOfDay = timestamp.getHours();
      const businessHourMultiplier = (hourOfDay >= 8 && hourOfDay <= 18) ? 1.5 : 0.8;
      const bytes = Math.floor(baseTraffic * businessHourMultiplier);
      const packets = Math.floor(bytes / (Math.random() * 1000 + 500));
      const rttMsec = protocol === 'TCP' ? Math.floor(Math.random() * 100 + 5) : undefined;
      
      // Determine if destination is internal
      const isDestInternal = destinationIp.startsWith('10.') || destinationIp.startsWith('172.') || destinationIp.startsWith('192.168.');
      
      // Generate instance names for internal IPs
      const sourceInstanceName = `instance-${sourceIp.split('.').pop()}-${sourceNetwork}`;
      const destinationInstanceName = isDestInternal 
        ? `instance-${destinationIp.split('.').pop()}-${this.getRandomItem(demoNetworks)}`
        : undefined;
      
      const flow: FlowLogEntry = {
        timestamp,
        sourceIp,
        sourceVpcNetworkProject: sourceProject,
        sourceVpcNetwork: sourceNetwork,
        destinationIp,
        destinationVpcNetworkProject: isDestInternal ? this.getRandomItem(demoProjects) : undefined,
        destinationVpcNetwork: isDestInternal ? this.getRandomItem(demoNetworks) : undefined,
        protocol,
        sourcePort,
        destinationPort,
        bytes,
        packets,
        rttMsec,
        action: Math.random() > 0.05 ? 'ACCEPT' : 'REJECT', // 95% accept rate
        region,
        connection: this.generateConnectionId(),
        sourceInstanceName,
        destinationInstanceName,
        sourceInstanceProjectId: sourceProject,
        destinationInstanceProjectId: isDestInternal ? this.getRandomItem(demoProjects) : undefined,
        sourceGcpZone: zone,
        destinationGcpZone: isDestInternal ? this.getRandomItem(demoZones) : undefined,
        metricValueSum: bytes
      };
      
      flows.push(flow);
    }
    
    // Sort by timestamp descending (most recent first)
    return flows.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateTimeSeriesFromFlows(
    flows: FlowLogEntry[],
    metricType: MetricType,
    startTime: Date,
    endTime: Date,
    intervalMs: number
  ): FlowMetrics[] {
    const timeSeriesData: FlowMetrics[] = [];
    const buckets = new Map<number, FlowMetrics>();
    
    // Create time buckets for the ENTIRE time range to ensure full coverage
    for (let time = startTime.getTime(); time < endTime.getTime(); time += intervalMs) {
      const bucketKey = Math.floor(time / intervalMs) * intervalMs;
      buckets.set(bucketKey, {
        timestamp: new Date(bucketKey),
        value: 0,
        bytes: 0,
        packets: 0,
        rttMsec: 0
      });
    }
    
    // Aggregate flow data into time buckets
    flows.forEach(flow => {
      const flowTime = flow.timestamp.getTime();
      const bucketKey = Math.floor(flowTime / intervalMs) * intervalMs;
      const bucket = buckets.get(bucketKey);
      
      if (bucket) {
        switch (metricType) {
          case 'bytes':
            bucket.value += flow.bytes;
            break;
          case 'packets':
            bucket.value += flow.packets;
            break;
          case 'connections':
            bucket.value += 1;
            break;
          case 'latency':
            if (flow.rttMsec) {
              bucket.value = Math.max(bucket.value, flow.rttMsec);
            }
            break;
        }
        bucket.bytes = (bucket.bytes || 0) + flow.bytes;
        bucket.packets = (bucket.packets || 0) + flow.packets;
        if (flow.rttMsec) {
          bucket.rttMsec = Math.max(bucket.rttMsec || 0, flow.rttMsec);
        }
      }
    });
    
    // Ensure we have data points even for empty buckets (creates continuous line)
    // Add baseline traffic to empty buckets to avoid gaps
    buckets.forEach(bucket => {
      if (bucket.value === 0) {
        // Add minimal baseline traffic to maintain chart continuity
        switch (metricType) {
          case 'bytes':
            bucket.value = Math.floor(Math.random() * 1000 + 100); // 100B - 1KB baseline
            break;
          case 'packets':
            bucket.value = Math.floor(Math.random() * 10 + 1); // 1-10 packets baseline
            break;
          case 'connections':
            bucket.value = Math.floor(Math.random() * 3); // 0-2 connections baseline
            break;
          case 'latency':
            bucket.value = Math.floor(Math.random() * 20 + 10); // 10-30ms baseline
            break;
        }
        bucket.bytes = bucket.bytes || bucket.value;
        bucket.packets = bucket.packets || Math.max(1, Math.floor(bucket.value / 100));
        bucket.rttMsec = bucket.rttMsec || Math.floor(Math.random() * 50 + 10);
      }
    });
    
    return Array.from(buckets.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private generateTrafficVolume(): number {
    // Generate realistic traffic volumes (bytes)
    const patterns = [
      () => Math.floor(Math.random() * 1000 + 100),      // Small packets (100B - 1KB)
      () => Math.floor(Math.random() * 50000 + 1000),    // Medium packets (1KB - 50KB)
      () => Math.floor(Math.random() * 500000 + 50000),  // Large packets (50KB - 500KB)
      () => Math.floor(Math.random() * 5000000 + 500000) // Very large (500KB - 5MB)
    ];
    
    // Weight towards smaller packets (more realistic)
    const weights = [0.6, 0.25, 0.1, 0.05];
    const rand = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < patterns.length; i++) {
      cumulativeWeight += weights[i];
      if (rand <= cumulativeWeight) {
        return patterns[i]();
      }
    }
    
    return patterns[0](); // Fallback
  }

  private generateConnectionId(): string {
    // Generate realistic connection IDs
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private createEmptyResult(message: string): FlowAnalysisResult {
    return {
      timeSeriesData: [],
      flowLogs: [],
      totalRows: 0,
      queryExecutionTime: 0,
      error: message
    };
  }

  clearDemoCache(): void {
    this.demoDataCache = null;
    this.lastDemoQuery = null;
    console.log('🎭 Demo data cache cleared');
  }
}

// Interfaces for Log Buckets and Views
export interface LogBucket {
  name: string;
  displayName: string;
  description: string;
  location: string;
  analyticsEnabled: boolean;
  createTime: string;
  updateTime: string;
  resourceName: string;
}

export interface LogView {
  name: string;
  displayName: string;
  description: string;
  filter: string;
  createTime: string;
  updateTime: string;
  resourceName: string;
}

export interface FilterAttribute {
  value: string;
  displayName: string;
  description: string;
  category: 'basic' | 'network' | 'instance' | 'gke' | 'load_balancer' | 'gateway' | 'geographic' | 'psc' | 'asn' | 'google' | 'timing' | 'qos';
}

export interface OrganizeAttribute {
  value: string;
  displayName: string;
  description: string;
  category: 'basic' | 'network' | 'instance' | 'gke' | 'load_balancer' | 'gateway' | 'geographic' | 'psc' | 'asn' | 'google' | 'timing' | 'qos';
}