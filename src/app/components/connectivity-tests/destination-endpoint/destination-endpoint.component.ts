import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, ControlContainer, FormGroupDirective } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  EndpointHierarchy, 
  EndpointOption, 
  ProjectOption,
  VpcNetworkOption
} from '../shared/connectivity-test.interfaces';
import { EndpointHierarchyService } from '../shared/endpoint-hierarchy.service';
import { ResourceLoaderService, ResourceOption, EndpointType } from '../../../services/resource-loader.service';
import { ProjectService } from '../../../services/project.service';
import { ComputeEngineService } from '../../../services/compute-engine.service';

@Component({
  selector: 'app-destination-endpoint',
  template: `
    <div class="form-section" [formGroup]="form">
      <h3>Destination</h3>
      
      <!-- Destination endpoint type selector -->
      <div class="endpoint-selector">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Destination endpoint</mat-label>
          <mat-select (selectionChange)="onDestinationEndpointTypeChange($event.value)" 
                     [value]="selectedDestinationCategory || form.get('endpointType')?.value">
            <mat-option *ngFor="let option of destinationEndpointHierarchy.topLevel" 
                       [value]="option.value"
                       [disabled]="option.label === '---'">
              <span [class.category-option]="option.isCategory">{{option.label}}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <!-- Category sub-menu -->
        <mat-form-field *ngIf="selectedDestinationCategory" appearance="outline" class="full-width category-submenu">
          <mat-label>Select {{getDestinationCategoryLabel()}}</mat-label>
          <mat-select (selectionChange)="onDestinationCategorySelection($event.value)"
                     [value]="form.get('endpointType')?.value">
            <mat-option *ngFor="let option of getDestinationCategoryOptions()" 
                       [value]="option.value">
              {{option.label}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Destination endpoint details -->
      <div class="endpoint-details" *ngIf="getCurrentDestinationEndpointType()">
        
        <!-- IP Address -->
        <div *ngIf="isDestinationEndpointType('ipAddress')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Destination IP address *</mat-label>
            <input matInput formControlName="ip" placeholder="Example: 192.0.2.1">
            <mat-error *ngIf="form.get('ip')?.hasError('required')">
              Destination IP address is required
            </mat-error>
            <mat-error *ngIf="form.get('ip')?.hasError('pattern')">
              Please enter a valid IP address
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Domain Name -->
        <div *ngIf="isDestinationEndpointType('domainName')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Domain Name *</mat-label>
            <input matInput formControlName="domain" placeholder="Example: example.com">
            <mat-hint>System will perform DNS lookup and test against resolved IP</mat-hint>
            <mat-error *ngIf="form.get('domain')?.hasError('required')">
              Domain name is required
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Google APIs -->
        <div *ngIf="isDestinationEndpointType('googleApis')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Google API *</mat-label>
            <mat-select formControlName="service">
              <mat-option value="storage.googleapis.com">Cloud Storage (storage.googleapis.com)</mat-option>
              <mat-option value="compute.googleapis.com">Compute Engine (compute.googleapis.com)</mat-option>
              <mat-option value="bigquery.googleapis.com">BigQuery (bigquery.googleapis.com)</mat-option>
              <mat-option value="monitoring.googleapis.com">Cloud Monitoring (monitoring.googleapis.com)</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('service')?.hasError('required')">
              Google API is required
            </mat-error>
          </mat-form-field>
        </div>

        <!-- VM Instance -->
        <div *ngIf="isDestinationEndpointType('gceInstance')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Destination instance *</mat-label>
            <mat-select formControlName="instance" (selectionChange)="onResourceChange()">
              <mat-option *ngIf="isLoadingDestinationResources" disabled>
                <div class="loading-option">
                  <mat-spinner diameter="16"></mat-spinner>
                  <span>Loading instances...</span>
                </div>
              </mat-option>
              <mat-option *ngIf="destinationResourceError && !isLoadingDestinationResources" disabled>
                {{destinationResourceError}}
              </mat-option>
              <mat-option *ngFor="let instance of destinationResourceOptions" [value]="instance.value">
                <div class="resource-item">
                  <div class="resource-name">{{instance.displayName}}</div>
                  <div *ngIf="instance.description" class="resource-description">{{instance.description}}</div>
                </div>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('instance')?.hasError('required')">
              Destination instance is required
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Subnetwork -->
        <div *ngIf="isDestinationEndpointType('subnetwork')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Project</mat-label>
            <mat-select formControlName="networkProject">
              <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                {{project.displayName}}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>VPC Network</mat-label>
            <mat-select formControlName="networkVpc">
              <mat-option *ngFor="let network of availableVpcNetworks" [value]="network.value">
                {{network.displayName}}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Subnetwork</mat-label>
            <mat-select formControlName="networkSubnet">
              <mat-option *ngFor="let subnet of availableSubnetworks" [value]="subnet.name">
                {{subnet.name}}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Other endpoint types can be added here -->
      </div>

      <!-- Destination port -->
      <mat-form-field appearance="outline" class="full-width" 
                      *ngIf="getProtocol() === 'tcp' || getProtocol() === 'udp'">
        <mat-label>Destination port *</mat-label>
        <input matInput type="number" formControlName="port" placeholder="80">
        <mat-error *ngIf="form.get('port')?.hasError('required')">
          Destination port is required for TCP/UDP protocols
        </mat-error>
        <mat-error *ngIf="form.get('port')?.hasError('min') || form.get('port')?.hasError('max')">
          Port must be between 1 and 65535
        </mat-error>
      </mat-form-field>
    </div>
  `,
  styleUrls: ['../create-connectivity-test.component.scss'],
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class DestinationEndpointComponent implements OnInit, OnDestroy {
  @Output() endpointChange = new EventEmitter<any>();
  form!: FormGroup;

  destinationEndpointHierarchy: EndpointHierarchy;
  selectedDestinationCategory: string | null = null;
  availableProjects: ProjectOption[] = [];
  availableVpcNetworks: VpcNetworkOption[] = [];
  availableSubnetworks: any[] = [];
  
  // Resource loading
  destinationResourceOptions: ResourceOption[] = [];
  isLoadingDestinationResources = false;
  destinationResourceError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private parentForm: FormGroupDirective,
    private endpointHierarchyService: EndpointHierarchyService,
    private resourceLoaderService: ResourceLoaderService,
    private projectService: ProjectService,
    private computeEngineService: ComputeEngineService
  ) {
    this.destinationEndpointHierarchy = this.endpointHierarchyService.getDestinationEndpointHierarchy();
  }

  ngOnInit() {
    this.form = this.parentForm.form.get('destination') as FormGroup;
    this.loadAvailableProjects();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions() {
    // Watch for destination endpoint type changes
    this.form.get('endpointType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.endpointChange.emit();
      });

    // Watch for other relevant field changes
    ['ip', 'domain', 'instance', 'service', 'port', 'networkProject', 'networkVpc', 'networkSubnet'].forEach(field => {
      this.form.get(field)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.endpointChange.emit();
        });
    });

    this.form.get('networkProject')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadVpcNetworks();
      });

    this.form.get('networkVpc')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadSubnetworks();
      });
  }

  onDestinationEndpointTypeChange(value: string) {
    const option = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === value);
    
    if (option?.isCategory) {
      this.selectedDestinationCategory = value;
      this.form.patchValue({ 
        category: value,
        endpointType: ''
      });
    } else {
      this.selectedDestinationCategory = null;
      this.form.patchValue({ 
        category: '',
        endpointType: value
      });
      this.resetDestinationDetails();
      
      // Load resources for the selected endpoint type
      this.loadDestinationResources(value as EndpointType);
    }
    
    this.endpointChange.emit();
  }

  onDestinationCategorySelection(endpointType: string) {
    this.form.patchValue({ 
      endpointType: endpointType,
      category: this.selectedDestinationCategory
    });
    this.resetDestinationDetails();
    this.loadDestinationResources(endpointType as EndpointType);
    this.endpointChange.emit();
  }

  onResourceChange() {
    this.endpointChange.emit();
  }

  private resetDestinationDetails() {
    const currentProject = this.projectService.getCurrentProject();
    this.form.patchValue({
      ip: '',
      instance: '',
      domain: '',
      service: '',
      cluster: '',
      workload: '',
      networkProject: currentProject ? currentProject.id : '',
      networkVpc: '',
      networkSubnet: ''
    });
  }

  private loadDestinationResources(endpointType: EndpointType): void {
    if (!this.requiresResourceSelection(endpointType)) {
      this.destinationResourceOptions = [];
      return;
    }

    this.isLoadingDestinationResources = true;
    this.destinationResourceError = null;
    this.destinationResourceOptions = [];

    if (endpointType === 'gceInstance') {
      this.resourceLoaderService.loadVmInstances()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (resources: ResourceOption[]) => {
            console.log('Loaded destination resources:', resources);
            this.destinationResourceOptions = resources;
            this.isLoadingDestinationResources = false;
          },
          error: (error: any) => {
            console.error(`Error loading destination resources for ${endpointType}:`, error);
            this.destinationResourceError = `Failed to load ${endpointType} resources`;
            this.isLoadingDestinationResources = false;
          }
        });
    } else {
      this.resourceLoaderService.loadResources(endpointType)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (resources: ResourceOption[]) => {
            console.log('Loaded destination resources:', resources);
            this.destinationResourceOptions = resources;
            this.isLoadingDestinationResources = false;
          },
          error: (error: any) => {
            console.error(`Error loading destination resources for ${endpointType}:`, error);
            this.destinationResourceError = `Failed to load ${endpointType} resources`;
            this.isLoadingDestinationResources = false;
          }
        });
    }
  }

  private requiresResourceSelection(endpointType: EndpointType): boolean {
    const resourceTypes: EndpointType[] = [
      'gceInstance', 'gkeCluster', 'gkeWorkload', 'gkePod', 'gkeService',
      'cloudRun', 'cloudRunJobs', 'cloudFunctionV1', 'cloudRunFunction',
      'cloudSqlInstance', 'alloyDb', 'appEngine', 'cloudBuild'
    ];
    return resourceTypes.includes(endpointType);
  }

  private loadAvailableProjects() {
    this.projectService.loadProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.availableProjects = projects.map(project => ({
            value: project.id,
            displayName: `${project.name} (${project.id})`
          }));
        },
        error: (error) => {
          console.error('Error loading projects:', error);
        }
      });
  }

  private loadVpcNetworks() {
    const projectId = this.form.get('networkProject')?.value;
    if (!projectId) {
      this.availableVpcNetworks = [];
      return;
    }

    this.computeEngineService.getVpcNetworks()
      .pipe(takeUntil(this.destroy$))
      .subscribe(networks => {
        this.availableVpcNetworks = networks.map(network => ({
          value: network.name,
          displayName: network.name
        }));
      });
  }

  private loadSubnetworks() {
    const projectId = this.form.get('networkProject')?.value;
    const networkName = this.form.get('networkVpc')?.value;

    if (!projectId || !networkName) {
      this.availableSubnetworks = [];
      return;
    }

    // Assuming getSubnetworks can be called with a region.
    // This might need adjustment based on your service implementation.
    const region = 'us-central1'; // Or determine dynamically

    this.computeEngineService.getSubnetworks(region)
      .pipe(takeUntil(this.destroy$))
      .subscribe(subnetworks => {
        this.availableSubnetworks = subnetworks;
      });
  }

  // Helper methods for template
  getDestinationCategoryLabel(): string {
    if (!this.selectedDestinationCategory) return '';
    const option = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === this.selectedDestinationCategory);
    return option?.label?.replace('...', '') || '';
  }

  getCurrentDestinationEndpointType(): string {
    return this.form.get('endpointType')?.value || '';
  }

  getDestinationCategoryOptions(): EndpointOption[] {
    return this.selectedDestinationCategory ? this.destinationEndpointHierarchy.categories[this.selectedDestinationCategory] || [] : [];
  }

  isDestinationEndpointType(type: string): boolean {
    return this.getCurrentDestinationEndpointType() === type;
  }

  getProtocol(): string {
    // Protocol control lives on the root form, not within the destination group
    return (this.parentForm.form.get('protocol')?.value as string) || '';
  }
}
