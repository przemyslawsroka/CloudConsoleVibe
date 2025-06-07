import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { LoadBalancerService, LoadBalancer, LoadBalancerType, AccessType } from '../../services/load-balancer.service';
import { Observable } from 'rxjs';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-load-balancing',
  template: `
    <div class="load-balancing-container">
      <div class="header">
        <h1>Load balancing</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createLoadBalancer()" [disabled]="isLoading">
            <mat-icon>add</mat-icon>
            Create load balancer
          </button>
          <button mat-icon-button (click)="refresh()" [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-icon-button [disabled]="isLoading">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <mat-tab-group class="tabs">
        <mat-tab label="Load balancers" [disabled]="false">
          <div class="tab-content">
            <div class="filters">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Filter</mat-label>
                <input matInput placeholder="Enter property name or value" (keyup)="applyFilter($event)" [disabled]="isLoading">
                <mat-icon matSuffix>filter_list</mat-icon>
              </mat-form-field>
            </div>

            <!-- Loading Spinner -->
            <div *ngIf="isLoading" class="loading-container">
              <mat-progress-spinner 
                mode="indeterminate" 
                diameter="50"
                color="primary">
              </mat-progress-spinner>
              <p class="loading-text">Loading load balancers from Google Cloud...</p>
            </div>

            <!-- Error State -->
            <div *ngIf="hasError && !isLoading" class="error-container">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <h3>Unable to load load balancers</h3>
              <p>{{ errorMessage }}</p>
              <button mat-raised-button color="primary" (click)="refresh()">
                <mat-icon>refresh</mat-icon>
                Try Again
              </button>
            </div>

            <!-- Data Table -->
            <div *ngIf="!isLoading && !hasError" class="table-container">
              <table mat-table [dataSource]="dataSource" class="load-balancer-table" matSort>
                <!-- Checkbox Column -->
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef>
                    <mat-checkbox></mat-checkbox>
                  </th>
                  <td mat-cell *matCellDef="let element">
                    <mat-checkbox></mat-checkbox>
                  </td>
                </ng-container>

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="load-balancer-link" (click)="viewLoadBalancer(element)">{{element.name}}</a>
                  </td>
                </ng-container>

                <!-- Load balancer type Column -->
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Load balancer type</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="type-badge" [ngClass]="getTypeBadgeClass(element.type)">
                      {{element.typeDisplay}}
                    </span>
                  </td>
                </ng-container>

                <!-- Access type Column -->
                <ng-container matColumnDef="accessType">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Access type</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="access-type" [ngClass]="element.accessType.toLowerCase()">
                      {{element.accessType}}
                    </span>
                  </td>
                </ng-container>

                <!-- Protocols Column -->
                <ng-container matColumnDef="protocols">
                  <th mat-header-cell *matHeaderCellDef>Protocols</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="protocols">{{element.protocols.join(', ')}}</span>
                  </td>
                </ng-container>

                <!-- Region Column -->
                <ng-container matColumnDef="region">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Region</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="region">{{element.region || '-'}}</span>
                  </td>
                </ng-container>

                <!-- Backends Column -->
                <ng-container matColumnDef="backends">
                  <th mat-header-cell *matHeaderCellDef>Backends</th>
                  <td mat-cell *matCellDef="let element">
                    <div class="backends-info">
                      <mat-icon class="status-icon" [ngClass]="getBackendStatusClass(element.backendStatus)">
                        {{getBackendStatusIcon(element.backendStatus)}}
                      </mat-icon>
                      <span class="backend-count">{{element.backendSummary}}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let element">
                    <button mat-icon-button [matMenuTriggerFor]="menu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="editLoadBalancer(element)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button mat-menu-item (click)="deleteLoadBalancer(element)">
                        <mat-icon>delete</mat-icon>
                        <span>Delete</span>
                      </button>
                      <button mat-menu-item (click)="viewDetails(element)">
                        <mat-icon>visibility</mat-icon>
                        <span>View details</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              <!-- Empty State -->
              <div *ngIf="dataSource.data.length === 0" class="empty-state">
                <mat-icon class="empty-icon">balance</mat-icon>
                <h3>No load balancers found</h3>
                <p>You don't have any load balancers in this project yet.</p>
                <button mat-raised-button color="primary" (click)="createLoadBalancer()">
                  <mat-icon>add</mat-icon>
                  Create your first load balancer
                </button>
              </div>
            </div>

            <div *ngIf="!isLoading && !hasError" class="info-note">
              <p>To view or delete load balancing resources like forwarding rules and target proxies, go to the <a href="#" class="link">load balancing components view</a>.</p>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Backends">
          <div class="tab-content">
            <div class="placeholder-content">
              <mat-icon class="placeholder-icon">storage</mat-icon>
              <h3>Backend services and pools</h3>
              <p>Manage backend services, instance groups, and network endpoint groups.</p>
              <button mat-raised-button color="primary">Create backend service</button>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Frontends">
          <div class="tab-content">
            <div class="placeholder-content">
              <mat-icon class="placeholder-icon">input</mat-icon>
              <h3>Frontend configurations</h3>
              <p>Manage frontend IP addresses, ports, and SSL certificates.</p>
              <button mat-raised-button color="primary">Create frontend</button>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Service LB policies">
          <div class="tab-content">
            <div class="placeholder-content">
              <mat-icon class="placeholder-icon">policy</mat-icon>
              <h3>Service Load Balancer policies</h3>
              <p>Configure advanced load balancing policies and routing rules.</p>
              <button mat-raised-button color="primary">Create policy</button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .load-balancing-container {
      padding: 20px 24px;
      background-color: #fafafa;
      min-height: calc(100vh - 120px);
      overflow-y: auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .header-actions button {
      height: 36px;
    }

    .tabs {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 24px;
      min-height: 500px;
    }

    .filters {
      margin-bottom: 20px;
    }

    .filter-field {
      width: 300px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
    }

    .loading-text {
      margin-top: 16px;
      color: #5f6368;
      font-size: 14px;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ea4335;
      margin-bottom: 16px;
    }

    .error-container h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 400;
    }

    .error-container p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
      max-width: 400px;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .load-balancer-table {
      width: 100%;
    }

    .load-balancer-table th {
      background-color: #f8f9fa;
      font-weight: 500;
      color: #5f6368;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .load-balancer-table td {
      border-bottom: 1px solid #e8eaed;
      padding: 12px 16px;
    }

    .load-balancer-link {
      color: #1a73e8;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .load-balancer-link:hover {
      text-decoration: underline;
    }

    .type-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .type-badge.application {
      background-color: #e8f0fe;
      color: #1a73e8;
    }

    .type-badge.network {
      background-color: #fce8e6;
      color: #d33b01;
    }

    .access-type.external {
      color: #137333;
      font-weight: 500;
    }

    .access-type.internal {
      color: #ea4335;
      font-weight: 500;
    }

    .protocols {
      color: #5f6368;
    }

    .region {
      color: #5f6368;
    }

    .backends-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-icon.healthy {
      color: #137333;
    }

    .status-icon.warning {
      color: #f9ab00;
    }

    .status-icon.error {
      color: #ea4335;
    }

    .backend-count {
      color: #5f6368;
      font-size: 14px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #9aa0a6;
      margin-bottom: 24px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 400;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
      max-width: 400px;
    }

    .info-note {
      margin-top: 24px;
      padding: 16px;
      background-color: #f1f3f4;
      border-radius: 8px;
      border-left: 4px solid #1a73e8;
    }

    .info-note p {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    .link {
      color: #1a73e8;
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }

    .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .placeholder-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #9aa0a6;
      margin-bottom: 24px;
    }

    .placeholder-content h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 400;
    }

    .placeholder-content p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
      max-width: 400px;
    }
  `]
})
export class LoadBalancingComponent implements OnInit {
  displayedColumns: string[] = ['select', 'name', 'type', 'accessType', 'protocols', 'region', 'backends', 'actions'];
  dataSource = new MatTableDataSource<LoadBalancer>();
  loadBalancers$: Observable<LoadBalancer[]>;
  
  // Loading and error states
  isLoading = false;
  hasError = false;
  errorMessage = '';

  constructor(
    private loadBalancerService: LoadBalancerService,
    private projectService: ProjectService,
    private router: Router
  ) {
    this.loadBalancers$ = this.loadBalancerService.getLoadBalancers();
  }

  ngOnInit() {
    this.loadLoadBalancers();
  }

  loadLoadBalancers() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    console.log('🔄 Starting to load load balancers...');

    this.loadBalancers$.subscribe({
      next: (loadBalancers) => {
        console.log(`✅ Successfully loaded ${loadBalancers.length} load balancers`);
        this.dataSource.data = loadBalancers;
        this.isLoading = false;
        this.hasError = false;
      },
      error: (error) => {
        console.error('❌ Error loading load balancers:', error);
        this.isLoading = false;
        this.hasError = true;
        
        // Determine error message based on error type
        if (error.status === 401) {
          this.errorMessage = 'Authentication required. Please sign in to Google Cloud.';
        } else if (error.status === 403) {
          this.errorMessage = 'You don\'t have permission to view load balancers. Contact your administrator.';
        } else if (error.status === 404) {
          this.errorMessage = 'Project not found or load balancing API not enabled.';
        } else if (error.status === 0) {
          this.errorMessage = 'Network error. Check your internet connection and try again.';
        } else {
          this.errorMessage = `Unable to load load balancers: ${error.message || 'Unknown error'}`;
        }
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  createLoadBalancer() {
    console.log('🔄 Navigating to create load balancer page...');
    this.router.navigate(['/load-balancing/create']);
  }

  refresh() {
    console.log('🔄 Refreshing load balancers...');
    this.loadLoadBalancers();
  }

  viewLoadBalancer(loadBalancer: LoadBalancer) {
    console.log('View load balancer:', loadBalancer);
    // TODO: Navigate to load balancer details
  }

  editLoadBalancer(loadBalancer: LoadBalancer) {
    console.log('Edit load balancer:', loadBalancer);
    // TODO: Open edit dialog
  }

  deleteLoadBalancer(loadBalancer: LoadBalancer) {
    console.log('Delete load balancer:', loadBalancer);
    // TODO: Show confirmation dialog and delete
  }

  viewDetails(loadBalancer: LoadBalancer) {
    console.log('View details:', loadBalancer);
    // TODO: Navigate to detailed view
  }

  getTypeBadgeClass(type: LoadBalancerType): string {
    switch (type) {
      case 'APPLICATION_CLASSIC':
      case 'APPLICATION_GLOBAL':
        return 'application';
      case 'NETWORK_PASSTHROUGH':
      case 'NETWORK_PROXY':
        return 'network';
      default:
        return 'application';
    }
  }

  getBackendStatusClass(status: 'healthy' | 'warning' | 'error'): string {
    return status;
  }

  getBackendStatusIcon(status: 'healthy' | 'warning' | 'error'): string {
    switch (status) {
      case 'healthy':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'check_circle';
    }
  }
} 