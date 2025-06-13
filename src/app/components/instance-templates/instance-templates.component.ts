import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InstanceTemplatesService, InstanceTemplate } from '../../services/instance-templates.service';

@Component({
  selector: 'app-instance-templates',
  template: `
    <div class="instance-templates-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <h1>Instance templates</h1>
            <p class="subtitle">
              Instance templates are collections of VM instances that use load balancing and 
              automated services, like autoscaling and autohealing. 
              <a href="https://cloud.google.com/compute/docs/instance-templates" target="_blank" class="learn-more">
                Learn more
              </a>
            </p>
          </div>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="createInstanceTemplate()">
              <mat-icon>add</mat-icon>
              Create instance template
            </button>
            <button mat-icon-button (click)="refreshTemplates()" [disabled]="loading">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button>
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="filter-section">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filter</mat-label>
          <input matInput 
                 placeholder="Enter property name or value" 
                 [(ngModel)]="filterValue"
                 (input)="applyFilter()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-icon class="info-icon" matTooltip="Filter by template name, description, or machine type">
          info_outline
        </mat-icon>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading instance templates...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Failed to load instance templates</h3>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="refreshTemplates()">
          <mat-icon>refresh</mat-icon>
          Retry
        </button>
      </div>

      <!-- Templates Table -->
      <div *ngIf="!loading && !error" class="table-container">
        <table mat-table [dataSource]="filteredTemplates" class="templates-table" matSort>
          
          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox (change)="$event ? masterToggle() : null"
                          [checked]="selection.size > 0 && isAllSelected()"
                          [indeterminate]="selection.size > 0 && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let template">
              <mat-checkbox (click)="$event.stopPropagation()"
                          (change)="$event ? selection.add(template) : selection.delete(template)"
                          [checked]="selection.has(template)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let template">
              <mat-icon class="status-icon ready">check_circle</mat-icon>
            </td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
            <td mat-cell *matCellDef="let template">
              <a class="template-link" (click)="viewTemplate(template)">{{ template.name }}</a>
            </td>
          </ng-container>

          <!-- Instances Column -->
          <ng-container matColumnDef="instances">
            <th mat-header-cell *matHeaderCellDef>Instances</th>
            <td mat-cell *matCellDef="let template">0</td>
          </ng-container>

          <!-- Template Column -->
          <ng-container matColumnDef="template">
            <th mat-header-cell *matHeaderCellDef>Template</th>
            <td mat-cell *matCellDef="let template">-</td>
          </ng-container>

          <!-- Group Type Column -->
          <ng-container matColumnDef="groupType">
            <th mat-header-cell *matHeaderCellDef>Group type</th>
            <td mat-cell *matCellDef="let template">Unmanaged</td>
          </ng-container>

          <!-- Creation Time Column -->
          <ng-container matColumnDef="creationTime">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Creation time</th>
            <td mat-cell *matCellDef="let template">
              {{ formatDate(template.creationTimestamp) }}
            </td>
          </ng-container>

          <!-- Recommendation Column -->
          <ng-container matColumnDef="recommendation">
            <th mat-header-cell *matHeaderCellDef>Recommendation</th>
            <td mat-cell *matCellDef="let template">-</td>
          </ng-container>

          <!-- Autoscaling Column -->
          <ng-container matColumnDef="autoscaling">
            <th mat-header-cell *matHeaderCellDef>Autoscaling</th>
            <td mat-cell *matCellDef="let template">-</td>
          </ng-container>

          <!-- Location Column -->
          <ng-container matColumnDef="location">
            <th mat-header-cell *matHeaderCellDef>Location</th>
            <td mat-cell *matCellDef="let template">
              <span class="location-chip">us-central1-a</span>
            </td>
          </ng-container>

          <!-- In Use By Column -->
          <ng-container matColumnDef="inUseBy">
            <th mat-header-cell *matHeaderCellDef>In Use By</th>
            <td mat-cell *matCellDef="let template">
              <span class="usage-chip">bs</span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let template">
              <button mat-icon-button [matMenuTriggerFor]="actionMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu">
                <button mat-menu-item (click)="viewTemplate(template)">
                  <mat-icon>visibility</mat-icon>
                  <span>View details</span>
                </button>
                <button mat-menu-item (click)="editTemplate(template)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="cloneTemplate(template)">
                  <mat-icon>content_copy</mat-icon>
                  <span>Clone</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteTemplate(template)" class="delete-action">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let template; columns: displayedColumns;" 
              (click)="viewTemplate(template)" 
              class="template-row"></tr>
        </table>

        <!-- No Data State -->
        <div *ngIf="filteredTemplates.length === 0" class="no-data-container">
          <mat-icon class="no-data-icon">description</mat-icon>
          <h3>No instance templates found</h3>
          <p *ngIf="filterValue">Try adjusting your filter criteria.</p>
          <p *ngIf="!filterValue">Create your first instance template to get started.</p>
          <button mat-raised-button color="primary" (click)="createInstanceTemplate()">
            <mat-icon>add</mat-icon>
            Create instance template
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .instance-templates-container {
      min-height: 100vh;
      background-color: #f8f9fa;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }

    /* Header Styles */
    .header {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 24px;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .title-section h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 400;
      color: #202124;
    }

    .subtitle {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
      line-height: 1.5;
      max-width: 600px;
    }

    .learn-more {
      color: #1a73e8;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    /* Filter Section */
    .filter-section {
      background: white;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-field {
      width: 300px;
    }

    .info-icon {
      color: #5f6368;
      font-size: 18px;
      cursor: help;
    }

    /* Table Container */
    .table-container {
      background: white;
      margin: 0;
    }

    .templates-table {
      width: 100%;
    }

    .template-row {
      cursor: pointer;
    }

    .template-row:hover {
      background-color: #f8f9fa;
    }

    .template-link {
      color: #1a73e8;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .template-link:hover {
      text-decoration: underline;
    }

    .status-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .status-icon.ready {
      color: #34a853;
    }

    .location-chip {
      background: #e8f0fe;
      color: #1a73e8;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .usage-chip {
      background: #f3e8ff;
      color: #7c3aed;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .delete-action {
      color: #ea4335;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      text-align: center;
      background: white;
    }

    .loading-container p {
      margin-top: 16px;
      color: #5f6368;
      font-size: 16px;
    }

    /* Error State */
    .error-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      text-align: center;
      background: white;
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
      font-weight: 500;
    }

    .error-container p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
    }

    /* No Data State */
    .no-data-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      text-align: center;
    }

    .no-data-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #9aa0a6;
      margin-bottom: 16px;
    }

    .no-data-container h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 500;
    }

    .no-data-container p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .header-actions {
        justify-content: flex-end;
      }

      .filter-section {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .filter-field {
        width: 100%;
      }
    }
  `]
})
export class InstanceTemplatesComponent implements OnInit, OnDestroy {
  templates: InstanceTemplate[] = [];
  filteredTemplates: InstanceTemplate[] = [];
  loading = false;
  error: string | null = null;
  filterValue = '';
  
  displayedColumns: string[] = [
    'select', 'status', 'name', 'instances', 'template', 'groupType', 
    'creationTime', 'recommendation', 'autoscaling', 'location', 'inUseBy', 'actions'
  ];

  selection = new Set<InstanceTemplate>();
  private destroy$ = new Subject<void>();

  constructor(
    private instanceTemplatesService: InstanceTemplatesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadTemplates();
    
    // Subscribe to service observables
    this.instanceTemplatesService.templates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(templates => {
        this.templates = templates;
        this.applyFilter();
      });

    this.instanceTemplatesService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.instanceTemplatesService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates() {
    this.instanceTemplatesService.loadTemplates().subscribe();
  }

  refreshTemplates() {
    this.loadTemplates();
  }

  applyFilter() {
    if (!this.filterValue.trim()) {
      this.filteredTemplates = [...this.templates];
    } else {
      this.filteredTemplates = this.instanceTemplatesService.searchTemplates(this.filterValue);
    }
  }

  createInstanceTemplate() {
    // TODO: Implement create instance template dialog
    this.snackBar.open('Create instance template functionality coming soon', 'Close', {
      duration: 3000
    });
  }

  viewTemplate(template: InstanceTemplate) {
    // TODO: Navigate to template details page
    console.log('View template:', template);
    this.snackBar.open(`Viewing template: ${template.name}`, 'Close', {
      duration: 3000
    });
  }

  editTemplate(template: InstanceTemplate) {
    // TODO: Implement edit template functionality
    console.log('Edit template:', template);
    this.snackBar.open(`Edit template: ${template.name}`, 'Close', {
      duration: 3000
    });
  }

  cloneTemplate(template: InstanceTemplate) {
    // TODO: Implement clone template functionality
    console.log('Clone template:', template);
    this.snackBar.open(`Clone template: ${template.name}`, 'Close', {
      duration: 3000
    });
  }

  deleteTemplate(template: InstanceTemplate) {
    const confirmDelete = confirm(`Are you sure you want to delete the instance template "${template.name}"?`);
    if (confirmDelete) {
      this.instanceTemplatesService.deleteInstanceTemplate(template.name).subscribe({
        next: () => {
          this.snackBar.open(`Instance template "${template.name}" deleted successfully`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error deleting template:', error);
          this.snackBar.open(`Failed to delete template: ${error.message}`, 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  // Selection methods
  isAllSelected(): boolean {
    return this.selection.size === this.filteredTemplates.length;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredTemplates.forEach(template => this.selection.add(template));
    }
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }
} 