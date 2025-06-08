import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CloudNatService, CloudNatGateway } from '../../services/cloud-nat.service';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-cloud-nat-details',
  template: `
    <div class="cloud-nat-details-container">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <button mat-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            Cloud NAT
          </button>
          <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
          <span class="current-page">{{ natGateway?.name || 'Loading...' }}</span>
        </div>
        
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="editGateway()">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button mat-stroked-button color="warn" (click)="deleteGateway()">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Gateway Status -->
      <div class="status-section" *ngIf="natGateway">
        <div class="status-info">
          <div class="gateway-name">
            <mat-icon class="gateway-icon">nat</mat-icon>
            <h1>{{ natGateway.name }}</h1>
          </div>
          <div class="status-indicator">
            <mat-icon [style.color]="getStatusColor(natGateway.status)">
              {{ getStatusIcon(natGateway.status) }}
            </mat-icon>
            <span class="status-text" [style.color]="getStatusColor(natGateway.status)">
              {{ natGateway.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading Cloud NAT gateway details...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!isLoading && natGateway" class="main-content">
        <!-- Tabs -->
        <mat-tab-group class="details-tabs">
          <mat-tab label="Details">
            <div class="tab-content">
              
              <!-- NAT Type Section -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>NAT type</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-row">
                    <span class="label">Type</span>
                    <span class="value">{{ natGateway.natType }}</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Cloud Router Section -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>Cloud Router</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-row">
                    <span class="label">Region</span>
                    <span class="value">{{ natGateway.region }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">VPC network</span>
                    <a class="value link" (click)="viewNetwork(natGateway.network)">{{ natGateway.network }}</a>
                  </div>
                  <div class="info-row">
                    <span class="label">Cloud Router</span>
                    <a class="value link" (click)="viewCloudRouter(natGateway.cloudRouter, natGateway.region)">{{ natGateway.cloudRouter }}</a>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Cloud NAT Mapping Section -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>Cloud NAT mapping</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-row">
                    <span class="label">High availability</span>
                    <span class="value">{{ natGateway.enableDynamicPortAllocation ? 'Yes' : 'No' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Source endpoint type</span>
                    <span class="value">VM instances, GKE nodes, Serverless</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Source IPv4 subnets & IP ranges</span>
                    <span class="value">{{ getSourceSubnetworkDisplay() }}</span>
                  </div>
                  <div class="info-row" *ngIf="natGateway.subnetworks && natGateway.subnetworks.length > 0">
                    <span class="label">Source IPv6 subnets</span>
                    <span class="value">None</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Cloud NAT IP addresses</span>
                    <span class="value">{{ getNatIpsDisplay() }}</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Cloud NAT Rules Section -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>Cloud NAT rules</mat-card-title>
                  <mat-card-subtitle>Rules are evaluated by rule number; lower numbers are evaluated first.</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="rules-filter">
                    <mat-form-field appearance="outline" class="filter-field">
                      <mat-label>Enter property name or value</mat-label>
                      <input matInput [(ngModel)]="rulesFilterValue" (input)="applyRulesFilter()" placeholder="Filter">
                      <mat-icon matPrefix>search</mat-icon>
                    </mat-form-field>
                  </div>
                  
                  <table mat-table [dataSource]="filteredRules" class="rules-table">
                    <ng-container matColumnDef="ruleType">
                      <th mat-header-cell *matHeaderCellDef>Rule type</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.type || 'Default' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="matchIpRanges">
                      <th mat-header-cell *matHeaderCellDef>Match IP ranges</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.matchIpRanges || '0.0.0.0/0' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="cloudNatIps">
                      <th mat-header-cell *matHeaderCellDef>Cloud NAT IPs</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.cloudNatIps || getNatIpsDisplay() }}</td>
                    </ng-container>

                    <ng-container matColumnDef="description">
                      <th mat-header-cell *matHeaderCellDef>Description</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.description || '-' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="ruleNumber">
                      <th mat-header-cell *matHeaderCellDef>Rule number</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.ruleNumber || '65001' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="networkServiceTier">
                      <th mat-header-cell *matHeaderCellDef>Network Service Tier</th>
                      <td mat-cell *matCellDef="let rule">{{ rule.networkServiceTier || 'Premium' }}</td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let rule">
                        <div class="status-indicator">
                          <mat-icon class="status-icon ok">check_circle</mat-icon>
                          <span>OK</span>
                        </div>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="rulesDisplayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: rulesDisplayedColumns;"></tr>
                  </table>

                  <div *ngIf="filteredRules.length === 0" class="no-rules">
                    <p>No rules match the current filter</p>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Advanced Configurations Section -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>Advanced configurations</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="advanced-section">
                    <h4>Port allocation</h4>
                    <div class="info-row">
                      <span class="label">Dynamic port allocation</span>
                      <span class="value">{{ natGateway.enableDynamicPortAllocation ? 'Enabled' : 'Disabled' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Minimum ports per VM instance</span>
                      <span class="value">{{ natGateway.minPortsPerVm || 64 }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Endpoint-Independent Mapping</span>
                      <span class="value">{{ natGateway.enableEndpointIndependentMapping ? 'Enabled' : 'Disabled' }}</span>
                    </div>
                  </div>

                  <mat-divider class="section-divider"></mat-divider>

                  <div class="advanced-section">
                    <h4>Timeout for protocol connections</h4>
                    <div class="info-row">
                      <span class="label">UDP</span>
                      <span class="value">{{ natGateway.udpIdleTimeoutSec || 30 }} seconds</span>
                    </div>
                    <div class="info-row">
                      <span class="label">TCP established</span>
                      <span class="value">{{ natGateway.tcpEstablishedIdleTimeoutSec || 1200 }} seconds</span>
                    </div>
                    <div class="info-row">
                      <span class="label">TCP transitory</span>
                      <span class="value">{{ natGateway.tcpTransitoryIdleTimeoutSec || 30 }} seconds</span>
                    </div>
                    <div class="info-row">
                      <span class="label">ICMP</span>
                      <span class="value">{{ natGateway.icmpIdleTimeoutSec || 30 }} seconds</span>
                    </div>
                    <div class="info-row">
                      <span class="label">TCP time wait</span>
                      <span class="value">{{ natGateway.tcpTimeWaitTimeoutSec || 120 }} seconds</span>
                    </div>
                  </div>

                  <mat-divider class="section-divider"></mat-divider>

                  <div class="advanced-section">
                    <h4>Logging</h4>
                    <div class="info-row">
                      <span class="label">Translation and errors</span>
                      <span class="value">{{ getLoggingStatus() }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

            </div>
          </mat-tab>

          <mat-tab label="Monitoring">
            <div class="tab-content monitoring-content">
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>Monitoring</mat-card-title>
                  <mat-card-subtitle>View logs and metrics for this Cloud NAT gateway</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="monitoring-actions">
                    <button mat-raised-button color="primary" (click)="viewLogs()">
                      <mat-icon>receipt_long</mat-icon>
                      View in Logs Explorer
                    </button>
                    <button mat-stroked-button (click)="viewMetrics()">
                      <mat-icon>analytics</mat-icon>
                      View metrics
                    </button>
                  </div>
                  <p class="monitoring-description">
                    Use Cloud Logging and Cloud Monitoring to track the performance and health of your Cloud NAT gateway.
                  </p>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>

      </div>
    </div>
  `,
  styles: [`
    .cloud-nat-details-container {
      padding: 20px;
      max-width: 100%;
      background: var(--background-color);
      color: var(--text-color);
      min-height: calc(100vh - 64px);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--divider-color);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .back-button {
      color: #1976d2;
      font-weight: 500;
    }

    .back-button mat-icon {
      margin-right: 4px;
    }

    .breadcrumb-separator {
      color: var(--text-secondary-color);
      font-size: 16px;
    }

    .current-page {
      font-weight: 500;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .status-section {
      margin-bottom: 24px;
    }

    .status-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gateway-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .gateway-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #1976d2;
    }

    .gateway-name h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: var(--text-color);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-indicator mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .status-text {
      font-weight: 500;
      font-size: 16px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px;
      gap: 20px;
    }

    .loading-container p {
      color: var(--text-secondary-color);
      margin: 0;
    }

    .main-content {
      background: var(--background-color);
    }

    .details-tabs {
      background: var(--background-color);
    }

    .tab-content {
      padding: 20px 0;
    }

    .info-card {
      margin-bottom: 24px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .info-card mat-card-header {
      padding-bottom: 8px;
    }

    .info-card mat-card-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
      margin: 0;
    }

    .info-card mat-card-subtitle {
      font-size: 14px;
      color: var(--text-secondary-color);
      margin: 4px 0 0 0;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 500;
      color: var(--text-secondary-color);
      min-width: 200px;
    }

    .value {
      color: var(--text-color);
      text-align: right;
      flex: 1;
    }

    .link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }

    .rules-filter {
      margin-bottom: 16px;
    }

    .filter-field {
      width: 300px;
    }

    .rules-table {
      width: 100%;
      background: var(--surface-color);
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-icon.ok {
      color: #4caf50;
    }

    .no-rules {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary-color);
    }

    .advanced-section {
      margin-bottom: 24px;
    }

    .advanced-section h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .section-divider {
      margin: 24px 0;
      border-color: var(--divider-color);
    }

    .monitoring-content .info-card {
      text-align: center;
    }

    .monitoring-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 16px;
    }

    .monitoring-description {
      color: var(--text-secondary-color);
      margin: 0;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Dark theme overrides */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-tab-group {
        background-color: var(--background-color) !important;
      }

      .mat-mdc-tab-header {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-tab-label {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-tab-label.mdc-tab--active {
        color: var(--primary-color) !important;
      }

      .mat-mdc-tab-body-wrapper {
        background-color: var(--background-color) !important;
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--surface-color) !important;
        }

        .mat-mdc-form-field-input-control {
          color: var(--text-color) !important;
        }

        .mat-mdc-form-field-label {
          color: var(--text-secondary-color) !important;
        }
      }

      .mat-mdc-table {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-header-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-row:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .cloud-nat-details-container {
        padding: 12px;
      }

      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .status-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .value {
        text-align: left;
      }

      .label {
        min-width: auto;
      }

      .monitoring-actions {
        flex-direction: column;
        align-items: center;
      }
    }
  `]
})
export class CloudNatDetailsComponent implements OnInit {
  natGateway: CloudNatGateway | null = null;
  isLoading = true;
  projectId: string | null = null;
  gatewayName: string = '';
  
  // Rules table
  rulesFilterValue = '';
  filteredRules: any[] = [];
  rulesDisplayedColumns: string[] = [
    'ruleType', 'matchIpRanges', 'cloudNatIps', 'description', 
    'ruleNumber', 'networkServiceTier', 'status'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cloudNatService: CloudNatService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Get gateway name from route
    this.route.params.subscribe(params => {
      this.gatewayName = params['name'];
      this.loadGatewayDetails();
    });

    // Subscribe to project changes
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      if (this.gatewayName) {
        this.loadGatewayDetails();
      }
    });
  }

  loadGatewayDetails() {
    if (!this.gatewayName) return;

    this.isLoading = true;
    
    // Load all NAT gateways and find the one we need
    this.cloudNatService.getNatGateways(this.projectId || 'mock-project').subscribe({
      next: (gateways) => {
        this.natGateway = gateways.find(g => g.name === this.gatewayName) || null;
        
        if (!this.natGateway) {
          this.snackBar.open(`Cloud NAT gateway "${this.gatewayName}" not found`, 'Close', {
            duration: 5000
          });
          this.goBack();
          return;
        }

        this.setupRulesData();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading Cloud NAT gateway details:', error);
        this.isLoading = false;
        this.snackBar.open('Error loading Cloud NAT gateway details', 'Close', {
          duration: 5000
        });
        this.cdr.detectChanges();
      }
    });
  }

  setupRulesData() {
    // Mock rules data based on the screenshot
    const mockRules = [
      {
        type: 'Default',
        matchIpRanges: '0.0.0.0/0',
        cloudNatIps: this.getNatIpsDisplay(),
        description: '',
        ruleNumber: 65001,
        networkServiceTier: 'Premium',
        status: 'OK'
      }
    ];

    this.filteredRules = mockRules;
  }

  applyRulesFilter() {
    // Filter rules based on search term
    const searchTerm = this.rulesFilterValue.toLowerCase();
    
    if (!searchTerm) {
      this.setupRulesData();
      return;
    }

    this.filteredRules = this.filteredRules.filter(rule =>
      rule.type.toLowerCase().includes(searchTerm) ||
      rule.matchIpRanges.toLowerCase().includes(searchTerm) ||
      rule.cloudNatIps.toLowerCase().includes(searchTerm) ||
      rule.description.toLowerCase().includes(searchTerm) ||
      rule.networkServiceTier.toLowerCase().includes(searchTerm)
    );
  }

  getSourceSubnetworkDisplay(): string {
    if (!this.natGateway) return 'All subnets primary and secondary IP ranges';
    
    if (this.natGateway.sourceSubnetworkIpRangesToNat === 'ALL_SUBNETWORKS_ALL_IP_RANGES') {
      return 'All subnets primary and secondary IP ranges';
    } else if (this.natGateway.sourceSubnetworkIpRangesToNat === 'LIST_OF_SUBNETWORKS') {
      return 'List of subnetworks';
    }
    
    return 'All subnets primary and secondary IP ranges';
  }

  getNatIpsDisplay(): string {
    if (!this.natGateway) return 'Auto-allocated';
    
    if (this.natGateway.natIps && this.natGateway.natIps.length > 0) {
      return this.natGateway.natIps.join(', ');
    }
    
    // Mock IP for display based on gateway name
    if (this.natGateway.name === 'eu-nat') {
      return 'eu-nat-ip  35.241.156.253';
    }
    
    return 'Auto-allocated';
  }

  getLoggingStatus(): string {
    if (!this.natGateway?.logConfig) return 'Disabled';
    
    if (this.natGateway.logConfig.enable) {
      return `Enabled (${this.natGateway.logConfig.filter})`;
    }
    
    return 'Disabled';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Running':
        return '#4caf50';
      case 'Failed':
        return '#f44336';
      case 'Creating':
        return '#ff9800';
      case 'Stopping':
        return '#ff9800';
      default:
        return '#757575';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Running':
        return 'check_circle';
      case 'Failed':
        return 'error';
      case 'Creating':
        return 'schedule';
      case 'Stopping':
        return 'schedule';
      default:
        return 'help';
    }
  }

  goBack() {
    this.router.navigate(['/cloud-nat']);
  }

  refresh() {
    this.loadGatewayDetails();
  }

  editGateway() {
    this.snackBar.open(`Edit "${this.natGateway?.name}" functionality would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  deleteGateway() {
    if (!this.natGateway) return;
    
    if (confirm(`Are you sure you want to delete the Cloud NAT gateway "${this.natGateway.name}"?`)) {
      this.cloudNatService.deleteNatGateway(
        this.projectId || 'mock-project',
        this.natGateway.region,
        this.natGateway.cloudRouter,
        this.natGateway.name
      ).subscribe({
        next: () => {
          this.snackBar.open('Cloud NAT gateway deleted successfully', 'Close', { duration: 3000 });
          this.goBack();
        },
        error: (error) => {
          console.error('Error deleting Cloud NAT gateway:', error);
          this.snackBar.open('Error deleting Cloud NAT gateway', 'Close', { duration: 3000 });
        }
      });
    }
  }

  viewNetwork(networkName: string) {
    this.router.navigate(['/vpc', networkName]);
  }

  viewCloudRouter(routerName: string, region: string) {
    this.router.navigate(['/cloud-router', routerName], { 
      queryParams: { region: region } 
    });
  }

  viewLogs() {
    this.snackBar.open(`View logs for "${this.natGateway?.name}" would be implemented here`, 'Close', {
      duration: 3000
    });
  }

  viewMetrics() {
    this.snackBar.open(`View metrics for "${this.natGateway?.name}" would be implemented here`, 'Close', {
      duration: 3000
    });
  }
} 