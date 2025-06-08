import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { CloudRouterService, CloudRouter } from '../../services/cloud-router.service';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-cloud-router',
  template: `
    <app-gcp-data-table
      [data]="routers"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="loading"
      [title]="'Cloud Router'"
      [subtitle]="'Manage dynamic routing for your VPC networks'"
      [createButtonLabel]="'Create router'"
      [createButtonIcon]="'add'"
      (create)="createRouter()"
      (refresh)="refreshRouters()"
      (rowClick)="onRouterClick($event)">
    </app-gcp-data-table>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }
  `]
})
export class CloudRouterComponent implements OnInit {
  routers: CloudRouter[] = [];
  loading = false;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      type: 'link',
      sortable: true
    },
    {
      key: 'network',
      label: 'Network',
      type: 'text',
      sortable: true
    },
    {
      key: 'region',
      label: 'Region',
      type: 'text',
      sortable: true
    },
    {
      key: 'interconnectEncryption',
      label: 'Interconnect encryption',
      type: 'text',
      sortable: true
    },
    {
      key: 'cloudRouterASN',
      label: 'Cloud Router ASN',
      type: 'text',
      sortable: true
    },
    {
      key: 'interconnectVpnGateway',
      label: 'Interconnect / VPN gateway',
      type: 'text',
      sortable: false
    },
    {
      key: 'connection',
      label: 'Connection',
      type: 'text',
      sortable: false,
      format: (value: string) => value || '-'
    },
    {
      key: 'bgpSessions',
      label: 'BGP sessions',
      type: 'text',
      sortable: false
    },
    {
      key: 'logs',
      label: 'Logs',
      type: 'text',
      sortable: false,
      format: () => 'View'
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View details',
      icon: 'visibility',
      action: (row: CloudRouter) => this.onRouterClick(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row: CloudRouter) => this.editRouter(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row: CloudRouter) => this.deleteRouter(row)
    }
  ];

  tableConfig: TableConfig = {
    showColumnSelector: true,
    emptyStateIcon: 'router',
    emptyStateTitle: 'No routers found',
    emptyStateMessage: 'Create your first Cloud Router to enable dynamic routing for your VPC network.',
    emptyStateAction: {
      label: 'Create router',
      action: () => this.createRouter()
    }
  };

  constructor(
    private cloudRouterService: CloudRouterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRouters();
  }

  loadRouters(): void {
    this.loading = true;
    this.cloudRouterService.getCloudRouters().subscribe({
      next: (routers) => {
        this.routers = routers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading routers:', error);
        this.loading = false;
        this.snackBar.open('Error loading routers', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onRouterClick(router: CloudRouter): void {
    this.router.navigate(['/cloud-router', router.name], {
      queryParams: { region: router.region }
    });
  }

  createRouter(): void {
    this.router.navigate(['/cloud-router/create']);
  }

  refreshRouters(): void {
    this.loadRouters();
  }

  editRouter(router: CloudRouter): void {
    this.snackBar.open('Edit router functionality would be implemented here', 'Close', {
      duration: 3000
    });
  }

  deleteRouter(router: CloudRouter): void {
    if (confirm(`Are you sure you want to delete router "${router.name}"?`)) {
      this.snackBar.open('Delete router functionality would be implemented here', 'Close', {
        duration: 3000
      });
    }
  }

  getBgpSessionsColor(sessionCount: number): string {
    return sessionCount > 0 ? '#34a853' : '#9aa0a6';
  }

  getBgpSessionsIcon(sessionCount: number): string {
    return sessionCount > 0 ? 'check_circle' : 'radio_button_unchecked';
  }
}

