import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddressGroup, AddressGroupRequest } from '../../services/address-groups.service';

export interface EditAddressGroupDialogData {
  addressGroup: AddressGroup;
}

@Component({
  selector: 'app-edit-address-group-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Edit address group</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="groupForm" class="group-form">
          
          <!-- Basic information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <!-- Name field (read-only) -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput [value]="data.addressGroup.name" readonly>
              <mat-hint>Name cannot be changed after creation</mat-hint>
            </mat-form-field>

            <!-- Description field -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                        placeholder="Describe the purpose of this address group"></textarea>
            </mat-form-field>

            <!-- Type selection (read-only) -->
            <div class="form-group">
              <label class="form-label">Type</label>
              <mat-form-field appearance="outline" class="readonly-field">
                <mat-label>Type</mat-label>
                <input matInput [value]="data.addressGroup.type" readonly>
                <mat-hint>Type cannot be changed after creation</mat-hint>
              </mat-form-field>
            </div>

            <!-- Capacity field -->
            <mat-form-field appearance="outline" class="capacity-field">
              <mat-label>Capacity *</mat-label>
              <input matInput type="number" formControlName="capacity" 
                     placeholder="Maximum number of IP addresses" min="1" max="1000">
              <mat-hint>Maximum number of IP addresses this group can contain</mat-hint>
              <mat-error *ngIf="groupForm.get('capacity')?.hasError('required')">
                Capacity is required
              </mat-error>
              <mat-error *ngIf="groupForm.get('capacity')?.hasError('min')">
                Capacity must be at least 1
              </mat-error>
              <mat-error *ngIf="groupForm.get('capacity')?.hasError('max')">
                Capacity cannot exceed 1000
              </mat-error>
            </mat-form-field>
          </div>

          <!-- IP Addresses section -->
          <div class="form-section">
            <div class="section-header">
              <h3>IP Addresses</h3>
              <button type="button" mat-stroked-button color="primary" (click)="addIpAddress()">
                <mat-icon>add</mat-icon>
                Add IP Address
              </button>
            </div>
            
            <p class="section-description">
              Modify IP addresses or CIDR blocks in this group. You can add individual IPs (e.g., 192.168.1.100) 
              or CIDR blocks (e.g., 10.0.0.0/24).
            </p>

            <!-- IP Address list -->
            <div class="ip-addresses-list" formArrayName="items">
              <div *ngFor="let item of ipAddressesArray.controls; let i = index" class="ip-address-item">
                <mat-form-field appearance="outline" class="ip-input">
                  <mat-label>IP Address or CIDR Block</mat-label>
                  <input matInput [formControlName]="i" placeholder="e.g., 192.168.1.0/24">
                  <mat-error *ngIf="ipAddressesArray.at(i).hasError('pattern')">
                    Invalid IP address or CIDR format
                  </mat-error>
                </mat-form-field>
                <button type="button" mat-icon-button color="warn" (click)="removeIpAddress(i)" 
                        [disabled]="ipAddressesArray.length <= 1">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Add multiple IPs section -->
            <mat-expansion-panel class="bulk-import-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>upload</mat-icon>
                  Bulk Import
                </mat-panel-title>
                <mat-panel-description>
                  Add multiple IP addresses at once
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="bulk-import-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>IP Addresses (one per line)</mat-label>
                  <textarea matInput #bulkInput rows="6" 
                            placeholder="192.168.1.0/24&#10;10.0.0.100&#10;203.0.113.0/24"></textarea>
                  <mat-hint>Enter one IP address or CIDR block per line</mat-hint>
                </mat-form-field>
                
                <div class="bulk-import-actions">
                  <button type="button" mat-stroked-button (click)="importBulkIps(bulkInput.value)">
                    <mat-icon>add_circle</mat-icon>
                    Import Addresses
                  </button>
                  <button type="button" mat-button (click)="bulkInput.value = ''">
                    Clear
                  </button>
                </div>
              </div>
            </mat-expansion-panel>
          </div>

          <!-- Summary section -->
          <div class="form-section summary-section">
            <h3>Summary</h3>
            <div class="summary-content">
              <div class="summary-item">
                <span class="label">Name:</span>
                <span class="value">{{ data.addressGroup.name }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Type:</span>
                <span class="value">{{ data.addressGroup.type }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Capacity:</span>
                <span class="value">{{ groupForm.get('capacity')?.value || 'Not specified' }}</span>
              </div>
              <div class="summary-item">
                <span class="label">IP Addresses:</span>
                <span class="value">{{ getValidIpCount() }} / {{ groupForm.get('capacity')?.value || 0 }}</span>
              </div>
              <div class="summary-item" *ngIf="getValidIpCount() > (groupForm.get('capacity')?.value || 0)">
                <mat-icon class="warning-icon">warning</mat-icon>
                <span class="warning-text">Number of IP addresses exceeds capacity</span>
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <!-- Dialog actions -->
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!groupForm.valid || isCapacityExceeded()" 
                (click)="onUpdate()">
          Update Address Group
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

    .group-form {
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

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-description {
      color: #5f6368;
      font-size: 14px;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .readonly-field {
      width: 200px;
      margin-bottom: 16px;
    }

    .capacity-field {
      width: 300px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      color: #202124;
      font-size: 14px;
    }

    .ip-addresses-list {
      margin-bottom: 16px;
    }

    .ip-address-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ip-input {
      flex: 1;
    }

    .bulk-import-panel {
      margin-top: 16px;
    }

    .bulk-import-content {
      padding: 16px 0;
    }

    .bulk-import-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
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

    .warning-icon {
      color: #f57c00;
      font-size: 16px;
      margin-right: 8px;
    }

    .warning-text {
      color: #f57c00;
      font-size: 13px;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    /* Readonly field styling */
    .readonly-field input {
      color: #5f6368;
      background-color: #f8f9fa;
    }

    /* Expansion panel styling */
    ::ng-deep .bulk-import-panel .mat-expansion-panel-header {
      padding: 0 16px;
    }

    ::ng-deep .bulk-import-panel .mat-expansion-panel-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    ::ng-deep .bulk-import-panel .mat-expansion-panel-content .mat-expansion-panel-body {
      padding: 0 16px 16px;
    }
  `]
})
export class EditAddressGroupDialogComponent implements OnInit {
  groupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditAddressGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditAddressGroupDialogData
  ) {
    this.groupForm = this.fb.group({
      description: [data.addressGroup.description || ''],
      capacity: [data.addressGroup.capacity, [Validators.required, Validators.min(1), Validators.max(1000)]],
      items: this.fb.array([])
    });

    // Initialize IP addresses
    this.initializeIpAddresses();
  }

  ngOnInit() {
    // Monitor form changes for real-time validation
    this.groupForm.valueChanges.subscribe(() => {
      // Additional validation logic can be added here
    });
  }

  private initializeIpAddresses() {
    const items = this.data.addressGroup.items || [];
    const ipArray = this.groupForm.get('items') as FormArray;

    // Add existing IP addresses
    items.forEach(ip => {
      const control = this.createIpAddressControl();
      control.setValue(ip);
      ipArray.push(control);
    });

    // Add at least one empty control for new input
    if (ipArray.length === 0) {
      ipArray.push(this.createIpAddressControl());
    }
  }

  get ipAddressesArray(): FormArray {
    return this.groupForm.get('items') as FormArray;
  }

  createIpAddressControl(): FormControl {
    return this.fb.control('', [
      Validators.pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/)
    ]);
  }

  addIpAddress() {
    this.ipAddressesArray.push(this.createIpAddressControl());
  }

  removeIpAddress(index: number) {
    if (this.ipAddressesArray.length > 1) {
      this.ipAddressesArray.removeAt(index);
    }
  }

  importBulkIps(bulkText: string) {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Clear existing empty entries
    while (this.ipAddressesArray.length > 0) {
      this.ipAddressesArray.removeAt(0);
    }

    // Add all lines as separate IP entries
    lines.forEach(line => {
      const control = this.createIpAddressControl();
      control.setValue(line);
      this.ipAddressesArray.push(control);
    });

    // Add one empty entry for additional input
    this.ipAddressesArray.push(this.createIpAddressControl());
  }

  getValidIpCount(): number {
    return this.ipAddressesArray.controls
      .filter(control => control.value && control.value.trim() && control.valid)
      .length;
  }

  isCapacityExceeded(): boolean {
    const capacity = this.groupForm.get('capacity')?.value || 0;
    return this.getValidIpCount() > capacity;
  }

  onUpdate() {
    if (this.groupForm.valid && !this.isCapacityExceeded()) {
      const formValue = this.groupForm.value;
      
      // Filter out empty IP addresses
      const validIpAddresses = formValue.items
        .filter((item: string) => item && item.trim())
        .map((item: string) => item.trim());

      const updateData: Partial<AddressGroupRequest> = {
        description: formValue.description || undefined,
        capacity: formValue.capacity,
        items: validIpAddresses,
        type: this.data.addressGroup.type as 'IPV4' | 'IPV6'
      };
      
      this.dialogRef.close({ name: this.data.addressGroup.name, ...updateData });
    }
  }
} 