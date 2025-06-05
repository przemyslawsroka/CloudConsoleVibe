import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { CloudArmorService, CloudArmorPolicy, CloudArmorPolicyRequest } from '../../services/cloud-armor.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { CreateCloudArmorPolicyDialogComponent } from './create-cloud-armor-policy-dialog.component';

@Component({
  selector: 'app-cloud-armor-policies',
  template: `
    <div class="cloud-armor-container">
      <!-- Header with title and action buttons -->
      <div class="header">
        <h1>Cloud Armor policies</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createPolicy()">
            <mat-icon>add</mat-icon>
            Create policy
          </button>
          <button mat-icon-button (click)="deleteSelected()" [disabled]="selection.isEmpty()" matTooltip="Delete policy">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Info banner -->
      <div class="info-banner">
        <mat-icon class="info-icon">info</mat-icon>
        <div class="info-content">
          <span>Cloud Armor advanced network DDoS protection is now generally available to protect applications and services using Network Load Balancer, Protocol Forwarding, or VMs with Public IP.</span>
          <a href="#" class="learn-more">Learn more</a>
        </div>
        <button mat-icon-button class="dismiss-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Description text -->
      <div class="description-text">
        <p>Security policies let you control access to your Google Cloud resources at your network's edge, including internal Load Balancers.</p>
        <p>You can use security policies to protect workloads on external Cloud Load Balancing deployments, Protocol forwarding deployments, or instances with public IP addresses. <a href="#" class="learn-more">Learn more</a></p>
      </div>

      <!-- Filter section -->
      <div class="filter-section">
        <button mat-stroked-button class="filter-btn">
          <mat-icon>filter_list</mat-icon>
          Filter
        </button>
        <mat-form-field appearance="outline" class="filter-input">
          <mat-label>Enter property name or value</mat-label>
          <input matInput (input)="applyFilter($event)" placeholder="Enter property name or value">
        </mat-form-field>
        <div class="spacer"></div>
        <button mat-icon-button matTooltip="Show filter options">
          <mat-icon>help_outline</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Column display options">
          <mat-icon>view_column</mat-icon>
        </button>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <!-- Data table -->
      <div class="table-wrapper" [style.display]="isLoading ? 'none' : 'block'">
        <table mat-table [dataSource]="dataSource" class="policies-table">
          
          <!-- Checkbox column -->
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

          <!-- Name column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let element">
              <a class="policy-link" (click)="viewPolicyDetails(element)">{{ element.name }}</a>
            </td>
          </ng-container>

          <!-- Type column -->
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let element">{{ element.type }}</td>
          </ng-container>

          <!-- Scope column -->
          <ng-container matColumnDef="scope">
            <th mat-header-cell *matHeaderCellDef>Scope</th>
            <td mat-cell *matCellDef="let element">{{ element.scope }}</td>
          </ng-container>

          <!-- Rules column -->
          <ng-container matColumnDef="rules">
            <th mat-header-cell *matHeaderCellDef>Rules</th>
            <td mat-cell *matCellDef="let element">{{ element.rules }}</td>
          </ng-container>

          <!-- Targets column -->
          <ng-container matColumnDef="targets">
            <th mat-header-cell *matHeaderCellDef>
              Targets
              <mat-icon matTooltip="Number of targets using this policy" class="help-icon">help_outline</mat-icon>
            </th>
            <td mat-cell *matCellDef="let element">{{ element.targets }}</td>
          </ng-container>

          <!-- Description column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let element">{{ element.description || '—' }}</td>
          </ng-container>

          <!-- Actions column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button [matMenuTriggerFor]="actionMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu">
                <button mat-menu-item (click)="viewPolicyDetails(element)">
                  <mat-icon>visibility</mat-icon>
                  View details
                </button>
                <button mat-menu-item (click)="editPolicy(element)">
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
                <button mat-menu-item (click)="deletePolicy(element)">
                  <mat-icon>delete</mat-icon>
                  Delete
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <div *ngIf="dataSource.data.length === 0 && !isLoading" class="no-data">
        <p>No Cloud Armor policies found</p>
      </div>
    </div>
  `,
  styles: [`
    .cloud-armor-container {
      padding: 20px;
      max-width: 100%;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .info-banner {
      display: flex;
      align-items: center;
      background-color: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .info-icon {
      color: #1976d2;
      margin-right: 12px;
    }

    .info-content {
      flex: 1;
      font-size: 14px;
      color: #202124;
    }

    .dismiss-btn {
      color: #5f6368;
    }

    .description-text {
      margin: 16px 0;
      color: #5f6368;
      font-size: 14px;
      line-height: 1.4;
    }

    .description-text p {
      margin: 8px 0;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .filter-section {
      display: flex;
      align-items: center;
      margin: 16px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .filter-btn {
      margin-right: 16px;
    }

    .filter-input {
      width: 300px;
      margin-right: 16px;
    }

    .spacer {
      flex: 1;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .policies-table {
      width: 100%;
    }

    .mat-column-select {
      width: 48px;
    }

    .mat-column-name {
      width: 200px;
    }

    .mat-column-type {
      width: 180px;
    }

    .mat-column-scope {
      width: 100px;
    }

    .mat-column-rules {
      width: 80px;
    }

    .mat-column-targets {
      width: 100px;
    }

    .mat-column-description {
      width: 300px;
    }

    .mat-column-actions {
      width: 48px;
    }

    .policy-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .policy-link:hover {
      text-decoration: underline;
    }

    .help-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-left: 4px;
      color: #5f6368;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #5f6368;
    }

    /* Header styling */
    ::ng-deep .mat-header-cell {
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 16px;
    }

    ::ng-deep .mat-cell {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f3f4;
    }

    ::ng-deep .mat-row:hover {
      background-color: #f8f9fa;
    }

    /* Remove default table styling */
    ::ng-deep .mat-table {
      background: transparent;
    }

    ::ng-deep .mat-header-row {
      background-color: #f8f9fa;
    }

    /* Form field styling */
    ::ng-deep .filter-input .mat-form-field-wrapper {
      padding-bottom: 0;
    }

    ::ng-deep .filter-input .mat-form-field-infix {
      border-top: none;
    }
  `]
})
export class CloudArmorPoliciesComponent implements OnInit {
  cloudArmorPolicies: CloudArmorPolicy[] = [];
  dataSource = new MatTableDataSource<CloudArmorPolicy>([]);
  displayedColumns: string[] = [
    'select', 'name', 'type', 'scope', 'rules', 'targets', 'description', 'actions'
  ];
  selection = new SelectionModel<CloudArmorPolicy>(true, []);
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private cloudArmorService: CloudArmorService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadCloudArmorPolicies();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading Cloud Armor policies without project');
        this.loadCloudArmorPolicies();
      }
    }, 1000);
  }

  trackByName(index: number, item: CloudArmorPolicy): string {
    return item.name;
  }

  loadCloudArmorPolicies() {
    this.isLoading = true;
    console.log('Loading Cloud Armor policies for project:', this.projectId);
    
    this.cloudArmorService.getCloudArmorPolicies(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Cloud Armor policies loaded:', response);
        console.log('Number of policies:', response?.length || 0);
        this.cloudArmorPolicies = response || [];
        
        // Recreate the dataSource to force table refresh
        this.dataSource = new MatTableDataSource<CloudArmorPolicy>([...this.cloudArmorPolicies]);
        
        console.log('DataSource recreated:', this.dataSource.data);
        console.log('Component cloudArmorPolicies:', this.cloudArmorPolicies);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading Cloud Armor policies:', error);
        this.cloudArmorPolicies = [];
        this.dataSource = new MatTableDataSource<CloudArmorPolicy>([]);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  refresh() {
    this.loadCloudArmorPolicies();
  }

  createPolicy() {
    console.log('Opening create Cloud Armor policy dialog');
    
    const dialogRef = this.dialog.open(CreateCloudArmorPolicyDialogComponent, {
      width: '1200px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((policyData: CloudArmorPolicyRequest) => {
      if (policyData) {
        console.log('Creating policy with data:', policyData);
        this.isLoading = true;
        
        this.cloudArmorService.createCloudArmorPolicy(this.projectId || 'mock-project', policyData).subscribe({
          next: (createdPolicy) => {
            console.log('Policy created successfully:', createdPolicy);
            this.snackBar.open(`Policy "${createdPolicy.name}" created successfully`, 'Close', { 
              duration: 5000,
              panelClass: 'success-snackbar'
            });
            
            // Refresh the policies list
            this.loadCloudArmorPolicies();
          },
          error: (error) => {
            console.error('Error creating policy:', error);
            this.snackBar.open(`Failed to create policy: ${error.message || 'Unknown error'}`, 'Close', { 
              duration: 5000,
              panelClass: 'error-snackbar'
            });
            this.isLoading = false;
          }
        });
      }
    });
  }

  viewPolicyDetails(policy: CloudArmorPolicy) {
    console.log('View policy details:', policy);
    this.snackBar.open(`Viewing details for ${policy.name}`, 'Close', { duration: 3000 });
    // TODO: Navigate to policy details or open details dialog
  }

  editPolicy(policy: CloudArmorPolicy) {
    console.log('Edit policy:', policy);
    this.snackBar.open(`Editing ${policy.name}`, 'Close', { duration: 3000 });
    // TODO: Implement edit policy functionality
  }

  deletePolicy(policy: CloudArmorPolicy) {
    const confirmMessage = `Are you sure you want to delete the policy "${policy.name}"?`;
    if (confirm(confirmMessage)) {
      console.log('Deleting policy:', policy);
      this.snackBar.open(`Policy "${policy.name}" deleted`, 'Close', { duration: 3000 });
      // TODO: Implement actual delete functionality
    }
  }

  deleteSelected() {
    const selectedPolicies = this.selection.selected;
    if (selectedPolicies.length === 0) return;

    const confirmMessage = selectedPolicies.length === 1 
      ? `Are you sure you want to delete the policy "${selectedPolicies[0].name}"?`
      : `Are you sure you want to delete ${selectedPolicies.length} policies?`;

    if (confirm(confirmMessage)) {
      console.log('Deleting policies:', selectedPolicies);
      this.snackBar.open(`Deleted ${selectedPolicies.length} policy(ies)`, 'Close', { duration: 3000 });
      // TODO: Implement actual delete functionality
      this.selection.clear();
    }
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
} 