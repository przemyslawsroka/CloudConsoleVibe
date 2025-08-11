import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
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
          <input matInput formControlName="displayName" 
                 placeholder="Auto-generated based on source and destination"
                 (input)="onTestNameManualEdit()">
          <button mat-icon-button matSuffix type="button" 
                  (click)="refreshTestName()" 
                  matTooltip="Refresh auto-generated name">
            <mat-icon>refresh</mat-icon>
          </button>
          <mat-hint *ngIf="!userHasEditedName">Automatically generated from source and destination selection</mat-hint>
          <mat-hint *ngIf="userHasEditedName">Custom name - lowercase letters, numbers, hyphens allowed</mat-hint>
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
              <mat-option value="myIpAddress">My IP address</mat-option>
              <mat-option value="ipAddress">IP address</mat-option>
              <mat-option value="gceInstance">Compute Engine instance</mat-option>
              <mat-option value="gkeCluster">GKE cluster</mat-option>
              <mat-option value="cloudSqlInstance">Cloud SQL instance</mat-option>
              <mat-option value="forwardingRule">Forwarding rule</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- My IP Address -->
          <div *ngIf="testForm.get('sourceEndpointType')?.value === 'myIpAddress'" class="info-message">
            <mat-icon>info</mat-icon>
            <div class="ip-address-content">
              <div *ngIf="isLoadingUserIp" class="loading-ip">
                <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                Loading your IP address...
              </div>
              <div *ngIf="!isLoadingUserIp && userIpAddress" class="ip-address-display">
                The test will use <strong>{{userIpAddress}}</strong> (your current public IP) as the source.
              </div>
              <div *ngIf="!isLoadingUserIp && !userIpAddress" class="ip-address-error">
                The test will use your current public IP address as the source.
                <button mat-button color="primary" (click)="loadUserIpAddress()" style="margin-left: 8px;">
                  <mat-icon>refresh</mat-icon>
                  Retry
                </button>
              </div>
            </div>
          </div>

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

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #e8f0fe;
      border-radius: 8px;
      color: #1558d6;
      margin-bottom: 12px;
    }

    .info-message mat-icon {
      color: #1a73e8;
    }

    .ip-address-content {
      flex: 1;
    }

    .loading-ip {
      display: flex;
      align-items: center;
      color: #5f6368;
    }

    .ip-address-display strong {
      color: #1a73e8;
      font-weight: 600;
    }

    .ip-address-error {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
  `]
})
export class CreateConnectivityTestDialogComponent implements OnInit {
  testForm: FormGroup;
  availableProjects: ProjectOption[] = [];
  
  // Name generation properties
  userHasEditedName = false;
  
  // User IP address properties
  userIpAddress: string | null = null;
  isLoadingUserIp = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateConnectivityTestDialogComponent>,
    private projectService: ProjectService,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: CreateConnectivityTestDialogData
  ) {
    this.testForm = this.fb.group({
      displayName: ['', [
        Validators.required, 
        Validators.pattern(/^[a-z0-9\-]+$/)
      ]],
      protocol: ['tcp', Validators.required],
      sourceEndpointType: ['myIpAddress', Validators.required], // Default to My IP address
      sourceIp: [''],
      sourceInstance: [''],
      sourceIsGoogleCloudIp: [false],
      sourceProject: [''],
      destinationEndpointType: ['ipAddress', Validators.required], // Default to IP address
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
    this.setupNameGeneration();
    this.loadUserIpAddress();
    
    // Trigger initial validation for default values
    setTimeout(() => {
      this.testForm.get('sourceEndpointType')?.updateValueAndValidity();
      this.testForm.get('destinationEndpointType')?.updateValueAndValidity();
    }, 0);
  }

  private loadAvailableProjects() {
    // First, explicitly load projects like the project picker does
    this.projectService.loadProjects().subscribe({
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
        
        console.log(`📋 Loaded ${projects.length} projects for connectivity test dialog`);
      },
      error: (error: any) => {
        console.error('❌ Error loading projects for connectivity test dialog:', error);
      }
    });
    
    // Also subscribe to future project updates
    this.projectService.projects$.subscribe({
      next: (projects: Project[]) => {
        // Only update if we actually have projects (avoid clearing the list)
        if (projects.length > 0) {
          this.availableProjects = projects.map((project: Project) => ({
            value: project.id,
            displayName: `${project.name} (${project.id})`
          }));
          
          // Update current project selection if form is empty or project changed
          const currentProject = this.projectService.getCurrentProject();
          const currentSourceProject = this.testForm.get('sourceProject')?.value;
          const currentDestinationProject = this.testForm.get('destinationProject')?.value;
          
          if (currentProject) {
            const updateValues: any = {};
            
            if (!currentSourceProject || currentSourceProject !== currentProject.id) {
              updateValues.sourceProject = currentProject.id;
            }
            
            if (!currentDestinationProject || currentDestinationProject !== currentProject.id) {
              updateValues.destinationProject = currentProject.id;
            }
            
            if (Object.keys(updateValues).length > 0) {
              this.testForm.patchValue(updateValues, { emitEvent: false });
            }
          }
        }
      },
      error: (error: any) => {
        console.error('❌ Error in projects subscription for connectivity test dialog:', error);
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
    } else if (type === 'myIpAddress') {
      // No additional validation needed for My IP address
      // The IP is automatically detected
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
      } else if (formValue.sourceEndpointType === 'myIpAddress') {
        source.ipAddress = this.userIpAddress;
        source.type = 'my-ip-address';
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

  // Name generation methods
  private setupNameGeneration() {
    // Watch for changes in ALL relevant fields - be very aggressive
    const fieldsToWatch = [
      'sourceEndpointType', 'sourceIp', 'sourceInstance',
      'destinationEndpointType', 'destinationIp', 'destinationInstance', 'destinationPort'
    ];

    fieldsToWatch.forEach(fieldName => {
      this.testForm.get(fieldName)?.valueChanges.subscribe((value) => {
        console.log(`Field ${fieldName} changed to:`, value);
        
        // Special handling for source endpoint type changes
        if (fieldName === 'sourceEndpointType' && value === 'myIpAddress') {
          // If switching to "My IP address" and we don't have the IP yet, load it
          if (!this.userIpAddress && !this.isLoadingUserIp) {
            this.loadUserIpAddress();
          }
        }
        
        // ALWAYS force name update on ANY field change
        this.forceUpdateTestName();
      });
    });

    // Also watch the entire form for any changes as a fallback
    this.testForm.valueChanges.subscribe(() => {
      console.log('Form values changed, forcing name update');
      this.forceUpdateTestName();
    });

    // Initial name generation after a short delay to ensure everything is initialized
    setTimeout(() => {
      console.log('Initial name generation');
      this.forceUpdateTestName();
    }, 100);
  }

  private updateTestName(): void {
    if (this.userHasEditedName) {
      return; // Don't auto-generate if user has manually edited the name
    }
    
    const generatedName = this.generateConnectivityTestName();
    if (!generatedName) {
      this.testForm.patchValue({ displayName: '' }, { emitEvent: false });
      return;
    }
    
    this.testForm.patchValue({ displayName: generatedName }, { emitEvent: false });
  }

  private forceUpdateTestName(): void {
    // Force update regardless of user edit status (for field changes)
    const generatedName = this.generateConnectivityTestName();
    console.log('Force updating test name to:', generatedName);
    
    if (!generatedName) {
      // Only clear if user hasn't manually edited
      if (!this.userHasEditedName) {
        this.testForm.patchValue({ displayName: '' }, { emitEvent: false });
      }
      return;
    }
    
    // Only update if user hasn't manually edited the name
    if (!this.userHasEditedName) {
      this.testForm.patchValue({ displayName: generatedName }, { emitEvent: false });
    }
  }

  onTestNameManualEdit(): void {
    // Check if the current value differs from what would be auto-generated
    setTimeout(() => {
      const currentValue = this.testForm.get('displayName')?.value || '';
      const generatedValue = this.generateConnectivityTestName();
      
      // If user typed something different from auto-generated name, mark as manually edited
      if (currentValue.trim() !== '' && currentValue !== generatedValue) {
        this.userHasEditedName = true;
      } else if (currentValue.trim() === '' || currentValue === generatedValue) {
        // If user cleared the field or made it match generated name, allow auto-generation again
        this.userHasEditedName = false;
        if (currentValue.trim() === '' && generatedValue) {
          // Auto-fill if field is empty and we have a generated name
          this.updateTestName();
        }
      }
    }, 10);
  }

  private generateConnectivityTestName(): string {
    const sourceId = this.generateSourceIdentifier();
    const destId = this.generateDestinationIdentifier();
    
    console.log('Generating name - sourceId:', sourceId, 'destId:', destId);
    console.log('Current form values:', this.testForm.value);
    console.log('User IP address:', this.userIpAddress);
    
    if (!sourceId || !destId) {
      console.log('Missing source or destination identifier, not generating name');
      return ''; // Don't generate name until both source and destination are specified
    }
    
    const timestamp = this.generateTimestamp();
    const rawName = `${sourceId}--to--${destId}--${timestamp}`;
    
    return this.sanitizeName(rawName);
  }

  private generateSourceIdentifier(): string {
    const endpointType = this.testForm.get('sourceEndpointType')?.value;
    const formValue = this.testForm.value;

    switch (endpointType) {
      case 'ipAddress':
        const sourceIp = formValue.sourceIp;
        return sourceIp ? `ip-${sourceIp.replace(/\./g, '-')}` : '';
      
      case 'myIpAddress':
        // Only return identifier if we have the user's IP address loaded
        return this.userIpAddress ? 'my-ip' : '';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.sourceInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.sourceCluster);
        return clusterName ? `gke-${clusterName}` : '';
      
      case 'cloudSqlInstance':
        const sqlName = this.extractResourceName(formValue.sourceInstance);
        return sqlName ? `sql-${sqlName}` : '';
      
      case 'forwardingRule':
        const ruleName = this.extractResourceName(formValue.sourceInstance);
        return ruleName ? `lb-${ruleName}` : '';
      
      default:
        return '';
    }
  }

  private generateDestinationIdentifier(): string {
    const endpointType = this.testForm.get('destinationEndpointType')?.value;
    const formValue = this.testForm.value;

    switch (endpointType) {
      case 'ipAddress':
        const destIp = formValue.destinationIp;
        return destIp ? `ip-${destIp.replace(/\./g, '-')}` : '';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.destinationInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.destinationCluster);
        return clusterName ? `gke-${clusterName}` : '';
      
      case 'cloudSqlInstance':
        const sqlName = this.extractResourceName(formValue.destinationInstance);
        return sqlName ? `sql-${sqlName}` : '';
      
      case 'forwardingRule':
        const ruleName = this.extractResourceName(formValue.destinationInstance);
        return ruleName ? `lb-${ruleName}` : '';
      
      default:
        return '';
    }
  }

  private extractResourceName(fullResourcePath: string): string {
    if (!fullResourcePath) return '';
    
    // Handle different resource path formats
    if (fullResourcePath.includes('/')) {
      // Extract name from paths like "projects/my-project/zones/us-central1-a/instances/my-instance"
      return fullResourcePath.split('/').pop() || '';
    }
    
    return fullResourcePath;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  private sanitizeName(name: string): string {
    // Google Cloud resource naming conventions
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '') // Remove invalid characters
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 63); // Max length limit
  }

  // User IP address methods
  loadUserIpAddress(): void {
    this.isLoadingUserIp = true;
    this.userIpAddress = null;
    
    this.http.get<{ip: string}>('https://api.ipify.org?format=json').subscribe({
      next: (response) => {
        console.log('User IP loaded:', response.ip);
        this.userIpAddress = response.ip;
        this.isLoadingUserIp = false;
        
        // Always trigger name regeneration when IP is loaded
        // Use multiple attempts to ensure it gets triggered
        this.forceUpdateTestName();
        setTimeout(() => {
          this.forceUpdateTestName();
        }, 100);
        setTimeout(() => {
          this.forceUpdateTestName();
        }, 500);
      },
      error: (error) => {
        console.error('Failed to load user IP address:', error);
        this.isLoadingUserIp = false;
        // Keep userIpAddress as null to show retry button
      }
    });
  }

  refreshTestName(): void {
    // Force refresh the test name by temporarily resetting the manual edit flag
    this.userHasEditedName = false;
    this.updateTestName();
  }
} 