import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { 
  PrivateServiceConnectService, 
  CreatePSCEndpointRequest 
} from '../../services/private-service-connect.service';
import { VpcService } from '../../services/vpc.service';
import { ComputeEngineService } from '../../services/compute-engine.service';

interface DialogData {
  projectId: string;
}

@Component({
  selector: 'app-connect-endpoint-dialog',
  template: `
    <h2 mat-dialog-title>Connect endpoint</h2>
    
    <mat-dialog-content>
      <form [formGroup]="endpointForm" class="form-container">
        <!-- Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="my-endpoint">
          <mat-hint>Must be 1-63 characters, lowercase letters, numbers, and hyphens</mat-hint>
          <mat-error *ngIf="endpointForm.get('name')?.hasError('required')">
            Name is required
          </mat-error>
          <mat-error *ngIf="endpointForm.get('name')?.hasError('pattern')">
            Name must be lowercase letters, numbers, and hyphens only
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="2" 
                    placeholder="Description of this endpoint"></textarea>
        </mat-form-field>

        <!-- Target -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Target</mat-label>
          <input matInput formControlName="target" 
                 placeholder="projects/producer-project/regions/us-central1/serviceAttachments/my-service">
          <mat-hint>Service attachment URI or published service name</mat-hint>
          <mat-error *ngIf="endpointForm.get('target')?.hasError('required')">
            Target is required
          </mat-error>
        </mat-form-field>

        <!-- Network -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Network</mat-label>
          <mat-select formControlName="network">
            <mat-option *ngFor="let network of networks" [value]="network.selfLink">
              {{ network.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="endpointForm.get('network')?.hasError('required')">
            Network is required
          </mat-error>
        </mat-form-field>

        <!-- Subnetwork -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Subnetwork (optional)</mat-label>
          <mat-select formControlName="subnetwork">
            <mat-option value="">None</mat-option>
            <mat-option *ngFor="let subnet of subnets" [value]="subnet.selfLink">
              {{ subnet.name }} ({{ extractRegionFromUrl(subnet.region) }})
            </mat-option>
          </mat-select>
          <mat-hint>Leave empty for auto-assigned subnet</mat-hint>
        </mat-form-field>

        <!-- Global Access -->
        <div class="checkbox-field">
          <mat-checkbox formControlName="enableGlobalAccess">
            Enable global access
          </mat-checkbox>
          <mat-hint class="checkbox-hint">
            Allow access from any region in your VPC network
          </mat-hint>
        </div>

        <!-- Labels -->
        <div class="labels-section">
          <h4>Labels</h4>
          <div class="labels-container">
            <div *ngFor="let label of labels; let i = index" class="label-row">
              <mat-form-field appearance="outline" class="label-key">
                <mat-label>Key</mat-label>
                <input matInput [(ngModel)]="label.key" [ngModelOptions]="{standalone: true}">
              </mat-form-field>
              <mat-form-field appearance="outline" class="label-value">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="label.value" [ngModelOptions]="{standalone: true}">
              </mat-form-field>
              <button mat-icon-button type="button" (click)="removeLabel(i)" class="remove-label">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <button mat-button type="button" (click)="addLabel()" class="add-label">
              <mat-icon>add</mat-icon>
              Add label
            </button>
          </div>
        </div>

        <!-- Producer Accept List -->
        <div class="producer-lists-section">
          <h4>Producer configuration</h4>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Producer accept list (optional)</mat-label>
            <textarea matInput formControlName="producerAcceptList" rows="3"
                      placeholder="project-id-1&#10;project-id-2&#10;project-id-3">
            </textarea>
            <mat-hint>One project ID per line. Projects that are allowed to connect.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Producer reject list (optional)</mat-label>
            <textarea matInput formControlName="producerRejectList" rows="3"
                      placeholder="project-id-1&#10;project-id-2&#10;project-id-3">
            </textarea>
            <mat-hint>One project ID per line. Projects that are denied connection.</mat-hint>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onCreate()" 
              [disabled]="endpointForm.invalid || isCreating">
        <mat-spinner diameter="20" *ngIf="isCreating" style="margin-right: 8px;"></mat-spinner>
        {{ isCreating ? 'Creating...' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      min-width: 500px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .checkbox-field {
      margin-bottom: 16px;
    }

    .checkbox-hint {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin-top: 4px;
      display: block;
    }

    .labels-section {
      margin-bottom: 24px;
    }

    .labels-section h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }

    .labels-container {
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 16px;
      background: var(--surface-color);
    }

    .label-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }

    .label-key {
      flex: 1;
    }

    .label-value {
      flex: 1;
    }

    .remove-label {
      margin-top: -8px;
    }

    .add-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-color);
    }

    .producer-lists-section {
      margin-bottom: 16px;
    }

    .producer-lists-section h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 20px 24px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    /* Fix for form field spacing */
    ::ng-deep .mat-mdc-form-field {
      margin-bottom: 16px;
    }

    ::ng-deep .mat-mdc-form-field:last-child {
      margin-bottom: 0;
    }
  `]
})
export class ConnectEndpointDialogComponent implements OnInit {
  endpointForm: FormGroup;
  isCreating = false;
  networks: any[] = [];
  subnets: any[] = [];
  labels: Array<{key: string, value: string}> = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ConnectEndpointDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private pscService: PrivateServiceConnectService,
    private vpcService: VpcService,
    private computeEngineService: ComputeEngineService,
    private snackBar: MatSnackBar
  ) {
    this.endpointForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z]([a-z0-9-]*[a-z0-9])?$/)]],
      description: [''],
      target: ['', Validators.required],
      network: ['', Validators.required],
      subnetwork: [''],
      enableGlobalAccess: [false],
      producerAcceptList: [''],
      producerRejectList: ['']
    });
  }

  ngOnInit() {
    this.loadNetworks();
    this.addLabel(); // Start with one empty label
  }

  loadNetworks() {
    if (this.data.projectId) {
      this.vpcService.getVpcNetworks(this.data.projectId).subscribe({
        next: (networks) => {
          this.networks = networks;
          this.loadSubnets();
        },
        error: (error) => {
          console.error('Error loading networks:', error);
          this.snackBar.open('Error loading networks', 'Close', { duration: 3000 });
        }
      });
    }
  }

  loadSubnets() {
    if (this.data.projectId) {
      // Get subnets from all regions - for simplicity, using us-central1 as default
      this.computeEngineService.getSubnetworks('us-central1').subscribe({
        next: (response: any) => {
          this.subnets = response.items || [];
        },
        error: (error: any) => {
          console.error('Error loading subnets:', error);
        }
      });
    }
  }

  addLabel() {
    this.labels.push({ key: '', value: '' });
  }

  removeLabel(index: number) {
    this.labels.splice(index, 1);
  }

  extractRegionFromUrl(regionUrl: string): string {
    if (!regionUrl) return '';
    const parts = regionUrl.split('/');
    return parts[parts.length - 1];
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (this.endpointForm.valid) {
      this.isCreating = true;
      
      const formValue = this.endpointForm.value;
      
      // Build labels object
      const labels: { [key: string]: string } = {};
      this.labels.forEach(label => {
        if (label.key && label.value) {
          labels[label.key] = label.value;
        }
      });

      // Parse producer lists
      const producerAcceptList = formValue.producerAcceptList ? 
        formValue.producerAcceptList.split('\n').map((s: string) => s.trim()).filter((s: string) => s) : [];
      const producerRejectList = formValue.producerRejectList ? 
        formValue.producerRejectList.split('\n').map((s: string) => s.trim()).filter((s: string) => s) : [];

      const request: CreatePSCEndpointRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        network: formValue.network,
        subnetwork: formValue.subnetwork || undefined,
        target: formValue.target,
        labels: Object.keys(labels).length > 0 ? labels : undefined,
        enableGlobalAccess: formValue.enableGlobalAccess,
        producerAcceptList: producerAcceptList.length > 0 ? producerAcceptList : undefined,
        producerRejectList: producerRejectList.length > 0 ? producerRejectList : undefined
      };

      this.pscService.createConnectedEndpoint(this.data.projectId, request).subscribe({
        next: (endpoint) => {
          this.isCreating = false;
          this.snackBar.open('Endpoint created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(endpoint);
        },
        error: (error) => {
          this.isCreating = false;
          console.error('Error creating endpoint:', error);
          this.snackBar.open('Error creating endpoint', 'Close', { duration: 3000 });
        }
      });
    }
  }
}