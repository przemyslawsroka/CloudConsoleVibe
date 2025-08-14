import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Observable } from 'rxjs';
import { CloudRunService, CloudRunServiceData } from '../../services/cloud-run.service';
import { AuthService } from '../../services/auth.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';

@Component({
  selector: 'app-cloud-run-services',
  template: `
    <gcp-page-layout title="Cloud Run" subtitle="Serverless containers and 2nd gen functions" [hasHeaderActions]="true" [noPadding]="true">
      <div class="header-actions" slot="header-actions">
        <button mat-stroked-button color="primary" (click)="refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>
      <mat-card class="full-width-card">
        <div class="toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Filter</mat-label>
            <input matInput (keyup)="applyFilter($event)" placeholder="Search services by name, region or label">
            <button matSuffix mat-icon-button aria-label="Clear" (click)="clearFilter()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="dataSource" matSort class="gcp-table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox
                  (change)="toggleAll()"
                  [checked]="isAllSelected()"
                  [indeterminate]="isIndeterminate()">
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox (click)="$event.stopPropagation()" (change)="toggle(row)" [checked]="isSelected(row)"></mat-checkbox>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let row">
                <span class="status-chip" [class.ready]="row.status==='READY'" [class.unknown]="row.status!=='READY'">
                  {{ row.status }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let row">
                <div class="service-name">
                  <mat-icon class="svc-icon">directions_run</mat-icon>
                  <div class="svc-text">
                    <div class="svc-title">{{ row.name }}</div>
                    <div class="svc-sub" *ngIf="row.url">{{ row.url }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="deploymentType">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Deployment type</th>
              <td mat-cell *matCellDef="let row">{{ (row.deploymentType || 'service') | titlecase }}</td>
            </ng-container>

            <ng-container matColumnDef="rps">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Req/sec</th>
              <td mat-cell *matCellDef="let row">{{ row.requestsPerSecond || 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Region</th>
              <td mat-cell *matCellDef="let row">{{ row.location }}</td>
            </ng-container>

            <ng-container matColumnDef="authentication">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Authentication</th>
              <td mat-cell *matCellDef="let row">{{ row.authentication || 'Unknown' }}</td>
            </ng-container>

            <ng-container matColumnDef="ingress">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ingress</th>
              <td mat-cell *matCellDef="let row">{{ row.ingress || 'All' }}</td>
            </ng-container>

            <ng-container matColumnDef="updated">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Last deployed</th>
              <td mat-cell *matCellDef="let row">{{ row.updateTimestamp | date:'medium' }}</td>
            </ng-container>

            <ng-container matColumnDef="deployedBy">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Deployed by</th>
              <td mat-cell *matCellDef="let row">{{ row.deployedBy || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                <a *ngIf="row.url" [href]="row.url" target="_blank" mat-button>
                  <mat-icon>open_in_new</mat-icon>
                  Open URL
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator [pageSize]="10" [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
        </div>
      </mat-card>
    </gcp-page-layout>
  `,
  styles: [`
    .toolbar { display: flex; align-items: center; padding: 12px; gap: 12px; }
    .search-field { width: 360px; }
    .table-wrapper { overflow: auto; }
    .full-width-card { margin: 20px; }
    .service-name { display: flex; align-items: center; gap: 12px; }
    .svc-icon { color: var(--primary-color); }
    .svc-title { font-weight: 500; }
    .svc-sub { font-size: 12px; color: var(--text-secondary); }
    .status-chip { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .status-chip.ready { background: rgba(76,175,80,.15); color: #2e7d32; }
    .status-chip.unknown { background: rgba(158,158,158,.15); color: #616161; }
  `]
})
export class CloudRunServicesComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<CloudRunServiceData>([]);
  displayedColumns = ['select', 'status', 'name', 'deploymentType', 'rps', 'location', 'authentication', 'ingress', 'updated', 'deployedBy', 'actions'];
  selected = new Set<string>();
  isDemoMode$: Observable<boolean>;

  constructor(
    private cloudRun: CloudRunService,
    private authService: AuthService,
    private ga: GoogleAnalyticsService
  ) {
    this.isDemoMode$ = this.authService.isDemoMode$;
  }

  ngOnInit(): void {
    this.ga.trackPageView('/cloud-run/services', 'Cloud Run Services');
    this.refresh();
  }

  refresh(): void {
    this.cloudRun.getServices().subscribe(services => {
      this.dataSource.data = services;
      if (this.sort) this.dataSource.sort = this.sort;
      if (this.paginator) this.dataSource.paginator = this.paginator;
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = value;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearFilter() { this.dataSource.filter = ''; }

  toggle(row: CloudRunServiceData) {
    if (this.selected.has(row.name)) this.selected.delete(row.name); else this.selected.add(row.name);
  }
  isSelected(row: CloudRunServiceData) { return this.selected.has(row.name); }
  toggleAll() {
    if (this.isAllSelected()) this.selected.clear(); else this.dataSource.data.forEach(s => this.selected.add(s.name));
  }
  isAllSelected() { return this.selected.size === this.dataSource.data.length && this.dataSource.data.length > 0; }
  isIndeterminate() { return this.selected.size > 0 && !this.isAllSelected(); }
}


