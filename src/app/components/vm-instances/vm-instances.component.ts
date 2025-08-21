import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { ComputeEngineService, VmInstance, Zone } from '../../services/compute-engine.service';
import { ProjectService } from '../../services/project.service';
import { Router } from '@angular/router';
import { MultiCloudInstancesService } from '../../services/multi-cloud-instances.service';
import { MultiCloudVmInstance } from '../../interfaces/multi-cloud.interface';

interface TableVmInstance extends MultiCloudVmInstance {
  displayZone: string;
  displayMachineType: string;
  displayNetwork: string;
  displayStatus: string;
  formattedCreationDate: string;
  bootDiskSize: string;
  hasExternalIp: boolean;
  preemptible: boolean;
  providerIcon: string;
}

@Component({
  selector: 'app-vm-instances',
  template: `
    <div class="vm-instances-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>VM instances</h1>
          <p class="subtitle">Create and manage virtual machine instances</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createInstance()">
            <mat-icon>add</mat-icon>
            Create Instance
          </button>
          <button mat-raised-button color="accent" (click)="configureAws()">
            <mat-icon>settings</mat-icon>
            Configure AWS
          </button>
          <button mat-icon-button [matMenuTriggerFor]="moreMenu">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #moreMenu="matMenu">
            <button mat-menu-item (click)="refreshInstances()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
            <button mat-menu-item>
              <mat-icon>file_download</mat-icon>
              Export
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="filters-row">
          <!-- Search -->
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search instances</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Search by name, labels, or description">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <!-- Zone Filter -->
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Zone</mat-label>
            <mat-select [formControl]="zoneFilterControl">
              <mat-option value="all">All zones</mat-option>
              <mat-option *ngFor="let zone of availableZones" [value]="zone.name">
                {{ zone.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Status Filter -->
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Status</mat-label>
            <mat-select [formControl]="statusFilterControl">
              <mat-option value="all">All statuses</mat-option>
              <mat-option value="RUNNING">Running</mat-option>
              <mat-option value="STOPPED">Stopped</mat-option>
              <mat-option value="PROVISIONING">Provisioning</mat-option>
              <mat-option value="STAGING">Staging</mat-option>
              <mat-option value="STOPPING">Stopping</mat-option>
              <mat-option value="SUSPENDED">Suspended</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Clear Filters -->
          <button mat-button (click)="clearFilters()" *ngIf="hasActiveFilters()">
            <mat-icon>clear</mat-icon>
            Clear filters
          </button>
        </div>

        <!-- Selected Actions -->
        <div class="selected-actions" *ngIf="selection.hasValue()">
          <span class="selected-count">{{ selection.selected.length }} selected</span>
          <button mat-button (click)="startSelectedInstances()" [disabled]="!canStartSelected()">
            <mat-icon>play_arrow</mat-icon>
            Start
          </button>
          <button mat-button (click)="stopSelectedInstances()" [disabled]="!canStopSelected()">
            <mat-icon>stop</mat-icon>
            Stop
          </button>
          <button mat-button (click)="restartSelectedInstances()" [disabled]="!canRestartSelected()">
            <mat-icon>refresh</mat-icon>
            Restart
          </button>
          <button mat-button color="warn" (click)="deleteSelectedInstances()" [disabled]="!canDeleteSelected()">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading VM instances...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <mat-icon color="warn">error</mat-icon>
        <p>{{ error }}</p>
        <button mat-button color="primary" (click)="refreshInstances()">Try Again</button>
      </div>

      <!-- Data Table -->
      <div *ngIf="!loading && !error" class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="instances-table">
          <!-- Selection Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox
                (change)="$event ? masterToggle() : null"
                [checked]="selection.hasValue() && isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let instance">
              <mat-checkbox
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(instance) : null"
                [checked]="selection.isSelected(instance)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
            <td mat-cell *matCellDef="let instance">
              <div class="name-cell">
                <span class="instance-name" (click)="viewInstanceDetails(instance)">{{ instance.name }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Provider Column -->
          <ng-container matColumnDef="provider">
            <th mat-header-cell *matHeaderCellDef>Provider</th>
            <td mat-cell *matCellDef="let instance">
              <div class="provider-cell">
                <mat-icon [style.color]="getProviderColor(instance.provider)">{{ instance.providerIcon }}</mat-icon>
                <span>{{ instance.provider.toUpperCase() }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Zone Column -->
          <ng-container matColumnDef="zone">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Zone</th>
            <td mat-cell *matCellDef="let instance">{{ instance.displayZone }}</td>
          </ng-container>

          <!-- Machine Type Column -->
          <ng-container matColumnDef="machineType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Machine type</th>
            <td mat-cell *matCellDef="let instance">{{ instance.displayMachineType }}</td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let instance">
              <div class="status-cell">
                <div class="status-indicator" [style.background-color]="instance.statusColor"></div>
                <span>{{ instance.displayStatus }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Internal IP Column -->
          <ng-container matColumnDef="internalIp">
            <th mat-header-cell *matHeaderCellDef>Internal IP</th>
            <td mat-cell *matCellDef="let instance">
              <span class="ip-address">{{ instance.internalIp }}</span>
            </td>
          </ng-container>

          <!-- External IP Column -->
          <ng-container matColumnDef="externalIp">
            <th mat-header-cell *matHeaderCellDef>External IP</th>
            <td mat-cell *matCellDef="let instance">
              <span class="ip-address" *ngIf="instance.externalIp">{{ instance.externalIp }}</span>
              <span class="no-ip" *ngIf="!instance.externalIp">None</span>
            </td>
          </ng-container>

          <!-- Network Column -->
          <ng-container matColumnDef="network">
            <th mat-header-cell *matHeaderCellDef>Network</th>
            <td mat-cell *matCellDef="let instance">{{ instance.displayNetwork }}</td>
          </ng-container>

          <!-- Boot Disk Column -->
          <ng-container matColumnDef="bootDisk">
            <th mat-header-cell *matHeaderCellDef>Boot disk</th>
            <td mat-cell *matCellDef="let instance">
              <div class="boot-disk-cell">
                <span>{{ instance.bootDiskSize }} GB</span>
                <mat-icon class="disk-icon" *ngIf="hasBootDisk(instance)">storage</mat-icon>
              </div>
            </td>
          </ng-container>

          <!-- Preemptible Column -->
          <ng-container matColumnDef="preemptible">
            <th mat-header-cell *matHeaderCellDef>Preemptible</th>
            <td mat-cell *matCellDef="let instance">
              <mat-icon *ngIf="instance.preemptible" class="preemptible-icon">check</mat-icon>
              <span *ngIf="!instance.preemptible">—</span>
            </td>
          </ng-container>

          <!-- Created Column -->
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
            <td mat-cell *matCellDef="let instance">{{ instance.formattedCreationDate }}</td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let instance">
              <button mat-icon-button [matMenuTriggerFor]="instanceMenu" 
                      [matMenuTriggerData]="{instance: instance}"
                      (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
              class="instance-row"
              [class.selected]="selection.isSelected(row)"
              (click)="selection.toggle(row)"></tr>
        </table>

        <!-- Instance Action Menu -->
        <mat-menu #instanceMenu="matMenu">
          <ng-template matMenuContent let-instance="instance">
            <button mat-menu-item (click)="viewInstanceDetails(instance)">
              <mat-icon>visibility</mat-icon>
              View details
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="startInstance(instance)" 
                    [disabled]="instance.status === 'RUNNING' || instance.status === 'PROVISIONING'">
              <mat-icon>play_arrow</mat-icon>
              Start
            </button>
            <button mat-menu-item (click)="stopInstance(instance)" 
                    [disabled]="instance.status === 'STOPPED' || instance.status === 'STOPPING'">
              <mat-icon>stop</mat-icon>
              Stop
            </button>
            <button mat-menu-item (click)="restartInstance(instance)" 
                    [disabled]="instance.status !== 'RUNNING'">
              <mat-icon>refresh</mat-icon>
              Restart
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="sshToInstance(instance)" 
                    [disabled]="instance.status !== 'RUNNING'">
              <mat-icon>terminal</mat-icon>
              SSH
            </button>
            <button mat-menu-item (click)="viewSerialConsole(instance)">
              <mat-icon>computer</mat-icon>
              Serial console
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="editInstance(instance)">
              <mat-icon>edit</mat-icon>
              Edit
            </button>
            <button mat-menu-item (click)="cloneInstance(instance)">
              <mat-icon>content_copy</mat-icon>
              Clone
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item color="warn" (click)="deleteInstance(instance)">
              <mat-icon color="warn">delete</mat-icon>
              Delete
            </button>
          </ng-template>
        </mat-menu>

        <!-- Paginator -->
        <mat-paginator 
          [pageSizeOptions]="[10, 25, 50, 100]"
          [pageSize]="25"
          showFirstLastButtons>
        </mat-paginator>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && dataSource.data.length === 0" class="empty-state">
        <mat-icon class="empty-icon">computer</mat-icon>
        <h3>No VM instances found</h3>
        <p>Create your first VM instance to get started with Compute Engine.</p>
        <button mat-raised-button color="primary" (click)="createInstance()">
          <mat-icon>add</mat-icon>
          Create Instance
        </button>
      </div>
    </div>
  `,
  styles: [`
    .vm-instances-container {
      padding: 24px;
      background-color: var(--background-color);
      min-height: calc(100vh - 64px);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--text-primary);
    }

    .subtitle {
      margin: 0;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .filters-section {
      margin-bottom: 24px;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .search-field {
      min-width: 300px;
      flex: 1;
    }

    .filter-field {
      min-width: 150px;
    }

    .selected-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background-color: var(--primary-50);
      border-radius: 8px;
      border: 1px solid var(--primary-200);
    }

    .selected-count {
      font-weight: 500;
      color: var(--primary-700);
      margin-right: 8px;
    }

    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }

    .loading-container p, .error-container p {
      margin: 16px 0 0 0;
      color: var(--text-secondary);
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .table-container {
      background: var(--surface-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .instances-table {
      width: 100%;
      background: var(--surface-color);
    }

    .instances-table th {
      background-color: var(--background-color);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .instance-row {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .instance-row:hover {
      background-color: var(--hover-color);
    }

    .instance-row.selected {
      background-color: var(--primary-50);
    }

    .name-cell {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .instance-name {
      font-weight: 500;
      color: var(--primary-600);
      cursor: pointer;
      text-decoration: none;
    }

    .instance-name:hover {
      text-decoration: underline;
    }

    .instance-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .label-chip {
      font-size: 11px;
      height: 20px;
      background-color: var(--chip-background);
      color: var(--text-secondary);
    }

    .status-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .ip-address {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 13px;
      color: var(--text-primary);
    }

    .no-ip {
      color: var(--text-secondary);
      font-style: italic;
    }

    .boot-disk-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .disk-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .preemptible-icon {
      color: var(--success-color);
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-disabled);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: var(--text-secondary);
      max-width: 400px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .vm-instances-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .filters-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-field, .filter-field {
        min-width: unset;
        width: 100%;
      }

      .selected-actions {
        flex-wrap: wrap;
      }

      .instances-table {
        font-size: 14px;
      }

      .name-cell {
        min-width: 150px;
      }
    }

    /* Dark mode support */
    .dark-theme {
      --background-color: #121212;
      --surface-color: #1e1e1e;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0a0;
      --text-disabled: #606060;
      --border-color: #333333;
      --hover-color: #333333;
      --primary-50: #1a237e;
      --primary-200: #3949ab;
      --primary-600: #5c6bc0;
      --primary-700: #3f51b5;
      --chip-background: #333333;
      --success-color: #4caf50;
    }

    /* Light mode support */
    .light-theme {
      --background-color: #f8f9fa;
      --surface-color: #ffffff;
      --text-primary: #202124;
      --text-secondary: #5f6368;
      --text-disabled: #9aa0a6;
      --border-color: #e8eaed;
      --hover-color: #f8f9fa;
      --primary-50: #e8f0fe;
      --primary-200: #aecbfa;
      --primary-600: #1a73e8;
      --primary-700: #1557b0;
      --chip-background: #f1f3f4;
      --success-color: #137333;
    }

    .provider-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .provider-cell mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .provider-cell span {
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
    }
  `]
})
export class VmInstancesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'select',
    'name',
    'provider',
    'zone',
    'machineType',
    'status',
    'internalIp',
    'externalIp',
    'network',
    'bootDisk',
    'preemptible',
    'created',
    'actions'
  ];

  dataSource = new MatTableDataSource<TableVmInstance>([]);
  selection = new SelectionModel<TableVmInstance>(true, []);
  
  loading = false;
  error: string | null = null;
  availableZones: Zone[] = [];

  searchControl = new FormControl('');
  zoneFilterControl = new FormControl('all');
  statusFilterControl = new FormControl('all');

  private destroy$ = new Subject<void>();

  constructor(
    private computeEngineService: ComputeEngineService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private multiCloudService: MultiCloudInstancesService
  ) {}

  ngOnInit() {
    this.initializeComponent();
    this.setupFilterListeners();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent() {
    // Subscribe to multi-cloud service observables
    this.multiCloudService.instances$
      .pipe(takeUntil(this.destroy$))
      .subscribe(instances => {
        console.log('VM Component - Multi-cloud instances received:', instances);
        try {
          const transformedData = this.transformMultiCloudInstances(instances);
          console.log('VM Component - Transformed data:', transformedData);
          this.dataSource.data = transformedData;
          this.applyFilters();
        } catch (error) {
          console.error('VM Component - Error transforming instances:', error);
          this.error = 'Failed to display instances';
        }
      });

    this.multiCloudService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.multiCloudService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    this.dataSource.filterPredicate = (data: TableVmInstance, filter: string) => {
      try {
        const searchTerm = JSON.parse(filter);
        const matchesSearch = !searchTerm.search ||
          data.name.toLowerCase().includes(searchTerm.search) ||
          this.searchInLabels(data, searchTerm.search);
        
        const matchesZone = searchTerm.zone === 'all' || data.displayZone === searchTerm.zone;
        const matchesStatus = searchTerm.status === 'all' || data.status === searchTerm.status;

        return matchesSearch && matchesZone && matchesStatus;
      } catch (error) {
        console.warn('Filter parse error:', error);
        return true; // Show all data if filter parsing fails
      }
    };
  }

  private setupFilterListeners() {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => this.applyFilters());

    // Zone filter
    this.zoneFilterControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    // Status filter
    this.statusFilterControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  private loadInitialData() {
    // Load zones
    this.computeEngineService.getZones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: zones => this.availableZones = zones,
        error: error => console.error('Error loading zones:', error)
      });

    // Load instances
    this.refreshInstances();
  }

  private transformMultiCloudInstances(instances: MultiCloudVmInstance[]): TableVmInstance[] {
    return instances.map(instance => ({
      ...instance,
      displayZone: instance.displayRegion,
      displayMachineType: instance.displayInstanceType,
      displayNetwork: this.getDisplayNetwork(instance),
      displayStatus: this.formatStatus(instance.status),
      formattedCreationDate: this.formatDate(instance.createdAt),
      bootDiskSize: this.getBootDiskSize(instance),
      hasExternalIp: !!instance.externalIp,
      preemptible: this.getPreemptibleStatus(instance),
      providerIcon: this.getProviderIcon(instance.provider)
    }));
  }

  private getDisplayNetwork(instance: MultiCloudVmInstance): string {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      return this.computeEngineService.extractNetworkName(
        instance.providerData.gcp.networkInterfaces[0]?.network || ''
      );
    } else if (instance.provider === 'aws' && instance.providerData.aws) {
      return instance.providerData.aws.VpcId || 'default';
    }
    return 'unknown';
  }

  private getBootDiskSize(instance: MultiCloudVmInstance): string {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      return instance.providerData.gcp.disks.find((d: any) => d.boot)?.diskSizeGb || '0';
    } else if (instance.provider === 'aws' && instance.providerData.aws) {
      const rootDevice = instance.providerData.aws.BlockDeviceMappings.find(
        (device: any) => device.DeviceName === instance.providerData.aws?.RootDeviceName
      );
      return rootDevice?.Ebs?.VolumeSize?.toString() || '8';
    }
    return '0';
  }

  private getPreemptibleStatus(instance: MultiCloudVmInstance): boolean {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      return instance.providerData.gcp.scheduling.preemptible;
    }
    // AWS spot instances would be similar concept
    return false;
  }

  private getProviderIcon(provider: string): string {
    switch (provider) {
      case 'gcp': return 'cloud';
      case 'aws': return 'storage';
      default: return 'computer';
    }
  }

  private formatStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }

  private applyFilters() {
    if (!this.dataSource) return;

    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    const selectedZone = this.zoneFilterControl.value || 'all';
    const selectedStatus = this.statusFilterControl.value || 'all';

    this.dataSource.filter = JSON.stringify({
      search: searchTerm,
      zone: selectedZone,
      status: selectedStatus
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.filteredData.forEach(row => this.selection.select(row));
    }
  }

  // Filter helper methods
  hasActiveFilters(): boolean {
    return this.searchControl.value !== '' || 
           this.zoneFilterControl.value !== 'all' || 
           this.statusFilterControl.value !== 'all';
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.zoneFilterControl.setValue('all');
    this.statusFilterControl.setValue('all');
  }

  // Instance helper methods
  hasLabels(instance: MultiCloudVmInstance): boolean {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      return Object.keys(instance.providerData.gcp.labels || {}).length > 0;
    } else if (instance.provider === 'aws' && instance.providerData.aws) {
      return (instance.providerData.aws.Tags || []).length > 0;
    }
    return false;
  }

  hasBootDisk(instance: MultiCloudVmInstance): boolean {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      const bootDisk = instance.providerData.gcp.disks?.find((d: any) => d.boot);
      return bootDisk?.type === 'PERSISTENT';
    } else if (instance.provider === 'aws' && instance.providerData.aws) {
      // AWS instances typically have EBS volumes
      return true;
    }
    return false;
  }

  getInstanceLabels(instance: MultiCloudVmInstance): Array<{ key: string; value: string }> {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      return Object.entries(instance.providerData.gcp.labels || {}).map(([key, value]) => ({ 
        key, 
        value: String(value) 
      }));
    } else if (instance.provider === 'aws' && instance.providerData.aws) {
      return (instance.providerData.aws.Tags || []).map(tag => ({ 
        key: tag.Key, 
        value: tag.Value 
      }));
    }
    return [];
  }

  // Action validation methods
  canStartSelected(): boolean {
    return this.selection.selected.some(instance => 
      instance.status === 'stopped' || instance.status === 'terminated'
    );
  }

  canStopSelected(): boolean {
    return this.selection.selected.some(instance => 
      instance.status === 'running'
    );
  }

  canRestartSelected(): boolean {
    return this.selection.selected.some(instance => 
      instance.status === 'running'
    );
  }

  canDeleteSelected(): boolean {
    return this.selection.selected.length > 0;
  }

  // Action methods
  refreshInstances() {
    this.multiCloudService.loadAllInstances();
  }

  createInstance() {
    this.router.navigate(['/vm-instances/create']);
  }

  configureAws() {
    this.router.navigate(['/aws-config']);
  }

  viewInstanceDetails(instance: VmInstance) {
    this.snackBar.open(`Viewing details for ${instance.name}`, 'Close', {
      duration: 3000
    });
  }

  editInstance(instance: VmInstance) {
    this.snackBar.open(`Edit functionality for ${instance.name} would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  cloneInstance(instance: VmInstance) {
    this.snackBar.open(`Clone functionality for ${instance.name} would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  sshToInstance(instance: VmInstance) {
    this.snackBar.open(`SSH to ${instance.name} would open in a new window`, 'Close', {
      duration: 3000
    });
  }

  viewSerialConsole(instance: VmInstance) {
    this.snackBar.open(`Serial console for ${instance.name} would open in a new window`, 'Close', {
      duration: 3000
    });
  }

  // Single instance actions
  async startInstance(instance: MultiCloudVmInstance) {
    const success = await this.multiCloudService.startInstance(instance);
    if (success) {
      this.snackBar.open(`Starting ${instance.name}...`, 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(`Failed to start ${instance.name}`, 'Close', { duration: 5000 });
    }
  }

  async stopInstance(instance: MultiCloudVmInstance) {
    const success = await this.multiCloudService.stopInstance(instance);
    if (success) {
      this.snackBar.open(`Stopping ${instance.name}...`, 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(`Failed to stop ${instance.name}`, 'Close', { duration: 5000 });
    }
  }

  async restartInstance(instance: MultiCloudVmInstance) {
    const success = await this.multiCloudService.restartInstance(instance);
    if (success) {
      this.snackBar.open(`Restarting ${instance.name}...`, 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(`Failed to restart ${instance.name}`, 'Close', { duration: 5000 });
    }
  }

  async deleteInstance(instance: MultiCloudVmInstance) {
    if (confirm(`Are you sure you want to delete ${instance.name}? This action cannot be undone.`)) {
      const success = await this.multiCloudService.deleteInstance(instance);
      if (success) {
        this.snackBar.open(`Deleting ${instance.name}...`, 'Close', { duration: 3000 });
      } else {
        this.snackBar.open(`Failed to delete ${instance.name}`, 'Close', { duration: 5000 });
      }
    }
  }

  // Bulk actions
  startSelectedInstances() {
    const instances = this.selection.selected.filter(instance => 
      instance.status === 'stopped' || instance.status === 'terminated'
    );
    
    instances.forEach(instance => this.startInstance(instance));
    this.selection.clear();
  }

  stopSelectedInstances() {
    const instances = this.selection.selected.filter(instance => 
      instance.status === 'running'
    );
    
    instances.forEach(instance => this.stopInstance(instance));
    this.selection.clear();
  }

  restartSelectedInstances() {
    const instances = this.selection.selected.filter(instance => 
      instance.status === 'running'
    );
    
    instances.forEach(instance => this.restartInstance(instance));
    this.selection.clear();
  }

  deleteSelectedInstances() {
    const instances = this.selection.selected;
    const instanceNames = instances.map(i => i.name).join(', ');
    
    if (confirm(`Are you sure you want to delete ${instances.length} instances (${instanceNames})? This action cannot be undone.`)) {
      instances.forEach(instance => this.deleteInstance(instance));
      this.selection.clear();
    }
  }

  getProviderColor(provider: string): string {
    switch (provider) {
      case 'gcp': return '#4285f4';
      case 'aws': return '#ff9900';
      default: return '#666666';
    }
  }

  private searchInLabels(instance: TableVmInstance, searchTerm: string): boolean {
    const labels = this.getInstanceLabels(instance);
    return labels.some(label => 
      label.key.toLowerCase().includes(searchTerm) || 
      label.value.toLowerCase().includes(searchTerm)
    );
  }
}