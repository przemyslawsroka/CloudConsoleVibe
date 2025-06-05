import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { AddressGroupsService, AddressGroup, AddressGroupRequest } from '../../services/address-groups.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { CreateAddressGroupDialogComponent } from './create-address-group-dialog.component';
import { EditAddressGroupDialogComponent } from './edit-address-group-dialog.component';

@Component({
  selector: 'app-address-groups',
  template: `
    <div class="address-groups-container">
      <!-- Header with title and description -->
      <div class="header">
        <h1>Address groups</h1>
      </div>

      <!-- Description text -->
      <div class="description-text">
        <p>Address groups are shared resources that allow you to separately maintain a large set of source IP ranges and easily apply them to any security configuration. <a href="#" class="learn-more">Learn more</a></p>
      </div>

      <!-- Action buttons -->
      <div class="action-section">
        <h2>Address groups</h2>
        <div class="action-buttons">
          <button mat-raised-button color="primary" (click)="createAddressGroup()">
            <mat-icon>add</mat-icon>
            Create address group
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
            <ellipse cx="100" cy="75" rx="80" ry="40" fill="none" stroke="#dadce0" stroke-width="2" stroke-dasharray="10,5"/>
          </svg>
        </div>
        <p class="empty-state-text">You do not have any address groups</p>
      </div>

      <!-- Data table -->
      <div class="table-wrapper" [style.display]="isLoading || dataSource.data.length === 0 ? 'none' : 'block'">
        <table mat-table [dataSource]="dataSource" class="address-groups-table">
          
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
              <a class="group-link" (click)="viewGroupDetails(element)">{{ element.name }}</a>
            </td>
          </ng-container>

          <!-- Description column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let element">{{ element.description || '—' }}</td>
          </ng-container>

          <!-- Scope column -->
          <ng-container matColumnDef="scope">
            <th mat-header-cell *matHeaderCellDef>Scope</th>
            <td mat-cell *matCellDef="let element">{{ element.scope }}</td>
          </ng-container>

          <!-- Type column -->
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let element">{{ element.type }}</td>
          </ng-container>

          <!-- Purpose column -->
          <ng-container matColumnDef="purpose">
            <th mat-header-cell *matHeaderCellDef>Purpose</th>
            <td mat-cell *matCellDef="let element">{{ element.purpose }}</td>
          </ng-container>

          <!-- Number of IP addresses column -->
          <ng-container matColumnDef="numberOfIpAddresses">
            <th mat-header-cell *matHeaderCellDef>Number of IP addresses</th>
            <td mat-cell *matCellDef="let element">{{ element.numberOfIpAddresses }}</td>
          </ng-container>

          <!-- Capacity column -->
          <ng-container matColumnDef="capacity">
            <th mat-header-cell *matHeaderCellDef>Capacity</th>
            <td mat-cell *matCellDef="let element">{{ element.capacity }}</td>
          </ng-container>

          <!-- Date created column -->
          <ng-container matColumnDef="dateCreated">
            <th mat-header-cell *matHeaderCellDef>Date created</th>
            <td mat-cell *matCellDef="let element">{{ formatDate(element.dateCreated) }}</td>
          </ng-container>

          <!-- Date modified column -->
          <ng-container matColumnDef="dateModified">
            <th mat-header-cell *matHeaderCellDef>Date modified</th>
            <td mat-cell *matCellDef="let element">{{ formatDate(element.dateModified) }}</td>
          </ng-container>

          <!-- Actions column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button [matMenuTriggerFor]="actionMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu">
                <button mat-menu-item (click)="viewGroupDetails(element)">
                  <mat-icon>visibility</mat-icon>
                  View details
                </button>
                <button mat-menu-item (click)="editAddressGroup(element)">
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
                <button mat-menu-item (click)="deleteAddressGroup(element)">
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
    .address-groups-container {
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

    .address-groups-table {
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

    .mat-column-scope {
      width: 100px;
    }

    .mat-column-type {
      width: 80px;
    }

    .mat-column-purpose {
      width: 150px;
    }

    .mat-column-numberOfIpAddresses {
      width: 140px;
    }

    .mat-column-capacity {
      width: 100px;
    }

    .mat-column-dateCreated {
      width: 140px;
    }

    .mat-column-dateModified {
      width: 140px;
    }

    .mat-column-actions {
      width: 48px;
    }

    .group-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .group-link:hover {
      text-decoration: underline;
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
export class AddressGroupsComponent implements OnInit {
  addressGroups: AddressGroup[] = [];
  dataSource = new MatTableDataSource<AddressGroup>([]);
  displayedColumns: string[] = [
    'select', 'name', 'description', 'scope', 'type', 'purpose', 
    'numberOfIpAddresses', 'capacity', 'dateCreated', 'dateModified', 'actions'
  ];
  selection = new SelectionModel<AddressGroup>(true, []);
  projectId: string | null = null;
  isLoading = true;

  constructor(
    private addressGroupsService: AddressGroupsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadAddressGroups();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading address groups without project');
        this.loadAddressGroups();
      }
    }, 1000);
  }

  loadAddressGroups() {
    this.isLoading = true;
    console.log('Loading address groups for project:', this.projectId);
    
    this.addressGroupsService.getAddressGroups(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Address groups loaded:', response);
        console.log('Number of groups:', response?.length || 0);
        this.addressGroups = response || [];
        
        // Recreate the dataSource to force table refresh
        this.dataSource = new MatTableDataSource<AddressGroup>([...this.addressGroups]);
        
        console.log('DataSource recreated:', this.dataSource.data);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading address groups:', error);
        this.addressGroups = [];
        this.dataSource = new MatTableDataSource<AddressGroup>([]);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadAddressGroups();
  }

  createAddressGroup() {
    console.log('Opening create address group dialog');
    
    const dialogRef = this.dialog.open(CreateAddressGroupDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((groupData: AddressGroupRequest) => {
      if (groupData) {
        console.log('Creating address group with data:', groupData);
        this.isLoading = true;
        
        this.addressGroupsService.createAddressGroup(this.projectId || 'mock-project', groupData).subscribe({
          next: (createdGroup) => {
            console.log('Address group created successfully:', createdGroup);
            this.snackBar.open(`Address group "${createdGroup.name}" created successfully`, 'Close', { 
              duration: 5000,
              panelClass: 'success-snackbar'
            });
            
            // Refresh the address groups list
            this.loadAddressGroups();
          },
          error: (error) => {
            console.error('Error creating address group:', error);
            this.snackBar.open(`Failed to create address group: ${error.message || 'Unknown error'}`, 'Close', { 
              duration: 5000,
              panelClass: 'error-snackbar'
            });
            this.isLoading = false;
          }
        });
      }
    });
  }

  viewGroupDetails(group: AddressGroup) {
    console.log('View group details:', group);
    this.snackBar.open(`Viewing details for ${group.name}`, 'Close', { duration: 3000 });
    // TODO: Navigate to group details or open details dialog
  }

  editAddressGroup(group: AddressGroup) {
    console.log('Opening edit address group dialog for:', group);
    
    const dialogRef = this.dialog.open(EditAddressGroupDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { addressGroup: group }
    });

    dialogRef.afterClosed().subscribe((updateData: Partial<AddressGroupRequest> & { name: string }) => {
      if (updateData) {
        console.log('Updating address group with data:', updateData);
        this.isLoading = true;
        
        this.addressGroupsService.updateAddressGroup(
          this.projectId || 'mock-project', 
          updateData.name, 
          updateData
        ).subscribe({
          next: (updatedGroup) => {
            console.log('Address group updated successfully:', updatedGroup);
            this.snackBar.open(`Address group "${updatedGroup.name}" updated successfully`, 'Close', { 
              duration: 5000,
              panelClass: 'success-snackbar'
            });
            
            // Refresh the address groups list
            this.loadAddressGroups();
          },
          error: (error) => {
            console.error('Error updating address group:', error);
            this.snackBar.open(`Failed to update address group: ${error.message || 'Unknown error'}`, 'Close', { 
              duration: 5000,
              panelClass: 'error-snackbar'
            });
            this.isLoading = false;
          }
        });
      }
    });
  }

  deleteAddressGroup(group: AddressGroup) {
    const confirmMessage = `Are you sure you want to delete the address group "${group.name}"?`;
    if (confirm(confirmMessage)) {
      console.log('Deleting address group:', group);
      
      this.addressGroupsService.deleteAddressGroup(this.projectId || 'mock-project', group.name).subscribe({
        next: () => {
          this.snackBar.open(`Address group "${group.name}" deleted`, 'Close', { 
            duration: 3000,
            panelClass: 'success-snackbar'
          });
          this.loadAddressGroups(); // Refresh the list
        },
        error: (error) => {
          console.error('Error deleting address group:', error);
          this.snackBar.open(`Failed to delete address group: ${error.message || 'Unknown error'}`, 'Close', { 
            duration: 5000,
            panelClass: 'error-snackbar'
          });
        }
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '—';
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