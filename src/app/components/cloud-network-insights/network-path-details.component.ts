import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AppNetaService, NetworkPath, NetworkPathMetrics, RouteHop, NetworkEvent } from '../../services/appneta.service';

@Component({
  selector: 'app-network-path-details',
  template: `
    <div class="network-path-details-page">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading network path details...</p>
      </div>

      <!-- Content (only show when not loading) -->
      <div *ngIf="!isLoading">
        <!-- Error State -->
        <div *ngIf="networkPath.status === 'Failed' && (networkPath.name.includes('Error') || networkPath.name.includes('Not Found') || networkPath.name.includes('Invalid'))" class="error-container">
          <mat-icon class="error-icon">error</mat-icon>
          <h2>{{ networkPath.name }}</h2>
          <p *ngIf="networkPath.name.includes('Not Found')">The requested network path could not be found. It may have been deleted or the ID is incorrect.</p>
          <p *ngIf="networkPath.name.includes('Error Loading')">There was an error loading the network path data. Please try refreshing the page.</p>
          <p *ngIf="networkPath.name.includes('Invalid')">No valid path ID was provided in the URL.</p>
          <div class="error-actions">
            <button mat-raised-button color="primary" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Back to Network Insights
            </button>
            <button mat-stroked-button (click)="refreshData()" *ngIf="!networkPath.name.includes('Invalid')">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
          </div>
        </div>

        <!-- Normal Content (only show when not in error state) -->
        <div *ngIf="!(networkPath.status === 'Failed' && (networkPath.name.includes('Error') || networkPath.name.includes('Not Found') || networkPath.name.includes('Invalid')))">
          <!-- Header -->
          <div class="details-header">
          <div class="header-content">
            <div class="path-info">
              <div class="path-title">
                <button mat-icon-button (click)="goBack()" class="back-button">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <mat-icon [class]="getStatusClass(networkPath.status)">{{ getStatusIcon(networkPath.status) }}</mat-icon>
                <h2>{{ networkPath.name }}</h2>
                <mat-chip [class]="getStatusClass(networkPath.status)">{{ networkPath.status }}</mat-chip>
              </div>
              <div class="path-details">
                <div class="detail-item">
                  <span class="label">Source:</span>
                  <span class="value">{{ networkPath.monitoringPoint }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Target:</span>
                  <span class="value">{{ networkPath.target }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Protocol:</span>
                  <span class="value">{{ networkPath.protocol || 'UDP' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Last Updated:</span>
                  <span class="value">{{ formatTimestamp((networkPath.lastSeen || networkPath.lastUpdate).toString()) }}</span>
                </div>
              </div>
            </div>
            <div class="header-actions">
              <button mat-stroked-button (click)="refreshData()" [disabled]="isLoading">
                <mat-icon>refresh</mat-icon>
                Refresh
              </button>
              <button mat-stroked-button (click)="exportData()">
                <mat-icon>download</mat-icon>
                Export
              </button>
            </div>
          </div>
        </div>

        <!-- Time Range Selector -->
        <div class="time-range-selector">
          <mat-button-toggle-group [(value)]="selectedTimeRange" (change)="onTimeRangeChange($event)">
            <mat-button-toggle value="1h">1 Hour</mat-button-toggle>
            <mat-button-toggle value="4h">4 Hours</mat-button-toggle>
            <mat-button-toggle value="1d">1 Day</mat-button-toggle>
            <mat-button-toggle value="7d">7 Days</mat-button-toggle>
            <mat-button-toggle value="30d">30 Days</mat-button-toggle>
          </mat-button-toggle-group>
          <div class="zoom-controls">
            <span class="zoom-label">Zoom:</span>
            <mat-button-toggle-group [(value)]="zoomLevel">
              <mat-button-toggle value="1h">1h</mat-button-toggle>
              <mat-button-toggle value="4h">4h</mat-button-toggle>
              <mat-button-toggle value="8h">8h</mat-button-toggle>
              <mat-button-toggle value="1d">1d</mat-button-toggle>
              <mat-button-toggle value="7d">7d</mat-button-toggle>
              <mat-button-toggle value="30d">30d</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        </div>

        <!-- Main Content Tabs -->
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="details-tabs">
          <!-- Performance Tab -->
          <mat-tab label="Performance">
            <div class="tab-content">
              <!-- Key Metrics Summary -->
              <div class="metrics-summary">
                <div class="metric-card">
                  <div class="metric-header">
                    <mat-icon>speed</mat-icon>
                    <span>Capacity</span>
                  </div>
                  <div class="metric-value">{{ getCurrentMetric('capacity') }} Mbps</div>
                  <div class="metric-trend" [class.positive]="getMetricTrend('capacity') > 0" [class.negative]="getMetricTrend('capacity') < 0">
                    <mat-icon>{{ getMetricTrend('capacity') > 0 ? 'trending_up' : getMetricTrend('capacity') < 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
                    {{ Math.abs(getMetricTrend('capacity')) }}%
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-header">
                    <mat-icon>access_time</mat-icon>
                    <span>Latency</span>
                  </div>
                  <div class="metric-value">{{ getCurrentMetric('latency') }} ms</div>
                  <div class="metric-trend" [class.positive]="getMetricTrend('latency') < 0" [class.negative]="getMetricTrend('latency') > 0">
                    <mat-icon>{{ getMetricTrend('latency') > 0 ? 'trending_up' : getMetricTrend('latency') < 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
                    {{ Math.abs(getMetricTrend('latency')) }}%
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-header">
                    <mat-icon>signal_cellular_alt</mat-icon>
                    <span>Data Loss</span>
                  </div>
                  <div class="metric-value">{{ getCurrentMetric('dataLoss') }}%</div>
                  <div class="metric-trend" [class.positive]="getMetricTrend('dataLoss') < 0" [class.negative]="getMetricTrend('dataLoss') > 0">
                    <mat-icon>{{ getMetricTrend('dataLoss') > 0 ? 'trending_up' : getMetricTrend('dataLoss') < 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
                    {{ Math.abs(getMetricTrend('dataLoss')) }}%
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-header">
                    <mat-icon>graphic_eq</mat-icon>
                    <span>MOS Score</span>
                  </div>
                  <div class="metric-value">{{ getCurrentMetric('mos') }}</div>
                  <div class="metric-trend" [class.positive]="getMetricTrend('mos') > 0" [class.negative]="getMetricTrend('mos') < 0">
                    <mat-icon>{{ getMetricTrend('mos') > 0 ? 'trending_up' : getMetricTrend('mos') < 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
                    {{ Math.abs(getMetricTrend('mos')) }}%
                  </div>
                </div>
              </div>

              <!-- Performance Charts -->
              <div class="charts-grid">
                <div class="chart-container">
                  <div class="chart-header">
                    <h3>Capacity</h3>
                    <div class="chart-controls">
                      <button mat-icon-button matTooltip="Chart Settings">
                        <mat-icon>settings</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="chart-content" #capacityChart>
                    <div class="chart-placeholder">
                      <mat-icon>show_chart</mat-icon>
                      <p>Capacity chart will be rendered here</p>
                    </div>
                  </div>
                </div>

                <div class="chart-container">
                  <div class="chart-header">
                    <h3>Data Loss & Jitter</h3>
                    <div class="chart-controls">
                      <button mat-icon-button matTooltip="Chart Settings">
                        <mat-icon>settings</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="chart-content" #dataLossChart>
                    <div class="chart-placeholder">
                      <mat-icon>show_chart</mat-icon>
                      <p>Data Loss & Jitter chart will be rendered here</p>
                    </div>
                  </div>
                </div>

                <div class="chart-container">
                  <div class="chart-header">
                    <h3>Latency & Round-Trip Time</h3>
                    <div class="chart-controls">
                      <button mat-icon-button matTooltip="Chart Settings">
                        <mat-icon>settings</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="chart-content" #latencyChart>
                    <div class="chart-placeholder">
                      <mat-icon>show_chart</mat-icon>
                      <p>Latency & RTT chart will be rendered here</p>
                    </div>
                  </div>
                </div>

                <div class="chart-container">
                  <div class="chart-header">
                    <h3>Voice Quality (MOS)</h3>
                    <div class="chart-controls">
                      <button mat-icon-button matTooltip="Chart Settings">
                        <mat-icon>settings</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="chart-content" #mosChart>
                    <div class="chart-placeholder">
                      <mat-icon>show_chart</mat-icon>
                      <p>Voice Quality (MOS) chart will be rendered here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Events Tab -->
          <mat-tab label="Events">
            <div class="tab-content">
              <!-- Event Filters -->
              <div class="event-filters">
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Search events</mat-label>
                  <input matInput [(ngModel)]="eventSearchTerm" (input)="filterEvents()" placeholder="Search by description...">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Event Type</mat-label>
                  <mat-select [(value)]="selectedEventType" (selectionChange)="filterEvents()">
                    <mat-option value="">All Types</mat-option>
                    <mat-option value="Alert Condition">Alert Condition</mat-option>
                    <mat-option value="Route Change">Route Change</mat-option>
                    <mat-option value="Connectivity">Connectivity</mat-option>
                    <mat-option value="Performance">Performance</mat-option>
                  </mat-select>
                </mat-form-field>
                
                <div class="event-stats">
                  <span class="stat-item">
                    <mat-icon class="critical">error</mat-icon>
                    {{ getEventCountBySeverity('Critical') }} Critical
                  </span>
                  <span class="stat-item">
                    <mat-icon class="warning">warning</mat-icon>
                    {{ getEventCountBySeverity('Warning') }} Warning
                  </span>
                  <span class="stat-item">
                    <mat-icon class="info">info</mat-icon>
                    {{ getEventCountBySeverity('Info') }} Info
                  </span>
                </div>
              </div>

              <!-- Events List -->
              <div class="events-list">
                <div *ngFor="let event of filteredEvents" class="event-item" [class]="'severity-' + event.severity.toLowerCase()">
                  <div class="event-header">
                    <mat-icon [class]="'severity-' + event.severity.toLowerCase()">
                      {{ getEventIcon(event.type, event.severity) }}
                    </mat-icon>
                    <div class="event-info">
                      <div class="event-title">{{ event.type }}</div>
                      <div class="event-time">{{ formatTimestamp(event.timestamp) }}</div>
                    </div>
                    <mat-chip [class]="'severity-' + event.severity.toLowerCase()">{{ event.severity }}</mat-chip>
                  </div>
                  <div class="event-description">{{ event.description }}</div>
                  <div class="event-details" *ngIf="event.details">
                    <pre>{{ event.details }}</pre>
                  </div>
                </div>
                
                <div *ngIf="filteredEvents.length === 0" class="no-events">
                  <mat-icon>event_note</mat-icon>
                  <p>No events found matching the current filters.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Route Tab -->
          <mat-tab label="Route">
            <div class="tab-content">
              <!-- Route Header -->
              <div class="route-header">
                <div class="route-info">
                  <h3>Network Route Analysis</h3>
                  <p>Last route change: {{ formatTimestamp(routeChangeTime) }}</p>
                </div>
                <div class="route-actions">
                  <button mat-stroked-button (click)="refreshRoute()" [disabled]="isLoading">
                    <mat-icon>refresh</mat-icon>
                    Refresh Route
                  </button>
                  <button mat-stroked-button>
                    <mat-icon>download</mat-icon>
                    Export Route
                  </button>
                </div>
              </div>

              <!-- Route Visualization -->
              <div class="route-visualization">
                <!-- Source -->
                <div class="route-endpoint source">
                  <div class="endpoint-icon">
                    <mat-icon>computer</mat-icon>
                  </div>
                  <div class="endpoint-info">
                    <div class="endpoint-label">Source</div>
                    <div class="endpoint-value">{{ networkPath.monitoringPoint }}</div>
                  </div>
                </div>

                <!-- Route Hops -->
                <div class="route-hops">
                  <div *ngFor="let hop of routeHops; let i = index" class="hop-container">
                    <div class="hop-connector" *ngIf="i > 0"></div>
                    <div class="hop-item" 
                         [class.selected]="selectedHop === i"
                         (click)="selectHop(i)">
                      <div class="hop-number">{{ hop.hopNumber }}</div>
                      <div class="hop-info">
                        <div class="hop-ip">{{ hop.ipAddress }}</div>
                        <div class="hop-latency">{{ hop.latency }}ms</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Target -->
                <div class="route-endpoint target">
                  <div class="endpoint-icon">
                    <mat-icon>cloud</mat-icon>
                  </div>
                  <div class="endpoint-info">
                    <div class="endpoint-label">Target</div>
                    <div class="endpoint-value">{{ networkPath.target }}</div>
                  </div>
                </div>
              </div>

              <!-- Hop Details -->
              <div class="hop-details" *ngIf="selectedHop !== null && routeHops[selectedHop]">
                <div class="details-card">
                  <h4>Hop {{ routeHops[selectedHop].hopNumber }} Details</h4>
                  <div class="details-grid">
                    <div class="detail-row">
                      <span class="label">IP Address:</span>
                      <span class="value">{{ routeHops[selectedHop].ipAddress }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Hostname:</span>
                      <span class="value">{{ routeHops[selectedHop].hostname }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">ASN:</span>
                      <span class="value">{{ routeHops[selectedHop].asn }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Location:</span>
                      <span class="value">{{ routeHops[selectedHop].location }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Latency:</span>
                      <span class="value">{{ routeHops[selectedHop].latency }}ms</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Packet Loss:</span>
                      <span class="value">{{ routeHops[selectedHop].packetLoss }}%</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Response Time:</span>
                      <span class="value">{{ routeHops[selectedHop].responseTime }}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styleUrls: ['./network-path-details.component.scss']
})
export class NetworkPathDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  networkPath: NetworkPath;
  isLoading = false;
  selectedTabIndex = 0;
  selectedTimeRange = '1d';
  zoomLevel = '1h';

  // Performance data
  metricsData: NetworkPathMetrics[] = [];
  currentMetrics: NetworkPathMetrics | null = null;

  // Events data
  networkEvents: NetworkEvent[] = [];
  filteredEvents: NetworkEvent[] = [];
  selectedEventType = '';
  eventSearchTerm = '';

  // Route data
  routeHops: RouteHop[] = [];
  selectedHop: number | null = null;
  routeChangeTime = new Date().toISOString();

  // Utility
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appNetaService: AppNetaService
  ) {
    // Initialize with default network path
    this.networkPath = {
      id: '',
      name: 'Loading...',
      status: 'OK',
      source: '',
      destination: '',
      monitoringPoint: '',
      target: '',
      lastUpdate: new Date(),
      lastSeen: new Date(),
      protocol: 'UDP'
    };
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const pathId = params['pathId'];
      this.loadNetworkPath(pathId);
    });
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNetworkPath(pathId: string): void {
    if (!pathId) {
      console.error('No pathId provided');
      // Show error state without redirecting
      this.networkPath = {
        id: 'unknown',
        name: 'Invalid Path ID',
        status: 'Failed',
        source: 'Error',
        destination: 'Error',
        monitoringPoint: 'Error',
        target: 'Error',
        lastUpdate: new Date(),
        lastSeen: new Date(),
        protocol: 'Error'
      };
      this.isLoading = false;
      return;
    }

    console.log('Loading network path with ID:', pathId);
    
    // Set loading state
    this.isLoading = true;
    
    // Load the specific network path by ID
    this.appNetaService.getNetworkPaths().subscribe({
      next: (paths) => {
        console.log('Available paths:', paths.map(p => ({ id: p.id, name: p.name })));
        const path = paths.find(p => p.id === pathId);
        if (path) {
          console.log('Found path:', path);
          this.networkPath = path;
          this.isLoading = false;
        } else {
          console.warn('Path not found with ID:', pathId);
          // Show error state without redirecting
          this.networkPath = {
            id: pathId,
            name: 'Path Not Found',
            status: 'Failed',
            source: 'Unknown',
            destination: 'Unknown',
            monitoringPoint: 'Unknown',
            target: 'Unknown',
            lastUpdate: new Date(),
            lastSeen: new Date(),
            protocol: 'Unknown'
          };
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading network paths:', error);
        this.isLoading = false;
        // Show error state without redirecting
        this.networkPath = {
          id: pathId,
          name: 'Error Loading Path',
          status: 'Failed',
          source: 'Error',
          destination: 'Error',
          monitoringPoint: 'Error',
          target: 'Error',
          lastUpdate: new Date(),
          lastSeen: new Date(),
          protocol: 'Error'
        };
      }
    });
  }

  private loadData(): void {
    this.loadMetricsData();
    this.loadEventsData();
    this.loadRouteData();
  }

  private loadMetricsData(): void {
    this.isLoading = true;
    this.appNetaService.getNetworkPathMetrics(this.networkPath.id, this.selectedTimeRange)
      .subscribe({
        next: (metrics) => {
          this.metricsData = metrics;
          this.currentMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading metrics:', error);
          this.isLoading = false;
        }
      });
  }

  private loadEventsData(): void {
    this.appNetaService.getNetworkPathEvents(this.networkPath.id, this.selectedTimeRange)
      .subscribe({
        next: (events) => {
          this.networkEvents = events;
          this.filterEvents();
        },
        error: (error) => {
          console.error('Error loading events:', error);
        }
      });
  }

  private loadRouteData(): void {
    this.appNetaService.getNetworkPathRoute(this.networkPath.id, this.selectedTimeRange)
      .subscribe({
        next: (route) => {
          this.routeHops = route;
          this.selectedHop = null;
        },
        error: (error) => {
          console.error('Error loading route:', error);
        }
      });
  }

  private startAutoRefresh(): void {
    interval(30000) // Refresh every 30 seconds
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.isLoading) {
            return this.appNetaService.getNetworkPathMetrics(this.networkPath.id, this.selectedTimeRange);
          }
          return [];
        })
      )
      .subscribe(metrics => {
        if (metrics.length > 0) {
          this.metricsData = metrics;
          this.currentMetrics = metrics[metrics.length - 1];
        }
      });
  }

  getCurrentMetric(metric: keyof NetworkPathMetrics): number {
    if (!this.currentMetrics) return 0;
    return this.currentMetrics[metric] as number || 0;
  }

  getMetricTrend(metric: keyof NetworkPathMetrics): number {
    if (this.metricsData.length < 2) return 0;
    const current = this.getCurrentMetric(metric);
    const previous = this.metricsData[this.metricsData.length - 2][metric] as number || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'healthy': return 'status-healthy';
      case 'warning': return 'status-warning';
      case 'critical': return 'status-critical';
      case 'unknown': return 'status-unknown';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'healthy': return 'check_circle';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'unknown': return 'help';
      default: return 'help';
    }
  }

  getEventIcon(type: string, severity: string): string {
    if (severity.toLowerCase() === 'critical') return 'error';
    if (severity.toLowerCase() === 'warning') return 'warning';
    
    switch (type.toLowerCase()) {
      case 'alert condition': return 'notification_important';
      case 'route change': return 'alt_route';
      case 'connectivity': return 'link';
      case 'performance': return 'speed';
      default: return 'info';
    }
  }

  getEventCountBySeverity(severity: string): number {
    return this.networkEvents.filter(event => event.severity === severity).length;
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  onTimeRangeChange(event: any): void {
    this.selectedTimeRange = event.value;
    this.loadMetricsData();
    this.loadEventsData();
  }

  filterEvents(): void {
    this.filteredEvents = this.networkEvents.filter(event => {
      const matchesType = !this.selectedEventType || event.type === this.selectedEventType;
      const matchesSearch = !this.eventSearchTerm || 
        event.description.toLowerCase().includes(this.eventSearchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }

  selectHop(index: number): void {
    this.selectedHop = index;
  }

  refreshData(): void {
    this.loadData();
  }

  refreshRoute(): void {
    this.loadRouteData();
    this.routeChangeTime = new Date().toISOString();
  }

  exportData(): void {
    // Implementation for data export
    console.log('Exporting network path data...');
  }

  goBack(): void {
    this.router.navigate(['/cloud-network-insights']);
  }
} 