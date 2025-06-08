import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoadBalancerService, LoadBalancer } from '../../services/load-balancer.service';
import { ProjectService, Project } from '../../services/project.service';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-load-balancing',
  template: `
    <app-gcp-data-table
      [data]="loadBalancers"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="isLoading"
      [title]="'Load balancing'"
      [subtitle]="'Cloud Load Balancing distributes user traffic across multiple instances of your applications to reduce risk, deliver better performance, and provide global availability. <a href=&quot;#&quot; class=&quot;learn-more&quot;>Learn more</a>'"
      [createButtonLabel]="'Create load balancer'"
      [createButtonIcon]="'add'"
      (create)="createLoadBalancer()"
      (refresh)="refresh()"
      (rowClick)="viewLoadBalancerDetails($event)">
    </app-gcp-data-table>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }
  `]
})
export class LoadBalancingComponent implements OnInit {
  loadBalancers: LoadBalancer[] = [];
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
      key: 'typeDisplay',
      label: 'Type',
      type: 'text',
      width: '180px'
    },
    {
      key: 'accessType',
      label: 'Access type',
      type: 'badge',
      width: '120px'
    },
    {
      key: 'protocols',
      label: 'Protocols',
      type: 'text',
      width: '120px',
      format: (value) => Array.isArray(value) ? value.join(', ') : value
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text',
      width: '120px',
      format: (value) => value || 'Global'
    },
    {
      key: 'backendSummary',
      label: 'Backend services',
      type: 'text',
      width: '300px'
    },
    {
      key: 'backendStatus',
      label: 'Backend status',
      type: 'status',
      width: '140px'
    },
    {
      key: 'creationTime',
      label: 'Created',
      type: 'date',
      width: '140px',
      sortable: true
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View details',
      icon: 'visibility',
      action: (row) => this.viewLoadBalancerDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row) => this.editLoadBalancer(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row) => this.deleteLoadBalancer(row)
    }
  ];

  tableConfig: TableConfig = {
    showFilter: true,
    showColumnSelector: true,
    showSelection: true,
    showPagination: true,
    pageSize: 25,
    multiSelect: true,
    stickyHeader: true,
    emptyStateIcon: 'balance',
    emptyStateTitle: 'No load balancers found',
    emptyStateMessage: 'Create your first load balancer to get started.',
    emptyStateAction: {
      label: 'Create load balancer',
      action: () => this.createLoadBalancer()
    }
  };

  constructor(
    private loadBalancerService: LoadBalancerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    console.log('LoadBalancingComponent initialized');
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadLoadBalancers();
    });
  }

  loadLoadBalancers() {
    console.log('Loading load balancers for project:', this.projectId);
    this.isLoading = true;
    
    this.loadBalancerService.getLoadBalancers().subscribe({
      next: (response) => {
        console.log('Load balancers loaded:', response);
        this.loadBalancers = response || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading load balancers:', error);
        this.loadBalancers = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadLoadBalancers();
  }

  createLoadBalancer() {
    console.log('Navigate to create load balancer');
    this.router.navigate(['/load-balancing/create']);
  }

  viewLoadBalancerDetails(loadBalancer: LoadBalancer) {
    console.log('View load balancer details:', loadBalancer);
    // TODO: Navigate to details view
  }

  editLoadBalancer(loadBalancer: LoadBalancer) {
    console.log('Edit load balancer:', loadBalancer);
    // TODO: Implement edit functionality
  }

  deleteLoadBalancer(loadBalancer: LoadBalancer) {
    console.log('Delete load balancer:', loadBalancer);
    if (confirm(`Are you sure you want to delete load balancer "${loadBalancer.name}"?`)) {
      // TODO: Implement delete functionality
    }
  }
} 