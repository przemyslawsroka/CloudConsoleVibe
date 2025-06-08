import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, NavigationEnd } from '@angular/router';
import { VpcService, Route } from '../../services/vpc.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-routes',
  template: `
    <div class="routes-container">
      <div class="header">
        <h1>Routes</h1>
        <button mat-raised-button color="primary" (click)="createRoute()">
          <mat-icon>add</mat-icon>
          Create Route
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <table *ngIf="!isLoading" mat-table [dataSource]="routes" class="mat-elevation-z8">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let route">{{route.name}}</td>
            </ng-container>

            <ng-container matColumnDef="network">
              <th mat-header-cell *matHeaderCellDef>Network</th>
              <td mat-cell *matCellDef="let route">{{getNetworkName(route.network)}}</td>
            </ng-container>

            <ng-container matColumnDef="destRange">
              <th mat-header-cell *matHeaderCellDef>Destination Range</th>
              <td mat-cell *matCellDef="let route">{{route.destRange}}</td>
            </ng-container>

            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef>Priority</th>
              <td mat-cell *matCellDef="let route">{{route.priority}}</td>
            </ng-container>

            <ng-container matColumnDef="nextHop">
              <th mat-header-cell *matHeaderCellDef>Next Hop</th>
              <td mat-cell *matCellDef="let route">{{getNextHop(route)}}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let route">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewRouteDetails(route)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="deleteRoute(route)">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="!isLoading && routes.length === 0" class="no-routes">
            <p>No routes found</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .routes-container {
      padding: 20px;
      background: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      color: var(--text-color);
      margin: 0;
    }
    
    table {
      width: 100%;
    }
    .mat-column-actions {
      width: 80px;
      text-align: center;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
    .no-routes {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary-color);
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

      .mat-mdc-row:hover {
        background: var(--hover-color);
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
    }
  `]
})
export class RoutesComponent implements OnInit, OnDestroy {
  routes: Route[] = [];
  displayedColumns: string[] = ['name', 'network', 'destRange', 'priority', 'nextHop', 'actions'];
  projectId = 'net-top-viz-demo-208511';
  isLoading = true;
  private routerSubscription!: Subscription;

  constructor(
    private vpcService: VpcService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadRoutes();
    
    // Listen for navigation events to refresh data when returning from create page
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEvent = event as NavigationEnd;
        if (navigationEvent.url === '/routes') {
          this.loadRoutes();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadRoutes() {
    this.isLoading = true;
    this.vpcService.getRoutes(this.projectId).subscribe({
      next: (routes) => {
        this.routes = routes;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading routes:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Error loading routes', 'Close', { duration: 3000 });
      }
    });
  }

  getNetworkName(networkUrl: string): string {
    const parts = networkUrl.split('/');
    return parts[parts.length - 1];
  }

  getNextHop(route: Route): string {
    if (route.nextHopInstance) return 'Instance: ' + this.getResourceName(route.nextHopInstance);
    if (route.nextHopIp) return 'IP: ' + route.nextHopIp;
    if (route.nextHopNetwork) return 'Network: ' + this.getResourceName(route.nextHopNetwork);
    if (route.nextHopGateway) return 'Gateway: ' + this.getResourceName(route.nextHopGateway);
    if (route.nextHopVpnTunnel) return 'VPN Tunnel: ' + this.getResourceName(route.nextHopVpnTunnel);
    if (route.nextHopIlb) return 'Internal Load Balancer: ' + this.getResourceName(route.nextHopIlb);
    return 'None';
  }

  private getResourceName(resourceUrl: string): string {
    const parts = resourceUrl.split('/');
    return parts[parts.length - 1];
  }

  createRoute() {
    this.router.navigate(['/routes/create']);
  }

  viewRouteDetails(route: Route) {
    // TODO: Implement view route details
    console.log('View route details:', route);
  }

  deleteRoute(route: Route) {
    if (confirm(`Are you sure you want to delete route "${route.name}"?`)) {
      // TODO: Implement delete route
      console.log('Delete route:', route);
    }
  }
} 