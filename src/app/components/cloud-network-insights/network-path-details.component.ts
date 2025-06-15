import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AppNetaService, NetworkPath, NetworkPathMetrics, RouteHop, NetworkEvent } from '../../services/appneta.service';

@Component({
  selector: 'app-network-path-details',
  template: `
    <div class="network-path-details">
      <!-- Header -->
      <div class="details-header">
        <div class="header-content">
          <div class="path-info">
            <div class="path-title">
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
            <button mat-icon-button (click)="closeDialog()">
              <mat-icon>close</mat-icon>
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
                    <p>MOS Score chart will be rendered here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Events Tab -->
        <mat-tab label="Events">
          <div class="tab-content">
            <div class="events-header">
              <div class="events-filters">
                <mat-form-field appearance="outline">
                  <mat-label>Filter by type</mat-label>
                  <mat-select [(value)]="selectedEventType" (selectionChange)="filterEvents()">
                    <mat-option value="">All Events</mat-option>
                    <mat-option value="Alert Condition">Alert Conditions</mat-option>
                    <mat-option value="Route Change">Route Changes</mat-option>
                    <mat-option value="Connectivity">Connectivity</mat-option>
                    <mat-option value="Performance">Performance</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Search events</mat-label>
                  <input matInput [(ngModel)]="eventSearchTerm" (input)="filterEvents()" placeholder="Search by description...">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
              </div>
              <div class="events-summary">
                <span class="event-count">{{ filteredEvents.length }} of {{ networkEvents.length }} events</span>
              </div>
            </div>

            <div class="events-list">
              <div class="event-item" *ngFor="let event of filteredEvents" [class]="'severity-' + event.severity">
                <div class="event-icon">
                  <mat-icon [class]="'severity-' + event.severity">
                    {{ getEventIcon(event.type, event.severity) }}
                  </mat-icon>
                </div>
                <div class="event-content">
                  <div class="event-header">
                    <span class="event-type">{{ event.type }}</span>
                    <span class="event-time">{{ formatTimestamp(event.timestamp) }}</span>
                  </div>
                  <div class="event-description">{{ event.description }}</div>
                  <div class="event-details" *ngIf="event.details">{{ event.details }}</div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Path Plus Tab -->
        <mat-tab label="Path Plus">
          <div class="tab-content">
            <!-- Route Visualization -->
            <div class="route-section">
              <div class="route-header">
                <h3>Network Route</h3>
                <div class="route-info">
                  <span>Route changed at {{ formatTimestamp(routeChangeTime) }}</span>
                  <button mat-stroked-button (click)="refreshRoute()">
                    <mat-icon>refresh</mat-icon>
                    Refresh Route
                  </button>
                </div>
              </div>

              <div class="route-visualization">
                <div class="route-path">
                  <div class="route-hop source-hop">
                    <div class="hop-icon">
                      <mat-icon>router</mat-icon>
                    </div>
                    <div class="hop-details">
                      <div class="hop-name">{{ networkPath.monitoringPoint }}</div>
                      <div class="hop-ip">Source</div>
                    </div>
                  </div>

                  <div class="route-hop" *ngFor="let hop of routeHops; let i = index" [class.highlighted]="selectedHop === i">
                    <div class="hop-connector"></div>
                    <div class="hop-icon" (click)="selectHop(i)">
                      <span class="hop-number">{{ hop.hopNumber }}</span>
                    </div>
                    <div class="hop-details" (click)="selectHop(i)">
                      <div class="hop-name">{{ hop.hostname || hop.ipAddress }}</div>
                      <div class="hop-ip">{{ hop.ipAddress }}</div>
                      <div class="hop-metrics">
                        <span class="metric">{{ hop.latency }}ms</span>
                        <span class="metric" *ngIf="hop.packetLoss > 0">{{ hop.packetLoss }}% loss</span>
                      </div>
                    </div>
                  </div>

                  <div class="route-hop target-hop">
                    <div class="hop-connector"></div>
                    <div class="hop-icon">
                      <mat-icon>language</mat-icon>
                    </div>
                    <div class="hop-details">
                      <div class="hop-name">{{ networkPath.target }}</div>
                      <div class="hop-ip">Target</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hop Details -->
              <div class="hop-details-panel" *ngIf="selectedHop !== null">
                <h4>Hop {{ routeHops[selectedHop]?.hopNumber }} Details</h4>
                <div class="hop-info-grid">
                  <div class="info-item">
                    <span class="label">IP Address:</span>
                    <span class="value">{{ routeHops[selectedHop]?.ipAddress }}</span>
                  </div>
                  <div class="info-item" *ngIf="routeHops[selectedHop]?.hostname">
                    <span class="label">Hostname:</span>
                    <span class="value">{{ routeHops[selectedHop]?.hostname }}</span>
                  </div>
                  <div class="info-item" *ngIf="routeHops[selectedHop]?.asn">
                    <span class="label">ASN:</span>
                    <span class="value">{{ routeHops[selectedHop]?.asn }}</span>
                  </div>
                  <div class="info-item" *ngIf="routeHops[selectedHop]?.location">
                    <span class="label">Location:</span>
                    <span class="value">{{ routeHops[selectedHop]?.location }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Latency:</span>
                    <span class="value">{{ routeHops[selectedHop]?.latency }}ms</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Packet Loss:</span>
                    <span class="value">{{ routeHops[selectedHop]?.packetLoss }}%</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Response Time:</span>
                    <span class="value">{{ routeHops[selectedHop]?.responseTime }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
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
  
  // Metrics data
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
  
  // Expose Math to template
  Math = Math;

  constructor(
    public dialogRef: MatDialogRef<NetworkPathDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { networkPath: NetworkPath },
    private appNetaService: AppNetaService
  ) {
    this.networkPath = data.networkPath;
  }

  ngOnInit(): void {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.isLoading = true;
    this.loadMetricsData();
    this.loadEventsData();
    this.loadRouteData();
  }

  private loadMetricsData(): void {
    this.appNetaService.getNetworkPathMetrics(this.networkPath.id, this.selectedTimeRange)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.metricsData = metrics;
          this.currentMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading metrics data:', error);
          this.isLoading = false;
        }
      });
  }

  private loadEventsData(): void {
    this.appNetaService.getNetworkPathEvents(this.networkPath.id, this.selectedTimeRange)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.networkEvents = events;
          this.filteredEvents = [...events];
        },
        error: (error) => {
          console.error('Error loading events data:', error);
        }
      });
  }

  private loadRouteData(): void {
    this.appNetaService.getNetworkPathRoute(this.networkPath.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hops) => {
          this.routeHops = hops;
        },
        error: (error) => {
          console.error('Error loading route data:', error);
        }
      });
  }

  private startAutoRefresh(): void {
    interval(30000) // Refresh every 30 seconds
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          this.loadMetricsData();
          return [];
        })
      )
      .subscribe();
  }

  getCurrentMetric(metric: keyof NetworkPathMetrics): number {
    if (!this.currentMetrics) return 0;
    const value = this.currentMetrics[metric];
    return typeof value === 'number' ? Math.round(value * 100) / 100 : 0;
  }

  getMetricTrend(metric: keyof NetworkPathMetrics): number {
    if (this.metricsData.length < 2) return 0;
    const current = this.metricsData[this.metricsData.length - 1][metric] as number;
    const previous = this.metricsData[this.metricsData.length - 2][metric] as number;
    return Math.round(((current - previous) / previous) * 100);
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok': return 'status-ok';
      case 'warning': return 'status-warning';
      case 'critical': return 'status-critical';
      case 'failed': return 'status-failed';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok': return 'check_circle';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'failed': return 'cancel';
      default: return 'help';
    }
  }

  getEventIcon(type: string, severity: string): string {
    switch (type) {
      case 'Alert Condition':
        return severity === 'critical' ? 'error' : 'warning';
      case 'Route Change':
        return 'alt_route';
      case 'Connectivity':
        return 'wifi';
      case 'Performance':
        return 'speed';
      default:
        return 'info';
    }
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
      const typeMatch = !this.selectedEventType || event.type === this.selectedEventType;
      const searchMatch = !this.eventSearchTerm || 
        event.description.toLowerCase().includes(this.eventSearchTerm.toLowerCase()) ||
        (event.details && event.details.toLowerCase().includes(this.eventSearchTerm.toLowerCase()));
      return typeMatch && searchMatch;
    });
  }

  selectHop(index: number): void {
    this.selectedHop = this.selectedHop === index ? null : index;
  }

  refreshData(): void {
    this.loadData();
  }

  refreshRoute(): void {
    this.loadRouteData();
    this.routeChangeTime = new Date().toISOString();
  }

  exportData(): void {
    // Implement data export functionality
    console.log('Exporting network path data...');
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
} 