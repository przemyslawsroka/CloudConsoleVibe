import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService, Project } from '../../services/project.service';
import { NetworkHealthMonitorService, NetworkHealthMonitor, MonitorObservations } from '../../services/network-health-monitor.service';

@Component({
  selector: 'app-network-health-monitor-details',
  template: `
    <div class="monitor-details-container" *ngIf="monitor">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-navigation">
            <button mat-icon-button (click)="goBack()" class="back-button">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1>{{ monitor.name }}</h1>
            <mat-icon class="status-icon" [ngClass]="getOverallStatusClass()">
              {{ getOverallStatusIcon() }}
            </mat-icon>
          </div>
          <div class="header-actions">
            <button mat-button (click)="rerunMonitor()">
              <mat-icon>refresh</mat-icon>
              RERUN
            </button>
            <button mat-button (click)="editMonitor()">
              <mat-icon>edit</mat-icon>
              EDIT
            </button>
            <button mat-button (click)="deleteMonitor()" class="delete-button">
              <mat-icon>delete</mat-icon>
              DELETE
            </button>
          </div>
        </div>
      </div>

      <!-- Monitor Configuration -->
      <div class="monitor-config">
        <div class="config-section">
          <h3>Source</h3>
          <div class="config-details">
            <span><strong>Subnetwork:</strong> {{ getSourceDisplay() }}</span>
            <span><strong>Project:</strong> {{ monitor.source.project || 'Unknown' }}</span>
          </div>
        </div>
        <div class="config-section">
          <h3>Destination</h3>
          <div class="config-details">
            <span><strong>Subnetwork:</strong> {{ getDestinationDisplay() }}</span>
            <span><strong>Project:</strong> {{ monitor.destination.project || 'Unknown' }}</span>
          </div>
        </div>
      </div>

      <!-- Observations Section -->
      <div class="observations-section" *ngIf="observations">
        <h2>Observations</h2>

        <!-- Google Infrastructure Status -->
        <div class="status-alert" [ngClass]="getGoogleInfrastructureAlertClass()">
          <mat-icon>{{ getGoogleInfrastructureIcon() }}</mat-icon>
          <span>{{ observations.googleInfrastructure.message }}</span>
        </div>

        <!-- Traffic Anomaly Alert (if any) -->
        <div class="status-alert anomaly-alert" *ngIf="hasTrafficAnomaly()">
          <mat-icon>warning</mat-icon>
          <span>{{ getAnomalyMessage() }}</span>
          <div class="anomaly-details">
            <span>We identified traffic change in your network, however there are no signals indicating that this is problem with Google Infrastructure</span>
            <a href="#" class="learn-more">Learn about next steps</a>
          </div>
        </div>

        <!-- Configuration Issue Alert (if any) -->
        <div class="status-alert error-alert" *ngIf="hasConfigurationIssue()">
          <mat-icon>error</mat-icon>
          <span>{{ getConfigurationIssueMessage() }}</span>
        </div>

        <!-- Monitoring Techniques Tabs -->
        <mat-tab-group class="techniques-tabs" [(selectedIndex)]="selectedTabIndex">
          <mat-tab label="Sampled Traffic">
            <div class="tab-content">
              <div class="tab-icon-status" [ngClass]="getTechniqueStatusClass(observations.sampledTraffic.status)">
                <mat-icon>{{ getTechniqueStatusIcon(observations.sampledTraffic.status) }}</mat-icon>
                <span>Sampled Traffic</span>
              </div>
              <p>{{ observations.sampledTraffic.description }}</p>

              <!-- Traffic Charts -->
              <div class="charts-section" *ngIf="observations.trafficData && observations.trafficData.length > 0">
                <!-- Traffic in Last 72 Hours -->
                <div class="chart-container">
                  <div class="chart-header">
                    <h4>Traffic in the Last 72 hours</h4>
                    <button mat-icon-button>
                      <mat-icon>more_vert</mat-icon>
                    </button>
                  </div>
                  <div class="chart-content">
                    <div class="chart-placeholder">
                      <div class="traffic-chart">
                        <div class="chart-y-axis">
                          <span>700Kb</span>
                          <span>600Kb</span>
                          <span>500Kb</span>
                          <span>400Kb</span>
                          <span>0</span>
                        </div>
                        <div class="chart-area">
                          <svg class="chart-svg" viewBox="0 0 800 200">
                            <path d="M 0 150 Q 100 140 200 145 T 400 150 T 600 160 L 700 120 L 800 100" 
                                  stroke="#e91e63" 
                                  stroke-width="2" 
                                  fill="none"/>
                            <!-- Anomaly marker -->
                            <g *ngIf="hasTrafficAnomaly()">
                              <line x1="700" y1="20" x2="700" y2="180" stroke="#ff9800" stroke-width="1" stroke-dasharray="3,3"/>
                              <circle cx="700" cy="120" r="4" fill="#ff9800"/>
                              <path d="M 690 10 L 700 20 L 710 10 Z" fill="#ff9800"/>
                            </g>
                          </svg>
                        </div>
                        <div class="chart-x-axis">
                          <span>UTC-4</span>
                          <span>8:30 PM</span>
                          <span>8:40 PM</span>
                          <span>8:50 PM</span>
                          <span>9:00 PM</span>
                          <span>9:10 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="legend">
                    <div class="legend-item">
                      <div class="legend-color instance-name"></div>
                      <span>instance name</span>
                    </div>
                    <div class="legend-indicator" *ngIf="hasTrafficAnomaly()">
                      <mat-icon class="anomaly-icon">warning</mat-icon>
                    </div>
                  </div>
                </div>

                <!-- Latency Chart -->
                <div class="chart-container">
                  <div class="chart-header">
                    <h4>Median Latency in the last 72 hours</h4>
                    <button mat-icon-button>
                      <mat-icon>more_vert</mat-icon>
                    </button>
                  </div>
                  <div class="chart-content">
                    <div class="chart-placeholder">
                      <div class="latency-chart">
                        <div class="chart-y-axis">
                          <span>40 ms</span>
                          <span>30 ms</span>
                          <span>20 ms</span>
                          <span>10 ms</span>
                          <span>0</span>
                        </div>
                        <div class="chart-area">
                          <svg class="chart-svg" viewBox="0 0 800 200">
                            <path d="M 0 150 Q 100 160 200 155 Q 300 145 400 150 Q 500 140 600 145 Q 650 130 700 110 L 800 100" 
                                  stroke="#e91e63" 
                                  stroke-width="2" 
                                  fill="none"/>
                            <!-- Latency spike marker -->
                            <g *ngIf="hasConfigurationIssue()">
                              <line x1="450" y1="20" x2="450" y2="180" stroke="#ff9800" stroke-width="1" stroke-dasharray="3,3"/>
                              <circle cx="450" cy="100" r="4" fill="#ff9800"/>
                              <path d="M 440 10 L 450 20 L 460 10 Z" fill="#ff9800"/>
                            </g>
                          </svg>
                        </div>
                        <div class="chart-x-axis">
                          <span>UTC-4</span>
                          <span>8:30 PM</span>
                          <span>8:40 PM</span>
                          <span>8:50 PM</span>
                          <span>9:00 PM</span>
                          <span>9:10 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="legend">
                    <div class="legend-item">
                      <div class="legend-color instance-name"></div>
                      <span>instance name</span>
                    </div>
                    <div class="legend-indicator" *ngIf="hasConfigurationIssue()">
                      <mat-icon class="anomaly-icon">warning</mat-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Config Analysis">
            <div class="tab-content">
              <div class="tab-icon-status" [ngClass]="getTechniqueStatusClass(observations.configAnalysis.status)">
                <mat-icon>{{ getTechniqueStatusIcon(observations.configAnalysis.status) }}</mat-icon>
                <span>Config Analysis</span>
              </div>
              <p>{{ observations.configAnalysis.description }}</p>

              <!-- Configuration Analysis Results -->
              <div class="config-analysis-section" *ngIf="hasConfigurationIssue()">
                <div class="analysis-header">
                  <h4>Configuration analysis trace path</h4>
                </div>

                <div class="trace-path">
                  <div class="trace-step">
                    <div class="step-icon vm-instance">
                      <mat-icon>computer</mat-icon>
                    </div>
                    <span class="step-label">VM instance</span>
                    <mat-icon class="expand-icon">expand_more</mat-icon>
                  </div>

                  <div class="trace-connector"></div>

                  <div class="trace-step">
                    <div class="step-icon firewall-rule">
                      <mat-icon>security</mat-icon>
                    </div>
                    <span class="step-label">Default egress firewall rule</span>
                    <mat-icon class="expand-icon">expand_more</mat-icon>
                  </div>

                  <div class="trace-connector"></div>

                  <div class="trace-step">
                    <div class="step-icon subnet-route">
                      <mat-icon>route</mat-icon>
                    </div>
                    <span class="step-label">Subnet route</span>
                    <mat-icon class="expand-icon">expand_more</mat-icon>
                  </div>

                  <div class="trace-connector"></div>

                  <div class="trace-step">
                    <div class="step-icon vm-instance">
                      <mat-icon>computer</mat-icon>
                    </div>
                    <span class="step-label">VM instance</span>
                    <mat-icon class="expand-icon">expand_more</mat-icon>
                  </div>

                  <div class="trace-connector"></div>

                  <div class="trace-step">
                    <div class="step-icon ingress-rule">
                      <mat-icon>security</mat-icon>
                    </div>
                    <span class="step-label">Ingress firewall rule</span>
                    <mat-icon class="expand-icon">expand_more</mat-icon>
                  </div>
                </div>

                <div class="delivery-status success" *ngIf="!hasConfigurationIssue()">
                  <mat-icon>check_circle</mat-icon>
                  <div class="status-content">
                    <h4>Packet could be delivered</h4>
                    <p>Packet could be delivered to the VM instance (gke-hubble-demo-default-pool-84f60aaf-655e)</p>
                  </div>
                </div>

                <div class="delivery-status error" *ngIf="hasConfigurationIssue()">
                  <mat-icon>cancel</mat-icon>
                  <div class="status-content">
                    <h4>Unreachable - we identified configuration problems with the connectivity</h4>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Synthetic Traffic">
            <div class="tab-content">
              <div class="tab-icon-status" [ngClass]="getTechniqueStatusClass(observations.syntheticTraffic.status)">
                <mat-icon>{{ getTechniqueStatusIcon(observations.syntheticTraffic.status) }}</mat-icon>
                <span>Synthetic Traffic</span>
              </div>
              <p>{{ observations.syntheticTraffic.description }}</p>
              
              <div class="synthetic-traffic-info">
                <p>Synthetic traffic monitoring provides active probing results for this network path.</p>
                <p>Current status: <strong>{{ observations.syntheticTraffic.status }}</strong></p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="!monitor">
      <mat-spinner></mat-spinner>
      <p>Loading monitor details...</p>
    </div>
  `,
  styles: [`
    .monitor-details-container {
      background: #f8f9fa;
      min-height: 100vh;
    }

    .page-header {
      background: white;
      padding: 24px 40px;
      border-bottom: 1px solid #e0e0e0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-navigation {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      color: #5f6368;
    }

    .header-navigation h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .status-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-icon.healthy {
      color: #137333;
    }

    .status-icon.unhealthy {
      color: #d93025;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .delete-button {
      color: #d93025;
    }

    .monitor-config {
      padding: 24px 40px;
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .config-section h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .config-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      color: #5f6368;
    }

    .observations-section {
      padding: 0 40px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .observations-section h2 {
      margin: 0 0 24px 0;
      font-size: 20px;
      font-weight: 500;
      color: #202124;
    }

    .status-alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .status-alert.success {
      background: #e8f5e8;
      color: #137333;
      border: 1px solid #4caf50;
    }

    .status-alert.anomaly-alert {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffc107;
    }

    .status-alert.error-alert {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .status-alert mat-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .anomaly-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .learn-more {
      color: #1a73e8;
      text-decoration: none;
      font-size: 14px;
    }

    .techniques-tabs {
      margin-top: 24px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .tab-icon-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .tab-icon-status.healthy {
      color: #137333;
    }

    .tab-icon-status.warning {
      color: #f29900;
    }

    .tab-icon-status.error {
      color: #d93025;
    }

    .charts-section {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .chart-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      padding: 24px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .chart-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .chart-content {
      height: 200px;
      margin-bottom: 16px;
    }

    .traffic-chart,
    .latency-chart {
      display: flex;
      height: 100%;
    }

    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 50px;
      font-size: 12px;
      color: #5f6368;
      text-align: right;
      padding-right: 8px;
    }

    .chart-area {
      flex: 1;
      position: relative;
    }

    .chart-svg {
      width: 100%;
      height: 100%;
    }

    .chart-x-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #5f6368;
      padding-left: 58px;
    }

    .legend {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #5f6368;
    }

    .legend-color.instance-name {
      width: 12px;
      height: 12px;
      background: #e91e63;
      border-radius: 50%;
    }

    .legend-indicator .anomaly-icon {
      color: #ff9800;
      font-size: 18px;
    }

    .config-analysis-section {
      margin-top: 24px;
    }

    .analysis-header h4 {
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .trace-path {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin: 24px 0;
    }

    .trace-step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e8eaed;
      border-radius: 8px;
      width: 300px;
      cursor: pointer;
    }

    .trace-step:hover {
      background: #f8f9fa;
    }

    .step-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-icon.vm-instance {
      background: #e8f0fe;
      color: #1a73e8;
    }

    .step-icon.firewall-rule,
    .step-icon.ingress-rule {
      background: #fce8e6;
      color: #d93025;
    }

    .step-icon.subnet-route {
      background: #e8f5e8;
      color: #137333;
    }

    .step-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .step-label {
      flex: 1;
      font-size: 14px;
      color: #202124;
    }

    .expand-icon {
      color: #5f6368;
      font-size: 18px;
    }

    .trace-connector {
      width: 2px;
      height: 16px;
      background: #e8eaed;
    }

    .delivery-status {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      margin-top: 24px;
    }

    .delivery-status.success {
      background: #e8f5e8;
      color: #137333;
    }

    .delivery-status.error {
      background: #fce8e6;
      color: #d93025;
    }

    .delivery-status mat-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .status-content h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .status-content p {
      margin: 0;
      font-size: 14px;
    }

    .synthetic-traffic-info {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      margin-top: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .page-header,
      .monitor-config,
      .observations-section {
        padding-left: 20px;
        padding-right: 20px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .monitor-config {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .chart-x-axis {
        padding-left: 20px;
      }

      .trace-step {
        width: 100%;
      }
    }
  `]
})
export class NetworkHealthMonitorDetailsComponent implements OnInit {
  monitor: NetworkHealthMonitor | null = null;
  observations: MonitorObservations | null = null;
  selectedTabIndex = 0;
  projectId: string | null = null;
  monitorName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private projectService: ProjectService,
    private networkHealthService: NetworkHealthMonitorService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.monitorName = params['name'];
      this.loadMonitorDetails();
    });

    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      if (this.projectId && this.monitorName) {
        this.loadMonitorDetails();
      }
    });
  }

  loadMonitorDetails() {
    if (!this.projectId || !this.monitorName) return;

    // First get the monitor basic info
    this.networkHealthService.getHealthMonitors(this.projectId).subscribe({
      next: (monitors) => {
        this.monitor = monitors.find(m => m.name === this.monitorName) || null;
        
        if (this.monitor) {
          // Then get detailed observations
          this.loadObservations();
        } else {
          this.snackBar.open('Monitor not found', 'Close', { duration: 3000 });
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error loading monitor details:', error);
        this.snackBar.open('Error loading monitor details', 'Close', { duration: 3000 });
      }
    });
  }

  loadObservations() {
    if (!this.projectId || !this.monitorName) return;

    this.networkHealthService.getMonitorObservations(this.projectId, this.monitorName).subscribe({
      next: (observations) => {
        this.observations = observations;
      },
      error: (error) => {
        console.error('Error loading observations:', error);
        this.snackBar.open('Error loading monitor observations', 'Close', { duration: 3000 });
      }
    });
  }

  goBack() {
    this.router.navigate(['/network-health-monitor']);
  }

  rerunMonitor() {
    if (!this.projectId || !this.monitorName) return;

    this.networkHealthService.rerunMonitor(this.projectId, this.monitorName).subscribe({
      next: () => {
        this.snackBar.open('Monitor analysis restarted', 'Close', { duration: 3000 });
        setTimeout(() => this.loadObservations(), 2000); // Reload after a delay
      },
      error: (error) => {
        console.error('Error rerunning monitor:', error);
        this.snackBar.open('Error restarting monitor analysis', 'Close', { duration: 3000 });
      }
    });
  }

  editMonitor() {
    this.snackBar.open('Edit monitor feature coming soon...', 'Close', { duration: 3000 });
  }

  deleteMonitor() {
    if (!this.projectId || !this.monitorName) return;

    if (confirm(`Are you sure you want to delete monitor "${this.monitorName}"?`)) {
      this.networkHealthService.deleteHealthMonitor(this.projectId, this.monitorName).subscribe({
        next: () => {
          this.snackBar.open('Monitor deleted successfully', 'Close', { duration: 3000 });
          this.goBack();
        },
        error: (error) => {
          console.error('Error deleting monitor:', error);
          this.snackBar.open('Error deleting monitor', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getOverallStatusClass(): string {
    if (!this.monitor) return '';
    return this.monitor.googleNetworkStatus === 'Healthy' && 
           this.monitor.customerNetworkStatus === 'Operational' ? 'healthy' : 'unhealthy';
  }

  getOverallStatusIcon(): string {
    if (!this.monitor) return 'help';
    return this.getOverallStatusClass() === 'healthy' ? 'check_circle' : 'cancel';
  }

  getSourceDisplay(): string {
    if (!this.monitor) return '';
    return this.monitor.source.subnetwork || this.monitor.source.instance || this.monitor.source.region || 'Unknown';
  }

  getDestinationDisplay(): string {
    if (!this.monitor) return '';
    return this.monitor.destination.subnetwork || this.monitor.destination.instance || this.monitor.destination.region || 'Unknown';
  }

  getGoogleInfrastructureAlertClass(): string {
    if (!this.observations) return '';
    return this.observations.googleInfrastructure.status === 'No issues found' ? 'success' : 'error-alert';
  }

  getGoogleInfrastructureIcon(): string {
    if (!this.observations) return 'help';
    return this.observations.googleInfrastructure.status === 'No issues found' ? 'check_circle' : 'error';
  }

  hasTrafficAnomaly(): boolean {
    return this.monitor?.customerNetworkStatus === 'Anomaly Detected';
  }

  hasConfigurationIssue(): boolean {
    return this.monitor?.customerNetworkStatus === 'Configuration Issue';
  }

  getAnomalyMessage(): string {
    return 'Traffic Anomaly Detected - we identified major traffic volume change';
  }

  getConfigurationIssueMessage(): string {
    return 'Unreachable - we identified configuration problems with the connectivity.';
  }

  getTechniqueStatusClass(status: string): string {
    switch (status) {
      case 'Healthy': return 'healthy';
      case 'Warning': return 'warning';
      case 'Error': return 'error';
      default: return '';
    }
  }

  getTechniqueStatusIcon(status: string): string {
    switch (status) {
      case 'Healthy': return 'check_circle';
      case 'Warning': return 'warning';
      case 'Error': return 'error';
      default: return 'help';
    }
  }
} 