import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { InternalRangesService, InternalRange } from '../../services/internal-ranges.service';
import { ReserveInternalRangeDialogComponent } from './reserve-internal-range-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-internal-ranges',
  template: `
    <div class="internal-ranges-container">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <span class="breadcrumb-item">VPC Network</span>
          <mat-icon>chevron_right</mat-icon>
          <span class="current-page">Internal ranges</span>
        </div>
        <h1>Internal ranges</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="reserveInternalRange()">
            <mat-icon>add</mat-icon>
            Reserve internal range
          </button>
          <button mat-icon-button>
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading internal ranges...</p>
      </div>

      <!-- Main content -->
      <div *ngIf="!isLoading" class="content">
        <!-- Table controls -->
        <div class="table-controls">
          <div class="filter-controls">
            <button mat-icon-button>
              <mat-icon>filter_list</mat-icon>
            </button>
            <span class="filter-label">Filter</span>
          </div>
          <div class="view-controls">
            <mat-form-field class="search-field" appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Search ranges">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Data table -->
        <div class="table-container mat-elevation-z1">
                                            <table mat-table [dataSource]="dataSource" class="ranges-table" matSort>
            
            <!-- Checkbox column -->
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox 
                  (change)="$event ? masterToggle() : null"
                  [checked]="selection.hasValue() && isAllSelected()"
                  [indeterminate]="selection.hasValue() && !isAllSelected()">
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox 
                  (click)="$event.stopPropagation()"
                  (change)="$event ? selection.toggle(row) : null"
                  [checked]="selection.isSelected(row)">
                </mat-checkbox>
              </td>
            </ng-container>

            <!-- Name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let range">
                <a class="range-link" (click)="viewRangeDetails(range)">{{range.name}}</a>
              </td>
            </ng-container>

            <!-- IP range column -->
            <ng-container matColumnDef="ipRange">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>IP range</th>
              <td mat-cell *matCellDef="let range">{{range.ipRange}}</td>
            </ng-container>

            <!-- IP version column -->
            <ng-container matColumnDef="ipVersion">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>IP version</th>
              <td mat-cell *matCellDef="let range">{{range.ipVersion}}</td>
            </ng-container>

            <!-- Status column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let range">
                <span class="status-badge" [ngClass]="getStatusClass(range.status)">
                  <mat-icon class="status-icon">{{getStatusIcon(range.status)}}</mat-icon>
                  {{range.status}}
                </span>
              </td>
            </ng-container>

            <!-- Immutable column -->
            <ng-container matColumnDef="immutable">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Immutable</th>
              <td mat-cell *matCellDef="let range">{{range.immutable ? 'Yes' : 'No'}}</td>
            </ng-container>

            <!-- VPC Network column -->
            <ng-container matColumnDef="vpcNetwork">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>VPC Network</th>
              <td mat-cell *matCellDef="let range">
                <a class="network-link" [routerLink]="['/vpc', range.vpcNetwork]">{{range.vpcNetwork}}</a>
              </td>
            </ng-container>

            <!-- Usage column -->
            <ng-container matColumnDef="usage">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Usage</th>
              <td mat-cell *matCellDef="let range">{{range.usage}}</td>
            </ng-container>

            <!-- Peering column -->
            <ng-container matColumnDef="peering">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Peering</th>
              <td mat-cell *matCellDef="let range">{{range.peering}}</td>
            </ng-container>

            <!-- Labels column -->
            <ng-container matColumnDef="labels">
              <th mat-header-cell *matHeaderCellDef>Labels</th>
              <td mat-cell *matCellDef="let range">
                <div class="labels-container" *ngIf="hasLabels(range.labels); else noLabels">
                  <mat-chip-listbox>
                    <mat-chip *ngFor="let label of getLabelsArray(range.labels)">
                      {{label.key}}: {{label.value}}
                    </mat-chip>
                  </mat-chip-listbox>
                </div>
                <ng-template #noLabels>
                  <span class="no-labels">—</span>
                </ng-template>
              </td>
            </ng-container>

            <!-- Actions column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let range">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewRangeDetails(range)">
                    <mat-icon>visibility</mat-icon>
                    <span>View details</span>
                  </button>
                  <button mat-menu-item (click)="editRange(range)" [disabled]="range.immutable">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deleteRange(range)" [disabled]="range.immutable || range.status === 'In use'">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                [class.selected-row]="selection.isSelected(row)"
                (click)="onRowClick(row)"></tr>
          </table>

          <!-- No data message -->
          <div *ngIf="dataSource.data.length === 0" class="no-data">
            <mat-icon>cloud_off</mat-icon>
            <h3>No internal ranges found</h3>
            <p>There are no internal ranges in this project, or they don't match your search criteria.</p>
            <button mat-raised-button color="primary" (click)="reserveInternalRange()">
              Reserve internal range
            </button>
          </div>
        </div>

        <!-- Table footer -->
        <div class="table-footer">
          <div class="results-info">
            {{dataSource.data.length}} of {{ranges.length}} ranges
          </div>
          <mat-paginator 
            [length]="dataSource.data.length"
            [pageSize]="pageSize"
            [pageSizeOptions]="pageSizeOptions"
            showFirstLastButtons>
          </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .internal-ranges-container {
      padding: 0;
      background: var(--background-color);
      min-height: 100vh;
    }

    .header {
      padding: 24px 32px;
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .breadcrumb-item {
      color: var(--primary-color);
      cursor: pointer;
    }

    .current-page {
      color: var(--text-secondary-color);
    }

    .breadcrumb mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 400;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-top: auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 20px;
    }

    .loading-container p {
      color: var(--text-secondary-color);
      margin: 0;
    }

    .content {
      padding: 24px 32px;
    }

    .table-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-label {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .search-field {
      width: 300px;
    }

    .table-container {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .ranges-table {
      width: 100%;
    }

    .mat-column-select {
      width: 40px;
    }

    .mat-column-name {
      width: 200px;
    }

    .mat-column-ipRange {
      width: 150px;
    }

    .mat-column-ipVersion {
      width: 100px;
    }

    .mat-column-status {
      width: 120px;
    }

    .mat-column-immutable {
      width: 100px;
    }

    .mat-column-vpcNetwork {
      width: 200px;
    }

    .mat-column-usage {
      width: 150px;
    }

    .mat-column-peering {
      width: 100px;
    }

    .mat-column-labels {
      width: 200px;
    }

    .mat-column-actions {
      width: 60px;
      text-align: center;
    }

    .range-link {
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
    }

    .range-link:hover {
      text-decoration: underline;
    }

    .network-link {
      color: var(--primary-color);
      text-decoration: none;
    }

    .network-link:hover {
      text-decoration: underline;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-in-use {
      color: var(--success-color);
    }

    .status-not-in-use {
      color: var(--text-secondary-color);
    }

    .labels-container {
      max-width: 200px;
    }

    .labels-container mat-chip-listbox {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .labels-container mat-chip {
      font-size: 12px;
      min-height: 24px;
    }

    .no-labels {
      color: var(--text-secondary-color);
    }

    .selected-row {
      background-color: var(--primary-color-light);
    }

    .no-data {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-secondary-color);
    }

    .no-data mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-data h3 {
      margin: 16px 0 8px 0;
      color: var(--text-color);
    }

    .no-data p {
      margin-bottom: 24px;
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--surface-color);
      border-top: 1px solid var(--border-color);
    }

    .results-info {
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    /* Dark theme adjustments */
    :host-context(.dark-theme) .table-container {
      background: var(--surface-color);
      border-color: var(--border-color);
    }

    :host-context(.dark-theme) .ranges-table {
      background: var(--surface-color);
    }

    :host-context(.dark-theme) .selected-row {
      background-color: rgba(var(--primary-color-rgb), 0.1);
    }
  `]
})
export class InternalRangesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  
  ranges: InternalRange[] = [];
  dataSource = new MatTableDataSource<InternalRange>([]);
  isLoading = true;
  searchTerm = '';
  
  displayedColumns: string[] = [
    'select', 'name', 'ipRange', 'ipVersion', 'status', 
    'immutable', 'vpcNetwork', 'usage', 'peering', 'labels', 'actions'
  ];

  // Selection
  selection = new SelectionModel<InternalRange>(true, []);
  
  // Pagination
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];

  constructor(
    private internalRangesService: InternalRangesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadInternalRanges();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  loadInternalRanges() {
    this.isLoading = true;
    this.internalRangesService.getInternalRanges().subscribe({
      next: (ranges) => {
        this.ranges = ranges;
        this.dataSource.data = ranges;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading internal ranges:', error);
        this.snackBar.open('Error loading internal ranges', 'Dismiss', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.dataSource.data = [...this.ranges];
      return;
    }

    const searchTerm = this.searchTerm.toLowerCase();
    this.dataSource.data = this.ranges.filter(range =>
      range.name.toLowerCase().includes(searchTerm) ||
      range.ipRange.toLowerCase().includes(searchTerm) ||
      range.vpcNetwork.toLowerCase().includes(searchTerm) ||
      range.status.toLowerCase().includes(searchTerm)
    );
  }

  reserveInternalRange() {
    const dialogRef = this.dialog.open(ReserveInternalRangeDialogComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInternalRanges();
        this.snackBar.open('Internal range reserved successfully', 'Dismiss', { duration: 3000 });
      }
    });
  }

  viewRangeDetails(range: InternalRange) {
    // Navigate to range details (implement if needed)
    console.log('View range details:', range);
  }

  editRange(range: InternalRange) {
    // Open edit dialog (implement if needed)
    console.log('Edit range:', range);
  }

  deleteRange(range: InternalRange) {
    if (confirm(`Are you sure you want to delete the internal range "${range.name}"?`)) {
      this.internalRangesService.deleteInternalRange(range.name).subscribe({
        next: () => {
          this.loadInternalRanges();
          this.snackBar.open('Internal range deleted successfully', 'Dismiss', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting internal range:', error);
          this.snackBar.open('Error deleting internal range', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  onRowClick(range: InternalRange) {
    this.selection.toggle(range);
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach((row: InternalRange) => this.selection.select(row));
    }
  }

  getStatusClass(status: string): string {
    return status === 'In use' ? 'status-in-use' : 'status-not-in-use';
  }

  getStatusIcon(status: string): string {
    return status === 'In use' ? 'check_circle' : 'radio_button_unchecked';
  }

  hasLabels(labels: { [key: string]: string }): boolean {
    return labels && Object.keys(labels).length > 0;
  }

  getLabelsArray(labels: { [key: string]: string }): Array<{key: string, value: string}> {
    if (!labels) return [];
    return Object.entries(labels).map(([key, value]) => ({ key, value }));
  }
} 