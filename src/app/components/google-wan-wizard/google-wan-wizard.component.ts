import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GoogleWANService, GoogleWANConfig } from '../../services/google-wan.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface WizardStep {
  title: string;
  description: string;
  completed: boolean;
}

@Component({
  selector: 'app-google-wan-wizard',
  template: `
    <div class="wizard-container">
      <div class="wizard-header">
        <h1>Google Wide Area Network Wizard</h1>
        <p>Design and deploy enterprise-grade WAN infrastructure with intelligent connectivity patterns</p>
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
          <!-- Step 1: WAN Architecture Pattern -->
          <div *ngIf="currentStep === 0" class="step-panel">
            <h2>Choose Your WAN Architecture Pattern</h2>
            <p>Select the network pattern that best fits your connectivity requirements</p>
            
            <div class="architecture-options">
              <mat-card class="architecture-option" 
                        [class.selected]="selectedArchitecture === 'ncc-hub-spoke'"
                        (click)="selectArchitecture('ncc-hub-spoke')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>hub</mat-icon>
                  <mat-card-title>Network Connectivity Center</mat-card-title>
                  <mat-card-subtitle>Modern hub-and-spoke with NCC</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Multi-VPC connectivity, global reach, simplified management</p>
                  <ul>
                    <li>Connect 250+ VPCs per hub</li>
                    <li>Cross-project and cross-org VPC spokes</li>
                    <li>Private Service Connect propagation</li>
                    <li>Star topology with center/edge groups</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="architecture-option" 
                        [class.selected]="selectedArchitecture === 'site-to-site'"
                        (click)="selectArchitecture('site-to-site')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>share</mat-icon>
                  <mat-card-title>Site-to-Site Data Transfer</mat-card-title>
                  <mat-card-subtitle>Connect external networks via Google backbone</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Branch offices, multi-cloud, on-premises connectivity</p>
                  <ul>
                    <li>Use Google's global network as transit</li>
                    <li>HA VPN tunnels or Interconnect</li>
                    <li>Dynamic route exchange</li>
                    <li>Full mesh connectivity</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="architecture-option" 
                        [class.selected]="selectedArchitecture === 'sd-wan-integration'"
                        (click)="selectArchitecture('sd-wan-integration')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>router</mat-icon>
                  <mat-card-title>SD-WAN Integration</mat-card-title>
                  <mat-card-subtitle>Third-party appliances with Google Cloud</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Existing SD-WAN, specialized routing, network functions</p>
                  <ul>
                    <li>Router appliance VMs</li>
                    <li>BGP peering with Cloud Router</li>
                    <li>Traffic inspection and control</li>
                    <li>Vendor-specific features</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="architecture-option" 
                        [class.selected]="selectedArchitecture === 'hybrid-multicloud'"
                        (click)="selectArchitecture('hybrid-multicloud')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>cloud_queue</mat-icon>
                  <mat-card-title>Hybrid & Multi-Cloud</mat-card-title>
                  <mat-card-subtitle>Connect to AWS, Azure, on-premises</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Multi-cloud strategy, hybrid workloads, cloud migration</p>
                  <ul>
                    <li>VPN-based multi-cloud connectivity</li>
                    <li>Dedicated/Partner Interconnect</li>
                    <li>Cross-cloud network integration</li>
                    <li>Workload portability</li>
                  </ul>
                </mat-card-content>
              </mat-card>
            </div>
          </div>

          <!-- Step 2: Connectivity Requirements -->
          <div *ngIf="currentStep === 1" class="step-panel">
            <h2>Define Connectivity Requirements</h2>
            <p>Configure your network topology and connection preferences</p>
            
            <form [formGroup]="connectivityForm" class="step-form">
              <div class="config-section">
                <h3>Network Topology</h3>
                <mat-radio-group formControlName="topology" class="radio-group">
                  <mat-radio-button value="full-mesh">
                    <div class="radio-content">
                      <strong>Full Mesh Connectivity</strong>
                      <p>All networks can communicate with each other</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="star">
                    <div class="radio-content">
                      <strong>Star Topology</strong>
                      <p>Hub-and-spoke with centralized routing</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="segmented">
                    <div class="radio-content">
                      <strong>Segmented Networks</strong>
                      <p>Isolated groups with selective connectivity</p>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="config-section">
                <h3>Connection Types</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="enableOnPremises">
                    <div class="checkbox-content">
                      <strong>On-Premises Connectivity</strong>
                      <p>Connect to data centers and branch offices</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableMultiCloud">
                    <div class="checkbox-content">
                      <strong>Multi-Cloud Connectivity</strong>
                      <p>Connect to AWS, Azure, Oracle Cloud</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableVpcSpokes">
                    <div class="checkbox-content">
                      <strong>VPC Network Spokes</strong>
                      <p>Connect multiple Google Cloud VPCs</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enablePrivateServices">
                    <div class="checkbox-content">
                      <strong>Private Service Access</strong>
                      <p>Connect to Google services privately</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>

              <div class="config-section" *ngIf="connectivityForm.get('enableOnPremises')?.value">
                <h3>On-Premises Connection Method</h3>
                <mat-radio-group formControlName="onPremMethod" class="radio-group">
                  <mat-radio-button value="dedicated-interconnect">
                    <div class="radio-content">
                      <strong>Dedicated Interconnect</strong>
                      <p>Direct physical connection (10-200 Gbps)</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="partner-interconnect">
                    <div class="radio-content">
                      <strong>Partner Interconnect</strong>
                      <p>Via service provider (50 Mbps - 50 Gbps)</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="ha-vpn">
                    <div class="radio-content">
                      <strong>HA VPN</strong>
                      <p>Encrypted tunnels over internet (1.5-3 Gbps)</p>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>
            </form>
          </div>

          <!-- Step 3: Advanced Configuration -->
          <div *ngIf="currentStep === 2" class="step-panel">
            <h2>Advanced Network Configuration</h2>
            <p>Configure advanced features and optimization settings</p>
            
            <form [formGroup]="advancedForm" class="step-form">
              <div class="config-section">
                <h3>Routing & Traffic Control</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="enableRouteFiltering">
                    <div class="checkbox-content">
                      <strong>Route Filtering</strong>
                      <p>Control which routes are advertised between spokes</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableTrafficEngineering">
                    <div class="checkbox-content">
                      <strong>Traffic Engineering</strong>
                      <p>Optimize paths with custom BGP policies</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableLoadBalancing">
                    <div class="checkbox-content">
                      <strong>Multi-Path Load Balancing</strong>
                      <p>Distribute traffic across multiple paths</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>

              <div class="config-section">
                <h3>Security Features</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="enableMacSec">
                    <div class="checkbox-content">
                      <strong>MACsec Encryption</strong>
                      <p>Layer 2 encryption for Interconnect</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableNccGateway">
                    <div class="checkbox-content">
                      <strong>NCC Gateway with SSE</strong>
                      <p>Security Service Edge inspection</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableFirewallPolicies">
                    <div class="checkbox-content">
                      <strong>Network Firewall Policies</strong>
                      <p>Centralized security rules</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>

              <div class="config-section">
                <h3>Monitoring & Observability</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="enableFlowLogs">
                    <div class="checkbox-content">
                      <strong>VPC Flow Logs</strong>
                      <p>Network traffic analysis and debugging</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableConnectivityTests">
                    <div class="checkbox-content">
                      <strong>Connectivity Tests</strong>
                      <p>Automated network path verification</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="enableNetworkIntelligence">
                    <div class="checkbox-content">
                      <strong>Network Intelligence Center</strong>
                      <p>Performance insights and optimization</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 4: Regional Configuration -->
          <div *ngIf="currentStep === 3" class="step-panel">
            <h2>Regional & Global Configuration</h2>
            <p>Configure regional deployment and global network settings</p>
            
            <form [formGroup]="regionalForm" class="step-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Primary Hub Region</mat-label>
                <mat-select formControlName="primaryRegion">
                  <mat-option value="us-central1">us-central1 (Iowa)</mat-option>
                  <mat-option value="us-east1">us-east1 (South Carolina)</mat-option>
                  <mat-option value="us-west1">us-west1 (Oregon)</mat-option>
                  <mat-option value="europe-west1">europe-west1 (Belgium)</mat-option>
                  <mat-option value="europe-west2">europe-west2 (London)</mat-option>
                  <mat-option value="asia-east1">asia-east1 (Taiwan)</mat-option>
                  <mat-option value="asia-southeast1">asia-southeast1 (Singapore)</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="config-section">
                <h3>Multi-Regional Deployment</h3>
                <mat-checkbox formControlName="enableMultiRegion">
                  <div class="checkbox-content">
                    <strong>Enable Multi-Regional Hubs</strong>
                    <p>Deploy hubs in multiple regions for redundancy</p>
                  </div>
                </mat-checkbox>
                
                <div *ngIf="regionalForm.get('enableMultiRegion')?.value" class="secondary-regions">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Secondary Regions</mat-label>
                    <mat-select formControlName="secondaryRegions" multiple>
                      <mat-option value="us-central1">us-central1 (Iowa)</mat-option>
                      <mat-option value="us-east1">us-east1 (South Carolina)</mat-option>
                      <mat-option value="us-west1">us-west1 (Oregon)</mat-option>
                      <mat-option value="europe-west1">europe-west1 (Belgium)</mat-option>
                      <mat-option value="europe-west2">europe-west2 (London)</mat-option>
                      <mat-option value="asia-east1">asia-east1 (Taiwan)</mat-option>
                      <mat-option value="asia-southeast1">asia-southeast1 (Singapore)</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="config-section">
                <h3>Global Routing</h3>
                <mat-radio-group formControlName="routingMode" class="radio-group">
                  <mat-radio-button value="regional">
                    <div class="radio-content">
                      <strong>Regional Routing</strong>
                      <p>Routes are learned/advertised within the same region</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="global">
                    <div class="radio-content">
                      <strong>Global Routing</strong>
                      <p>Routes are learned/advertised across all regions</p>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>
            </form>
          </div>

          <!-- Step 5: Review & Generate -->
          <div *ngIf="currentStep === 4" class="step-panel">
            <h2>Review & Generate Configuration</h2>
            <p>Review your WAN architecture and generate Terraform configuration</p>
            
            <div class="review-sections">
              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Architecture Summary</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Pattern:</strong> {{ getArchitectureDisplayName(selectedArchitecture) }}
                  </div>
                  <div class="review-item">
                    <strong>Topology:</strong> {{ getTopologyDisplayName(connectivityForm.get('topology')?.value) }}
                  </div>
                  <div class="review-item">
                    <strong>Primary Region:</strong> {{ regionalForm.get('primaryRegion')?.value }}
                  </div>
                  <div class="review-item" *ngIf="regionalForm.get('enableMultiRegion')?.value">
                    <strong>Secondary Regions:</strong> {{ regionalForm.get('secondaryRegions')?.value?.join(', ') }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Connectivity Features</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="feature-list">
                    <div class="feature-item" *ngIf="connectivityForm.get('enableOnPremises')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>On-Premises ({{ getOnPremMethodDisplayName(connectivityForm.get('onPremMethod')?.value) }})</span>
                    </div>
                    <div class="feature-item" *ngIf="connectivityForm.get('enableMultiCloud')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>Multi-Cloud Connectivity</span>
                    </div>
                    <div class="feature-item" *ngIf="connectivityForm.get('enableVpcSpokes')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>VPC Network Spokes</span>
                    </div>
                    <div class="feature-item" *ngIf="connectivityForm.get('enablePrivateServices')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>Private Service Access</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Advanced Features</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="feature-list">
                    <div class="feature-item" *ngIf="advancedForm.get('enableRouteFiltering')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>Route Filtering</span>
                    </div>
                    <div class="feature-item" *ngIf="advancedForm.get('enableNccGateway')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>NCC Gateway with SSE</span>
                    </div>
                    <div class="feature-item" *ngIf="advancedForm.get('enableMacSec')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>MACsec Encryption</span>
                    </div>
                    <div class="feature-item" *ngIf="advancedForm.get('enableNetworkIntelligence')?.value">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>Network Intelligence Center</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="cost-estimation" *ngIf="estimatedCost">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Estimated Monthly Cost</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="cost-breakdown">
                    <div class="cost-item">
                      <span>Network Connectivity Center:</span>
                      <span class="cost-value">\${{ estimatedCost.ncc }}</span>
                    </div>
                    <div class="cost-item" *ngIf="estimatedCost.interconnect > 0">
                      <span>Cloud Interconnect:</span>
                      <span class="cost-value">\${{ estimatedCost.interconnect }}</span>
                    </div>
                    <div class="cost-item" *ngIf="estimatedCost.vpn > 0">
                      <span>Cloud VPN:</span>
                      <span class="cost-value">\${{ estimatedCost.vpn }}</span>
                    </div>
                    <div class="cost-item total">
                      <span><strong>Total Estimated Cost:</strong></span>
                      <span class="cost-value"><strong>\${{ estimatedCost.total }}</strong></span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="terraform-output" *ngIf="generatedTerraform">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Generated Terraform Configuration</mat-card-title>
                  <div class="card-actions">
                    <button mat-icon-button (click)="copyTerraform()" matTooltip="Copy to clipboard">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button (click)="downloadTerraform()" matTooltip="Download as file">
                      <mat-icon>download</mat-icon>
                    </button>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <pre><code>{{ generatedTerraform }}</code></pre>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="wizard-navigation">
          <button mat-button 
                  (click)="previousStep()" 
                  [disabled]="currentStep === 0">
            <mat-icon>arrow_back</mat-icon>
            Previous
          </button>
          
          <div class="nav-spacer"></div>
          
          <button mat-raised-button 
                  color="primary" 
                  *ngIf="currentStep < steps.length - 1"
                  (click)="nextStep()" 
                  [disabled]="!isCurrentStepValid()">
            Next
            <mat-icon>arrow_forward</mat-icon>
          </button>
          
          <button mat-raised-button 
                  color="primary" 
                  *ngIf="currentStep === steps.length - 1"
                  (click)="generateTerraform()" 
                  [disabled]="!isCurrentStepValid()">
            Generate Terraform
            <mat-icon>build</mat-icon>
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
    }
    
    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .wizard-header h1 {
      color: #1976d2;
      margin-bottom: 8px;
    }
    
    .wizard-stepper {
      margin-bottom: 32px;
    }
    
    .step-content {
      min-height: 600px;
      margin-bottom: 24px;
    }
    
    .step-panel h2 {
      color: #333;
      margin-bottom: 8px;
    }
    
    .architecture-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    
    .architecture-option {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .architecture-option:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .architecture-option.selected {
      border-color: #1976d2;
      background-color: #f3f7ff;
    }
    
    .architecture-option mat-card-content ul {
      margin-top: 12px;
      padding-left: 20px;
    }
    
    .architecture-option mat-card-content li {
      margin-bottom: 4px;
      font-size: 14px;
    }
    
    .step-form {
      max-width: 800px;
    }
    
    .config-section {
      margin-bottom: 32px;
    }
    
    .config-section h3 {
      color: #555;
      margin-bottom: 16px;
      font-size: 18px;
    }
    
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .radio-content {
      margin-left: 8px;
    }
    
    .radio-content strong {
      display: block;
      color: #333;
    }
    
    .radio-content p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
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
      color: #333;
    }
    
    .checkbox-content p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .secondary-regions {
      margin-top: 16px;
      margin-left: 32px;
    }
    
    .review-sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .review-card {
      height: fit-content;
    }
    
    .review-item {
      margin-bottom: 8px;
    }
    
    .review-item strong {
      color: #333;
      margin-right: 8px;
    }
    
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .feature-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    
    .cost-estimation {
      margin-bottom: 24px;
    }
    
    .cost-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .cost-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }
    
    .cost-item.total {
      border-top: 1px solid #ddd;
      margin-top: 8px;
      padding-top: 16px;
    }
    
    .cost-value {
      color: #1976d2;
      font-weight: 500;
    }
    
    .terraform-output {
      margin-bottom: 24px;
    }
    
    .terraform-output mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .card-actions {
      display: flex;
      gap: 8px;
    }
    
    .terraform-output pre {
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      max-height: 400px;
      margin: 0;
    }
    
    .terraform-output code {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .wizard-navigation {
      display: flex;
      align-items: center;
      padding: 16px 0;
      border-top: 1px solid #ddd;
    }
    
    .nav-spacer {
      flex: 1;
    }
    
    .wizard-navigation button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class GoogleWANWizardComponent implements OnInit {
  currentStep = 0;
  selectedArchitecture: string = '';
  generatedTerraform = '';
  estimatedCost: any = null;

  steps: WizardStep[] = [
    { title: 'WAN Architecture', description: 'Choose connectivity pattern', completed: false },
    { title: 'Connectivity', description: 'Define requirements', completed: false },
    { title: 'Advanced Features', description: 'Configure options', completed: false },
    { title: 'Regional Setup', description: 'Global configuration', completed: false },
    { title: 'Review & Generate', description: 'Create Terraform', completed: false }
  ];

  projectForm!: FormGroup;
  connectivityForm!: FormGroup;
  advancedForm!: FormGroup;
  regionalForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private googleWANService: GoogleWANService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForms();
  }

  ngOnInit() {}

  private initializeForms(): void {
    this.projectForm = this.fb.group({
      projectId: ['', Validators.required],
      applicationName: ['', Validators.required]
    });

    this.connectivityForm = this.fb.group({
      topology: ['full-mesh', Validators.required],
      enableOnPremises: [false],
      enableMultiCloud: [false],
      enableVpcSpokes: [true],
      enablePrivateServices: [false],
      onPremMethod: ['ha-vpn']
    });

    this.advancedForm = this.fb.group({
      enableRouteFiltering: [false],
      enableTrafficEngineering: [false],
      enableLoadBalancing: [false],
      enableMacSec: [false],
      enableNccGateway: [false],
      enableFirewallPolicies: [false],
      enableFlowLogs: [false],
      enableConnectivityTests: [false],
      enableNetworkIntelligence: [true]
    });

    this.regionalForm = this.fb.group({
      primaryRegion: ['us-central1', Validators.required],
      enableMultiRegion: [false],
      secondaryRegions: [[]],
      routingMode: ['global', Validators.required]
    });
  }

  selectArchitecture(architecture: string) {
    this.selectedArchitecture = architecture;
    
    // Auto-configure forms based on architecture
    switch (architecture) {
      case 'ncc-hub-spoke':
        this.connectivityForm.patchValue({
          enableVpcSpokes: true,
          enablePrivateServices: true,
          topology: 'star'
        });
        this.advancedForm.patchValue({
          enableRouteFiltering: true,
          enableNetworkIntelligence: true
        });
        break;
      case 'site-to-site':
        this.connectivityForm.patchValue({
          enableOnPremises: true,
          topology: 'full-mesh'
        });
        break;
      case 'sd-wan-integration':
        this.connectivityForm.patchValue({
          enableOnPremises: true,
          onPremMethod: 'partner-interconnect'
        });
        this.advancedForm.patchValue({
          enableTrafficEngineering: true
        });
        break;
      case 'hybrid-multicloud':
        this.connectivityForm.patchValue({
          enableOnPremises: true,
          enableMultiCloud: true,
          enableVpcSpokes: true
        });
        this.regionalForm.patchValue({
          enableMultiRegion: true
        });
        break;
    }
  }

  nextStep() {
    if (this.isCurrentStepValid()) {
      this.steps[this.currentStep].completed = true;
      this.currentStep++;
      if (this.currentStep === 4) {
        this.calculateCostEstimation();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: return this.selectedArchitecture !== '';
      case 1: return this.connectivityForm.valid;
      case 2: return this.advancedForm.valid;
      case 3: return this.regionalForm.valid;
      default: return true;
    }
  }

  generateTerraform() {
    const config = this.buildWANConfig();
    
    this.googleWANService.generateTerraformConfig(config).subscribe({
      next: (result) => {
        this.generatedTerraform = result.terraform;
        this.snackBar.open('Terraform configuration generated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error generating Terraform:', error);
        this.snackBar.open('Error generating Terraform configuration', 'Close', {
          duration: 3000
        });
      }
    });
  }

  private buildWANConfig(): GoogleWANConfig {
    return {
      projectId: this.projectForm.get('projectId')?.value || 'my-project',
      applicationName: this.projectForm.get('applicationName')?.value || 'wan-network',
      primaryRegion: this.regionalForm.get('primaryRegion')?.value,
      wanArchitecture: this.selectedArchitecture as any,
      networkConfig: {
        hubRegion: this.regionalForm.get('primaryRegion')?.value,
        enableGlobalRouting: this.regionalForm.get('routingMode')?.value === 'global',
        enableRouteExchange: this.connectivityForm.get('topology')?.value === 'full-mesh'
      },
      connectivityConfig: {
        onPremConnectivity: {
          enabled: this.connectivityForm.get('enableOnPremises')?.value || false,
          type: this.connectivityForm.get('onPremMethod')?.value || 'ha-vpn',
          enableMacsec: this.advancedForm.get('enableMacSec')?.value || false
        },
        multiCloudConnectivity: {
          enabled: this.connectivityForm.get('enableMultiCloud')?.value || false
        },
        siteToSiteConnectivity: {
          enabled: this.selectedArchitecture === 'site-to-site',
          enableDataTransfer: this.selectedArchitecture === 'site-to-site'
        }
      },
      nccConfig: {
        enableNCC: this.selectedArchitecture === 'ncc-hub-spoke',
        enableNCCGateway: this.advancedForm.get('enableNccGateway')?.value || false,
        enableCustomRoutes: this.advancedForm.get('enableRouteFiltering')?.value || false
      },
      securityConfig: {
        enableCloudArmor: false,
        enableFirewallRules: this.advancedForm.get('enableFirewallPolicies')?.value || false,
        enablePrivateGoogleAccess: this.connectivityForm.get('enablePrivateServices')?.value || false,
        enableCloudNAT: true
      },
      operationsConfig: {
        enableNetworkIntelligence: this.advancedForm.get('enableNetworkIntelligence')?.value || false,
        enableFlowLogs: this.advancedForm.get('enableFlowLogs')?.value || false,
        enableConnectivityTests: this.advancedForm.get('enableConnectivityTests')?.value || false
      }
    };
  }

  private calculateCostEstimation() {
    const onPremEnabled = this.connectivityForm.get('enableOnPremises')?.value;
    const onPremMethod = this.connectivityForm.get('onPremMethod')?.value;
    const multiRegion = this.regionalForm.get('enableMultiRegion')?.value;
    
    let nccCost = 100; // Base NCC cost
    let interconnectCost = 0;
    let vpnCost = 0;
    
    if (onPremEnabled) {
      switch (onPremMethod) {
        case 'dedicated-interconnect':
          interconnectCost = 1600; // 10Gbps Dedicated Interconnect
          break;
        case 'partner-interconnect':
          interconnectCost = 500; // 1Gbps Partner Interconnect
          break;
        case 'ha-vpn':
          vpnCost = 100; // HA VPN tunnels
          break;
      }
    }
    
    if (multiRegion) {
      nccCost *= 2; // Additional region
    }
    
    this.estimatedCost = {
      ncc: nccCost,
      interconnect: interconnectCost,
      vpn: vpnCost,
      total: nccCost + interconnectCost + vpnCost
    };
  }

  getArchitectureDisplayName(arch: string): string {
    const names = {
      'ncc-hub-spoke': 'Network Connectivity Center',
      'site-to-site': 'Site-to-Site Data Transfer',
      'sd-wan-integration': 'SD-WAN Integration',
      'hybrid-multicloud': 'Hybrid & Multi-Cloud'
    };
    return names[arch as keyof typeof names] || arch;
  }

  getTopologyDisplayName(topology: string): string {
    const names = {
      'full-mesh': 'Full Mesh Connectivity',
      'star': 'Star Topology',
      'segmented': 'Segmented Networks'
    };
    return names[topology as keyof typeof names] || topology;
  }

  getOnPremMethodDisplayName(method: string): string {
    const names = {
      'dedicated-interconnect': 'Dedicated Interconnect',
      'partner-interconnect': 'Partner Interconnect',
      'ha-vpn': 'HA VPN'
    };
    return names[method as keyof typeof names] || method;
  }

  copyTerraform() {
    navigator.clipboard.writeText(this.generatedTerraform).then(() => {
      this.snackBar.open('Terraform configuration copied to clipboard!', 'Close', {
        duration: 2000
      });
    });
  }

  downloadTerraform() {
    const blob = new Blob([this.generatedTerraform], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'google-wan-infrastructure.tf';
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
