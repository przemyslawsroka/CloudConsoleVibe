import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { TlsInspectionService, TlsInspectionPolicy, TlsInspectionPolicyRequest } from '../../services/tls-inspection.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { CreateTlsInspectionPolicyDialogComponent } from './create-tls-inspection-policy-dialog.component';

@Component({
  selector: 'app-tls-inspection-policies',
  template: `
    <div class="tls-inspection-container">
      <!-- Header with title -->
      <div class="header">
        <h1>TLS inspection policies</h1>
      </div>

      <!-- Description text -->
      <div class="description-text">
        <p>TLS inspection policies allow you to intercept encrypted connections between your clients and external servers. This gives you the ability to apply filtering and security controls to encrypted traffic that you can apply to unencrypted traffic. <a href="#" class="learn-more">Learn more</a></p>
      </div>

      <!-- Action buttons -->
      <div class="action-section">
        <h2>TLS inspections</h2>
        <div class="action-buttons">
          <button mat-raised-button color="primary" (click)="createTlsInspectionPolicy()">
            <mat-icon>add</mat-icon>
            Create TLS inspection policy
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Filter section -->
      <div class="filter-section">
        <button mat-stroked-button class="filter-btn">
          <mat-icon>filter_list</mat-icon>
          Filter
        </button>
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

      <!-- Empty state -->
      <div *ngIf="!isLoading && dataSource.data.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg width="200" height="150" viewBox="0 0 200 150">
            <!-- Main dashed rectangular box -->
            <rect x="40" y="35" width="120" height="80" fill="none" stroke="#dadce0" stroke-width="2" stroke-dasharray="8,4" rx="4"/>
            
            <!-- Top tab/folder element -->
            <path d="M60 35 L60 25 L100 25 L105 30 L105 35" fill="none" stroke="#dadce0" stroke-width="2" stroke-dasharray="8,4"/>
            
            <!-- Inner dashed circle -->
            <circle cx="100" cy="75" r="25" fill="none" stroke="#4285f4" stroke-width="2" stroke-dasharray="6,3" opacity="0.7"/>
          </svg>
        </div>
        <p class="empty-state-text">You do not have any policies</p>
      </div>

      <!-- Data table -->
      <div class="table-wrapper" [style.display]="isLoading || dataSource.data.length === 0 ? 'none' : 'block'">
        <table mat-table [dataSource]="dataSource" class="tls-inspection-table">
          
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

          <!-- Description column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let element">{{ element.description || '—' }}</td>
          </ng-container>

          <!-- Region column -->
          <ng-container matColumnDef="region">
            <th mat-header-cell *matHeaderCellDef>Region</th>
            <td mat-cell *matCellDef="let element">{{ element.region }}</td>
          </ng-container>

          <!-- CA pool name column -->
          <ng-container matColumnDef="caPoolName">
            <th mat-header-cell *matHeaderCellDef>CA pool name</th>
            <td mat-cell *matCellDef="let element">{{ element.caPoolName || '—' }}</td>
          </ng-container>

          <!-- In use by column -->
          <ng-container matColumnDef="inUseBy">
            <th mat-header-cell *matHeaderCellDef>In use by</th>
            <td mat-cell *matCellDef="let element">
              <span *ngIf="element.inUseBy === 0" class="usage-none">—</span>
              <span *ngIf="element.inUseBy > 0" class="usage-count">{{ element.inUseBy }} {{ element.inUseBy === 1 ? 'resource' : 'resources' }}</span>
            </td>
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
                <button mat-menu-item (click)="editTlsInspectionPolicy(element)">
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
                <button mat-menu-item (click)="deleteTlsInspectionPolicy(element)">
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
    </div>
  `,
  styles: [`
    .tls-inspection-container {
      padding: 20px;
      max-width: 100%;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }

    .header {
      margin-bottom: 16px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .description-text {
      margin: 16px 0 32px 0;
      color: #5f6368;
      font-size: 14px;
      line-height: 1.4;
    }

    .description-text p {
      margin: 0;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .action-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .action-section h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 400;
      color: #202124;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
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

    .spacer {
      flex: 1;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-state-icon {
      margin-bottom: 24px;
      opacity: 0.6;
    }

    .empty-state-text {
      font-size: 16px;
      color: #5f6368;
      margin: 0;
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .tls-inspection-table {
      width: 100%;
    }

    .mat-column-select {
      width: 48px;
    }

    .mat-column-name {
      width: 200px;
    }

    .mat-column-description {
      width: 300px;
    }

    .mat-column-region {
      width: 120px;
    }

    .mat-column-caPoolName {
      width: 180px;
    }

    .mat-column-inUseBy {
      width: 120px;
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

    .usage-none {
      color: #5f6368;
    }

    .usage-count {
      color: #202124;
      font-weight: 500;
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
  `]
})
export class TlsInspectionPoliciesComponent implements OnInit {
  tlsInspectionPolicies: TlsInspectionPolicy[] = [];
  dataSource = new MatTableDataSource<TlsInspectionPolicy>([]);
  displayedColumns: string[] = [
    'select', 'name', 'description', 'region', 'caPoolName', 'inUseBy', 'actions'
  ];
  selection = new SelectionModel<TlsInspectionPolicy>(true, []);
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private tlsInspectionService: TlsInspectionService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadTlsInspectionPolicies();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading TLS inspection policies without project');
        this.loadTlsInspectionPolicies();
      }
    }, 1000);
  }

  loadTlsInspectionPolicies() {
    this.isLoading = true;
    console.log('Loading TLS inspection policies for project:', this.projectId);
    
    this.tlsInspectionService.getTlsInspectionPolicies(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('TLS inspection policies loaded:', response);
        console.log('Number of policies:', response?.length || 0);
        this.tlsInspectionPolicies = response || [];
        
        // Recreate the dataSource to force table refresh
        this.dataSource = new MatTableDataSource<TlsInspectionPolicy>([...this.tlsInspectionPolicies]);
        
        console.log('DataSource recreated:', this.dataSource.data);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading TLS inspection policies:', error);
        this.tlsInspectionPolicies = [];
        this.dataSource = new MatTableDataSource<TlsInspectionPolicy>([]);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadTlsInspectionPolicies();
  }

  createTlsInspectionPolicy() {
    console.log('Opening create TLS inspection policy dialog');
    
    const dialogRef = this.dialog.open(CreateTlsInspectionPolicyDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((policyData: TlsInspectionPolicyRequest) => {
      if (policyData) {
        console.log('Creating TLS inspection policy with data:', policyData);
        this.isLoading = true;
        
        this.tlsInspectionService.createTlsInspectionPolicy(this.projectId || 'mock-project', policyData).subscribe({
          next: (createdPolicy) => {
            console.log('TLS inspection policy created successfully:', createdPolicy);
            this.snackBar.open(`TLS inspection policy "${createdPolicy.name}" created successfully`, 'Close', { 
              duration: 5000,
              panelClass: 'success-snackbar'
            });
            
            // Refresh the policies list
            this.loadTlsInspectionPolicies();
          },
          error: (error) => {
            console.error('Error creating TLS inspection policy:', error);
            this.snackBar.open(`Failed to create TLS inspection policy: ${error.message || 'Unknown error'}`, 'Close', { 
              duration: 5000,
              panelClass: 'error-snackbar'
            });
            this.isLoading = false;
          }
        });
      }
    });
  }

  viewPolicyDetails(policy: TlsInspectionPolicy) {
    console.log('View policy details:', policy);
    this.snackBar.open(`Viewing details for ${policy.name}`, 'Close', { duration: 3000 });
    // TODO: Navigate to policy details or open details dialog
  }

  editTlsInspectionPolicy(policy: TlsInspectionPolicy) {
    console.log('Edit TLS inspection policy:', policy);
    this.snackBar.open(`Edit functionality for ${policy.name} will be implemented`, 'Close', { duration: 3000 });
    // TODO: Implement edit dialog
  }

  deleteTlsInspectionPolicy(policy: TlsInspectionPolicy) {
    const confirmMessage = `Are you sure you want to delete the TLS inspection policy "${policy.name}"?`;
    if (confirm(confirmMessage)) {
      console.log('Deleting TLS inspection policy:', policy);
      
      this.tlsInspectionService.deleteTlsInspectionPolicy(this.projectId || 'mock-project', policy.name).subscribe({
        next: () => {
          this.snackBar.open(`TLS inspection policy "${policy.name}" deleted`, 'Close', { 
            duration: 3000,
            panelClass: 'success-snackbar'
          });
          this.loadTlsInspectionPolicies(); // Refresh the list
        },
        error: (error) => {
          console.error('Error deleting TLS inspection policy:', error);
          this.snackBar.open(`Failed to delete TLS inspection policy: ${error.message || 'Unknown error'}`, 'Close', { 
            duration: 5000,
            panelClass: 'error-snackbar'
          });
        }
      });
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