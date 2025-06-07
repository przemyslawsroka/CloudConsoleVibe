import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CloudCdnService, CdnOriginDetails } from '../../services/cloud-cdn.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-cloud-cdn-details',
  template: `
    <div class="cdn-details-container">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <span class="breadcrumb-text">
            <a (click)="goBack()" class="breadcrumb-link">Network Services</a>
            <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
            <span class="breadcrumb-current">Origin details</span>
          </span>
        </div>
        
        <div class="title-section">
          <h1 class="page-title">{{ originDetails?.name || 'Loading...' }}</h1>
          <button mat-raised-button color="primary" class="edit-button">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading origin details...</p>
      </div>

      <!-- Content -->
      <div *ngIf="!loading && originDetails" class="content">
        <!-- Tabs -->
        <mat-tab-group class="details-tabs" [(selectedIndex)]="selectedTab">
          <mat-tab label="Details">
            <div class="tab-content">
              <!-- Origin Configuration -->
              <div class="section">
                <h2 class="section-title">Origin configuration</h2>
                <div class="config-grid">
                  <div class="config-item">
                    <label class="config-label">Origin type</label>
                    <span class="config-value">{{ originDetails.originType }}</span>
                  </div>
                  <div class="config-item">
                    <label class="config-label">Backend service name</label>
                    <span class="config-value">{{ originDetails.backendServiceName }}</span>
                  </div>
                </div>
              </div>

              <!-- Host and Path Rules -->
              <div class="section">
                <h2 class="section-title">Host and path rules</h2>
                <div class="associated-lb">
                  <h3>Associated load balancer {{ originDetails.associatedLoadBalancers[0] }}</h3>
                </div>
                
                <div class="table-container">
                  <table mat-table [dataSource]="originDetails.hostPathRules" class="host-path-table">
                    <!-- Hosts Column -->
                    <ng-container matColumnDef="hosts">
                      <th mat-header-cell *matHeaderCellDef>
                        <div class="header-cell">
                          Hosts
                          <mat-icon class="sort-icon">arrow_upward</mat-icon>
                        </div>
                      </th>
                      <td mat-cell *matCellDef="let rule">
                        <span class="host-value" [class.default]="rule.host.includes('unmatched')">
                          {{ rule.host }}
                        </span>
                      </td>
                    </ng-container>

                    <!-- Paths Column -->
                    <ng-container matColumnDef="paths">
                      <th mat-header-cell *matHeaderCellDef>Paths</th>
                      <td mat-cell *matCellDef="let rule">
                        <span class="path-value" [class.default]="rule.path.includes('unmatched')">
                          {{ rule.path }}
                        </span>
                      </td>
                    </ng-container>

                    <!-- Backend Column -->
                    <ng-container matColumnDef="backend">
                      <th mat-header-cell *matHeaderCellDef>Backend</th>
                      <td mat-cell *matCellDef="let rule">
                        <a class="backend-link" (click)="viewBackend(rule.backend)">
                          {{ rule.backend }}
                        </a>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="hostPathColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: hostPathColumns;"></tr>
                  </table>
                </div>
              </div>

              <!-- Cache Performance -->
              <div class="section">
                <h2 class="section-title">Cache performance</h2>
                <div class="cache-grid">
                  <div class="cache-item">
                    <label class="cache-label">Cache mode</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.cacheMode }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Cache key</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.cacheKey }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Restricted content</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.restrictedContent }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Negative caching</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.negativeCaching }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Bypass cache on request header</label>
                    <div class="header-info">
                      <div class="header-row">
                        <span class="header-name">Header name</span>
                        <span class="header-value">{{ originDetails.cachePerformance.bypassCacheOnRequestHeader.headerName }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Serve while stale</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.serveWhileStale }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Custom request headers</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.customRequestHeaders }}</span>
                  </div>
                  
                  <div class="cache-item">
                    <label class="cache-label">Custom response headers</label>
                    <span class="cache-value">{{ originDetails.cachePerformance.customResponseHeaders }}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Monitoring">
            <div class="tab-content">
              <div class="placeholder-content">
                <mat-icon class="placeholder-icon">analytics</mat-icon>
                <h3>Monitoring data will be displayed here</h3>
                <p>Real-time metrics and performance data for this CDN origin.</p>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Cache Invalidation">
            <div class="tab-content">
              <div class="placeholder-content">
                <mat-icon class="placeholder-icon">refresh</mat-icon>
                <h3>Cache invalidation tools will be available here</h3>
                <p>Manage cache invalidation for specific paths or entire origin.</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && !originDetails" class="error-container">
        <mat-icon class="error-icon">error</mat-icon>
        <h3>Origin not found</h3>
        <p>The requested CDN origin could not be found.</p>
        <button mat-raised-button color="primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cdn-details-container {
      padding: 0;
      background: #f8f9fa;
      min-height: calc(100vh - 64px);
    }

    .header {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 16px 24px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .back-button {
      margin-right: 8px;
      color: #5f6368;
    }

    .breadcrumb-text {
      display: flex;
      align-items: center;
      font-size: 14px;
    }

    .breadcrumb-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      color: #5f6368;
      font-size: 16px;
      margin: 0 8px;
    }

    .breadcrumb-current {
      color: #5f6368;
    }

    .title-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .edit-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ea4335;
      margin-bottom: 16px;
    }

    .content {
      background: white;
      margin: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .details-tabs {
      background: white;
    }

    .tab-content {
      padding: 24px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 16px 0;
    }

    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .config-label {
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .config-value {
      font-size: 14px;
      color: #202124;
    }

    .associated-lb {
      margin-bottom: 16px;
    }

    .associated-lb h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .table-container {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .host-path-table {
      width: 100%;
    }

    .mat-header-cell {
      background: #f8f9fa;
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .mat-cell {
      padding: 16px;
      border-bottom: 1px solid #f1f3f4;
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #1976d2;
    }

    .host-value, .path-value {
      font-size: 14px;
      color: #202124;
    }

    .host-value.default, .path-value.default {
      color: #5f6368;
      font-style: italic;
    }

    .backend-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
    }

    .backend-link:hover {
      text-decoration: underline;
    }

    .cache-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .cache-item {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 16px;
      align-items: start;
    }

    .cache-label {
      font-size: 14px;
      font-weight: 500;
      color: #5f6368;
    }

    .cache-value {
      font-size: 14px;
      color: #202124;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .header-row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 16px;
    }

    .header-name {
      font-size: 12px;
      color: #5f6368;
      font-weight: 500;
    }

    .header-value {
      font-size: 14px;
      color: #202124;
    }

    .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .placeholder-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #5f6368;
      margin-bottom: 16px;
    }

    .placeholder-content h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 18px;
      font-weight: 400;
    }

    .placeholder-content p {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .cdn-details-container {
        padding: 0;
      }

      .header {
        padding: 12px 16px;
      }

      .title-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .content {
        margin: 16px;
      }

      .tab-content {
        padding: 16px;
      }

      .config-grid {
        grid-template-columns: 1fr;
      }

      .cache-item {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .header-row {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }

    /* Material Design Overrides */
    ::ng-deep .mat-tab-group.details-tabs .mat-tab-header {
      border-bottom: 1px solid #e0e0e0;
    }

    ::ng-deep .mat-tab-group.details-tabs .mat-tab-label {
      min-width: 120px;
      padding: 0 24px;
      height: 48px;
    }

    ::ng-deep .mat-tab-group.details-tabs .mat-ink-bar {
      background-color: #1976d2;
    }

    ::ng-deep .mat-tab-group.details-tabs .mat-tab-label.mat-tab-label-active {
      color: #1976d2;
    }
  `]
})
export class CloudCdnDetailsComponent implements OnInit {
  originDetails: CdnOriginDetails | null = null;
  loading = true;
  selectedTab = 0;
  hostPathColumns = ['hosts', 'paths', 'backend'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private cdnService: CloudCdnService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const originName = params['name'];
      if (originName) {
        this.loadOriginDetails(originName);
      }
    });
  }

  loadOriginDetails(originName: string) {
    this.loading = true;
    this.cdnService.getCdnOriginDetails(originName).subscribe({
      next: (details) => {
        this.originDetails = details;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading origin details:', error);
        this.loading = false;
      }
    });
  }

  goBack() {
    this.location.back();
  }

  viewBackend(backendName: string) {
    // Navigate to backend service details
    this.router.navigate(['/load-balancing/backend-service', backendName]);
  }
}
