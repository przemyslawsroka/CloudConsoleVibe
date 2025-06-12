import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { NetworkConnectivityService } from '../../services/network-connectivity.service';

interface Hub {
  name: string;
  description?: string;
  labels?: { [key: string]: string };
  activeSpokeCount: number;
  spokeType: string;
  pscConnectionPropagation: 'On' | 'Off';
  requests: string;
}

interface Spoke {
  name: string;
  type: 'VPN tunnel' | 'VLAN attachment' | 'VPC network' | 'Router appliance' | 'Gateway';
  hub: string;
  region?: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-network-connectivity',
  template: `
    <div class="connectivity-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Network Connectivity Center</h1>
          <p>Network Connectivity Center is a network connectivity product that employs a hub-and-spoke architecture for management of hybrid connectivity. 
             <a href="https://cloud.google.com/network-connectivity/docs/network-connectivity-center" target="_blank" class="learn-more-link">Learn more</a>
          </p>
        </div>
        <button mat-raised-button color="primary" class="refresh-button" (click)="refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <!-- Tabs -->
      <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="connectivity-tabs">
        <mat-tab label="Hubs">
          <div class="tab-content">
            <div class="section-header">
              <h2>Hubs</h2>
              <button mat-raised-button color="primary" (click)="createHub()">
                <mat-icon>add</mat-icon>
                Create hub
              </button>
            </div>

            <!-- Hubs Table -->
            <div class="table-container">
              <div class="table-controls">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Filter</mat-label>
                  <input matInput placeholder="Enter property name or value" [(ngModel)]="hubFilter" (input)="filterHubs()">
                  <mat-icon matSuffix>filter_list</mat-icon>
                </mat-form-field>
                <button mat-icon-button class="table-settings" matTooltip="Table settings">
                  <mat-icon>settings</mat-icon>
                </button>
                <button mat-icon-button class="table-view" matTooltip="Change view">
                  <mat-icon>view_list</mat-icon>
                </button>
              </div>

              <table mat-table [dataSource]="filteredHubs" class="connectivity-table" matSort>
                <!-- Checkbox Column -->
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef>
                    <mat-checkbox (change)="$event ? masterToggleHubs() : null"
                                  [checked]="selectionHubs.hasValue() && isAllSelectedHubs()"
                                  [indeterminate]="selectionHubs.hasValue() && !isAllSelectedHubs()">
                    </mat-checkbox>
                  </th>
                  <td mat-cell *matCellDef="let hub">
                    <mat-checkbox (click)="$event.stopPropagation()"
                                  (change)="$event ? selectionHubs.toggle(hub) : null"
                                  [checked]="selectionHubs.isSelected(hub)">
                    </mat-checkbox>
                  </td>
                </ng-container>

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                  <td mat-cell *matCellDef="let hub">
                    <a href="#" class="hub-link" (click)="viewHub(hub); $event.preventDefault()">{{ hub.name }}</a>
                  </td>
                </ng-container>

                <!-- Description Column -->
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let hub">{{ hub.description || '' }}</td>
                </ng-container>

                <!-- Labels Column -->
                <ng-container matColumnDef="labels">
                  <th mat-header-cell *matHeaderCellDef>Labels</th>
                  <td mat-cell *matCellDef="let hub">
                    <div class="labels-container" *ngIf="hub.labels && getLabelsArray(hub.labels).length > 0">
                      <mat-chip-set>
                        <mat-chip *ngFor="let label of getLabelsArray(hub.labels)">
                          {{ label.key }}: {{ label.value }}
                        </mat-chip>
                      </mat-chip-set>
                    </div>
                  </td>
                </ng-container>

                <!-- Active Spoke Count Column -->
                <ng-container matColumnDef="activeSpokeCount">
                  <th mat-header-cell *matHeaderCellDef>Active spoke count</th>
                  <td mat-cell *matCellDef="let hub">{{ hub.activeSpokeCount }}</td>
                </ng-container>

                <!-- Spoke Type Column -->
                <ng-container matColumnDef="spokeType">
                  <th mat-header-cell *matHeaderCellDef>Spoke type</th>
                  <td mat-cell *matCellDef="let hub">{{ hub.spokeType }}</td>
                </ng-container>

                <!-- PSC Connection Propagation Column -->
                <ng-container matColumnDef="pscConnectionPropagation">
                  <th mat-header-cell *matHeaderCellDef>
                    PSC connection propagation
                    <mat-icon class="info-icon" matTooltip="Private Service Connect connection propagation">info</mat-icon>
                  </th>
                  <td mat-cell *matCellDef="let hub">
                    <span class="status-badge" [class.status-on]="hub.pscConnectionPropagation === 'On'" 
                          [class.status-off]="hub.pscConnectionPropagation === 'Off'">
                      <mat-icon class="status-icon">{{ hub.pscConnectionPropagation === 'On' ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                      {{ hub.pscConnectionPropagation }}
                    </span>
                  </td>
                </ng-container>

                <!-- Requests Column -->
                <ng-container matColumnDef="requests">
                  <th mat-header-cell *matHeaderCellDef>Requests</th>
                  <td mat-cell *matCellDef="let hub">
                    <span class="requests-status">
                      <mat-icon class="success-icon">check_circle</mat-icon>
                      {{ hub.requests }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="hubDisplayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: hubDisplayedColumns;" (click)="viewHub(row)"></tr>
              </table>

              <div class="no-data" *ngIf="filteredHubs.length === 0">
                <mat-icon>hub</mat-icon>
                <p>No hubs found</p>
                <p class="no-data-subtitle">Create your first hub to get started with Network Connectivity Center</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Spokes">
          <div class="tab-content">
            <div class="section-header">
              <h2>Spokes</h2>
              <button mat-raised-button color="primary" (click)="createSpoke()">
                <mat-icon>add</mat-icon>
                Create spoke
              </button>
            </div>

            <!-- Spokes Table -->
            <div class="table-container">
              <div class="table-controls">
                <mat-form-field appearance="outline" class="filter-field">
                  <mat-label>Filter</mat-label>
                  <input matInput placeholder="Enter property name or value" [(ngModel)]="spokeFilter" (input)="filterSpokes()">
                  <mat-icon matSuffix>filter_list</mat-icon>
                </mat-form-field>
                <button mat-icon-button class="table-settings" matTooltip="Table settings">
                  <mat-icon>settings</mat-icon>
                </button>
                <button mat-icon-button class="table-view" matTooltip="Change view">
                  <mat-icon>view_list</mat-icon>
                </button>
              </div>

              <table mat-table [dataSource]="filteredSpokes" class="connectivity-table" matSort>
                <!-- Checkbox Column -->
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef>
                    <mat-checkbox (change)="$event ? masterToggleSpokes() : null"
                                  [checked]="selectionSpokes.hasValue() && isAllSelectedSpokes()"
                                  [indeterminate]="selectionSpokes.hasValue() && !isAllSelectedSpokes()">
                    </mat-checkbox>
                  </th>
                  <td mat-cell *matCellDef="let spoke">
                    <mat-checkbox (click)="$event.stopPropagation()"
                                  (change)="$event ? selectionSpokes.toggle(spoke) : null"
                                  [checked]="selectionSpokes.isSelected(spoke)">
                    </mat-checkbox>
                  </td>
                </ng-container>

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                  <td mat-cell *matCellDef="let spoke">
                    <a href="#" class="spoke-link" (click)="viewSpoke(spoke); $event.preventDefault()">{{ spoke.name }}</a>
                  </td>
                </ng-container>

                <!-- Type Column -->
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let spoke">{{ spoke.type }}</td>
                </ng-container>

                <!-- Hub Column -->
                <ng-container matColumnDef="hub">
                  <th mat-header-cell *matHeaderCellDef>Hub</th>
                  <td mat-cell *matCellDef="let spoke">
                    <a href="#" class="hub-link" (click)="viewHubFromSpoke(spoke.hub); $event.preventDefault()">{{ spoke.hub }}</a>
                  </td>
                </ng-container>

                <!-- Region Column -->
                <ng-container matColumnDef="region">
                  <th mat-header-cell *matHeaderCellDef>Region</th>
                  <td mat-cell *matCellDef="let spoke">{{ spoke.region || '-' }}</td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let spoke">
                    <span class="status-badge" [class.status-active]="spoke.status === 'Active'" 
                          [class.status-inactive]="spoke.status === 'Inactive'">
                      <mat-icon class="status-icon">{{ spoke.status === 'Active' ? 'check_circle' : 'cancel' }}</mat-icon>
                      {{ spoke.status }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="spokeDisplayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: spokeDisplayedColumns;" (click)="viewSpoke(row)"></tr>
              </table>

              <div class="no-data" *ngIf="filteredSpokes.length === 0">
                <mat-icon>spoke</mat-icon>
                <p>No spokes found</p>
                <p class="no-data-subtitle">Create spokes to connect your networks to hubs</p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .connectivity-container {
      padding: 20px;
      max-width: 100%;
      background: var(--background-color);
      color: var(--text-color);
      min-height: 100vh;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding: 24px;
      background: var(--card-background);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
      font-size: 28px;
      font-weight: 400;
    }

    .header-content p {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 600px;
    }

    .learn-more-link {
      color: var(--primary-color);
      text-decoration: none;
    }

    .learn-more-link:hover {
      text-decoration: underline;
    }

    .refresh-button {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .connectivity-tabs {
      background: var(--card-background);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .tab-content {
      padding: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0;
      color: var(--text-color);
      font-size: 20px;
      font-weight: 500;
    }

    .table-container {
      background: var(--card-background);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .table-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color);
      background: var(--table-header-background);
    }

    .filter-field {
      flex: 1;
      max-width: 400px;
    }

    .table-settings, .table-view {
      color: var(--text-secondary);
    }

    .connectivity-table {
      width: 100%;
      background: var(--card-background);
    }

    .connectivity-table th {
      background: var(--table-header-background);
      color: var(--text-secondary);
      font-weight: 500;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .connectivity-table td {
      padding: 16px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-color);
    }

    .connectivity-table tr:hover {
      background: var(--hover-background);
      cursor: pointer;
    }

    .hub-link, .spoke-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }

    .hub-link:hover, .spoke-link:hover {
      text-decoration: underline;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .labels-container mat-chip {
      font-size: 11px;
      height: 24px;
      background: var(--chip-background);
      color: var(--primary-color);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      width: fit-content;
    }

    .status-on {
      background: #e8f5e8;
      color: #137333;
    }

    .status-off {
      background: #fce8e6;
      color: #d93025;
    }

    .status-active {
      background: #e8f5e8;
      color: #137333;
    }

    .status-inactive {
      background: #f1f3f4;
      color: #5f6368;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .requests-status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #137333;
    }

    .success-icon {
      color: #137333;
      font-size: 16px;
    }

    .info-icon {
      font-size: 16px;
      color: var(--text-secondary);
      margin-left: 4px;
      cursor: help;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      color: var(--text-secondary);
      text-align: center;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--text-disabled);
    }

    .no-data p {
      margin: 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .no-data-subtitle {
      font-size: 14px !important;
      font-weight: 400 !important;
      color: var(--text-disabled) !important;
    }

    @media (max-width: 768px) {
      .connectivity-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
        padding: 16px;
      }

      .section-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .table-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .connectivity-table {
        font-size: 14px;
      }

      .connectivity-table th,
      .connectivity-table td {
        padding: 12px 8px;
      }

      .filter-field {
        max-width: none;
      }
    }
  `]
})
export class NetworkConnectivityComponent implements OnInit {
  selectedTabIndex = 0;
  hubFilter = '';
  spokeFilter = '';

  hubDisplayedColumns: string[] = [
    'select', 'name', 'description', 'labels', 'activeSpokeCount', 
    'spokeType', 'pscConnectionPropagation', 'requests'
  ];

  spokeDisplayedColumns: string[] = [
    'select', 'name', 'type', 'hub', 'region', 'status'
  ];

  // Selection models
  selectionHubs = new SelectionModel<Hub>(true, []);
  selectionSpokes = new SelectionModel<Spoke>(true, []);

  // Mock data based on the screenshot
  hubs: Hub[] = [
    {
      name: 'denys-test-sac-delete',
      activeSpokeCount: 5,
      spokeType: 'Gateway',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'jen-hub-test',
      labels: { 'abc': 'def', 'test': 'test' },
      activeSpokeCount: 3,
      spokeType: 'VPN tunnel, VLAN attachment, VPC network',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'jentest',
      activeSpokeCount: 1,
      spokeType: 'Router appliance',
      pscConnectionPropagation: 'On',
      requests: 'No new requests'
    },
    {
      name: 'jen-test-star',
      activeSpokeCount: 2,
      spokeType: 'VPC network',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'ostrowkap-hub',
      activeSpokeCount: 1,
      spokeType: 'VPC network',
      pscConnectionPropagation: 'On',
      requests: 'No new requests'
    },
    {
      name: 'rokya-hub-test',
      description: 'test hub',
      activeSpokeCount: 0,
      spokeType: '',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'sac-test-do-not-delete',
      activeSpokeCount: 1,
      spokeType: 'VPC network',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'test-hub-delete-me',
      activeSpokeCount: 0,
      spokeType: '',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    },
    {
      name: 'test-hub-do-not-delete',
      activeSpokeCount: 4,
      spokeType: 'Gateway',
      pscConnectionPropagation: 'Off',
      requests: 'No new requests'
    }
  ];

  spokes: Spoke[] = [
    {
      name: 'denys-test-spoke-1',
      type: 'VPC network',
      hub: 'denys-test-sac-delete',
      region: 'us-central1',
      status: 'Active'
    },
    {
      name: 'jen-spoke-vpn',
      type: 'VPN tunnel',
      hub: 'jen-hub-test',
      region: 'us-west1',
      status: 'Active'
    },
    {
      name: 'jen-spoke-vlan',
      type: 'VLAN attachment',
      hub: 'jen-hub-test',
      region: 'us-east1',
      status: 'Active'
    },
    {
      name: 'router-appliance-spoke',
      type: 'Router appliance',
      hub: 'jentest',
      region: 'europe-west1',
      status: 'Active'
    },
    {
      name: 'vpc-spoke-production',
      type: 'VPC network',
      hub: 'jen-test-star',
      region: 'asia-east1',
      status: 'Active'
    },
    {
      name: 'gateway-spoke-1',
      type: 'Gateway',
      hub: 'test-hub-do-not-delete',
      region: 'us-central1',
      status: 'Inactive'
    }
  ];

  filteredHubs: Hub[] = [];
  filteredSpokes: Spoke[] = [];

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private networkConnectivityService: NetworkConnectivityService
  ) {}

  ngOnInit() {
    this.filteredHubs = [...this.hubs];
    this.filteredSpokes = [...this.spokes];
    this.loadData();
  }

  loadData() {
    // Load real data from GCP API
    this.networkConnectivityService.listHubs('demo-project').subscribe({
      next: (response) => {
        console.log('Hubs loaded:', response);
        // Merge with mock data for demo
      },
      error: (error) => {
        console.error('Error loading hubs:', error);
      }
    });
  }

  refresh() {
    this.snackBar.open('Refreshing Network Connectivity Center data...', 'Close', {
      duration: 2000
    });
    
    this.loadData();
    
    setTimeout(() => {
      this.snackBar.open('Data refreshed successfully', 'Close', {
        duration: 2000
      });
    }, 1000);
  }

  filterHubs() {
    if (!this.hubFilter.trim()) {
      this.filteredHubs = [...this.hubs];
    } else {
      const filter = this.hubFilter.toLowerCase();
      this.filteredHubs = this.hubs.filter(hub => 
        hub.name.toLowerCase().includes(filter) ||
        (hub.description && hub.description.toLowerCase().includes(filter)) ||
        hub.spokeType.toLowerCase().includes(filter) ||
        (hub.labels && Object.entries(hub.labels).some(([key, value]) => 
          key.toLowerCase().includes(filter) || value.toLowerCase().includes(filter)
        ))
      );
    }
  }

  filterSpokes() {
    if (!this.spokeFilter.trim()) {
      this.filteredSpokes = [...this.spokes];
    } else {
      const filter = this.spokeFilter.toLowerCase();
      this.filteredSpokes = this.spokes.filter(spoke => 
        spoke.name.toLowerCase().includes(filter) ||
        spoke.type.toLowerCase().includes(filter) ||
        spoke.hub.toLowerCase().includes(filter) ||
        (spoke.region && spoke.region.toLowerCase().includes(filter))
      );
    }
  }

  createHub() {
    this.router.navigate(['/network-connectivity/hubs/create']);
  }

  createSpoke() {
    this.router.navigate(['/network-connectivity/spokes/create']);
  }

  viewHub(hub: Hub) {
    this.router.navigate(['/network-connectivity/hubs', hub.name]);
  }

  viewSpoke(spoke: Spoke) {
    this.router.navigate(['/network-connectivity/spokes', spoke.name]);
  }

  viewHubFromSpoke(hubName: string) {
    this.router.navigate(['/network-connectivity/hubs', hubName]);
  }

  getLabelsArray(labels: { [key: string]: string }): { key: string, value: string }[] {
    return Object.entries(labels).map(([key, value]) => ({ key, value }));
  }

  // Selection methods for hubs
  masterToggleHubs() {
    this.isAllSelectedHubs() ?
      this.selectionHubs.clear() :
      this.filteredHubs.forEach(hub => this.selectionHubs.select(hub));
  }

  isAllSelectedHubs() {
    return this.filteredHubs.length > 0 && this.filteredHubs.every(hub => this.selectionHubs.isSelected(hub));
  }

  // Selection methods for spokes
  masterToggleSpokes() {
    this.isAllSelectedSpokes() ?
      this.selectionSpokes.clear() :
      this.filteredSpokes.forEach(spoke => this.selectionSpokes.select(spoke));
  }

  isAllSelectedSpokes() {
    return this.filteredSpokes.length > 0 && this.filteredSpokes.every(spoke => this.selectionSpokes.isSelected(spoke));
  }
} 