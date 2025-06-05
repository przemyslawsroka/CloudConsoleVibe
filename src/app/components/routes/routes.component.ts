import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VpcService, Route } from '../../services/vpc.service';
import { CreateRouteDialogComponent } from '../create-route-dialog/create-route-dialog.component';

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
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
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
      color: #5f6368;
    }
  `]
})
export class RoutesComponent implements OnInit {
  routes: Route[] = [];
  displayedColumns: string[] = ['name', 'network', 'destRange', 'priority', 'nextHop', 'actions'];
  projectId = 'net-top-viz-demo-208511';
  isLoading = true;

  constructor(
    private vpcService: VpcService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadRoutes();
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
    const dialogRef = this.dialog.open(CreateRouteDialogComponent, {
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.vpcService.createRoute(this.projectId, result).subscribe({
          next: () => {
            this.snackBar.open('Route created successfully', 'Close', { duration: 3000 });
            this.loadRoutes();
          },
          error: (error) => {
            console.error('Error creating route:', error);
            this.snackBar.open('Error creating route', 'Close', { duration: 3000 });
          }
        });
      }
    });
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