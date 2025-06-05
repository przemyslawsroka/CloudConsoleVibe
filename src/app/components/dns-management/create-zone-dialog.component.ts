import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CreateZoneRequest } from '../../services/dns.service';

export interface CreateZoneDialogData {
  type: 'public' | 'private';
}

@Component({
  selector: 'app-create-zone-dialog',
  template: `
    <h2 mat-dialog-title>Create a DNS zone</h2>
    
    <mat-dialog-content>
      <form [formGroup]="zoneForm" class="zone-form">
        
        <!-- Zone type selection -->
        <div class="form-section">
          <h3>Zone type</h3>
          <mat-radio-group formControlName="visibility" class="zone-type-group">
            <mat-radio-button value="public" class="zone-type-option">
              <div class="radio-content">
                <div class="radio-header">
                  <strong>Public zone</strong>
                </div>
                <div class="radio-description">
                  Visible to the public internet
                </div>
              </div>
            </mat-radio-button>
            
            <mat-radio-button value="private" class="zone-type-option">
              <div class="radio-content">
                <div class="radio-header">
                  <strong>Private zone</strong>
                </div>
                <div class="radio-description">
                  Visible only from specified VPC networks
                </div>
              </div>
            </mat-radio-button>
          </mat-radio-group>
        </div>

        <!-- Zone name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Zone name</mat-label>
          <input matInput formControlName="name" placeholder="my-zone-name">
          <mat-hint>Must be 1-63 characters, lowercase letters, numbers, and hyphens</mat-hint>
          <mat-error *ngIf="zoneForm.get('name')?.hasError('required')">
            Zone name is required
          </mat-error>
          <mat-error *ngIf="zoneForm.get('name')?.hasError('pattern')">
            Invalid zone name format
          </mat-error>
        </mat-form-field>

        <!-- DNS name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>DNS name</mat-label>
          <input matInput formControlName="dnsName" placeholder="example.com.">
          <mat-hint>Must end with a period (.) and be a valid domain name</mat-hint>
          <mat-error *ngIf="zoneForm.get('dnsName')?.hasError('required')">
            DNS name is required
          </mat-error>
          <mat-error *ngIf="zoneForm.get('dnsName')?.hasError('pattern')">
            DNS name must be a valid domain ending with a period
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Optional description for this DNS zone"></textarea>
        </mat-form-field>

        <!-- VPC Networks (for private zones) -->
        <div *ngIf="zoneForm.get('visibility')?.value === 'private'" class="form-section">
          <h3>VPC networks</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select VPC networks</mat-label>
            <mat-select formControlName="networks" multiple>
              <mat-option value="projects/my-project/global/networks/default">default</mat-option>
              <mat-option value="projects/my-project/global/networks/custom-vpc">custom-vpc</mat-option>
              <mat-option value="projects/my-project/global/networks/test-vpc">test-vpc</mat-option>
            </mat-select>
            <mat-hint>Select VPC networks that can resolve this private zone</mat-hint>
          </mat-form-field>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!zoneForm.valid" 
              (click)="onCreate()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .zone-form {
      min-width: 500px;
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      color: #202124;
      font-size: 16px;
      font-weight: 500;
    }

    .zone-type-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .zone-type-option {
      padding: 16px;
      border: 1px solid #dadce0;
      border-radius: 8px;
      margin: 0;
    }

    .zone-type-option:hover {
      border-color: #1976d2;
    }

    .zone-type-option.mat-radio-checked {
      border-color: #1976d2;
      background-color: #f8f9ff;
    }

    .radio-content {
      margin-left: 8px;
    }

    .radio-header {
      margin-bottom: 4px;
    }

    .radio-description {
      color: #5f6368;
      font-size: 14px;
    }

    ::ng-deep .mat-radio-button .mat-radio-ripple {
      display: none;
    }

    ::ng-deep .mat-radio-button .mat-radio-container {
      margin-right: 8px;
    }
  `]
})
export class CreateZoneDialogComponent implements OnInit {
  zoneForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateZoneDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateZoneDialogData
  ) {
    this.zoneForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)]],
      dnsName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9.-]+\.$/)]],
      description: [''],
      visibility: [data?.type || 'public', Validators.required],
      networks: [[]]
    });
  }

  ngOnInit() {
    // Set validators for networks field when visibility is private
    this.zoneForm.get('visibility')?.valueChanges.subscribe(visibility => {
      const networksControl = this.zoneForm.get('networks');
      if (visibility === 'private') {
        networksControl?.setValidators([Validators.required]);
      } else {
        networksControl?.clearValidators();
      }
      networksControl?.updateValueAndValidity();
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (this.zoneForm.valid) {
      const formValue = this.zoneForm.value;
      const zoneData: CreateZoneRequest = {
        name: formValue.name,
        dnsName: formValue.dnsName,
        description: formValue.description || undefined,
        visibility: formValue.visibility,
        networks: formValue.visibility === 'private' ? formValue.networks : undefined
      };
      
      this.dialogRef.close(zoneData);
    }
  }
} 