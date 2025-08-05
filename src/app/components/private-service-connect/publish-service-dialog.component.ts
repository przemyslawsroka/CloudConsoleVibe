import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { 
  PrivateServiceConnectService, 
  CreatePSCPublishedServiceRequest,
  LoadBalancerEndpoint
} from '../../services/private-service-connect.service';

interface DialogData {
  projectId: string;
}

@Component({
  selector: 'app-publish-service-dialog',
  template: `
    <h2 mat-dialog-title>Publish service</h2>
    
    <mat-dialog-content>
      <form [formGroup]="serviceForm" class="form-container">
        <!-- Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="my-published-service">
          <mat-hint>Must be 1-63 characters, lowercase letters, numbers, and hyphens</mat-hint>
          <mat-error *ngIf="serviceForm.get('name')?.hasError('required')">
            Name is required
          </mat-error>
          <mat-error *ngIf="serviceForm.get('name')?.hasError('pattern')">
            Name must be lowercase letters, numbers, and hyphens only
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="2" 
                    placeholder="Description of this published service"></textarea>
        </mat-form-field>

        <!-- Target Service -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Target Service</mat-label>
          <mat-select formControlName="targetService">
            <mat-option value="">Select a load balancer</mat-option>
            <mat-option *ngFor="let lb of loadBalancers" [value]="lb.name">
              {{ lb.name }} ({{ lb.type }})
            </mat-option>
          </mat-select>
          <mat-hint>Load balancer to publish as a service</mat-hint>
          <mat-error *ngIf="serviceForm.get('targetService')?.hasError('required')">
            Target service is required
          </mat-error>
        </mat-form-field>

        <!-- Connection Acceptance -->
        <div class="connection-section">
          <h4>Connection acceptance</h4>
          
          <mat-radio-group formControlName="connectionAcceptance" class="radio-group">
            <mat-radio-button value="automatic" class="radio-option">
              <div class="radio-content">
                <div class="radio-title">Accept automatically</div>
                <div class="radio-description">
                  Automatically accept connection requests from any consumer project
                </div>
              </div>
            </mat-radio-button>
            
            <mat-radio-button value="manual" class="radio-option">
              <div class="radio-content">
                <div class="radio-title">Require approval</div>
                <div class="radio-description">
                  Manually review and approve each connection request
                </div>
              </div>
            </mat-radio-button>
          </mat-radio-group>
        </div>

        <!-- Accepted Projects (only shown for automatic acceptance) -->
        <div class="accepted-projects-section" 
             *ngIf="serviceForm.get('connectionAcceptance')?.value === 'automatic'">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Accepted projects (optional)</mat-label>
            <textarea matInput formControlName="acceptedProjects" rows="3"
                      placeholder="project-id-1&#10;project-id-2&#10;project-id-3">
            </textarea>
            <mat-hint>
              One project ID per line. Leave empty to accept from any project.
            </mat-hint>
          </mat-form-field>
        </div>

        <!-- DNS Configuration -->
        <div class="dns-section">
          <h4>DNS configuration (optional)</h4>
          
          <mat-checkbox formControlName="enableDns" (change)="onDnsToggle($event)">
            Enable DNS zone publication
          </mat-checkbox>
          
          <div class="dns-config" *ngIf="serviceForm.get('enableDns')?.value">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>DNS zone</mat-label>
              <input matInput formControlName="dnsZone" 
                     placeholder="example.com.">
              <mat-hint>DNS zone where the service will be published</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Record type</mat-label>
              <mat-select formControlName="dnsRecordType">
                <mat-option value="A">A</mat-option>
                <mat-option value="AAAA">AAAA</mat-option>
                <mat-option value="CNAME">CNAME</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Network Configuration -->
        <div class="network-section">
          <h4>Network configuration</h4>
          
          <div class="config-info">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <strong>NAT subnets:</strong> Will be configured automatically based on your load balancer's network.
            </div>
          </div>
          
          <div class="config-info">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <strong>Reconcile connections:</strong> Automatically enabled to ensure connection consistency.
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onCreate()" 
              [disabled]="serviceForm.invalid || isCreating">
        <mat-spinner diameter="20" *ngIf="isCreating" style="margin-right: 8px;"></mat-spinner>
        {{ isCreating ? 'Publishing...' : 'Publish service' }}
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

    .connection-section, .dns-section, .network-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface-color);
    }

    .connection-section h4, .dns-section h4, .network-section h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .radio-option {
      margin-bottom: 8px;
    }

    .radio-content {
      margin-left: 8px;
    }

    .radio-title {
      font-weight: 500;
      color: var(--text-color);
      margin-bottom: 4px;
    }

    .radio-description {
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    .accepted-projects-section {
      margin-bottom: 16px;
    }

    .dns-config {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .config-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px;
      background: var(--hover-color);
      border-radius: 4px;
    }

    .info-icon {
      color: var(--primary-color);
      font-size: 18px;
      margin-top: 2px;
    }

    .info-text {
      font-size: 13px;
      color: var(--text-color);
      line-height: 1.4;
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

    /* Radio button styling */
    ::ng-deep .mat-radio-button {
      margin-bottom: 16px;
    }

    ::ng-deep .mat-radio-button .mat-radio-label {
      white-space: normal;
      line-height: 1.4;
    }
  `]
})
export class PublishServiceDialogComponent implements OnInit {
  serviceForm: FormGroup;
  isCreating = false;
  loadBalancers: LoadBalancerEndpoint[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PublishServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private pscService: PrivateServiceConnectService,
    private snackBar: MatSnackBar
  ) {
    this.serviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z]([a-z0-9-]*[a-z0-9])?$/)]],
      description: [''],
      targetService: ['', Validators.required],
      connectionAcceptance: ['automatic', Validators.required],
      acceptedProjects: [''],
      enableDns: [false],
      dnsZone: [''],
      dnsRecordType: ['A']
    });
  }

  ngOnInit() {
    this.loadLoadBalancers();
  }

  loadLoadBalancers() {
    if (this.data.projectId) {
      this.pscService.getLoadBalancerEndpoints(this.data.projectId).subscribe({
        next: (loadBalancers) => {
          this.loadBalancers = loadBalancers;
        },
        error: (error) => {
          console.error('Error loading load balancers:', error);
          this.snackBar.open('Error loading load balancers', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onDnsToggle(event: any) {
    const enableDns = event.checked;
    if (enableDns) {
      this.serviceForm.get('dnsZone')?.setValidators([Validators.required]);
      this.serviceForm.get('dnsRecordType')?.setValidators([Validators.required]);
    } else {
      this.serviceForm.get('dnsZone')?.clearValidators();
      this.serviceForm.get('dnsRecordType')?.clearValidators();
    }
    this.serviceForm.get('dnsZone')?.updateValueAndValidity();
    this.serviceForm.get('dnsRecordType')?.updateValueAndValidity();
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (this.serviceForm.valid) {
      this.isCreating = true;
      
      const formValue = this.serviceForm.value;
      
      // Parse accepted projects
      const acceptedProjects = formValue.acceptedProjects ? 
        formValue.acceptedProjects.split('\n').map((s: string) => s.trim()).filter((s: string) => s) : [];

      const request: CreatePSCPublishedServiceRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        targetService: formValue.targetService,
        autoAcceptConnections: formValue.connectionAcceptance === 'automatic',
        acceptedProjects: acceptedProjects.length > 0 ? acceptedProjects : undefined
      };

      // Add DNS configuration if enabled
      if (formValue.enableDns && formValue.dnsZone) {
        request.dnsConfig = {
          zone: formValue.dnsZone,
          recordType: formValue.dnsRecordType
        };
      }

      this.pscService.createPublishedService(this.data.projectId, request).subscribe({
        next: (service) => {
          this.isCreating = false;
          this.snackBar.open('Service published successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(service);
        },
        error: (error) => {
          this.isCreating = false;
          console.error('Error publishing service:', error);
          this.snackBar.open('Error publishing service', 'Close', { duration: 3000 });
        }
      });
    }
  }
}