import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CloudNatService } from '../../services/cloud-nat.service';
import { ProjectService, Project } from '../../services/project.service';
import { VpcService } from '../../services/vpc.service';

@Component({
  selector: 'app-create-cloud-nat',
  template: `
    <div class="create-cloud-nat-container">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <button mat-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            Cloud NAT
          </button>
          <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
          <span class="current-page">Create Cloud NAT gateway</span>
        </div>
      </div>

      <!-- Description -->
      <div class="description-section">
        <p class="description">
          Cloud NAT lets your VMs and container pods create outbound connections to the 
          internet or to other Virtual Private Cloud (VPC) networks.
        </p>
        <p class="description">
          Cloud NAT uses Cloud NAT gateway to manage those connections. Cloud NAT 
          gateway is region and VPC network specific. If you have VM instances in multiple 
          regions, you'll need to create a Cloud NAT gateway for each region. 
          <a href="#" class="learn-more">Learn more</a>
        </p>
      </div>

      <!-- Form -->
      <form [formGroup]="createForm" (ngSubmit)="onSubmit()" class="create-form">
        
        <!-- Gateway Name -->
        <mat-card class="form-section">
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Gateway name *</mat-label>
              <input matInput formControlName="gatewayName" placeholder="Enter gateway name">
              <mat-icon matSuffix class="help-icon" matTooltip="Lowercase letters, numbers, hyphens allowed">help_outline</mat-icon>
              <mat-hint>Lowercase letters, numbers, hyphens allowed</mat-hint>
              <mat-error *ngIf="createForm.get('gatewayName')?.hasError('required')">Gateway name is required</mat-error>
              <mat-error *ngIf="createForm.get('gatewayName')?.hasError('pattern')">Invalid gateway name format</mat-error>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- NAT Type -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>NAT type</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-radio-group formControlName="natType" class="nat-type-group">
              <mat-radio-button value="Public" class="nat-type-option">
                <div class="radio-content">
                  <div class="radio-title">Public</div>
                </div>
              </mat-radio-button>
              <mat-radio-button value="Private" class="nat-type-option">
                <div class="radio-content">
                  <div class="radio-title">Private</div>
                </div>
              </mat-radio-button>
            </mat-radio-group>
          </mat-card-content>
        </mat-card>

        <!-- Select Cloud Router -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              Select Cloud Router
              <mat-icon class="help-icon" matTooltip="Select the network, region, and Cloud Router for this NAT gateway">help_outline</mat-icon>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            
            <!-- Network -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Network *</mat-label>
              <mat-select formControlName="network" (selectionChange)="onNetworkChange()">
                <mat-option *ngFor="let network of networks" [value]="network.name">
                  {{ network.name }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Select VPC network">help_outline</mat-icon>
            </mat-form-field>

            <!-- Region -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Region</mat-label>
              <mat-select formControlName="region" (selectionChange)="onRegionChange()">
                <mat-option *ngFor="let region of regions" [value]="region">
                  {{ region }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Select region for the NAT gateway">help_outline</mat-icon>
            </mat-form-field>

            <!-- Cloud Router -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cloud Router</mat-label>
              <mat-select formControlName="cloudRouter">
                <mat-option *ngFor="let router of cloudRouters" [value]="router">
                  {{ router }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Select Cloud Router">help_outline</mat-icon>
            </mat-form-field>

          </mat-card-content>
        </mat-card>

        <!-- Cloud NAT Mapping -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              Cloud NAT mapping
              <mat-icon class="help-icon" matTooltip="Configure how Cloud NAT maps source endpoints to NAT IP addresses">help_outline</mat-icon>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            
            <!-- Source endpoint type -->
            <div class="form-group">
              <label class="form-label">
                Source endpoint type
                <mat-icon class="help-icon" matTooltip="Select which types of endpoints can use this NAT gateway">help_outline</mat-icon>
              </label>
              <mat-radio-group formControlName="sourceEndpointType" class="endpoint-type-group">
                <mat-radio-button value="VM_INSTANCES_GKE_NODES_SERVERLESS" class="endpoint-option">
                  <div class="radio-content">
                    <div class="radio-title">VM instances, GKE nodes, Serverless</div>
                    <mat-icon class="help-icon" matTooltip="Allow VM instances, GKE nodes, and serverless workloads to use NAT">help_outline</mat-icon>
                  </div>
                </mat-radio-button>
                <mat-radio-button value="MANAGED_PROXY_LOAD_BALANCERS" class="endpoint-option">
                  <div class="radio-content">
                    <div class="radio-title">Managed proxy load balancers</div>
                    <mat-icon class="help-icon" matTooltip="Allow managed proxy load balancers to use NAT">help_outline</mat-icon>
                  </div>
                </mat-radio-button>
              </mat-radio-group>
            </div>

            <!-- Source IP version -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Source IP version</mat-label>
              <mat-select formControlName="sourceIpVersion">
                <mat-option value="IPV4">IPv4</mat-option>
                <mat-option value="IPV6">IPv6</mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Select IP version for source endpoints">help_outline</mat-icon>
            </mat-form-field>

          </mat-card-content>
        </mat-card>

        <!-- IPv4 subnet ranges -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>IPv4 subnet ranges</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            
            <!-- Source subnets -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Source subnets</mat-label>
              <mat-select formControlName="sourceSubnets" multiple>
                <mat-option *ngFor="let subnet of subnets" [value]="subnet">
                  {{ subnet }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Select which subnets to map to the Cloud NAT gateway">help_outline</mat-icon>
            </mat-form-field>
            
            <div class="subnet-description">
              <p class="description-text">
                Select which subnets to map to the Cloud NAT gateway. Primary IP addresses are 
                used by VM instances and secondary IP addresses are used by container pods.
                <a href="#" class="learn-more">Learn more</a>
              </p>
            </div>

            <!-- Cloud NAT IP addresses -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cloud NAT IP addresses</mat-label>
              <mat-select formControlName="natIpAddresses">
                <mat-option value="AUTOMATIC">Automatic (recommended)</mat-option>
                <mat-option value="MANUAL">Manual</mat-option>
              </mat-select>
              <mat-icon matSuffix class="help-icon" matTooltip="Choose how to allocate NAT IP addresses">help_outline</mat-icon>
            </mat-form-field>

          </mat-card-content>
        </mat-card>

        <!-- Network Service Tier -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              Network Service Tier
              <mat-icon class="help-icon" matTooltip="Choose the network service tier for your NAT gateway">help_outline</mat-icon>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-radio-group formControlName="networkServiceTier" class="service-tier-group">
              <mat-radio-button value="PREMIUM" class="service-tier-option">
                <div class="radio-content">
                  <div class="radio-title">Premium (Current project-level tier, change)</div>
                  <mat-icon class="help-icon" matTooltip="Premium tier offers the best performance">help_outline</mat-icon>
                </div>
              </mat-radio-button>
              <mat-radio-button value="STANDARD" class="service-tier-option">
                <div class="radio-content">
                  <div class="radio-title">Standard</div>
                  <div class="radio-subtitle">200 GB / mo free in every region</div>
                  <mat-icon class="help-icon" matTooltip="Standard tier offers cost-effective networking">help_outline</mat-icon>
                </div>
              </mat-radio-button>
            </mat-radio-group>
          </mat-card-content>
        </mat-card>

        <!-- Advanced configurations -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>
              <button type="button" mat-button class="expand-button" (click)="toggleAdvanced()">
                <mat-icon>{{ showAdvanced ? 'expand_less' : 'expand_more' }}</mat-icon>
                Advanced configurations
              </button>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content *ngIf="showAdvanced">
            
            <!-- Enable Dynamic Port Allocation -->
            <div class="form-group">
              <mat-checkbox formControlName="enableDynamicPortAllocation">
                Enable Dynamic Port Allocation
              </mat-checkbox>
              <p class="checkbox-description">
                Allows automatic port allocation scaling based on demand
              </p>
            </div>

            <!-- Minimum ports per VM instance -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Minimum ports per VM instance</mat-label>
              <input matInput type="number" formControlName="minPortsPerVm" min="64" max="65536">
              <mat-hint>Default: 64 ports</mat-hint>
            </mat-form-field>

            <!-- Enable Endpoint-Independent Mapping -->
            <div class="form-group">
              <mat-checkbox formControlName="enableEndpointIndependentMapping">
                Enable Endpoint-Independent Mapping
              </mat-checkbox>
              <p class="checkbox-description">
                Provides consistent mapping for improved connectivity
              </p>
            </div>

            <!-- Timeout configurations -->
            <div class="timeout-section">
              <h4>Timeout for protocol connections</h4>
              
              <mat-form-field appearance="outline" class="timeout-field">
                <mat-label>UDP (seconds)</mat-label>
                <input matInput type="number" formControlName="udpIdleTimeoutSec" min="30" max="7200">
              </mat-form-field>

              <mat-form-field appearance="outline" class="timeout-field">
                <mat-label>TCP established (seconds)</mat-label>
                <input matInput type="number" formControlName="tcpEstablishedIdleTimeoutSec" min="1200" max="7200">
              </mat-form-field>

              <mat-form-field appearance="outline" class="timeout-field">
                <mat-label>TCP transitory (seconds)</mat-label>
                <input matInput type="number" formControlName="tcpTransitoryIdleTimeoutSec" min="30" max="1200">
              </mat-form-field>

              <mat-form-field appearance="outline" class="timeout-field">
                <mat-label>ICMP (seconds)</mat-label>
                <input matInput type="number" formControlName="icmpIdleTimeoutSec" min="30" max="7200">
              </mat-form-field>

              <mat-form-field appearance="outline" class="timeout-field">
                <mat-label>TCP time wait (seconds)</mat-label>
                <input matInput type="number" formControlName="tcpTimeWaitTimeoutSec" min="120" max="1200">
              </mat-form-field>
            </div>

            <!-- Logging -->
            <div class="form-group">
              <mat-checkbox formControlName="enableLogging">
                Enable logging
              </mat-checkbox>
              <p class="checkbox-description">
                Log translation and error events
              </p>
            </div>

          </mat-card-content>
        </mat-card>

        <!-- Action buttons -->
        <div class="action-buttons">
          <button mat-raised-button color="primary" type="submit" [disabled]="!createForm.valid || isCreating">
            <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
            <mat-icon *ngIf="!isCreating">add</mat-icon>
            {{ isCreating ? 'Creating...' : 'Create' }}
          </button>
          <button mat-stroked-button type="button" (click)="goBack()">
            Cancel
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .create-cloud-nat-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      background: var(--background-color);
      color: var(--text-color);
      min-height: calc(100vh - 64px);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--divider-color);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .back-button {
      color: #1976d2;
      font-weight: 500;
    }

    .back-button mat-icon {
      margin-right: 4px;
    }

    .breadcrumb-separator {
      color: var(--text-secondary-color);
      font-size: 16px;
    }

    .current-page {
      font-weight: 500;
      color: var(--text-color);
      font-size: 24px;
    }

    .description-section {
      margin-bottom: 32px;
    }

    .description {
      color: var(--text-secondary-color);
      line-height: 1.5;
      margin: 0 0 16px 0;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .form-section mat-card-header {
      padding-bottom: 8px;
    }

    .form-section mat-card-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .help-icon {
      color: var(--text-secondary-color);
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .nat-type-group,
    .endpoint-type-group,
    .service-tier-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .nat-type-option,
    .endpoint-option,
    .service-tier-option {
      margin: 0;
    }

    .radio-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .radio-title {
      font-weight: 500;
      color: var(--text-color);
    }

    .radio-subtitle {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin-top: 4px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--text-color);
      margin-bottom: 16px;
    }

    .subnet-description {
      margin: 16px 0;
      padding: 16px;
      background: var(--background-color);
      border-radius: 4px;
      border-left: 4px solid #1976d2;
    }

    .description-text {
      font-size: 14px;
      color: var(--text-secondary-color);
      margin: 0;
      line-height: 1.5;
    }

    .expand-button {
      padding: 0;
      min-width: auto;
      color: #1976d2;
      font-weight: 500;
    }

    .expand-button mat-icon {
      margin-right: 8px;
    }

    .checkbox-description {
      font-size: 14px;
      color: var(--text-secondary-color);
      margin: 8px 0 0 32px;
      line-height: 1.4;
    }

    .timeout-section {
      margin-top: 24px;
    }

    .timeout-section h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .timeout-field {
      width: 200px;
      margin-right: 16px;
      margin-bottom: 16px;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: flex-start;
      padding: 24px 0;
      border-top: 1px solid var(--divider-color);
      margin-top: 24px;
    }

    .action-buttons button {
      height: 40px;
      min-width: 120px;
    }

    /* Dark theme overrides */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--surface-color) !important;
        }

        .mat-mdc-form-field-input-control {
          color: var(--text-color) !important;
        }

        .mat-mdc-form-field-label {
          color: var(--text-secondary-color) !important;
        }

        .mat-mdc-form-field-outline {
          color: var(--border-color) !important;
        }

        .mat-mdc-form-field-outline-thick {
          color: #1976d2 !important;
        }
      }

      .mat-mdc-select-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-option {
        color: var(--text-color) !important;
      }

      .mat-mdc-radio-button {
        .mat-mdc-radio-outer-circle {
          border-color: var(--border-color) !important;
        }
      }

      .mat-mdc-checkbox {
        .mat-mdc-checkbox-frame {
          border-color: var(--border-color) !important;
        }
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button {
        border-color: var(--border-color) !important;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .create-cloud-nat-container {
        padding: 12px;
        max-width: 100%;
      }

      .timeout-field {
        width: 100%;
        margin-right: 0;
      }

      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }

      .action-buttons button {
        width: 100%;
      }
    }
  `]
})
export class CreateCloudNatComponent implements OnInit {
  createForm: FormGroup;
  isCreating = false;
  showAdvanced = false;
  projectId: string | null = null;

  // Data for dropdowns
  networks: any[] = [];
  regions: string[] = [
    'us-central1', 'us-east1', 'us-west1', 'europe-west1', 
    'europe-west2', 'asia-southeast1', 'asia-northeast1'
  ];
  cloudRouters: string[] = [];
  subnets: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private cloudNatService: CloudNatService,
    private projectService: ProjectService,
    private vpcService: VpcService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.createForm = this.fb.group({
      gatewayName: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      natType: ['Public', Validators.required],
      network: ['', Validators.required],
      region: ['', Validators.required],
      cloudRouter: ['', Validators.required],
      sourceEndpointType: ['VM_INSTANCES_GKE_NODES_SERVERLESS', Validators.required],
      sourceIpVersion: ['IPV4', Validators.required],
      sourceSubnets: [[]],
      natIpAddresses: ['AUTOMATIC', Validators.required],
      networkServiceTier: ['PREMIUM', Validators.required],
      enableDynamicPortAllocation: [true],
      minPortsPerVm: [64, [Validators.min(64), Validators.max(65536)]],
      enableEndpointIndependentMapping: [false],
      udpIdleTimeoutSec: [30, [Validators.min(30), Validators.max(7200)]],
      tcpEstablishedIdleTimeoutSec: [1200, [Validators.min(1200), Validators.max(7200)]],
      tcpTransitoryIdleTimeoutSec: [30, [Validators.min(30), Validators.max(1200)]],
      icmpIdleTimeoutSec: [30, [Validators.min(30), Validators.max(7200)]],
      tcpTimeWaitTimeoutSec: [120, [Validators.min(120), Validators.max(1200)]],
      enableLogging: [false]
    });
  }

  ngOnInit() {
    // Subscribe to project changes
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadNetworks();
    });

    // Load initial data
    this.loadNetworks();
    this.loadCloudRouters();
  }

  loadNetworks() {
    if (!this.projectId) return;

    this.vpcService.getVpcNetworks(this.projectId).subscribe({
      next: (networks: any[]) => {
        this.networks = networks;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading networks:', error);
      }
    });
  }

  loadCloudRouters() {
    // Mock cloud routers data
    this.cloudRouters = [
      'default-router',
      'shopping-cr',
      'shopping-eu-cr',
      'custom-router-1'
    ];
  }

  onNetworkChange() {
    const selectedNetwork = this.createForm.get('network')?.value;
    // Load subnets for selected network
    this.loadSubnets(selectedNetwork);
  }

  onRegionChange() {
    // Update available cloud routers based on region
    this.loadCloudRouters();
  }

  loadSubnets(networkName: string) {
    if (!networkName) return;
    
    // Mock subnets data
    this.subnets = [
      `${networkName}-subnet-1`,
      `${networkName}-subnet-2`,
      `${networkName}-default`
    ];
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  }

  onSubmit() {
    if (this.createForm.valid) {
      this.isCreating = true;
      
      const formData = this.createForm.value;
      
      const natGatewayRequest = {
        name: formData.gatewayName,
        router: formData.cloudRouter,
        region: formData.region,
        network: formData.network,
        natType: formData.natType,
        natIpAllocateOption: formData.natIpAddresses,
        sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
        enableDynamicPortAllocation: formData.enableDynamicPortAllocation,
        minPortsPerVm: formData.minPortsPerVm,
        maxPortsPerVm: 65536,
        enableEndpointIndependentMapping: formData.enableEndpointIndependentMapping,
        logConfig: {
          enable: formData.enableLogging,
          filter: formData.enableLogging ? 'TRANSLATION_AND_ERRORS' : 'NONE'
        }
      };

      this.cloudNatService.createNatGateway(this.projectId || 'mock-project', formData.region, natGatewayRequest).subscribe({
        next: (response: any) => {
          console.log('Cloud NAT gateway created successfully:', response);
          this.isCreating = false;
          this.snackBar.open('Cloud NAT gateway created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/cloud-nat']);
        },
        error: (error: any) => {
          console.error('Error creating Cloud NAT gateway:', error);
          this.isCreating = false;
          this.snackBar.open('Error creating Cloud NAT gateway', 'Close', { duration: 5000 });
        }
      });
    } else {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
    }
  }

  goBack() {
    this.router.navigate(['/cloud-nat']);
  }
} 