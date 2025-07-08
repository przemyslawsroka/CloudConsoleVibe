import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreateInstanceGroupRequest, NamedPort, InstanceGroupsService } from '../../services/instance-groups.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-create-instance-group',
  template: `
    <div class="create-instance-group-container">
      <!-- Header -->
      <div class="header-section">
        <div class="breadcrumb">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <span class="breadcrumb-item">Compute Engine</span>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item" (click)="goToInstanceGroups()" class="clickable">Instance groups</span>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item current">Create instance group</span>
        </div>
        
        <div class="page-header">
          <h1 class="page-title">Create instance group</h1>
          <div class="header-actions">
            <button mat-button (click)="goBack()">Cancel</button>
            <button mat-raised-button color="primary" 
                    [disabled]="!groupForm.valid || loading" 
                    (click)="onCreate()">
              <mat-spinner diameter="20" *ngIf="loading" style="margin-right: 8px;"></mat-spinner>
              Create
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content-container">
        <form [formGroup]="groupForm" class="group-form">
          
          <!-- Basic Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Basic Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              
              <!-- Name field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Name *</mat-label>
                <input matInput formControlName="name" placeholder="Enter instance group name">
                <mat-hint>Use lowercase letters, numbers, and hyphens</mat-hint>
                <mat-error *ngIf="groupForm.get('name')?.hasError('required')">
                  Name is required
                </mat-error>
                <mat-error *ngIf="groupForm.get('name')?.hasError('pattern')">
                  Name must contain only lowercase letters, numbers, and hyphens
                </mat-error>
              </mat-form-field>

              <!-- Description field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" 
                          placeholder="Describe the purpose of this instance group"></textarea>
              </mat-form-field>

              <!-- Group Type selection -->
              <div class="form-group">
                <label class="form-label">Group type *</label>
                <mat-radio-group formControlName="groupType" class="radio-group">
                  <mat-radio-button value="Managed">Managed instance group</mat-radio-button>
                  <mat-radio-button value="Unmanaged">Unmanaged instance group</mat-radio-button>
                </mat-radio-group>
                <div class="field-description">
                  <strong>Managed:</strong> Automatically maintains a specific number of instances using an instance template<br>
                  <strong>Unmanaged:</strong> Contains arbitrary instances that you create and add manually
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Location -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Location</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              
              <!-- Zone field -->
              <mat-form-field appearance="outline" class="location-field">
                <mat-label>Zone *</mat-label>
                <mat-select formControlName="zone">
                  <mat-option value="us-central1-a">us-central1-a</mat-option>
                  <mat-option value="us-central1-b">us-central1-b</mat-option>
                  <mat-option value="us-central1-c">us-central1-c</mat-option>
                  <mat-option value="us-east1-a">us-east1-a</mat-option>
                  <mat-option value="us-east1-b">us-east1-b</mat-option>
                  <mat-option value="us-west1-a">us-west1-a</mat-option>
                  <mat-option value="us-west1-b">us-west1-b</mat-option>
                  <mat-option value="europe-west1-a">europe-west1-a</mat-option>
                  <mat-option value="europe-west1-b">europe-west1-b</mat-option>
                  <mat-option value="asia-east1-a">asia-east1-a</mat-option>
                </mat-select>
                <mat-error *ngIf="groupForm.get('zone')?.hasError('required')">
                  Zone is required
                </mat-error>
              </mat-form-field>

              <!-- Network field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Network</mat-label>
                <mat-select formControlName="network">
                  <mat-option value="default">default</mat-option>
                  <mat-option value="custom-vpc-1">custom-vpc-1</mat-option>
                  <mat-option value="custom-vpc-2">custom-vpc-2</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Subnetwork field -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Subnetwork</mat-label>
                <mat-select formControlName="subnetwork">
                  <mat-option value="default">default</mat-option>
                  <mat-option value="subnet-1">subnet-1</mat-option>
                  <mat-option value="subnet-2">subnet-2</mat-option>
                </mat-select>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Instance Template (for Managed groups) -->
          <mat-card class="form-section" *ngIf="groupForm.get('groupType')?.value === 'Managed'">
            <mat-card-header>
              <mat-card-title>Instance Template</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Instance template *</mat-label>
                <mat-select formControlName="instanceTemplate">
                  <mat-option value="template-1">web-server-template</mat-option>
                  <mat-option value="template-2">app-server-template</mat-option>
                  <mat-option value="template-3">db-server-template</mat-option>
                </mat-select>
                <mat-error *ngIf="groupForm.get('instanceTemplate')?.hasError('required')">
                  Instance template is required for managed instance groups
                </mat-error>
              </mat-form-field>

              <!-- Target Size field -->
              <mat-form-field appearance="outline" class="target-size-field">
                <mat-label>Target size *</mat-label>
                <input matInput type="number" formControlName="targetSize" 
                       placeholder="Number of instances" min="0" max="1000">
                <mat-hint>Number of instances to maintain in the group</mat-hint>
                <mat-error *ngIf="groupForm.get('targetSize')?.hasError('required')">
                  Target size is required
                </mat-error>
                <mat-error *ngIf="groupForm.get('targetSize')?.hasError('min')">
                  Target size must be at least 0
                </mat-error>
                <mat-error *ngIf="groupForm.get('targetSize')?.hasError('max')">
                  Target size cannot exceed 1000
                </mat-error>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Named Ports -->
          <mat-card class="form-section">
            <mat-card-header>
              <div class="card-header-content">
                <mat-card-title>Named Ports</mat-card-title>
                <button type="button" mat-stroked-button color="primary" (click)="addNamedPort()">
                  <mat-icon>add</mat-icon>
                  Add Port
                </button>
              </div>
            </mat-card-header>
            <mat-card-content>
              
              <p class="section-description">
                Named ports define service ports on instances in this group. These are used by load balancers 
                to forward traffic to the appropriate service port.
              </p>

              <!-- Named Ports list -->
              <div class="named-ports-list" formArrayName="namedPorts">
                <div *ngFor="let port of namedPortsArray.controls; let i = index" class="named-port-item">
                  <div [formGroupName]="i" class="port-form-group">
                    <mat-form-field appearance="outline" class="port-name-input">
                      <mat-label>Port Name</mat-label>
                      <input matInput formControlName="name" placeholder="e.g., http">
                      <mat-error *ngIf="port.get('name')?.hasError('required')">
                        Port name is required
                      </mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="port-number-input">
                      <mat-label>Port Number</mat-label>
                      <input matInput type="number" formControlName="port" placeholder="e.g., 80" min="1" max="65535">
                      <mat-error *ngIf="port.get('port')?.hasError('required')">
                        Port number is required
                      </mat-error>
                      <mat-error *ngIf="port.get('port')?.hasError('min') || port.get('port')?.hasError('max')">
                        Port must be between 1 and 65535
                      </mat-error>
                    </mat-form-field>
                  </div>
                  <button type="button" mat-icon-button color="warn" (click)="removeNamedPort(i)" 
                          [disabled]="namedPortsArray.length <= 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Summary section -->
          <mat-card class="form-section summary-section">
            <mat-card-header>
              <mat-card-title>Summary</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-content">
                <div class="summary-item">
                  <span class="label">Name:</span>
                  <span class="value">{{ groupForm.get('name')?.value || 'Not specified' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ groupForm.get('groupType')?.value || 'Not specified' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Zone:</span>
                  <span class="value">{{ groupForm.get('zone')?.value || 'Not specified' }}</span>
                </div>
                <div class="summary-item" *ngIf="groupForm.get('groupType')?.value === 'Managed'">
                  <span class="label">Target Size:</span>
                  <span class="value">{{ groupForm.get('targetSize')?.value || 'Not specified' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Named Ports:</span>
                  <span class="value">{{ getValidPortsCount() }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-instance-group-container {
      min-height: 100vh;
      background-color: #f8f9fa;
    }

    .header-section {
      background: white;
      border-bottom: 1px solid #dadce0;
      padding: 16px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      font-size: 14px;
      color: #5f6368;
    }

    .back-button {
      margin-right: 8px;
    }

    .breadcrumb-item {
      color: #5f6368;
    }

    .breadcrumb-item.current {
      color: #202124;
      font-weight: 500;
    }

    .breadcrumb-item.clickable {
      color: #1a73e8;
      cursor: pointer;
      text-decoration: none;
    }

    .breadcrumb-item.clickable:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      margin: 0 8px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .content-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .group-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      margin-bottom: 0;
    }

    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .section-description {
      color: #5f6368;
      font-size: 14px;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }

    .field-description {
      color: #5f6368;
      font-size: 13px;
      margin-top: 8px;
      line-height: 1.4;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .location-field {
      width: 300px;
      margin-bottom: 16px;
    }

    .target-size-field {
      width: 250px;
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

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .named-ports-list {
      margin-bottom: 16px;
    }

    .named-port-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }

    .port-form-group {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .port-name-input {
      flex: 1;
    }

    .port-number-input {
      width: 150px;
    }

    .summary-section {
      background: #f8f9fa;
      border: 1px solid #e8eaed;
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

    /* Responsive design */
    @media (max-width: 768px) {
      .content-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }

      .port-form-group {
        flex-direction: column;
        gap: 8px;
      }

      .port-number-input {
        width: 100%;
      }
    }

    /* Radio button styling */
    ::ng-deep .radio-group .mat-radio-button {
      margin-bottom: 8px;
    }

    ::ng-deep .radio-group .mat-radio-label {
      font-size: 14px;
    }

    /* Card styling */
    ::ng-deep .form-section .mat-card-header {
      padding-bottom: 16px;
    }

    ::ng-deep .form-section .mat-card-content {
      padding-top: 0;
    }
  `]
})
export class CreateInstanceGroupComponent implements OnInit {
  groupForm: FormGroup;
  loading = false;
  cloneData: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private instanceGroupsService: InstanceGroupsService,
    private projectService: ProjectService
  ) {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]*$/)]],
      description: [''],
      groupType: ['Managed', Validators.required],
      zone: ['', Validators.required],
      network: ['default'],
      subnetwork: ['default'],
      instanceTemplate: [''],
      targetSize: [3, [Validators.min(0), Validators.max(1000)]],
      namedPorts: this.fb.array([this.createNamedPortControl()])
    });

    // Add conditional validation for managed instance groups
    this.groupForm.get('groupType')?.valueChanges.subscribe(groupType => {
      const instanceTemplateControl = this.groupForm.get('instanceTemplate');
      const targetSizeControl = this.groupForm.get('targetSize');
      
      if (groupType === 'Managed') {
        instanceTemplateControl?.setValidators([Validators.required]);
        targetSizeControl?.setValidators([Validators.required, Validators.min(0), Validators.max(1000)]);
      } else {
        instanceTemplateControl?.clearValidators();
        targetSizeControl?.clearValidators();
      }
      
      instanceTemplateControl?.updateValueAndValidity();
      targetSizeControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    // Check for clone parameter
    this.route.queryParams.subscribe(params => {
      if (params['clone']) {
        // In a real implementation, you would fetch the instance group data
        // For now, we'll simulate it
        console.log('Cloning instance group:', params['clone']);
        // You could fetch the actual data here and call initializeFromClone
      }
    });

    // Monitor form changes for real-time validation
    this.groupForm.valueChanges.subscribe(() => {
      // Additional validation logic can be added here
    });
  }

  get namedPortsArray(): FormArray {
    return this.groupForm.get('namedPorts') as FormArray;
  }

  createNamedPortControl(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      port: [80, [Validators.required, Validators.min(1), Validators.max(65535)]]
    });
  }

  addNamedPort() {
    this.namedPortsArray.push(this.createNamedPortControl());
  }

  removeNamedPort(index: number) {
    if (this.namedPortsArray.length > 1) {
      this.namedPortsArray.removeAt(index);
    }
  }

  getValidPortsCount(): number {
    return this.namedPortsArray.controls
      .filter(control => control.get('name')?.value && control.get('port')?.value && control.valid)
      .length;
  }

  goBack() {
    this.router.navigate(['/instance-groups']);
  }

  goToInstanceGroups() {
    this.router.navigate(['/instance-groups']);
  }

  private initializeFromClone(cloneData: any) {
    this.cloneData = cloneData;
    this.groupForm.patchValue({
      name: `${cloneData.name}-copy`,
      description: cloneData.description,
      groupType: cloneData.groupType,
      zone: cloneData.zone,
      network: cloneData.network,
      subnetwork: cloneData.subnetwork,
      instanceTemplate: cloneData.instanceTemplate,
      targetSize: cloneData.targetSize
    });

    // Clone named ports
    if (cloneData.namedPorts && cloneData.namedPorts.length > 0) {
      this.namedPortsArray.clear();
      cloneData.namedPorts.forEach((port: NamedPort) => {
        const portControl = this.createNamedPortControl();
        portControl.patchValue(port);
        this.namedPortsArray.push(portControl);
      });
    }
  }

  onCreate() {
    if (this.groupForm.valid) {
      this.loading = true;
      const formValue = this.groupForm.value;
      
      // Filter out empty named ports
      const validNamedPorts = formValue.namedPorts
        .filter((port: any) => port.name && port.port)
        .map((port: any) => ({
          name: port.name.trim(),
          port: parseInt(port.port, 10)
        }));

      const groupData: CreateInstanceGroupRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        groupType: formValue.groupType,
        zone: formValue.zone,
        network: formValue.network || undefined,
        subnetwork: formValue.subnetwork || undefined,
        instanceTemplate: formValue.instanceTemplate || undefined,
        targetSize: formValue.groupType === 'Managed' ? formValue.targetSize : undefined,
        namedPorts: validNamedPorts.length > 0 ? validNamedPorts : undefined
      };
      
      const currentProject = this.projectService.getCurrentProject();
      if (!currentProject) {
        this.snackBar.open('No project selected', 'Close', { duration: 3000 });
        this.loading = false;
        return;
      }

      this.instanceGroupsService.createInstanceGroup(
        currentProject.id, 
        groupData.zone!, 
        groupData
      ).subscribe({
        next: (result) => {
          console.log('Instance group created successfully:', result);
          this.snackBar.open(`Instance group "${groupData.name}" created successfully`, 'Close', { 
            duration: 5000,
            panelClass: 'success-snackbar'
          });
          
          // Navigate back to instance groups list
          this.router.navigate(['/instance-groups']);
        },
        error: (error) => {
          console.error('Error creating instance group:', error);
          this.snackBar.open(`Failed to create instance group: ${error.message || 'Unknown error'}`, 'Close', { 
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.loading = false;
        }
      });
    }
  }
} 