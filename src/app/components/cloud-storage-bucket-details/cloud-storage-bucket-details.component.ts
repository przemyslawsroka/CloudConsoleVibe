import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CloudStorageService, CloudStorageBucket, CloudStorageObject } from '../../services/cloud-storage.service';
import { ProjectService } from '../../services/project.service';
import { Subscription } from 'rxjs';

interface FolderNode {
  name: string;
  path: string;
  expanded: boolean;
  children: FolderNode[];
  isFolder: boolean;
}

@Component({
  selector: 'app-cloud-storage-bucket-details',
  template: `
    <div class="bucket-details-container">
      <!-- Header -->
      <div class="header">
        <div class="header-top">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="bucket-info">
            <div class="bucket-name">
              <mat-icon class="bucket-icon">lock_open</mat-icon>
              <h1>{{bucketName}}</h1>
            </div>
            <div class="bucket-metadata" *ngIf="bucket">
              <div class="metadata-item">
                <span class="label">Location:</span>
                <span class="value">{{getLocationDescription(bucket.location)}}</span>
              </div>
              <div class="metadata-item">
                <span class="label">Storage class:</span>
                <span class="value">{{bucket.storageClass}}</span>
              </div>
              <div class="metadata-item">
                <span class="label">Public access:</span>
                <span class="value">{{bucket.publicAccess}}</span>
              </div>
              <div class="metadata-item">
                <span class="label">Protection:</span>
                <span class="value">{{bucket.protection}}</span>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <button mat-stroked-button>
              <mat-icon>cloud_upload</mat-icon>
              Go to path
            </button>
            <button mat-stroked-button>
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="bucket-tabs">
        <mat-tab label="Objects">
          <div class="objects-content">
            <!-- Breadcrumb and Actions -->
            <div class="objects-header">
              <div class="breadcrumb-section">
                <div class="breadcrumb">
                  <span class="breadcrumb-item">Buckets</span>
                  <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
                  <span class="breadcrumb-item">{{bucketName}}</span>
                  <mat-icon class="breadcrumb-copy" [matTooltip]="'Copy bucket name'">content_copy</mat-icon>
                </div>
                <div class="object-actions">
                  <button mat-stroked-button color="primary">
                    <mat-icon>create_new_folder</mat-icon>
                    Create folder
                  </button>
                  <button mat-stroked-button [matMenuTriggerFor]="uploadMenu">
                    <mat-icon>cloud_upload</mat-icon>
                    Upload
                    <mat-icon>arrow_drop_down</mat-icon>
                  </button>
                  <mat-menu #uploadMenu="matMenu">
                    <button mat-menu-item>
                      <mat-icon>insert_drive_file</mat-icon>
                      <span>Files</span>
                    </button>
                    <button mat-menu-item>
                      <mat-icon>folder</mat-icon>
                      <span>Folder</span>
                    </button>
                  </mat-menu>
                  <button mat-stroked-button [matMenuTriggerFor]="transferMenu">
                    <mat-icon>swap_horiz</mat-icon>
                    Transfer data
                    <mat-icon>arrow_drop_down</mat-icon>
                  </button>
                  <mat-menu #transferMenu="matMenu">
                    <button mat-menu-item>
                      <mat-icon>cloud_download</mat-icon>
                      <span>Transfer data</span>
                    </button>
                  </mat-menu>
                  <button mat-stroked-button [matMenuTriggerFor]="servicesMenu">
                    <mat-icon>more_horiz</mat-icon>
                    Other services
                    <mat-icon>arrow_drop_down</mat-icon>
                  </button>
                  <mat-menu #servicesMenu="matMenu">
                    <button mat-menu-item>
                      <mat-icon>analytics</mat-icon>
                      <span>BigQuery</span>
                    </button>
                    <button mat-menu-item>
                      <mat-icon>functions</mat-icon>
                      <span>Cloud Functions</span>
                    </button>
                  </mat-menu>
                  <button mat-icon-button [matTooltip]="'Learn'">
                    <mat-icon>help_outline</mat-icon>
                  </button>
                </div>
              </div>
              
              <!-- Filter Section -->
              <div class="filter-section">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Filter by name prefix only</mat-label>
                  <input matInput [(ngModel)]="filterPrefix" (ngModelChange)="applyFilter()">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <button mat-stroked-button [matMenuTriggerFor]="filterMenu">
                  <mat-icon>filter_list</mat-icon>
                  Filter
                </button>
                <mat-menu #filterMenu="matMenu">
                  <button mat-menu-item>
                    <span>Filter objects and folders</span>
                  </button>
                </mat-menu>
                <div class="view-options">
                  <span>Show:</span>
                  <mat-slide-toggle [(ngModel)]="showLiveObjectsOnly">Live objects only</mat-slide-toggle>
                </div>
              </div>
            </div>

            <!-- Main Content Area -->
            <div class="objects-main">
              <!-- Folder Browser Sidebar -->
              <div class="folder-browser">
                <div class="folder-header">
                  <span>Folder browser</span>
                  <button mat-icon-button class="collapse-btn">
                    <mat-icon>keyboard_arrow_left</mat-icon>
                  </button>
                </div>
                <div class="folder-tree">
                  <div class="folder-node root-folder">
                    <div class="folder-content" (click)="selectFolder('')">
                      <mat-icon class="folder-icon">lock_open</mat-icon>
                      <span class="folder-name">{{bucketName}}</span>
                    </div>
                    <div class="folder-children" *ngIf="folderStructure.length > 0">
                      <div *ngFor="let folder of folderStructure" class="folder-node">
                        <div class="folder-content" (click)="toggleFolder(folder)">
                          <mat-icon class="expand-icon" [class.expanded]="folder.expanded">
                            {{folder.expanded ? 'expand_more' : 'chevron_right'}}
                          </mat-icon>
                          <mat-icon class="folder-icon">folder</mat-icon>
                          <span class="folder-name">{{folder.name}}</span>
                        </div>
                        <div class="folder-children" *ngIf="folder.expanded && folder.children.length > 0">
                          <div *ngFor="let child of folder.children" class="folder-node nested">
                            <div class="folder-content" (click)="selectFolder(child.path)">
                              <mat-icon class="folder-icon nested-icon">folder</mat-icon>
                              <span class="folder-name">{{child.name}}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Objects Table -->
              <div class="objects-table-container">
                <div *ngIf="isLoading" class="loading-container">
                  <mat-spinner diameter="40"></mat-spinner>
                  <p>Loading objects...</p>
                </div>

                <table *ngIf="!isLoading" mat-table [dataSource]="filteredObjects" class="objects-table">
                  <!-- Checkbox Column -->
                  <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                      <mat-checkbox></mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let object">
                      <mat-checkbox></mat-checkbox>
                    </td>
                  </ng-container>

                  <!-- Name Column -->
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                    <td mat-cell *matCellDef="let object">
                      <div class="object-name">
                        <mat-icon class="object-icon">{{getObjectIcon(object)}}</mat-icon>
                        <span class="name-text">{{getObjectDisplayName(object.name)}}</span>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Size Column -->
                  <ng-container matColumnDef="size">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Size</th>
                    <td mat-cell *matCellDef="let object">{{formatSize(object.size)}}</td>
                  </ng-container>

                  <!-- Type Column -->
                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let object">{{getObjectType(object)}}</td>
                  </ng-container>

                  <!-- Created Column -->
                  <ng-container matColumnDef="created">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
                    <td mat-cell *matCellDef="let object">{{formatDate(object.timeCreated)}}</td>
                  </ng-container>

                  <!-- Storage Class Column -->
                  <ng-container matColumnDef="storageClass">
                    <th mat-header-cell *matHeaderCellDef>Storage class</th>
                    <td mat-cell *matCellDef="let object">{{object.storageClass}}</td>
                  </ng-container>

                  <!-- Last Modified Column -->
                  <ng-container matColumnDef="lastModified">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Last modified</th>
                    <td mat-cell *matCellDef="let object">{{formatDate(object.updated)}}</td>
                  </ng-container>

                  <!-- Public Access Column -->
                  <ng-container matColumnDef="publicAccess">
                    <th mat-header-cell *matHeaderCellDef>Public access</th>
                    <td mat-cell *matCellDef="let object">—</td>
                  </ng-container>

                  <!-- Version History Column -->
                  <ng-container matColumnDef="versionHistory">
                    <th mat-header-cell *matHeaderCellDef>Version history</th>
                    <td mat-cell *matCellDef="let object">—</td>
                  </ng-container>

                  <!-- Encryption Column -->
                  <ng-container matColumnDef="encryption">
                    <th mat-header-cell *matHeaderCellDef>Encryption</th>
                    <td mat-cell *matCellDef="let object">—</td>
                  </ng-container>

                  <!-- Object Retention Column -->
                  <ng-container matColumnDef="objectRetention">
                    <th mat-header-cell *matHeaderCellDef>Object retention retain until time</th>
                    <td mat-cell *matCellDef="let object">—</td>
                  </ng-container>

                  <!-- Retention Expiry Column -->
                  <ng-container matColumnDef="retentionExpiry">
                    <th mat-header-cell *matHeaderCellDef>Retention expiry</th>
                    <td mat-cell *matCellDef="let object">—</td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="selectObject(row)"></tr>
                </table>

                <div *ngIf="!isLoading && filteredObjects.length === 0" class="no-objects">
                  <div class="no-objects-content">
                    <mat-icon class="no-objects-icon">folder_open</mat-icon>
                    <h3>No objects found</h3>
                    <p>This bucket is empty or no objects match your filter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
        
        <mat-tab label="Configuration"></mat-tab>
        <mat-tab label="Permissions"></mat-tab>
        <mat-tab label="Protection"></mat-tab>
        <mat-tab label="Lifecycle"></mat-tab>
        <mat-tab label="Observability" class="new-tab">
          <ng-template mat-tab-label>
            Observability <span class="new-badge">New</span>
          </ng-template>
        </mat-tab>
        <mat-tab label="Inventory Reports"></mat-tab>
        <mat-tab label="Operations"></mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .bucket-details-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--background-color);
      color: var(--text-color);
    }

    .header {
      background: var(--surface-color);
      border-bottom: 1px solid var(--divider-color);
      padding: 16px 24px;
    }

    .header-top {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .back-button {
      margin-top: 8px;
      color: var(--text-secondary-color);
    }

    .bucket-info {
      flex: 1;
    }

    .bucket-name {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .bucket-icon {
      color: var(--text-secondary-color);
      font-size: 20px;
    }

    .bucket-name h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: var(--text-color);
    }

    .bucket-metadata {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }

    .metadata-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .metadata-item .label {
      color: var(--text-secondary-color);
    }

    .metadata-item .value {
      color: var(--text-color);
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .bucket-tabs {
      flex: 1;
      overflow: hidden;
    }

    .bucket-tabs ::ng-deep .mat-mdc-tab-group {
      height: 100%;
    }

    .bucket-tabs ::ng-deep .mat-mdc-tab-body-wrapper {
      height: calc(100% - 48px);
    }

    .bucket-tabs ::ng-deep .mat-mdc-tab-body-content {
      height: 100%;
      overflow: hidden;
    }

    .new-badge {
      background: var(--primary-color);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 8px;
      margin-left: 8px;
    }

    .objects-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .objects-header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--surface-color);
    }

    .breadcrumb-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .breadcrumb-item {
      color: var(--text-color);
    }

    .breadcrumb-separator {
      color: var(--text-secondary-color);
      font-size: 16px;
    }

    .breadcrumb-copy {
      color: var(--text-secondary-color);
      font-size: 16px;
      cursor: pointer;
      margin-left: 8px;
    }

    .object-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .filter-field {
      width: 300px;
    }

    .view-options {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .objects-main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .folder-browser {
      width: 300px;
      border-right: 1px solid var(--divider-color);
      background: var(--surface-color);
      display: flex;
      flex-direction: column;
    }

    .folder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      font-weight: 500;
      font-size: 14px;
    }

    .collapse-btn {
      color: var(--text-secondary-color);
    }

    .folder-tree {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .folder-node {
      margin-bottom: 2px;
    }

    .folder-content {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .folder-content:hover {
      background: var(--hover-color);
    }

    .folder-icon {
      font-size: 16px;
      color: var(--text-secondary-color);
    }

    .expand-icon {
      font-size: 16px;
      color: var(--text-secondary-color);
      transition: transform 0.2s;
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .nested-icon {
      margin-left: 16px;
    }

    .folder-children {
      margin-left: 16px;
    }

    .folder-node.nested .folder-content {
      padding-left: 24px;
    }

    .objects-table-container {
      flex: 1;
      overflow: auto;
      background: var(--surface-color);
    }

    .objects-table {
      width: 100%;
    }

    .mat-mdc-header-cell {
      color: var(--text-color);
      font-weight: 500;
      font-size: 12px;
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
      background-color: var(--hover-color);
    }

    .object-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .object-icon {
      font-size: 16px;
      color: var(--text-secondary-color);
    }

    .name-text {
      color: var(--primary-color);
    }

    .mat-column-select {
      width: 40px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 20px;
      gap: 16px;
    }

    .no-objects {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 60px 20px;
    }

    .no-objects-content {
      text-align: center;
      max-width: 400px;
    }

    .no-objects-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-secondary-color);
      margin-bottom: 16px;
    }

    .no-objects-content h3 {
      margin: 0 0 8px 0;
      color: var(--text-color);
      font-weight: 400;
    }

    .no-objects-content p {
      margin: 0;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    /* Dark theme adjustments */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-tab-group {
        background: var(--surface-color);
      }

      .mat-mdc-tab-header {
        border-bottom: 1px solid var(--border-color);
      }

      .mat-mdc-tab .mdc-tab__text-label {
        color: var(--text-secondary-color);
      }

      .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
        color: var(--primary-color);
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--input-background-color);
        }
      }

      .mat-mdc-outlined-form-field {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--border-color);
        }
      }

      .mat-mdc-stroked-button {
        border-color: var(--border-color);
        color: var(--text-color);
      }

      .mat-mdc-stroked-button:hover {
        background: var(--hover-color);
      }

      .mat-mdc-menu-panel {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
      }

      .mat-mdc-menu-item {
        color: var(--text-color);
      }

      .mat-mdc-progress-spinner circle {
        stroke: var(--primary-color);
      }

      .mat-mdc-slide-toggle.mat-checked .mdc-switch__track {
        background-color: var(--primary-color);
      }

      .mat-mdc-checkbox.mat-checked .mdc-checkbox__background {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }
    }
  `]
})
export class CloudStorageBucketDetailsComponent implements OnInit, OnDestroy {
  bucketName: string = '';
  bucket: CloudStorageBucket | null = null;
  objects: CloudStorageObject[] = [];
  filteredObjects: CloudStorageObject[] = [];
  folderStructure: FolderNode[] = [];
  selectedTabIndex = 0;
  isLoading = true;
  filterPrefix = '';
  showLiveObjectsOnly = true;
  currentFolder = '';

  displayedColumns: string[] = [
    'select',
    'name',
    'size',
    'type',
    'created',
    'storageClass',
    'lastModified',
    'publicAccess',
    'versionHistory',
    'encryption',
    'objectRetention',
    'retentionExpiry'
  ];

  private routeSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cloudStorageService: CloudStorageService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(params => {
      this.bucketName = params['bucketName'];
      if (this.bucketName) {
        this.loadBucketDetails();
        this.loadBucketObjects();
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadBucketDetails() {
    const currentProject = this.projectService.getCurrentProject();
    this.cloudStorageService.getBuckets(currentProject?.id).subscribe({
      next: (buckets) => {
        this.bucket = buckets.find(b => b.name === this.bucketName) || null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading bucket details:', error);
      }
    });
  }

  loadBucketObjects() {
    this.isLoading = true;
    this.cloudStorageService.getBucketObjects(this.bucketName, this.currentFolder).subscribe({
      next: (objects) => {
        this.objects = objects;
        this.buildFolderStructure(objects);
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading bucket objects:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  buildFolderStructure(objects: CloudStorageObject[]) {
    const folders = new Map<string, FolderNode>();
    
    // Add some mock folders for demo
    const mockFolders = ['containers/', 'images/'];
    mockFolders.forEach(folderPath => {
      const folderName = folderPath.replace('/', '');
      folders.set(folderPath, {
        name: folderName,
        path: folderPath,
        expanded: false,
        children: [],
        isFolder: true
      });
    });

    this.folderStructure = Array.from(folders.values());
  }

  toggleFolder(folder: FolderNode) {
    folder.expanded = !folder.expanded;
    this.cdr.detectChanges();
  }

  selectFolder(folderPath: string) {
    this.currentFolder = folderPath;
    this.loadBucketObjects();
  }

  applyFilter() {
    if (this.filterPrefix) {
      this.filteredObjects = this.objects.filter(obj => 
        obj.name.toLowerCase().includes(this.filterPrefix.toLowerCase())
      );
    } else {
      this.filteredObjects = [...this.objects];
    }
  }

  selectObject(object: CloudStorageObject) {
    console.log('Selected object:', object);
  }

  getLocationDescription(location: string): string {
    if (location === 'US') {
      return 'us (multiple regions in United States)';
    } else if (location.includes('-')) {
      return location;
    }
    return location;
  }

  getObjectIcon(object: CloudStorageObject): string {
    if (object.name.endsWith('/')) {
      return 'folder';
    }
    
    const ext = object.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'pdf':
        return 'picture_as_pdf';
      case 'txt':
        return 'description';
      case 'zip':
      case 'tar':
      case 'gz':
        return 'archive';
      default:
        return 'insert_drive_file';
    }
  }

  getObjectDisplayName(name: string): string {
    return name.split('/').pop() || name;
  }

  getObjectType(object: CloudStorageObject): string {
    if (object.name.endsWith('/')) {
      return 'Folder';
    }
    return object.contentType || 'File';
  }

  formatSize(sizeBytes: string): string {
    if (!sizeBytes || sizeBytes === '0') return '—';
    
    const bytes = parseInt(sizeBytes);
    if (bytes === 0) return '—';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }

  goBack() {
    this.router.navigate(['/cloud-storage/buckets']);
  }
} 