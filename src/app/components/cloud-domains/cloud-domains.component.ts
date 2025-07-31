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
            <div class="info-item 