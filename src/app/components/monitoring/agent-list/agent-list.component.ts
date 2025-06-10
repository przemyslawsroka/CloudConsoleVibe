import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MonitoringService, Agent } from '../services/monitoring.service';
import { AgentWebSocketService } from '../services/agent-websocket.service';

@Component({
  selector: 'app-agent-list',
  templateUrl: './agent-list.component.html',
  styleUrls: ['./agent-list.component.scss']
})
export class AgentListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  
  // Table configuration
  displayedColumns: string[] = [
    'select', 'status', 'id', 'provider', 'region', 'ip_address', 
    'version', 'total_metrics', 'last_seen', 'actions'
  ];
  
  dataSource = new MatTableDataSource<Agent>([]);
  selection = new SelectionModel<Agent>(true, []);
  
  // UI state
  isLoading = true;
  totalAgents = 0;
  pageSize = 25;
  currentPage = 0;
  
  // Filters
  statusFilter = '';
  providerFilter = '';
  regionFilter = '';
  searchQuery = '';
  
  // Filter options
  statusOptions = ['connected', 'disconnected', 'error'];
  providerOptions: string[] = [];
  regionOptions: string[] = [];
  
  // WebSocket status
  wsConnected = false;

  constructor(
    private monitoringService: MonitoringService,
    private websocketService: AgentWebSocketService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeWebSocket();
    this.loadAgents();
    this.setupWebSocketSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeWebSocket(): void {
    this.websocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.wsConnected = connected;
      });

    if (!this.websocketService.isConnected()) {
      this.websocketService.connect();
    }
  }

  private setupWebSocketSubscriptions(): void {
    this.websocketService.agentUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agent => {
        this.updateAgentInTable(agent);
      });
  }

  private loadAgents(): void {
    this.isLoading = true;
    
    const params = {
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize,
      status: this.statusFilter || undefined,
      provider: this.providerFilter || undefined,
      region: this.regionFilter || undefined
    };

    this.monitoringService.getAgents(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle both backend response formats
          const agents = response.agents || [];
          const pagination = response.pagination || { total: 0 };
          
          this.dataSource.data = agents;
          this.totalAgents = pagination.total || 0;
          this.updateFilterOptions(agents);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading agents:', error);
          this.showError('Failed to load agents. Backend may be unavailable.');
          this.isLoading = false;
          
          // Set empty data on error
          this.dataSource.data = [];
          this.totalAgents = 0;
        }
      });
  }

  private updateAgentInTable(updatedAgent: Agent): void {
    const data = [...this.dataSource.data];
    const index = data.findIndex(agent => agent.id === updatedAgent.id);
    
    if (index !== -1) {
      data[index] = updatedAgent;
      this.dataSource.data = data;
    }
  }

  private updateFilterOptions(agents: Agent[]): void {
    // Extract unique values for filters
    this.providerOptions = [...new Set(agents.map(a => a.provider))];
    this.regionOptions = [...new Set(agents.map(a => a.region))];
  }

  // Table event handlers
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAgents();
  }

  onSortChange(): void {
    // For server-side sorting, you would pass sort parameters to the API
    this.loadAgents();
  }

  // Filter methods
  applyFilters(): void {
    this.currentPage = 0;
    this.loadAgents();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.providerFilter = '';
    this.regionFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  applyTextFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // Selection methods
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

  // Agent actions
  viewAgent(agent: Agent): void {
    // Navigate to agent detail view
    // You can implement this based on your routing setup
    console.log('View agent:', agent.id);
  }

  configureAgent(agent: Agent): void {
    // TODO: Implement agent configuration dialog
    console.log('Configure agent:', agent.id);
    this.showSuccess('Agent configuration dialog coming soon');
  }

  private updateAgentConfig(agentId: string, config: any): void {
    this.monitoringService.updateAgentConfig(agentId, config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Agent configuration updated successfully');
          this.loadAgents();
        },
        error: (error) => {
          console.error('Error updating agent config:', error);
          this.showError('Failed to update agent configuration');
        }
      });
  }

  deleteAgent(agent: Agent): void {
    if (confirm(`Are you sure you want to delete agent ${agent.id}?`)) {
      this.monitoringService.deleteAgent(agent.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Agent deleted successfully');
            this.loadAgents();
          },
          error: (error) => {
            console.error('Error deleting agent:', error);
            this.showError('Failed to delete agent');
          }
        });
    }
  }

  // Bulk actions
  deleteSelectedAgents(): void {
    const selectedAgents = this.selection.selected;
    if (selectedAgents.length === 0) {
      this.showError('No agents selected');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedAgents.length} agent(s)?`;
    if (confirm(confirmMessage)) {
      // Implement bulk delete
      selectedAgents.forEach(agent => {
        this.monitoringService.deleteAgent(agent.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error(`Error deleting agent ${agent.id}:`, error);
            }
          });
      });
      
      this.showSuccess(`Deleted ${selectedAgents.length} agent(s)`);
      this.selection.clear();
      this.loadAgents();
    }
  }

  subscribeToAgent(agent: Agent): void {
    this.websocketService.subscribeToAgent(agent.id);
    this.showSuccess(`Subscribed to real-time updates for ${agent.id}`);
  }

  unsubscribeFromAgent(agent: Agent): void {
    this.websocketService.unsubscribeFromAgent(agent.id);
    this.showSuccess(`Unsubscribed from updates for ${agent.id}`);
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'connected': return '#4caf50';
      case 'disconnected': return '#9e9e9e';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'connected': return 'check_circle';
      case 'disconnected': return 'cancel';
      case 'error': return 'error';
      default: return 'help';
    }
  }

  formatLastSeen(date: Date): string {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }

  // Refresh method
  refresh(): void {
    this.loadAgents();
    this.websocketService.requestAgentList();
  }
} 