import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VpcService, VpcNetwork } from '../../services/vpc.service';
import { Router } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-vpc-list',
  template: `
    <app-gcp-data-table
      [data]="vpcNetworks"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="isLoading"
      [title]="'VPC Networks'"
      [subtitle]="'VPC networks are global resources. Each VPC network is subdivided into subnets, and each subnet is contained within a single region. You can have more than one subnet in a region for a given VPC network. <a href=&quot;#&quot; class=&quot;learn-more&quot;>Learn more</a>'"
      [createButtonLabel]="'Create VPC Network'"
      [createButtonIcon]="'add'"
      (create)="openCreateDialog()"
      (refresh)="loadVpcNetworks()"
      (rowClick)="viewVpcDetails($event)">
    </app-gcp-data-table>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }
  `]
})
export class VpcListComponent implements OnInit {
  vpcNetworks: VpcNetwork[] = [];
  projectId: string | null = null;
  isLoading = true;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      type: 'link',
      sortable: true,
      width: '250px'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      width: '300px',
      format: (value) => value || '—'
    },
    {
      key: 'subnetworks',
      label: 'Subnets',
      type: 'number',
      width: '120px',
      format: (value) => Array.isArray(value) ? value.length.toString() : (value || '0')
    },
    {
      key: 'routingMode',
      label: 'Mode',
      type: 'text',
      width: '120px',
      format: (value) => value === 'GLOBAL' ? 'Global' : 'Regional'
    },
    {
      key: 'ipv4Range',
      label: 'IPv4 range',
      type: 'text',
      width: '150px',
      format: (value) => value || 'Custom'
    },
    {
      key: 'gatewayIPv4',
      label: 'Gateway IPv4',
      type: 'text',
      width: '150px'
    },
    {
      key: 'creationTimestamp',
      label: 'Created',
      type: 'date',
      width: '140px',
      sortable: true
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View Details',
      icon: 'visibility',
      action: (row) => this.viewVpcDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row) => this.editVpc(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row) => this.deleteVpc(row)
    }
  ];

  tableConfig: TableConfig = {
    showFilter: true,
    showColumnSelector: true,
    showSelection: true,
    showPagination: false,
    multiSelect: true,
    stickyHeader: true,
    emptyStateIcon: 'cloud',
    emptyStateTitle: 'No VPC networks found',
    emptyStateMessage: 'Create your first VPC network to get started.',
    emptyStateAction: {
      label: 'Create VPC Network',
      action: () => this.openCreateDialog()
    }
  };

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
        this.vpcNetworks = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewVpcDetails(vpc: VpcNetwork) {
    this.router.navigate(['/vpc', vpc.name]);
  }

  editVpc(vpc: VpcNetwork) {
    console.log('Edit VPC:', vpc);
    // TODO: Implement edit functionality
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