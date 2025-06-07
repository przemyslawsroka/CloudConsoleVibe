import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface CreationStep {
  id: string;
  name: string;
  status: 'pending' | 'creating' | 'completed' | 'error';
  progress?: number;
  errorMessage?: string;
  resourceId?: string;
}

export interface LoadBalancerCreationData {
  name: string;
  steps: CreationStep[];
}

@Component({
  selector: 'app-load-balancer-creation-progress',
  template: `
    <div class="creation-progress-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>Creating load balancer</h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="dialog-content">
        <div class="creation-steps">
          <div *ngFor="let step of data.steps" class="step-item" [ngClass]="step.status">
            <div class="step-info">
              <div class="step-icon">
                <mat-icon *ngIf="step.status === 'completed'" class="completed-icon">check_circle</mat-icon>
                <mat-icon *ngIf="step.status === 'error'" class="error-icon">error</mat-icon>
                <mat-progress-spinner 
                  *ngIf="step.status === 'creating'" 
                  mode="indeterminate" 
                  diameter="20"
                  strokeWidth="2">
                </mat-progress-spinner>
                <mat-icon *ngIf="step.status === 'pending'" class="pending-icon">radio_button_unchecked</mat-icon>
              </div>
              
              <div class="step-details">
                <span class="step-name">{{ step.name }}</span>
                <div *ngIf="step.status === 'creating' && step.progress !== undefined" class="progress-bar">
                  <mat-progress-bar mode="determinate" [value]="step.progress"></mat-progress-bar>
                  <span class="progress-text">{{ step.progress }}%</span>
                </div>
                <div *ngIf="step.status === 'creating' && step.progress === undefined" class="status-text creating">
                  Creating...
                </div>
                <div *ngIf="step.status === 'completed'" class="status-text completed">
                  Completed
                  <span *ngIf="step.resourceId" class="resource-id">{{ step.resourceId }}</span>
                </div>
                <div *ngIf="step.status === 'error'" class="status-text error">
                  {{ step.errorMessage || 'Failed to create' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="hasErrors" class="error-summary">
          <mat-icon class="warning-icon">warning</mat-icon>
          <div class="error-content">
            <h4>Some resources failed to create</h4>
            <p>You can retry the failed steps or cancel the creation process.</p>
          </div>
        </div>

        <div *ngIf="isCompleted && !hasErrors" class="success-summary">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <div class="success-content">
            <h4>Load balancer created successfully!</h4>
            <p>All resources have been created and configured.</p>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          *ngIf="!isCompleted" 
          (click)="cancelCreation()"
          [disabled]="isCanceling">
          {{ isCanceling ? 'Canceling...' : 'CANCEL CREATION' }}
        </button>
        <button 
          mat-button 
          *ngIf="hasErrors" 
          (click)="retryFailedSteps()"
          [disabled]="isRetrying">
          {{ isRetrying ? 'Retrying...' : 'RETRY FAILED' }}
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          *ngIf="isCompleted" 
          (click)="viewLoadBalancer()">
          VIEW LOAD BALANCER
        </button>
        <button 
          mat-button 
          *ngIf="isCompleted" 
          mat-dialog-close>
          CLOSE
        </button>
      </div>
    </div>
  `,
  styles: [`
    .creation-progress-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: #202124;
    }

    .close-button {
      color: #5f6368;
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .creation-steps {
      margin-bottom: 24px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }

    .step-item.pending {
      background: #f8f9fa;
      border: 1px solid #e8eaed;
    }

    .step-item.creating {
      background: #e3f2fd;
      border: 1px solid #1976d2;
      box-shadow: 0 2px 4px rgba(25, 118, 210, 0.1);
    }

    .step-item.completed {
      background: #e8f5e8;
      border: 1px solid #4caf50;
    }

    .step-item.error {
      background: #ffebee;
      border: 1px solid #f44336;
    }

    .step-info {
      display: flex;
      align-items: flex-start;
      width: 100%;
      gap: 16px;
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .completed-icon {
      color: #4caf50;
      font-size: 24px;
    }

    .error-icon {
      color: #f44336;
      font-size: 24px;
    }

    .pending-icon {
      color: #9e9e9e;
      font-size: 24px;
    }

    .step-details {
      flex: 1;
      min-width: 0;
    }

    .step-name {
      font-weight: 500;
      color: #202124;
      font-size: 16px;
      display: block;
      margin-bottom: 8px;
    }

    .progress-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .progress-bar mat-progress-bar {
      flex: 1;
      height: 6px;
    }

    .progress-text {
      font-size: 12px;
      color: #5f6368;
      min-width: 35px;
    }

    .status-text {
      font-size: 14px;
      margin-top: 4px;
    }

    .status-text.creating {
      color: #1976d2;
      font-weight: 500;
    }

    .status-text.completed {
      color: #4caf50;
      font-weight: 500;
    }

    .status-text.error {
      color: #f44336;
      font-weight: 500;
    }

    .resource-id {
      display: block;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      color: #5f6368;
      margin-top: 4px;
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .error-summary, .success-summary {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .error-summary {
      background: #fff3e0;
      border: 1px solid #ff9800;
    }

    .success-summary {
      background: #e8f5e8;
      border: 1px solid #4caf50;
    }

    .warning-icon {
      color: #ff9800;
      font-size: 24px;
    }

    .success-icon {
      color: #4caf50;
      font-size: 24px;
    }

    .error-content h4, .success-content h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .error-content p, .success-content p {
      margin: 0;
      font-size: 14px;
      color: #5f6368;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* Animation for step status changes */
    .step-item {
      animation: stepUpdate 0.3s ease;
    }

    @keyframes stepUpdate {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }

    /* Loading spinner customization */
    ::ng-deep .mat-progress-spinner circle {
      stroke: #1976d2;
    }

    /* Progress bar customization */
    ::ng-deep .mat-progress-bar-fill::after {
      background-color: #1976d2;
    }

    /* Responsive design */
    @media (max-width: 600px) {
      .creation-progress-dialog {
        width: 100%;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
      }

      .dialog-content {
        max-height: calc(100vh - 160px);
      }

      .step-info {
        gap: 12px;
      }

      .step-name {
        font-size: 14px;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 12px;
      }

      .dialog-actions button {
        width: 100%;
      }
    }
  `]
})
export class LoadBalancerCreationProgressComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isCanceling = false;
  isRetrying = false;

  constructor(
    public dialogRef: MatDialogRef<LoadBalancerCreationProgressComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LoadBalancerCreationData
  ) {}

  ngOnInit() {
    // Prevent dialog from closing when clicking outside
    this.dialogRef.disableClose = true;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasErrors(): boolean {
    return this.data.steps.some(step => step.status === 'error');
  }

  get isCompleted(): boolean {
    return this.data.steps.every(step => step.status === 'completed' || step.status === 'error');
  }

  get completedSteps(): number {
    return this.data.steps.filter(step => step.status === 'completed').length;
  }

  get totalSteps(): number {
    return this.data.steps.length;
  }

  cancelCreation() {
    this.isCanceling = true;
    
    // Simulate cancellation process
    setTimeout(() => {
      this.dialogRef.close({ action: 'cancelled' });
    }, 1500);
  }

  retryFailedSteps() {
    this.isRetrying = true;
    
    // Reset failed steps to pending
    this.data.steps.forEach(step => {
      if (step.status === 'error') {
        step.status = 'pending';
        step.errorMessage = undefined;
      }
    });

    setTimeout(() => {
      this.isRetrying = false;
      // Emit retry event or call service method
      this.dialogRef.close({ action: 'retry' });
    }, 1000);
  }

  viewLoadBalancer() {
    this.dialogRef.close({ action: 'view', loadBalancerName: this.data.name });
  }
} 