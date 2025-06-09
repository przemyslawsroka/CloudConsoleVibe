import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { GkeClusterService, GkeCluster, ClusterMetrics } from '../../services/gke-cluster.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gke-clusters',
  templateUrl: './gke-clusters.component.html',
  styleUrls: ['./gke-clusters.component.scss']
})
export class GkeClustersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<GkeCluster>();
  displayedColumns: string[] = [
    'select',
    'status',
    'name',
    'location',
    'tier',
    'fleet',
    'mode',
    'nodes',
    'vcpus',
    'memory',
    'notifications',
    'labels',
    'actions'
  ];

  selectedTab = 'overview';
  loading = true;
  error: string | null = null;
  searchValue = '';
  
  clusterMetrics$: Observable<ClusterMetrics>;
  isDemoMode$: Observable<boolean>;

  selectedClusters: Set<string> = new Set();

  tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'utilization', label: 'Utilization', icon: 'analytics' },
    { id: 'observability', label: 'Observability', icon: 'visibility' },
    { id: 'cost-optimization', label: 'Cost Optimization', icon: 'savings' }
  ];

  constructor(
    private gkeService: GkeClusterService,
    private authService: AuthService,
    private router: Router
  ) {
    this.clusterMetrics$ = this.gkeService.getClusterMetrics();
    this.isDemoMode$ = this.authService.isDemoMode$;
  }

  ngOnInit() {
    this.loadClusters();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadClusters() {
    this.loading = true;
    this.error = null;

    this.gkeService.getClusters().subscribe({
      next: (clusters) => {
        this.dataSource.data = clusters;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clusters:', error);
        this.error = 'Failed to load clusters. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchValue = filterValue;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilter() {
    this.searchValue = '';
    this.dataSource.filter = '';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
  }

  toggleClusterSelection(clusterId: string) {
    if (this.selectedClusters.has(clusterId)) {
      this.selectedClusters.delete(clusterId);
    } else {
      this.selectedClusters.add(clusterId);
    }
  }

  isClusterSelected(clusterId: string): boolean {
    return this.selectedClusters.has(clusterId);
  }

  toggleAllClusters() {
    if (this.selectedClusters.size === this.dataSource.data.length) {
      this.selectedClusters.clear();
    } else {
      this.selectedClusters.clear();
      this.dataSource.data.forEach(cluster => {
        this.selectedClusters.add(cluster.id);
      });
    }
  }

  isAllSelected(): boolean {
    return this.selectedClusters.size === this.dataSource.data.length && this.dataSource.data.length > 0;
  }

  isIndeterminate(): boolean {
    return this.selectedClusters.size > 0 && this.selectedClusters.size < this.dataSource.data.length;
  }

  navigateToCluster(cluster: GkeCluster) {
    this.router.navigate(['/kubernetes/clusters', cluster.name], {
      queryParams: { location: cluster.location }
    });
  }

  createCluster() {
    this.router.navigate(['/kubernetes/clusters/create']);
  }

  deployApplication() {
    // TODO: Implement deploy application dialog
    console.log('Deploy application clicked');
  }

  refreshClusters() {
    this.loadClusters();
  }

  attachCluster() {
    // TODO: Implement attach cluster dialog
    console.log('Attach cluster clicked');
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'RUNNING':
        return 'check_circle';
      case 'CREATING':
        return 'sync';
      case 'ERROR':
      case 'DEGRADED':
        return 'error';
      case 'DELETING':
        return 'delete';
      default:
        return 'help';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'RUNNING':
        return 'status-running';
      case 'CREATING':
        return 'status-creating';
      case 'ERROR':
      case 'DEGRADED':
        return 'status-error';
      case 'DELETING':
        return 'status-deleting';
      default:
        return 'status-unknown';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'check_circle';
      default:
        return 'notifications';
    }
  }

  getNotificationClass(type: string): string {
    return `notification-${type}`;
  }

  deleteSelectedClusters() {
    if (this.selectedClusters.size === 0) return;

    // TODO: Implement batch delete with confirmation dialog
    console.log('Delete selected clusters:', Array.from(this.selectedClusters));
  }

  exportClusters() {
    // TODO: Implement cluster export functionality
    console.log('Export clusters clicked');
  }

  getLabelsDisplay(labels: { [key: string]: string }): string {
    const labelCount = Object.keys(labels).length;
    if (labelCount === 0) return '';
    if (labelCount === 1) {
      const [key, value] = Object.entries(labels)[0];
      return `${key}: ${value}`;
    }
    return `${labelCount} labels`;
  }

  showMoreNotifications(cluster: GkeCluster) {
    // TODO: Implement notification details dialog
    console.log('Show more notifications for:', cluster.name);
  }

  trackByClusterId(index: number, cluster: GkeCluster): string {
    return cluster.id;
  }

  getSelectedTab() {
    return this.tabs.find(t => t.id === this.selectedTab);
  }
} 