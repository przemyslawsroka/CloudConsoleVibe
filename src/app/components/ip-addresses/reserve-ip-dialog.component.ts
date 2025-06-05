import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface ReserveIpDialogData {
  type: 'external' | 'internal';
}

@Component({
  selector: 'app-reserve-ip-dialog',
  template: `
    <h2 mat-dialog-title>Reserve {{ data.type }} static IP address</h2>
    
    <mat-dialog-content>
      <form [formGroup]="reserveForm" class="reserve-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter a name for this IP address">
          <mat-error *ngIf="reserveForm.get('name')?.hasError('required')">
            Name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Region</mat-label>
          <mat-select formControlName="region">
            <mat-option value="us-central1">us-central1</mat-option>
            <mat-option value="us-east1">us-east1</mat-option>
            <mat-option value="us-west1">us-west1</mat-option>
            <mat-option value="europe-west1">europe-west1</mat-option>
            <mat-option value="asia-east1">asia-east1</mat-option>
          </mat-select>
          <mat-error *ngIf="reserveForm.get('region')?.hasError('required')">
            Region is required
          </mat-error>
        </mat-form-field>

        <div *ngIf="data.type === 'internal'">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Network</mat-label>
            <mat-select formControlName="network">
              <mat-option value="default">default</mat-option>
              <mat-option value="przemeksroka-test">przemeksroka-test</mat-option>
            </mat-select>
            <mat-error *ngIf="reserveForm.get('network')?.hasError('required')">
              Network is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Subnetwork</mat-label>
            <mat-select formControlName="subnetwork">
              <mat-option value="default">default</mat-option>
              <mat-option value="przemeksroka-test">przemeksroka-test</mat-option>
            </mat-select>
            <mat-error *ngIf="reserveForm.get('subnetwork')?.hasError('required')">
              Subnetwork is required
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>IP version</mat-label>
          <mat-select formControlName="ipVersion">
            <mat-option value="IPv4">IPv4</mat-option>
            <mat-option value="IPv6">IPv6</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="ip-assignment-section">
          <h4>IP assignment</h4>
          <mat-radio-group formControlName="ipAssignment">
            <mat-radio-button value="automatic">
              Let Google Cloud assign an IP address
            </mat-radio-button>
            <mat-radio-button value="custom">
              Let me specify an IP address
            </mat-radio-button>
          </mat-radio-group>

          <mat-form-field 
            *ngIf="reserveForm.get('ipAssignment')?.value === 'custom'" 
            appearance="outline" 
            class="full-width custom-ip-field">
            <mat-label>Custom IP address</mat-label>
            <input matInput formControlName="customIp" placeholder="Enter IP address">
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="!reserveForm.valid"
        (click)="onReserve()">
        Reserve
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .reserve-form {
      min-width: 500px;
      max-width: 600px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .ip-assignment-section {
      margin: 24px 0;
    }

    .ip-assignment-section h4 {
      margin: 0 0 16px 0;
      font-weight: 500;
      color: #202124;
    }

    .custom-ip-field {
      margin-top: 16px;
    }

    mat-radio-button {
      display: block;
      margin-bottom: 12px;
    }

    mat-dialog-actions {
      padding: 16px 0;
    }
  `]
})
export class ReserveIpDialogComponent {
  reserveForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ReserveIpDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReserveIpDialogData,
    private fb: FormBuilder
  ) {
    this.reserveForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      region: ['us-central1', Validators.required],
      network: this.data.type === 'internal' ? ['default', Validators.required] : [''],
      subnetwork: this.data.type === 'internal' ? ['default', Validators.required] : [''],
      ipVersion: ['IPv4'],
      ipAssignment: ['automatic'],
      customIp: ['']
    });
  }

  onReserve() {
    if (this.reserveForm.valid) {
      this.dialogRef.close(this.reserveForm.value);
    }
  }
} 