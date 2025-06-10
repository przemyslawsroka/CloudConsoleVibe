import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, combineLatest, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MonitoringService, Agent, DashboardOverview, Metric } from '../services/monitoring.service';
import { AgentWebSocketService } from '../services/agent-websocket.service';

@Component({
  selector: 'app-metrics-dashboard',
  templateUrl: './metrics-dashboard.component.html',
  styleUrls: ['./metrics-dashboard.component.scss']
})
export class MetricsDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard data
  dashboardOverview: DashboardOverview | null = null;
  agents: Agent[] = [];
  recentMetrics: Metric[] = [];
  
  // UI state
  isLoading = true;
  wsConnected = false;
  selectedTimeRange = '1h';
  autoRefresh = true;
  
  // Chart data
  networkLatencyData: any = null;
  packetLossData: any = null;
  throughputData: any = null;
  
  // Time range options
  timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' }
  ];

  constructor(
    private monitoringService: MonitoringService,
    private websocketService: AgentWebSocketService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeWebSocket();
    this.loadDashboardData();
    this.setupAutoRefresh();
    this.setupWebSocketSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.websocketService.disconnect();
  }

  private initializeWebSocket(): void {
    this.websocketService.connect();
    
    this.websocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.wsConnected = connected;
        if (connected) {
          this.websocketService.requestAgentList();
        }
      });
  }

  private setupWebSocketSubscriptions(): void {
    // Agent updates
    this.websocketService.agentUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agent => {
        this.updateAgentInList(agent);
        this.updateDashboardOverview();
      });

    // Metric updates
    this.websocketService.metricUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metric => {
        this.addRecentMetric(metric);
        this.updateCharts();
      });

    // System alerts
    this.websocketService.systemAlerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alert => {
        this.showSystemAlert(alert);
      });
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load agents first, which is the most important data
    this.monitoringService.getAgents({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agentsResponse) => {
          this.agents = agentsResponse.agents || [];
          this.isLoading = false;
          
          // Initialize dashboard overview with basic data
          this.dashboardOverview = {
            totalAgents: this.agents.length,
            activeAgents: this.agents.filter(a => a.status === 'connected').length,
            totalMetrics: 0,
            systemHealth: this.agents.length > 0 ? 'healthy' : 'warning',
            recentActivity: [],
            metricsSummary: {
              networkLatency: { avg: 0, min: 0, max: 0 },
              packetLoss: 0,
              throughput: { rx: 0, tx: 0 }
            }
          };
          
          // Load other data if available
          this.loadOptionalData();
        },
        error: (error) => {
          console.error('Error loading agents:', error);
          this.isLoading = false;
          
          // Set default values for offline state
          this.agents = [];
          this.dashboardOverview = {
            totalAgents: 0,
            activeAgents: 0,
            totalMetrics: 0,
            systemHealth: 'error',
            recentActivity: [],
            metricsSummary: {
              networkLatency: { avg: 0, min: 0, max: 0 },
              packetLoss: 0,
              throughput: { rx: 0, tx: 0 }
            }
          };
          
          this.showError('Backend unavailable. Showing demo data.');
        }
      });
  }
  
  private loadOptionalData(): void {
    // Try to load metrics and charts, but don't fail if unavailable
    this.monitoringService.getMetrics({ limit: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metricsResponse) => {
          this.recentMetrics = metricsResponse.metrics || [];
        },
        error: (error) => {
          console.warn('Metrics unavailable:', error);
          this.recentMetrics = [];
        }
      });
  }

  private setupAutoRefresh(): void {
    if (this.autoRefresh) {
      interval(30000) // Refresh every 30 seconds
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() => this.monitoringService.getDashboardOverview())
        )
        .subscribe(overview => {
          this.dashboardOverview = overview;
        });
    }
  }

  private updateAgentInList(updatedAgent: Agent): void {
    const index = this.agents.findIndex(agent => agent.id === updatedAgent.id);
    if (index !== -1) {
      this.agents[index] = updatedAgent;
    } else {
      this.agents.push(updatedAgent);
    }
  }

  private addRecentMetric(metric: Metric): void {
    this.recentMetrics.unshift(metric);
    if (this.recentMetrics.length > 50) {
      this.recentMetrics = this.recentMetrics.slice(0, 50);
    }
  }

  private updateDashboardOverview(): void {
    if (this.dashboardOverview) {
      this.dashboardOverview.totalAgents = this.agents.length;
      this.dashboardOverview.activeAgents = this.agents.filter(a => a.status === 'connected').length;
    }
  }

  private updateCharts(): void {
    this.monitoringService.getDashboardMetrics(this.selectedTimeRange)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.updateChartData(data);
      });
  }

  private updateChartData(data: any): void {
    // Network Latency Chart
    this.networkLatencyData = {
      labels: data.timestamps,
      datasets: [
        {
          label: 'Average Latency',
          data: data.latency?.avg || [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'Max Latency',
          data: data.latency?.max || [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    };

    // Packet Loss Chart
    this.packetLossData = {
      labels: data.timestamps,
      datasets: [
        {
          label: 'Packet Loss %',
          data: data.packetLoss || [],
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.1
        }
      ]
    };

    // Throughput Chart
    this.throughputData = {
      labels: data.timestamps,
      datasets: [
        {
          label: 'RX (Mbps)',
          data: data.throughput?.rx || [],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        },
        {
          label: 'TX (Mbps)',
          data: data.throughput?.tx || [],
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.1
        }
      ]
    };
  }

  private showSystemAlert(alert: any): void {
    this.snackBar.open(alert.message || 'System alert received', 'Dismiss', {
      duration: 5000,
      panelClass: alert.severity === 'error' ? 'error-snackbar' : 'warning-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }

  // Public methods for template
  onTimeRangeChange(): void {
    this.loadDashboardData();
  }

  onRefresh(): void {
    this.loadDashboardData();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    }
  }

  getSystemHealthColor(): string {
    if (!this.dashboardOverview) return 'grey';
    
    switch (this.dashboardOverview.systemHealth) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'error': return 'red';
      default: return 'grey';
    }
  }

  getAgentStatusColor(status: string): string {
    switch (status) {
      case 'connected': return 'green';
      case 'disconnected': return 'grey';
      case 'error': return 'red';
      default: return 'grey';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatLatency(latency: number): string {
    if (latency < 1) {
      return `${(latency * 1000).toFixed(0)}μs`;
    } else if (latency < 1000) {
      return `${latency.toFixed(1)}ms`;
    } else {
      return `${(latency / 1000).toFixed(2)}s`;
    }
  }

  // Helper method to safely get metric value
  getAgentLatency(agent: any): number {
    if (agent.recentMetrics && 
        agent.recentMetrics.length > 0 && 
        agent.recentMetrics[0] && 
        typeof agent.recentMetrics[0].value === 'number') {
      return agent.recentMetrics[0].value;
    }
    return 0;
  }
} 