import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-distributed-application',
  template: `
    <div class="distributed-app-container">
      <!-- Header -->
      <div class="header-container">
        <div class="header-content">
          <h1>Distributed Application Networking Guide</h1>
          <p class="subtitle">Configure networking architecture for distributed applications</p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
            <div class="step-number">1</div>
            <span>Architecture</span>
          </div>
          <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
            <div class="step-number">2</div>
            <span>Configure</span>
          </div>
          <div class="step" [class.active]="currentStep === 3">
            <div class="step-number">3</div>
            <span>Deploy</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="main-content">
        <!-- Side Navigation -->
        <div class="side-nav" *ngIf="currentStep === 2">
          <div class="nav-item" 
               [class.active]="activeSubStep === 'connectivity'"
               (click)="activeSubStep = 'connectivity'">
            <mat-icon>link</mat-icon>
            Private connectivity
          </div>
          <div class="nav-item" 
               [class.active]="activeSubStep === 'cloud'"
               (click)="activeSubStep = 'cloud'">
            <mat-icon>cloud</mat-icon>
            Multi-cloud connectivity
          </div>
        </div>

        <!-- Center Content -->
        <div class="form-content">
          <!-- Step 1: Select Architecture -->
          <div *ngIf="currentStep === 1" class="step-content-area">
            <form [formGroup]="architectureForm">
              <div class="section-header">
                <h2>Network segmentation and project structure</h2>
                <mat-icon class="help-icon" matTooltip="Help information">help_outline</mat-icon>
              </div>

              <!-- Consolidated Infrastructure -->
              <div class="option-card" [class.selected]="architectureForm.get('architecture')?.value === 'consolidated'">
                <mat-radio-button 
                  value="consolidated" 
                  formControlName="architecture"
                  class="option-radio">
                  Consolidated infrastructure host project
                </mat-radio-button>
                <p class="option-description">
                  Use a single infrastructure host project to manage all networking resources for all applications. All 
                  networking across all application VPCs is billed to the consolidated infrastructure host project.
                </p>
                
                <!-- Architecture Diagram -->
                <div class="architecture-diagram">
                  <svg viewBox="0 0 600 400" class="consolidated-diagram">
                    <!-- Customer Location A -->
                    <rect x="20" y="50" width="120" height="140" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="8"/>
                    <text x="80" y="45" text-anchor="middle" class="location-label">Customer Location A</text>
                    
                    <!-- Database -->
                    <rect x="40" y="80" width="80" height="30" fill="#4285f4" stroke="white" stroke-width="2" rx="4"/>
                    <text x="80" y="100" text-anchor="middle" class="node-text">On-premises database A</text>
                    
                    <!-- Cloud -->
                    <ellipse cx="300" cy="200" rx="150" ry="100" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2"/>
                    <text x="300" y="190" text-anchor="middle" class="cloud-label">Google Cloud</text>
                    
                    <!-- Regions -->
                    <rect x="200" y="120" width="80" height="60" fill="#e8f5e8" stroke="#4caf50" stroke-width="2" rx="4"/>
                    <text x="240" y="155" text-anchor="middle" class="region-text">Region A</text>
                    
                    <rect x="320" y="120" width="80" height="60" fill="#fff3e0" stroke="#ff9800" stroke-width="2" rx="4"/>
                    <text x="360" y="155" text-anchor="middle" class="region-text">Region B</text>
                    
                    <!-- Services VPC -->
                    <rect x="220" y="240" width="160" height="40" fill="#e1f5fe" stroke="#03a9f4" stroke-width="2" rx="4"/>
                    <text x="300" y="265" text-anchor="middle" class="vpc-text">Services VPC</text>
                    
                    <!-- Managed Services -->
                    <rect x="450" y="160" width="120" height="80" fill="#fce4ec" stroke="#e91e63" stroke-width="2" rx="4"/>
                    <text x="510" y="190" text-anchor="middle" class="service-text">Managed Services</text>
                    <text x="510" y="210" text-anchor="middle" class="service-text">CloudSQL</text>
                    <text x="510" y="230" text-anchor="middle" class="service-text">Memorystore</text>
                    
                    <!-- Connection lines -->
                    <line x1="140" y1="150" x2="190" y2="150" stroke="#666" stroke-width="2"/>
                    <line x1="280" y1="150" x2="320" y2="150" stroke="#666" stroke-width="2"/>
                    <line x1="300" y1="180" x2="300" y2="240" stroke="#666" stroke-width="2"/>
                    <line x1="380" y1="200" x2="450" y2="200" stroke="#666" stroke-width="2"/>
                  </svg>
                </div>
              </div>

              <!-- Segmented Host Projects -->
              <div class="option-card" [class.selected]="architectureForm.get('architecture')?.value === 'segmented'">
                <mat-radio-button 
                  value="segmented" 
                  formControlName="architecture"
                  class="option-radio">
                  Segmented host projects
                </mat-radio-button>
                <p class="option-description">
                  Use an infrastructure host project in combination with a different host project for each application. 
                  Network service billing is split: infrastructure costs go to the infrastructure host project, while 
                  application-related network charges (like data transfer) go to the application host projects.
                </p>
                
                <!-- Segmented Architecture Diagram -->
                <div class="architecture-diagram">
                  <svg viewBox="0 0 600 500" class="segmented-diagram">
                    <!-- Infrastructure Host Project -->
                    <rect x="50" y="50" width="500" height="100" fill="#f8f9fa" stroke="#dadce0" stroke-width="2" rx="8"/>
                    <text x="300" y="80" text-anchor="middle" class="project-label">Infrastructure host project</text>
                    <text x="300" y="100" text-anchor="middle" class="project-sublabel">Transit VPC</text>
                    
                    <!-- App 1 Host Project -->
                    <rect x="50" y="200" width="200" height="120" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="8"/>
                    <text x="150" y="230" text-anchor="middle" class="app-label">App 1 host project</text>
                    <rect x="70" y="250" width="160" height="50" fill="#bbdefb" stroke="#1976d2" stroke-width="1" rx="4"/>
                    <text x="150" y="280" text-anchor="middle" class="vpc-label">App 1 Shared VPC</text>
                    
                    <!-- App 2 Host Project -->
                    <rect x="300" y="200" width="200" height="120" fill="#fff3e0" stroke="#ff9800" stroke-width="2" rx="8"/>
                    <text x="400" y="230" text-anchor="middle" class="app-label">App 2 host project</text>
                    <rect x="320" y="250" width="160" height="50" fill="#ffcc80" stroke="#ff9800" stroke-width="1" rx="4"/>
                    <text x="400" y="280" text-anchor="middle" class="vpc-label">App 2 Shared VPC</text>
                    
                    <!-- Services VPC -->
                    <rect x="50" y="380" width="450" height="60" fill="#e8f5e8" stroke="#4caf50" stroke-width="2" rx="8"/>
                    <text x="275" y="415" text-anchor="middle" class="service-label">Services VPC</text>
                    
                    <!-- Connection lines -->
                    <line x1="150" y1="150" x2="150" y2="200" stroke="#666" stroke-width="2"/>
                    <line x1="400" y1="150" x2="400" y2="200" stroke="#666" stroke-width="2"/>
                    <line x1="300" y1="150" x2="300" y2="380" stroke="#666" stroke-width="2"/>
                    <line x1="150" y1="320" x2="150" y2="380" stroke="#666" stroke-width="2"/>
                    <line x1="400" y1="320" x2="400" y2="380" stroke="#666" stroke-width="2"/>
                  </svg>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 2: Review and Modify Details -->
          <div *ngIf="currentStep === 2" class="step-content-area">
            <form [formGroup]="configForm">
              <!-- Private Connections Section -->
              <div *ngIf="activeSubStep === 'connectivity'" class="form-section">
                <h2>Private connections to on-premises data center</h2>
                
                <div class="bandwidth-section">
                  <h3>Bandwidth <mat-icon class="help-icon">help_outline</mat-icon></h3>
                  
                  <mat-radio-group formControlName="bandwidth" class="bandwidth-options">
                    <mat-radio-button value="redundancy" class="bandwidth-option">
                      <div class="option-content">
                        <div class="option-title">Redundancy (High availability)</div>
                        <div class="option-subtitle">By connecting the networks in multiple regions, the availability SLA can increase to 99.99%.</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="no-redundancy" class="bandwidth-option">
                      <div class="option-content">
                        <div class="option-title">No redundancy (Low availability)</div>
                        <div class="option-subtitle">Single points of connectivity</div>
                      </div>
                    </mat-radio-button>
                  </mat-radio-group>

                  <!-- Hybrid Connectivity Options -->
                  <div class="hybrid-connectivity">
                    <h4>Hybrid Connectivity options</h4>
                    <mat-form-field appearance="outline" class="connectivity-select">
                      <mat-label>Select connectivity type</mat-label>
                      <mat-select formControlName="connectivity">
                        <mat-option value="dedicated">Dedicated Interconnect</mat-option>
                        <mat-option value="partner">Partner Interconnect</mat-option>
                        <mat-option value="vpn">Cloud VPN</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <p class="connectivity-note">Suggestion based on bandwidth needs</p>
                  </div>

                  <!-- On-premise Location -->
                  <div class="location-section">
                    <h4>On-premise location <mat-icon class="help-icon">help_outline</mat-icon></h4>
                    
                    <mat-radio-group formControlName="location" class="location-options">
                      <mat-radio-button value="multiple" class="location-option">
                        <div class="option-content">
                          <div class="option-title">Multiple regions</div>
                          <div class="option-subtitle">For better backup and higher availability (99.99% SLA), connect networks in multiple regions.</div>
                        </div>
                      </mat-radio-button>
                      
                      <mat-radio-button value="single" class="location-option">
                        <div class="option-content">
                          <div class="option-title">Single region</div>
                          <div class="option-subtitle">Start with single-region routing, then expand to multi-region routing.</div>
                        </div>
                      </mat-radio-button>
                    </mat-radio-group>

                    <!-- Region and Capacity -->
                    <div class="region-capacity">
                      <mat-form-field appearance="outline">
                        <mat-label>Region *</mat-label>
                        <mat-select formControlName="region">
                          <mat-option value="us-central1">us-central1</mat-option>
                          <mat-option value="us-east1">us-east1</mat-option>
                          <mat-option value="europe-west1">europe-west1</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <button mat-stroked-button color="primary" class="add-region-btn">
                        <mat-icon>add</mat-icon>
                        ADD A REGION
                      </button>

                      <mat-form-field appearance="outline">
                        <mat-label>Capacity *</mat-label>
                        <mat-select formControlName="capacity">
                          <mat-option value="10gb">10 Gb/s</mat-option>
                          <mat-option value="50gb">50 Gb/s</mat-option>
                          <mat-option value="100gb">100 Gb/s</mat-option>
                        </mat-select>
                        <mat-icon matSuffix class="help-icon">help_outline</mat-icon>
                      </mat-form-field>
                      <p class="capacity-note">Available in 10 Gb/s and 100 Gb/s physical links</p>

                      <mat-checkbox formControlName="macSecEnabled" class="macsec-checkbox">
                        MACsec encryption
                      </mat-checkbox>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Multi-cloud Connectivity Section -->
              <div *ngIf="activeSubStep === 'cloud'" class="form-section">
                <h2>Multi-cloud connectivity</h2>
                
                <div class="cloud-provider-section">
                  <h3>Cloud provider <mat-icon class="help-icon">help_outline</mat-icon></h3>
                  
                  <mat-form-field appearance="outline" class="provider-select">
                    <mat-label>Select cloud provider</mat-label>
                    <mat-select formControlName="cloudProvider">
                      <mat-option value="aws">Amazon Web Services (AWS)</mat-option>
                      <mat-option value="azure">Microsoft Azure</mat-option>
                      <mat-option value="oracle">Oracle Cloud Infrastructure</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-radio-group formControlName="cloudBandwidth">
                    <mat-radio-button value="redundancy" class="bandwidth-option">
                      <div class="option-content">
                        <div class="option-title">Redundancy (High availability)</div>
                        <div class="option-subtitle">Connect across multiple regions for better availability.</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="no-redundancy" class="bandwidth-option">
                      <div class="option-content">
                        <div class="option-title">No redundancy (Low availability)</div>
                        <div class="option-subtitle">Single region connectivity.</div>
                      </div>
                    </mat-radio-button>
                  </mat-radio-group>
                </div>
              </div>
            </form>
          </div>

          <!-- Step 3: Deploy -->
          <div *ngIf="currentStep === 3" class="step-content-area">
            <div class="deploy-section">
              <h2>Deploy your architecture</h2>
              <p>Your distributed application networking configuration is ready to deploy.</p>
              
              <div class="deploy-summary">
                <h3>Configuration Summary</h3>
                <div class="summary-item">
                  <strong>Architecture:</strong> {{ architectureForm.get('architecture')?.value }}
                </div>
                <div class="summary-item">
                  <strong>Bandwidth:</strong> {{ configForm.get('bandwidth')?.value }}
                </div>
                <div class="summary-item">
                  <strong>Connectivity:</strong> {{ configForm.get('connectivity')?.value }}
                </div>
                <div class="summary-item">
                  <strong>Location:</strong> {{ configForm.get('location')?.value }}
                </div>
              </div>
              
              <button mat-raised-button color="primary" class="deploy-btn">
                <mat-icon>cloud_upload</mat-icon>
                Deploy Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button mat-stroked-button *ngIf="currentStep > 1" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
        <span class="spacer"></span>
        <button mat-raised-button color="primary" *ngIf="currentStep < 3" (click)="continue()">
          Continue
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./distributed-application.component.scss']
})
export class DistributedApplicationComponent {
  currentStep = 1;
  activeSubStep = 'connectivity';
  
  // Form data
  architectureForm = this.fb.group({
    architecture: ['consolidated'],
    bandwidth: ['redundancy'],
    connectivity: ['dedicated'],
    location: ['multiple'],
    region: ['us-central1'],
    capacity: ['10gb'],
    macSecEnabled: [false],
    cloudProvider: ['aws'],
    cloudBandwidth: ['redundancy']
  });

  configForm = this.fb.group({
    bandwidth: ['redundancy'],
    connectivity: ['dedicated'],
    location: ['multiple'],
    region: ['us-central1'],
    capacity: ['10gb'],
    macSecEnabled: [false],
    cloudProvider: ['aws'],
    cloudBandwidth: ['redundancy']
  });

  constructor(private fb: FormBuilder) {}

  continue() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
} 