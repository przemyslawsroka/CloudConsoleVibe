import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { VpcService } from '../../services/vpc.service';
import { ProjectService, Project } from '../../services/project.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-create-vpc-network',
  template: `
    <div class="create-vpc-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-navigation">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-item">VPC Networks</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="breadcrumb-item active">Create VPC Network</span>
          </div>
        </div>
        <h1>Create a VPC Network</h1>
        <p class="page-description">
          A Virtual Private Cloud (VPC) network provides networking functionality to your cloud resources. 
          It's a global resource that consists of regional subnetworks (subnets) and connects to other Google Cloud services.
        </p>
      </div>

      <!-- Main Form -->
      <div class="form-container">
        <form [formGroup]="vpcForm" (ngSubmit)="onSubmit()">
          
          <!-- Step 1: Basic Information -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">1</div>
                <div class="step-content">
                  <mat-card-title>Basic Information</mat-card-title>
                  <mat-card-subtitle>Give your VPC network a name and description</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="form-fields">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name *</mat-label>
                  <input matInput formControlName="name" placeholder="my-vpc-network">
                  <mat-icon matSuffix matTooltip="Network names must be lowercase, use hyphens instead of spaces">info</mat-icon>
                  <mat-hint>Choose a descriptive name (e.g., production-vpc, development-vpc)</mat-hint>
                  <mat-error *ngIf="vpcForm.get('name')?.hasError('required')">Network name is required</mat-error>
                  <mat-error *ngIf="vpcForm.get('name')?.hasError('pattern')">Name must be lowercase letters, numbers, and hyphens only</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3" 
                    placeholder="Describe the purpose of this VPC network"></textarea>
                  <mat-hint>Optional: Help your team understand what this network is for</mat-hint>
                </mat-form-field>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">lightbulb</mat-icon>
                <div class="concept-text">
                  <h4>What is a VPC Network?</h4>
                  <p>Think of a VPC network like your own private section of the internet in the cloud. 
                     It allows your resources to communicate securely with each other and provides 
                     isolation from other customers' resources.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 2: Subnet Creation Mode -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">2</div>
                <div class="step-content">
                  <mat-card-title>Subnet Creation Mode</mat-card-title>
                  <mat-card-subtitle>Choose how subnets will be created in your VPC</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <mat-radio-group formControlName="subnetMode" class="subnet-mode-group">
                <mat-radio-button value="automatic" class="subnet-mode-option">
                  <div class="radio-content">
                    <div class="radio-header">
                      <mat-icon class="mode-icon">auto_awesome</mat-icon>
                      <strong>Automatic</strong>
                      <mat-chip class="recommended-chip">Recommended for beginners</mat-chip>
                    </div>
                    <div class="radio-description">
                      Google automatically creates one subnet in each region with predefined IP ranges.
                      This is the easiest option and works well for most use cases.
                    </div>
                    <div class="radio-benefits">
                      <mat-icon class="benefit-icon">check_circle</mat-icon>
                      <span>No IP planning required</span>
                    </div>
                  </div>
                </mat-radio-button>

                <mat-radio-button value="custom" class="subnet-mode-option">
                  <div class="radio-content">
                    <div class="radio-header">
                      <mat-icon class="mode-icon">tune</mat-icon>
                      <strong>Custom</strong>
                      <mat-chip class="advanced-chip">Advanced</mat-chip>
                    </div>
                    <div class="radio-description">
                      You manually create subnets in specific regions with custom IP ranges.
                      Choose this for more control over network topology and IP addressing.
                    </div>
                    <div class="radio-benefits">
                      <mat-icon class="benefit-icon">build</mat-icon>
                      <span>Full control over subnets and IP ranges</span>
                    </div>
                  </div>
                </mat-radio-button>
              </mat-radio-group>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">map</mat-icon>
                <div class="concept-text">
                  <h4>Understanding Subnets</h4>
                  <p>Subnets are regional networks within your VPC. They define IP address ranges for your resources. 
                     Each subnet exists in a single region but can span multiple zones within that region.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 3: Custom Subnets (only if custom mode) -->
          <mat-card class="form-step" *ngIf="vpcForm.get('subnetMode')?.value === 'custom'">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">3</div>
                <div class="step-content">
                  <mat-card-title>Create Subnets</mat-card-title>
                  <mat-card-subtitle>Define your network topology with custom subnets</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="subnets-section">
                <div formArrayName="subnets">
                  <div *ngFor="let subnet of subnets.controls; let i = index" 
                       [formGroupName]="i" class="subnet-card">
                    <div class="subnet-header">
                      <h4>Subnet {{ i + 1 }}</h4>
                      <button mat-icon-button color="warn" 
                              (click)="removeSubnet(i)" 
                              type="button"
                              *ngIf="subnets.length > 1">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                    
                    <div class="subnet-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Subnet name *</mat-label>
                        <input matInput formControlName="name" placeholder="subnet-{{ i + 1 }}">
                        <mat-error *ngIf="subnet.get('name')?.hasError('required')">Subnet name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Region *</mat-label>
                        <mat-select formControlName="region">
                          <mat-option *ngFor="let region of availableRegions" [value]="region.name">
                            {{ region.description }} ({{ region.name }})
                          </mat-option>
                        </mat-select>
                        <mat-error *ngIf="subnet.get('region')?.hasError('required')">Region is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>IP address range (CIDR) *</mat-label>
                        <input matInput formControlName="ipRange" placeholder="10.0.{{ i }}.0/24">
                        <mat-icon matSuffix matTooltip="CIDR notation defines the IP range. /24 gives you 256 IP addresses">info</mat-icon>
                        <mat-hint>Example: 10.0.{{ i }}.0/24 (provides 256 IP addresses)</mat-hint>
                        <mat-error *ngIf="subnet.get('ipRange')?.hasError('required')">IP range is required</mat-error>
                        <mat-error *ngIf="subnet.get('ipRange')?.hasError('pattern')">Invalid CIDR format</mat-error>
                      </mat-form-field>
                    </div>

                    <div class="subnet-advanced" *ngIf="showAdvancedSubnetOptions">
                      <h5>Advanced Options</h5>
                      <div class="advanced-options">
                        <mat-slide-toggle formControlName="privateGoogleAccess">
                          Private Google Access
                          <mat-icon matTooltip="Allows VMs without external IPs to reach Google APIs">info</mat-icon>
                        </mat-slide-toggle>
                        
                        <mat-slide-toggle formControlName="flowLogs">
                          Enable Flow Logs
                          <mat-icon matTooltip="Records network flows for monitoring and troubleshooting">info</mat-icon>
                        </mat-slide-toggle>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="subnet-actions">
                  <button mat-raised-button color="primary" 
                          (click)="addSubnet()" 
                          type="button"
                          class="add-subnet-btn">
                    <mat-icon>add</mat-icon>
                    Add Another Subnet
                  </button>
                  
                  <button mat-button 
                          (click)="showAdvancedSubnetOptions = !showAdvancedSubnetOptions" 
                          type="button">
                    <mat-icon>{{ showAdvancedSubnetOptions ? 'expand_less' : 'expand_more' }}</mat-icon>
                    {{ showAdvancedSubnetOptions ? 'Hide' : 'Show' }} Advanced Options
                  </button>
                </div>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">device_hub</mat-icon>
                <div class="concept-text">
                  <h4>Planning IP Ranges</h4>
                  <p>Use private IP ranges like 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16. 
                     Avoid overlapping ranges if you plan to connect networks later. 
                     The /24 suffix gives you 256 IP addresses (254 usable).</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 4: Firewall Rules -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">{{ vpcForm.get('subnetMode')?.value === 'custom' ? '4' : '3' }}</div>
                <div class="step-content">
                  <mat-card-title>Firewall Rules</mat-card-title>
                  <mat-card-subtitle>Control traffic to and from your VPC network</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="firewall-section">
                <div class="firewall-presets">
                  <h4>Quick Setup - Common Firewall Rules</h4>
                  <p>These rules allow common types of traffic. You can modify them later.</p>
                  
                  <div class="firewall-options">
                    <mat-checkbox formControlName="allowHttp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow HTTP traffic (port 80)</strong>
                        <div class="rule-description">Enables web traffic from the internet</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowHttps" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow HTTPS traffic (port 443)</strong>
                        <div class="rule-description">Enables secure web traffic from the internet</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowSsh" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow SSH traffic (port 22)</strong>
                        <div class="rule-description">Enables remote terminal access to VMs</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowRdp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow RDP traffic (port 3389)</strong>
                        <div class="rule-description">Enables remote desktop access to Windows VMs</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowIcmp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow ICMP (ping)</strong>
                        <div class="rule-description">Enables ping for network troubleshooting</div>
                      </div>
                    </mat-checkbox>
                  </div>
                </div>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">security</mat-icon>
                <div class="concept-text">
                  <h4>Understanding Firewall Rules</h4>
                  <p>Firewall rules control which network traffic is allowed to reach your resources. 
                     By default, incoming traffic is blocked and outgoing traffic is allowed. 
                     You can always add more specific rules after creating the VPC.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 5: Advanced Configuration -->
          <mat-card class="form-step" *ngIf="showAdvancedOptions">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">{{ vpcForm.get('subnetMode')?.value === 'custom' ? '5' : '4' }}</div>
                <div class="step-content">
                  <mat-card-title>Advanced Configuration</mat-card-title>
                  <mat-card-subtitle>Optional settings for specialized use cases</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <!-- Dynamic Routing -->
              <div class="form-section">
                <h4>Dynamic Routing</h4>
                <mat-radio-group formControlName="routingMode" class="routing-mode-group">
                  <mat-radio-button value="REGIONAL">
                    <div class="radio-content-simple">
                      <strong>Regional</strong>
                      <div class="description">Routes learned by Cloud Router only apply to the same region</div>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="GLOBAL">
                    <div class="radio-content-simple">
                      <strong>Global</strong>
                      <div class="description">Routes learned by Cloud Router apply to all regions</div>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <!-- DNS Configuration -->
              <div class="form-section">
                <h4>DNS Configuration</h4>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>DNS Server Policy</mat-label>
                  <mat-select formControlName="dnsPolicy">
                    <mat-option value="DEFAULT">Default (Google DNS)</mat-option>
                    <mat-option value="ALTERNATIVE">Alternative DNS</mat-option>
                  </mat-select>
                  <mat-hint>Most users should keep the default setting</mat-hint>
                </mat-form-field>
              </div>

              <!-- Flow Logs -->
              <div class="form-section">
                <h4>Network Monitoring</h4>
                <mat-slide-toggle formControlName="enableFlowLogs">
                  Enable VPC Flow Logs by default
                  <mat-icon matTooltip="Records network flows for monitoring, troubleshooting, and security analysis">info</mat-icon>
                </mat-slide-toggle>
                <p class="toggle-description">Captures network flow data for analysis and monitoring</p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Actions -->
          <div class="form-actions">
            <div class="action-buttons">
              <button mat-button type="button" (click)="goBack()" class="cancel-btn">
                Cancel
              </button>
              <button mat-button type="button" 
                      (click)="showAdvancedOptions = !showAdvancedOptions"
                      class="advanced-btn">
                <mat-icon>{{ showAdvancedOptions ? 'expand_less' : 'expand_more' }}</mat-icon>
                {{ showAdvancedOptions ? 'Hide' : 'Show' }} Advanced Options
              </button>
              <button mat-raised-button color="primary" 
                      type="submit" 
                      [disabled]="!vpcForm.valid || isCreating"
                      class="create-btn">
                <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
                <mat-icon *ngIf="!isCreating">add</mat-icon>
                {{ isCreating ? 'Creating...' : 'Create VPC Network' }}
              </button>
            </div>
            
            <div class="cost-estimate" *ngIf="!isCreating">
              <mat-icon class="cost-icon">info</mat-icon>
              <div class="cost-text">
                <strong>Estimated monthly cost: Free</strong>
                <p>VPC networks are free. You only pay for the resources you deploy within them.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-vpc-container {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 0;
    }

    .page-header {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      padding: 32px 40px;
    }

    .header-navigation {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .back-button {
      color: white;
      margin-right: 12px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      font-size: 14px;
      opacity: 0.9;
    }

    .breadcrumb-item {
      margin: 0 4px;
    }

    .breadcrumb-item.active {
      font-weight: 500;
    }

    .page-header h1 {
      font-size: 2.5rem;
      font-weight: 300;
      margin: 16px 0 8px 0;
    }

    .page-description {
      font-size: 1.1rem;
      opacity: 0.9;
      max-width: 800px;
      line-height: 1.5;
      margin: 0;
    }

    .form-container {
      max-width: 900px;
      margin: -20px auto 40px;
      padding: 0 20px;
    }

    .form-step {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }

    .step-header {
      display: flex;
      align-items: center;
    }

    .step-number {
      background: #1976d2;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 16px;
      font-size: 18px;
    }

    .step-content {
      flex: 1;
    }

    .form-fields {
      display: grid;
      gap: 20px;
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    .concept-explanation {
      background: #e8f5e8;
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      margin-top: 24px;
    }

    .concept-icon {
      color: #4caf50;
      margin-right: 12px;
      margin-top: 2px;
    }

    .concept-text h4 {
      margin: 0 0 8px 0;
      color: #2e7d32;
    }

    .concept-text p {
      margin: 0;
      color: #2e7d32;
      line-height: 1.5;
    }

    /* Subnet Mode Styles */
    .subnet-mode-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .subnet-mode-option {
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      margin: 0;
      transition: all 0.3s ease;
    }

    .subnet-mode-option:hover {
      border-color: #1976d2;
      background: #f8f9ff;
    }

    .subnet-mode-option.mat-radio-checked {
      border-color: #1976d2;
      background: #f8f9ff;
    }

    .radio-content {
      margin-left: 8px;
    }

    .radio-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 8px;
    }

    .mode-icon {
      color: #1976d2;
    }

    .recommended-chip {
      background: #4caf50;
      color: white;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .advanced-chip {
      background: #ff9800;
      color: white;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .radio-description {
      color: #666;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .radio-benefits {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .benefit-icon {
      color: #4caf50;
      font-size: 16px;
    }

    /* Custom Subnets Styles */
    .subnet-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      background: white;
    }

    .subnet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .subnet-header h4 {
      margin: 0;
      color: #1976d2;
    }

    .subnet-fields {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .subnet-advanced {
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
    }

    .subnet-advanced h5 {
      margin: 0 0 12px 0;
      color: #666;
    }

    .advanced-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .subnet-actions {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-top: 20px;
    }

    .add-subnet-btn {
      background: #4caf50;
      color: white;
    }

    /* Firewall Rules Styles */
    .firewall-section h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .firewall-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .firewall-rule {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
    }

    .rule-content strong {
      display: block;
      margin-bottom: 4px;
    }

    .rule-description {
      color: #666;
      font-size: 14px;
    }

    /* Advanced Configuration Styles */
    .form-section {
      margin-bottom: 24px;
    }

    .form-section h4 {
      margin: 0 0 12px 0;
      color: #1976d2;
    }

    .routing-mode-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-content-simple {
      margin-left: 8px;
    }

    .radio-content-simple .description {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
    }

    .toggle-description {
      color: #666;
      font-size: 14px;
      margin: 8px 0 0 36px;
    }

    /* Form Actions */
    .form-actions {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-top: 24px;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 20px;
    }

    .cancel-btn {
      color: #666;
    }

    .advanced-btn {
      color: #1976d2;
    }

    .create-btn {
      background: #1976d2;
      color: white;
      padding: 12px 32px;
    }

    .create-btn:disabled {
      background: #ccc;
    }

    .cost-estimate {
      display: flex;
      align-items: flex-start;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
    }

    .cost-icon {
      color: #1976d2;
      margin-right: 12px;
      margin-top: 2px;
    }

    .cost-text strong {
      display: block;
      margin-bottom: 4px;
      color: #1976d2;
    }

    .cost-text p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .page-header {
        padding: 20px;
      }

      .page-header h1 {
        font-size: 2rem;
      }

      .form-container {
        margin: -10px auto 20px;
        padding: 0 12px;
      }

      .subnet-fields {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }

      .subnet-mode-group {
        gap: 12px;
      }

      .subnet-mode-option {
        padding: 16px;
      }
    }
  `]
})
export class CreateVpcNetworkComponent implements OnInit {
  vpcForm: FormGroup;
  showAdvancedOptions = false;
  showAdvancedSubnetOptions = false;
  isCreating = false;
  projectId: string | null = null;

  availableRegions = [
    { name: 'us-central1', description: 'Iowa, USA' },
    { name: 'us-east1', description: 'South Carolina, USA' },
    { name: 'us-west1', description: 'Oregon, USA' },
    { name: 'europe-west1', description: 'Belgium' },
    { name: 'europe-west2', description: 'London, England' },
    { name: 'asia-east1', description: 'Taiwan' },
    { name: 'asia-southeast1', description: 'Singapore' },
    { name: 'australia-southeast1', description: 'Sydney, Australia' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private vpcService: VpcService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {
    this.vpcForm = this.createForm();
  }

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)]],
      description: [''],
      subnetMode: ['automatic', Validators.required],
      subnets: this.fb.array([this.createSubnetGroup()]),
      allowHttp: [false],
      allowHttps: [true],
      allowSsh: [true],
      allowRdp: [false],
      allowIcmp: [true],
      routingMode: ['REGIONAL'],
      dnsPolicy: ['DEFAULT'],
      enableFlowLogs: [false]
    });
  }

  createSubnetGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      region: ['', Validators.required],
      ipRange: ['', [Validators.required, Validators.pattern(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/)]],
      privateGoogleAccess: [true],
      flowLogs: [false]
    });
  }

  get subnets(): FormArray {
    return this.vpcForm.get('subnets') as FormArray;
  }

  addSubnet() {
    this.subnets.push(this.createSubnetGroup());
  }

  removeSubnet(index: number) {
    if (this.subnets.length > 1) {
      this.subnets.removeAt(index);
    }
  }

  onSubmit() {
    if (this.vpcForm.valid && this.projectId) {
      this.isCreating = true;
      const formValue = this.vpcForm.value;
      
      const vpcData = {
        name: formValue.name,
        description: formValue.description,
        autoCreateSubnetworks: formValue.subnetMode === 'automatic',
        routingConfig: {
          routingMode: formValue.routingMode
        }
      };

      this.vpcService.createVpcNetwork(this.projectId, vpcData).subscribe({
        next: (response) => {
          this.snackBar.open('VPC Network created successfully!', 'Close', {
            duration: 5000,
            panelClass: 'success-snackbar'
          });
          this.router.navigate(['/vpc']);
        },
        error: (error) => {
          console.error('Error creating VPC network:', error);
          this.snackBar.open('Error creating VPC network. Please try again.', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.isCreating = false;
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/vpc']);
  }
} 