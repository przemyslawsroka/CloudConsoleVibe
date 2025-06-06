import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MonitoringPoint } from '../../services/appneta.service';

@Component({
  selector: 'app-create-web-path-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>Create Web Path</h2>
        <p class="dialog-subtitle">Configure a new web path for monitoring application performance and user experience</p>
      </div>

      <div mat-dialog-content>
        <form [formGroup]="webPathForm" class="web-path-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Path Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Main Website Health Check">
              <mat-error *ngIf="webPathForm.get('name')?.hasError('required')">
                Path name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>URL</mat-label>
              <input matInput formControlName="url" placeholder="https://example.com">
              <mat-error *ngIf="webPathForm.get('url')?.hasError('required')">
                URL is required
              </mat-error>
              <mat-error *ngIf="webPathForm.get('url')?.hasError('pattern')">
                Please enter a valid URL
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (Optional)</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                       placeholder="Brief description of what this web path monitors"></textarea>
            </mat-form-field>
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
              <mat-error *ngIf="webPathForm.get('monitoringPoint')?.hasError('required')">
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
                  <mat-option value="60">1 hour</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>HTTP Method</mat-label>
                <mat-select formControlName="httpMethod">
                  <mat-option value="GET">GET</mat-option>
                  <mat-option value="POST">POST</mat-option>
                  <mat-option value="PUT">PUT</mat-option>
                  <mat-option value="HEAD">HEAD</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Timeout (seconds)</mat-label>
                <input matInput type="number" formControlName="timeout" placeholder="30">
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>User Agent</mat-label>
                <mat-select formControlName="userAgent">
                  <mat-option value="Chrome">Chrome Browser</mat-option>
                  <mat-option value="Firefox">Firefox Browser</mat-option>
                  <mat-option value="Safari">Safari Browser</mat-option>
                  <mat-option value="Custom">Custom</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <div class="form-section">
            <h3>Authentication & Headers</h3>
            <p class="section-description">Configure authentication and custom headers if required</p>
            
            <div class="checkbox-section">
              <mat-checkbox formControlName="requiresAuth">
                Requires Authentication
              </mat-checkbox>
            </div>

            <div *ngIf="webPathForm.get('requiresAuth')?.value" class="auth-section">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Username</mat-label>
                  <input matInput formControlName="username">
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Password</mat-label>
                  <input matInput type="password" formControlName="password">
                </mat-form-field>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Custom Headers (Optional)</mat-label>
              <textarea matInput formControlName="customHeaders" rows="3" 
                       placeholder="Authorization: Bearer token&#10;Content-Type: application/json"></textarea>
              <mat-hint>One header per line in format: Header-Name: Value</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-section">
            <h3>Performance Thresholds</h3>
            <p class="section-description">Set performance thresholds to trigger alerts</p>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Response Time Threshold (ms)</mat-label>
                <input matInput type="number" formControlName="responseTimeThreshold" placeholder="2000">
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Availability Threshold (%)</mat-label>
                <input matInput type="number" formControlName="availabilityThreshold" placeholder="99">
              </mat-form-field>
            </div>

            <div class="checkbox-section">
              <mat-checkbox formControlName="enableAlerting">
                Enable alerting for this web path
              </mat-checkbox>
            </div>

            <div class="checkbox-section">
              <mat-checkbox formControlName="followRedirects">
                Follow HTTP redirects
              </mat-checkbox>
            </div>

            <div class="checkbox-section">
              <mat-checkbox formControlName="validateSSL">
                Validate SSL certificates
              </mat-checkbox>
            </div>
          </div>
        </form>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!webPathForm.valid" 
                (click)="onCreate()">
          Create Web Path
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

    .web-path-form {
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

    .checkbox-section {
      margin: 16px 0;
    }

    .auth-section {
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
export class CreateWebPathDialogComponent {
  webPathForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CreateWebPathDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { monitoringPoints: MonitoringPoint[] },
    private fb: FormBuilder
  ) {
    this.webPathForm = this.fb.group({
      name: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      description: [''],
      monitoringPoint: ['', Validators.required],
      testInterval: [5],
      httpMethod: ['GET'],
      timeout: [30],
      userAgent: ['Chrome'],
      requiresAuth: [false],
      username: [''],
      password: [''],
      customHeaders: [''],
      responseTimeThreshold: [2000],
      availabilityThreshold: [99],
      enableAlerting: [true],
      followRedirects: [true],
      validateSSL: [true]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreate(): void {
    if (this.webPathForm.valid) {
      const formValue = this.webPathForm.value;
      const webPath = {
        name: formValue.name,
        url: formValue.url,
        monitoringPoint: formValue.monitoringPoint,
        status: 'OK' as const
      };
      
      this.dialogRef.close(webPath);
    }
  }
} 