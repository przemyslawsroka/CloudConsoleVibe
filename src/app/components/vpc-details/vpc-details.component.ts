import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VpcService, VpcNetwork, SubnetDetails } from '../../services/vpc.service';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-vpc-details',
  template: `
    <div class="vpc-details-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>VPC Network Details</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="editVpcNetwork()" *ngIf="vpcNetwork">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <mat-card *ngIf="!isLoading && vpcNetwork">
        <mat-card-content>
          <div class="details-grid">
            <div class="detail-item">
              <h3>Name</h3>
              <p>{{vpcNetwork.name}}</p>
            </div>
            <div class="detail-item">
              <h3>Description</h3>
              <p>{{vpcNetwork.description || 'No description'}}</p>
            </div>
            <div class="detail-item">
              <h3>Auto Create Subnetworks</h3>
              <p>{{vpcNetwork.autoCreateSubnetworks ? 'Yes' : 'No'}}</p>
            </div>
            <div class="detail-item">
              <h3>Created</h3>
              <p>{{vpcNetwork.creationTimestamp | date}}</p>
            </div>
            <div class="detail-item">
              <h3>Routing Mode</h3>
              <p>{{vpcNetwork.routingConfig?.routingMode || 'Global'}}</p>
            </div>
            <div class="detail-item">
              <h3>Network Firewall Policy Enforcement</h3>
              <p>{{getFirewallPolicyEnforcementDisplay(vpcNetwork.networkFirewallPolicyEnforcementOrder)}}</p>
            </div>
          </div>

          <div class="subnetworks-section">
            <div class="section-header">
              <h2>Subnetworks</h2>
              <button mat-raised-button color="primary" (click)="createSubnetwork()">
                <mat-icon>add</mat-icon>
                Create Subnetwork
              </button>
            </div>

            <table mat-table [dataSource]="vpcNetwork.subnetDetails || []" class="mat-elevation-z8">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let subnet">{{subnet.name}}</td>
              </ng-container>

              <ng-container matColumnDef="region">
                <th mat-header-cell *matHeaderCellDef>Region</th>
                <td mat-cell *matCellDef="let subnet">{{getRegionName(subnet.region)}}</td>
              </ng-container>

              <ng-container matColumnDef="ipRange">
                <th mat-header-cell *matHeaderCellDef>IP Range</th>
                <td mat-cell *matCellDef="let subnet">{{subnet.ipCidrRange}}</td>
              </ng-container>

              <ng-container matColumnDef="gateway">
                <th mat-header-cell *matHeaderCellDef>Gateway</th>
                <td mat-cell *matCellDef="let subnet">{{subnet.gatewayAddress}}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let subnet">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewSubnetDetails(subnet)">
                      <mat-icon>visibility</mat-icon>
                      <span>View Details</span>
                    </button>
                    <button mat-menu-item (click)="deleteSubnet(subnet)">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div *ngIf="!vpcNetwork.subnetDetails?.length" class="no-subnets">
              <p>No subnetworks found</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .vpc-details-container {
      padding: 20px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      justify-content: space-between;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .detail-item h3 {
      color: #5f6368;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .detail-item p {
      font-size: 16px;
      margin: 0;
    }
    .subnetworks-section {
      margin-top: 30px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .section-header h2 {
      font-size: 18px;
      margin: 0;
    }
    table {
      width: 100%;
    }
    .mat-column-actions {
      width: 80px;
      text-align: center;
    }
    .no-subnets {
      text-align: center;
      padding: 20px;
      color: #5f6368;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
  `]
})
export class VpcDetailsComponent implements OnInit {
  vpcNetwork: VpcNetwork | null = null;
  projectId: string | null = null;
  displayedColumns: string[] = ['name', 'region', 'ipRange', 'gateway', 'actions'];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vpcService: VpcService,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      const networkName = this.route.snapshot.paramMap.get('name');
      if (networkName && this.projectId) {
        this.loadVpcNetwork(networkName);
      }
    });
  }

  getRegionName(regionUrl: string): string {
    const parts = regionUrl.split('/');
    const regionIndex = parts.findIndex(part => part === 'regions');
    return regionIndex !== -1 ? parts[regionIndex + 1] : regionUrl;
  }

  loadVpcNetwork(networkName: string) {
    if (!this.projectId) return;
    this.isLoading = true;
    this.vpcService.getVpcNetwork(this.projectId, networkName).subscribe({
      next: (vpc) => {
        this.vpcNetwork = vpc;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading VPC network:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  createSubnetwork() {
    // TODO: Implement create subnetwork dialog
    console.log('Create subnetwork clicked');
  }

  viewSubnetDetails(subnet: SubnetDetails) {
    // TODO: Implement view subnet details
    console.log('View subnet details:', subnet);
  }

  deleteSubnet(subnet: SubnetDetails) {
    if (confirm(`Are you sure you want to delete subnetwork "${subnet.name}"?`)) {
      // TODO: Implement delete subnet
      console.log('Delete subnet:', subnet);
    }
  }

  goBack() {
    window.history.back();
  }

  getFirewallPolicyEnforcementDisplay(order?: string): string {
    if (!order) {
      return 'After Classic Firewall (default)';
    }
    
    switch (order) {
      case 'AFTER_CLASSIC_FIREWALL':
        return 'After Classic Firewall';
      case 'BEFORE_CLASSIC_FIREWALL':
        return 'Before Classic Firewall';
      default:
        return order;
    }
  }

  editVpcNetwork() {
    if (!this.vpcNetwork) return;
    
    // Navigate to the edit page
    this.router.navigate(['/vpc', this.vpcNetwork.name, 'edit']);
  }
} 