import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { DnsService, DnsZone } from '../../services/dns.service';
import { ProjectService, Project } from '../../services/project.service';
import { CreateZoneDialogComponent, CreateZoneDialogData } from './create-zone-dialog.component';

@Component({
  selector: 'app-dns-management',
  template: `
    <div class="dns-container">
      <!-- Header with title and action buttons -->
      <div class="header">
        <h1>Cloud DNS</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createZone()">
            <mat-icon>add</mat-icon>
            Create zone
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
        <mat-tab label="Zones"></mat-tab>
        <mat-tab label="DNS server policies"></mat-tab>
        <mat-tab label="Response policies"></mat-tab>
      </mat-tab-group>

      <!-- Content for Zones tab -->
      <div *ngIf="selectedTabIndex === 0">
        <!-- Description text -->
        <div class="description-text">
          <p>DNS zones let you define your namespace. You can create public or private zones.</p>
          <p>Select a zone to set labels or configure permissions. <a href="#" class="learn-more">Learn more</a></p>
        </div>

        <!-- Filter section -->
        <div class="filter-section">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Enter property name or value</mat-label>
            <input matInput [formControl]="filterControl" (input)="applyFilter()" placeholder="Filter">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </div>

        <!-- Loading spinner -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
        </div>

        <!-- Data table -->
        <mat-card *ngIf="!isLoading">
          <mat-card-content class="table-container">
            <table mat-table [dataSource]="filteredData" class="mat-elevation-z1">
              
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

              <!-- Zone name column -->
              <ng-container matColumnDef="zoneName">
                <th mat-header-cell *matHeaderCellDef>Zone name</th>
                <td mat-cell *matCellDef="let element">
                  <a class="zone-link" (click)="viewZoneDetails(element)">{{ element.name }}</a>
                </td>
              </ng-container>

              <!-- DNS name column -->
              <ng-container matColumnDef="dnsName">
                <th mat-header-cell *matHeaderCellDef>DNS name</th>
                <td mat-cell *matCellDef="let element">{{ element.dnsName }}</td>
              </ng-container>

              <!-- DNSSEC column -->
              <ng-container matColumnDef="dnssec">
                <th mat-header-cell *matHeaderCellDef>DNSSEC</th>
                <td mat-cell *matCellDef="let element">
                  <span class="dnssec-status" [class.enabled]="element.dnssecConfig?.state === 'on'">
                    {{ element.dnssecConfig?.state === 'on' ? 'Enabled' : 'Disabled' }}
                  </span>
                </td>
              </ng-container>

              <!-- Description column -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let element">{{ element.description || '—' }}</td>
              </ng-container>

              <!-- Zone type column -->
              <ng-container matColumnDef="zoneType">
                <th mat-header-cell *matHeaderCellDef>Zone type</th>
                <td mat-cell *matCellDef="let element">
                  <span class="zone-type" [class]="'type-' + element.visibility">
                    {{ element.visibility === 'public' ? 'Public' : 'Private' }}
                  </span>
                </td>
              </ng-container>

              <!-- In use by column -->
              <ng-container matColumnDef="inUseBy">
                <th mat-header-cell *matHeaderCellDef>In use by</th>
                <td mat-cell *matCellDef="let element">
                  <span *ngIf="element.inUseBy" class="in-use-link">{{ element.inUseBy }}</span>
                  <span *ngIf="!element.inUseBy">—</span>
                </td>
              </ng-container>

              <!-- Actions column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let element">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewZoneDetails(element)">
                      <mat-icon>visibility</mat-icon>
                      <span>View details</span>
                    </button>
                    <button mat-menu-item (click)="editZone(element)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="deleteZone(element)" color="warn">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div *ngIf="filteredData.length === 0 && !isLoading" class="no-data">
              <p>No DNS zones found</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Placeholder content for other tabs -->
      <div *ngIf="selectedTabIndex === 1" class="tab-content">
        <div class="placeholder-content">
          <mat-icon class="placeholder-icon">dns</mat-icon>
          <h3>DNS Server Policies</h3>
          <p>DNS server policies let you control DNS resolution for your VPC networks.</p>
          <button mat-raised-button color="primary">Create policy</button>
        </div>
      </div>

      <div *ngIf="selectedTabIndex === 2" class="tab-content">
        <div class="placeholder-content">
          <mat-icon class="placeholder-icon">policy</mat-icon>
          <h3>Response Policies</h3>
          <p>Response policies let you modify DNS responses based on query patterns.</p>
          <button mat-raised-button color="primary">Create policy</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dns-container {
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

    .description-text {
      margin: 16px 0;
      color: #5f6368;
      font-size: 14px;
    }

    .description-text p {
      margin: 4px 0;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
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
      min-width: 800px;
    }

    .mat-column-select {
      width: 48px;
    }

    .mat-column-zoneName {
      width: 180px;
    }

    .mat-column-dnsName {
      width: 180px;
    }

    .mat-column-dnssec {
      width: 100px;
    }

    .mat-column-description {
      width: 200px;
    }

    .mat-column-zoneType {
      width: 100px;
    }

    .mat-column-inUseBy {
      width: 200px;
    }

    .mat-column-actions {
      width: 60px;
      text-align: center;
    }

    .zone-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .zone-link:hover {
      text-decoration: underline;
    }

    .dnssec-status {
      color: #d93025;
    }

    .dnssec-status.enabled {
      color: #137333;
    }

    .zone-type {
      font-weight: 500;
    }

    .type-public {
      color: #1976d2;
    }

    .type-private {
      color: #9c27b0;
    }

    .in-use-link {
      color: #1976d2;
      cursor: pointer;
    }

    .in-use-link:hover {
      text-decoration: underline;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #5f6368;
    }

    .tab-content {
      padding: 40px 20px;
    }

    .placeholder-content {
      text-align: center;
      max-width: 400px;
      margin: 0 auto;
    }

    .placeholder-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #9aa0a6;
      margin-bottom: 16px;
    }

    .placeholder-content h3 {
      color: #202124;
      margin: 16px 0 8px 0;
    }

    .placeholder-content p {
      color: #5f6368;
      margin-bottom: 24px;
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
export class DnsManagementComponent implements OnInit {
  dnsZones: DnsZone[] = [];
  filteredData: DnsZone[] = [];
  displayedColumns: string[] = [
    'select', 'zoneName', 'dnsName', 'dnssec', 'description', 'zoneType', 'inUseBy', 'actions'
  ];
  selection = new SelectionModel<DnsZone>(true, []);
  selectedTabIndex = 0;
  filterControl = new FormControl('');
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private dnsService: DnsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      if (project) {
        this.projectId = project.id;
        this.loadDnsZones();
      }
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading DNS data without project');
        this.loadDnsZones();
      }
    }, 1000);
  }

  loadDnsZones() {
    this.isLoading = true;
    console.log('Loading DNS zones for project:', this.projectId);
    
    this.dnsService.getDnsZones(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('DNS zones loaded:', response);
        this.dnsZones = response;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading DNS zones:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  applyFilter() {
    const filterValue = (this.filterControl.value || '').toLowerCase();
    this.filteredData = this.dnsZones.filter(zone => 
      zone.name.toLowerCase().includes(filterValue) ||
      zone.dnsName.toLowerCase().includes(filterValue) ||
      (zone.description && zone.description.toLowerCase().includes(filterValue)) ||
      zone.visibility.toLowerCase().includes(filterValue)
    );
  }

  refresh() {
    this.loadDnsZones();
  }

  createZone() {
    const dialogRef = this.dialog.open(CreateZoneDialogComponent, {
      data: { type: 'public' } as CreateZoneDialogData,
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.projectId) {
        this.dnsService.createDnsZone(this.projectId, result).subscribe({
          next: (newZone) => {
            this.loadDnsZones();
            this.snackBar.open(`DNS zone "${newZone.name}" created successfully`, 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error creating DNS zone:', error);
            this.snackBar.open('Error creating DNS zone', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  viewZoneDetails(zone: DnsZone) {
    console.log('View zone details:', zone);
    // TODO: Navigate to zone details or open details dialog
    this.snackBar.open(`Viewing details for ${zone.name}`, 'Close', { duration: 3000 });
  }

  editZone(zone: DnsZone) {
    console.log('Edit zone:', zone);
    // TODO: Open edit zone dialog
    this.snackBar.open(`Edit functionality for ${zone.name} coming soon`, 'Close', { duration: 3000 });
  }

  deleteZone(zone: DnsZone) {
    if (confirm(`Are you sure you want to delete the DNS zone "${zone.name}"?`)) {
      if (!this.projectId) return;
      
      this.dnsService.deleteDnsZone(this.projectId, zone.name).subscribe({
        next: () => {
          this.loadDnsZones();
          this.snackBar.open(`DNS zone ${zone.name} deleted successfully`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting DNS zone:', error);
          this.snackBar.open('Error deleting DNS zone', 'Close', { duration: 3000 });
        }
      });
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