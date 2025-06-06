import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VpcService, VpcNetwork } from '../../services/vpc.service';
import { Router } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-vpc-list',
  template: `
    <div class="vpc-container">
      <div class="header">
        <h1>VPC Networks</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Add VPC Network
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <table *ngIf="!isLoading" mat-table [dataSource]="vpcNetworks" class="mat-elevation-z8">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let vpc">
                <a (click)="viewVpcDetails(vpc)">{{vpc.name}}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let vpc">{{vpc.description || '-'}}</td>
            </ng-container>

            <ng-container matColumnDef="subnetworks">
              <th mat-header-cell *matHeaderCellDef>Subnetworks</th>
              <td mat-cell *matCellDef="let vpc">{{vpc.subnetworks.length}}</td>
            </ng-container>

            <ng-container matColumnDef="creationTimestamp">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let vpc">{{vpc.creationTimestamp | date}}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let vpc">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewVpcDetails(vpc)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="deleteVpc(vpc)">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="!isLoading && vpcNetworks.length === 0" class="no-networks">
            <p>No VPC networks found</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .vpc-container {
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
    a {
      color: #1a73e8;
      cursor: pointer;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
    .no-networks {
      text-align: center;
      padding: 20px;
      color: #5f6368;
    }
  `]
})
export class VpcListComponent implements OnInit {
  vpcNetworks: VpcNetwork[] = [];
  displayedColumns: string[] = ['name', 'description', 'subnetworks', 'creationTimestamp', 'actions'];
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private vpcService: VpcService,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadVpcNetworks();
    });
  }

  loadVpcNetworks() {
    if (!this.projectId) return;
    this.isLoading = true;
    this.vpcService.getVpcNetworks(this.projectId).subscribe({
      next: (response) => {
        this.vpcNetworks = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading VPC networks:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewVpcDetails(vpc: VpcNetwork) {
    this.router.navigate(['/vpc', vpc.name]);
  }

  openCreateDialog() {
    this.router.navigate(['/vpc/create']);
  }

  deleteVpc(vpc: VpcNetwork) {
    if (!this.projectId) return;
    if (confirm(`Are you sure you want to delete VPC network "${vpc.name}"?`)) {
      this.vpcService.deleteVpcNetwork(this.projectId, vpc.name).subscribe({
        next: () => {
          this.loadVpcNetworks();
        },
        error: (error) => {
          console.error('Error deleting VPC network:', error);
        }
      });
    }
  }
} 