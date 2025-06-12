import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { DistributedApplicationService, DistributedAppConfig, TerraformTemplate } from '../../services/distributed-application.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface WizardStep {
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-distributed-application-wizard',
  template: `
    <div class="wizard-container">
      <div class="wizard-header">
        <h1>Distributed Application Network Wizard</h1>
        <p>Build a cross-cloud network foundation for distributed applications across on-premise and cloud platforms</p>
      </div>

      <div class="wizard-content">
        <!-- Progress Stepper -->
        <mat-stepper [selectedIndex]="currentStep" orientation="horizontal" class="wizard-stepper">
          <mat-step *ngFor="let step of steps; let i = index" [completed]="step.completed">
            <ng-template matStepLabel>{{ step.title }}</ng-template>
          </mat-step>
        </mat-stepper>

        <!-- Step Content -->
        <div class="step-content">
          <!-- Step 1: Project & Architecture -->
          <div *ngIf="currentStep === 0" class="step-panel">
            <h2>Project Configuration & Architecture</h2>
            <p>Configure your project and select the network architecture pattern</p>
            
            <form [formGroup]="projectForm" class="step-form">
              <div class="config-section">
                <h3>Project Settings</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Project ID</mat-label>
                  <input matInput formControlName="projectId" placeholder="my-distributed-app-project">
                  <mat-hint>Your Google Cloud Project ID</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Application Name</mat-label>
                  <input matInput formControlName="applicationName" placeholder="my-distributed-app">
                  <mat-hint>Name for your distributed application resources</mat-hint>
                </mat-form-field>
              </div>

              <div class="config-section">
                <h3>Network Architecture Pattern</h3>
                <div class="architecture-options">
                  <mat-card class="architecture-option" 
                            [class.selected]="projectForm.get('architecture')?.value === 'consolidated'"
                            (click)="selectArchitecture('consolidated')">
                    <mat-card-header>
                      <mat-icon mat-card-avatar>account_tree</mat-icon>
                      <mat-card-title>Consolidated Infrastructure</mat-card-title>
                      <mat-card-subtitle>Single host project for all networking</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p>Use a single infrastructure host project to manage all networking resources. All networking costs are billed to one project.</p>
                      <ul>
                        <li>Simplified management and billing</li>
                        <li>Centralized network policies</li>
                        <li>Easier compliance and governance</li>
                      </ul>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="architecture-option" 
                            [class.selected]="projectForm.get('architecture')?.value === 'segmented'"
                            (click)="selectArchitecture('segmented')">
                    <mat-card-header>
                      <mat-icon mat-card-avatar>device_hub</mat-icon>
                      <mat-card-title>Segmented Host Projects</mat-card-title>
                      <mat-card-subtitle>Separate host projects per application</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p>Use separate host projects for infrastructure and applications. Network costs are split between projects.</p>
                      <ul>
                        <li>Application isolation and autonomy</li>
                        <li>Distributed cost allocation</li>
                        <li>Team-based resource ownership</li>
                      </ul>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 2: Network Configuration -->
          <div *ngIf="currentStep === 1" class="step-panel">
            <h2>Network Configuration</h2>
            <p>Configure your VPC network and regional deployment</p>
            
            <form [formGroup]="networkForm" class="step-form">
              <div class="config-section">
                <h3>Primary Region</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Primary Region</mat-label>
                  <mat-select formControlName="primaryRegion">
                    <mat-option value="us-central1">us-central1 (Iowa)</mat-option>
                    <mat-option value="us-east1">us-east1 (South Carolina)</mat-option>
                    <mat-option value="us-west1">us-west1 (Oregon)</mat-option>
                    <mat-option value="europe-west1">europe-west1 (Belgium)</mat-option>
                    <mat-option value="asia-east1">asia-east1 (Taiwan)</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="config-section">
                <h3>Network CIDR Configuration</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>VPC CIDR Block</mat-label>
                  <input matInput formControlName="vpcCidr" placeholder="10.0.0.0/16">
                  <mat-hint>Main CIDR block for your VPC network</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Primary Subnet CIDR</mat-label>
                  <input matInput formControlName="primarySubnetCidr" placeholder="10.0.1.0/24">
                  <mat-hint>CIDR block for the primary region subnet</mat-hint>
                </mat-form-field>
              </div>

              <div class="config-section">
                <h3>Network Features</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="enablePrivateGoogleAccess">
                    <div class="checkbox-content">
                      <strong>Enable Private Google Access</strong>
                      <p>Allow VMs without external IPs to access Google APIs</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableFlowLogs">
                    <div class="checkbox-content">
                      <strong>Enable VPC Flow Logs</strong>
                      <p>Capture network flow information for monitoring and troubleshooting</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableCloudNAT">
                    <div class="checkbox-content">
                      <strong>Enable Cloud NAT</strong>
                      <p>Provide outbound internet access for private instances</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 3: Connectivity Configuration -->
          <div *ngIf="currentStep === 2" class="step-panel">
            <h2>Connectivity Configuration</h2>
            <p>Configure on-premises and multi-cloud connectivity</p>
            
            <form [formGroup]="connectivityForm" class="step-form">
              <div class="config-section">
                <h3>On-Premises Connectivity</h3>
                <mat-checkbox formControlName="enableOnPremConnectivity">
                  Enable on-premises connectivity
                </mat-checkbox>

                <div *ngIf="connectivityForm.get('enableOnPremConnectivity')?.value" class="connectivity-config">
                  <mat-form-field appearance="outline">
                    <mat-label>Connectivity Type</mat-label>
                    <mat-select formControlName="onPremType">
                      <mat-option value="vpn">Cloud VPN</mat-option>
                      <mat-option value="dedicated">Dedicated Interconnect</mat-option>
                      <mat-option value="partner">Partner Interconnect</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Redundancy Level</mat-label>
                    <mat-select formControlName="onPremRedundancy">
                      <mat-option value="high">High Availability (99.99% SLA)</mat-option>
                      <mat-option value="low">Standard (Single connection)</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-checkbox formControlName="enableMacSec">
                    Enable MACsec encryption
                  </mat-checkbox>
                </div>
              </div>

              <div class="config-section">
                <h3>Multi-Cloud Connectivity</h3>
                <mat-checkbox formControlName="enableMultiCloud">
                  Enable multi-cloud connectivity
                </mat-checkbox>

                <div *ngIf="connectivityForm.get('enableMultiCloud')?.value" class="multicloud-config">
                  <div class="cloud-providers">
                    <mat-checkbox formControlName="enableAWS">
                      <div class="provider-option">
                        <strong>Amazon Web Services (AWS)</strong>
                        <p>Connect to AWS VPCs via Network Connectivity Center</p>
                      </div>
                    </mat-checkbox>
                    
                    <mat-checkbox formControlName="enableAzure">
                      <div class="provider-option">
                        <strong>Microsoft Azure</strong>
                        <p>Connect to Azure VNets via Network Connectivity Center</p>
                      </div>
                    </mat-checkbox>
                    
                    <mat-checkbox formControlName="enableOracle">
                      <div class="provider-option">
                        <strong>Oracle Cloud Infrastructure</strong>
                        <p>Connect to OCI VCNs via Network Connectivity Center</p>
                      </div>
                    </mat-checkbox>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 4: Workloads Configuration -->
          <div *ngIf="currentStep === 3" class="step-panel">
            <h2>Application Workloads</h2>
            <p>Configure your application workloads and compute resources</p>
            
            <form [formGroup]="workloadsForm" class="step-form">
              <div class="workloads-section">
                <div class="section-header">
                  <h3>Workloads</h3>
                  <button mat-raised-button color="primary" type="button" (click)="addWorkload()">
                    <mat-icon>add</mat-icon>
                    Add Workload
                  </button>
                </div>

                <div formArrayName="workloads" class="workloads-list">
                  <mat-card *ngFor="let workload of workloadsArray.controls; let i = index" 
                            [formGroupName]="i" class="workload-card">
                    <mat-card-header>
                      <mat-card-title>Workload {{ i + 1 }}</mat-card-title>
                      <button mat-icon-button color="warn" type="button" (click)="removeWorkload(i)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="workload-config">
                        <mat-form-field appearance="outline">
                          <mat-label>Workload Name</mat-label>
                          <input matInput formControlName="name" placeholder="web-tier">
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Workload Type</mat-label>
                          <mat-select formControlName="type">
                            <mat-option value="compute-engine">Compute Engine VMs</mat-option>
                            <mat-option value="gke">Google Kubernetes Engine</mat-option>
                            <mat-option value="cloud-run">Cloud Run</mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Region</mat-label>
                          <mat-select formControlName="region">
                            <mat-option value="us-central1">us-central1</mat-option>
                            <mat-option value="us-east1">us-east1</mat-option>
                            <mat-option value="europe-west1">europe-west1</mat-option>
                          </mat-select>
                        </mat-form-field>

                        <div class="scaling-config">
                          <mat-form-field appearance="outline">
                            <mat-label>Min Instances</mat-label>
                            <input matInput type="number" formControlName="minInstances" min="1">
                          </mat-form-field>

                          <mat-form-field appearance="outline">
                            <mat-label>Max Instances</mat-label>
                            <input matInput type="number" formControlName="maxInstances" min="1">
                          </mat-form-field>
                        </div>

                        <mat-form-field appearance="outline" *ngIf="workload.get('type')?.value === 'compute-engine'">
                          <mat-label>Machine Type</mat-label>
                          <mat-select formControlName="machineType">
                            <mat-option value="e2-micro">e2-micro (1 vCPU, 1GB RAM)</mat-option>
                            <mat-option value="e2-small">e2-small (1 vCPU, 2GB RAM)</mat-option>
                            <mat-option value="e2-medium">e2-medium (1 vCPU, 4GB RAM)</mat-option>
                            <mat-option value="e2-standard-2">e2-standard-2 (2 vCPU, 8GB RAM)</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 5: Review & Generate -->
          <div *ngIf="currentStep === 4" class="step-panel">
            <h2>Review Configuration</h2>
            <p>Review your settings and generate Terraform configuration</p>
            
            <div class="review-section">
              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Project & Architecture</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Project ID:</strong> {{ projectForm.get('projectId')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Application Name:</strong> {{ projectForm.get('applicationName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Architecture:</strong> {{ getArchitectureDisplayName(projectForm.get('architecture')?.value) }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Network Configuration</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Primary Region:</strong> {{ networkForm.get('primaryRegion')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>VPC CIDR:</strong> {{ networkForm.get('vpcCidr')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Private Google Access:</strong> {{ networkForm.get('enablePrivateGoogleAccess')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                  <div class="review-item">
                    <strong>Flow Logs:</strong> {{ networkForm.get('enableFlowLogs')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Connectivity</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>On-Premises:</strong> {{ connectivityForm.get('enableOnPremConnectivity')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                  <div class="review-item" *ngIf="connectivityForm.get('enableOnPremConnectivity')?.value">
                    <strong>Type:</strong> {{ getConnectivityDisplayName(connectivityForm.get('onPremType')?.value) }}
                  </div>
                  <div class="review-item">
                    <strong>Multi-Cloud:</strong> {{ connectivityForm.get('enableMultiCloud')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Workloads</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Total Workloads:</strong> {{ workloadsArray.length }}
                  </div>
                  <div *ngFor="let workload of workloadsArray.controls; let i = index" class="workload-summary">
                    <strong>{{ workload.get('name')?.value }}:</strong> 
                    {{ getWorkloadTypeDisplayName(workload.get('type')?.value) }} 
                    in {{ workload.get('region')?.value }}
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="cost-estimation" *ngIf="estimatedCost">
              <mat-card class="cost-card">
                <mat-card-header>
                  <mat-card-title>Estimated Monthly Cost</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="cost-total">
                    <span class="cost-amount">\${{ estimatedCost.monthly }}</span>
                    <span class="cost-period">per month</span>
                  </div>
                  <div class="cost-breakdown">
                    <div class="cost-item">
                      <span>Infrastructure:</span>
                      <span>\${{ estimatedCost.breakdown.infrastructure }}</span>
                    </div>
                    <div class="cost-item">
                      <span>Workloads:</span>
                      <span>\${{ estimatedCost.breakdown.workloads }}</span>
                    </div>
                    <div class="cost-item">
                      <span>Connectivity:</span>
                      <span>\${{ estimatedCost.breakdown.connectivity }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="terraform-section" *ngIf="generatedTerraform">
              <h3>Generated Terraform Configuration</h3>
              <mat-card class="terraform-card">
                <mat-card-content>
                  <pre class="terraform-code">{{ generatedTerraform }}</pre>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-raised-button color="primary" (click)="downloadTerraform()">
                    <mat-icon>download</mat-icon>
                    Download Terraform Files
                  </button>
                  <button mat-stroked-button (click)="copyTerraform()">
                    <mat-icon>content_copy</mat-icon>
                    Copy to Clipboard
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="wizard-navigation">
          <button mat-stroked-button 
                  [disabled]="currentStep === 0" 
                  (click)="previousStep()">
            <mat-icon>arrow_back</mat-icon>
            Previous
          </button>
          
          <div class="nav-spacer"></div>
          
          <button mat-raised-button 
                  color="primary"
                  *ngIf="currentStep < 4"
                  [disabled]="!isCurrentStepValid()"
                  (click)="nextStep()">
            Next
            <mat-icon>arrow_forward</mat-icon>
          </button>
          
          <button mat-raised-button 
                  color="primary"
                  *ngIf="currentStep === 4"
                  (click)="generateTerraform()">
            <mat-icon>build</mat-icon>
            Generate Terraform
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--background-color);
      color: var(--text-color);
      min-height: 100vh;
    }

    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .wizard-header h1 {
      color: var(--primary-color);
      font-size: 32px;
      margin-bottom: 8px;
    }

    .wizard-header p {
      color: var(--text-secondary);
      font-size: 16px;
    }

    .wizard-stepper {
      margin-bottom: 32px;
    }

    .step-content {
      min-height: 500px;
      margin-bottom: 32px;
    }

    .step-panel {
      background: var(--card-background);
      border-radius: 8px;
      padding: 24px;
      border: 1px solid var(--border-color);
    }

    .step-panel h2 {
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .step-panel p {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .step-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .config-section {
      margin-bottom: 24px;
    }

    .config-section h3 {
      color: var(--text-color);
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
    }

    .architecture-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .architecture-option {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid var(--border-color);
    }

    .architecture-option:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .architecture-option.selected {
      border-color: var(--primary-color);
      background: var(--primary-background);
    }

    .architecture-option ul {
      margin: 8px 0 0 0;
      padding-left: 16px;
    }

    .architecture-option li {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .checkbox-content {
      margin-left: 8px;
    }

    .checkbox-content strong {
      display: block;
      color: var(--text-color);
    }

    .checkbox-content p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .connectivity-config, .multicloud-config {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--hover-color);
    }

    .cloud-providers {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .provider-option strong {
      display: block;
      color: var(--text-color);
    }

    .provider-option p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .workloads-section {
      width: 100%;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .workloads-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .workload-card {
      border: 1px solid var(--border-color);
    }

    .workload-config {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .scaling-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      grid-column: span 2;
    }

    .review-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .review-card {
      border: 1px solid var(--border-color);
    }

    .review-item {
      margin-bottom: 8px;
      padding: 4px 0;
    }

    .review-item strong {
      color: var(--text-color);
      margin-right: 8px;
    }

    .workload-summary {
      margin-bottom: 4px;
      font-size: 14px;
    }

    .cost-estimation {
      margin-bottom: 32px;
    }

    .cost-card {
      border: 1px solid var(--border-color);
    }

    .cost-total {
      text-align: center;
      margin-bottom: 16px;
    }

    .cost-amount {
      font-size: 32px;
      font-weight: bold;
      color: var(--primary-color);
    }

    .cost-period {
      font-size: 16px;
      color: var(--text-secondary);
      margin-left: 8px;
    }

    .cost-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cost-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .terraform-section {
      margin-top: 32px;
    }

    .terraform-card {
      border: 1px solid var(--border-color);
    }

    .terraform-code {
      background: var(--table-header-background);
      padding: 16px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 400px;
      overflow-y: auto;
    }

    .wizard-navigation {
      display: flex;
      align-items: center;
      padding: 16px 0;
      border-top: 1px solid var(--border-color);
    }

    .nav-spacer {
      flex: 1;
    }

    @media (max-width: 768px) {
      .wizard-container {
        padding: 16px;
      }

      .architecture-options {
        grid-template-columns: 1fr;
      }

      .review-section {
        grid-template-columns: 1fr;
      }

      .workload-config {
        grid-template-columns: 1fr;
      }

      .scaling-config {
        grid-column: span 1;
      }
    }
  `]
})
export class DistributedApplicationWizardComponent implements OnInit {
  currentStep = 0;
  steps: WizardStep[] = [
    { title: 'Project & Architecture', completed: false },
    { title: 'Network Configuration', completed: false },
    { title: 'Connectivity', completed: false },
    { title: 'Workloads', completed: false },
    { title: 'Review & Generate', completed: false }
  ];

  projectForm: FormGroup;
  networkForm: FormGroup;
  connectivityForm: FormGroup;
  workloadsForm: FormGroup;

  generatedTerraform = '';
  estimatedCost: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private distributedAppService: DistributedApplicationService,
    private snackBar: MatSnackBar
  ) {
    this.projectForm = this.fb.group({
      projectId: ['', Validators.required],
      applicationName: ['', Validators.required],
      architecture: ['consolidated', Validators.required]
    });

    this.networkForm = this.fb.group({
      primaryRegion: ['us-central1', Validators.required],
      vpcCidr: ['10.0.0.0/16', Validators.required],
      primarySubnetCidr: ['10.0.1.0/24', Validators.required],
      enablePrivateGoogleAccess: [true],
      enableFlowLogs: [false],
      enableCloudNAT: [true]
    });

    this.connectivityForm = this.fb.group({
      enableOnPremConnectivity: [false],
      onPremType: ['vpn'],
      onPremRedundancy: ['high'],
      enableMacSec: [false],
      enableMultiCloud: [false],
      enableAWS: [false],
      enableAzure: [false],
      enableOracle: [false]
    });

    this.workloadsForm = this.fb.group({
      workloads: this.fb.array([])
    });
  }

  ngOnInit() {
    // Add default workload
    this.addWorkload();
  }

  get workloadsArray(): FormArray {
    return this.workloadsForm.get('workloads') as FormArray;
  }

  selectArchitecture(architecture: 'consolidated' | 'segmented') {
    this.projectForm.patchValue({ architecture });
  }

  addWorkload() {
    const workloadGroup = this.fb.group({
      name: ['', Validators.required],
      type: ['compute-engine', Validators.required],
      region: ['us-central1', Validators.required],
      minInstances: [1, [Validators.required, Validators.min(1)]],
      maxInstances: [3, [Validators.required, Validators.min(1)]],
      machineType: ['e2-medium']
    });

    this.workloadsArray.push(workloadGroup);
  }

  removeWorkload(index: number) {
    this.workloadsArray.removeAt(index);
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: return this.projectForm.valid;
      case 1: return this.networkForm.valid;
      case 2: return this.connectivityForm.valid;
      case 3: return this.workloadsForm.valid;
      default: return true;
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.steps[this.currentStep].completed = true;
      this.currentStep++;
      
      if (this.currentStep === 4) {
        this.generateCostEstimate();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  generateCostEstimate() {
    const config = this.buildConfig();
    this.distributedAppService.estimateCost(config).subscribe(cost => {
      this.estimatedCost = cost;
    });
  }

  generateTerraform() {
    const config = this.buildConfig();
    
    this.distributedAppService.generateTerraformConfig(config).subscribe({
      next: (template: TerraformTemplate) => {
        this.generatedTerraform = template.content;
        this.snackBar.open('Terraform configuration generated successfully!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Error generating Terraform configuration', 'Close', { duration: 3000 });
        console.error('Error:', error);
      }
    });
  }

  downloadTerraform() {
    if (!this.generatedTerraform) {
      this.generateTerraform();
      return;
    }

    const config = this.buildConfig();
    this.distributedAppService.generateTerraformConfig(config).subscribe(template => {
      this.distributedAppService.downloadTerraformFiles(template);
      this.snackBar.open('Terraform files downloaded successfully!', 'Close', { duration: 3000 });
    });
  }

  copyTerraform() {
    if (this.generatedTerraform) {
      this.distributedAppService.copyToClipboard(this.generatedTerraform).then(() => {
        this.snackBar.open('Terraform configuration copied to clipboard!', 'Close', { duration: 3000 });
      });
    }
  }

  private buildConfig(): DistributedAppConfig {
    const projectData = this.projectForm.value;
    const networkData = this.networkForm.value;
    const connectivityData = this.connectivityForm.value;
    const workloadsData = this.workloadsForm.value;

    const multiCloudProviders: Array<{
      name: 'aws' | 'azure' | 'oracle';
      regions: string[];
      redundancy: 'high' | 'low';
    }> = [];
    if (connectivityData.enableAWS) multiCloudProviders.push({ name: 'aws' as const, regions: ['us-east-1'], redundancy: 'high' as const });
    if (connectivityData.enableAzure) multiCloudProviders.push({ name: 'azure' as const, regions: ['eastus'], redundancy: 'high' as const });
    if (connectivityData.enableOracle) multiCloudProviders.push({ name: 'oracle' as const, regions: ['us-ashburn-1'], redundancy: 'high' as const });

    return {
      projectId: projectData.projectId,
      applicationName: projectData.applicationName,
      architecture: projectData.architecture,
      
      onPremConnectivity: {
        enabled: connectivityData.enableOnPremConnectivity,
        type: connectivityData.onPremType,
        redundancy: connectivityData.onPremRedundancy,
        regions: [networkData.primaryRegion],
        capacity: '10gb',
        macSecEnabled: connectivityData.enableMacSec
      },
      
      multiCloudConnectivity: {
        enabled: connectivityData.enableMultiCloud,
        providers: multiCloudProviders
      },
      
      networkConfig: {
        primaryRegion: networkData.primaryRegion,
        secondaryRegions: [],
        vpcCidr: networkData.vpcCidr,
        subnetCidrs: {
          [networkData.primaryRegion]: networkData.primarySubnetCidr
        },
        enablePrivateGoogleAccess: networkData.enablePrivateGoogleAccess,
        enableFlowLogs: networkData.enableFlowLogs
      },
      
      securityConfig: {
        enableCloudArmor: false,
        enableCloudNAT: networkData.enableCloudNAT,
        enablePrivateServiceConnect: false,
        firewallRules: [
          {
            name: 'allow-http',
            direction: 'INGRESS',
            priority: 1000,
            sourceRanges: ['0.0.0.0/0'],
            targetTags: ['http-server'],
            allowed: [{ protocol: 'tcp', ports: ['80'] }]
          },
          {
            name: 'allow-https',
            direction: 'INGRESS',
            priority: 1000,
            sourceRanges: ['0.0.0.0/0'],
            targetTags: ['https-server'],
            allowed: [{ protocol: 'tcp', ports: ['443'] }]
          }
        ]
      },
      
      workloads: workloadsData.workloads.map((w: any) => ({
        name: w.name,
        type: w.type,
        region: w.region,
        scaling: {
          min: w.minInstances,
          max: w.maxInstances
        },
        machineType: w.machineType
      }))
    };
  }

  getArchitectureDisplayName(architecture: string): string {
    const names = {
      'consolidated': 'Consolidated Infrastructure',
      'segmented': 'Segmented Host Projects'
    };
    return names[architecture as keyof typeof names] || architecture;
  }

  getConnectivityDisplayName(type: string): string {
    const names = {
      'vpn': 'Cloud VPN',
      'dedicated': 'Dedicated Interconnect',
      'partner': 'Partner Interconnect'
    };
    return names[type as keyof typeof names] || type;
  }

  getWorkloadTypeDisplayName(type: string): string {
    const names = {
      'compute-engine': 'Compute Engine VMs',
      'gke': 'Google Kubernetes Engine',
      'cloud-run': 'Cloud Run'
    };
    return names[type as keyof typeof names] || type;
  }
} 