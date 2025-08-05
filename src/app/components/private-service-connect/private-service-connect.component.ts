import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { 
  PrivateServiceConnectService, 
  PSCEndpoint, 
  PSCPublishedService,
  LoadBalancerEndpoint 
} from '../../services/private-service-connect.service';
import { ProjectService } from '../../services/project.service';
import { ConnectEndpointDialogComponent } from './connect-endpoint-dialog.component';
import { PublishServiceDialogComponent } from './publish-service-dialog.component';

@Component({
  selector: 'app-private-service-connect',
  template: `
    <div class="psc-container">
      <!-- Header -->
      <div class="header">
        <h1>Private Service Connect</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="connectEndpoint()" 
                  *ngIf="selectedTabIndex === 0">
            <mat-icon>add</mat-icon>
            Connect endpoint
          </button>
          <button mat-raised-button color="primary" (click)="publishService()" 
                  *ngIf="selectedTabIndex === 1">
            <mat-icon>add</mat-icon>
            Publish service
          </button>
          <button mat-icon-button (click)="deleteSelected()" 
                  [disabled]="getSelectedCount() === 0" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Description -->
      <div class="description-text">
        <p>Private Service Connect lets you connect privately and securely to Services. 
        <a href="#" class="learn-more">Learn more</a></p>
      </div>

      <!-- Connection stats -->
      <div class="connection-stats" *ngIf="selectedTabIndex === 0">
        <div class="stats-row">
          <div class="stat-item">
            <span class="label">Connections</span>
            <span class="value">{{ getTotalConnections() }} in total</span>
          </div>
          <div class="stat-item">
            <span class="label">Accepted</span>
            <div class="stat-value">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <span class="value">{{ getAcceptedCount() }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="label">Rejected</span>
            <div class="stat-value">
              <mat-icon class="error-icon">cancel</mat-icon>
              <span class="value">{{ getRejectedCount() }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="label">Pending</span>
            <div class="stat-value">
              <mat-icon class="pending-icon">schedule</mat-icon>
              <span class="value">{{ getPendingCount() }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="label">Closed</span>
            <div class="stat-value">
              <mat-icon class="closed-icon">block</mat-icon>
              <span class="value">{{ getClosedCount() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
        <!-- Connected Endpoints Tab -->
        <mat-tab label="Connected endpoints">
          <div class="tab-content">
            <!-- Filter section -->
            <div class="filter-section">
              <button mat-stroked-button class="filter-btn">
                <mat-icon>filter_list</mat-icon>
                Filter
              </button>
              <span class="filter-text">Enter property name or value</span>
              <div class="spacer"></div>
              <button mat-icon-button matTooltip="Column display options">
                <mat-icon>view_column</mat-icon>
              </button>
            </div>

            <!-- Endpoints table -->
            <div *ngIf="isLoading" class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
            </div>

            <div *ngIf="!isLoading" class="table-wrapper">
              <table mat-table [dataSource]="endpointsDataSource" class="psc-table">
                <!-- Checkbox column -->
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef>
                    <mat-checkbox (change)="$event ? masterToggleEndpoints() : null"
                                  [checked]="endpointsSelection.hasValue() && isAllEndpointsSelected()"
                                  [indeterminate]="endpointsSelection.hasValue() && !isAllEndpointsSelected()">
                    </mat-checkbox>
                  </th>
                  <td mat-cell *matCellDef="let row">
                    <mat-checkbox (click)="$event.stopPropagation()"
                                  (change)="$event ? endpointsSelection.toggle(row) : null"
                                  [checked]="endpointsSelection.isSelected(row)">
                    </mat-checkbox>
                  </td>
                </ng-container>

                <!-- Endpoint column -->
                <ng-container matColumnDef="endpoint">
                  <th mat-header-cell *matHeaderCellDef>Endpoint</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="endpoint-link" (click)="viewEndpointDetails(element)">
                      {{ element.name }}
                    </a>
                  </td>
                </ng-container>

                <!-- Status column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let element">
                    <div class="status-badge" [class]="getStatusClass(element.status)">
                      <mat-icon class="status-icon">{{ getStatusIcon(element.status) }}</mat-icon>
                      <span>{{ element.status }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Target column -->
                <ng-container matColumnDef="target">
                  <th mat-header-cell *matHeaderCellDef>Target</th>
                  <td mat-cell *matCellDef="let element">{{ element.target }}</td>
                </ng-container>

                <!-- Target API column -->
                <ng-container matColumnDef="targetApi">
                  <th mat-header-cell *matHeaderCellDef>Target API</th>
                  <td mat-cell *matCellDef="let element">{{ element.targetApi }}</td>
                </ng-container>

                <!-- Scope column -->
                <ng-container matColumnDef="scope">
                  <th mat-header-cell *matHeaderCellDef>Scope</th>
                  <td mat-cell *matCellDef="let element">{{ element.scope }}</td>
                </ng-container>

                <!-- Global access column -->
                <ng-container matColumnDef="globalAccess">
                  <th mat-header-cell *matHeaderCellDef>Global access</th>
                  <td mat-cell *matCellDef="let element">{{ element.globalAccess }}</td>
                </ng-container>

                <!-- Network column -->
                <ng-container matColumnDef="network">
                  <th mat-header-cell *matHeaderCellDef>Network</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="network-link">{{ element.network }}</a>
                  </td>
                </ng-container>

                <!-- Subnetwork column -->
                <ng-container matColumnDef="subnetwork">
                  <th mat-header-cell *matHeaderCellDef>Subnetwork</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="network-link" *ngIf="element.subnetwork">{{ element.subnetwork }}</a>
                    <span *ngIf="!element.subnetwork">—</span>
                  </td>
                </ng-container>

                <!-- IP address column -->
                <ng-container matColumnDef="ipAddress">
                  <th mat-header-cell *matHeaderCellDef>IP address</th>
                  <td mat-cell *matCellDef="let element">{{ element.ipAddress }}</td>
                </ng-container>

                <!-- Labels column -->
                <ng-container matColumnDef="labels">
                  <th mat-header-cell *matHeaderCellDef>Labels</th>
                  <td mat-cell *matCellDef="let element">
                    <div class="labels-container" *ngIf="element.labels && getLabelsArray(element.labels).length > 0">
                      <mat-chip-listbox>
                        <mat-chip *ngFor="let label of getLabelsArray(element.labels)" class="label-chip">
                          {{ label.key }}: {{ label.value }}
                        </mat-chip>
                      </mat-chip-listbox>
                    </div>
                    <span *ngIf="!element.labels || getLabelsArray(element.labels).length === 0">—</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="endpointColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: endpointColumns;"></tr>
              </table>

              <div *ngIf="endpointsDataSource.data.length === 0 && !isLoading" class="no-data">
                <p>No connected endpoints found</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Published Services Tab -->
        <mat-tab label="Published services">
          <div class="tab-content">
            <!-- Filter section -->
            <div class="filter-section">
              <button mat-stroked-button class="filter-btn">
                <mat-icon>filter_list</mat-icon>
                Filter
              </button>
              <span class="filter-text">Enter property name or value</span>
              <div class="spacer"></div>
              <button mat-icon-button matTooltip="Column display options">
                <mat-icon>view_column</mat-icon>
              </button>
            </div>

            <!-- Services table -->
            <div *ngIf="isLoading" class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
            </div>

            <div *ngIf="!isLoading" class="table-wrapper">
              <table mat-table [dataSource]="servicesDataSource" class="psc-table">
                <!-- Checkbox column -->
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef>
                    <mat-checkbox (change)="$event ? masterToggleServices() : null"
                                  [checked]="servicesSelection.hasValue() && isAllServicesSelected()"
                                  [indeterminate]="servicesSelection.hasValue() && !isAllServicesSelected()">
                    </mat-checkbox>
                  </th>
                  <td mat-cell *matCellDef="let row">
                    <mat-checkbox (click)="$event.stopPropagation()"
                                  (change)="$event ? servicesSelection.toggle(row) : null"
                                  [checked]="servicesSelection.isSelected(row)">
                    </mat-checkbox>
                  </td>
                </ng-container>

                <!-- Name column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="service-link" (click)="viewServiceDetails(element)">
                      {{ element.name }}
                    </a>
                  </td>
                </ng-container>

                <!-- Target Service column -->
                <ng-container matColumnDef="targetService">
                  <th mat-header-cell *matHeaderCellDef>Target Service</th>
                  <td mat-cell *matCellDef="let element">{{ element.targetService }}</td>
                </ng-container>

                <!-- Published Service column -->
                <ng-container matColumnDef="publishedService">
                  <th mat-header-cell *matHeaderCellDef>Published Service</th>
                  <td mat-cell *matCellDef="let element">{{ element.publishedService }}</td>
                </ng-container>

                <!-- Load Balancers column -->
                <ng-container matColumnDef="loadBalancers">
                  <th mat-header-cell *matHeaderCellDef>Load Balancers</th>
                  <td mat-cell *matCellDef="let element">
                    <div *ngFor="let lb of element.loadBalancers">
                      <a class="lb-link">{{ lb }}</a>
                    </div>
                  </td>
                </ng-container>

                <!-- Auto Accept column -->
                <ng-container matColumnDef="autoAccept">
                  <th mat-header-cell *matHeaderCellDef>Auto Accept</th>
                  <td mat-cell *matCellDef="let element">
                    <mat-icon class="auto-accept-icon" [class.enabled]="element.autoAcceptConnections">
                      {{ element.autoAcceptConnections ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="serviceColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: serviceColumns;"></tr>
              </table>

              <div *ngIf="servicesDataSource.data.length === 0 && !isLoading" class="no-data">
                <p>No published services found</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Network Attachments Tab -->
        <mat-tab label="Network attachments">
          <div class="tab-content">
            <div class="no-data">
              <p>Network attachments functionality not yet implemented</p>
            </div>
          </div>
        </mat-tab>

        <!-- Connection Policies Tab -->
        <mat-tab label="Connection policies">
          <div class="tab-content">
            <div class="no-data">
              <p>Connection policies functionality not yet implemented</p>
            </div>
          </div>
        </mat-tab>

        <!-- Load Balancer Endpoints Tab -->
        <mat-tab label="Load balancer endpoints">
          <div class="tab-content">
            <!-- Filter section -->
            <div class="filter-section">
              <button mat-stroked-button class="filter-btn">
                <mat-icon>filter_list</mat-icon>
                Filter
              </button>
              <span class="filter-text">Enter property name or value</span>
              <div class="spacer"></div>
              <button mat-icon-button matTooltip="Column display options">
                <mat-icon>view_column</mat-icon>
              </button>
            </div>

            <!-- Load balancer endpoints table -->
            <div *ngIf="isLoading" class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
            </div>

            <div *ngIf="!isLoading" class="table-wrapper">
              <table mat-table [dataSource]="loadBalancerDataSource" class="psc-table">
                <!-- Load balancer column -->
                <ng-container matColumnDef="loadBalancer">
                  <th mat-header-cell *matHeaderCellDef>Load balancer</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="lb-link">{{ element.name }}</a>
                  </td>
                </ng-container>

                <!-- Type column -->
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let element">{{ element.type }}</td>
                </ng-container>

                <!-- Number of NEGs column -->
                <ng-container matColumnDef="numberOfNEGs">
                  <th mat-header-cell *matHeaderCellDef>Number of NEGs</th>
                  <td mat-cell *matCellDef="let element">{{ element.numberOfNEGs }}</td>
                </ng-container>

                <!-- Network column -->
                <ng-container matColumnDef="lbNetwork">
                  <th mat-header-cell *matHeaderCellDef>Network</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="network-link">{{ element.network }}</a>
                  </td>
                </ng-container>

                <!-- Region column -->
                <ng-container matColumnDef="region">
                  <th mat-header-cell *matHeaderCellDef>Region</th>
                  <td mat-cell *matCellDef="let element">{{ element.region }}</td>
                </ng-container>

                <!-- IP addresses column -->
                <ng-container matColumnDef="lbIpAddresses">
                  <th mat-header-cell *matHeaderCellDef>IP addresses</th>
                  <td mat-cell *matCellDef="let element">
                    <div *ngFor="let ip of element.ipAddresses">{{ ip }}</div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="loadBalancerColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: loadBalancerColumns;"></tr>
              </table>

              <div *ngIf="loadBalancerDataSource.data.length === 0 && !isLoading" class="no-data">
                <p>No rows to display</p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .psc-container {
      padding: 20px;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .description-text {
      margin: 16px 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .connection-stats {
      margin: 16px 0;
      padding: 16px;
      background: var(--surface-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .stats-row {
      display: flex;
      gap: 32px;
      align-items: center;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-item .label {
      font-size: 12px;
      color: var(--text-secondary-color);
      text-transform: uppercase;
      font-weight: 500;
    }

    .stat-item .value {
      font-size: 14px;
      color: var(--text-color);
      font-weight: 500;
    }

    .stat-value {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .success-icon {
      color: #137333;
      font-size: 16px;
    }

    .error-icon {
      color: #d93025;
      font-size: 16px;
    }

    .pending-icon {
      color: #f9ab00;
      font-size: 16px;
    }

    .closed-icon {
      color: #5f6368;
      font-size: 16px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .filter-section {
      display: flex;
      align-items: center;
      margin: 16px 0;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .filter-btn {
      margin-right: 16px;
    }

    .filter-text {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .spacer {
      flex: 1;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .table-wrapper {
      background: var(--surface-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      border: 1px solid var(--border-color);
    }

    .psc-table {
      width: 100%;
    }

    .endpoint-link, .service-link, .network-link, .lb-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .endpoint-link:hover, .service-link:hover, .network-link:hover, .lb-link:hover {
      text-decoration: underline;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.accepted {
      background: rgba(19, 115, 51, 0.1);
      color: #137333;
    }

    .status-badge.pending {
      background: rgba(249, 171, 0, 0.1);
      color: #f9ab00;
    }

    .status-badge.rejected {
      background: rgba(217, 48, 37, 0.1);
      color: #d93025;
    }

    .status-badge.closed {
      background: rgba(95, 99, 104, 0.1);
      color: #5f6368;
    }

    .status-icon {
      font-size: 14px;
    }

    .labels-container {
      max-width: 200px;
    }

    .label-chip {
      font-size: 11px;
      height: 20px;
      margin: 2px;
    }

    .auto-accept-icon {
      font-size: 20px;
      color: #5f6368;
    }

    .auto-accept-icon.enabled {
      color: #137333;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary-color);
    }

    /* Header styling */
    ::ng-deep .mat-header-cell {
      color: var(--text-secondary-color);
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
      padding: 12px 16px;
      background-color: var(--hover-color);
    }

    ::ng-deep .mat-cell {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-row:hover {
      background-color: var(--hover-color);
    }

    /* Tab styling */
    ::ng-deep .mat-tab-group {
      background: var(--surface-color);
    }

    ::ng-deep .mat-tab-header {
      border-bottom: 1px solid var(--border-color);
    }

    ::ng-deep .mat-tab-label {
      color: var(--text-secondary-color);
      font-weight: 500;
    }

    ::ng-deep .mat-tab-label-active {
      color: var(--primary-color);
    }

    /* Column widths */
    .mat-column-select {
      width: 48px;
    }

    .mat-column-endpoint, .mat-column-name {
      width: 200px;
    }

    .mat-column-status {
      width: 120px;
    }

    .mat-column-target, .mat-column-targetService {
      width: 150px;
    }

    .mat-column-targetApi {
      width: 120px;
    }

    .mat-column-scope, .mat-column-region {
      width: 120px;
    }

    .mat-column-globalAccess {
      width: 100px;
    }

    .mat-column-network, .mat-column-lbNetwork {
      width: 120px;
    }

    .mat-column-subnetwork {
      width: 120px;
    }

    .mat-column-ipAddress, .mat-column-lbIpAddresses {
      width: 120px;
    }

    .mat-column-labels {
      width: 200px;
    }

    .mat-column-publishedService {
      width: 300px;
    }

    .mat-column-loadBalancers, .mat-column-loadBalancer {
      width: 150px;
    }

    .mat-column-autoAccept {
      width: 100px;
    }

    .mat-column-type {
      width: 150px;
    }

    .mat-column-numberOfNEGs {
      width: 120px;
    }
  `]
})
export class PrivateServiceConnectComponent implements OnInit {
  selectedTabIndex = 0;
  projectId: string | null = null;
  isLoading = true;

  // Data sources
  endpointsDataSource = new MatTableDataSource<PSCEndpoint>([]);
  servicesDataSource = new MatTableDataSource<PSCPublishedService>([]);
  loadBalancerDataSource = new MatTableDataSource<LoadBalancerEndpoint>([]);

  // Selections
  endpointsSelection = new SelectionModel<PSCEndpoint>(true, []);
  servicesSelection = new SelectionModel<PSCPublishedService>(true, []);

  // Table columns
  endpointColumns: string[] = [
    'select', 'endpoint', 'status', 'target', 'targetApi', 'scope', 
    'globalAccess', 'network', 'subnetwork', 'ipAddress', 'labels'
  ];
  serviceColumns: string[] = [
    'select', 'name', 'targetService', 'publishedService', 'loadBalancers', 'autoAccept'
  ];
  loadBalancerColumns: string[] = [
    'loadBalancer', 'type', 'numberOfNEGs', 'lbNetwork', 'region', 'lbIpAddresses'
  ];

  // Data arrays
  endpoints: PSCEndpoint[] = [];
  services: PSCPublishedService[] = [];
  loadBalancerEndpoints: LoadBalancerEndpoint[] = [];

  constructor(
    private pscService: PrivateServiceConnectService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe(project => {
      this.projectId = project?.id || null;
      if (this.projectId) {
        this.loadData();
      }
    });
  }

  loadData() {
    if (!this.projectId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    
    // Load all data in parallel
    Promise.all([
      this.pscService.getConnectedEndpoints(this.projectId).toPromise(),
      this.pscService.getPublishedServices(this.projectId).toPromise(),
      this.pscService.getLoadBalancerEndpoints(this.projectId).toPromise()
    ]).then(([endpoints, services, loadBalancers]) => {
      this.endpoints = endpoints || [];
      this.services = services || [];
      this.loadBalancerEndpoints = loadBalancers || [];
      
      this.endpointsDataSource.data = this.endpoints;
      this.servicesDataSource.data = this.services;
      this.loadBalancerDataSource.data = this.loadBalancerEndpoints;
      
      this.isLoading = false;
      this.cdr.detectChanges();
    }).catch(error => {
      console.error('Error loading PSC data:', error);
      this.isLoading = false;
      this.snackBar.open('Error loading PSC data', 'Close', { duration: 3000 });
    });
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  connectEndpoint() {
    const dialogRef = this.dialog.open(ConnectEndpointDialogComponent, {
      width: '600px',
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  publishService() {
    const dialogRef = this.dialog.open(PublishServiceDialogComponent, {
      width: '600px',
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  deleteSelected() {
    const selectedEndpoints = this.endpointsSelection.selected;
    const selectedServices = this.servicesSelection.selected;
    
    if (selectedEndpoints.length === 0 && selectedServices.length === 0) return;

    let message = '';
    if (selectedEndpoints.length > 0 && selectedServices.length > 0) {
      message = `Delete ${selectedEndpoints.length} endpoint(s) and ${selectedServices.length} service(s)?`;
    } else if (selectedEndpoints.length > 0) {
      message = `Delete ${selectedEndpoints.length} endpoint(s)?`;
    } else {
      message = `Delete ${selectedServices.length} service(s)?`;
    }

    if (confirm(message)) {
      // Delete endpoints
      selectedEndpoints.forEach(endpoint => {
        this.pscService.deleteConnectedEndpoint(this.projectId!, endpoint.name).subscribe({
          next: () => {
            const index = this.endpoints.indexOf(endpoint);
            if (index > -1) {
              this.endpoints.splice(index, 1);
              this.endpointsDataSource.data = [...this.endpoints];
            }
          },
          error: (error) => {
            console.error('Error deleting endpoint:', error);
          }
        });
      });

      // Delete services
      selectedServices.forEach(service => {
        this.pscService.deletePublishedService(this.projectId!, service.name).subscribe({
          next: () => {
            const index = this.services.indexOf(service);
            if (index > -1) {
              this.services.splice(index, 1);
              this.servicesDataSource.data = [...this.services];
            }
          },
          error: (error) => {
            console.error('Error deleting service:', error);
          }
        });
      });

      this.endpointsSelection.clear();
      this.servicesSelection.clear();
      this.snackBar.open('Deletion initiated', 'Close', { duration: 3000 });
    }
  }

  refresh() {
    this.loadData();
  }

  getSelectedCount(): number {
    return this.endpointsSelection.selected.length + this.servicesSelection.selected.length;
  }

  // Endpoint selection methods
  isAllEndpointsSelected() {
    const numSelected = this.endpointsSelection.selected.length;
    const numRows = this.endpointsDataSource.data.length;
    return numSelected === numRows;
  }

  masterToggleEndpoints() {
    this.isAllEndpointsSelected() ?
      this.endpointsSelection.clear() :
      this.endpointsDataSource.data.forEach(row => this.endpointsSelection.select(row));
  }

  // Service selection methods
  isAllServicesSelected() {
    const numSelected = this.servicesSelection.selected.length;
    const numRows = this.servicesDataSource.data.length;
    return numSelected === numRows;
  }

  masterToggleServices() {
    this.isAllServicesSelected() ?
      this.servicesSelection.clear() :
      this.servicesDataSource.data.forEach(row => this.servicesSelection.select(row));
  }

  // Statistics methods
  getTotalConnections(): number {
    return this.endpoints.length;
  }

  getAcceptedCount(): number {
    return this.endpoints.filter(e => e.status === 'Accepted').length;
  }

  getRejectedCount(): number {
    return this.endpoints.filter(e => e.status === 'Rejected').length;
  }

  getPendingCount(): number {
    return this.endpoints.filter(e => e.status === 'Pending').length;
  }

  getClosedCount(): number {
    return this.endpoints.filter(e => e.status === 'Closed').length;
  }

  // UI helper methods
  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Accepted': return 'check_circle';
      case 'Pending': return 'schedule';
      case 'Rejected': return 'cancel';
      case 'Closed': return 'block';
      default: return 'help_outline';
    }
  }

  getLabelsArray(labels: { [key: string]: string } | undefined): Array<{key: string, value: string}> {
    if (!labels) return [];
    return Object.keys(labels).map(key => ({ key, value: labels[key] }));
  }

  viewEndpointDetails(endpoint: PSCEndpoint) {
    // TODO: Implement endpoint details view
    this.snackBar.open('Endpoint details view not yet implemented', 'Close', { duration: 3000 });
  }

  viewServiceDetails(service: PSCPublishedService) {
    // TODO: Implement service details view
    this.snackBar.open('Service details view not yet implemented', 'Close', { duration: 3000 });
  }
}