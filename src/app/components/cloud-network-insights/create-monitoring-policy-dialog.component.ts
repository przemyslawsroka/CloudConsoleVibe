import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-create-monitoring-policy-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>Create Monitoring Policy</h2>
        <p class="dialog-subtitle">Configure a new monitoring policy with thresholds and alerting rules</p>
      </div>

      <div mat-dialog-content>
        <form [formGroup]="policyForm" class="policy-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Policy Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Critical Infrastructure Monitoring">
              <mat-error *ngIf="policyForm.get('name')?.hasError('required')">
                Policy name is required
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Policy Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="Network">Network Monitoring</mat-option>
                  <mat-option value="Web">Web Application Monitoring</mat-option>
                  <mat-option value="Infrastructure">Infrastructure Monitoring</mat-option>
                </mat-select>
                <mat-error *ngIf="policyForm.get('type')?.hasError('required')">
                  Policy type is required
                </mat-error>
              </mat-form-field>

              <div class="checkbox-container">
                <mat-checkbox formControlName="enabled">
                  Enable this policy
                </mat-checkbox>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (Optional)</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                       placeholder="Describe what this policy monitors and when it should alert"></textarea>
            </mat-form-field>
          </div>

          <div class="form-section">
            <h3>Targets</h3>
            <p class="section-description">Specify the targets this policy should monitor</p>
            
            <div formArrayName="targets" class="targets-section">
              <div *ngFor="let target of targetsArray.controls; let i = index" 
                   class="target-item" [formGroupName]="i">
                <mat-form-field appearance="outline" class="target-input">
                  <mat-label>Target {{ i + 1 }}</mat-label>
                  <input matInput formControlName="value" 
                         placeholder="e.g., database.example.com or https://api.example.com">
                </mat-form-field>
                <button mat-icon-button type="button" 
                        (click)="removeTarget(i)" 
                        [disabled]="targetsArray.length <= 1"
                        class="remove-target">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            
            <button mat-stroked-button type="button" (click)="addTarget()" class="add-target">
              <mat-icon>add</mat-icon>
              Add Target
            </button>
          </div>

          <div class="form-section">
            <h3>Performance Thresholds</h3>
            <p class="section-description">Set thresholds that will trigger alerts when exceeded</p>
            
            <div *ngIf="policyForm.get('type')?.value === 'Network' || policyForm.get('type')?.value === 'Infrastructure'">
              <div class="form-row">
                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>Latency Threshold (ms)</mat-label>
                  <input matInput type="number" formControlName="latencyThreshold" placeholder="100">
                  <mat-hint>Alert when latency exceeds this value</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>Packet Loss Threshold (%)</mat-label>
                  <input matInput type="number" formControlName="packetLossThreshold" placeholder="5">
                  <mat-hint>Alert when packet loss exceeds this percentage</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>Jitter Threshold (ms)</mat-label>
                  <input matInput type="number" formControlName="jitterThreshold" placeholder="10">
                  <mat-hint>Alert when jitter exceeds this value</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <div *ngIf="policyForm.get('type')?.value === 'Web'">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Response Time Threshold (ms)</mat-label>
                  <input matInput type="number" formControlName="responseTimeThreshold" placeholder="2000">
                  <mat-hint>Alert when response time exceeds this value</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Availability Threshold (%)</mat-label>
                  <input matInput type="number" formControlName="availabilityThreshold" placeholder="99">
                  <mat-hint>Alert when availability drops below this percentage</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Evaluation Window (minutes)</mat-label>
                <mat-select formControlName="evaluationWindow">
                  <mat-option value="5">5 minutes</mat-option>
                  <mat-option value="10">10 minutes</mat-option>
                  <mat-option value="15">15 minutes</mat-option>
                  <mat-option value="30">30 minutes</mat-option>
                  <mat-option value="60">1 hour</mat-option>
                </mat-select>
                <mat-hint>Time window for threshold evaluation</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Consecutive Violations</mat-label>
                <mat-select formControlName="consecutiveViolations">
                  <mat-option value="1">1 violation</mat-option>
                  <mat-option value="2">2 consecutive violations</mat-option>
                  <mat-option value="3">3 consecutive violations</mat-option>
                  <mat-option value="5">5 consecutive violations</mat-option>
                </mat-select>
                <mat-hint>Number of violations before alerting</mat-hint>
              </mat-form-field>
            </div>
          </div>

          <div class="form-section">
            <h3>Alerting Configuration</h3>
            <p class="section-description">Configure how and when alerts should be sent</p>
            
            <div class="checkbox-section">
              <mat-checkbox formControlName="alertingEnabled">
                Enable alerting for this policy
              </mat-checkbox>
            </div>

            <div *ngIf="policyForm.get('alertingEnabled')?.value" class="alerting-config">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Severity Level</mat-label>
                  <mat-select formControlName="severity">
                    <mat-option value="Critical">Critical</mat-option>
                    <mat-option value="High">High</mat-option>
                    <mat-option value="Medium">Medium</mat-option>
                    <mat-option value="Low">Low</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Notification Channels</mat-label>
                  <mat-select formControlName="notificationChannels" multiple>
                    <mat-option value="email">Email</mat-option>
                    <mat-option value="slack">Slack</mat-option>
                    <mat-option value="pagerduty">PagerDuty</mat-option>
                    <mat-option value="webhook">Webhook</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email Recipients (comma-separated)</mat-label>
                <input matInput formControlName="emailRecipients" 
                       placeholder="admin@example.com, devops@example.com">
              </mat-form-field>

              <div class="checkbox-section">
                <mat-checkbox formControlName="autoResolve">
                  Auto-resolve alerts when thresholds return to normal
                </mat-checkbox>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!policyForm.valid" 
                (click)="onCreate()">
          Create Policy
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 700px;
      max-width: 900px;
    }

    .dialog-header {
      margin-bottom: 24px;
    }

    .dialog-subtitle {
      color: rgba(0, 0, 0, 0.6);
      margin: 8px 0 0 0;
    }

    .policy-form {
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

    .checkbox-container {
      display: flex;
      align-items: center;
      padding-top: 16px;
    }

    .checkbox-section {
      margin: 16px 0;
    }

    .targets-section {
      margin-bottom: 16px;
    }

    .target-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 16px;
    }

    .target-input {
      flex: 1;
    }

    .remove-target {
      margin-top: 8px;
    }

    .add-target {
      margin-top: 8px;
    }

    .alerting-config {
      margin-top: 16px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
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

    textarea {
      resize: vertical;
      min-height: 60px;
    }
  `]
})
export class CreateMonitoringPolicyDialogComponent {
  policyForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CreateMonitoringPolicyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.policyForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Network', Validators.required],
      enabled: [true],
      description: [''],
      targets: this.fb.array([
        this.fb.group({
          value: ['', Validators.required]
        })
      ]),
      latencyThreshold: [100],
      packetLossThreshold: [5],
      jitterThreshold: [10],
      responseTimeThreshold: [2000],
      availabilityThreshold: [99],
      evaluationWindow: [10],
      consecutiveViolations: [2],
      alertingEnabled: [true],
      severity: ['Medium'],
      notificationChannels: [['email']],
      emailRecipients: [''],
      autoResolve: [true]
    });
  }

  get targetsArray(): FormArray {
    return this.policyForm.get('targets') as FormArray;
  }

  addTarget(): void {
    this.targetsArray.push(this.fb.group({
      value: ['', Validators.required]
    }));
  }

  removeTarget(index: number): void {
    if (this.targetsArray.length > 1) {
      this.targetsArray.removeAt(index);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.policyForm.valid) {
      const formValue = this.policyForm.value;
      const policy = {
        name: formValue.name,
        type: formValue.type,
        enabled: formValue.enabled,
        targets: formValue.targets.map((t: any) => t.value).filter((v: string) => v.trim()),
        thresholds: {
          latency: formValue.latencyThreshold,
          packetLoss: formValue.packetLossThreshold,
          jitter: formValue.jitterThreshold,
          responseTime: formValue.responseTimeThreshold,
          availability: formValue.availabilityThreshold
        },
        alertingEnabled: formValue.alertingEnabled
      };
      
      this.dialogRef.close(policy);
    }
  }
} 