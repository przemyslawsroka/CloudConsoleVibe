import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CloudDomainsService, CloudDomain } from '../../services/cloud-domains.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-cloud-domains',
  template: `
    <gcp-page-layout>
      <div class="header">
        <h1>
          <mat-icon>domain</mat-icon>
          Cloud Domains
        </h1>
        <p class="description">
          Manage your domain registrations and DNS settings with Google Cloud Domains.
        </p>
      </div>

      <div class="actions-bar">
        <button mat-raised-button color="primary" (click)="registerDomain()" [disabled]="!currentProject">
          <mat-icon>add</mat-icon>
          Register Domain
        </button>
        <button mat-raised-button (click)="refreshDomains()" [disabled]="loading">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <gcp-banner type="info" *ngIf="!currentProject">
        <mat-icon>info</mat-icon>
        Please select a project to view Cloud Domains.
      </gcp-banner>

      <gcp-banner type="warning" *ngIf="showDeprecationWarning">
        <mat-icon>warning</mat-icon>
        <strong>Notice:</strong> Google Domains was acquired by Squarespace. New registrations may be limited. 
        Existing domains will continue to be supported.
      </gcp-banner>

      <div class="content" *ngIf="currentProject">
        <gcp-card>
          <div class="card-header">
            <h2>Domain Registrations</h2>
            <span class="count">{{ domains.length }} domains</span>
          </div>

          <div class="loading" *ngIf="loading">
            <mat-progress-spinner diameter="50"></mat-progress-spinner>
            <p>Loading domains...</p>
          </div>

          <div class="empty-state" *ngIf="!loading && domains.length === 0">
            <mat-icon>domain</mat-icon>
            <h3>No domains registered</h3>
            <p>Register your first domain to get started with Cloud Domains.</p>
            <button mat-raised-button color="primary" (click)="registerDomain()">
              <mat-icon>add</mat-icon>
              Register Domain
            </button>
          </div>

          <div class="domains-list" *ngIf="!loading && domains.length > 0">
            <gcp-data-table [data]="domains" [columns]="columns">
              <ng-container *gcp-data-table-cell="let domain of 'domainName'">
                <div class="domain-cell">
                  <strong>{{ domain.domainName }}</strong>
                  <span class="domain-location">{{ domain.location }}</span>
                </div>
              </ng-container>

              <ng-container *gcp-data-table-cell="let domain of 'state'">
                <span [class]="'status status-' + domain.state.toLowerCase().replace('_', '-')">
                  <mat-icon>{{ getStateIcon(domain.state) }}</mat-icon>
                  {{ getStateLabel(domain.state) }}
                </span>
              </ng-container>

              <ng-container *gcp-data-table-cell="let domain of 'autoRenew'">
                <mat-icon [class]="domain.autoRenew ? 'auto-renew-enabled' : 'auto-renew-disabled'">
                  {{ domain.autoRenew ? 'autorenew' : 'pause' }}
                </mat-icon>
                {{ domain.autoRenew ? 'Enabled' : 'Disabled' }}
              </ng-container>

              <ng-container *gcp-data-table-cell="let domain of 'expireTime'">
                {{ formatDate(domain.expireTime) }}
              </ng-container>

              <ng-container *gcp-data-table-cell="let domain of 'dnsProvider'">
                {{ getDnsProvider(domain) }}
              </ng-container>

              <ng-container *gcp-data-table-cell="let domain of 'actions'">
                <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #actionsMenu="matMenu">
                  <button mat-menu-item (click)="viewDomain(domain)">
                    <mat-icon>visibility</mat-icon>
                    View details
                  </button>
                  <button mat-menu-item (click)="configureDns(domain)">
                    <mat-icon>dns</mat-icon>
                    Configure DNS
                  </button>
                  <button mat-menu-item (click)="toggleAutoRenew(domain)">
                    <mat-icon>{{ domain.autoRenew ? 'pause' : 'autorenew' }}</mat-icon>
                    {{ domain.autoRenew ? 'Disable' : 'Enable' }} auto-renewal
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="transferDomain(domain)" class="warn">
                    <mat-icon>swap_horiz</mat-icon>
                    Transfer domain
                  </button>
                  <button mat-menu-item (click)="deleteDomain(domain)" class="danger">
                    <mat-icon>delete</mat-icon>
                    Delete registration
                  </button>
                </mat-menu>
              </ng-container>
            </gcp-data-table>
          </div>
        </gcp-card>

        <gcp-card class="info-card">
          <div class="card-header">
            <h3>Domain Management</h3>
          </div>
          <div class="info-content">
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <div class="info-text">
                <h4>Getting Started</h4>
                <p>Register your first domain to get started with Cloud Domains.</p>
              </div>
            </div>
          </div>
        </gcp-card>
      </div>
    </gcp-page-layout>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .description {
      margin: 8px 0 0 0;
      color: #666;
    }

    .actions-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .card-header h2 {
      margin: 0;
    }

    .count {
      color: #666;
      font-size: 14px;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-state mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 16px 0 8px 0;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 24px;
    }

    .domain-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .domain-location {
      font-size: 12px;
      color: #666;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-suspended {
      background-color: #ffebee;
      color: #c62828;
    }

    .status-expired {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .auto-renew-enabled {
      color: #2e7d32;
    }

    .auto-renew-disabled {
      color: #666;
    }

    .warn {
      color: #f57c00 !important;
    }

    .danger {
      color: #d32f2f !important;
    }

    .info-card {
      margin-top: 24px;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }

    .info-item mat-icon {
      color: #1976d2;
      margin-top: 2px;
    }

    .info-text h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .info-text p {
      margin: 0;
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }
  `]
})
export class CloudDomainsComponent implements OnInit {
  currentProject: any = null;
  loading = false;
  showDeprecationWarning = true;
  domains: CloudDomain[] = [];

  columns = [
    { key: 'domainName', header: 'Domain Name' },
    { key: 'state', header: 'Status' },
    { key: 'autoRenew', header: 'Auto Renew' },
    { key: 'expireTime', header: 'Expires' },
    { key: 'dnsProvider', header: 'DNS Provider' },
    { key: 'actions', header: 'Actions' }
  ];

  constructor(
    private cloudDomainsService: CloudDomainsService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe(project => {
      this.currentProject = project;
      if (project) {
        this.loadDomains();
      }
    });
  }

  loadDomains() {
    if (!this.currentProject) return;

    this.loading = true;
    this.cloudDomainsService.getDomains(this.currentProject.id).subscribe({
      next: (domains) => {
        this.domains = domains;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading domains:', error);
        this.snackBar.open('Error loading domains', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  registerDomain() {
    // TODO: Implement domain registration
    this.snackBar.open('Domain registration coming soon', 'Close', { duration: 3000 });
  }

  refreshDomains() {
    this.loadDomains();
  }

  viewDomain(domain: CloudDomain) {
    // TODO: Implement view domain details
    console.log('View domain:', domain);
  }

  configureDns(domain: CloudDomain) {
    // TODO: Implement DNS configuration
    console.log('Configure DNS for:', domain);
  }

  toggleAutoRenew(domain: CloudDomain) {
    // TODO: Implement auto-renew toggle
    console.log('Toggle auto-renew for:', domain);
  }

  transferDomain(domain: CloudDomain) {
    // TODO: Implement domain transfer
    console.log('Transfer domain:', domain);
  }

  deleteDomain(domain: CloudDomain) {
    // TODO: Implement domain deletion
    console.log('Delete domain:', domain);
  }

  getStateIcon(state: string): string {
    switch (state) {
      case 'ACTIVE': return 'check_circle';
      case 'SUSPENDED': return 'warning';
      case 'EXPIRED': return 'error';
      default: return 'help';
    }
  }

  getStateLabel(state: string): string {
    switch (state) {
      case 'ACTIVE': return 'Active';
      case 'SUSPENDED': return 'Suspended';
      case 'EXPIRED': return 'Expired';
      default: return state;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getDnsProvider(domain: CloudDomain): string {
    // TODO: Implement DNS provider detection
    return 'Cloud DNS';
  }
}