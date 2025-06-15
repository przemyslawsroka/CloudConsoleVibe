import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  AppNetaService, 
  NetworkPath, 
  WebPath, 
  MonitoringPoint, 
  MonitoringPolicy, 
  NetworkInsightsSummary 
} from '../../services/appneta.service';
import { CreateNetworkPathDialogComponent } from './create-network-path-dialog.component';
import { CreateWebPathDialogComponent } from './create-web-path-dialog.component';
import { CreateMonitoringPolicyDialogComponent } from './create-monitoring-policy-dialog.component';
import { NetworkPathDetailsComponent } from './network-path-details.component';

@Component({
  selector: 'app-cloud-network-insights',
  template: `
    <div class="insights-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon>insights</mat-icon>
          </div>
          <div class="header-text">
            <h1>Cloud Network Insights</h1>
            <p class="header-description">
              Cloud Network Insights integrates Broadcom AppNeta for advanced observability.
              <a href="#" class="learn-more-link" (click)="showAppNetaInfo()">Learn more about AppNeta</a>
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createAlertPolicy()">
            <mat-icon>add_alert</mat-icon>
            Create alert policy
          </button>
          <button mat-button (click)="viewAlertPolicies()">
            <mat-icon>policy</mat-icon>
            View alert policies
          </button>
          <button mat-icon-button [matMenuTriggerFor]="menu" class="more-actions">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="refreshData()">
              <mat-icon>refresh</mat-icon>
              Refresh Data
            </button>
            <button mat-menu-item (click)="testConnection()" [disabled]="connectionTesting">
              <mat-icon>wifi</mat-icon>
              Test Connection
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="exportData()">
              <mat-icon>download</mat-icon>
              Export Data
            </button>
            <button mat-menu-item (click)="viewDocumentation()">
              <mat-icon>help</mat-icon>
              Documentation
            </button>
          </mat-menu>
        </div>
      </div>



      <!-- Summary Cards -->
      <div class="summary-section" *ngIf="summary">
        <div class="summary-grid">
          <mat-card class="summary-card network-paths">
            <mat-card-header>
              <mat-card-title>Network Paths</mat-card-title>
              <mat-card-subtitle>Network hop-by-hop route analysis</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ summary.totalPaths }}</span>
                  <span class="stat-label">Total Paths</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-indicators">
                  <div class="indicator" [class.warning]="summary.connectivityLoss > 0">
                    <mat-icon>signal_wifi_off</mat-icon>
                    <span>{{ summary.connectivityLoss }}</span>
                    <small>Connectivity Loss</small>
                  </div>
                  <div class="indicator success">
                    <mat-icon>check_circle</mat-icon>
                    <span>{{ summary.okPaths }}</span>
                    <small>Ok</small>
                  </div>
                  <div class="indicator" [class.error]="summary.failedPaths > 0">
                    <mat-icon>error</mat-icon>
                    <span>{{ summary.failedPaths }}</span>
                    <small>Failed</small>
                  </div>
                  <div class="indicator disabled">
                    <mat-icon>pause_circle</mat-icon>
                    <span>{{ summary.disabledPaths }}</span>
                    <small>Disabled</small>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card web-paths">
            <mat-card-header>
              <mat-card-title>Web Paths</mat-card-title>
              <mat-card-subtitle>Application performance monitoring</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ summary.totalWebPaths }}</span>
                  <span class="stat-label">Total Web Paths</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-indicators">
                  <div class="indicator success">
                    <mat-icon>check_circle</mat-icon>
                    <span>{{ summary.okWebPaths }}</span>
                    <small>Ok</small>
                  </div>
                  <div class="indicator" [class.warning]="summary.warningWebPaths > 0">
                    <mat-icon>warning</mat-icon>
                    <span>{{ summary.warningWebPaths }}</span>
                    <small>Warning</small>
                  </div>
                  <div class="indicator" [class.error]="summary.failedWebPaths > 0">
                    <mat-icon>error</mat-icon>
                    <span>{{ summary.failedWebPaths }}</span>
                    <small>Failed</small>
                  </div>
                  <div class="indicator disabled">
                    <mat-icon>pause_circle</mat-icon>
                    <span>{{ summary.disabledWebPaths }}</span>
                    <small>Disabled</small>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button mat-stroked-button (click)="openCloudMonitoringDashboard()">
          <mat-icon>dashboard</mat-icon>
          See data in Cloud Monitoring dashboard
        </button>
        <button mat-stroked-button (click)="createNetworkPath()">
          <mat-icon>add</mat-icon>
          Create Network Path (in AppNeta UI)
        </button>
      </div>

      <!-- Main Content Tabs -->
      <mat-card class="main-content">
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          
          <!-- Network Paths Tab -->
          <mat-tab label="Network Paths">
            <div class="tab-content">
              <div class="tab-header">
                <h3>Network Paths</h3>
                <p>Network Path visualizes the specific hop-by-hop route that network traffic takes from a source to a destination, revealing performance characteristics along the way.</p>
                <button mat-raised-button color="primary" (click)="createNetworkPath()">
                  <mat-icon>add</mat-icon>
                  Create Network Path
                </button>
              </div>

              <div class="filter-section">
                <mat-form-field appearance="outline">
                  <mat-label>Filter table</mat-label>
                  <input matInput (keyup)="applyNetworkPathFilter($event)" placeholder="Filter by name, source, or target">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="filteredNetworkPaths" class="network-paths-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let path">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(path.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(path.status) }}</mat-icon>
                          {{ path.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let path">
                      <a [routerLink]="['/cloud-network-insights/path', path.id]" class="path-link">{{ path.name }}</a>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="monitoringPoint">
                    <th mat-header-cell *matHeaderCellDef>Monitoring Point Name</th>
                    <td mat-cell *matCellDef="let path">{{ path.monitoringPoint }}</td>
                  </ng-container>

                  <ng-container matColumnDef="target">
                    <th mat-header-cell *matHeaderCellDef>Target</th>
                    <td mat-cell *matCellDef="let path">{{ path.target }}</td>
                  </ng-container>

                  <ng-container matColumnDef="metrics">
                    <th mat-header-cell *matHeaderCellDef>Metrics</th>
                    <td mat-cell *matCellDef="let path">
                      <div class="metrics-display">
                        <span class="metric" *ngIf="path.latency !== undefined">
                          <mat-icon>schedule</mat-icon>
                          {{ path.latency }}ms
                        </span>
                        <span class="metric" *ngIf="path.packetLoss !== undefined">
                          <mat-icon>signal_wifi_off</mat-icon>
                          {{ path.packetLoss }}%
                        </span>
                        <span class="metric" *ngIf="path.jitter !== undefined">
                          <mat-icon>timeline</mat-icon>
                          {{ path.jitter }}ms
                        </span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let path">
                      <button mat-icon-button [matMenuTriggerFor]="pathMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #pathMenu="matMenu">
                        <button mat-menu-item (click)="viewNetworkPathDetails(path)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editNetworkPath(path)">
                          <mat-icon>edit</mat-icon>
                          Edit
                        </button>
                        <button mat-menu-item (click)="deleteNetworkPath(path)">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="networkPathColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: networkPathColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Web Paths Tab -->
          <mat-tab label="Web Paths">
            <div class="tab-content">
              <div class="tab-header">
                <h3>Web Paths</h3>
                <p>Monitor application performance and user experience across web applications and APIs</p>
                <button mat-raised-button color="primary" (click)="createWebPath()">
                  <mat-icon>add</mat-icon>
                  Create Web Path
                </button>
              </div>

              <div class="filter-section">
                <mat-form-field appearance="outline">
                  <mat-label>Filter table</mat-label>
                  <input matInput (keyup)="applyWebPathFilter($event)" placeholder="Filter by name or URL">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="filteredWebPaths" class="web-paths-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let path">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(path.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(path.status) }}</mat-icon>
                          {{ path.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let path">
                      <a class="path-link" (click)="viewWebPathDetails(path)">{{ path.name }}</a>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="url">
                    <th mat-header-cell *matHeaderCellDef>URL</th>
                    <td mat-cell *matCellDef="let path">
                      <a [href]="path.url" target="_blank" class="url-link">{{ path.url }}</a>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="monitoringPoint">
                    <th mat-header-cell *matHeaderCellDef>Monitoring Point</th>
                    <td mat-cell *matCellDef="let path">{{ path.monitoringPoint }}</td>
                  </ng-container>

                  <ng-container matColumnDef="performance">
                    <th mat-header-cell *matHeaderCellDef>Performance</th>
                    <td mat-cell *matCellDef="let path">
                      <div class="performance-display">
                        <span class="metric" *ngIf="path.responseTime">
                          <mat-icon>schedule</mat-icon>
                          {{ path.responseTime }}ms
                        </span>
                        <span class="metric" *ngIf="path.availability">
                          <mat-icon>check_circle</mat-icon>
                          {{ path.availability }}%
                        </span>
                        <span class="metric" *ngIf="path.httpStatus">
                          <mat-icon>http</mat-icon>
                          {{ path.httpStatus }}
                        </span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let path">
                      <button mat-icon-button [matMenuTriggerFor]="webPathMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #webPathMenu="matMenu">
                        <button mat-menu-item (click)="viewWebPathDetails(path)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editWebPath(path)">
                          <mat-icon>edit</mat-icon>
                          Edit
                        </button>
                        <button mat-menu-item (click)="deleteWebPath(path)">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="webPathColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: webPathColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Monitoring Points Tab -->
          <mat-tab label="Monitoring Points">
            <div class="tab-content">
              <div class="tab-header">
                <h3>Monitoring Points</h3>
                <p>AppNeta monitoring appliances and software agents collecting network performance data</p>
              </div>
              
              <div class="table-container">
                <table mat-table [dataSource]="monitoringPoints" class="monitoring-points-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let point">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(point.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(point.status) }}</mat-icon>
                          {{ point.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let point">
                      <div class="point-info">
                        <span class="point-name">{{ point.name }}</span>
                        <span class="point-location">{{ point.location }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let point">
                      <mat-chip [ngClass]="getTypeClass(point.type)">
                        <mat-icon matChipAvatar>{{ getTypeIcon(point.type) }}</mat-icon>
                        {{ point.type }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="ipAddress">
                    <th mat-header-cell *matHeaderCellDef>IP Address</th>
                    <td mat-cell *matCellDef="let point">{{ point.ipAddress }}</td>
                  </ng-container>

                  <ng-container matColumnDef="version">
                    <th mat-header-cell *matHeaderCellDef>Version</th>
                    <td mat-cell *matCellDef="let point">{{ point.version }}</td>
                  </ng-container>

                  <ng-container matColumnDef="lastSeen">
                    <th mat-header-cell *matHeaderCellDef>Last Seen</th>
                    <td mat-cell *matCellDef="let point">{{ point.lastSeen | date:'short' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let point">
                      <button mat-icon-button [matMenuTriggerFor]="pointMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #pointMenu="matMenu">
                        <button mat-menu-item (click)="viewPointDetails(point)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editPoint(point)">
                          <mat-icon>edit</mat-icon>
                          Edit
                        </button>
                        <button mat-menu-item (click)="deletePoint(point)">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="monitoringPointColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: monitoringPointColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

           <!-- Monitoring Policies Tab -->
           <mat-tab label="Monitoring Policies">
             <div class="tab-content">
               <div class="tab-header">
                 <h3>Monitoring Policies</h3>
                 <p>Configure and manage monitoring using monitoring policies designed to specify which networks and web applications to monitor, how to monitor them, and the Monitoring Points to use</p>
                 <button mat-raised-button color="primary" (click)="createMonitoringPolicy()">
                   <mat-icon>add</mat-icon>
                   Add Monitoring
                 </button>
               </div>

               <div class="filter-section">
                 <mat-form-field appearance="outline">
                   <mat-label>Filter by tag or keyword</mat-label>
                   <input matInput (keyup)="applyMonitoringPolicyFilter($event)" placeholder="Filter monitoring policies">
                   <mat-icon matSuffix>filter_list</mat-icon>
                 </mat-form-field>
               </div>

               <div class="policies-summary">
                 <div class="summary-stats">
                   <div class="stat-item">
                     <span class="stat-value">{{ filteredMonitoringPolicies.length }}</span>
                     <span class="stat-label">Policy Groups</span>
                   </div>
                   <div class="stat-item">
                     <span class="stat-value">{{ getEnabledPoliciesCount() }}</span>
                     <span class="stat-label">Enabled</span>
                   </div>
                   <div class="stat-item">
                     <span class="stat-value">{{ getTotalPoliciesCount() }}</span>
                     <span class="stat-label">Total Policies</span>
                   </div>
                   <div class="stat-item">
                     <span class="stat-value">{{ getEnabledPoliciesCount() }}</span>
                     <span class="stat-label">Enabled</span>
                   </div>
                 </div>
               </div>

               <div class="table-controls">
                 <div class="group-controls">
                   <span class="group-label">Group By:</span>
                   <mat-select [(value)]="policyGroupBy" (selectionChange)="onPolicyGroupByChange($event)">
                     <mat-option value="policyGroup">Monitoring Policy Group</mat-option>
                     <mat-option value="type">Workflow Type</mat-option>
                     <mat-option value="none">None</mat-option>
                   </mat-select>
                 </div>
                 <div class="sort-controls">
                   <span class="sort-label">Sort By:</span>
                   <mat-select [(value)]="policySortBy" (selectionChange)="onPolicySortByChange($event)">
                     <mat-option value="name">Name</mat-option>
                     <mat-option value="type">Type</mat-option>
                     <mat-option value="created">Created</mat-option>
                     <mat-option value="updated">Last Updated</mat-option>
                   </mat-select>
                 </div>
                 <div class="view-controls">
                   <button mat-button>Columns</button>
                 </div>
               </div>

               <div class="table-container">
                 <table mat-table [dataSource]="filteredMonitoringPolicies" class="monitoring-policies-table">
                   <ng-container matColumnDef="status">
                     <th mat-header-cell *matHeaderCellDef>Status</th>
                     <td mat-cell *matCellDef="let policy">
                       <mat-chip-set>
                         <mat-chip [ngClass]="policy.enabled ? 'success' : 'disabled'" selected>
                           <mat-icon matChipAvatar>{{ policy.enabled ? 'check_circle' : 'pause_circle' }}</mat-icon>
                           {{ policy.enabled ? 'Enabled' : 'Disabled' }}
                         </mat-chip>
                       </mat-chip-set>
                     </td>
                   </ng-container>

                   <ng-container matColumnDef="name">
                     <th mat-header-cell *matHeaderCellDef>Name</th>
                     <td mat-cell *matCellDef="let policy">
                       <a href="#" class="policy-link" (click)="viewPolicyDetails(policy)">{{ policy.name }}</a>
                     </td>
                   </ng-container>

                   <ng-container matColumnDef="policyGroup">
                     <th mat-header-cell *matHeaderCellDef>Policy Group</th>
                     <td mat-cell *matCellDef="let policy">{{ policy.policyGroup || 'Default' }}</td>
                   </ng-container>

                   <ng-container matColumnDef="target">
                     <th mat-header-cell *matHeaderCellDef>Target</th>
                     <td mat-cell *matCellDef="let policy">{{ policy.targets?.[0] || 'Not Set' }}</td>
                   </ng-container>

                   <ng-container matColumnDef="workflowType">
                     <th mat-header-cell *matHeaderCellDef>Workflow Type</th>
                     <td mat-cell *matCellDef="let policy">
                       <mat-chip [ngClass]="getWorkflowTypeClass(policy.type)">
                         <mat-icon matChipAvatar>{{ getWorkflowTypeIcon(policy.type) }}</mat-icon>
                         {{ policy.type }}
                       </mat-chip>
                     </td>
                   </ng-container>

                   <ng-container matColumnDef="lastUpdated">
                     <th mat-header-cell *matHeaderCellDef>Last Updated</th>
                     <td mat-cell *matCellDef="let policy">{{ policy.createdDate | date:'short' }}</td>
                   </ng-container>

                   <ng-container matColumnDef="created">
                     <th mat-header-cell *matHeaderCellDef>Created</th>
                     <td mat-cell *matCellDef="let policy">{{ policy.createdDate | date:'short' }}</td>
                   </ng-container>

                   <ng-container matColumnDef="monitoringPointCount">
                     <th mat-header-cell *matHeaderCellDef>Monitoring Point Count</th>
                     <td mat-cell *matCellDef="let policy">{{ getMonitoringPointCount(policy) }}</td>
                   </ng-container>

                   <ng-container matColumnDef="inPolicyPaths">
                     <th mat-header-cell *matHeaderCellDef>In Policy Paths</th>
                     <td mat-cell *matCellDef="let policy">{{ getInPolicyPaths(policy) }}</td>
                   </ng-container>

                   <ng-container matColumnDef="outOfPolicyPaths">
                     <th mat-header-cell *matHeaderCellDef>Out of Policy Paths</th>
                     <td mat-cell *matCellDef="let policy">{{ getOutOfPolicyPaths(policy) }}</td>
                   </ng-container>

                   <ng-container matColumnDef="actions">
                     <th mat-header-cell *matHeaderCellDef></th>
                     <td mat-cell *matCellDef="let policy">
                       <button mat-icon-button [matMenuTriggerFor]="policyMenu">
                         <mat-icon>more_vert</mat-icon>
                       </button>
                       <mat-menu #policyMenu="matMenu">
                         <button mat-menu-item (click)="viewPolicyDetails(policy)">
                           <mat-icon>visibility</mat-icon>
                           View Details
                         </button>
                         <button mat-menu-item (click)="editPolicy(policy)">
                           <mat-icon>edit</mat-icon>
                           Edit
                         </button>
                         <button mat-menu-item (click)="togglePolicy(policy, !policy.enabled)">
                           <mat-icon>{{ policy.enabled ? 'pause' : 'play_arrow' }}</mat-icon>
                           {{ policy.enabled ? 'Disable' : 'Enable' }}
                         </button>
                         <button mat-menu-item (click)="deletePolicy(policy)">
                           <mat-icon>delete</mat-icon>
                           Delete
                         </button>
                       </mat-menu>
                     </td>
                   </ng-container>

                   <tr mat-header-row *matHeaderRowDef="monitoringPolicyColumns"></tr>
                   <tr mat-row *matRowDef="let row; columns: monitoringPolicyColumns;"></tr>
                 </table>
               </div>
             </div>
           </mat-tab>
         </mat-tab-group>
       </mat-card>
     </div>
  `,
  styleUrls: ['./cloud-network-insights.component.scss']
})
export class CloudNetworkInsightsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  networkPaths: NetworkPath[] = [];
  webPaths: WebPath[] = [];
  monitoringPoints: MonitoringPoint[] = [];
  monitoringPolicies: MonitoringPolicy[] = [];
  summary: NetworkInsightsSummary | null = null;
  
  // Filtered data for tables
  filteredNetworkPaths: NetworkPath[] = [];
  filteredWebPaths: WebPath[] = [];
  filteredMonitoringPolicies: MonitoringPolicy[] = [];
  
  // UI state
  selectedTabIndex = 0;
  appNetaEnabled = true;
  refreshInterval = 5;
  isDemoMode = false;
  isConnected = false;
  connectionTesting = false;
  
  // Policy controls
  policyGroupBy = 'policyGroup';
  policySortBy = 'name';
  
  // Table column definitions
  monitoringPointColumns = ['status', 'name', 'type', 'ipAddress', 'version', 'lastSeen', 'actions'];
  networkPathColumns = ['status', 'name', 'monitoringPoint', 'target', 'metrics', 'actions'];
  webPathColumns = ['status', 'name', 'url', 'monitoringPoint', 'performance', 'actions'];
  monitoringPolicyColumns = ['status', 'name', 'policyGroup', 'target', 'workflowType', 'lastUpdated', 'created', 'monitoringPointCount', 'inPolicyPaths', 'outOfPolicyPaths', 'actions'];

  constructor(
    private appNetaService: AppNetaService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isDemoMode = this.appNetaService.isDemoMode();
    this.loadData();
    this.testConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    // Load network paths
    this.appNetaService.getNetworkPaths()
      .pipe(takeUntil(this.destroy$))
      .subscribe(paths => {
        this.networkPaths = paths;
        this.filteredNetworkPaths = paths;
      });

    // Load web paths
    this.appNetaService.getWebPaths()
      .pipe(takeUntil(this.destroy$))
      .subscribe(paths => {
        this.webPaths = paths;
        this.filteredWebPaths = paths;
      });

    // Load monitoring points
    this.appNetaService.getMonitoringPoints()
      .pipe(takeUntil(this.destroy$))
      .subscribe(points => {
        this.monitoringPoints = points;
      });

    // Load monitoring policies
    this.appNetaService.getMonitoringPolicies()
      .pipe(takeUntil(this.destroy$))
      .subscribe(policies => {
        this.monitoringPolicies = policies;
        this.filteredMonitoringPolicies = policies;
      });

    // Load summary
    this.appNetaService.getNetworkInsightsSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.summary = summary;
      });
  }

  // Utility methods for styling
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok': case 'online': return 'status-success';
      case 'failed': case 'offline': case 'connectivity loss': return 'status-error';
      case 'warning': case 'maintenance': return 'status-warning';
      case 'disabled': return 'status-disabled';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok': case 'online': return 'check_circle';
      case 'failed': case 'offline': return 'error';
      case 'connectivity loss': return 'signal_wifi_off';
      case 'warning': case 'maintenance': return 'warning';
      case 'disabled': return 'pause_circle';
      default: return 'help';
    }
  }

  getTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'cloud': return 'type-cloud';
      case 'virtual': return 'type-virtual';
      case 'physical': return 'type-physical';
      default: return '';
    }
  }

  getTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'cloud': return 'cloud';
      case 'virtual': return 'computer';
      case 'physical': return 'router';
      default: return 'device_unknown';
    }
  }

  // Filter methods
  applyNetworkPathFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredNetworkPaths = this.networkPaths.filter(path =>
      path.name.toLowerCase().includes(filterValue) ||
      path.source.toLowerCase().includes(filterValue) ||
      path.target.toLowerCase().includes(filterValue)
    );
  }

  applyWebPathFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredWebPaths = this.webPaths.filter(path =>
      path.name.toLowerCase().includes(filterValue) ||
      path.url.toLowerCase().includes(filterValue)
    );
  }

  applyMonitoringPolicyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredMonitoringPolicies = this.monitoringPolicies.filter(policy =>
      policy.name.toLowerCase().includes(filterValue) ||
      policy.type.toLowerCase().includes(filterValue) ||
      (policy.targets && policy.targets.some(target => target.toLowerCase().includes(filterValue)))
    );
  }

  // Tab management
  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }

  // Action methods
  refreshData(): void {
    this.appNetaService.refreshData();
    this.loadData();
  }

  createAlertPolicy(): void {
    console.log('Creating alert policy...');
  }

  viewAlertPolicies(): void {
    console.log('Viewing alert policies...');
  }

  showAppNetaInfo(): void {
    console.log('Showing AppNeta information...');
  }

  openCloudMonitoringDashboard(): void {
    window.open('https://console.cloud.google.com/monitoring', '_blank');
  }

  createNetworkPath(): void {
    const dialogRef = this.dialog.open(CreateNetworkPathDialogComponent, {
      width: '600px',
      data: { monitoringPoints: this.monitoringPoints }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appNetaService.createNetworkPath(result).subscribe(() => {
          this.loadData();
        });
      }
    });
  }

  createWebPath(): void {
    const dialogRef = this.dialog.open(CreateWebPathDialogComponent, {
      width: '600px',
      data: { monitoringPoints: this.monitoringPoints }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appNetaService.createWebPath(result).subscribe(() => {
          this.loadData();
        });
      }
    });
  }

  createMonitoringPolicy(): void {
    const dialogRef = this.dialog.open(CreateMonitoringPolicyDialogComponent, {
      width: '700px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appNetaService.createMonitoringPolicy(result).subscribe(() => {
          this.loadData();
        });
      }
    });
  }

  // Detail view methods
  viewNetworkPathDetails(path: NetworkPath): void {
    this.router.navigate(['/cloud-network-insights/path', path.id]);
  }

  viewWebPathDetails(path: WebPath): void {
    console.log('Viewing web path details:', path);
  }

  viewPointDetails(point: MonitoringPoint): void {
    console.log('Viewing monitoring point details:', point);
  }

  // Edit methods
  editNetworkPath(path: NetworkPath): void {
    console.log('Editing network path:', path);
  }

  editWebPath(path: WebPath): void {
    console.log('Editing web path:', path);
  }

  editPoint(point: MonitoringPoint): void {
    console.log('Editing monitoring point:', point);
  }

  editPolicy(policy: MonitoringPolicy): void {
    console.log('Editing monitoring policy:', policy);
  }

  // Delete methods
  deleteNetworkPath(path: NetworkPath): void {
    console.log('Deleting network path:', path);
  }

  deleteWebPath(path: WebPath): void {
    console.log('Deleting web path:', path);
  }

  deletePoint(point: MonitoringPoint): void {
    console.log('Deleting monitoring point:', point);
  }

  // Settings methods
  toggleAppNeta(event: any): void {
    this.appNetaEnabled = event.checked;
  }

  togglePolicy(policy: MonitoringPolicy, event: any): void {
    policy.enabled = event.checked;
  }

  testConnection(): void {
    this.connectionTesting = true;
    this.appNetaService.testConnection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (connected) => {
          this.isConnected = connected;
          this.connectionTesting = false;
          console.log('AppNeta connection test result:', connected);
        },
        error: (error) => {
          this.isConnected = false;
          this.connectionTesting = false;
          console.error('AppNeta connection test failed:', error);
        }
      });
  }

  saveSettings(): void {
    console.log('Saving settings...');
  }

  exportData(): void {
    console.log('Exporting data...');
  }

  viewDocumentation(): void {
    window.open('https://docs.appneta.com', '_blank');
  }

  // Monitoring Policies tab methods
  getEnabledPoliciesCount(): number {
    return this.filteredMonitoringPolicies.filter(policy => policy.enabled).length;
  }

  getTotalPoliciesCount(): number {
    return this.filteredMonitoringPolicies.length;
  }

  getWorkflowTypeClass(type: string): string {
    if (!type) return '';
    switch (type.toLowerCase()) {
      case 'network': return 'type-network';
      case 'web': return 'type-web';
      case 'infrastructure': return 'type-infrastructure';
      default: return '';
    }
  }

  getWorkflowTypeIcon(type: string): string {
    if (!type) return 'policy';
    switch (type.toLowerCase()) {
      case 'network': return 'router';
      case 'web': return 'web';
      case 'infrastructure': return 'type-infrastructure';
      default: return 'policy';
    }
  }

  getMonitoringPointCount(policy: MonitoringPolicy): number {
    // Generate consistent pseudo-random number based on policy ID
    return this.simpleHash(policy.id) % 5 + 1;
  }

  getInPolicyPaths(policy: MonitoringPolicy): number {
    // Generate consistent pseudo-random number based on policy ID
    return this.simpleHash(policy.id) % 10 + 5;
  }

  getOutOfPolicyPaths(policy: MonitoringPolicy): number {
    // Generate consistent pseudo-random number based on policy ID
    return this.simpleHash(policy.id) % 3;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  onPolicyGroupByChange(event: any): void {
    this.policyGroupBy = event.value;
    this.sortPolicies();
  }

  onPolicySortByChange(event: any): void {
    this.policySortBy = event.value;
    this.sortPolicies();
  }

  private sortPolicies(): void {
    this.filteredMonitoringPolicies.sort((a, b) => {
      switch (this.policySortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'created':
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        case 'updated':
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        default:
          return 0;
      }
    });
  }

  viewPolicyDetails(policy: MonitoringPolicy): void {
    console.log('Viewing policy details:', policy);
  }

  deletePolicy(policy: MonitoringPolicy): void {
    console.log('Deleting policy:', policy);
    // Implement delete logic here
  }
} 