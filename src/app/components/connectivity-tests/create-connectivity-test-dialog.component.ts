import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConnectivityTestRequest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';

export interface CreateConnectivityTestDialogData {
  // Optional initial data
}

interface ProjectOption {
  value: string;
  displayName: string;
}

@Component({
  selector: 'app-create-connectivity-test-dialog',
  template: `
    <h2 mat-dialog-title>Create Connectivity Test</h2>
    
    <mat-dialog-content>
      <form [formGroup]="testForm" class="test-form">
        
        <!-- Test name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Test name *</mat-label>
          <input matInput formControlName="displayName" placeholder="my-connectivity-test">
          <mat-hint>Lowercase letters, numbers, hyphens allowed</mat-hint>
          <mat-error *ngIf="testForm.get('displayName')?.hasError('required')">
            Test name is required
          </mat-error>
          <mat-error *ngIf="testForm.get('displayName')?.hasError('pattern')">
            Only lowercase letters, numbers, and hyphens are allowed
          </mat-error>
        </mat-form-field>

        <!-- Protocol -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Protocol</mat-label>
          <mat-select formControlName="protocol">
            <mat-option value="tcp">tcp</mat-option>
            <mat-option value="udp">udp</mat-option>
            <mat-option value="esp">esp</mat-option>
            <mat-option value="icmp">icmp</mat-option>
          </mat-select>
          <mat-error *ngIf="testForm.get('protocol')?.hasError('required')">
            Protocol is required
          </mat-error>
        </mat-form-field>

        <!-- Source section -->
        <div class="form-section">
          <h3>Source</h3>
          
          <!-- Source endpoint type -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Source endpoint</mat-label>
            <mat-select formControlName="sourceEndpointType">
              <mat-option value="ipAddress">IP address</mat-option>
              <mat-option value="gceInstance">Compute Engine instance</mat-option>
              <mat-option value="gkeCluster">GKE cluster</mat-option>
              <mat-option value="cloudSqlInstance">Cloud SQL instance</mat-option>
              <mat-option value="forwardingRule">Forwarding rule</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Source IP address -->
          <div *ngIf="testForm.get('sourceEndpointType')?.value === 'ipAddress'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Source IP address *</mat-label>
              <input matInput formControlName="sourceIp" placeholder="Example: 192.0.2.1">
              <mat-error *ngIf="testForm.get('sourceIp')?.hasError('required')">
                Source IP address is required
              </mat-error>
              <mat-error *ngIf="testForm.get('sourceIp')?.hasError('pattern')">
                Please enter a valid IP address
              </mat-error>
            </mat-form-field>

            <mat-checkbox formControlName="sourceIsGoogleCloudIp" class="google-cloud-checkbox">
              This is an IP address used in Google Cloud.
            </mat-checkbox>

            <mat-form-field appearance="outline" class="full-width" style="margin-top: 16px;">
                                  <mat-label>VPC Network Project</mat-label>
              <mat-select formControlName="sourceProject">
                <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                  {{project.displayName}}
                </mat-option>
              </mat-select>
              <button mat-button type="button" matSuffix color="primary" (click)="selectSourceProject()">
                Select
              </button>
            </mat-form-field>
          </div>

          <!-- Source GCE Instance -->
          <div *ngIf="testForm.get('sourceEndpointType')?.value === 'gceInstance'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Source instance *</mat-label>
              <mat-select formControlName="sourceInstance">
                <mat-option value="batch-jobs-eu">batch-jobs-eu</mat-option>
                <mat-option value="batch-jobs-us">batch-jobs-us</mat-option>
                <mat-option value="browse-group-eu-yzql">browse-group-eu-yzql</mat-option>
              </mat-select>
              <mat-error *ngIf="testForm.get('sourceInstance')?.hasError('required')">
                Source instance is required
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- Destination section -->
        <div class="form-section">
          <h3>Destination</h3>
          
          <!-- Destination endpoint type -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Destination endpoint</mat-label>
            <mat-select formControlName="destinationEndpointType">
              <mat-option value="ipAddress">IP address</mat-option>
              <mat-option value="gceInstance">Compute Engine instance</mat-option>
              <mat-option value="gkeCluster">GKE cluster</mat-option>
              <mat-option value="cloudSqlInstance">Cloud SQL instance</mat-option>
              <mat-option value="forwardingRule">Forwarding rule</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Destination IP address -->
          <div *ngIf="testForm.get('destinationEndpointType')?.value === 'ipAddress'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Destination IP address *</mat-label>
              <input matInput formControlName="destinationIp" placeholder="Example: 192.0.2.1">
              <mat-error *ngIf="testForm.get('destinationIp')?.hasError('required')">
                Destination IP address is required
              </mat-error>
              <mat-error *ngIf="testForm.get('destinationIp')?.hasError('pattern')">
                Please enter a valid IP address
              </mat-error>
            </mat-form-field>

            <mat-checkbox formControlName="destinationIsGoogleCloudIp" class="google-cloud-checkbox">
              This is an IP address used in Google Cloud.
            </mat-checkbox>

            <mat-form-field appearance="outline" class="full-width" style="margin-top: 16px;">
                                  <mat-label>VPC Network Project</mat-label>
              <mat-select formControlName="destinationProject">
                <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                  {{project.displayName}}
                </mat-option>
              </mat-select>
              <button mat-button type="button" matSuffix color="primary" (click)="selectDestinationProject()">
                Select
              </button>
            </mat-form-field>
          </div>

          <!-- Destination GCE Instance -->
          <div *ngIf="testForm.get('destinationEndpointType')?.value === 'gceInstance'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Destination instance *</mat-label>
              <mat-select formControlName="destinationInstance">
                <mat-option value="batch-jobs-eu">batch-jobs-eu</mat-option>
                <mat-option value="batch-jobs-us">batch-jobs-us</mat-option>
                <mat-option value="browse-group-eu-yzql">browse-group-eu-yzql</mat-option>
              </mat-select>
              <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                Destination instance is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Destination port -->
          <mat-form-field appearance="outline" class="full-width" 
                          *ngIf="testForm.get('protocol')?.value === 'tcp' || testForm.get('protocol')?.value === 'udp'">
            <mat-label>Destination port *</mat-label>
            <input matInput type="number" formControlName="destinationPort" placeholder="80">
            <mat-error *ngIf="testForm.get('destinationPort')?.hasError('required')">
              Destination port is required for TCP/UDP protocols
            </mat-error>
            <mat-error *ngIf="testForm.get('destinationPort')?.hasError('min') || testForm.get('destinationPort')?.hasError('max')">
              Port must be between 1 and 65535
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Round-trip connectivity test -->
        <div class="checkbox-section">
          <mat-checkbox formControlName="roundTrip">
            Run round-trip connectivity test
          </mat-checkbox>
          <div class="checkbox-hint">
            Also test connectivity from destination to source
          </div>
        </div>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="3" 
                    placeholder="Optional description for this connectivity test"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!testForm.valid" 
              (click)="onCreate()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .test-form {
      min-width: 600px;
      max-width: 800px;
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-section {
      margin-bottom: 32px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .form-section h3 {
      margin: 0 0 20px 0;
      color: #202124;
      font-size: 18px;
      font-weight: 500;
    }

    .google-cloud-checkbox {
      margin-bottom: 16px;
      display: block;
    }

    .checkbox-section {
      margin-bottom: 24px;
    }

    .checkbox-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #5f6368;
      margin-left: 32px;
    }

    ::ng-deep .mat-checkbox-label {
      color: #202124;
    }

    ::ng-deep .mat-form-field-hint,
    ::ng-deep .mat-hint {
      color: #5f6368;
      font-size: 12px;
    }

    ::ng-deep .mat-form-field-appearance-outline .mat-form-field-outline {
      color: #dadce0;
    }

    ::ng-deep .mat-form-field-appearance-outline.mat-focused .mat-form-field-outline-thick {
      color: #1a73e8;
    }

    ::ng-deep .mat-primary .mat-button-toggle-checked {
      background-color: #e8f0fe;
      color: #1a73e8;
    }

    .mat-dialog-actions {
      padding: 16px 24px;
      margin: 0;
      border-top: 1px solid #e0e0e0;
    }

    .mat-dialog-title {
      font-size: 20px;
      font-weight: 500;
      color: #202124;
      margin-bottom: 0;
    }

    ::ng-deep .mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
  `]
})
export class CreateConnectivityTestDialogComponent implements OnInit {
  testForm: FormGroup;
  availableProjects: ProjectOption[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateConnectivityTestDialogComponent>,
    private projectService: ProjectService,
    @Inject(MAT_DIALOG_DATA) public data: CreateConnectivityTestDialogData
  ) {
    this.testForm = this.fb.group({
      displayName: ['', [
        Validators.required, 
        Validators.pattern(/^[a-z0-9\-]+$/)
      ]],
      protocol: ['tcp', Validators.required],
      sourceEndpointType: ['', Validators.required],
      sourceIp: [''],
      sourceInstance: [''],
      sourceIsGoogleCloudIp: [false],
      sourceProject: [''],
      destinationEndpointType: ['', Validators.required],
      destinationIp: [''],
      destinationInstance: [''],
      destinationIsGoogleCloudIp: [false],
      destinationProject: [''],
      destinationPort: [80, [Validators.min(1), Validators.max(65535)]],
      roundTrip: [false],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadAvailableProjects();
    this.setupFormValidation();
  }

  private loadAvailableProjects() {
    this.projectService.projects$.subscribe({
      next: (projects: Project[]) => {
        this.availableProjects = projects.map((project: Project) => ({
          value: project.id,
          displayName: `${project.name} (${project.id})`
        }));
        
        // Prefill with current project
        const currentProject = this.projectService.getCurrentProject();
        if (currentProject) {
          this.testForm.patchValue({
            sourceProject: currentProject.id,
            destinationProject: currentProject.id
          }, { emitEvent: false });
        }
      },
      error: (error: any) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  private setupFormValidation() {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // Source endpoint validation
    this.testForm.get('sourceEndpointType')?.valueChanges.subscribe(type => {
      this.updateSourceValidation(type, ipPattern);
    });

    // Destination endpoint validation
    this.testForm.get('destinationEndpointType')?.valueChanges.subscribe(type => {
      this.updateDestinationValidation(type, ipPattern);
    });

    // Protocol change validation
    this.testForm.get('protocol')?.valueChanges.subscribe(protocol => {
      const portControl = this.testForm.get('destinationPort');
      if (protocol === 'tcp' || protocol === 'udp') {
        portControl?.setValidators([Validators.required, Validators.min(1), Validators.max(65535)]);
      } else {
        portControl?.clearValidators();
      }
      portControl?.updateValueAndValidity();
    });

    // Trigger initial validation
    this.updateSourceValidation(this.testForm.get('sourceEndpointType')?.value, ipPattern);
    this.updateDestinationValidation(this.testForm.get('destinationEndpointType')?.value, ipPattern);
  }

  private updateSourceValidation(type: string, ipPattern: RegExp) {
    const sourceIpControl = this.testForm.get('sourceIp');
    const sourceInstanceControl = this.testForm.get('sourceInstance');
    
    // Clear all validators first
    sourceIpControl?.clearValidators();
    sourceInstanceControl?.clearValidators();
    
    if (type === 'ipAddress') {
      sourceIpControl?.setValidators([Validators.required, Validators.pattern(ipPattern)]);
    } else if (type === 'gceInstance') {
      sourceInstanceControl?.setValidators([Validators.required]);
    }
    
    sourceIpControl?.updateValueAndValidity();
    sourceInstanceControl?.updateValueAndValidity();
  }

  private updateDestinationValidation(type: string, ipPattern: RegExp) {
    const destIpControl = this.testForm.get('destinationIp');
    const destInstanceControl = this.testForm.get('destinationInstance');
    
    // Clear all validators first
    destIpControl?.clearValidators();
    destInstanceControl?.clearValidators();
    
    if (type === 'ipAddress') {
      destIpControl?.setValidators([Validators.required, Validators.pattern(ipPattern)]);
    } else if (type === 'gceInstance') {
      destInstanceControl?.setValidators([Validators.required]);
    }
    
    destIpControl?.updateValueAndValidity();
    destInstanceControl?.updateValueAndValidity();
  }

  selectSourceProject() {
    // This would typically open a project picker dialog
    console.log('Select source project clicked');
  }

  selectDestinationProject() {
    // This would typically open a project picker dialog
    console.log('Select destination project clicked');
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (this.testForm.valid) {
      const formValue = this.testForm.value;
      
      // Build source endpoint
      const source: any = {};
      if (formValue.sourceEndpointType === 'ipAddress') {
        source.ipAddress = formValue.sourceIp;
        if (formValue.sourceProject) {
          source.projectId = formValue.sourceProject;
        }
      } else if (formValue.sourceEndpointType === 'gceInstance') {
        source.instance = formValue.sourceInstance;
      }

      // Build destination endpoint
      const destination: any = {};
      if (formValue.destinationEndpointType === 'ipAddress') {
        destination.ipAddress = formValue.destinationIp;
        if (formValue.destinationProject) {
          destination.projectId = formValue.destinationProject;
        }
      } else if (formValue.destinationEndpointType === 'gceInstance') {
        destination.instance = formValue.destinationInstance;
      }
      
      // Add port for TCP/UDP
      if ((formValue.protocol === 'tcp' || formValue.protocol === 'udp') && formValue.destinationPort) {
        destination.port = formValue.destinationPort;
      }

      const testData: ConnectivityTestRequest = {
        displayName: formValue.displayName,
        description: formValue.description || undefined,
        protocol: formValue.protocol,
        source: source,
        destination: destination,
        roundTrip: formValue.roundTrip || false,
        labels: {
          'created-by': 'cloud-console-vibe',
          'environment': 'development'
        }
      };
      
      this.dialogRef.close(testData);
    }
  }
} 