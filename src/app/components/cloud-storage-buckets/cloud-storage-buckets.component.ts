import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, NavigationEnd } from '@angular/router';
import { CloudStorageService, CloudStorageBucket } from '../../services/cloud-storage.service';
import { ProjectService } from '../../services/project.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-cloud-storage-buckets',
  template: `
    <div class="buckets-container">
      <div class="header">
        <div class="header-content">
          <h1>Cloud Storage</h1>
          <div class="header-actions">
            <button mat-icon-button [matMenuTriggerFor]="filterMenu" matTooltip="Filter buckets">
              <mat-icon>filter_list</mat-icon>
            </button>
            <mat-menu #filterMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>location_on</mat-icon>
                <span>Filter by location</span>
              </button>
              <button mat-menu-item>
                <mat-icon>storage</mat-icon>
                <span>Filter by storage class</span>
              </button>
            </mat-menu>
            
            <button mat-raised-button color="primary" (click)="createBucket()">
              <mat-icon>add</mat-icon>
              Create
            </button>
          </div>
        </div>
        
        <div class="breadcrumb">
          <span class="breadcrumb-item active">Buckets</span>
        </div>
      </div>

      <mat-card class="table-card">
        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading buckets...</p>
          </div>

          <div *ngIf="!isLoading" class="table-container">
            <table mat-table [dataSource]="buckets" class="mat-elevation-z1" matSort>
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let bucket">
                  <div class="bucket-name">
                    <mat-icon class="bucket-icon">folder</mat-icon>
                    <span class="name-text" (click)="viewBucketDetails(bucket)">{{bucket.name}}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Created Column -->
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.created}}</td>
              </ng-container>

              <!-- Location Type Column -->
              <ng-container matColumnDef="locationType">
                <th mat-header-cell *matHeaderCellDef>Location type</th>
                <td mat-cell *matCellDef="let bucket">{{getLocationType(bucket.location)}}</td>
              </ng-container>

              <!-- Location Column -->
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Location</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.location}}</td>
              </ng-container>

              <!-- Default Storage Class Column -->
              <ng-container matColumnDef="storageClass">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Default storage class</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.storageClass}}</td>
              </ng-container>

              <!-- Last Modified Column -->
              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Last modified</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.updated}}</td>
              </ng-container>

              <!-- Public Access Column -->
              <ng-container matColumnDef="publicAccess">
                <th mat-header-cell *matHeaderCellDef>Public access</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.publicAccess}}</td>
              </ng-container>

              <!-- Access Control Column -->
              <ng-container matColumnDef="accessControl">
                <th mat-header-cell *matHeaderCellDef>Access control</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.accessControl}}</td>
              </ng-container>

              <!-- Protection Column -->
              <ng-container matColumnDef="protection">
                <th mat-header-cell *matHeaderCellDef>Protection</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.protection}}</td>
              </ng-container>

              <!-- Hierarchical Namespace Column -->
              <ng-container matColumnDef="hierarchicalNamespace">
                <th mat-header-cell *matHeaderCellDef>Hierarchical namespace</th>
                <td mat-cell *matCellDef="let bucket">{{bucket.hierarchicalNamespace}}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let bucket">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewBucketDetails(bucket)">
                      <mat-icon>visibility</mat-icon>
                      <span>Browse</span>
                    </button>
                    <button mat-menu-item (click)="editBucket(bucket)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <mat-divider></mat-divider>
                    <button mat-menu-item (click)="deleteBucket(bucket)" class="delete-action">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                  [class.selected-row]="selectedBucket?.id === row.id"
                  (click)="selectBucket(row)"></tr>
            </table>

            <div *ngIf="buckets.length === 0" class="no-buckets">
              <div class="no-buckets-content">
                <mat-icon class="no-buckets-icon">folder_open</mat-icon>
                <h3>No buckets found</h3>
                <p>Create your first bucket to store files in Cloud Storage</p>
                <button mat-raised-button color="primary" (click)="createBucket()">
                  <mat-icon>add</mat-icon>
                  Create bucket
                </button>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .buckets-container {
      height: 100vh;
      overflow-y: auto;
      background: var(--background-color);
      color: var(--text-color);
    }

    .header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--surface-color);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .breadcrumb-item.active {
      color: var(--text-color);
      font-weight: 500;
    }

    .table-card {
      margin: 24px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      background: var(--surface-color);
      color: var(--text-color);
    }

    .mat-mdc-header-cell {
      color: var(--text-color);
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--divider-color);
      padding: 12px 16px;
    }

    .mat-mdc-cell {
      color: var(--text-color);
      border-bottom: 1px solid var(--divider-color);
      padding: 12px 16px;
      font-size: 14px;
    }

    .mat-mdc-row {
      transition: background-color 0.2s;
      cursor: pointer;
    }

    .mat-mdc-row:hover {
      background-color: var(--hover-color) !important;
    }

    .selected-row {
      background-color: var(--selected-color) !important;
    }

    .bucket-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bucket-icon {
      color: var(--primary-color);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .name-text {
      color: var(--primary-color);
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .name-text:hover {
      text-decoration: underline;
    }

    .mat-column-actions {
      width: 60px;
      text-align: center;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      gap: 16px;
    }

    .loading-container p {
      color: var(--text-secondary-color);
      margin: 0;
    }

    .no-buckets {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
    }

    .no-buckets-content {
      text-align: center;
      max-width: 400px;
    }

    .no-buckets-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-secondary-color);
      margin-bottom: 16px;
    }

    .no-buckets-content h3 {
      margin: 0 0 8px 0;
      color: var(--text-color);
      font-weight: 400;
    }

    .no-buckets-content p {
      margin: 0 0 24px 0;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    .delete-action {
      color: var(--error-color) !important;
    }

    .delete-action mat-icon {
      color: var(--error-color) !important;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background: var(--surface-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
      }

      .mat-mdc-table {
        background: var(--surface-color);
        color: var(--text-color);
      }

      .mat-mdc-header-cell {
        color: var(--text-color);
        border-bottom-color: var(--border-color);
      }

      .mat-mdc-cell {
        color: var(--text-color);
        border-bottom-color: var(--border-color);
      }

      .mat-mdc-raised-button.mat-primary {
        background-color: var(--primary-color);
        color: white;
      }

      .mat-mdc-raised-button.mat-primary:hover {
        background-color: var(--primary-hover-color);
      }

      .mat-mdc-icon-button {
        color: var(--text-secondary-color);
      }

      .mat-mdc-menu-panel {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
      }

      .mat-mdc-menu-item {
        color: var(--text-color);
      }

      .mat-mdc-menu-item:hover {
        background: var(--hover-color);
      }

      .mat-mdc-progress-spinner circle {
        stroke: var(--primary-color);
      }

      .mat-sort-header-arrow {
        color: var(--text-secondary-color);
      }
    }
  `]
})
export class CloudStorageBucketsComponent implements OnInit, OnDestroy {
  buckets: CloudStorageBucket[] = [];
  displayedColumns: string[] = [
    'name', 
    'created', 
    'locationType', 
    'location', 
    'storageClass', 
    'updated', 
    'publicAccess', 
    'accessControl', 
    'protection', 
    'hierarchicalNamespace',
    'actions'
  ];
  selectedBucket: CloudStorageBucket | null = null;
  isLoading = true;
  private routerSubscription!: Subscription;

  constructor(
    private cloudStorageService: CloudStorageService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadBuckets();
    
    // Listen for navigation events to refresh data
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEvent = event as NavigationEnd;
        if (navigationEvent.url === '/cloud-storage/buckets') {
          this.loadBuckets();
        }
      });

    // Listen for project changes
    this.projectService.currentProject$.subscribe(project => {
      if (project) {
        this.loadBuckets();
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadBuckets() {
    this.isLoading = true;
    const currentProject = this.projectService.getCurrentProject();
    
    this.cloudStorageService.getBuckets(currentProject?.id).subscribe({
      next: (buckets) => {
        this.buckets = buckets;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading buckets:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Error loading buckets', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  selectBucket(bucket: CloudStorageBucket) {
    this.selectedBucket = bucket;
  }

  getLocationType(location: string): string {
    // Determine location type based on location string
    if (location.includes('-')) {
      return 'Region';
    } else if (location.length <= 3) {
      return 'Multi-region';
    } else {
      return 'Region';
    }
  }

  createBucket() {
    // TODO: Implement create bucket dialog
    console.log('Create bucket clicked');
    this.snackBar.open('Create bucket functionality coming soon', 'Close', { duration: 3000 });
  }

  viewBucketDetails(bucket: CloudStorageBucket) {
    console.log('View bucket details:', bucket);
    this.router.navigate(['/cloud-storage/buckets', bucket.name]);
  }

  editBucket(bucket: CloudStorageBucket) {
    console.log('Edit bucket:', bucket);
    // TODO: Implement edit bucket functionality
    this.snackBar.open('Edit bucket functionality coming soon', 'Close', { duration: 3000 });
  }

  deleteBucket(bucket: CloudStorageBucket) {
    const confirmed = confirm(`Are you sure you want to delete bucket "${bucket.name}"?`);
    if (confirmed) {
      console.log('Delete bucket:', bucket);
      this.cloudStorageService.deleteBucket(bucket.name).subscribe({
        next: () => {
          this.snackBar.open('Bucket deleted successfully', 'Close', { duration: 3000 });
          this.loadBuckets(); // Reload the list
        },
        error: (error) => {
          console.error('Error deleting bucket:', error);
          this.snackBar.open('Error deleting bucket', 'Close', { duration: 3000 });
        }
      });
    }
  }
} 