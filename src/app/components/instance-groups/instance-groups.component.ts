import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { InstanceGroupsService, InstanceGroup } from '../../services/instance-groups.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-instance-groups',
  template: `
    <div class="instance-groups-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="breadcrumb">
          <span class="breadcrumb-item">Compute Engine</span>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item current">Instance groups</span>
        </div>
        
        <div class="page-header">
          <h1 class="page-title">Instance groups</h1>
          <div class="header-actions">
            <button mat-raised-button color="primary" class="create-button" (click)="createInstanceGroup()">
              <mat-icon>add</mat-icon>
              Create instance group
            </button>
            <button mat-icon-button (click)="refreshData()" matTooltip="Refresh">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Delete" [disabled]="selectedGroups.length === 0">
              <mat-icon>delete</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Learn more">
              <mat-icon>help_outline</mat-icon>
            </button>
          </div>
        </div>

        <div class="description">
          <p>Instance groups are collections of VM instances that use load balancing and automated services, like autoscaling and autohealing. 
          <a href="#" class="learn-more-link">Learn more</a></p>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="filter-section">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filter</mat-label>
          <input matInput placeholder="Enter property name or value" [(ngModel)]="filterText" (input)="applyFilter()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <button mat-icon-button matTooltip="Filter options" class="filter-options-btn">
          <mat-icon>help_outline</mat-icon>
        </button>
        <div class="view-options">
          <button mat-icon-button matTooltip="Table view" class="view-btn active">
            <mat-icon>view_list</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Card view" class="view-btn">
            <mat-icon>view_module</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading instance groups...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Failed to load instance groups</h3>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="loadInstanceGroups()">Try Again</button>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && filteredGroups.length === 0 && instanceGroups.length === 0" class="empty-state">
        <mat-icon class="empty-icon">group_work</mat-icon>
        <h3>No instance groups found</h3>
        <p>Create your first instance group to get started with load balancing and autoscaling.</p>
        <button mat-raised-button color="primary" (click)="createInstanceGroup()">
          <mat-icon>add</mat-icon>
          Create instance group
        </button>
      </div>

      <!-- No Results State -->
      <div *ngIf="!loading && !error && filteredGroups.length === 0 && instanceGroups.length > 0" class="no-results-state">
        <mat-icon class="no-results-icon">search_off</mat-icon>
        <h3>No results found</h3>
        <p>Try adjusting your search criteria.</p>
        <button mat-button (click)="clearFilter()">Clear filter</button>
      </div>

      <!-- Instance Groups Table -->
      <div *ngIf="!loading && !error && filteredGroups.length > 0" class="table-container">
        <table mat-table [dataSource]="filteredGroups" class="instance-groups-table" matSort>
          
          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef class="checkbox-column">
              <mat-checkbox 
                (change)="$event ? masterToggle() : null"
                [checked]="selection.hasValue() && isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let group" class="checkbox-column">
              <mat-checkbox 
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(group) : null"
                [checked]="selection.isSelected(group)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="status-column">Status</th>
            <td mat-cell *matCellDef="let group" class="status-column">
              <div class="status-indicator">
                <mat-icon [class]="getStatusClass(group.status)" class="status-icon">
                  {{ getStatusIcon(group.status) }}
                </mat-icon>
              </div>
            </td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="name-column">Name</th>
            <td mat-cell *matCellDef="let group" class="name-column">
              <a href="#" class="group-name-link" (click)="viewGroup(group, $event)">{{ group.name }}</a>
            </td>
          </ng-container>

          <!-- Instances Column -->
          <ng-container matColumnDef="instances">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="instances-column">Instances</th>
            <td mat-cell *matCellDef="let group" class="instances-column">
              <span class="instance-count">{{ group.instanceCount || 0 }}</span>
            </td>
          </ng-container>

          <!-- Template Column -->
          <ng-container matColumnDef="template">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="template-column">Template</th>
            <td mat-cell *matCellDef="let group" class="template-column">
              <span class="template-name">{{ group.template || '-' }}</span>
            </td>
          </ng-container>

          <!-- Group Type Column -->
          <ng-container matColumnDef="groupType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="group-type-column">Group type</th>
            <td mat-cell *matCellDef="let group" class="group-type-column">
              <span class="group-type">{{ group.groupType }}</span>
            </td>
          </ng-container>

          <!-- Creation Time Column -->
          <ng-container matColumnDef="creationTime">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="creation-time-column">Creation time</th>
            <td mat-cell *matCellDef="let group" class="creation-time-column">
              <span class="creation-time">{{ formatDate(group.creationTimestamp) }}</span>
            </td>
          </ng-container>

          <!-- Recommendation Column -->
          <ng-container matColumnDef="recommendation">
            <th mat-header-cell *matHeaderCellDef class="recommendation-column">Recommendation</th>
            <td mat-cell *matCellDef="let group" class="recommendation-column">
              <span class="recommendation">{{ group.recommendation || '-' }}</span>
            </td>
          </ng-container>

          <!-- Autoscaling Column -->
          <ng-container matColumnDef="autoscaling">
            <th mat-header-cell *matHeaderCellDef class="autoscaling-column">Autoscaling</th>
            <td mat-cell *matCellDef="let group" class="autoscaling-column">
              <span class="autoscaling-status">{{ group.autoscaling || '-' }}</span>
            </td>
          </ng-container>

          <!-- Location Column -->
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef mat-sort-header class="location-column">Location</th>
            <td mat-cell *matCellDef="let group" class="location-column">
              <span class="location">{{ group.zone || group.region }}</span>
            </td>
          </ng-container>

          <!-- In Use By Column -->
          <ng-container matColumnDef="inUseBy">
            <th mat-header-cell *matHeaderCellDef class="in-use-by-column">In Use By</th>
            <td mat-cell *matCellDef="let group" class="in-use-by-column">
              <span class="in-use-by">{{ group.inUseBy || '-' }}</span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-column"></th>
            <td mat-cell *matCellDef="let group" class="actions-column">
              <button mat-icon-button [matMenuTriggerFor]="actionMenu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu">
                <button mat-menu-item (click)="viewGroup(group)">
                  <mat-icon>visibility</mat-icon>
                  <span>View details</span>
                </button>
                <button mat-menu-item (click)="editGroup(group)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="cloneGroup(group)">
                  <mat-icon>content_copy</mat-icon>
                  <span>Clone</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteGroup(group)" class="delete-action">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
              (click)="selectRow(row)" 
              [class.selected]="selection.isSelected(row)">
          </tr>
        </table>
      </div>

      <!-- Pagination -->
      <mat-paginator 
        *ngIf="!loading && !error && filteredGroups.length > 0"
        [pageSizeOptions]="[10, 25, 50, 100]"
        [pageSize]="25"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    .instance-groups-container {
      padding: 24px;
      background-color: #fafafa;
      min-height: 100vh;
    }

    .header-section {
      margin-bottom: 24px;
    }

    .breadcrumb {
      font-size: 14px;
      color: #5f6368;
      margin-bottom: 8px;
    }

    .breadcrumb-item {
      color: #5f6368;
    }

    .breadcrumb-item.current {
      color: #202124;
      font-weight: 500;
    }

    .breadcrumb-separator {
      margin: 0 8px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 400;
      color: #202124;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .create-button {
      background-color: #1a73e8;
      color: white;
      font-weight: 500;
    }

    .create-button mat-icon {
      margin-right: 8px;
    }

    .description {
      color: #5f6368;
      font-size: 14px;
      line-height: 1.5;
    }

    .learn-more-link {
      color: #1a73e8;
      text-decoration: none;
    }

    .learn-more-link:hover {
      text-decoration: underline;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .filter-field {
      flex: 1;
      max-width: 400px;
    }

    .filter-options-btn {
      color: #5f6368;
    }

    .view-options {
      display: flex;
      gap: 4px;
      margin-left: auto;
    }

    .view-btn {
      color: #5f6368;
    }

    .view-btn.active {
      color: #1a73e8;
      background-color: #e8f0fe;
    }

    .loading-container,
    .error-container,
    .empty-state,
    .no-results-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .loading-container p {
      margin-top: 16px;
      color: #5f6368;
    }

    .error-icon,
    .empty-icon,
    .no-results-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #9aa0a6;
      margin-bottom: 16px;
    }

    .error-container h3,
    .empty-state h3,
    .no-results-state h3 {
      margin: 0 0 8px 0;
      color: #202124;
    }

    .error-container p,
    .empty-state p,
    .no-results-state p {
      margin: 0 0 24px 0;
      color: #5f6368;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .instance-groups-table {
      width: 100%;
    }

    .mat-mdc-header-cell {
      background-color: #f8f9fa;
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e0e0e0;
    }

    .mat-mdc-cell {
      border-bottom: 1px solid #f0f0f0;
      color: #202124;
      font-size: 14px;
    }

    .mat-mdc-row:hover {
      background-color: #f8f9fa;
    }

    .mat-mdc-row.selected {
      background-color: #e8f0fe;
    }

    .checkbox-column {
      width: 48px;
      padding-left: 16px;
    }

    .status-column {
      width: 80px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-icon.healthy {
      color: #34a853;
    }

    .status-icon.warning {
      color: #fbbc04;
    }

    .status-icon.error {
      color: #ea4335;
    }

    .name-column {
      min-width: 200px;
    }

    .group-name-link {
      color: #1a73e8;
      text-decoration: none;
      font-weight: 500;
    }

    .group-name-link:hover {
      text-decoration: underline;
    }

    .instances-column {
      width: 100px;
      text-align: center;
    }

    .instance-count {
      font-weight: 500;
    }

    .template-column {
      min-width: 150px;
    }

    .group-type-column {
      width: 120px;
    }

    .creation-time-column {
      width: 180px;
    }

    .recommendation-column {
      width: 150px;
    }

    .autoscaling-column {
      width: 120px;
    }

    .location-column {
      width: 120px;
    }

    .in-use-by-column {
      width: 120px;
    }

    .actions-column {
      width: 48px;
      text-align: center;
    }

    .delete-action {
      color: #ea4335;
    }

    .delete-action mat-icon {
      color: #ea4335;
    }

    mat-paginator {
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
      .recommendation-column,
      .autoscaling-column,
      .in-use-by-column {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .instance-groups-container {
        padding: 16px;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
      
      .filter-section {
        flex-direction: column;
        align-items: stretch;
      }
      
      .view-options {
        margin-left: 0;
        justify-content: center;
      }
    }
  `]
})
export class InstanceGroupsComponent implements OnInit {
  instanceGroups: InstanceGroup[] = [];
  filteredGroups: InstanceGroup[] = [];
  loading = false;
  error: string | null = null;
  filterText = '';
  selectedGroups: InstanceGroup[] = [];
  selection = new SelectionModel<InstanceGroup>(true, []);

  displayedColumns: string[] = [
    'select',
    'status', 
    'name', 
    'instances', 
    'template', 
    'groupType', 
    'creationTime', 
    'recommendation', 
    'autoscaling', 
    'location', 
    'inUseBy', 
    'actions'
  ];

  constructor(
    private instanceGroupsService: InstanceGroupsService,
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadInstanceGroups();
  }

  loadInstanceGroups() {
    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      this.error = 'No project selected';
      return;
    }

    this.loading = true;
    this.error = null;

    this.instanceGroupsService.getInstanceGroups(currentProject.id).subscribe({
      next: (groups) => {
        this.instanceGroups = groups;
        this.filteredGroups = [...groups];
        this.loading = false;
        console.log('✅ Loaded instance groups:', groups);
      },
      error: (error) => {
        console.error('❌ Error loading instance groups:', error);
        this.error = 'Failed to load instance groups';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    if (!this.filterText.trim()) {
      this.filteredGroups = [...this.instanceGroups];
      return;
    }

    const filterValue = this.filterText.toLowerCase().trim();
    this.filteredGroups = this.instanceGroups.filter(group =>
      group.name.toLowerCase().includes(filterValue) ||
      group.groupType.toLowerCase().includes(filterValue) ||
      group.zone?.toLowerCase().includes(filterValue) ||
      group.region?.toLowerCase().includes(filterValue) ||
      group.template?.toLowerCase().includes(filterValue)
    );
  }

  clearFilter() {
    this.filterText = '';
    this.applyFilter();
  }

  refreshData() {
    this.loadInstanceGroups();
    this.snackBar.open('Instance groups refreshed', 'Close', { duration: 3000 });
  }

  createInstanceGroup() {
    this.router.navigate(['/instance-groups/create']);
  }

  viewGroup(group: InstanceGroup, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    console.log('👁️ Viewing instance group:', group.name);
    // Navigate to instance group details
    this.router.navigate(['/instance-groups', group.name]);
  }

  editGroup(group: InstanceGroup) {
    console.log('✏️ Editing instance group:', group.name);
    // Navigate to edit page
    this.router.navigate(['/instance-groups', group.name, 'edit']);
  }

  cloneGroup(group: InstanceGroup) {
    console.log('📋 Cloning instance group:', group.name);
    // Navigate to create page with clone data
    this.router.navigate(['/instance-groups/create'], { 
      queryParams: { clone: group.name } 
    });
  }

  deleteGroup(group: InstanceGroup) {
    const confirmDelete = confirm(`Are you sure you want to delete instance group "${group.name}"?`);
    if (!confirmDelete) return;

    console.log('🗑️ Deleting instance group:', group.name);
    
    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      this.snackBar.open('No project selected', 'Close', { duration: 3000 });
      return;
    }

    // Extract zone from the instance group
    const zone = group.zone || this.extractZoneFromSelfLink(group.selfLink);
    
    this.instanceGroupsService.deleteInstanceGroup(currentProject.id, zone, group.name).subscribe({
      next: () => {
        this.snackBar.open(`Instance group "${group.name}" deleted successfully`, 'Close', { 
          duration: 5000 
        });
        this.loadInstanceGroups();
      },
      error: (error) => {
        console.error('❌ Error deleting instance group:', error);
        this.snackBar.open(`Failed to delete instance group: ${error.message}`, 'Close', { 
          duration: 5000 
        });
      }
    });
  }

  private extractZoneFromSelfLink(selfLink: string): string {
    // Extract zone from selfLink like: https://www.googleapis.com/compute/v1/projects/demo-project/zones/us-central1-a/instanceGroups/instance-group-1
    const parts = selfLink.split('/');
    const zoneIndex = parts.findIndex(part => part === 'zones');
    return zoneIndex !== -1 && zoneIndex + 1 < parts.length ? parts[zoneIndex + 1] : '';
  }

  selectRow(group: InstanceGroup) {
    this.selection.toggle(group);
  }

  masterToggle() {
    this.isAllSelected() ? this.selection.clear() : this.filteredGroups.forEach(group => this.selection.select(group));
  }

  isAllSelected() {
    return this.selection.selected.length === this.filteredGroups.length;
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'healthy':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'radio_button_unchecked';
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'healthy':
        return 'healthy';
      case 'warning':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return '';
    }
  }

  formatDate(timestamp: string): string {
    if (!timestamp) return '-';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return timestamp;
    }
  }
} 