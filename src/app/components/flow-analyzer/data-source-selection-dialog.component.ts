import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FlowAnalyzerService, LogBucket, LogView } from '../../services/flow-analyzer.service';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { startWith, switchMap, debounceTime, distinctUntilChanged, catchError, map } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';

export interface DataSourceSelectionDialogData {
  projectId: string;
  currentBucket?: string;
  currentView?: string;
  currentLocation?: string;
}

export interface DataSourceSelectionResult {
  bucket: string;
  view: string;
  location: string;
  enableVpcFlowLogsFilter: boolean;
}

@Component({
  selector: 'app-data-source-selection-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Select data source</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="dataSourceForm" class="data-source-form">
          
          <!-- Log bucket selection -->
          <div class="form-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Log bucket</mat-label>
              <mat-select formControlName="bucket" (selectionChange)="onBucketChange($event)" [disabled]="isLoadingBuckets">
                <mat-option *ngFor="let bucket of availableBuckets$ | async" [value]="bucket.name">
                  <div class="bucket-option">
                    <div class="bucket-name">{{ bucket.displayName }}</div>
                    <div class="bucket-description" *ngIf="bucket.description">{{ bucket.description }}</div>
                    <div class="bucket-status" *ngIf="bucket.analyticsEnabled">
                      <mat-icon class="analytics-icon">analytics</mat-icon>
                      <span>Analytics enabled</span>
                    </div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="!bucketsError">Select the log bucket that contains your VPC Flow Logs</mat-hint>
              <mat-error *ngIf="bucketsError">{{ bucketsError }}</mat-error>
              <mat-spinner *ngIf="isLoadingBuckets" diameter="20" style="margin: 8px auto;"></mat-spinner>
            </mat-form-field>
          </div>

          <!-- Log bucket view selection -->
          <div class="form-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Log bucket view</mat-label>
              <mat-select formControlName="view" [disabled]="isViewDisabled() || isLoadingViews">
                <mat-option *ngFor="let view of availableViews$ | async" [value]="view.name">
                  <div class="view-option">
                    <div class="view-name">{{ view.displayName }}</div>
                    <div class="view-description" *ngIf="view.description">{{ view.description }}</div>
                    <div class="view-filter" *ngIf="view.filter">
                      <span class="filter-label">Filter:</span>
                      <code>{{ view.filter.length > 100 ? view.filter.substring(0, 100) + '...' : view.filter }}</code>
                    </div>
                  </div>
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="!viewsError">Select the log view to query from the bucket</mat-hint>
              <mat-error *ngIf="viewsError">{{ viewsError }}</mat-error>
              <mat-spinner *ngIf="isLoadingViews" diameter="20" style="margin: 8px auto;"></mat-spinner>
            </mat-form-field>
          </div>

          <!-- VPC Flow Logs configuration filter -->
          <div class="form-section">
            <mat-checkbox formControlName="enableVpcFlowLogsFilter">
              Select VPC Flow Logs configurations
            </mat-checkbox>
            <p class="checkbox-description">
              When enabled, only VPC Flow Logs will be included in the analysis. 
              This applies additional filtering to focus on network flow data.
            </p>
          </div>

          <!-- Data availability status -->
          <div class="status-section">
            <div class="status-card default-status" *ngIf="!vpcLogsStatus$">
              <mat-icon>info</mat-icon>
              <div class="status-content">
                <div class="status-message">VPC Flow Logs availability not checked</div>
                <div class="status-details">
                  Click "Test Availability" to check if VPC Flow Logs are enabled for this bucket and view.
                </div>
                <div class="status-actions">
                  <button mat-button color="primary" (click)="testVpcLogsAvailability()" type="button">
                    <mat-icon>refresh</mat-icon>
                    Test Availability
                  </button>
                </div>
              </div>
            </div>
            
            <div class="status-card" [ngClass]="getStatusClass(status)" *ngIf="vpcLogsStatus$ | async as status">
              <mat-icon>{{ getStatusIcon(status) }}</mat-icon>
              <div class="status-content">
                <div class="status-message">{{ status.message }}</div>
                <div class="status-details" *ngIf="status.available">
                  {{ status.sampleCount }} logs found in the last hour
                </div>
                <div class="status-actions">
                  <button mat-button color="primary" (click)="testVpcLogsAvailability()" type="button">
                    <mat-icon>refresh</mat-icon>
                    Test Availability
                  </button>
                </div>
                <div class="status-help" *ngIf="!status.available && isApiError(status.message)">
                  <strong>Troubleshooting:</strong>
                  <ul>
                    <li *ngIf="status.message.includes('Authentication')">
                      Sign in to your Google Cloud account using the login button
                    </li>
                    <li *ngIf="status.message.includes('permissions')">
                      Contact your administrator to grant you the "Logging Viewer" role
                    </li>
                    <li *ngIf="status.message.includes('CORS')">
                      This is a development environment issue. The query will still work.
                    </li>
                    <li *ngIf="!status.message.includes('Authentication') && !status.message.includes('permissions') && !status.message.includes('CORS')">
                      You can still proceed - the Flow Analyzer will use available data or mock data for testing
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Help section -->
          <div class="help-section">
            <mat-expansion-panel class="help-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>help_outline</mat-icon>
                  <span>Setup Help</span>
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <div class="help-content">
                <h4>To use VPC Flow Logs analysis:</h4>
                <ol>
                  <li>Enable VPC Flow Logs on your VPC networks</li>
                  <li>Upgrade your log bucket to support Log Analytics</li>
                  <li>Ensure your account has appropriate IAM permissions</li>
                  <li>Wait for logs to start flowing (5-10 minutes)</li>
                </ol>
                
                <div class="help-actions">
                  <button mat-button color="primary" (click)="openSetupGuide()" type="button">
                    <mat-icon>open_in_new</mat-icon>
                    Setup Guide
                  </button>
                  <button mat-button color="accent" (click)="checkAuthentication()" type="button">
                    <mat-icon>security</mat-icon>
                    Check Auth
                  </button>
                  <button mat-button color="warn" (click)="testProxy()" type="button">
                    <mat-icon>network_check</mat-icon>
                    Test Proxy
                  </button>
                </div>
              </div>
            </mat-expansion-panel>
          </div>

        </form>
      </mat-dialog-content>

      <!-- Dialog actions -->
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!dataSourceForm.valid" 
                (click)="onApply()">
          Apply
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 600px;
      max-width: 90vw;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
    }

    .dialog-content {
      padding: 0;
      margin: 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .data-source-form {
      padding: 24px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    /* Bucket option styling */
    .bucket-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
    }

    .bucket-name {
      font-weight: 500;
      color: #202124;
    }

    .bucket-description {
      font-size: 12px;
      color: #5f6368;
    }

    .bucket-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #1a73e8;
    }

    .analytics-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    /* View option styling */
    .view-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
    }

    .view-name {
      font-weight: 500;
      color: #202124;
    }

    .view-description {
      font-size: 12px;
      color: #5f6368;
    }

    .view-filter {
      font-size: 11px;
      color: #5f6368;
    }

    .filter-label {
      font-weight: 500;
      margin-right: 4px;
    }

    /* Checkbox section */
    .checkbox-description {
      margin: 8px 0 0 32px;
      color: #5f6368;
      font-size: 13px;
      line-height: 1.4;
    }

    /* Status section */
    .status-section {
      margin-bottom: 24px;
    }

    .status-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid;
    }

    .status-available {
      background: #e8f5e8;
      border-color: #4caf50;
      color: #2e7d2e;
    }

    .status-unavailable {
      background: #fff3e0;
      border-color: #ff9800;
      color: #e65100;
    }

    .default-status {
      background: #f5f5f5;
      border-color: #9e9e9e;
      color: #424242;
    }

    .status-content {
      flex: 1;
    }

    .status-message {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .status-details {
      font-size: 13px;
      opacity: 0.8;
    }

    .status-actions {
      margin-top: 12px;
      margin-bottom: 12px;
    }

    .status-help {
      margin-top: 12px;
      font-size: 13px;
      line-height: 1.4;
    }

    .status-help strong {
      color: #202124;
      display: block;
      margin-bottom: 8px;
    }

    .status-help ul {
      margin: 0;
      padding-left: 16px;
    }

    .status-help li {
      margin-bottom: 4px;
    }

    /* Help section */
    .help-section {
      margin-bottom: 24px;
    }

    .help-panel {
      box-shadow: none;
      border: 1px solid #e0e0e0;
    }

    .help-content {
      color: #5f6368;
      font-size: 14px;
      line-height: 1.5;
    }

    .help-content h4 {
      margin: 0 0 12px 0;
      color: #202124;
      font-size: 14px;
      font-weight: 500;
    }

    .help-content ol {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }

    .help-content li {
      margin-bottom: 4px;
    }

    .help-actions {
      display: flex;
      gap: 8px;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    /* Material overrides */
    ::ng-deep .mat-expansion-panel-header {
      height: 48px;
    }

    ::ng-deep .mat-expansion-panel-header mat-icon {
      margin-right: 8px;
    }

    ::ng-deep .mat-checkbox {
      margin-bottom: 4px;
    }

    ::ng-deep .mat-checkbox .mat-checkbox-label {
      font-weight: 500;
      color: #202124;
    }

    ::ng-deep .mat-select-panel .mat-option {
      height: auto;
      line-height: normal;
      padding: 12px 16px;
    }
  `]
})
export class DataSourceSelectionDialogComponent implements OnInit {
  dataSourceForm: FormGroup;
  availableBuckets$!: Observable<LogBucket[]>;
  availableViews$!: Observable<LogView[]>;
  vpcLogsStatus$!: Observable<{ available: boolean; sampleCount: number; message: string }>;
  
  private selectedBucket$ = new BehaviorSubject<string>('');
  private selectedView$ = new BehaviorSubject<string>('');
  
  // Error handling
  bucketsError: string | null = null;
  viewsError: string | null = null;
  isLoadingBuckets = false;
  isLoadingViews = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DataSourceSelectionDialogComponent>,
    private flowAnalyzerService: FlowAnalyzerService,
    @Inject(MAT_DIALOG_DATA) public data: DataSourceSelectionDialogData
  ) {
    this.dataSourceForm = this.fb.group({
      bucket: [{ value: data.currentBucket || '_Default', disabled: false }, Validators.required],
      view: [{ value: data.currentView || '_AllLogs', disabled: false }, Validators.required],
      enableVpcFlowLogsFilter: [true]
    });
  }

  ngOnInit() {
    this.isLoadingBuckets = true;
    this.bucketsError = null;
    
    // Load available log buckets with error handling
    this.availableBuckets$ = this.flowAnalyzerService.getLogBuckets(
      this.data.projectId, 
      this.data.currentLocation || 'global'
    ).pipe(
      map(buckets => {
        this.isLoadingBuckets = false;
        this.bucketsError = null;
        return buckets;
      }),
      catchError(error => {
        this.isLoadingBuckets = false;
        console.error('Failed to load log buckets:', error);
        this.bucketsError = this.getErrorMessage(error);
        // Return empty array instead of throwing
        return of([]);
      })
    );

    // Load available views based on selected bucket with error handling
    this.availableViews$ = this.dataSourceForm.get('bucket')!.valueChanges.pipe(
      startWith(this.dataSourceForm.get('bucket')?.value),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(bucketName => {
        if (!bucketName) return of([]);
        
        this.isLoadingViews = true;
        this.viewsError = null;
        
        return this.flowAnalyzerService.getLogViews(
          this.data.projectId,
          this.data.currentLocation || 'global',
          bucketName
        ).pipe(
          map(views => {
            this.isLoadingViews = false;
            this.viewsError = null;
            return views;
          }),
          catchError(error => {
            this.isLoadingViews = false;
            console.error('Failed to load log views:', error);
            this.viewsError = this.getErrorMessage(error);
            // Return empty array instead of throwing
            return of([]);
          })
        );
      })
    );

    // Don't automatically check VPC Flow Logs availability - let user trigger it manually
    // This prevents 404 errors on dialog open when Log Analytics is not available

    // Set initial values for the observables
    this.selectedBucket$.next(this.dataSourceForm.get('bucket')?.value);
    this.selectedView$.next(this.dataSourceForm.get('view')?.value);
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return 'Authentication required. Please sign in to your Google Cloud account.';
    } else if (error.status === 403) {
      return 'Insufficient permissions. You need "Logging Viewer" role to access log buckets.';
    } else if (error.status === 404) {
      return 'Resource not found. The log bucket or view may not exist.';
    } else {
      return `Error: ${error.message || 'Unable to connect to Google Cloud Logging API'}`;
    }
  }

  onBucketChange(change: MatSelectChange) {
    this.selectedBucket$.next(change.value);
    // Reset view selection when bucket changes
    this.dataSourceForm.get('view')?.setValue('_AllLogs');
  }

  onApply() {
    if (this.dataSourceForm.valid) {
      const formValue = this.dataSourceForm.value;
      
      const result: DataSourceSelectionResult = {
        bucket: formValue.bucket,
        view: formValue.view,
        location: this.data.currentLocation || 'global',
        enableVpcFlowLogsFilter: formValue.enableVpcFlowLogsFilter
      };
      
      this.dialogRef.close(result);
    }
  }

  openSetupGuide() {
    // Open setup guide - could navigate to documentation or show another dialog
    window.open('https://cloud.google.com/logging/docs/log-analytics', '_blank');
  }

  checkAuthentication() {
    const token = this.flowAnalyzerService['authService'].getAccessToken();
    if (!token) {
      alert('Please sign in to Google Cloud first using the login button in the top navigation.');
      return;
    }
    
    // Test if proxy is working
    console.log('Testing proxy configuration...');
    const isDevelopment = window.location.hostname === 'localhost';
    if (isDevelopment) {
      console.log('Development mode detected - using proxy URLs');
      console.log('Proxy should route /api/logging/* to https://logging.googleapis.com/*');
    }
    
    alert('Authentication token found. If you\'re still seeing errors, check your IAM permissions.');
  }

  testProxy() {
    // Simple test to check if proxy is working
    const testUrl = '/api/logging/v2/projects';
    console.log('Testing proxy with URL:', testUrl);
    
    this.flowAnalyzerService['http'].get(testUrl, { 
      headers: this.flowAnalyzerService['getHeaders']() 
    }).subscribe({
      next: (response) => {
        console.log('Proxy test successful:', response);
        alert('Proxy is working correctly!');
      },
      error: (error) => {
        console.error('Proxy test failed:', error);
        alert(`Proxy test failed: ${error.status} ${error.statusText}`);
      }
    });
  }

  testVpcLogsAvailability() {
    const bucket = this.dataSourceForm.get('bucket')?.value;
    const view = this.dataSourceForm.get('view')?.value;
    
    if (!bucket || !view) {
      alert('Please select both bucket and view first');
      return;
    }
    
    console.log('Testing VPC Flow Logs availability with real API...');
    
    // Use real API call to test VPC Flow Logs availability
    this.vpcLogsStatus$ = this.flowAnalyzerService.checkVpcFlowLogsAvailability(
      this.data.projectId,
      this.data.currentLocation || 'global',
      bucket,
      view
    );
  }

  getStatusClass(status: { available: boolean; sampleCount: number; message: string }) {
    return {
      'status-available': status.available,
      'status-unavailable': !status.available
    };
  }

  getStatusIcon(status: { available: boolean; sampleCount: number; message: string }) {
    return status.available ? 'check_circle' : 'warning';
  }

  isApiError(message: string) {
    return message.includes('Authentication') || message.includes('permissions') || message.includes('CORS');
  }

  isViewDisabled(): boolean {
    const bucket = this.dataSourceForm.get('bucket')?.value;
    return !bucket || this.dataSourceForm.get('view')?.value === '_AllLogs';
  }
} 