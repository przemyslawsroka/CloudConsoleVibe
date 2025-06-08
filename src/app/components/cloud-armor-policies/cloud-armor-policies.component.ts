import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { CloudArmorService, CloudArmorPolicy, CloudArmorPolicyRequest } from '../../services/cloud-armor.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { CreateCloudArmorPolicyDialogComponent } from './create-cloud-armor-policy-dialog.component';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-cloud-armor-policies',
  template: `
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

    <app-gcp-data-table
      [data]="cloudArmorPolicies"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="isLoading"
      [title]="'Cloud Armor policies'"
      [subtitle]="'Control access to your Google Cloud resources at your network edge'"
      [createButtonLabel]="'Create policy'"
      [createButtonIcon]="'add'"
      (create)="createPolicy()"
      (refresh)="refresh()"
      (rowClick)="viewPolicyDetails($event)">
    </app-gcp-data-table>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
      padding: 20px;
      background: var(--background-color);
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .info-banner {
      display: flex;
      align-items: center;
      background-color: rgba(66, 133, 244, 0.08);
      border: 1px solid rgba(66, 133, 244, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      transition: background-color 0.3s ease;
    }

    .info-icon {
      color: #1976d2;
      margin-right: 12px;
    }

    .info-content {
      flex: 1;
      font-size: 14px;
      color: var(--text-color);
    }

    .dismiss-btn {
      color: var(--text-secondary-color);
    }

    .description-text {
      margin: 16px 0;
      color: var(--text-secondary-color);
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

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .info-banner {
        background-color: rgba(66, 133, 244, 0.12);
        border: 1px solid rgba(66, 133, 244, 0.25);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-icon-button {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-icon-button:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-icon-button {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-icon-button:hover {
      background-color: var(--hover-color);
    }
  `]
})
export class CloudArmorPoliciesComponent implements OnInit {
  cloudArmorPolicies: CloudArmorPolicy[] = [];
  projectId: string | null = null;
  isLoading = true;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      type: 'link',
      sortable: true
    },
    {
      key: 'type',
      label: 'Type',
      type: 'text',
      sortable: true
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'text',
      sortable: true
    },
    {
      key: 'rules',
      label: 'Rules',
      type: 'number',
      sortable: true
    },
    {
      key: 'targets',
      label: 'Targets',
      type: 'number',
      sortable: true,
      tooltip: 'Number of targets using this policy'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      sortable: false,
      format: (value: string) => value || '—'
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View details',
      icon: 'visibility',
      action: (row: CloudArmorPolicy) => this.viewPolicyDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row: CloudArmorPolicy) => this.editPolicy(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row: CloudArmorPolicy) => this.deletePolicy(row)
    }
  ];

  tableConfig: TableConfig = {
    showColumnSelector: true,
    emptyStateIcon: 'security',
    emptyStateTitle: 'No Cloud Armor policies found',
    emptyStateMessage: 'Create your first security policy to protect your resources.',
    emptyStateAction: {
      label: 'Create policy',
      action: () => this.createPolicy()
    }
  };

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
      console.log('Current project changed to:', this.projectId);
      this.loadCloudArmorPolicies();
    });
  }

  loadCloudArmorPolicies() {
    this.isLoading = true;
    console.log('Loading Cloud Armor policies for project:', this.projectId);
    
    this.cloudArmorService.getCloudArmorPolicies(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Cloud Armor policies loaded:', response);
        console.log('Number of policies:', response?.length || 0);
        this.cloudArmorPolicies = response || [];
        
        console.log('Component cloudArmorPolicies:', this.cloudArmorPolicies);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading Cloud Armor policies:', error);
        this.cloudArmorPolicies = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh() {
    this.loadCloudArmorPolicies();
  }

  createPolicy() {
    const dialogRef = this.dialog.open(CreateCloudArmorPolicyDialogComponent, {
      width: '600px',
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Policy creation result:', result);
        this.loadCloudArmorPolicies();
      }
    });
  }

  viewPolicyDetails(policy: CloudArmorPolicy) {
    console.log('View policy details:', policy);
  }

  editPolicy(policy: CloudArmorPolicy) {
    console.log('Edit policy:', policy);
  }

  deletePolicy(policy: CloudArmorPolicy) {
    if (confirm(`Are you sure you want to delete policy "${policy.name}"?`)) {
      console.log('Delete policy:', policy);
    }
  }
} 