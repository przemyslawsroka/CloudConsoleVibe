import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TlsInspectionPolicyRequest } from '../../services/tls-inspection.service';

export interface CreateTlsInspectionPolicyDialogData {
  // Optional initial data
}

@Component({
  selector: 'app-create-tls-inspection-policy-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Create TLS inspection policy</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="policyForm" class="policy-form">
          
          <!-- Basic information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <!-- Name field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name *</mat-label>
              <input matInput formControlName="name" placeholder="Enter policy name">
              <mat-hint>Use lowercase letters, numbers, and hyphens</mat-hint>
              <mat-error *ngIf="policyForm.get('name')?.hasError('required')">
                Name is required
              </mat-error>
              <mat-error *ngIf="policyForm.get('name')?.hasError('pattern')">
                Name must contain only lowercase letters, numbers, and hyphens
              </mat-error>
            </mat-form-field>

            <!-- Description field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                        placeholder="Describe the purpose of this TLS inspection policy"></textarea>
            </mat-form-field>
          </div>

          <!-- TLS inspection configuration -->
          <div class="form-section">
            <h3>TLS Inspection Configuration</h3>
            
            <!-- CA Pool field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>CA Pool *</mat-label>
              <input matInput formControlName="caPool" 
                     placeholder="projects/[PROJECT]/locations/[LOCATION]/caPools/[CA_POOL]">
              <mat-hint>Full path to the Certificate Authority pool for TLS inspection</mat-hint>
              <mat-error *ngIf="policyForm.get('caPool')?.hasError('required')">
                CA Pool is required
              </mat-error>
              <mat-error *ngIf="policyForm.get('caPool')?.hasError('pattern')">
                CA Pool must be a valid resource path
              </mat-error>
            </mat-form-field>

            <!-- Exclude public CA set -->
            <div class="checkbox-section">
              <mat-checkbox formControlName="excludePublicCaSet">
                Exclude public CA set
              </mat-checkbox>
              <p class="checkbox-description">
                When enabled, traffic encrypted with certificates signed by public CAs will not be intercepted.
                Only traffic encrypted with certificates from your specified CA pool will be inspected.
              </p>
            </div>
          </div>

          <!-- Additional settings -->
          <div class="form-section">
            <h3>Additional Settings</h3>
            
            <div class="info-box">
              <mat-icon>info</mat-icon>
              <div class="info-content">
                <h4>Important Notes</h4>
                <ul>
                  <li>TLS inspection policies require a valid Certificate Authority (CA) pool</li>
                  <li>The CA pool must be in the same project and location as the policy</li>
                  <li>Ensure your firewall rules are configured to use this TLS inspection policy</li>
                  <li>TLS inspection may impact network performance due to decryption overhead</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Summary section -->
          <div class="form-section summary-section">
            <h3>Summary</h3>
            <div class="summary-content">
              <div class="summary-item">
                <span class="label">Name:</span>
                <span class="value">{{ policyForm.get('name')?.value || 'Not specified' }}</span>
              </div>
              <div class="summary-item">
                <span class="label">CA Pool:</span>
                <span class="value">{{ getSimpleCaPoolName() || 'Not specified' }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Exclude Public CA Set:</span>
                <span class="value">{{ policyForm.get('excludePublicCaSet')?.value ? 'Yes' : 'No' }}</span>
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <!-- Dialog actions -->
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!policyForm.valid" 
                (click)="onCreate()">
          Create Policy
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 800px;
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

    .policy-form {
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f1f3f4;
    }

    .form-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .checkbox-section {
      margin-bottom: 16px;
    }

    .checkbox-description {
      margin: 8px 0 0 32px;
      color: #5f6368;
      font-size: 13px;
      line-height: 1.4;
    }

    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #e8f0fe;
      border-radius: 8px;
      border-left: 4px solid #4285f4;
    }

    .info-box mat-icon {
      color: #4285f4;
      margin-top: 2px;
    }

    .info-content h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }

    .info-content ul {
      margin: 0;
      padding-left: 16px;
      color: #5f6368;
      font-size: 13px;
      line-height: 1.4;
    }

    .info-content li {
      margin-bottom: 4px;
    }

    .summary-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      border-bottom: none;
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }

    .summary-item .label {
      font-weight: 500;
      color: #202124;
    }

    .summary-item .value {
      color: #5f6368;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    /* Custom checkbox styling */
    ::ng-deep .mat-checkbox {
      margin-bottom: 4px;
    }

    ::ng-deep .mat-checkbox .mat-checkbox-label {
      font-weight: 500;
      color: #202124;
    }
  `]
})
export class CreateTlsInspectionPolicyDialogComponent implements OnInit {
  policyForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateTlsInspectionPolicyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateTlsInspectionPolicyDialogData
  ) {
    this.policyForm = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.pattern(/^[a-z0-9-]*$/)
      ]],
      description: [''],
      caPool: ['', [
        Validators.required,
        Validators.pattern(/^projects\/[^\/]+\/locations\/[^\/]+\/caPools\/[^\/]+$/)
      ]],
      excludePublicCaSet: [false]
    });
  }

  ngOnInit() {
    // Monitor form changes for real-time validation
    this.policyForm.valueChanges.subscribe(() => {
      // Additional validation logic can be added here
    });
  }

  getSimpleCaPoolName(): string {
    const caPool = this.policyForm.get('caPool')?.value;
    if (!caPool) return '';
    
    // Extract CA pool name from full path
    const parts = caPool.split('/');
    return parts[parts.length - 1] || caPool;
  }

  onCreate() {
    if (this.policyForm.valid) {
      const formValue = this.policyForm.value;
      
      const policyData: TlsInspectionPolicyRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        caPool: formValue.caPool,
        excludePublicCaSet: formValue.excludePublicCaSet
      };
      
      this.dialogRef.close(policyData);
    }
  }
} 