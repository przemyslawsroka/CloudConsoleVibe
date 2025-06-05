import { Component } from '@angular/core';

@Component({
  selector: 'app-distributed-application',
  template: `
    <div class="distributed-app-container">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/network-solutions">Network Solutions</a>
        <span class="separator">></span>
        <span>Distributed Applications</span>
      </nav>

      <!-- Header -->
      <div class="header">
        <button mat-icon-button class="back-btn" routerLink="/network-solutions">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1>Create a Cross-Cloud Network Distributed Application</h1>
          <div class="header-actions">
            <button mat-button class="learn-btn">
              <mat-icon>school</mat-icon>
              LEARN
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Sidebar - Steps -->
        <div class="steps-sidebar">
          <div class="step-item" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
            <div class="step-number">
              <mat-icon *ngIf="currentStep > 1">check</mat-icon>
              <span *ngIf="currentStep <= 1">1</span>
            </div>
            <div class="step-content">
              <div class="step-title">Select architecture</div>
              <div class="step-description">Description Text</div>
            </div>
          </div>

          <div class="step-item" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
            <div class="step-number">
              <mat-icon *ngIf="currentStep > 2">check</mat-icon>
              <span *ngIf="currentStep <= 2">2</span>
            </div>
            <div class="step-content">
              <div class="step-title">Review and modify details</div>
              <div class="step-description">Description Text</div>
              
              <!-- Sub-steps for step 2 -->
              <div class="sub-steps" *ngIf="currentStep === 2">
                <div class="sub-step" [class.active]="activeSubStep === 'connectivity'">
                  <mat-icon>radio_button_checked</mat-icon>
                  <span>Connectivity</span>
                </div>
                <div class="sub-step" [class.active]="activeSubStep === 'service'">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>Service networking</span>
                </div>
                <div class="sub-step" [class.active]="activeSubStep === 'security'">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>Network security</span>
                </div>
              </div>
            </div>
          </div>

          <div class="step-item" [class.active]="currentStep === 3">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">Deploy</div>
              <div class="step-description">Description Text</div>
            </div>
          </div>
        </div>

        <!-- Center Content -->
        <div class="form-content">
          <!-- Step 1: Select Architecture -->
          <div *ngIf="currentStep === 1" class="step-content-area">
            <div class="section-header">
              <h2>Network segmentation and project structure</h2>
              <mat-icon class="help-icon" matTooltip="Help information">help_outline</mat-icon>
            </div>

            <!-- Consolidated Infrastructure -->
            <div class="option-card" [class.selected]="selectedArchitecture === 'consolidated'">
              <mat-radio-button 
                value="consolidated" 
                [(ngModel)]="selectedArchitecture"
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
            <div class="option-card" [class.selected]="selectedArchitecture === 'segmented'">
              <mat-radio-button 
                value="segmented" 
                [(ngModel)]="selectedArchitecture"
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
          </div>

          <!-- Step 2: Review and Modify Details -->
          <div *ngIf="currentStep === 2" class="step-content-area">
            <!-- Private Connections Section -->
            <div class="form-section">
              <h2>Private connections to on-premises data center</h2>
              
              <div class="bandwidth-section">
                <h3>Bandwidth <mat-icon class="help-icon">help_outline</mat-icon></h3>
                
                <mat-radio-group [(ngModel)]="selectedBandwidth" class="bandwidth-options">
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
                    <mat-select [(value)]="selectedConnectivity">
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
                  
                  <mat-radio-group [(ngModel)]="selectedLocation" class="location-options">
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
                      <mat-select [(value)]="selectedRegion">
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
                      <mat-select [(value)]="selectedCapacity">
                        <mat-option value="10gb">10 Gb/s</mat-option>
                        <mat-option value="50gb">50 Gb/s</mat-option>
                        <mat-option value="100gb">100 Gb/s</mat-option>
                      </mat-select>
                      <mat-icon matSuffix class="help-icon">help_outline</mat-icon>
                    </mat-form-field>
                    <p class="capacity-note">Available in 10 Gb/s and 100 Gb/s physical links</p>

                    <mat-checkbox [(ngModel)]="macSecEnabled" class="macsec-checkbox">
                      Order a MACsec capable port
                      <mat-icon class="help-icon">help_outline</mat-icon>
                    </mat-checkbox>
                    <p class="macsec-note">You cannot modify your selection after the interconnect is provisioned. If selected, additional port order charges will apply. Selecting this option does not enable MACsec encryption. You enable MACsec later when you create a pre-shared key.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Private Connections to Other Cloud -->
            <div class="form-section">
              <h2>Private connections to other cloud service provider</h2>
              
              <mat-form-field appearance="outline" class="cloud-provider-select">
                <mat-label>Cloud service provider *</mat-label>
                <mat-select [(value)]="selectedCloudProvider">
                  <mat-option value="aws">Amazon Web Services</mat-option>
                  <mat-option value="azure">Microsoft Azure</mat-option>
                  <mat-option value="other">Other</mat-option>
                </mat-select>
                <mat-icon matSuffix class="help-icon">help_outline</mat-icon>
              </mat-form-field>

              <!-- Similar bandwidth and connectivity options for cloud provider -->
              <div class="cloud-bandwidth-section">
                <h3>Bandwidth <mat-icon class="help-icon">help_outline</mat-icon></h3>
                <mat-radio-group [(ngModel)]="selectedCloudBandwidth">
                  <mat-radio-button value="redundancy">Redundancy (High availability)</mat-radio-button>
                  <mat-radio-button value="no-redundancy">No redundancy (Low availability)</mat-radio-button>
                </mat-radio-group>
              </div>
            </div>

            <!-- Network Connectivity Center -->
            <div class="form-section">
              <h2>Inter-VPC Connectivity with Network Connectivity Center</h2>
              <p class="section-description">
                We recommend that the application VPCs, transit VPCs and services access VPCs all connect using Network 
                Connectivity Center VPC spokes.
              </p>

              <!-- Hub Setup -->
              <div class="hub-setup">
                <h3>Hub setup</h3>
                <p>Select a preset topology that matches your use case.</p>

                <div class="topology-options">
                  <!-- Mesh Topology -->
                  <div class="topology-card" [class.selected]="selectedTopology === 'mesh'">
                    <div class="topology-header">
                      <h4>Mesh</h4>
                      <mat-icon *ngIf="selectedTopology === 'mesh'" class="selected-icon">check</mat-icon>
                      <button *ngIf="selectedTopology !== 'mesh'" mat-button color="primary" (click)="selectTopology('mesh')">SELECT</button>
                    </div>
                    <p class="topology-description">
                      All spokes attached to a hub can communicate with each other in one hub route table. Does not support gateway spoke type.
                      <a href="#" class="learn-more">Learn more</a>
                    </p>
                    
                    <!-- Mesh Diagram -->
                    <div class="topology-diagram">
                      <svg viewBox="0 0 200 150" class="mesh-diagram">
                        <circle cx="50" cy="50" r="20" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="150" cy="50" r="20" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="50" cy="100" r="20" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="150" cy="100" r="20" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <!-- Connecting lines -->
                        <line x1="70" y1="50" x2="130" y2="50" stroke="#4285f4" stroke-width="2"/>
                        <line x1="50" y1="70" x2="50" y2="80" stroke="#4285f4" stroke-width="2"/>
                        <line x1="150" y1="70" x2="150" y2="80" stroke="#4285f4" stroke-width="2"/>
                        <line x1="70" y1="100" x2="130" y2="100" stroke="#4285f4" stroke-width="2"/>
                        <line x1="65" y1="65" x2="135" y2="85" stroke="#4285f4" stroke-width="2"/>
                        <line x1="135" y1="65" x2="65" y2="85" stroke="#4285f4" stroke-width="2"/>
                      </svg>
                    </div>
                  </div>

                  <!-- Star Topology -->
                  <div class="topology-card" [class.selected]="selectedTopology === 'star'">
                    <div class="topology-header">
                      <h4>Star</h4>
                      <button mat-button color="primary" (click)="selectTopology('star')">SELECT</button>
                    </div>
                    <p class="topology-description">
                      Only designated edge and center spokes can communicate with each other, thus ensuring segmentation 
                      and connectivity separation across edge spokes.
                      <a href="#" class="learn-more">Learn more</a>
                    </p>
                    
                    <!-- Star Diagram -->
                    <div class="topology-diagram">
                      <svg viewBox="0 0 200 150" class="star-diagram">
                        <circle cx="100" cy="75" r="15" fill="#ea4335" stroke="white" stroke-width="2"/>
                        <circle cx="50" cy="30" r="12" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="150" cy="30" r="12" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="50" cy="120" r="12" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <circle cx="150" cy="120" r="12" fill="#4285f4" stroke="white" stroke-width="2"/>
                        <!-- Lines from center to edges -->
                        <line x1="90" y1="65" x2="60" y2="40" stroke="#666" stroke-width="2"/>
                        <line x1="110" y1="65" x2="140" y2="40" stroke="#666" stroke-width="2"/>
                        <line x1="90" y1="85" x2="60" y2="110" stroke="#666" stroke-width="2"/>
                        <line x1="110" y1="85" x2="140" y2="110" stroke="#666" stroke-width="2"/>
                      </svg>
                    </div>
                  </div>

                  <!-- Hybrid Inspection -->
                  <div class="topology-card" [class.selected]="selectedTopology === 'hybrid'">
                    <div class="topology-header">
                      <h4>Hybrid inspection</h4>
                      <button mat-button color="primary" (click)="selectTopology('hybrid')">SELECT</button>
                    </div>
                    <p class="topology-description">
                      Customize traffic processing between your interconnect and connected VPC networks using an 
                      advanced spoke. Gateway spokes protect VLAN attachments in the gateway group.
                      <a href="#" class="learn-more">Learn more</a>
                    </p>
                    
                    <!-- Hybrid Diagram -->
                    <div class="topology-diagram">
                      <svg viewBox="0 0 200 150" class="hybrid-diagram">
                        <!-- Gateway group -->
                        <rect x="80" y="30" width="40" height="30" fill="#34a853" stroke="white" stroke-width="2" rx="4"/>
                        <text x="100" y="50" text-anchor="middle" class="diagram-text">GW</text>
                        
                        <!-- Service groups -->
                        <rect x="30" y="90" width="30" height="20" fill="#4285f4" stroke="white" stroke-width="2" rx="4"/>
                        <rect x="85" y="90" width="30" height="20" fill="#4285f4" stroke="white" stroke-width="2" rx="4"/>
                        <rect x="140" y="90" width="30" height="20" fill="#4285f4" stroke="white" stroke-width="2" rx="4"/>
                        
                        <!-- Non-prod group -->
                        <rect x="85" y="120" width="30" height="20" fill="#9aa0a6" stroke="white" stroke-width="2" rx="4"/>
                        
                        <!-- Connection lines -->
                        <line x1="100" y1="60" x2="45" y2="90" stroke="#666" stroke-width="2"/>
                        <line x1="100" y1="60" x2="100" y2="90" stroke="#666" stroke-width="2"/>
                        <line x1="100" y1="60" x2="155" y2="90" stroke="#666" stroke-width="2"/>
                        <line x1="100" y1="110" x2="100" y2="120" stroke="#666" stroke-width="2"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Sidebar - Pricing and Code -->
        <div class="right-sidebar">
          <!-- Pricing Summary -->
          <div class="pricing-card">
            <h3>Pricing summary</h3>
            <div class="pricing-item">
              <strong>$XXXX.XX per month</strong>
              <span class="pricing-note">estimated</span>
            </div>
            <div class="pricing-detail">
              Effective hourly rate $XX.XX (730 hours per month)
            </div>
            
            <div class="pricing-breakdown">
              <div class="pricing-row">
                <span>Item</span>
                <span>Estimated costs</span>
              </div>
              <div class="pricing-row">
                <span>10 Gb/s</span>
                <span>$XXXX.XX/month</span>
              </div>
              <div class="pricing-row">
                <span>10 Gb/s (redundancy)</span>
                <span>$XXXX.XX/month</span>
              </div>
              <div class="pricing-row">
                <span>10 Gb/s</span>
                <span>$XXXX.XX/month</span>
              </div>
              <div class="pricing-row">
                <span>VLAN attachment pricing depends on its capacity</span>
                <a href="#" class="pricing-link">Interconnect pricing</a>
              </div>
            </div>
            
            <button mat-button class="hide-pricing-btn">
              <mat-icon>expand_less</mat-icon>
              HIDE PRICING DETAILS
            </button>
          </div>

          <!-- Terraform Code -->
          <div class="terraform-card">
            <div class="terraform-header">
              <span>Equivalent code</span>
              <div class="code-tabs">
                <button class="tab-btn">Command line</button>
                <button class="tab-btn">REST</button>
                <button class="tab-btn active">Terraform</button>
                <button class="tab-btn new">New</button>
              </div>
            </div>
            <div class="terraform-code">
              <pre><code># This code is compatible with Terraform 4.25.0 and versions that are
# backwards compatible to 4.25.0.
# For information about validating this Terraform code, see
# https://developer.hashicorp.com/terraform/tutorials/gcp-get-started/google-cloud-platform-build#format-and-validate-the-configuration

resource "google_compute_network_firewall_policy" "policy" &#123;
  name = "tf-test-policy-with-rules"
  description = "Terraform test"
  provider = google-beta
&#125;

rule &#123;
  description = "tcp rule"
  priority = 1000
  enable_logging = true
  action = "allow"
  direction = "EGRESS"
  match &#123;
    layer4_configs &#123;
      ip_protocol = "tcp"
      ports = ["8080, 7070"]
    &#125;
    dest_ip_ranges = ["11.100.0.1/32"]
    dest_fqdns = ["www.yyy.com", "www.zzz.com"]
    dest_region_codes = ["US"]
    dest_threat_intelligences = ["iplist-search-engines-crawlers", "iplist-tor-exit-nodes"]
  &#125;
  target_secure_tags &#123;
    name = "tagValues/&#36;&#123;google_tags_tag_value.secure_tag_value_1.id&#125;"
  &#125;
&#125;
</code></pre>
            </div>
            <div class="terraform-footer">
              <p>Notice the terraform equivalent code continues to evolve as the user fills out the form</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Actions -->
      <div class="bottom-actions">
        <button mat-button (click)="goBack()" [disabled]="currentStep === 1">CANCEL</button>
        <button mat-raised-button color="primary" (click)="continue()" class="continue-btn">
          {{ currentStep === 3 ? 'DEPLOY' : 'CONTINUE' }}
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
  selectedArchitecture = 'consolidated';
  selectedBandwidth = 'redundancy';
  selectedConnectivity = 'dedicated';
  selectedLocation = 'multiple';
  selectedRegion = '';
  selectedCapacity = '10gb';
  macSecEnabled = false;
  selectedCloudProvider = '';
  selectedCloudBandwidth = 'redundancy';
  selectedTopology = 'mesh';

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

  selectTopology(topology: string) {
    this.selectedTopology = topology;
  }
} 