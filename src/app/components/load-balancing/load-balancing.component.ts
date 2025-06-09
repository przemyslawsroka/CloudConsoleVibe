import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoadBalancerService, LoadBalancer } from '../../services/load-balancer.service';
import { ProjectService, Project } from '../../services/project.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';
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
    private projectService: ProjectService,
    private googleAnalyticsService: GoogleAnalyticsService
  ) {}

  ngOnInit() {
    console.log('LoadBalancingComponent initialized');
    
    // Track page view
    this.googleAnalyticsService.trackPageView('/load-balancing', 'Load Balancing');
    
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadLoadBalancers();
    });
  }

  loadLoadBalancers() {
    console.log('Loading load balancers for project:', this.projectId);
    this.isLoading = true;
    
    // Track load balancer list load event
    this.googleAnalyticsService.trackEvent({
      action: 'load_balancer_list_load',
      category: 'networking',
      label: 'load_balancers',
      custom_parameters: {
        project_id: this.projectId
      }
    });
    
    this.loadBalancerService.getLoadBalancers().subscribe({
      next: (response) => {
        console.log('Load balancers loaded:', response);
        this.loadBalancers = response || [];
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Track successful load
        this.googleAnalyticsService.trackEvent({
          action: 'load_balancer_list_load_success',
          category: 'networking',
          label: 'load_balancers',
          value: this.loadBalancers.length,
          custom_parameters: {
            load_balancer_count: this.loadBalancers.length,
            project_id: this.projectId
          }
        });
      },
      error: (error) => {
        console.error('Error loading load balancers:', error);
        this.loadBalancers = [];
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Track error
        this.googleAnalyticsService.trackError(error, 'load_balancer_list_load');
      }
    });
  }

  refresh() {
    this.loadLoadBalancers();
  }

  createLoadBalancer() {
    console.log('Navigate to create load balancer');
    
    // Track load balancer creation initiation
    this.googleAnalyticsService.trackEvent({
      action: 'load_balancer_creation_initiated',
      category: 'networking',
      label: 'create_load_balancer',
      custom_parameters: {
        project_id: this.projectId
      }
    });
    
    this.router.navigate(['/load-balancing/create']);
  }

  viewLoadBalancerDetails(loadBalancer: LoadBalancer) {
    console.log('View load balancer details:', loadBalancer);
    
    // Track load balancer details view
    this.googleAnalyticsService.trackEvent({
      action: 'load_balancer_details_viewed',
      category: 'networking',
      label: loadBalancer.name,
      custom_parameters: {
        load_balancer_name: loadBalancer.name,
        load_balancer_type: loadBalancer.typeDisplay,
        project_id: this.projectId
      }
    });
    
    // TODO: Implement details view
  }

  onRowClick(loadBalancer: LoadBalancer) {
    this.viewLoadBalancerDetails(loadBalancer);
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