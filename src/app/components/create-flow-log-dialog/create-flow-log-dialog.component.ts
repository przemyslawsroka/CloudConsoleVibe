import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VpcService, VpcNetwork, FlowLog } from '../../services/vpc.service';

@Component({
  selector: 'app-create-flow-log-dialog',
  template: `
    <h2 mat-dialog-title>Enable Flow Logs</h2>
    <mat-dialog-content>
      <form [formGroup]="flowLogForm" class="flow-log-form">
        <div class="form-section">
          <h3>Basic Information</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter flow log name">
            <mat-error *ngIf="flowLogForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description" placeholder="Enter description">
          </mat-form-field>
        </div>

        <div class="form-section">
          <h3>Flow Log Settings</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Aggregation Interval</mat-label>
            <mat-select formControlName="aggregationInterval">
              <mat-option value="INTERVAL_5_SEC">5 seconds</mat-option>
              <mat-option value="INTERVAL_30_SEC">30 seconds</mat-option>
              <mat-option value="INTERVAL_1_MIN">1 minute</mat-option>
              <mat-option value="INTERVAL_5_MIN">5 minutes</mat-option>
              <mat-option value="INTERVAL_10_MIN">10 minutes</mat-option>
              <mat-option value="INTERVAL_15_MIN">15 minutes</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Flow Sampling</mat-label>
            <input matInput type="number" formControlName="flowSampling" min="0" max="1" step="0.01">
            <mat-hint>Sampling rate (0.0 to 1.0)</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Metadata</mat-label>
            <mat-select formControlName="metadata">
              <mat-option value="INCLUDE_ALL_METADATA">All Metadata</mat-option>
              <mat-option value="EXCLUDE_ALL_METADATA">Basic Metadata</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Metadata Fields</mat-label>
            <mat-select formControlName="metadataFields" multiple>
              <mat-option *ngFor="let field of availableMetadataFields" [value]="field">{{field}}</mat-option>
            </mat-select>
            <mat-hint>Optional: Select metadata fields to include</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Filter Expression</mat-label>
            <input matInput formControlName="filterExpr" placeholder="Enter filter expression">
          </mat-form-field>
        </div>

        <div class="form-section">
          <h3>Labels</h3>
          <div formArrayName="labels">
            <div *ngFor="let label of labels.controls; let i = index" [formGroupName]="i" class="label-row">
              <mat-form-field appearance="outline" class="label-key">
                <mat-label>Key</mat-label>
                <input matInput formControlName="key" placeholder="Key">
              </mat-form-field>
              <mat-form-field appearance="outline" class="label-value">
                <mat-label>Value</mat-label>
                <input matInput formControlName="value" placeholder="Value">
              </mat-form-field>
              <button mat-icon-button color="warn" (click)="removeLabel(i)" type="button"><mat-icon>delete</mat-icon></button>
            </div>
            <button mat-button color="primary" (click)="addLabel()" type="button"><mat-icon>add</mat-icon>Add Label</button>
          </div>
        </div>

        <div class="form-section">
          <h3>Target Resource</h3>
          <mat-radio-group formControlName="targetType" class="target-type-radio">
            <mat-radio-button value="interconnectAttachment">Interconnect Attachment</mat-radio-button>
            <mat-radio-button value="vpnTunnel">VPN Tunnel</mat-radio-button>
          </mat-radio-group>

          <ng-container *ngIf="flowLogForm.get('targetType')?.value === 'interconnectAttachment'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Interconnect Attachment</mat-label>
              <mat-select formControlName="interconnectAttachment">
                <mat-option *ngFor="let ia of interconnectAttachments" [value]="ia.selfLink">{{ia.name}}</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>
          <ng-container *ngIf="flowLogForm.get('targetType')?.value === 'vpnTunnel'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>VPN Tunnel</mat-label>
              <mat-select formControlName="vpnTunnel">
                <mat-option *ngFor="let vpn of vpnTunnels" [value]="vpn.selfLink">{{vpn.name}}</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!flowLogForm.valid">Enable</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .flow-log-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 20px 0;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
    }
    .form-section h3 {
      margin: 0 0 8px 0;
      color: #5f6368;
      font-size: 16px;
    }
    .full-width {
      width: 100%;
    }
    .label-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .label-key, .label-value {
      flex: 1;
    }
    .target-type-radio {
      display: flex;
      gap: 24px;
      margin-bottom: 8px;
    }
    mat-dialog-content {
      min-width: 500px;
    }
  `]
})
export class CreateFlowLogDialogComponent implements OnInit {
  flowLogForm: FormGroup;
  networks: VpcNetwork[] = [];
  interconnectAttachments: any[] = [];
  vpnTunnels: any[] = [];
  availableMetadataFields = [
    'SRC_INSTANCE', 'DEST_INSTANCE', 'SRC_REGION', 'DEST_REGION',
    'SRC_ZONE', 'DEST_ZONE', 'SRC_PROJECT', 'DEST_PROJECT',
    'SRC_VPC', 'DEST_VPC', 'SRC_SUBNET', 'DEST_SUBNET',
    'SRC_IP', 'DEST_IP', 'SRC_PORT', 'DEST_PORT',
    'PROTOCOL', 'BYTES_SENT', 'BYTES_RECEIVED', 'PACKETS_SENT', 'PACKETS_RECEIVED'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateFlowLogDialogComponent>,
    private vpcService: VpcService,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string }
  ) {
    this.flowLogForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      aggregationInterval: ['INTERVAL_5_SEC'],
      flowSampling: [0.5, [Validators.min(0), Validators.max(1)]],
      metadata: ['INCLUDE_ALL_METADATA'],
      metadataFields: [[]],
      filterExpr: [''],
      labels: this.fb.array([]),
      targetType: ['interconnectAttachment', Validators.required],
      interconnectAttachment: [''],
      vpnTunnel: ['']
    });
  }

  ngOnInit() {
    this.loadInterconnectAttachments();
    this.loadVpnTunnels();
  }

  get labels() {
    return this.flowLogForm.get('labels') as FormArray;
  }

  addLabel() {
    this.labels.push(this.fb.group({ key: '', value: '' }));
  }

  removeLabel(index: number) {
    this.labels.removeAt(index);
  }

  loadInterconnectAttachments() {
    // TODO: Replace with actual API call to fetch interconnect attachments
    this.interconnectAttachments = [
      { name: 'attachment-1', selfLink: 'projects/demo/global/interconnectAttachments/attachment-1' },
      { name: 'attachment-2', selfLink: 'projects/demo/global/interconnectAttachments/attachment-2' }
    ];
  }

  loadVpnTunnels() {
    // TODO: Replace with actual API call to fetch VPN tunnels
    this.vpnTunnels = [
      { name: 'vpn-1', selfLink: 'projects/demo/regions/us-central1/vpnTunnels/vpn-1' },
      { name: 'vpn-2', selfLink: 'projects/demo/regions/europe-west1/vpnTunnels/vpn-2' }
    ];
  }

  onSubmit() {
    if (this.flowLogForm.valid) {
      const formValue = this.flowLogForm.value;
      const labelsObj: { [key: string]: string } = {};
      for (const label of formValue.labels) {
        if (label.key && label.value) {
          labelsObj[label.key] = label.value;
        }
      }
      const payload: any = {
        name: formValue.name,
        description: formValue.description,
        aggregationInterval: formValue.aggregationInterval,
        flowSampling: formValue.flowSampling,
        metadata: formValue.metadata,
        metadataFields: formValue.metadataFields,
        filterExpr: formValue.filterExpr,
        labels: labelsObj
      };
      if (formValue.targetType === 'interconnectAttachment') {
        payload.interconnectAttachment = formValue.interconnectAttachment;
      } else if (formValue.targetType === 'vpnTunnel') {
        payload.vpnTunnel = formValue.vpnTunnel;
      }
      this.dialogRef.close(payload);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 