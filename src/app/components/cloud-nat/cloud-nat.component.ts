import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CloudNatService, CloudNatGateway } from '../../services/cloud-nat.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-cloud-nat',
  template: `
    <div class="cloud-nat-container">
      <!-- Header with title and action buttons -->
      <div class="header">
        <h1>Cloud NAT</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createNatGateway()">
            <mat-icon>add</mat-icon>
            Create Cloud NAT gateway
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-stroked-button 
                  [disabled]="selection.isEmpty()" 
                  (click)="deleteSelected()"
                  color="warn">
            Delete
          </button>
          <button mat-icon-button matTooltip="Show info panel">
            <mat-icon>info</mat-icon>
          </button>
        </div>
      </div>

      <!-- Filter section -->
      <div class="filter-section">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Enter property name or value</mat-label>
          <input matInput [(ngModel)]="filterValue" (input)="applyFilter()" placeholder="Filter">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
        <button mat-icon-button matTooltip="Show filter options">
          <mat-icon>help_outline</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Column display options">
          <mat-icon>view_column</mat-icon>
        </button>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <!-- Data table -->
      <mat-card *ngIf="!isLoading">
        <mat-card-content class="table-container">
          <table mat-table [dataSource]="filteredData" class="mat-elevation-z2">
            
            <!-- Checkbox column -->
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox (change)="$event ? masterToggle() : null"
                              [checked]="selection.hasValue() && isAllSelected()"
                              [indeterminate]="selection.hasValue() && !isAllSelected()">
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox (click)="$event.stopPropagation()"
                              (change)="$event ? selection.toggle(row) : null"
                              [checked]="selection.isSelected(row)">
                </mat-checkbox>
              </td>
            </ng-container>

            <!-- Gateway name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Gateway name</th>
              <td mat-cell *matCellDef="let element">
                <a class="gateway-link" (click)="viewGatewayDetails(element)">{{ element.name }}</a>
              </td>
            </ng-container>

            <!-- Network column -->
            <ng-container matColumnDef="network">
              <th mat-header-cell *matHeaderCellDef>Network</th>
              <td mat-cell *matCellDef="let element">
                <a class="network-link" (click)="viewNetwork(element.network)">{{ element.network }}</a>
              </td>
            </ng-container>

            <!-- Region column -->
            <ng-container matColumnDef="region">
              <th mat-header-cell *matHeaderCellDef>Region</th>
              <td mat-cell *matCellDef="let element">{{ element.region }}</td>
            </ng-container>

            <!-- NAT type column -->
            <ng-container matColumnDef="natType">
              <th mat-header-cell *matHeaderCellDef>NAT type</th>
              <td mat-cell *matCellDef="let element">{{ element.natType }}</td>
            </ng-container>

            <!-- Cloud router column -->
            <ng-container matColumnDef="cloudRouter">
              <th mat-header-cell *matHeaderCellDef>Cloud router</th>
              <td mat-cell *matCellDef="let element">
                <a class="router-link" (click)="viewCloudRouter(element.cloudRouter, element.region)">{{ element.cloudRouter }}</a>
              </td>
            </ng-container>

            <!-- Status column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let element">
                <div class="status-indicator">
                  <mat-icon [style.color]="getStatusColor(element.status)">
                    {{ getStatusIcon(element.status) }}
                  </mat-icon>
                  <span>{{ element.status }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Actions column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let element">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewGatewayDetails(element)">
                    <mat-icon>info</mat-icon>
                    <span>View details</span>
                  </button>
                  <button mat-menu-item (click)="editGateway(element)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteGateway(element)">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="viewLogs(element)">
                    <mat-icon>receipt_long</mat-icon>
                    <span>View logs</span>
                  </button>
                  <button mat-menu-item (click)="viewMetrics(element)">
                    <mat-icon>analytics</mat-icon>
                    <span>View metrics</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="filteredData.length === 0 && !isLoading" class="no-data">
            <mat-icon class="no-data-icon">cloud_off</mat-icon>
            <h3>No Cloud NAT gateways found</h3>
            <p>Create a Cloud NAT gateway to enable outbound internet access for your VPC resources.</p>
            <button mat-raised-button color="primary" (click)="createNatGateway()">
              <mat-icon>add</mat-icon>
              Create Cloud NAT gateway
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cloud-nat-container {
      padding: 20px;
      max-width: 100%;
      background: var(--background-color);
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
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

    .header-actions button {
      height: 36px;
    }

    .filter-section {
      display: flex;
      align-items: center;
      margin: 16px 0;
      gap: 8px;
    }

    .filter-field {
      width: 300px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .table-container {
      overflow-x: auto;
      padding: 0;
    }

    table {
      width: 100%;
      min-width: 1000px;
    }

    .gateway-link,
    .network-link,
    .router-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }

    .gateway-link:hover,
    .network-link:hover,
    .router-link:hover {
      text-decoration: underline;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .no-data {
      text-align: center;
      padding: 60px 40px;
      color: var(--text-secondary-color);
    }

    .no-data-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: var(--text-secondary-color);
    }

    .no-data h3 {
      margin: 16px 0 8px 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
    }

    .no-data p {
      margin: 0 0 24px 0;
      font-size: 14px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .table-container {
        background: var(--surface-color);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--surface-color) !important;
        }

        .mat-mdc-form-field-input-control {
          color: var(--text-color) !important;
        }

        .mat-mdc-form-field-label {
          color: var(--text-secondary-color) !important;
        }

        .mat-mdc-form-field-outline {
          color: var(--border-color) !important;
        }

        .mat-mdc-form-field-outline-thick {
          color: #1976d2 !important;
        }
      }

      .mat-mdc-table {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-header-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-row:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-checkbox {
        .mat-mdc-checkbox-frame {
          border-color: var(--border-color) !important;
        }

        .mat-mdc-checkbox-checkmark {
          color: white !important;
        }
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button {
        border-color: var(--border-color) !important;
      }

      .mat-mdc-icon-button {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-menu-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-menu-item {
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-item:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-card {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-form-field-input-control {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-form-field-label {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-button {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-icon-button {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-table {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-header-cell {
      color: var(--text-color);
      border-bottom-color: var(--border-color);
    }

    ::ng-deep .mat-mdc-cell {
      color: var(--text-color);
      border-bottom-color: var(--border-color);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .cloud-nat-container {
        padding: 12px;
      }

      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-actions {
        flex-wrap: wrap;
        width: 100%;
      }

      .filter-field {
        width: 100%;
      }

      .table-container {
        overflow-x: scroll;
      }
    }
  `]
})
export class CloudNatComponent implements OnInit {
  natGateways: CloudNatGateway[] = [];
  filteredData: CloudNatGateway[] = [];
  displayedColumns: string[] = [
    'select', 'name', 'network', 'region', 'natType', 'cloudRouter', 'status', 'actions'
  ];
  selection = new SelectionModel<CloudNatGateway>(true, []);
  filterValue = '';
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private cloudNatService: CloudNatService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Subscribe to project changes
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadNatGateways();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading data without project');
        this.loadNatGateways();
      }
    }, 1000);
  }

  loadNatGateways() {
    this.isLoading = true;
    console.log('Loading Cloud NAT gateways for project:', this.projectId);
    
    this.cloudNatService.getNatGateways(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Cloud NAT gateways loaded:', response);
        this.natGateways = response;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading Cloud NAT gateways:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    let filtered = [...this.natGateways];
    
    if (this.filterValue) {
      const searchTerm = this.filterValue.toLowerCase();
      filtered = filtered.filter(gateway =>
        gateway.name.toLowerCase().includes(searchTerm) ||
        gateway.network.toLowerCase().includes(searchTerm) ||
        gateway.region.toLowerCase().includes(searchTerm) ||
        gateway.natType.toLowerCase().includes(searchTerm) ||
        gateway.cloudRouter.toLowerCase().includes(searchTerm) ||
        gateway.status.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredData = filtered;
    this.selection.clear();
  }

  refresh() {
    this.loadNatGateways();
  }

  createNatGateway() {
    this.snackBar.open('Create Cloud NAT gateway functionality would be implemented here', 'Close', {
      duration: 5000
    });
  }

  deleteSelected() {
    const selectedItems = this.selection.selected;
    if (selectedItems.length === 0) return;

    const confirmMessage = selectedItems.length === 1 
      ? `Are you sure you want to delete the Cloud NAT gateway "${selectedItems[0].name}"?`
      : `Are you sure you want to delete ${selectedItems.length} Cloud NAT gateways?`;

    if (confirm(confirmMessage)) {
      if (!this.projectId) return;
      
      // Delete each NAT gateway
      const deleteRequests = selectedItems.map(gateway => 
        this.cloudNatService.deleteNatGateway(this.projectId!, gateway.region, gateway.cloudRouter, gateway.name)
      );

      // Execute all deletions
      forkJoin(deleteRequests).subscribe({
        next: () => {
          console.log('Successfully deleted all selected Cloud NAT gateways');
          this.loadNatGateways();
          this.selection.clear();
          this.snackBar.open('Selected Cloud NAT gateways deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting some Cloud NAT gateways:', error);
          this.loadNatGateways();
          this.selection.clear();
          this.snackBar.open('Error deleting Cloud NAT gateways', 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteGateway(gateway: CloudNatGateway) {
    if (confirm(`Are you sure you want to delete the Cloud NAT gateway "${gateway.name}"?`)) {
      if (!this.projectId) return;
      
      this.cloudNatService.deleteNatGateway(this.projectId, gateway.region, gateway.cloudRouter, gateway.name).subscribe({
        next: () => {
          this.loadNatGateways();
          this.snackBar.open('Cloud NAT gateway deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting Cloud NAT gateway:', error);
          this.snackBar.open('Error deleting Cloud NAT gateway', 'Close', { duration: 3000 });
        }
      });
    }
  }

  viewGatewayDetails(gateway: CloudNatGateway) {
    // Navigate to gateway details (to be implemented)
    this.snackBar.open(`View details for "${gateway.name}" would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  editGateway(gateway: CloudNatGateway) {
    this.snackBar.open(`Edit "${gateway.name}" functionality would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  viewNetwork(networkName: string) {
    this.router.navigate(['/vpc', networkName]);
  }

  viewCloudRouter(routerName: string, region: string) {
    this.router.navigate(['/cloud-router', routerName], { 
      queryParams: { region: region } 
    });
  }

  viewLogs(gateway: CloudNatGateway) {
    this.snackBar.open(`View logs for "${gateway.name}" would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  viewMetrics(gateway: CloudNatGateway) {
    this.snackBar.open(`View metrics for "${gateway.name}" would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Running':
        return '#4caf50';
      case 'Failed':
        return '#f44336';
      case 'Creating':
        return '#ff9800';
      case 'Stopping':
        return '#ff9800';
      default:
        return '#757575';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Running':
        return 'check_circle';
      case 'Failed':
        return 'error';
      case 'Creating':
        return 'schedule';
      case 'Stopping':
        return 'schedule';
      default:
        return 'help';
    }
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredData.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.filteredData.forEach(row => this.selection.select(row));
  }
} 