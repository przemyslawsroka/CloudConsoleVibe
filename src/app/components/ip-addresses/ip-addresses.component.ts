import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IpAddressService, IpAddress } from '../../services/ip-address.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { ReserveIpDialogComponent, ReserveIpDialogData } from './reserve-ip-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ip-addresses',
  template: `
    <div class="ip-addresses-container">
      <!-- Header with title and action buttons -->
      <div class="header">
        <h1>IP addresses</h1>
        <div class="header-actions">
          <button mat-stroked-button color="primary" (click)="reserveExternalStatic()">
            <mat-icon>add</mat-icon>
            Reserve external static IP address
          </button>
          <button mat-stroked-button color="primary" (click)="reserveInternalStatic()">
            <mat-icon>add</mat-icon>
            Reserve internal static IP address
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-stroked-button 
                  [disabled]="selection.isEmpty()" 
                  (click)="releaseSelected()"
                  color="warn">
            Release static address
          </button>
          <button mat-icon-button matTooltip="Show info panel">
            <mat-icon>info</mat-icon>
          </button>
        </div>
      </div>

      <!-- Tabs for filtering -->
      <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
        <mat-tab label="All"></mat-tab>
        <mat-tab label="Internal IP addresses"></mat-tab>
        <mat-tab label="External IP addresses"></mat-tab>
        <mat-tab label="IPv4 addresses"></mat-tab>
        <mat-tab label="IPv6 addresses"></mat-tab>
      </mat-tab-group>

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
                              [checked]="selection.isSelected(row)"
                              [disabled]="row.type === 'Ephemeral'">
                </mat-checkbox>
              </td>
            </ng-container>

            <!-- Name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let element">
                <span class="name-cell">{{ element.name || '—' }}</span>
              </td>
            </ng-container>

            <!-- IP address column -->
            <ng-container matColumnDef="address">
              <th mat-header-cell *matHeaderCellDef>IP address</th>
              <td mat-cell *matCellDef="let element">{{ element.address }}</td>
            </ng-container>

            <!-- Access type column -->
            <ng-container matColumnDef="accessType">
              <th mat-header-cell *matHeaderCellDef>Access type</th>
              <td mat-cell *matCellDef="let element">{{ element.accessType }}</td>
            </ng-container>

            <!-- Region column -->
            <ng-container matColumnDef="region">
              <th mat-header-cell *matHeaderCellDef>Region</th>
              <td mat-cell *matCellDef="let element">{{ element.region || '—' }}</td>
            </ng-container>

            <!-- Type column -->
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type ⬇</th>
              <td mat-cell *matCellDef="let element">
                <span [class]="'type-' + element.type.toLowerCase()">{{ element.type }}</span>
              </td>
            </ng-container>

            <!-- Version column -->
            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef>Version</th>
              <td mat-cell *matCellDef="let element">{{ element.version }}</td>
            </ng-container>

            <!-- In use by column -->
            <ng-container matColumnDef="inUseBy">
              <th mat-header-cell *matHeaderCellDef>In use by</th>
              <td mat-cell *matCellDef="let element">
                <span *ngIf="element.inUseBy" class="in-use-link">{{ element.inUseBy }}</span>
                <span *ngIf="!element.inUseBy" class="warning-icon">
                  <mat-icon color="warn">warning</mat-icon>
                  None
                </span>
              </td>
            </ng-container>

            <!-- Subnetwork column -->
            <ng-container matColumnDef="subnetwork">
              <th mat-header-cell *matHeaderCellDef>Subnetwork</th>
              <td mat-cell *matCellDef="let element">
                <a *ngIf="element.subnetwork" class="link">{{ element.subnetwork }}</a>
                <span *ngIf="!element.subnetwork">—</span>
              </td>
            </ng-container>

            <!-- VPC Network column -->
            <ng-container matColumnDef="vpcNetwork">
              <th mat-header-cell *matHeaderCellDef>VPC Network</th>
              <td mat-cell *matCellDef="let element">
                <a *ngIf="element.vpcNetwork" class="link">{{ element.vpcNetwork }}</a>
                <span *ngIf="!element.vpcNetwork">—</span>
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
                  <button mat-menu-item *ngIf="element.type === 'Static'" (click)="releaseIp(element)">
                    <mat-icon>delete</mat-icon>
                    <span>Release static address</span>
                  </button>
                  <button mat-menu-item>
                    <mat-icon>info</mat-icon>
                    <span>View details</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="filteredData.length === 0 && !isLoading" class="no-data">
            <p>No IP addresses found</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ip-addresses-container {
      padding: 20px;
      max-width: 100%;
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
      min-width: 1200px;
    }

    .mat-column-select {
      width: 48px;
    }

    .mat-column-name {
      width: 120px;
    }

    .mat-column-address {
      width: 140px;
    }

    .mat-column-accessType {
      width: 100px;
    }

    .mat-column-region {
      width: 120px;
    }

    .mat-column-type {
      width: 100px;
    }

    .mat-column-version {
      width: 80px;
    }

    .mat-column-inUseBy {
      width: 300px;
    }

    .mat-column-subnetwork {
      width: 150px;
    }

    .mat-column-vpcNetwork {
      width: 150px;
    }

    .mat-column-actions {
      width: 80px;
      text-align: center;
    }

    .name-cell {
      font-weight: 500;
    }

    .type-static {
      color: #1976d2;
    }

    .type-ephemeral {
      color: #757575;
    }

    .in-use-link {
      color: #1976d2;
      cursor: pointer;
    }

    .in-use-link:hover {
      text-decoration: underline;
    }

    .warning-icon {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #ff9800;
    }

    .link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #5f6368;
    }

    ::ng-deep .mat-tab-group {
      margin-bottom: 0;
    }

    ::ng-deep .mat-tab-header {
      border-bottom: 1px solid #e0e0e0;
    }

    ::ng-deep .mat-tab-label {
      color: #5f6368;
      opacity: 1;
    }

    ::ng-deep .mat-tab-label-active {
      color: #1976d2;
    }
  `]
})
export class IpAddressesComponent implements OnInit {
  ipAddresses: IpAddress[] = [];
  filteredData: IpAddress[] = [];
  displayedColumns: string[] = [
    'select', 'name', 'address', 'accessType', 'region', 'type', 
    'version', 'inUseBy', 'subnetwork', 'vpcNetwork', 'actions'
  ];
  selection = new SelectionModel<IpAddress>(true, []);
  selectedTabIndex = 0;
  filterValue = '';
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private ipAddressService: IpAddressService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadIpAddresses();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading data without project');
        this.loadIpAddresses();
      }
    }, 1000);
  }

  loadIpAddresses() {
    // For development, load mock data even without project ID
    this.isLoading = true;
    console.log('Loading IP addresses for project:', this.projectId);
    
    this.ipAddressService.getIpAddresses(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('IP addresses loaded:', response);
        this.ipAddresses = response;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading IP addresses:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
    this.applyFilters();
  }

  applyFilter() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.ipAddresses];
    console.log('Applying filters to:', this.ipAddresses.length, 'items');
    console.log('Selected tab index:', this.selectedTabIndex);
    console.log('Filter value:', this.filterValue);

    // Apply tab filter
    switch (this.selectedTabIndex) {
      case 1: // Internal IP addresses
        filtered = filtered.filter(ip => ip.accessType === 'Internal');
        break;
      case 2: // External IP addresses
        filtered = filtered.filter(ip => ip.accessType === 'External');
        break;
      case 3: // IPv4 addresses
        filtered = filtered.filter(ip => ip.version === 'IPv4');
        break;
      case 4: // IPv6 addresses
        filtered = filtered.filter(ip => ip.version === 'IPv6');
        break;
      // case 0 (All) - no filter
    }

    // Apply text filter
    if (this.filterValue) {
      const searchTerm = this.filterValue.toLowerCase();
      filtered = filtered.filter(ip =>
        (ip.name?.toLowerCase().includes(searchTerm)) ||
        ip.address.toLowerCase().includes(searchTerm) ||
        ip.accessType.toLowerCase().includes(searchTerm) ||
        ip.region.toLowerCase().includes(searchTerm) ||
        ip.type.toLowerCase().includes(searchTerm) ||
        (ip.inUseBy?.toLowerCase().includes(searchTerm)) ||
        (ip.subnetwork?.toLowerCase().includes(searchTerm)) ||
        (ip.vpcNetwork?.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredData = filtered;
    console.log('Filtered data:', this.filteredData.length, 'items');
    this.selection.clear();
  }

  refresh() {
    this.loadIpAddresses();
  }

  reserveExternalStatic() {
    const dialogRef = this.dialog.open(ReserveIpDialogComponent, {
      data: { type: 'external' } as ReserveIpDialogData,
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.projectId) {
        this.ipAddressService.reserveExternalStaticIp(this.projectId, result).subscribe({
          next: () => {
            this.loadIpAddresses();
            this.snackBar.open('External static IP reserved successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error reserving external static IP:', error);
            this.snackBar.open('Error reserving external static IP', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  reserveInternalStatic() {
    const dialogRef = this.dialog.open(ReserveIpDialogComponent, {
      data: { type: 'internal' } as ReserveIpDialogData,
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.projectId) {
        this.ipAddressService.reserveInternalStaticIp(this.projectId, result).subscribe({
          next: () => {
            this.loadIpAddresses();
            this.snackBar.open('Internal static IP reserved successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error reserving internal static IP:', error);
            this.snackBar.open('Error reserving internal static IP', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  releaseSelected() {
    const selectedItems = this.selection.selected;
    if (selectedItems.length === 0) return;

    const confirmMessage = selectedItems.length === 1 
      ? `Are you sure you want to release the static IP address "${selectedItems[0].address}"?`
      : `Are you sure you want to release ${selectedItems.length} static IP addresses?`;

    if (confirm(confirmMessage)) {
      if (!this.projectId) return;
      
      // Release each IP address
      const releaseRequests = selectedItems.map(ip => 
        this.ipAddressService.releaseStaticIp(this.projectId!, ip)
      );

      // Execute all releases
      forkJoin(releaseRequests).subscribe({
        next: () => {
          console.log('Successfully released all selected IP addresses');
          this.loadIpAddresses();
          this.selection.clear();
          this.snackBar.open('Selected IP addresses released successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error releasing some IP addresses:', error);
          // Reload to see which ones were actually released
          this.loadIpAddresses();
          this.selection.clear();
          this.snackBar.open('Error releasing IP addresses', 'Close', { duration: 3000 });
        }
      });
    }
  }

  releaseIp(ip: IpAddress) {
    if (confirm(`Are you sure you want to release the static IP address "${ip.address}"?`)) {
      if (!this.projectId) return;
      this.ipAddressService.releaseStaticIp(this.projectId, ip).subscribe({
        next: () => {
          this.loadIpAddresses();
          this.snackBar.open('IP address released successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error releasing IP address:', error);
          this.snackBar.open('Error releasing IP address', 'Close', { duration: 3000 });
        }
      });
    }
  }

  // Selection methods
  isAllSelected() {
    const selectableItems = this.filteredData.filter(ip => ip.type === 'Static');
    const numSelected = this.selection.selected.length;
    const numRows = selectableItems.length;
    return numSelected === numRows;
  }

  masterToggle() {
    const selectableItems = this.filteredData.filter(ip => ip.type === 'Static');
    this.isAllSelected() ?
      this.selection.clear() :
      selectableItems.forEach(row => this.selection.select(row));
  }
}