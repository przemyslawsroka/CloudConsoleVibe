import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UrlListsService, UrlList, UrlListRequest } from '../../services/url-lists.service';
import { ProjectService, Project } from '../../services/project.service';
// import { CreateUrlListDialogComponent } from './create-url-list-dialog.component';
// import { EditUrlListDialogComponent } from './edit-url-list-dialog.component';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-url-lists',
  template: `
    <app-gcp-data-table
      [data]="urlLists"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="isLoading"
      [title]="'URL lists'"
      [subtitle]="'URL lists are shared resources that allow you to separately maintain a large set of URLs and easily apply them to any security configuration. <a href=&quot;#&quot; class=&quot;learn-more&quot;>Learn more</a>'"
      [createButtonLabel]="'Create URL list'"
      [createButtonIcon]="'add'"
      (create)="createUrlList()"
      (refresh)="refresh()"
      (rowClick)="viewListDetails($event)"
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
export class UrlListsComponent implements OnInit {
  urlLists: UrlList[] = [];
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
      key: 'purpose',
      label: 'Purpose',
      type: 'text',
      width: '150px'
    },
    {
      key: 'numberOfUrls',
      label: 'Number of URLs',
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
      action: (row) => this.viewListDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row) => this.editUrlList(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row) => this.deleteUrlList(row)
    }
  ];

  tableConfig: TableConfig = {
    showFilter: true,
    showColumnSelector: true,
    showSelection: true,
    showPagination: false,
    multiSelect: true,
    stickyHeader: true,
    emptyStateIcon: 'link',
    emptyStateTitle: 'You do not have any URL lists',
    emptyStateMessage: 'Create your first URL list to get started.',
    emptyStateAction: {
      label: 'Create URL list',
      action: () => this.createUrlList()
    }
  };

  constructor(
    private urlListsService: UrlListsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadUrlLists();
    });
  }

  loadUrlLists() {
    this.isLoading = true;
    console.log('Loading URL lists for project:', this.projectId);
    
    this.urlListsService.getUrlLists('us-central1').subscribe({
      next: (response) => {
        console.log('URL lists loaded:', response);
        console.log('Number of lists:', response?.length || 0);
        this.urlLists = this.transformUrlListsForTable(response || []);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading URL lists:', error);
        this.urlLists = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadUrlLists();
  }

  transformUrlListsForTable(urlLists: UrlList[]): any[] {
    return urlLists.map(urlList => ({
      ...urlList,
      scope: 'Global',
      purpose: 'Security',
      numberOfUrls: urlList.numberOfEntries || urlList.values?.length || 0,
      capacity: 32000,
      dateCreated: urlList.createTime ? new Date(urlList.createTime) : new Date(),
      dateModified: urlList.updateTime ? new Date(urlList.updateTime) : new Date()
    }));
  }

  onSelectionChange(selectedItems: UrlList[]) {
    console.log('Selection changed:', selectedItems);
  }

  createUrlList() {
    console.log('Create URL list functionality - placeholder');
    // TODO: Implement dialog when ready
  }

  viewListDetails(list: UrlList) {
    console.log('Viewing URL list details:', list.name);
    // TODO: Navigate to URL list details page or open details dialog
  }

  editUrlList(list: UrlList) {
    console.log('Edit URL list functionality - placeholder for:', list.name);
    // TODO: Implement dialog when ready
  }

  deleteUrlList(list: UrlList) {
    console.log('Deleting URL list:', list.name);
    
    if (confirm(`Are you sure you want to delete the URL list "${list.name}"? This action cannot be undone.`)) {
      this.isLoading = true;
      
      this.urlListsService.deleteUrlList('us-central1', list.name).subscribe({
        next: () => {
          console.log('URL list deleted successfully:', list.name);
          this.snackBar.open(`URL list "${list.name}" deleted successfully`, 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.loadUrlLists();
        },
        error: (error) => {
          console.error('Error deleting URL list:', error);
          this.snackBar.open('Failed to delete URL list', 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }
} 