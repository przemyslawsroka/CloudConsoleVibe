import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { CloudRouterService, CloudRouter } from '../../services/cloud-router.service';

@Component({
  selector: 'app-cloud-router',
  templateUrl: './cloud-router.component.html',
  styleUrls: ['./cloud-router.component.scss']
})
export class CloudRouterComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'select',
    'name',
    'network',
    'region',
    'interconnectEncryption',
    'cloudRouterASN',
    'interconnectVpnGateway',
    'connection',
    'bgpSessions',
    'logs'
  ];

  dataSource = new MatTableDataSource<CloudRouter>();
  selection = new SelectionModel<CloudRouter>(true, []);
  loading = false;
  filterValue = '';

  constructor(
    private cloudRouterService: CloudRouterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRouters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadRouters(): void {
    this.loading = true;
    this.cloudRouterService.getCloudRouters().subscribe({
      next: (routers) => {
        this.dataSource.data = routers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading routers:', error);
        this.snackBar.open('Error loading routers', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilter(): void {
    this.filterValue = '';
    this.applyFilter();
  }

  refreshRouters(): void {
    this.selection.clear();
    this.loadRouters();
    this.snackBar.open('Routers refreshed', 'Close', {
      duration: 2000
    });
  }

  createRouter(): void {
    this.router.navigate(['/cloud-router/create']);
  }

  deleteSelectedRouters(): void {
    const selected = this.selection.selected;
    if (selected.length === 0) {
      this.snackBar.open('No routers selected', 'Close', {
        duration: 2000
      });
      return;
    }

    this.snackBar.open(
      `Delete functionality for ${selected.length} router(s) would be implemented here`, 
      'Close', 
      { duration: 3000 }
    );
  }

  onRouterClick(router: CloudRouter): void {
    // Navigate to router details page
    this.router.navigate(['/cloud-router', router.name], {
      queryParams: { region: router.region }
    });
  }

  viewLogs(router: CloudRouter): void {
    this.snackBar.open(`View logs for ${router.name}`, 'Close', {
      duration: 2000
    });
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  getBgpSessionsColor(sessions: number): string {
    return sessions > 0 ? '#34a853' : '#9aa0a6';
  }

  getBgpSessionsIcon(sessions: number): string {
    return sessions > 0 ? 'radio_button_checked' : 'radio_button_unchecked';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return '#34a853';
      case 'INACTIVE':
        return '#ea4335';
      case 'PENDING':
        return '#fbbc04';
      default:
        return '#9aa0a6';
    }
  }
}
