import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, ControlContainer, FormGroupDirective } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
import { AuthService } from '../../../services/auth.service';
import { ComputeEngineService } from '../../../services/compute-engine.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';
import { NetworkConnectivityService } from '../../../services/network-connectivity.service';

@Component({
  selector: 'app-source-endpoint',
  template: `
    <div class="form-section" [formGroup]="form">
      <h3>Source</h3>

      <!-- Source endpoint type selector -->
      <div class="endpoint-selector">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Source endpoint</mat-label>
          <mat-select (selectionChange)="onSourceEndpointTypeChange($event.value)"
                     [value]="selectedSourceCategory || form.get('endpointType')?.value">
            <mat-option *ngFor="let option of sourceEndpointHierarchy.topLevel"
                       [value]="option.value"
                       [disabled]="option.label === '---'">
              <span [class.category-option]="option.isCategory">{{option.label}}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Category sub-menu -->
        <mat-form-field *ngIf="selectedSourceCategory" appearance="outline" class="full-width category-submenu">
          <mat-label>Select {{getSourceCategoryLabel()}}</mat-label>
          <mat-select (selectionChange)="onSourceCategorySelection($event.value)"
                     [value]="form.get('endpointType')?.value">
            <mat-option *ngFor="let option of getSourceCategoryOptions()"
                       [value]="option.value"
                       (click)="onSourceCategorySelection(option.value)">
              {{option.label}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Source endpoint details -->
      <div class="endpoint-details" *ngIf="getCurrentSourceEndpointType()">

        <!-- IP Address -->
        <div *ngIf="isSourceEndpointType('ipAddress')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Source IP address *</mat-label>
            <input matInput formControlName="ip" placeholder="Example: 192.0.2.1">
            <mat-error *ngIf="form.get('ip')?.hasError('required')">
              Source IP address is required
            </mat-error>
            <mat-error *ngIf="form.get('ip')?.hasError('pattern')">
              Please enter a valid IP address
            </mat-error>
          </mat-form-field>

          <!-- IP address type selection -->
          <div class="ip-type-section">
            <label class="ip-type-label">IP address type *</label>
            <p class="ip-type-hint">Please provide a hint about this IP's location to get a faster, more accurate analysis.</p>

            <mat-radio-group formControlName="ipType" class="ip-type-radio-group">
              <mat-radio-button value="gcp-vpc" class="ip-type-option">
                <div class="radio-content">
                  <div class="radio-title">Google Cloud VPC IP</div>
                  <div class="radio-description">An IP address within this project, a peered VPC, or a Shared VPC.</div>
                </div>
              </mat-radio-button>

              <mat-radio-button value="private-non-gcp" class="ip-type-option">
                <div class="radio-content">
                  <div class="radio-title">Non-Google Cloud Private IP</div>
                  <div class="radio-description">An IP in your on-premises network or another cloud, connected via VPN or Interconnect.</div>
                </div>
              </mat-radio-button>

              <mat-radio-button value="public" class="ip-type-option">
                <div class="radio-content">
                  <div class="radio-title">Public IP</div>
                  <div class="radio-description">An IP address reachable over the public internet.</div>
                </div>
              </mat-radio-button>

              <mat-radio-button value="auto-detect" class="ip-type-option">
                <div class="radio-content">
                  <div class="radio-title">Let the test determine</div>
                  <div class="radio-description">The test will analyze all possible paths. This may take longer.</div>
                </div>
              </mat-radio-button>
            </mat-radio-group>
          </div>

          <!-- Project and VPC selectors for GCP VPC -->
          <div *ngIf="form.get('ipType')?.value === 'gcp-vpc'">
            <mat-form-field appearance="outline" class="full-width" style="margin-top: 16px;">
              <mat-label>VPC Network Project</mat-label>
              <mat-select formControlName="project">
                <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                  {{project.displayName}}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>VPC Network *</mat-label>
              <mat-select formControlName="vpcNetwork">
                <mat-option *ngFor="let network of availableVpcNetworks" [value]="network.value">
                  {{network.displayName}}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Private IP connection configuration -->
          <div *ngIf="form.get('ipType')?.value === 'private-non-gcp'" class="connection-type-section">
            <label class="connection-type-label">Connection type *</label>

            <mat-radio-group formControlName="connectionType" class="connection-type-radio-group">
              <mat-radio-button value="vpn-tunnel" class="connection-type-option">
                <div class="radio-content">
                  <div class="radio-title">VPN Tunnel</div>
                </div>
              </mat-radio-button>

              <mat-radio-button value="interconnect" class="connection-type-option">
                <div class="radio-content">
                  <div class="radio-title">Interconnect Attachment</div>
                </div>
              </mat-radio-button>

              <mat-radio-button value="ncc-router" class="connection-type-option">
                <div class="radio-content">
                  <div class="radio-title">NCC Router Appliance</div>
                </div>
              </mat-radio-button>
            </mat-radio-group>

            <mat-form-field *ngIf="form.get('connectionType')?.value" appearance="outline" class="full-width" style="margin-top: 16px;">
              <mat-label>{{getSourceProjectLabel()}}</mat-label>
              <mat-select formControlName="project">
                <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                  {{project.displayName}}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field *ngIf="form.get('project')?.value && form.get('connectionType')?.value" appearance="outline" class="full-width" style="margin-top: 16px;">
              <mat-label>{{connectionResourceLabel}}</mat-label>
              <mat-select formControlName="connectionResource">
                <mat-option *ngFor="let resource of connectionResourceOptions" [value]="resource.value">
                  {{resource.displayName}}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- My IP Address -->
        <div *ngIf="isSourceEndpointType('myIpAddress')" class="info-message">
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

        <!-- Cloud Shell -->
        <div *ngIf="isSourceEndpointType('cloudShell')" class="info-message">
          <mat-icon>info</mat-icon>
          <span>The test will use <b>34.135.171.161</b> (your current public IP of Cloud Shell) as the source.</span>
        </div>

        <!-- Cloud Console SSH-in-browser -->
        <div *ngIf="isSourceEndpointType('cloudConsoleSsh')" class="info-message">
          <mat-icon>info</mat-icon>
          <span>We will analyze connectivity from your IP address via <b>Identity Aware Proxy</b> to particular VM of choice.</span>
        </div>

        <!-- VM Instance -->
        <div *ngIf="isSourceEndpointType('gceInstance')">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Source instance *</mat-label>
            <mat-select formControlName="instance" (selectionChange)="onResourceChange()">
              <mat-option *ngIf="isLoadingSourceResources" disabled>
                <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                Loading instances...
              </mat-option>
              <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                {{sourceResourceError}}
              </mat-option>
              <mat-option *ngFor="let instance of sourceResourceOptions" [value]="instance.value">
                <div class="resource-item">
                  <div class="resource-name">{{instance.displayName}}</div>
                  <div *ngIf="instance.description" class="resource-description">{{instance.description}}</div>
                </div>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('instance')?.hasError('required')">
              Source instance is required
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Other endpoint types can be added here -->
      </div>
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
export class SourceEndpointComponent implements OnInit, OnDestroy {
  @Output() endpointChange = new EventEmitter<any>();
  form!: FormGroup;

  sourceEndpointHierarchy: EndpointHierarchy;
  selectedSourceCategory: string | null = null;
  availableProjects: ProjectOption[] = [];
  availableVpcNetworks: VpcNetworkOption[] = [];
  connectionResourceLabel = 'Resource *';
  connectionResourceOptions: { value: string; displayName: string }[] = [];

  // User IP loading
  userIpAddress: string | null = null;
  isLoadingUserIp = false;

  // Resource loading
  sourceResourceOptions: ResourceOption[] = [];
  isLoadingSourceResources = false;
  sourceResourceError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private parentForm: FormGroupDirective,
    private endpointHierarchyService: EndpointHierarchyService,
    private resourceLoaderService: ResourceLoaderService,
    private projectService: ProjectService,
    private authService: AuthService,
    private computeEngineService: ComputeEngineService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private networkConnectivityService: NetworkConnectivityService
  ) {
    this.sourceEndpointHierarchy = this.endpointHierarchyService.getSourceEndpointHierarchy();
  }

  ngOnInit() {
    this.form = this.parentForm.form.get('source') as FormGroup;
    this.loadAvailableProjects();
    this.loadAvailableVpcNetworks();
    this.loadUserIpAddress();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions() {
    // Watch for source endpoint type changes
    this.form.get('endpointType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.endpointChange.emit();
      });

    // Watch for other relevant field changes
    ['ip', 'instance', 'service', 'cluster', 'workload'].forEach(field => {
      this.form.get(field)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.endpointChange.emit();
        });
    });

    this.form.get('ipType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(ipType => {
        const sourceEndpointType = this.form.get('endpointType')?.value;
        if (sourceEndpointType !== 'ipAddress') {
          return;
        }

        this.form.get('connectionType')?.clearValidators();
        this.form.get('connectionResource')?.clearValidators();
        this.form.get('project')?.clearValidators();
        this.form.get('vpcNetwork')?.clearValidators();

        const currentProject = this.projectService.getCurrentProject();

        if (ipType === 'private-non-gcp') {
          this.form.get('connectionType')?.setValidators([Validators.required]);
          this.form.patchValue({
            connectionType: '',
            connectionResource: '',
            project: '',
            vpcNetwork: ''
          }, { emitEvent: false });
        } else if (ipType === 'gcp-vpc') {
          this.form.get('project')?.setValidators([Validators.required]);
          this.form.get('vpcNetwork')?.setValidators([Validators.required]);
          this.form.patchValue({
            connectionType: 'vpn-tunnel',
            connectionResource: '',
            project: currentProject ? currentProject.id : ''
          }, { emitEvent: false });
        } else {
          this.form.patchValue({
            connectionType: 'vpn-tunnel',
            connectionResource: '',
            project: '',
            vpcNetwork: ''
          }, { emitEvent: false });
        }

        this.form.get('connectionType')?.updateValueAndValidity({ emitEvent: false });
        this.form.get('connectionResource')?.updateValueAndValidity({ emitEvent: false });
        this.form.get('project')?.updateValueAndValidity({ emitEvent: false });
        this.form.get('vpcNetwork')?.updateValueAndValidity({ emitEvent: false });
      });

    this.form.get('connectionType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(connectionType => {
        this.loadConnectionResources(connectionType);
      });

    this.form.get('project')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const connectionType = this.form.get('connectionType')?.value;
        if (connectionType) {
          this.loadConnectionResources(connectionType);
        }
      });
  }

  onSourceEndpointTypeChange(value: string) {
    const option = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === value);

    if (option?.isCategory) {
      this.selectedSourceCategory = value;
      this.form.patchValue({
        category: value,
        endpointType: ''
      });
    } else {
      this.selectedSourceCategory = null;
      this.form.patchValue({
        category: '',
        endpointType: value
      });
      this.resetSourceDetails();

      // Load resources for the selected endpoint type
      this.loadSourceResources(value as EndpointType);
    }

    this.endpointChange.emit();
  }

  onSourceCategorySelection(endpointType: string) {
    this.form.patchValue({
      endpointType: endpointType,
      category: this.selectedSourceCategory
    });
    this.resetSourceDetails();
    this.loadSourceResources(endpointType as EndpointType);
    this.endpointChange.emit();
  }

  private loadConnectionResources(connectionType: string) {
    const project = this.form.get('project')?.value;
    if (!project) {
      this.connectionResourceOptions = [];
      return;
    }

    // This is a simplified example. In a real application, you'd
    // also need to know the region for some of these resources.
    const region = 'us-central1'; // Or get from form/user

    switch (connectionType) {
      case 'vpn-tunnel':
        this.connectionResourceLabel = 'VPN Tunnel *';
        this.computeEngineService.getVpnTunnels(region)
          .pipe(takeUntil(this.destroy$))
          .subscribe(tunnels => {
            this.connectionResourceOptions = tunnels.map(tunnel => ({
              value: tunnel.name,
              displayName: tunnel.name
            }));
          });
        break;
      case 'interconnect':
        this.connectionResourceLabel = 'Interconnect Attachment *';
        this.computeEngineService.getInterconnectAttachments(region)
          .pipe(takeUntil(this.destroy$))
          .subscribe(attachments => {
            this.connectionResourceOptions = attachments.map(attachment => ({
              value: attachment.name,
              displayName: attachment.name
            }));
          });
        break;
      case 'ncc-router':
        this.connectionResourceLabel = 'NCC Router Appliance *';
        this.networkConnectivityService.getNccRouters()
          .pipe(takeUntil(this.destroy$))
          .subscribe(hubs => {
            this.connectionResourceOptions = hubs.map(hub => ({
              value: hub.name,
              displayName: hub.name
            }));
          });
        break;
      default:
        this.connectionResourceOptions = [];
    }
  }

  onResourceChange() {
    this.endpointChange.emit();
  }

  private resetSourceDetails() {
    const currentProject = this.projectService.getCurrentProject();
    this.form.patchValue({
      ip: '',
      instance: '',
      domain: '',
      service: '',
      cluster: '',
      workload: '',
      ipType: 'gcp-vpc',
      connectionType: '',
      connectionResource: '',
      project: currentProject ? currentProject.id : '',
      vpcNetwork: '',
      networkProject: currentProject ? currentProject.id : '',
      networkVpc: '',
      networkSubnet: ''
    });
  }

  private loadSourceResources(endpointType: EndpointType): void {
    if (!this.requiresResourceSelection(endpointType)) {
      this.sourceResourceOptions = [];
      return;
    }

    this.isLoadingSourceResources = true;
    this.sourceResourceError = null;
    this.sourceResourceOptions = [];

    this.resourceLoaderService.loadResources(endpointType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resources: ResourceOption[]) => {
          this.sourceResourceOptions = resources;
          this.isLoadingSourceResources = false;
        },
        error: (error: any) => {
          console.error(`Error loading source resources for ${endpointType}:`, error);
          this.sourceResourceError = `Failed to load ${endpointType} resources`;
          this.isLoadingSourceResources = false;
        }
      });
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

  private loadAvailableVpcNetworks() {
    this.computeEngineService.getVpcNetworks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (networks) => {
          this.availableVpcNetworks = networks.map(network => ({
            value: network.name,
            displayName: network.name
          }));
        },
        error: (error) => {
          console.error('Error loading VPC networks:', error);
        }
      });
  }

  loadUserIpAddress() {
    this.isLoadingUserIp = true;
    this.userIpAddress = null;

    this.http.get<{ip: string}>('https://api.ipify.org?format=json')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.userIpAddress = response.ip;
          this.isLoadingUserIp = false;
        },
        error: (error: any) => {
          console.error('Error loading user IP address:', error);
          this.userIpAddress = null;
          this.isLoadingUserIp = false;
        }
      });
  }

  // Helper methods for template
  getSourceCategoryLabel(): string {
    if (!this.selectedSourceCategory) return '';
    const option = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === this.selectedSourceCategory);
    return option?.label?.replace('...', '') || '';
  }

  getCurrentSourceEndpointType(): string {
    return this.form.get('endpointType')?.value || '';
  }

  getSourceCategoryOptions(): EndpointOption[] {
    return this.selectedSourceCategory ? this.sourceEndpointHierarchy.categories[this.selectedSourceCategory] || [] : [];
  }

  isSourceEndpointType(type: string): boolean {
    return this.getCurrentSourceEndpointType() === type;
  }

  getSourceProjectLabel(): string {
    const connectionType = this.form.get('connectionType')?.value;
    switch (connectionType) {
      case 'vpn-tunnel': return 'VPN Tunnel Project';
      case 'interconnect': return 'Interconnect Attachment Project';
      case 'ncc-router': return 'NCC Router Appliance Project';
      default: return 'VPC Network Project';
    }
  }
}