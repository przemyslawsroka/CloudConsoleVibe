import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VpcService, VpcNetwork } from '../../services/vpc.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';
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
      (rowClick)="onRowClick($event)">
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
    private projectService: ProjectService,
    private googleAnalyticsService: GoogleAnalyticsService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadVpcNetworks();
    });
    
    // Track page view
    this.googleAnalyticsService.trackPageView('/vpc', 'VPC Networks');
  }

  loadVpcNetworks() {
    if (!this.projectId) return;
    this.isLoading = true;
    
    // Track VPC list load event
    this.googleAnalyticsService.trackEvent({
      action: 'vpc_list_loaded',
      category: 'networking',
      label: 'vpc_networks',
      custom_parameters: {
        project_id: this.projectId
      }
    });
    
    this.vpcService.getVpcNetworks(this.projectId).subscribe({
      next: (response) => {
        this.vpcNetworks = response;
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Track successful load
        this.googleAnalyticsService.trackEvent({
          action: 'vpc_list_load_success',
          category: 'networking',
          label: 'vpc_networks',
          value: response.length,
          custom_parameters: {
            vpc_count: response.length,
            project_id: this.projectId
          }
        });
      },
      error: (error) => {
        console.error('Error loading VPC networks:', error);
        this.vpcNetworks = [];
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Track error
        this.googleAnalyticsService.trackError(error, 'vpc_list_load');
      }
    });
  }

  viewVpcDetails(vpc: VpcNetwork | Event) {
    if (vpc instanceof Event) {
      return;
    }
    
    // Track VPC details view
    this.googleAnalyticsService.trackEvent({
      action: 'vpc_details_viewed',
      category: 'networking',
      label: vpc.name,
      custom_parameters: {
        vpc_name: vpc.name,
        project_id: this.projectId
      }
    });
    
    this.router.navigate(['/vpc', vpc.name]);
  }

  onRowClick(vpc: VpcNetwork) {
    this.viewVpcDetails(vpc);
  }

  editVpc(vpc: VpcNetwork) {
    console.log('Edit VPC:', vpc);
    
    // Track edit attempt
    this.googleAnalyticsService.trackEvent({
      action: 'vpc_edit_attempted',
      category: 'networking',
      label: vpc.name,
      custom_parameters: {
        vpc_name: vpc.name,
        project_id: this.projectId
      }
    });
    
    // TODO: Implement edit functionality
  }

  openCreateDialog() {
    // Track VPC creation initiation
    this.googleAnalyticsService.trackEvent({
      action: 'vpc_creation_initiated',
      category: 'networking',
      label: 'create_vpc',
      custom_parameters: {
        project_id: this.projectId
      }
    });
    
    this.router.navigate(['/vpc/create']);
  }

  deleteVpc(vpc: VpcNetwork) {
    if (!this.projectId) return;
    if (confirm(`Are you sure you want to delete VPC network "${vpc.name}"?`)) {
      // Track deletion attempt
      this.googleAnalyticsService.trackEvent({
        action: 'vpc_deletion_attempted',
        category: 'networking',
        label: vpc.name,
        custom_parameters: {
          vpc_name: vpc.name,
          project_id: this.projectId
        }
      });
      
      this.vpcService.deleteVpcNetwork(this.projectId, vpc.name).subscribe({
        next: () => {
          // Track successful deletion
          this.googleAnalyticsService.trackEvent({
            action: 'vpc_deletion_success',
            category: 'networking',
            label: vpc.name,
            custom_parameters: {
              vpc_name: vpc.name,
              project_id: this.projectId
            }
          });
          
          this.loadVpcNetworks();
        },
        error: (error) => {
          console.error('Error deleting VPC network:', error);
          
          // Track deletion error
          this.googleAnalyticsService.trackError(error, 'vpc_deletion');
        }
      });
    }
  }
} 