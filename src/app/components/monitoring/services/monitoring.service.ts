import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Agent {
  id: string;
  provider: string;
  region: string;
  zone?: string;
  instance_id?: string;
  ip_address: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
  connected_at: Date;
  last_seen: Date;
  last_registration?: Date;
  total_messages: number;
  total_metrics: number;
  total_errors: number;
  created_at: Date;
  updated_at: Date;
  recentMetrics?: Metric[];
}

export interface Metric {
  id?: string;
  agent_id: string;
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  value: number | object;
  unit: string;
  tags: { [key: string]: string };
  timestamp: Date;
}

export interface Target {
  id: string;
  name: string;
  type: 'ping' | 'http' | 'tcp' | 'dns';
  address: string;
  port?: number;
  interval: number;
  timeout: number;
  enabled: boolean;
  agent_ids: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AgentConfig {
  agent_id: string;
  collection: {
    interval: number;
    transmission_interval: number;
    batch_size: number;
  };
  targets: {
    ping: string[];
    dns: string[];
  };
  filters: {
    interfaces: string[];
    metrics: string[];
  };
}

export interface DashboardOverview {
  totalAgents: number;
  activeAgents: number;
  totalMetrics: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  recentActivity: ActivityItem[];
  metricsSummary: MetricsSummary;
}

export interface ActivityItem {
  timestamp: Date;
  type: 'agent_connected' | 'agent_disconnected' | 'metric_received' | 'alert_triggered';
  agent_id?: string;
  message: string;
}

export interface MetricsSummary {
  networkLatency: {
    avg: number;
    min: number;
    max: number;
  };
  packetLoss: number;
  throughput: {
    rx: number;
    tx: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private baseUrl = environment.apiBaseUrl || 'https://cloudconsolevibe-backend-931553324054.us-central1.run.app';
  
  // Observables for real-time updates
  private agentsSubject = new BehaviorSubject<Agent[]>([]);
  public agents$ = this.agentsSubject.asObservable();
  
  private metricsSubject = new BehaviorSubject<Metric[]>([]);
  public metrics$ = this.metricsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Agent Management
  getAgents(params?: {
    status?: string;
    provider?: string;
    region?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ agents: Agent[]; pagination: any }> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    
    return this.http.get<{ agents: Agent[]; pagination: any }>(
      `${this.baseUrl}/api/v1/agents`,
      { params: httpParams }
    );
  }

  getAgent(agentId: string): Observable<Agent> {
    return this.http.get<Agent>(`${this.baseUrl}/api/v1/agents/${agentId}`);
  }

  getAgentStats(agentId: string, timeRange: string = '24h'): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/agents/${agentId}/stats`, {
      params: { timeRange }
    });
  }

  updateAgentConfig(agentId: string, config: AgentConfig): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/v1/agents/${agentId}/config`, config);
  }

  deleteAgent(agentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/v1/agents/${agentId}`);
  }

  // Metrics
  getMetrics(params?: {
    agent_id?: string;
    metric_name?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
  }): Observable<{ metrics: Metric[]; pagination: any }> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          httpParams = httpParams.set(key, params[key as keyof typeof params]!.toString());
        }
      });
    }
    
    return this.http.get<{ metrics: Metric[]; pagination: any }>(
      `${this.baseUrl}/api/v1/metrics`,
      { params: httpParams }
    );
  }

  getMetricsAggregated(params: {
    metric_name: string;
    aggregation: 'avg' | 'sum' | 'min' | 'max';
    interval: string;
    start_time: string;
    end_time: string;
    agent_id?: string;
  }): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/metrics/aggregated`, {
      params: params as any
    });
  }

  getMetricsHistory(agentId: string, metricName: string, timeRange: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/metrics/history`, {
      params: { agent_id: agentId, metric_name: metricName, time_range: timeRange }
    });
  }

  // Targets
  getTargets(): Observable<Target[]> {
    return this.http.get<Target[]>(`${this.baseUrl}/api/v1/targets`);
  }

  createTarget(target: Partial<Target>): Observable<Target> {
    return this.http.post<Target>(`${this.baseUrl}/api/v1/targets`, target);
  }

  updateTarget(targetId: string, target: Partial<Target>): Observable<Target> {
    return this.http.put<Target>(`${this.baseUrl}/api/v1/targets/${targetId}`, target);
  }

  deleteTarget(targetId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/v1/targets/${targetId}`);
  }

  // Dashboard
  getDashboardOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.baseUrl}/api/v1/dashboard/overview`);
  }

  getDashboardMetrics(timeRange: string = '1h'): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/v1/dashboard/metrics`, {
      params: { time_range: timeRange }
    });
  }

  // Real-time updates
  updateAgents(agents: Agent[]): void {
    this.agentsSubject.next(agents);
  }

  updateMetrics(metrics: Metric[]): void {
    this.metricsSubject.next(metrics);
  }

  // Health check
  checkHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
} 