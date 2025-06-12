import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Observable } from 'rxjs';
import { SecureWebProxyService, SecureWebProxy, SecurityPolicy } from '../../services/secure-web-proxy.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-secure-web-proxy',
  template: `
    <div class="secure-web-proxy-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="title-section">
            <h1>Secure Web Proxy</h1>
            <p class="description">
              Secure Web Proxy for Workload Protection enables content inspection and 
              granular policy control of egress web (http/s) traffic from GCP hosted workloads 
              out to Internet destinations. 
              <a href="https://cloud.google.com/secure-web-proxy/docs" target="_blank" class="learn-more-link">Learn more ↗</a>
            </p>
          </div>
          <div class="header-actions">
            <button mat-raised-button color="primary" class="create-btn" (click)="createProxy()">
              <mat-icon>add</mat-icon>
              Create a secure web proxy
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs Section -->
      <mat-tab-group class="tabs-section">
        <!-- Web Proxies Tab -->
        <mat-tab label="Web proxies">
          <div class="tab-content">
            <div class="controls-section">
              <div class="region-selector">
                <mat-form-field appearance="outline" class="region-field">
                  <mat-label>Region</mat-label>
                  <mat-select [(value)]="selectedRegion" (selectionChange)="onRegionChange()">
                    <mat-option value="us-central1">us-central1</mat-option>
                    <mat-option value="us-east1">us-east1</mat-option>
                    <mat-option value="us-west1">us-west1</mat-option>
                    <mat-option value="europe-west1">europe-west1</mat-option>
                    <mat-option value="asia-east1">asia-east1</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              
              <div class="actions-section">
                <button mat-icon-button matTooltip="Refresh" (click)="refreshProxies()">
                  <mat-icon>refresh</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Filter table">
                  <mat-icon>filter_list</mat-icon>
                </button>
              </div>
            </div>

            <!-- Proxies Table -->
            <div class="table-container">
              <table mat-table [dataSource]="dataSource" matSort class="proxies-table">
                <!-- Selection Column -->
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

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="name-link" (click)="viewProxy(element)">{{ element.name }}</a>
                  </td>
                </ng-container>

                <!-- Routing Mode Column -->
                <ng-container matColumnDef="routingMode">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Routing mode</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="routing-mode">{{ getRoutingModeDisplay(element.routingMode) }}</span>
                  </td>
                </ng-container>

                <!-- Region Column -->
                <ng-container matColumnDef="region">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Region</th>
                  <td mat-cell *matCellDef="let element">{{ element.region }}</td>
                </ng-container>

                <!-- Network Column -->
                <ng-container matColumnDef="network">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Network</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="network-path">{{ getNetworkName(element.network) }}</span>
                  </td>
                </ng-container>

                <!-- Web Proxy IP Address Column -->
                <ng-container matColumnDef="webProxyIpAddress">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Web proxy IP address</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="ip-address">{{ element.addresses?.[0] || '-' }}</span>
                  </td>
                </ng-container>

                <!-- Ports Column -->
                <ng-container matColumnDef="ports">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Ports</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="ports">{{ element.ports?.join(', ') || '-' }}</span>
                  </td>
                </ng-container>

                <!-- Certificate Column -->
                <ng-container matColumnDef="certificate">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Certificate</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="certificate" *ngIf="element.certificates?.length; else noCert">
                      {{ element.certificates[0] }}
                    </span>
                    <ng-template #noCert>-</ng-template>
                  </td>
                </ng-container>

                <!-- Certificate Status Column -->
                <ng-container matColumnDef="certificateStatus">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Certificate status</th>
                  <td mat-cell *matCellDef="let element">
                    <span class="status-badge" [class]="getCertificateStatusClass(element)">
                      <mat-icon class="status-icon">{{ getCertificateStatusIcon(element) }}</mat-icon>
                      {{ getCertificateStatus(element) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Associated Policy Column -->
                <ng-container matColumnDef="associatedPolicy">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Associated policy</th>
                  <td mat-cell *matCellDef="let element">
                    <a class="policy-link" *ngIf="element.gatewaySecurityPolicy; else noPolicy" 
                       (click)="viewPolicy(element.gatewaySecurityPolicy)">
                      {{ getPolicyName(element.gatewaySecurityPolicy) }}
                    </a>
                    <ng-template #noPolicy>-</ng-template>
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let element">
                    <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="editProxy(element)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button mat-menu-item (click)="deleteProxy(element)">
                        <mat-icon>delete</mat-icon>
                        <span>Delete</span>
                      </button>
                      <button mat-menu-item (click)="viewProxyDetails(element)">
                        <mat-icon>visibility</mat-icon>
                        <span>View details</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                    (click)="selection.toggle(row)"
                    [class.selected]="selection.isSelected(row)"></tr>
              </table>

              <!-- No Data Message -->
              <div class="no-data" *ngIf="dataSource.data.length === 0 && !isLoading">
                <mat-icon>cloud_off</mat-icon>
                <h3>No web proxies found</h3>
                <p>Create your first secure web proxy to get started with egress traffic protection.</p>
                <button mat-raised-button color="primary" (click)="createProxy()">
                  Create secure web proxy
                </button>
              </div>

              <!-- Loading State -->
              <div class="loading-state" *ngIf="isLoading">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Loading web proxies...</p>
              </div>
            </div>

            <!-- Pagination -->
            <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" 
                           showFirstLastButtons
                           class="table-paginator">
            </mat-paginator>
          </div>
        </mat-tab>

        <!-- Policies Tab -->
        <mat-tab label="Policies">
          <div class="tab-content">
            <div class="policies-section">
              <p>Gateway security policies management coming soon...</p>
              <button mat-raised-button color="primary" (click)="createPolicy()">
                <mat-icon>add</mat-icon>
                Create a policy
              </button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .secure-web-proxy-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      background-color: var(--background-color);
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .header-section {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .title-section h1 {
      font-size: 28px;
      font-weight: 400;
      color: var(--text-color);
      margin: 0 0 8px 0;
    }

    .description {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary-color);
      margin: 0;
      max-width: 800px;
    }

    .learn-more-link {
      color: var(--primary-color);
      text-decoration: none;
    }

    .learn-more-link:hover {
      text-decoration: underline;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .create-btn {
      background-color: var(--primary-color);
      color: white;
    }

    .tabs-section {
      background-color: var(--surface-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .tab-content {
      padding: 24px;
    }

    .controls-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .region-field {
      width: 200px;
    }

    .actions-section {
      display: flex;
      gap: 8px;
    }

    .table-container {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .proxies-table {
      width: 100%;
      background-color: var(--surface-color);
    }

    .proxies-table th {
      background-color: var(--hover-color);
      font-weight: 500;
      font-size: 12px;
      color: var(--text-secondary-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .proxies-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      font-size: 14px;
    }

    .proxies-table tr:hover {
      background-color: var(--hover-color);
    }

    .proxies-table tr.selected {
      background-color: rgba(66, 133, 244, 0.08);
    }

    .name-link {
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }

    .name-link:hover {
      text-decoration: underline;
    }

    .routing-mode {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      background-color: var(--hover-color);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .network-path {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    .ip-address {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    .ports {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    .certificate {
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.expired {
      background-color: rgba(244, 67, 54, 0.12);
      color: #d32f2f;
    }

    .status-badge.valid {
      background-color: rgba(76, 175, 80, 0.12);
      color: #388e3c;
    }

    .status-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .policy-link {
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
    }

    .policy-link:hover {
      text-decoration: underline;
    }

    .no-data {
      text-align: center;
      padding: 64px 32px;
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
      margin: 0 0 8px 0;
      font-weight: 400;
    }

    .no-data p {
      margin: 0 0 24px 0;
    }

    .loading-state {
      text-align: center;
      padding: 64px 32px;
      color: var(--text-secondary-color);
    }

    .loading-state mat-spinner {
      margin: 0 auto 16px auto;
    }

    .table-paginator {
      border-top: 1px solid var(--divider-color);
    }

    .policies-section {
      text-align: center;
      padding: 64px 32px;
      color: var(--text-secondary-color);
    }

    .policies-section p {
      margin-bottom: 24px;
    }

    /* Dark theme adjustments */
    :host-context(.dark-theme) .proxies-table th {
      background-color: var(--hover-color);
    }

    :host-context(.dark-theme) .status-badge.expired {
      background-color: rgba(244, 67, 54, 0.2);
      color: #ef5350;
    }

    :host-context(.dark-theme) .status-badge.valid {
      background-color: rgba(76, 175, 80, 0.2);
      color: #66bb6a;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .controls-section {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .region-field {
        width: 100%;
      }

      .table-container {
        overflow-x: auto;
      }

      .proxies-table {
        min-width: 800px;
      }
    }
  `]
})
export class SecureWebProxyComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'select', 'name', 'routingMode', 'region', 'network', 
    'webProxyIpAddress', 'ports', 'certificate', 'certificateStatus', 
    'associatedPolicy', 'actions'
  ];

  dataSource = new MatTableDataSource<SecureWebProxy>();
  selection = new SelectionModel<SecureWebProxy>(true, []);
  
  selectedRegion = 'us-central1';
  isLoading = false;

  proxies$: Observable<SecureWebProxy[]>;
  policies$: Observable<SecurityPolicy[]>;

  constructor(
    private secureWebProxyService: SecureWebProxyService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.proxies$ = this.secureWebProxyService.proxies$;
    this.policies$ = this.secureWebProxyService.policies$;
  }

  ngOnInit() {
    this.loadProxies();
    this.loadPolicies();

    // Subscribe to proxies data
    this.proxies$.subscribe(proxies => {
      this.dataSource.data = proxies.filter(p => p.region === this.selectedRegion);
      this.isLoading = false;
    });

    // Setup table
    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  loadProxies() {
    this.isLoading = true;
    this.secureWebProxyService.listProxies(this.selectedRegion).subscribe({
      next: () => {
        // Data is handled by the subscription above
      },
      error: (error) => {
        console.error('Error loading proxies:', error);
        this.isLoading = false;
        this.snackBar.open('Error loading web proxies', 'Close', { duration: 5000 });
      }
    });
  }

  loadPolicies() {
    this.secureWebProxyService.listSecurityPolicies(this.selectedRegion).subscribe({
      error: (error) => {
        console.error('Error loading policies:', error);
      }
    });
  }

  onRegionChange() {
    this.selection.clear();
    this.loadProxies();
    this.loadPolicies();
  }

  refreshProxies() {
    this.loadProxies();
  }

  createProxy() {
    this.snackBar.open('Create proxy functionality coming soon...', 'Close', { duration: 3000 });
  }

  createPolicy() {
    this.snackBar.open('Create policy functionality coming soon...', 'Close', { duration: 3000 });
  }

  viewProxy(proxy: SecureWebProxy) {
    this.snackBar.open(`Viewing proxy: ${proxy.name}`, 'Close', { duration: 3000 });
  }

  editProxy(proxy: SecureWebProxy) {
    this.snackBar.open(`Editing proxy: ${proxy.name}`, 'Close', { duration: 3000 });
  }

  deleteProxy(proxy: SecureWebProxy) {
    if (confirm(`Are you sure you want to delete proxy "${proxy.name}"?`)) {
      this.secureWebProxyService.deleteProxy(proxy.name, proxy.region).subscribe({
        next: () => {
          this.snackBar.open(`Proxy "${proxy.name}" deleted successfully`, 'Close', { duration: 3000 });
          this.loadProxies();
        },
        error: (error) => {
          console.error('Error deleting proxy:', error);
          this.snackBar.open('Error deleting proxy', 'Close', { duration: 5000 });
        }
      });
    }
  }

  viewProxyDetails(proxy: SecureWebProxy) {
    this.snackBar.open(`Proxy details: ${proxy.name}`, 'Close', { duration: 3000 });
  }

  viewPolicy(policyPath: string) {
    const policyName = this.getPolicyName(policyPath);
    this.snackBar.open(`Viewing policy: ${policyName}`, 'Close', { duration: 3000 });
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  // Helper methods
  getRoutingModeDisplay(mode: string): string {
    switch (mode) {
      case 'EXPLICIT_ROUTING_MODE':
        return 'Explicit';
      case 'TRANSPARENT_ROUTING_MODE':
        return 'Next hop';
      default:
        return mode;
    }
  }

  getNetworkName(networkPath: string): string {
    return networkPath?.split('/').pop() || '-';
  }

  getPolicyName(policyPath: string): string {
    return policyPath?.split('/').pop() || '-';
  }

  getCertificateStatus(proxy: SecureWebProxy): string {
    // Mock logic - in real implementation, check certificate expiry
    const randomStatus = Math.random() > 0.8;
    return randomStatus ? 'expired' : '-';
  }

  getCertificateStatusClass(proxy: SecureWebProxy): string {
    const status = this.getCertificateStatus(proxy);
    return status === 'expired' ? 'expired' : 'valid';
  }

  getCertificateStatusIcon(proxy: SecureWebProxy): string {
    const status = this.getCertificateStatus(proxy);
    return status === 'expired' ? 'error' : 'check_circle';
  }
} 