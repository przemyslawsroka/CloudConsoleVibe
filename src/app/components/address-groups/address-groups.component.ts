import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddressGroupsService, AddressGroup, AddressGroupRequest } from '../../services/address-groups.service';
import { ProjectService, Project } from '../../services/project.service';
import { CreateAddressGroupDialogComponent } from './create-address-group-dialog.component';
import { EditAddressGroupDialogComponent } from './edit-address-group-dialog.component';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-address-groups',
  template: `
    <app-gcp-data-table
      [data]="addressGroups"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="isLoading"
      [title]="'Address groups'"
      [subtitle]="'Address groups are shared resources that allow you to separately maintain a large set of source IP ranges and easily apply them to any security configuration. <a href=&quot;#&quot; class=&quot;learn-more&quot;>Learn more</a>'"
      [createButtonLabel]="'Create address group'"
      [createButtonIcon]="'add'"
      (create)="createAddressGroup()"
      (refresh)="refresh()"
      (rowClick)="viewGroupDetails($event)"
      (selectionChange)="onSelectionChange($event)">
    </app-gcp-data-table>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }
  `]
})
export class AddressGroupsComponent implements OnInit {
  addressGroups: AddressGroup[] = [];
  projectId: string | null = null;
  isLoading = true;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      type: 'link',
      sortable: true,
      width: '200px'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      width: '300px',
      format: (value) => value || '—'
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'text',
      width: '100px'
    },
    {
      key: 'type',
      label: 'Type',
      type: 'text',
      width: '80px'
    },
    {
      key: 'purpose',
      label: 'Purpose',
      type: 'text',
      width: '150px'
    },
    {
      key: 'numberOfIpAddresses',
      label: 'Number of IP addresses',
      type: 'number',
      width: '140px'
    },
    {
      key: 'capacity',
      label: 'Capacity',
      type: 'number',
      width: '100px'
    },
    {
      key: 'dateCreated',
      label: 'Date created',
      type: 'date',
      width: '140px',
      sortable: true
    },
    {
      key: 'dateModified',
      label: 'Date modified',
      type: 'date',
      width: '140px',
      sortable: true
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View details',
      icon: 'visibility',
      action: (row) => this.viewGroupDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row) => this.editAddressGroup(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row) => this.deleteAddressGroup(row)
    }
  ];

  tableConfig: TableConfig = {
    showFilter: true,
    showColumnSelector: true,
    showSelection: true,
    showPagination: false,
    multiSelect: true,
    stickyHeader: true,
    emptyStateIcon: 'group_work',
    emptyStateTitle: 'You do not have any address groups',
    emptyStateMessage: 'Create your first address group to get started.',
    emptyStateAction: {
      label: 'Create address group',
      action: () => this.createAddressGroup()
    }
  };

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
      this.loadAddressGroups();
    });
  }

  loadAddressGroups() {
    this.isLoading = true;
    console.log('Loading address groups for project:', this.projectId);
    
    this.addressGroupsService.getAddressGroups(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Address groups loaded:', response);
        console.log('Number of groups:', response?.length || 0);
        this.addressGroups = response || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading address groups:', error);
        this.addressGroups = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadAddressGroups();
  }

  onSelectionChange(selectedItems: AddressGroup[]) {
    console.log('Selection changed:', selectedItems);
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
          this.loadAddressGroups();
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
} 