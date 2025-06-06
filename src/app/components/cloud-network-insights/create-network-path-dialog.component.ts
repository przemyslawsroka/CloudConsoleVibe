import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MonitoringPoint } from '../../services/appneta.service';

@Component({
  selector: 'app-create-network-path-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>Create Network Path</h2>
        <p class="dialog-subtitle">Configure a new network path for monitoring hop-by-hop performance</p>
      </div>

      <div mat-dialog-content>
        <form [formGroup]="networkPathForm" class="network-path-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Path Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Production DB Connection">
              <mat-error *ngIf="networkPathForm.get('name')?.hasError('required')">
                Path name is required
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Source</mat-label>
                <input matInput formControlName="source" placeholder="e.g., web-server-1">
                <mat-error *ngIf="networkPathForm.get('source')?.hasError('required')">
                  Source is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Target</mat-label>
                <input matInput formControlName="target" placeholder="e.g., database.example.com">
                <mat-error *ngIf="networkPathForm.get('target')?.hasError('required')">
                  Target is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <div class="form-section">
            <h3>Monitoring Configuration</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Monitoring Point</mat-label>
              <mat-select formControlName="monitoringPoint">
                <mat-option *ngFor="let point of data.monitoringPoints" [value]="point.name">
                  {{ point.name }} ({{ point.location }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="networkPathForm.get('monitoringPoint')?.hasError('required')">
                Monitoring point is required
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Test Interval (minutes)</mat-label>
                <mat-select formControlName="testInterval">
                  <mat-option value="1">1 minute</mat-option>
                  <mat-option value="5">5 minutes</mat-option>
                  <mat-option value="15">15 minutes</mat-option>
                  <mat-option value="30">30 minutes</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Protocol</mat-label>
                <mat-select formControlName="protocol">
                  <mat-option value="ICMP">ICMP</mat-option>
                  <mat-option value="TCP">TCP</mat-option>
                  <mat-option value="UDP">UDP</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <div class="form-section">
            <h3>Thresholds & Alerting</h3>
            <p class="section-description">Set performance thresholds to trigger alerts</p>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Latency Threshold (ms)</mat-label>
                <input matInput type="number" formControlName="latencyThreshold" placeholder="100">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Packet Loss Threshold (%)</mat-label>
                <input matInput type="number" formControlName="packetLossThreshold" placeholder="5">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Jitter Threshold (ms)</mat-label>
                <input matInput type="number" formControlName="jitterThreshold" placeholder="10">
              </mat-form-field>
            </div>

            <div class="checkbox-section">
              <mat-checkbox formControlName="enableAlerting">
                Enable alerting for this path
              </mat-checkbox>
            </div>
          </div>
        </form>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!networkPathForm.valid" 
                (click)="onCreate()">
          Create Network Path
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 600px;
      max-width: 800px;
    }

    .dialog-header {
      margin-bottom: 24px;
    }

    .dialog-subtitle {
      color: rgba(0, 0, 0, 0.6);
      margin: 8px 0 0 0;
    }

    .network-path-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
    }

    .section-description {
      color: rgba(0, 0, 0, 0.6);
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1;
    }

    .third-width {
      flex: 1;
    }

    .checkbox-section {
      margin-top: 16px;
    }

    .dialog-actions {
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 0 0 0;
      margin: 24px 0 0 0;
      border-top: 1px solid #e0e0e0;
    }

    mat-form-field {
      margin-bottom: 16px;
    }

    mat-checkbox {
      margin-bottom: 8px;
    }
  `]
})
export class CreateNetworkPathDialogComponent {
  networkPathForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CreateNetworkPathDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { monitoringPoints: MonitoringPoint[] },
    private fb: FormBuilder
  ) {
    this.networkPathForm = this.fb.group({
      name: ['', Validators.required],
      source: ['', Validators.required],
      target: ['', Validators.required],
      monitoringPoint: ['', Validators.required],
      testInterval: [5],
      protocol: ['ICMP'],
      latencyThreshold: [100],
      packetLossThreshold: [5],
      jitterThreshold: [10],
      enableAlerting: [true]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.networkPathForm.valid) {
      const formValue = this.networkPathForm.value;
      const networkPath = {
        name: formValue.name,
        source: formValue.source,
        destination: formValue.target,
        target: formValue.target,
        monitoringPoint: formValue.monitoringPoint,
        status: 'OK' as const
      };
      
      this.dialogRef.close(networkPath);
    }
  }
} 