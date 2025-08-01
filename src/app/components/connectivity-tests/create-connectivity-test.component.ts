import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable, of } from 'rxjs';
import { takeUntil, debounceTime, switchMap, startWith, map } from 'rxjs/operators';

import { ConnectivityTestsService, ConnectivityTestRequest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';
import { ResourceApiService, GceInstance, CloudSqlInstance, AlloyDbInstance, GkeCluster, CloudRunService, CloudFunction } from '../../services/resource-api.service';
import { EndpointConfigurationService, EndpointHierarchy, EndpointOption } from '../../services/endpoint-configuration.service';
import { ConnectivityTestFormHelperService } from '../../services/connectivity-test-form-helper.service';

interface ProjectOption {
  value: string;
  displayName: string;
}

interface ResourceOption {
  value: string;
  displayName: string;
  details?: any;
}

@Component({
  selector: 'app-create-connectivity-test',
  template: `
    <gcp-page-layout>
      <div class="page-header">
        <div class="header-content">
          <button mat-icon-button (click)="onCancel()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1>Create Connectivity Test</h1>
            <p class="subtitle">Configure a new connectivity test to check network connectivity between endpoints</p>
          </div>
        </div>
      </div>

      <div class="page-content">
        <form [formGroup]="testForm" class="test-form">

          <!-- Source Section -->
          <div class="form-section">
            <h3>Source</h3>
            
            <!-- Source Endpoint Type -->
            <div class="endpoint-selector">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Source endpoint</mat-label>
                <mat-select formControlName="sourceEndpointType" 
                           (selectionChange)="onSourceEndpointTypeChange($event.value)">
                  <mat-option *ngFor="let option of sourceEndpointHierarchy.topLevel" 
                             [value]="option.value"
                             [disabled]="option.label === '---'">
                    <span [class.category-option]="option.isCategory">{{option.label}}</span>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <!-- Source Category Sub-menu -->
              <mat-form-field *ngIf="selectedSourceCategory" appearance="outline" class="full-width category-submenu">
                <mat-label>Select {{getSourceCategoryLabel()}}</mat-label>
                <mat-select formControlName="sourceEndpointType"
                           (selectionChange)="onSourceSelectionChange()">
                  <mat-option *ngFor="let option of getSourceCategoryOptions()" 
                             [value]="option.value">
                    {{option.label}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Source Details -->
            <div class="endpoint-details" *ngIf="currentSourceEndpointType">
              
              <!-- My IP Address -->
              <div *ngIf="isSourceEndpointType('myIp')" class="info-message">
                <mat-icon>info</mat-icon>
                <span>We'll use your current public IP address: <strong>{{userIpAddress || 'Loading...'}}</strong></span>
              </div>

              <!-- Custom IP Address -->
              <div *ngIf="isSourceEndpointType('customIp')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Source IP address *</mat-label>
                  <input matInput formControlName="sourceIpAddress" placeholder="192.0.2.1">
                  <mat-error *ngIf="testForm.get('sourceIpAddress')?.hasError('required')">
                    Source IP address is required
                  </mat-error>
                  <mat-error *ngIf="testForm.get('sourceIpAddress')?.hasError('pattern')">
                    Please enter a valid IP address
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>IP address type *</mat-label>
                  <mat-select formControlName="sourceIpType">
                    <mat-option *ngFor="let option of ipTypeOptions" [value]="option.value">
                      {{option.label}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceIpType')?.hasError('required')">
                    IP address type is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Non-GCP Private IP -->
              <div *ngIf="isSourceEndpointType('nonGcpPrivateIp')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Source IP address *</mat-label>
                  <input matInput formControlName="sourceIpAddress" placeholder="10.0.0.1">
                  <mat-error *ngIf="testForm.get('sourceIpAddress')?.hasError('required')">
                    Source IP address is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Connection type *</mat-label>
                  <mat-select formControlName="sourceConnectionType" (selectionChange)="onConnectionTypeChange()">
                    <mat-option *ngFor="let option of connectionTypeOptions" [value]="option.value">
                      {{option.label}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceConnectionType')?.hasError('required')">
                    Connection type is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getSourceProjectLabel()}} *</mat-label>
                  <mat-select formControlName="sourceProject">
                    <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                      {{project.displayName}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceProject')?.hasError('required')">
                    Project is required
                  </mat-error>
                </mat-form-field>

                <!-- Connection Resource Selection -->
                <div [ngSwitch]="testForm.get('sourceConnectionType')?.value">
                  <mat-form-field *ngSwitchCase="'vpnTunnel'" appearance="outline" class="full-width">
                    <mat-label>VPN Tunnel *</mat-label>
                    <mat-select formControlName="sourceVpnTunnel">
                      <mat-option value="tunnel-1">tunnel-1</mat-option>
                      <mat-option value="tunnel-2">tunnel-2</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field *ngSwitchCase="'interconnectAttachment'" appearance="outline" class="full-width">
                    <mat-label>Interconnect Attachment *</mat-label>
                    <mat-select formControlName="sourceInterconnectAttachment">
                      <mat-option value="attachment-1">attachment-1</mat-option>
                      <mat-option value="attachment-2">attachment-2</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field *ngSwitchCase="'nccRouterAppliance'" appearance="outline" class="full-width">
                    <mat-label>NCC Router Appliance *</mat-label>
                    <mat-select formControlName="sourceNccRouterAppliance">
                      <mat-option value="appliance-1">appliance-1</mat-option>
                      <mat-option value="appliance-2">appliance-2</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <!-- Cloud Console SSH-in-browser -->
              <div *ngIf="isSourceEndpointType('cloudConsoleSsh')" class="info-message">
                <mat-icon>info</mat-icon>
                <span>We will analyze connectivity from your IP address via <b>Identity Aware Proxy</b> to particular VM of choice.</span>
              </div>

              <!-- Resource-based endpoints (VM, SQL, etc.) -->
              <div *ngIf="requiresResourceSelection(currentSourceEndpointType)">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getSourceResourceLabel()}} *</mat-label>
                  <mat-select formControlName="sourceResource" (selectionChange)="onSourceResourceChange()">
                    <mat-option *ngIf="sourceResourcesLoading" disabled>
                      <mat-spinner diameter="20"></mat-spinner> Loading...
                    </mat-option>
                    <mat-option *ngFor="let resource of sourceResources" [value]="resource.value">
                      {{resource.displayName}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceResource')?.hasError('required')">
                    {{getSourceResourceLabel()}} is required
                  </mat-error>
                </mat-form-field>

                <!-- Additional fields for GKE workloads -->
                <div *ngIf="isSourceEndpointTypeOneOf(['gkeWorkload', 'gkePod']) && testForm.get('sourceResource')?.value">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{getWorkloadLabel(currentSourceEndpointType)}} *</mat-label>
                    <mat-select formControlName="sourceWorkload">
                      <mat-option *ngIf="sourceWorkloadsLoading" disabled>
                        <mat-spinner diameter="20"></mat-spinner> Loading...
                      </mat-option>
                      <mat-option *ngFor="let workload of sourceWorkloads" [value]="workload.value">
                        {{workload.displayName}}
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="testForm.get('sourceWorkload')?.hasError('required')">
                      {{getWorkloadLabel(currentSourceEndpointType)}} is required
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Destination Section -->
          <div class="form-section">
            <h3>Destination</h3>
            
            <!-- Destination Endpoint Type -->
            <div class="endpoint-selector">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Destination endpoint</mat-label>
                <mat-select formControlName="destinationEndpointType" 
                           (selectionChange)="onDestinationEndpointTypeChange($event.value)">
                  <mat-option *ngFor="let option of destinationEndpointHierarchy.topLevel" 
                             [value]="option.value">
                    <span [class.category-option]="option.isCategory">{{option.label}}</span>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <!-- Destination Category Sub-menu -->
              <mat-form-field *ngIf="selectedDestinationCategory" appearance="outline" class="full-width category-submenu">
                <mat-label>Select {{getDestinationCategoryLabel()}}</mat-label>
                <mat-select formControlName="destinationEndpointType"
                           (selectionChange)="onDestinationSelectionChange()">
                  <mat-option *ngFor="let option of getDestinationCategoryOptions()" 
                             [value]="option.value">
                    {{option.label}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Destination Details -->
            <div class="endpoint-details" *ngIf="currentDestinationEndpointType">
              
              <!-- Custom IP Address -->
              <div *ngIf="isDestinationEndpointType('customIp')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Destination IP address *</mat-label>
                  <input matInput formControlName="destinationIpAddress" placeholder="192.0.2.1">
                  <mat-error *ngIf="testForm.get('destinationIpAddress')?.hasError('required')">
                    Destination IP address is required
                  </mat-error>
                  <mat-error *ngIf="testForm.get('destinationIpAddress')?.hasError('pattern')">
                    Please enter a valid IP address
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Domain -->
              <div *ngIf="isDestinationEndpointType('domain')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Domain *</mat-label>
                  <input matInput formControlName="destinationDomain" placeholder="example.com">
                  <mat-error *ngIf="testForm.get('destinationDomain')?.hasError('required')">
                    Domain is required
                  </mat-error>
                  <mat-error *ngIf="testForm.get('destinationDomain')?.hasError('pattern')">
                    Please enter a valid domain
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Resource-based endpoints -->
              <div *ngIf="requiresResourceSelection(currentDestinationEndpointType)">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getDestinationResourceLabel()}} *</mat-label>
                  <mat-select formControlName="destinationResource" (selectionChange)="onDestinationResourceChange()">
                    <mat-option *ngIf="destinationResourcesLoading" disabled>
                      <mat-spinner diameter="20"></mat-spinner> Loading...
                    </mat-option>
                    <mat-option *ngFor="let resource of destinationResources" [value]="resource.value">
                      {{resource.displayName}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationResource')?.hasError('required')">
                    {{getDestinationResourceLabel()}} is required
                  </mat-error>
                </mat-form-field>

                <!-- Additional fields for GKE workloads/services -->
                <div *ngIf="isDestinationEndpointTypeOneOf(['gkeWorkload', 'gkePod']) && testForm.get('destinationResource')?.value">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{getWorkloadLabel(currentDestinationEndpointType)}} *</mat-label>
                    <mat-select formControlName="destinationWorkload">
                      <mat-option *ngIf="destinationWorkloadsLoading" disabled>
                        <mat-spinner diameter="20"></mat-spinner> Loading...
                      </mat-option>
                      <mat-option *ngFor="let workload of destinationWorkloads" [value]="workload.value">
                        {{workload.displayName}}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div *ngIf="isDestinationEndpointType('gkeService') && testForm.get('destinationResource')?.value">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Service *</mat-label>
                    <mat-select formControlName="destinationService">
                      <mat-option *ngIf="destinationServicesLoading" disabled>
                        <mat-spinner diameter="20"></mat-spinner> Loading...
                      </mat-option>
                      <mat-option *ngFor="let service of destinationServices" [value]="service.value">
                        {{service.displayName}}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Protocol Section -->
          <div class="form-section">
            <h3>Protocol</h3>
            
            <div class="protocol-fields">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Protocol *</mat-label>
                <mat-select formControlName="protocol">
                  <mat-option *ngFor="let option of protocolOptions" [value]="option.value">
                    {{option.label}}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="testForm.get('protocol')?.hasError('required')">
                  Protocol is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Destination port</mat-label>
                <input matInput type="number" formControlName="destinationPort" placeholder="80">
                <mat-hint>Leave blank for protocol default</mat-hint>
              </mat-form-field>
            </div>
          </div>

          <!-- Test Name Section -->
          <div class="form-section">
            <h3>Test Name</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Display name *</mat-label>
              <input matInput formControlName="displayName" 
                     (input)="onTestNameManualEdit()"
                     placeholder="Auto-generated based on source and destination">
              <button mat-icon-button matSuffix type="button" 
                      (click)="regenerateTestName()" 
                      matTooltip="Regenerate name">
                <mat-icon>refresh</mat-icon>
              </button>
              <mat-error *ngIf="testForm.get('displayName')?.hasError('required')">
                Test name is required
              </mat-error>
              <mat-hint>Name will be auto-generated based on your source and destination selection</mat-hint>
            </mat-form-field>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button mat-button type="button" (click)="onCancel()" [disabled]="isCreating">
              Cancel
            </button>
            <button mat-raised-button color="primary" type="submit" 
                    (click)="onCreate()" 
                    [disabled]="testForm.invalid || isCreating">
              <mat-spinner *ngIf="isCreating" diameter="20"></mat-spinner>
              {{isCreating ? 'Creating...' : 'Create test'}}
            </button>
          </div>

        </form>
      </div>
    </gcp-page-layout>
  `,
  styleUrls: ['./create-connectivity-test.component.scss']
})
export class CreateConnectivityTestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  testForm!: FormGroup;
  isCreating = false;
  userHasEditedName = false;
  userIpAddress = '';

  // Project and resource data
  availableProjects: ProjectOption[] = [];
  
  // Source data
  sourceResources: ResourceOption[] = [];
  sourceWorkloads: ResourceOption[] = [];
  sourceResourcesLoading = false;
  sourceWorkloadsLoading = false;
  
  // Destination data  
  destinationResources: ResourceOption[] = [];
  destinationWorkloads: ResourceOption[] = [];
  destinationServices: ResourceOption[] = [];
  destinationResourcesLoading = false;
  destinationWorkloadsLoading = false;
  destinationServicesLoading = false;

  // UI state
  selectedSourceCategory: string | null = null;
  selectedDestinationCategory: string | null = null;
  currentSourceEndpointType = '';
  currentDestinationEndpointType = '';

  // Configuration data from services
  sourceEndpointHierarchy!: EndpointHierarchy;
  destinationEndpointHierarchy!: EndpointHierarchy;
  protocolOptions!: EndpointOption[];
  ipTypeOptions!: EndpointOption[];
  connectionTypeOptions!: EndpointOption[];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private connectivityTestsService: ConnectivityTestsService,
    private projectService: ProjectService,
    private resourceApiService: ResourceApiService,
    private endpointConfigService: EndpointConfigurationService,
    private formHelperService: ConnectivityTestFormHelperService
  ) {
    this.initializeForm();
    this.loadConfiguration();
  }

  ngOnInit(): void {
    this.loadAvailableProjects();
    this.loadUserIpAddress();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ====================
  // INITIALIZATION
  // ====================

  private initializeForm(): void {
    this.testForm = this.fb.group({
      // Source fields
      sourceEndpointType: ['', Validators.required],
      sourceIpAddress: [''],
      sourceIpType: [''],
      sourceResource: [''],
      sourceWorkload: [''],
      sourceProject: [''],
      sourceConnectionType: [''],
      sourceVpnTunnel: [''],
      sourceInterconnectAttachment: [''],
      sourceNccRouterAppliance: [''],
      
      // Destination fields
      destinationEndpointType: ['', Validators.required],
      destinationIpAddress: [''],
      destinationDomain: [''],
      destinationResource: [''],
      destinationWorkload: [''],
      destinationService: [''],
      
      // Protocol fields
      protocol: ['tcp', Validators.required],
      destinationPort: [''],
      
      // Test info
      displayName: ['', Validators.required]
    });
  }

  private loadConfiguration(): void {
    this.sourceEndpointHierarchy = this.endpointConfigService.getSourceEndpointHierarchy();
    this.destinationEndpointHierarchy = this.endpointConfigService.getDestinationEndpointHierarchy();
    this.protocolOptions = this.endpointConfigService.getProtocolOptions();
    this.ipTypeOptions = this.endpointConfigService.getIpTypeOptions();
    this.connectionTypeOptions = this.endpointConfigService.getConnectionTypeOptions();
  }

  private setupFormSubscriptions(): void {
    // Auto-generate test name when source/destination changes
    this.testForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => {
      if (!this.userHasEditedName) {
        this.updateTestName();
      }
    });
  }

  // ====================
  // DATA LOADING
  // ====================

  private loadAvailableProjects(): void {
    this.projectService.loadProjects().subscribe(
      (projects: Project[]) => {
        this.availableProjects = projects.map((p: Project) => ({
          value: p.id,
          displayName: `${p.name} (${p.id})`
        }));
      },
      (error: any) => {
        console.error('Error loading projects:', error);
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
      }
    );
  }

  private loadUserIpAddress(): void {
    this.http.get<any>('https://api.ipify.org?format=json').subscribe(
      response => {
        this.userIpAddress = response.ip;
      },
      error => {
        console.error('Error fetching IP address:', error);
        this.userIpAddress = 'Unable to detect';
      }
    );
  }

  private loadSourceResources(endpointType: string): void {
    if (!this.requiresResourceSelection(endpointType)) return;

    this.sourceResourcesLoading = true;
    this.sourceResources = [];

    const currentProject = this.getCurrentProject();
    if (!currentProject) {
      this.sourceResourcesLoading = false;
      return;
    }

    this.fetchResourcesByType(endpointType, currentProject).subscribe(
      resources => {
        this.sourceResources = resources;
        this.sourceResourcesLoading = false;
      },
      error => {
        console.error('Error loading source resources:', error);
        this.sourceResourcesLoading = false;
      }
    );
  }

  private loadDestinationResources(endpointType: string): void {
    if (!this.requiresResourceSelection(endpointType)) return;

    this.destinationResourcesLoading = true;
    this.destinationResources = [];

    const currentProject = this.getCurrentProject();
    if (!currentProject) {
      this.destinationResourcesLoading = false;
      return;
    }

    this.fetchResourcesByType(endpointType, currentProject).subscribe(
      resources => {
        this.destinationResources = resources;
        this.destinationResourcesLoading = false;
      },
      error => {
        console.error('Error loading destination resources:', error);
        this.destinationResourcesLoading = false;
      }
    );
  }

  private fetchResourcesByType(endpointType: string, projectId: string): Observable<ResourceOption[]> {
    switch (endpointType) {
      case 'gceInstance':
        return this.resourceApiService.getGceInstances(projectId).pipe(
          map(instances => instances.map(instance => ({
            value: `projects/${projectId}/zones/${instance.zone}/instances/${instance.name}`,
            displayName: `${instance.name} (${instance.zone})`,
            details: instance
          })))
        );

      case 'cloudSqlInstance':
        return this.resourceApiService.getCloudSqlInstances(projectId).pipe(
          map(instances => instances.map(instance => ({
            value: `projects/${projectId}/instances/${instance.name}`,
            displayName: `${instance.name} (${instance.databaseVersion})`,
            details: instance
          })))
        );

      case 'alloyDb':
        return this.resourceApiService.getAlloyDbInstances(projectId).pipe(
          map(instances => instances.map(instance => ({
            value: `projects/${projectId}/locations/-/clusters/${instance.cluster}/instances/${instance.name}`,
            displayName: `${instance.name} (${instance.cluster})`,
            details: instance
          })))
        );

      case 'gkeCluster':
        return this.resourceApiService.getGkeClusters(projectId).pipe(
          map(clusters => clusters.map(cluster => ({
            value: `projects/${projectId}/locations/${cluster.location}/clusters/${cluster.name}`,
            displayName: `${cluster.name} (${cluster.location})`,
            details: cluster
          })))
        );

      case 'cloudRun':
        return this.resourceApiService.getCloudRunServices(projectId).pipe(
          map(services => services.map(service => ({
            value: `projects/${projectId}/locations/${service.region}/services/${service.name}`,
            displayName: `${service.name} (${service.region})`,
            details: service
          })))
        );

      case 'cloudFunctionV1':
      case 'cloudRunFunction':
        return this.resourceApiService.getCloudFunctions(projectId).pipe(
          map(functions => functions.map(func => ({
            value: `projects/${projectId}/locations/${func.region}/functions/${func.name}`,
            displayName: `${func.name} (${func.region})`,
            details: func
          })))
        );

      default:
        return of([]);
    }
  }

  // ====================
  // EVENT HANDLERS
  // ====================

  onSourceEndpointTypeChange(value: string): void {
    const option = this.endpointConfigService.getEndpointOptionByValue(value, this.sourceEndpointHierarchy);
    
    if (option?.isCategory) {
      this.selectedSourceCategory = value;
      this.currentSourceEndpointType = '';
      this.testForm.patchValue({ sourceEndpointType: '' });
    } else {
      this.selectedSourceCategory = null;
      this.currentSourceEndpointType = value;
      this.onSourceSelectionChange();
      
      // Special handling for Cloud Console SSH-in-browser
      if (value === 'cloudConsoleSsh') {
        this.autoSetDestinationForSsh();
      }
    }
    
    this.formHelperService.resetSourceDetails(this.testForm);
  }

  onDestinationEndpointTypeChange(value: string): void {
    const option = this.endpointConfigService.getEndpointOptionByValue(value, this.destinationEndpointHierarchy);
    
    if (option?.isCategory) {
      this.selectedDestinationCategory = value;
      this.currentDestinationEndpointType = '';
      this.testForm.patchValue({ destinationEndpointType: '' });
    } else {
      this.selectedDestinationCategory = null;
      this.currentDestinationEndpointType = value;
      this.onDestinationSelectionChange();
    }
    
    this.formHelperService.resetDestinationDetails(this.testForm);
  }

  onSourceSelectionChange(): void {
    const endpointType = this.testForm.get('sourceEndpointType')?.value;
    if (endpointType) {
      this.currentSourceEndpointType = endpointType;
      this.formHelperService.applySourceValidation(this.testForm, endpointType);
      this.loadSourceResources(endpointType);
    }
  }

  onDestinationSelectionChange(): void {
    const endpointType = this.testForm.get('destinationEndpointType')?.value;
    if (endpointType) {
      this.currentDestinationEndpointType = endpointType;
      this.formHelperService.applyDestinationValidation(this.testForm, endpointType);
      this.loadDestinationResources(endpointType);
    }
  }

  onSourceResourceChange(): void {
    // Load additional resources if needed (e.g., workloads for GKE)
    const endpointType = this.currentSourceEndpointType;
    if (this.isSourceEndpointTypeOneOf(['gkeWorkload', 'gkePod'])) {
      this.loadSourceWorkloads();
    }
  }

  onDestinationResourceChange(): void {
    // Load additional resources if needed
    const endpointType = this.currentDestinationEndpointType;
    if (this.isDestinationEndpointTypeOneOf(['gkeWorkload', 'gkePod'])) {
      this.loadDestinationWorkloads();
    } else if (this.isDestinationEndpointType('gkeService')) {
      this.loadDestinationServices();
    }
  }

  onConnectionTypeChange(): void {
    // Update validation and available resources based on connection type
    const connectionType = this.testForm.get('sourceConnectionType')?.value;
    this.formHelperService.applySourceValidation(this.testForm, this.currentSourceEndpointType);
  }

  onTestNameManualEdit(): void {
    this.userHasEditedName = true;
  }

  regenerateTestName(): void {
    this.userHasEditedName = false;
    this.updateTestName();
  }

  private autoSetDestinationForSsh(): void {
    this.selectedDestinationCategory = 'compute-gke';
    this.testForm.patchValue({
      destinationEndpointType: 'gceInstance',
      destinationPort: 22
    }, { emitEvent: false });
    
    this.currentDestinationEndpointType = 'gceInstance';
    this.formHelperService.applyDestinationValidation(this.testForm, 'gceInstance');
    this.loadDestinationResources('gceInstance');
    
    // Reset name generation flag
    this.userHasEditedName = false;
  }

  private loadSourceWorkloads(): void {
    // Implementation for loading GKE workloads
    this.sourceWorkloadsLoading = true;
    // This would call GKE API to get workloads for the selected cluster
    setTimeout(() => {
      this.sourceWorkloads = [
        { value: 'frontend-deployment', displayName: 'frontend-deployment (Deployment)' },
        { value: 'backend-service', displayName: 'backend-service (Service)' }
      ];
      this.sourceWorkloadsLoading = false;
    }, 1000);
  }

  private loadDestinationWorkloads(): void {
    // Implementation for loading GKE workloads
    this.destinationWorkloadsLoading = true;
    setTimeout(() => {
      this.destinationWorkloads = [
        { value: 'frontend-deployment', displayName: 'frontend-deployment (Deployment)' },
        { value: 'backend-service', displayName: 'backend-service (Service)' }
      ];
      this.destinationWorkloadsLoading = false;
    }, 1000);
  }

  private loadDestinationServices(): void {
    // Implementation for loading GKE services
    this.destinationServicesLoading = true;
    setTimeout(() => {
      this.destinationServices = [
        { value: 'frontend-service', displayName: 'frontend-service' },
        { value: 'backend-service', displayName: 'backend-service' }
      ];
      this.destinationServicesLoading = false;
    }, 1000);
  }

  // ====================
  // HELPER METHODS
  // ====================

  private getCurrentProject(): string {
    // For now, use a default project. In real implementation, this would come from project selector
    return 'przemeksroka-joonix-service';
  }

  private updateTestName(): void {
    const generatedName = this.formHelperService.generateTestName(this.testForm);
    this.testForm.patchValue({ displayName: generatedName }, { emitEvent: false });
  }

  requiresResourceSelection(endpointType: string): boolean {
    return this.endpointConfigService.requiresResourceSelection(endpointType);
  }

  getSourceCategoryLabel(): string {
    if (!this.selectedSourceCategory) return '';
    const option = this.endpointConfigService.getEndpointOptionByValue(this.selectedSourceCategory, this.sourceEndpointHierarchy);
    return option?.label.replace('...', '') || '';
  }

  getDestinationCategoryLabel(): string {
    if (!this.selectedDestinationCategory) return '';
    const option = this.endpointConfigService.getEndpointOptionByValue(this.selectedDestinationCategory, this.destinationEndpointHierarchy);
    return option?.label.replace('...', '') || '';
  }

  getSourceCategoryOptions(): EndpointOption[] {
    return this.selectedSourceCategory ? this.sourceEndpointHierarchy.categories[this.selectedSourceCategory] || [] : [];
  }

  getDestinationCategoryOptions(): EndpointOption[] {
    return this.selectedDestinationCategory ? this.destinationEndpointHierarchy.categories[this.selectedDestinationCategory] || [] : [];
  }

  getSourceResourceLabel(): string {
    return this.formHelperService.getSourceDataServiceLabel(this.currentSourceEndpointType);
  }

  getDestinationResourceLabel(): string {
    return this.formHelperService.getDestinationServiceLabel(this.currentDestinationEndpointType);
  }

  getWorkloadLabel(endpointType: string): string {
    return this.formHelperService.getWorkloadLabel(endpointType);
  }

  getSourceProjectLabel(): string {
    const connectionType = this.testForm.get('sourceConnectionType')?.value;
    return this.formHelperService.getSourceProjectLabel(connectionType);
  }

  isSourceEndpointType(type: string): boolean {
    return this.formHelperService.isEndpointType(this.testForm, 'sourceEndpointType', type);
  }

  isDestinationEndpointType(type: string): boolean {
    return this.formHelperService.isEndpointType(this.testForm, 'destinationEndpointType', type);
  }

  isSourceEndpointTypeOneOf(types: string[]): boolean {
    return this.formHelperService.isEndpointTypeOneOf(this.testForm, 'sourceEndpointType', types);
  }

  isDestinationEndpointTypeOneOf(types: string[]): boolean {
    return this.formHelperService.isEndpointTypeOneOf(this.testForm, 'destinationEndpointType', types);
  }

  // ====================
  // ACTIONS
  // ====================

  onCreate(): void {
    if (this.testForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isCreating = true;
    const formValue = this.testForm.value;

    const request: ConnectivityTestRequest = {
      displayName: formValue.displayName,
      description: `Connectivity test from ${this.currentSourceEndpointType} to ${this.currentDestinationEndpointType}`,
      source: this.formHelperService.buildSourceEndpoint(formValue),
      destination: this.formHelperService.buildDestinationEndpoint(formValue),
      protocol: formValue.protocol,
      relatedProjects: [this.getCurrentProject()]
    };

    if (formValue.destinationPort) {
      request.destination.port = parseInt(formValue.destinationPort);
    }

    this.connectivityTestsService.createConnectivityTest(this.getCurrentProject(), request).subscribe(
      (response: any) => {
        this.isCreating = false;
        this.snackBar.open('Connectivity test created successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/connectivity-tests']);
      },
      (error: any) => {
        this.isCreating = false;
        console.error('Error creating connectivity test:', error);
        this.snackBar.open('Failed to create connectivity test', 'Close', { duration: 5000 });
      }
    );
  }

  onCancel(): void {
    this.router.navigate(['/connectivity-tests']);
  }
}