import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InternalRangesService } from '../../services/internal-ranges.service';

@Component({
  selector: 'app-reserve-internal-range-dialog',
  template: `
    <h2 mat-dialog-title>Reserve internal range</h2>
    
    <mat-dialog-content>
      <form [formGroup]="rangeForm" class="range-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter range name">
          <mat-hint>Name must be 1-63 characters long and match regex [a-z]([-a-z0-9]*[a-z0-9])?</mat-hint>
          <mat-error *ngIf="rangeForm.get('name')?.hasError('required')">Name is required</mat-error>
          <mat-error *ngIf="rangeForm.get('name')?.hasError('pattern')">Invalid name format</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" placeholder="Enter description (optional)">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>IP range</mat-label>
          <input matInput formControlName="ipRange" placeholder="Enter IP range (CIDR notation)">
          <mat-hint>Example: 10.0.0.0/24</mat-hint>
          <mat-error *ngIf="rangeForm.get('ipRange')?.hasError('required')">IP range is required</mat-error>
          <mat-error *ngIf="rangeForm.get('ipRange')?.hasError('pattern')">Invalid CIDR format</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>IP version</mat-label>
          <mat-select formControlName="ipVersion">
            <mat-option value="IPv4">IPv4</mat-option>
            <mat-option value="IPv6">IPv6</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>VPC Network</mat-label>
          <mat-select formControlName="vpcNetwork">
            <mat-option value="default">default</mat-option>
            <mat-option value="custom-network">custom-network</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onReserve()" 
              [disabled]="!rangeForm.valid || isReserving">
        <mat-spinner *ngIf="isReserving" diameter="20"></mat-spinner>
        {{isReserving ? 'Reserving...' : 'Reserve'}}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .range-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 500px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-content {
      padding: 20px 24px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    .mat-mdc-progress-spinner {
      margin-right: 8px;
    }
  `]
})
export class ReserveInternalRangeDialogComponent {
  rangeForm: FormGroup;
  isReserving = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ReserveInternalRangeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private internalRangesService: InternalRangesService,
    private snackBar: MatSnackBar
  ) {
    this.rangeForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z]([-a-z0-9]*[a-z0-9])?$/)]],
      description: [''],
      ipRange: ['', [Validators.required, Validators.pattern(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/)]],
      ipVersion: ['IPv4', Validators.required],
      vpcNetwork: ['default', Validators.required]
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onReserve() {
    if (this.rangeForm.valid) {
      this.isReserving = true;
      const rangeConfig = this.rangeForm.value;

      this.internalRangesService.reserveInternalRange(rangeConfig).subscribe({
        next: (result) => {
          this.isReserving = false;
          this.dialogRef.close(result);
        },
        error: (error) => {
          this.isReserving = false;
          console.error('Error reserving internal range:', error);
          this.snackBar.open('Error reserving internal range', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }
} 