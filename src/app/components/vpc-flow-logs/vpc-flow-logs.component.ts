import { Component, OnInit } from '@angular/core';
import { VpcService } from '../../services/vpc.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CreateFlowLogDialogComponent } from '../create-flow-log-dialog/create-flow-log-dialog.component';
import { FlowLog } from '../../services/vpc.service';

@Component({
  selector: 'app-vpc-flow-logs',
  template: `
    <div class="flow-logs-container">
      <div class="header">
        <h1>VPC Flow Logs</h1>
        <button mat-raised-button color="primary" (click)="openCreateFlowLogDialog()">
          <mat-icon>add</mat-icon>
          Enable Flow Logs
        </button>
      </div>

      <div class="content">
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner></mat-spinner>
        </div>

        <div *ngIf="!isLoading && flowLogs.length === 0" class="no-data">
          <mat-icon>info</mat-icon>
          <p>No flow logs configured. Enable flow logs to start monitoring network traffic.</p>
        </div>

        <table *ngIf="!isLoading && flowLogs.length > 0" mat-table [dataSource]="flowLogs" class="mat-elevation-z2">
          <!-- Network Column -->
          <ng-container matColumnDef="network">
            <th mat-header-cell *matHeaderCellDef>Network</th>
            <td mat-cell *matCellDef="let flowLog">{{ getNetworkName(flowLog.network) }}</td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let flowLog">
              <mat-chip-listbox>
                <mat-chip [color]="flowLog.enabled ? 'primary' : 'warn'" selected>
                  {{ flowLog.enabled ? 'Enabled' : 'Disabled' }}
                </mat-chip>
              </mat-chip-listbox>
            </td>
          </ng-container>

          <!-- Aggregation Interval Column -->
          <ng-container matColumnDef="aggregationInterval">
            <th mat-header-cell *matHeaderCellDef>Aggregation Interval</th>
            <td mat-cell *matCellDef="let flowLog">{{ flowLog.aggregationInterval || '5 seconds' }}</td>
          </ng-container>

          <!-- Flow Sampling Column -->
          <ng-container matColumnDef="flowSampling">
            <th mat-header-cell *matHeaderCellDef>Flow Sampling</th>
            <td mat-cell *matCellDef="let flowLog">{{ flowLog.flowSampling || '0.5' }}</td>
          </ng-container>

          <!-- Metadata Column -->
          <ng-container matColumnDef="metadata">
            <th mat-header-cell *matHeaderCellDef>Metadata</th>
            <td mat-cell *matCellDef="let flowLog">
              <mat-chip-listbox>
                <mat-chip *ngIf="flowLog.metadata?.includes('INCLUDE_ALL_METADATA')" color="primary" selected>
                  All Metadata
                </mat-chip>
                <mat-chip *ngIf="!flowLog.metadata?.includes('INCLUDE_ALL_METADATA')" color="accent" selected>
                  Basic Metadata
                </mat-chip>
              </mat-chip-listbox>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let flowLog">
              <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="toggleFlowLogs(flowLog)">
                  <mat-icon>{{ flowLog.enabled ? 'block' : 'check_circle' }}</mat-icon>
                  <span>{{ flowLog.enabled ? 'Disable' : 'Enable' }}</span>
                </button>
                <button mat-menu-item (click)="deleteFlowLog(flowLog)">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .flow-logs-container {
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
    }

    .content {
      background: white;
      border-radius: 8px;
      padding: 24px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: #5f6368;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
    }

    .mat-column-actions {
      width: 80px;
      text-align: center;
    }

    .mat-column-status {
      width: 120px;
    }

    .mat-column-aggregationInterval,
    .mat-column-flowSampling {
      width: 150px;
    }
  `]
})
export class VpcFlowLogsComponent implements OnInit {
  flowLogs: FlowLog[] = [];
  isLoading = true;
  displayedColumns = ['network', 'status', 'aggregationInterval', 'flowSampling', 'metadata', 'actions'];
  projectId = 'net-top-viz-demo-208511';

  constructor(
    private vpcService: VpcService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadFlowLogs();
  }

  loadFlowLogs() {
    this.isLoading = true;
    this.vpcService.getFlowLogs(this.projectId).subscribe({
      next: (flowLogs) => {
        this.flowLogs = flowLogs;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading flow logs:', error);
        this.snackBar.open('Error loading flow logs', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  getNetworkName(networkUrl: string): string {
    const parts = networkUrl.split('/');
    return parts[parts.length - 1];
  }

  openCreateFlowLogDialog() {
    const dialogRef = this.dialog.open(CreateFlowLogDialogComponent, {
      data: { projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.vpcService.createFlowLog(this.projectId, result).subscribe({
          next: () => {
            this.loadFlowLogs();
            this.snackBar.open('Flow logs enabled successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error creating flow logs:', error);
            this.snackBar.open('Error creating flow logs', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  toggleFlowLogs(flowLog: FlowLog) {
    const newStatus = !flowLog.enabled;
    this.vpcService.updateFlowLogs(this.projectId, flowLog.name, { enabled: newStatus }).subscribe({
      next: () => {
        this.loadFlowLogs();
        this.snackBar.open(`Flow logs ${newStatus ? 'enabled' : 'disabled'} successfully`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating flow logs:', error);
        this.snackBar.open('Error updating flow logs', 'Close', { duration: 3000 });
      }
    });
  }

  deleteFlowLog(flowLog: FlowLog) {
    if (confirm('Are you sure you want to delete these flow logs?')) {
      this.vpcService.deleteFlowLogs(this.projectId, flowLog.name).subscribe({
        next: () => {
          this.loadFlowLogs();
          this.snackBar.open('Flow logs deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting flow logs:', error);
          this.snackBar.open('Error deleting flow logs', 'Close', { duration: 3000 });
        }
      });
    }
  }
} 