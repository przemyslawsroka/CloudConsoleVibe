import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AWSAuthService } from '../../services/aws-auth.service';
import { AWSEC2Service } from '../../services/aws-ec2.service';

@Component({
  selector: 'app-aws-config',
  template: `
    <div class="aws-config-container">
      <div class="config-header">
        <h2>AWS Configuration</h2>
        <p>Connect to your AWS account to view EC2 instances</p>
      </div>

      <div class="config-form" *ngIf="!isAuthenticated">
        <form [formGroup]="configForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Access Key ID</mat-label>
            <input matInput formControlName="accessKeyId" type="text" 
                   placeholder="AKIA...">
            <mat-error *ngIf="configForm.get('accessKeyId')?.hasError('required')">
              Access Key ID is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Secret Access Key</mat-label>
            <input matInput formControlName="secretAccessKey" type="password">
            <mat-error *ngIf="configForm.get('secretAccessKey')?.hasError('required')">
              Secret Access Key is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Region</mat-label>
            <mat-select formControlName="region">
              <mat-option value="us-east-1">US East (N. Virginia)</mat-option>
              <mat-option value="us-east-2">US East (Ohio)</mat-option>
              <mat-option value="us-west-1">US West (N. California)</mat-option>
              <mat-option value="us-west-2">US West (Oregon)</mat-option>
              <mat-option value="eu-west-1">Europe (Ireland)</mat-option>
              <mat-option value="eu-central-1">Europe (Frankfurt)</mat-option>
              <mat-option value="ap-southeast-1">Asia Pacific (Singapore)</mat-option>
              <mat-option value="ap-northeast-1">Asia Pacific (Tokyo)</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" 
                    [disabled]="configForm.invalid || loading">
              <mat-icon>cloud</mat-icon>
              Connect to AWS
            </button>
          </div>
        </form>

        <div class="security-notice">
          <mat-icon color="warn">warning</mat-icon>
          <p>
            <strong>Security Notice:</strong> This is a demo implementation. 
            In production, use IAM roles, temporary credentials, or AWS SSO for secure authentication.
          </p>
        </div>
      </div>

      <div class="authenticated-status" *ngIf="isAuthenticated">
        <div class="status-card">
          <mat-icon color="primary">check_circle</mat-icon>
          <div class="status-content">
            <h3>Connected to AWS</h3>
            <p>Region: {{ currentRegion }}</p>
            <p>Your AWS EC2 instances will now appear in the VM instances list.</p>
          </div>
          <button mat-button color="warn" (click)="disconnect()">
            <mat-icon>logout</mat-icon>
            Disconnect
          </button>
        </div>

        <div class="actions-section">
          <button mat-raised-button color="primary" (click)="loadInstances()">
            <mat-icon>refresh</mat-icon>
            Load EC2 Instances
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .aws-config-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .config-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .config-header h2 {
      color: #ff9900;
      margin: 0 0 8px 0;
    }

    .config-form {
      background: white;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }

    .security-notice {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 24px;
      padding: 16px;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
    }

    .security-notice p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }

    .authenticated-status {
      text-align: center;
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      margin-bottom: 24px;
    }

    .status-content {
      flex: 1;
      text-align: left;
    }

    .status-content h3 {
      margin: 0 0 8px 0;
      color: #4285f4;
    }

    .status-content p {
      margin: 4px 0;
      color: #666;
      font-size: 14px;
    }

    .actions-section {
      display: flex;
      justify-content: center;
    }
  `]
})
export class AwsConfigComponent implements OnInit {
  configForm: FormGroup;
  loading = false;
  isAuthenticated = false;
  currentRegion = '';

  constructor(
    private fb: FormBuilder,
    private awsAuth: AWSAuthService,
    private awsEc2: AWSEC2Service,
    private snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      accessKeyId: ['', Validators.required],
      secretAccessKey: ['', Validators.required],
      region: ['us-east-1', Validators.required]
    });
  }

  ngOnInit() {
    this.isAuthenticated = this.awsAuth.isAuthenticated();
    if (this.isAuthenticated) {
      const credentials = this.awsAuth.getCredentials();
      this.currentRegion = credentials?.region || '';
    }
  }

  async onSubmit() {
    if (this.configForm.valid) {
      this.loading = true;
      const { accessKeyId, secretAccessKey, region } = this.configForm.value;
      
      try {
        const success = this.awsAuth.setCredentials(accessKeyId, secretAccessKey, region);
        if (success) {
          this.isAuthenticated = true;
          this.currentRegion = region;
          this.snackBar.open('Successfully connected to AWS!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // Try to load instances
          await this.loadInstances();
        } else {
          this.snackBar.open('Failed to save AWS credentials', 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      } catch (error) {
        this.snackBar.open('Error connecting to AWS', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading = false;
      }
    }
  }

  async loadInstances() {
    this.loading = true;
    try {
      await this.awsEc2.loadInstances();
      this.snackBar.open('EC2 instances loaded successfully!', 'Close', { 
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error: any) {
      this.snackBar.open(`Failed to load instances: ${error.message}`, 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }

  disconnect() {
    this.awsAuth.clearCredentials();
    this.isAuthenticated = false;
    this.currentRegion = '';
    this.configForm.reset({ region: 'us-east-1' });
    this.snackBar.open('Disconnected from AWS', 'Close', { duration: 3000 });
  }
} 