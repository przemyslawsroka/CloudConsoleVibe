import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';
import { NetworkHealthMonitorService, NetworkHealthMonitor } from '../../services/network-health-monitor.service';
import { CreateHealthMonitorDialogComponent } from './create-health-monitor-dialog.component';

@Component({
  selector: 'app-network-health-monitor',
  template: `
    <div class="health-monitor-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="service-info">
            <div class="service-icon">
              <mat-icon>health_and_safety</mat-icon>
            </div>
            <div class="service-details">
              <h1>Network Health Monitor</h1>
              <p class="service-tagline">Proactive Network Visibility, Powered by ML</p>
            </div>
          </div>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="createMonitor()">
              <mat-icon>add</mat-icon>
              CREATE MONITOR
            </button>
            <button mat-stroked-button color="accent" (click)="showRecommendations()">
              <mat-icon>lightbulb</mat-icon>
              RECOMMEND WHAT TO MONITOR
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Section -->
      <div class="overview-section" *ngIf="showOverview">
        <mat-card class="overview-card">
          <mat-card-content>
            <p class="overview-description">
              Determine Health Status of your Network understanding if it is problem with Your Project or Google infrastructure.
              Works for GCP Network and may be extended to Internet / On-Prem / Multicloud by leveraging Monitoring Points
              from Cloud Network Insights.
            </p>

            <!-- Network Diagram -->
            <div class="network-diagram">
              <div class="diagram-container">
                <div class="internet-section">
                  <mat-icon class="internet-icon">public</mat-icon>
                  <span class="network-label">Internet</span>
                </div>
                
                <div class="gateway-section">
                  <div class="gateway-box">
                    <span class="gateway-label">Internet Gateway</span>
                  </div>
                </div>

                <div class="subnets-section">
                  <div class="subnet-container">
                    <div class="subnet-box subnet-a">
                      <div class="vm-instance">
                        <mat-icon>computer</mat-icon>
                        <span>VM-A</span>
                      </div>
                      <span class="subnet-label">Subnet-a</span>
                    </div>
                    
                    <div class="connection-line"></div>
                    
                    <div class="subnet-box subnet-b">
                      <div class="vm-instance">
                        <mat-icon>computer</mat-icon>
                        <span>VM-B</span>
                      </div>
                      <span class="subnet-label">Subnet-b</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Monitoring Techniques -->
            <div class="techniques-section">
              <h3>Network Health Monitor uses 3 techniques to analyze your network</h3>
              
              <div class="techniques-grid">
                <div class="technique-card">
                  <div class="technique-icon">
                    <mat-icon>timeline</mat-icon>
                  </div>
                  <h4>Sampled Traffic with Anomaly Detection</h4>
                  <p>Uses ML on traffic from the last 28 days (volume, latency, loss, throttling) to identify issues, with tunable thresholds.</p>
                  <div class="technique-uses">
                    <strong>Uses:</strong>
                    <ul>
                      <li>Traffic throughput (byte & packet sent)</li>
                      <li>Round Trip Time</li>
                      <li>One Way Network Latency</li>
                      <li>One Way Packet Loss (hardware driven)</li>
                      <li>Packet Drops (software driven)</li>
                    </ul>
                  </div>
                </div>

                <div class="technique-card">
                  <div class="technique-icon">
                    <mat-icon>search</mat-icon>
                  </div>
                  <h4>Configuration Analysis</h4>
                  <p>Identifies potential network setup issues through intelligent configuration checks.</p>
                  <div class="technique-uses">
                    <strong>Uses:</strong>
                    <ul>
                      <li>Your project configuration</li>
                    </ul>
                  </div>
                </div>

                <div class="technique-card">
                  <div class="technique-icon">
                    <mat-icon>flash_on</mat-icon>
                  </div>
                  <h4>Synthetic Traffic</h4>
                  <p>Measures latency and packet loss between locations, even without traffic.</p>
                  <div class="technique-uses">
                    <strong>Uses:</strong>
                    <ul>
                      <li>One Way Network Latency</li>
                      <li>One Way Packet Loss</li>
                    </ul>
                    <div class="additional-info">
                      <strong>Additionally (from Cloud Network Insights):</strong>
                      <ul>
                        <li>Latency and Packet Loss from Active probing by Monitoring Points.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="overview-footer">
              <p>Each Health Monitor exports Metrics used to determine network performance and Events (as Logs) that reflect
              traffic anomalies, configuration issues and network health changes. You can define your own alerts on top of them.</p>
              <a href="#" class="learn-more-link">Learn more...</a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Health Monitors Section -->
      <div class="monitors-section">
        <div class="section-header">
          <h2>Health Monitors</h2>
          <div class="table-actions">
            <button mat-raised-button color="primary" (click)="createMonitor()">
              <mat-icon>add</mat-icon>
              CREATE MONITOR
            </button>
          </div>
        </div>

        <!-- Filters and Table Controls -->
        <div class="table-controls">
          <div class="filter-section">
            <button mat-icon-button class="filter-button">
              <mat-icon>filter_list</mat-icon>
            </button>
            <span class="filter-label">Filter table</span>
          </div>
          <div class="table-info">
            <mat-icon class="info-icon">info</mat-icon>
            <button mat-icon-button class="view-options">
              <mat-icon>view_column</mat-icon>
            </button>
          </div>
        </div>

        <!-- Monitors Table -->
        <div class="monitors-table-container">
          <table mat-table [dataSource]="monitors" class="monitors-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let monitor">
                <a class="monitor-link" (click)="viewMonitorDetails(monitor.name)">{{ monitor.name }}</a>
              </td>
            </ng-container>

            <!-- Google Network Status Column -->
            <ng-container matColumnDef="googleNetwork">
              <th mat-header-cell *matHeaderCellDef>Google Network</th>
              <td mat-cell *matCellDef="let monitor">
                <div class="status-indicator" [ngClass]="getGoogleNetworkStatusClass(monitor.googleNetworkStatus)">
                  <mat-icon>{{ getGoogleNetworkStatusIcon(monitor.googleNetworkStatus) }}</mat-icon>
                  <span>{{ monitor.googleNetworkStatus }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Customer Network Status Column -->
            <ng-container matColumnDef="customerNetwork">
              <th mat-header-cell *matHeaderCellDef>Customer Network</th>
              <td mat-cell *matCellDef="let monitor">
                <div class="status-indicator" [ngClass]="getCustomerNetworkStatusClass(monitor.customerNetworkStatus)">
                  <mat-icon>{{ getCustomerNetworkStatusIcon(monitor.customerNetworkStatus) }}</mat-icon>
                  <span>{{ monitor.customerNetworkStatus }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Source Column -->
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let monitor">
                <span class="network-location">{{ getSourceDisplay(monitor) }}</span>
              </td>
            </ng-container>

            <!-- Destination Column -->
            <ng-container matColumnDef="destination">
              <th mat-header-cell *matHeaderCellDef>Destination</th>
              <td mat-cell *matCellDef="let monitor">
                <span class="network-location">{{ getDestinationDisplay(monitor) }}</span>
              </td>
            </ng-container>

            <!-- Details Column -->
            <ng-container matColumnDef="details">
              <th mat-header-cell *matHeaderCellDef>Details</th>
              <td mat-cell *matCellDef="let monitor">
                <button mat-icon-button [matMenuTriggerFor]="monitorMenu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #monitorMenu="matMenu">
                  <button mat-menu-item (click)="viewMonitorDetails(monitor.name)">
                    <mat-icon>visibility</mat-icon>
                    <span>View details</span>
                  </button>
                  <button mat-menu-item (click)="rerunMonitor(monitor.name)">
                    <mat-icon>refresh</mat-icon>
                    <span>Rerun</span>
                  </button>
                  <button mat-menu-item (click)="editMonitor(monitor.name)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteMonitor(monitor.name)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-container">
          <div class="pagination-info">
            <span>Rows per page:</span>
            <mat-select value="20" class="page-size-select">
              <mat-option value="10">10</mat-option>
              <mat-option value="20">20</mat-option>
              <mat-option value="50">50</mat-option>
            </mat-select>
            <span class="page-range">1 – 10 of {{ monitors.length }}</span>
          </div>
          <div class="pagination-controls">
            <button mat-icon-button disabled>
              <mat-icon>first_page</mat-icon>
            </button>
            <button mat-icon-button disabled>
              <mat-icon>chevron_left</mat-icon>
            </button>
            <button mat-icon-button disabled>
              <mat-icon>chevron_right</mat-icon>
            </button>
            <button mat-icon-button disabled>
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-monitor-container {
      background: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .page-header {
      background: var(--surface-color);
      padding: 24px 40px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .service-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .service-icon {
      background: #4285f4;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .service-icon mat-icon {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .service-details h1 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--text-color);
    }

    .service-tagline {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .overview-section {
      padding: 24px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .overview-card {
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .overview-description {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-color);
      margin-bottom: 32px;
    }

    .network-diagram {
      margin: 32px 0;
      padding: 24px;
      background: var(--hover-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .diagram-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .internet-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .internet-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #4285f4;
    }

    .network-label {
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .gateway-section {
      position: relative;
    }

    .gateway-box {
      border: 2px dashed #4285f4;
      border-radius: 8px;
      padding: 16px 24px;
      background: var(--surface-color);
    }

    .gateway-label {
      color: #4285f4;
      font-weight: 500;
    }

    .subnets-section {
      width: 100%;
      max-width: 600px;
    }

    .subnet-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
    }

    .subnet-box {
      flex: 1;
      background: rgba(66, 133, 244, 0.1);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      border: 1px solid rgba(66, 133, 244, 0.2);
    }

    .vm-instance {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: var(--surface-color);
      padding: 12px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      border: 1px solid var(--border-color);
    }

    .vm-instance mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #4285f4;
    }

    .vm-instance span {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-color);
    }

    .subnet-label {
      font-size: 14px;
      color: #1a73e8;
      font-weight: 500;
    }

    .connection-line {
      height: 2px;
      background: #4285f4;
      flex: 0 0 40px;
      position: relative;
    }

    .connection-line::before {
      content: '';
      position: absolute;
      right: 0;
      top: -3px;
      width: 0;
      height: 0;
      border-left: 8px solid #4285f4;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
    }

    .techniques-section {
      margin: 40px 0;
    }

    .techniques-section h3 {
      margin: 0 0 24px 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
    }

    .techniques-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .technique-card {
      padding: 24px;
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      border: 1px solid var(--border-color);
    }

    .technique-icon {
      margin-bottom: 16px;
    }

    .technique-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #4285f4;
    }

    .technique-card h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .technique-card p {
      margin: 0 0 16px 0;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    .technique-uses {
      font-size: 14px;
      color: var(--text-color);
    }

    .technique-uses ul {
      margin: 8px 0;
      padding-left: 20px;
    }

    .technique-uses li {
      margin-bottom: 4px;
      color: var(--text-secondary-color);
    }

    .additional-info {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }

    .overview-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      text-align: center;
    }

    .overview-footer p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .learn-more-link {
      color: #1a73e8;
      text-decoration: none;
      font-size: 14px;
    }

    .monitors-section {
      padding: 24px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: var(--text-color);
    }

    .table-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-button {
      color: var(--text-secondary-color);
    }

    .filter-label {
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .table-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-icon {
      color: var(--text-secondary-color);
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .view-options {
      color: var(--text-secondary-color);
    }

    .monitors-table-container {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .monitors-table {
      width: 100%;
    }

    .monitors-table th {
      background: var(--hover-color);
      font-weight: 500;
      color: var(--text-secondary-color);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .monitor-link {
      color: #1a73e8;
      cursor: pointer;
      text-decoration: none;
    }

    .monitor-link:hover {
      text-decoration: underline;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-healthy {
      color: #137333;
    }

    .status-unhealthy {
      color: #d93025;
    }

    .status-operational {
      color: #137333;
    }

    .status-anomaly {
      color: #f29900;
    }

    .status-configuration-issue {
      color: #d93025;
    }

    .status-network-failure {
      color: #d93025;
    }

    .network-location {
      font-size: 14px;
      color: var(--text-color);
    }

    .delete-action {
      color: #d93025;
    }

    .pagination-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--surface-color);
      border-top: 1px solid var(--border-color);
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .page-size-select {
      width: 60px;
    }

    .pagination-controls {
      display: flex;
      gap: 4px;
    }

    @media (max-width: 768px) {
      .page-header,
      .overview-section,
      .monitors-section {
        padding: 16px 20px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .subnet-container {
        flex-direction: column;
        gap: 16px;
      }

      .connection-line {
        height: 40px;
        width: 2px;
        flex: 0 0 40px;
      }

      .connection-line::before {
        top: auto;
        bottom: 0;
        left: -3px;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 8px solid #4285f4;
      }

      .techniques-grid {
        grid-template-columns: 1fr;
      }

      .monitors-table-container {
        overflow-x: auto;
      }

      .pagination-container {
        flex-direction: column;
        gap: 16px;
      }
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .overview-card,
      .technique-card,
      .monitors-table-container,
      .vm-instance {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .network-diagram {
        background: rgba(var(--primary-rgb), 0.05);
      }

      .subnet-box {
        background: rgba(66, 133, 244, 0.08);
        border: 1px solid rgba(66, 133, 244, 0.15);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-header {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-title {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-subtitle {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-card-content {
        color: var(--text-color) !important;
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-raised-button {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button {
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
      }

      .mat-mdc-icon-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-table {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-header-row {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-header-cell {
        color: var(--text-secondary-color) !important;
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-row {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-cell {
        color: var(--text-color) !important;
      }

      .mat-mdc-row:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-menu-panel {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-item {
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-item:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-select {
        color: var(--text-color) !important;
      }

      .mat-mdc-select-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-option {
        color: var(--text-color) !important;
      }

      .mat-mdc-option:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-card {
      background-color: var(--surface-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    ::ng-deep .mat-mdc-card-title {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-card-subtitle {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-card-content {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-button {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-table {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-header-row {
      background-color: var(--hover-color);
    }

    ::ng-deep .mat-mdc-header-cell {
      color: var(--text-secondary-color);
      background-color: var(--hover-color);
    }

    ::ng-deep .mat-mdc-row {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-cell {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-row:hover {
      background-color: var(--hover-color);
    }
  `]
})
export class NetworkHealthMonitorComponent implements OnInit {
  displayedColumns: string[] = ['name', 'googleNetwork', 'customerNetwork', 'source', 'destination', 'details'];
  monitors: NetworkHealthMonitor[] = [];
  showOverview = true;
  projectId: string | null = null;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private projectService: ProjectService,
    private networkHealthService: NetworkHealthMonitorService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadHealthMonitors();
    });
  }

  loadHealthMonitors() {
    if (!this.projectId) return;

    this.networkHealthService.getHealthMonitors(this.projectId).subscribe({
      next: (monitors) => {
        this.monitors = monitors;
        this.showOverview = monitors.length === 0;
      },
      error: (error) => {
        console.error('Error loading health monitors:', error);
        this.snackBar.open('Error loading health monitors', 'Close', { duration: 3000 });
      }
    });
  }

  createMonitor() {
    const dialogRef = this.dialog.open(CreateHealthMonitorDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadHealthMonitors();
        this.snackBar.open('Health monitor created successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  showRecommendations() {
    this.snackBar.open('Monitoring recommendations feature coming soon...', 'Close', { duration: 3000 });
  }

  viewMonitorDetails(monitorName: string) {
    this.router.navigate(['/network-health-monitor', monitorName]);
  }

  rerunMonitor(monitorName: string) {
    if (!this.projectId) return;

    this.networkHealthService.rerunMonitor(this.projectId, monitorName).subscribe({
      next: () => {
        this.snackBar.open('Monitor analysis restarted', 'Close', { duration: 3000 });
        this.loadHealthMonitors();
      },
      error: (error) => {
        console.error('Error rerunning monitor:', error);
        this.snackBar.open('Error restarting monitor analysis', 'Close', { duration: 3000 });
      }
    });
  }

  editMonitor(monitorName: string) {
    this.snackBar.open('Edit monitor feature coming soon...', 'Close', { duration: 3000 });
  }

  deleteMonitor(monitorName: string) {
    if (!this.projectId) return;

    if (confirm(`Are you sure you want to delete monitor "${monitorName}"?`)) {
      this.networkHealthService.deleteHealthMonitor(this.projectId, monitorName).subscribe({
        next: () => {
          this.snackBar.open('Monitor deleted successfully', 'Close', { duration: 3000 });
          this.loadHealthMonitors();
        },
        error: (error) => {
          console.error('Error deleting monitor:', error);
          this.snackBar.open('Error deleting monitor', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getGoogleNetworkStatusClass(status: string): string {
    switch (status) {
      case 'Healthy': return 'status-healthy';
      case 'Unhealthy': return 'status-unhealthy';
      default: return '';
    }
  }

  getGoogleNetworkStatusIcon(status: string): string {
    switch (status) {
      case 'Healthy': return 'check_circle';
      case 'Unhealthy': return 'cancel';
      default: return 'help';
    }
  }

  getCustomerNetworkStatusClass(status: string): string {
    switch (status) {
      case 'Operational': return 'status-operational';
      case 'Anomaly Detected': return 'status-anomaly';
      case 'Configuration Issue': return 'status-configuration-issue';
      case 'Network Failure': return 'status-network-failure';
      default: return '';
    }
  }

  getCustomerNetworkStatusIcon(status: string): string {
    switch (status) {
      case 'Operational': return 'check_circle';
      case 'Anomaly Detected': return 'warning';
      case 'Configuration Issue': return 'error';
      case 'Network Failure': return 'cancel';
      default: return 'help';
    }
  }

  getSourceDisplay(monitor: NetworkHealthMonitor): string {
    if (monitor.source.subnetwork) {
      return `(default) ${monitor.source.subnetwork}`;
    }
    if (monitor.source.instance) {
      return monitor.source.instance;
    }
    return monitor.source.region || 'Unknown';
  }

  getDestinationDisplay(monitor: NetworkHealthMonitor): string {
    if (monitor.destination.subnetwork) {
      return `(default) ${monitor.destination.subnetwork}`;
    }
    if (monitor.destination.instance) {
      return monitor.destination.instance;
    }
    return monitor.destination.region || 'Unknown';
  }
} 