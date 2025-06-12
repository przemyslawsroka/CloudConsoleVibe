import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TPPIService } from '../../services/tppi.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-tppi-setup-wizard',
  template: `
    <div class="wizard-container">
      <div class="wizard-content">
        <div class="wizard-header">
          <h2>{{ getWizardTitle() }}</h2>
          <p>{{ getWizardDescription() }}</p>
        </div>

        <!-- Step Indicator -->
        <div class="step-indicator">
          <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
            <div class="step-number">1</div>
            <span>Role Selection</span>
          </div>
          <div class="step-connector"></div>
          <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
            <div class="step-number">2</div>
            <span>Configuration</span>
          </div>
          <div class="step-connector"></div>
          <div class="step" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
            <div class="step-number">3</div>
            <span>Resources</span>
          </div>
          <div class="step-connector"></div>
          <div class="step" [class.active]="currentStep === 4" [class.completed]="currentStep > 4">
            <div class="step-number">4</div>
            <span>Review</span>
          </div>
        </div>

        <!-- Step 1: Role Selection -->
        <div *ngIf="currentStep === 1" class="step-content">
          <h3>Step 1: Choose Your Role</h3>
          <p>First, let's determine what you want to accomplish with TPPI:</p>

          <div class="role-selection">
            <mat-card class="role-card" [class.selected]="selectedRole === 'producer'" (click)="selectRole('producer')">
              <mat-card-content>
                <mat-icon class="role-icon producer">business</mat-icon>
                <h4>Security Service Producer</h4>
                <p>I want to <strong>provide security services</strong> to other organizations</p>
                <ul class="role-features">
                  <li>Deploy security appliances (firewall, IDS, etc.)</li>
                  <li>Make services available via TPPI</li>
                  <li>Manage deployment groups and zones</li>
                  <li>Configure ILB frontends for appliances</li>
                </ul>
              </mat-card-content>
            </mat-card>

            <mat-card class="role-card" [class.selected]="selectedRole === 'consumer'" (click)="selectRole('consumer')">
              <mat-card-content>
                <mat-icon class="role-icon consumer">person</mat-icon>
                <h4>Traffic Owner (Consumer)</h4>
                <p>I want to <strong>use third-party security services</strong> for my traffic</p>
                <ul class="role-features">
                  <li>Redirect my network traffic for inspection</li>
                  <li>Connect to external security services</li>
                  <li>Apply security policies to VPC networks</li>
                  <li>Manage traffic interception rules</li>
                </ul>
              </mat-card-content>
            </mat-card>
          </div>

          <div *ngIf="selectedRole" class="role-explanation">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="explanation-content">
              <h4 *ngIf="selectedRole === 'producer'">As a Security Service Producer:</h4>
              <h4 *ngIf="selectedRole === 'consumer'">As a Traffic Owner (Consumer):</h4>
              <p *ngIf="selectedRole === 'producer'">
                You'll create deployment groups and deployments to make your security services available.
                Other organizations can then connect to your services to inspect their traffic.
              </p>
              <p *ngIf="selectedRole === 'consumer'">
                You'll create endpoint groups that reference external security services, then associate
                them with your VPC networks to enable traffic interception.
              </p>
            </div>
          </div>
        </div>

        <!-- Step 2: Configuration -->
        <div *ngIf="currentStep === 2" class="step-content">
          <h3 *ngIf="selectedRole === 'producer'">Step 2: Producer Configuration</h3>
          <h3 *ngIf="selectedRole === 'consumer'">Step 2: Consumer Configuration</h3>

          <!-- Producer Configuration -->
          <div *ngIf="selectedRole === 'producer'">
            <p>Configure your security service deployment:</p>

            <form [formGroup]="producerForm" class="config-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Deployment Group Name *</mat-label>
                <input matInput formControlName="deploymentGroupName" placeholder="my-security-service">
                <mat-icon matSuffix matTooltip="Logical container for your security service deployments">info</mat-icon>
                <mat-hint>Choose a descriptive name for your security service</mat-hint>
                <mat-error *ngIf="producerForm.get('deploymentGroupName')?.hasError('required')">
                  Deployment group name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" 
                  placeholder="Describe your security service and its capabilities"></textarea>
                <mat-hint>Help consumers understand what your service does</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Producer VPC Network *</mat-label>
                <mat-select formControlName="network">
                  <mat-option value="vpc-1">default</mat-option>
                  <mat-option value="vpc-2">production-vpc</mat-option>
                  <mat-option value="vpc-3">development-vpc</mat-option>
                </mat-select>
                <mat-hint>VPC network where your security appliances are deployed</mat-hint>
                <mat-error *ngIf="producerForm.get('network')?.hasError('required')">
                  Network selection is required
                </mat-error>
              </mat-form-field>

              <div class="deployment-zones">
                <h4>Deployment Zones</h4>
                <p>Select zones where you want to deploy security appliances:</p>
                
                <!-- Zone Selection Strategy -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Zone Selection Strategy</mat-label>
                  <mat-select [(value)]="zoneSelectionStrategy" (selectionChange)="onZoneStrategyChange()">
                    <mat-option value="all-regions">All zones in all regions ({{ availableZones.length }} zones)</mat-option>
                    <mat-option value="specific-regions">Select by regions</mat-option>
                    <mat-option value="specific-zones">Select individual zones</mat-option>
                  </mat-select>
                  <mat-hint>Choose how to select deployment zones</mat-hint>
                </mat-form-field>

                <!-- Region Selection -->
                <div *ngIf="zoneSelectionStrategy === 'specific-regions'" class="region-selection">
                  <h5>Select Regions:</h5>
                  <div class="regions-grid">
                    <mat-checkbox *ngFor="let region of availableRegions" 
                                 [checked]="selectedRegions.includes(region.id)"
                                 (change)="onRegionChange($event, region.id)"
                                 [value]="region.id">
                      <div class="region-info">
                        <span class="region-name">{{ region.name }}</span>
                        <span class="region-location">{{ region.location }}</span>
                        <span class="zone-count">({{ getZonesInRegion(region.id).length }} zones)</span>
                      </div>
                    </mat-checkbox>
                  </div>
                </div>

                <!-- Individual Zone Selection -->
                <div *ngIf="zoneSelectionStrategy === 'specific-zones'" class="zone-selection">
                  <h5>Search and Select Zones:</h5>
                  
                  <!-- Search -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Search zones...</mat-label>
                    <input matInput [(ngModel)]="zoneSearchTerm" (input)="updateFilteredZones()" placeholder="Type zone name or region">
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>
                  
                  <!-- Selected Zones Display -->
                  <div class="selected-zones-display" *ngIf="selectedZones.length > 0">
                    <h6>Selected Zones ({{ selectedZones.length }}):</h6>
                    <div class="selected-zones-chips">
                      <mat-chip-set>
                        <mat-chip *ngFor="let zoneId of selectedZones" 
                                 (removed)="removeZone(zoneId)"
                                 removable="true">
                          {{ zoneId }}
                          <mat-icon matChipRemove>cancel</mat-icon>
                        </mat-chip>
                      </mat-chip-set>
                    </div>
                  </div>

                  <!-- Available Zones -->
                  <div class="available-zones">
                    <h6>Available Zones ({{ getDisplayedZones().length }}):</h6>
                    <div class="zones-checkboxes">
                      <mat-checkbox *ngFor="let zone of getDisplayedZones()" 
                                   [checked]="selectedZones.includes(zone.id)"
                                   (change)="onZoneToggle($event, zone.id)"
                                   [value]="zone.id">
                        <div class="zone-info">
                          <span class="zone-name">{{ zone.id }}</span>
                          <span class="zone-region">{{ zone.region }}</span>
                        </div>
                      </mat-checkbox>
                    </div>
                  </div>
                </div>

                <!-- Summary -->
                <div class="zone-summary" *ngIf="getEffectiveZoneCount() > 0">
                  <mat-card class="summary-card">
                    <mat-card-content>
                      <div class="summary-content">
                        <mat-icon color="primary">info</mat-icon>
                        <div>
                          <strong>{{ getEffectiveZoneCount() }} zones</strong> will be used for deployment
                          <div class="summary-details" *ngIf="zoneSelectionStrategy === 'specific-regions'">
                            Regions: {{ selectedRegions.join(', ') }}
                          </div>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </form>
          </div>

          <!-- Consumer Configuration -->
          <div *ngIf="selectedRole === 'consumer'">
            <p>Configure traffic interception for your networks:</p>

            <form [formGroup]="consumerForm" class="config-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Endpoint Group Name *</mat-label>
                <input matInput formControlName="endpointGroupName" placeholder="corp-security-endpoints">
                <mat-icon matSuffix matTooltip="Virtual representation of the security service you want to use">info</mat-icon>
                <mat-hint>Choose a name that identifies the security service</mat-hint>
                <mat-error *ngIf="consumerForm.get('endpointGroupName')?.hasError('required')">
                  Endpoint group name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Security Service Provider *</mat-label>
                <mat-select formControlName="deploymentGroup">
                  <mat-option value="provider-1">Enterprise Firewall Service - Security Corp</mat-option>
                  <mat-option value="provider-2">Advanced IDS/IPS - CyberSec Inc</mat-option>
                  <mat-option value="provider-3">Cloud Security Suite - SecureNet Ltd</mat-option>
                </mat-select>
                <mat-hint>Choose the security service you want to use</mat-hint>
                <mat-error *ngIf="consumerForm.get('deploymentGroup')?.hasError('required')">
                  Security service provider is required
                </mat-error>
              </mat-form-field>

              <div class="vpc-selection">
                <h4>VPC Networks to Protect</h4>
                <p>Select which VPC networks should have their traffic intercepted:</p>
                <div class="networks-grid">
                  <mat-checkbox [checked]="selectedNetworks.includes('vpc-1')"
                               (change)="onNetworkChange($event, 'vpc-1')"
                               value="vpc-1">
                    default
                    <span class="network-description">Default VPC network</span>
                  </mat-checkbox>
                  <mat-checkbox [checked]="selectedNetworks.includes('vpc-2')"
                               (change)="onNetworkChange($event, 'vpc-2')"
                               value="vpc-2">
                    production-vpc
                    <span class="network-description">Production environment</span>
                  </mat-checkbox>
                  <mat-checkbox [checked]="selectedNetworks.includes('vpc-3')"
                               (change)="onNetworkChange($event, 'vpc-3')"
                               value="vpc-3">
                    development-vpc
                    <span class="network-description">Development environment</span>
                  </mat-checkbox>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Step 3: Resources -->
        <div *ngIf="currentStep === 3" class="step-content">
          <h3>Step 3: Configure Resources</h3>

          <!-- Producer Resources -->
          <div *ngIf="selectedRole === 'producer'">
            <p>Configure security appliance deployments:</p>

            <div class="deployments-section">
              <h4>Security Appliance Deployments</h4>
              <p>Deployments will be created for selected zones. Configuration details will be handled automatically.</p>
              <div class="selected-zones-summary">
                <h5>Selected Zones:</h5>
                <div class="zones-list">
                  <mat-chip *ngIf="selectedZones.includes('us-central1-a')">us-central1-a</mat-chip>
                  <mat-chip *ngIf="selectedZones.includes('us-central1-b')">us-central1-b</mat-chip>
                  <mat-chip *ngIf="selectedZones.includes('us-east1-a')">us-east1-a</mat-chip>
                  <mat-chip *ngIf="selectedZones.includes('europe-west1-a')">europe-west1-a</mat-chip>
                </div>
              </div>
            </div>
          </div>

          <!-- Consumer Resources -->
          <div *ngIf="selectedRole === 'consumer'">
            <p>Configure security profiles and associations:</p>

            <div class="security-profiles-section">
              <h4>Security Profile Configuration</h4>
              <form [formGroup]="securityProfileForm" class="profile-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Security Profile Name *</mat-label>
                  <input matInput formControlName="profileName" placeholder="custom-intercept-profile">
                  <mat-error *ngIf="securityProfileForm.get('profileName')?.hasError('required')">
                    Profile name is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Profile Type</mat-label>
                  <mat-select formControlName="profileType" [disabled]="true">
                    <mat-option value="CustomIntercept">Custom Intercept</mat-option>
                  </mat-select>
                  <mat-hint>TPPI uses Custom Intercept profiles for third-party services</mat-hint>
                </mat-form-field>
              </form>

              <h4>VPC Network Associations</h4>
              <div class="associations-list">
                <div *ngFor="let networkId of selectedNetworks" class="association-item">
                  <mat-card class="association-card">
                    <mat-card-content>
                      <div class="association-header">
                        <h5>{{ getNetworkName(networkId) }}</h5>
                        <mat-chip color="primary">{{ getNetworkType(networkId) }}</mat-chip>
                      </div>
                      <p>Traffic from this VPC will be intercepted and sent to the security service</p>
                      <div class="association-details">
                        <span><strong>Zones:</strong> Auto-configured based on security service availability</span>
                        <span><strong>PSC Endpoints:</strong> Will be created automatically</span>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Review -->
        <div *ngIf="currentStep === 4" class="step-content">
          <h3>Step 4: Review Configuration</h3>
          <p>Please review your TPPI configuration before proceeding:</p>

          <div class="review-section">
            <mat-card class="review-card">
              <mat-card-header>
                <mat-card-title>Configuration Summary</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="review-item">
                  <strong>Role:</strong> {{ selectedRole === 'producer' ? 'Security Service Producer' : 'Traffic Owner (Consumer)' }}
                </div>

                <!-- Producer Review -->
                <div *ngIf="selectedRole === 'producer'">
                  <div class="review-item">
                    <strong>Deployment Group:</strong> {{ producerForm.get('deploymentGroupName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Description:</strong> {{ producerForm.get('description')?.value || 'Not specified' }}
                  </div>
                  <div class="review-item">
                    <strong>Network:</strong> {{ getNetworkName(producerForm.get('network')?.value) }}
                  </div>
                  <div class="review-item">
                    <strong>Deployment Strategy:</strong> {{ getZoneStrategyDisplayName() }}
                  </div>
                  <div class="review-item">
                    <strong>Deployment Zones ({{ getEffectiveZoneCount() }}):</strong>
                    <div class="zones-list" *ngIf="getEffectiveZoneCount() <= 10">
                      <mat-chip *ngFor="let zoneId of getEffectiveZones().slice(0, 10)">{{ zoneId }}</mat-chip>
                      <mat-chip *ngIf="getEffectiveZoneCount() > 10" color="accent">+{{ getEffectiveZoneCount() - 10 }} more</mat-chip>
                    </div>
                    <div *ngIf="getEffectiveZoneCount() > 10" class="zones-summary">
                      <span>{{ getEffectiveZoneCount() }} zones selected</span>
                      <span *ngIf="zoneSelectionStrategy === 'specific-regions'"> across {{ selectedRegions.length }} regions</span>
                    </div>
                  </div>
                </div>

                <!-- Consumer Review -->
                <div *ngIf="selectedRole === 'consumer'">
                  <div class="review-item">
                    <strong>Endpoint Group:</strong> {{ consumerForm.get('endpointGroupName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Security Provider:</strong> {{ getProviderName(consumerForm.get('deploymentGroup')?.value) }}
                  </div>
                  <div class="review-item">
                    <strong>Security Profile:</strong> {{ securityProfileForm.get('profileName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Protected Networks:</strong>
                    <div class="networks-list">
                      <mat-chip *ngFor="let networkId of selectedNetworks">{{ getNetworkName(networkId) }}</mat-chip>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="next-steps">
              <h4>What happens next?</h4>
              <div *ngIf="selectedRole === 'producer'" class="steps-list">
                <p>After creating these resources:</p>
                <ol>
                  <li>PSC attachments will be configured on your forwarding rules</li>
                  <li>Your security service will be available for consumers to connect</li>
                  <li>You can manage IAM permissions to control who can use your service</li>
                  <li>Monitor usage and performance through Cloud Console</li>
                </ol>
              </div>
              <div *ngIf="selectedRole === 'consumer'" class="steps-list">
                <p>After creating these resources:</p>
                <ol>
                  <li>PSC endpoints will be created in your VPC networks</li>
                  <li>You can create firewall rules with security profile groups</li>
                  <li>Traffic matching those rules will be intercepted and inspected</li>
                  <li>Monitor interception status and performance</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="wizard-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-button (click)="previousStep()" [disabled]="currentStep === 1">
          <mat-icon>arrow_back</mat-icon>
          Previous
        </button>
        <button mat-raised-button color="primary" 
                (click)="nextStep()" 
                [disabled]="!canProceed() || isProcessing"
                *ngIf="currentStep < 4">
          <mat-spinner diameter="16" *ngIf="isProcessing"></mat-spinner>
          <span *ngIf="!isProcessing">Next</span>
          <span *ngIf="isProcessing">Processing...</span>
          <mat-icon *ngIf="!isProcessing">arrow_forward</mat-icon>
        </button>
        <button mat-raised-button color="primary" 
                (click)="createResources()" 
                [disabled]="!canProceed() || isCreating"
                *ngIf="currentStep === 4">
          <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
          <mat-icon *ngIf="!isCreating">check</mat-icon>
          {{ isCreating ? 'Creating...' : 'Create Resources' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      min-height: 100vh;
      background: var(--background-color);
    }

    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .wizard-header h2 {
      margin: 0 0 8px 0;
      color: #1a73e8;
    }

    .wizard-header p {
      margin: 0;
      color: #666;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
      padding: 20px 0;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .step.active,
    .step.completed {
      opacity: 1;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .step.active .step-number {
      background: #1a73e8;
      color: white;
    }

    .step.completed .step-number {
      background: #4caf50;
      color: white;
    }

    .step span {
      font-size: 12px;
      font-weight: 500;
      text-align: center;
    }

    .step-connector {
      width: 60px;
      height: 2px;
      background: #e0e0e0;
      margin: 0 16px;
    }

    .step-content {
      min-height: 400px;
      padding: 20px 0;
    }

    .step-content h3 {
      margin: 0 0 16px 0;
      color: #1a73e8;
    }

    .role-selection {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 24px 0;
    }

    .role-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .role-card:hover {
      border-color: #1a73e8;
      transform: translateY(-2px);
    }

    .role-card.selected {
      border-color: #1a73e8;
      background: rgba(26, 115, 232, 0.04);
    }

    .role-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .role-icon.producer {
      color: #1976d2;
    }

    .role-icon.consumer {
      color: #388e3c;
    }

    .role-card h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .role-card p {
      margin: 0 0 16px 0;
      color: #666;
    }

    .role-features {
      margin: 0;
      padding-left: 20px;
      color: #666;
      font-size: 14px;
    }

    .role-features li {
      margin-bottom: 4px;
    }

    .role-explanation {
      background: #e8f5e8;
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 24px;
    }

    .info-icon {
      color: #4caf50;
      margin-top: 2px;
    }

    .explanation-content h4 {
      margin: 0 0 8px 0;
      color: #2e7d32;
    }

    .explanation-content p {
      margin: 0;
      color: #2e7d32;
    }

    .config-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .deployment-zones,
    .vpc-selection {
      margin-top: 24px;
    }

    .deployment-zones h4,
    .vpc-selection h4 {
      margin: 0 0 8px 0;
      color: #6a1b9a;
    }

    .zones-grid,
    .networks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .zone-description,
    .network-description {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .region-selection,
    .zone-selection {
      margin: 16px 0;
    }

    .regions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }

    .region-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .region-name {
      font-weight: 500;
      color: #333;
    }

    .region-location {
      font-size: 12px;
      color: #666;
    }

    .zone-count {
      font-size: 11px;
      color: #1a73e8;
      font-weight: 500;
    }

    .selected-zones-display {
      margin: 16px 0;
    }

    .selected-zones-chips {
      margin: 8px 0;
    }

    .available-zones {
      margin: 16px 0;
    }

    .zones-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 8px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      margin: 8px 0;
    }

    .zone-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .zone-name {
      font-weight: 500;
      color: #333;
    }

    .zone-region {
      color: #666;
      font-size: 12px;
    }

    .zone-summary {
      margin: 16px 0;
    }

    .summary-card {
      background: #f8f9fa;
      border-left: 4px solid #1a73e8;
    }

    .summary-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .summary-details {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
    }

    .selected-zones-summary {
      margin: 16px 0;
    }

    .selected-zones-summary h5 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .deployments-section {
      margin-top: 24px;
    }

    .deployment-config {
      margin-bottom: 16px;
    }

    .deployment-card {
      border-radius: 8px;
    }

    .deployment-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .security-profiles-section {
      margin-top: 24px;
    }

    .profile-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .associations-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .association-card {
      border-radius: 8px;
    }

    .association-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .association-header h5 {
      margin: 0;
      color: #333;
    }

    .association-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 12px;
      font-size: 12px;
      color: #666;
    }

    .review-section {
      margin-top: 24px;
    }

    .review-card {
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .review-item {
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .review-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .zones-list,
    .networks-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .next-steps {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }

    .next-steps h4 {
      margin: 0 0 12px 0;
      color: #6a1b9a;
    }

    .steps-list p {
      margin: 0 0 12px 0;
      color: #333;
    }

    .steps-list ol {
      margin: 0;
      padding-left: 20px;
      color: #666;
    }

    .steps-list li {
      margin-bottom: 8px;
    }

    .wizard-actions {
      padding: 24px 0;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 40px;
      background: var(--surface-color);
      border-radius: 8px;
      padding: 20px 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    @media (max-width: 768px) {
      .wizard-container {
        width: 100%;
      }

      .role-selection {
        grid-template-columns: 1fr;
      }

      .step-indicator {
        flex-wrap: wrap;
        gap: 16px;
      }

      .step-connector {
        display: none;
      }

      .deployment-form,
      .profile-form {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TPPISetupWizardComponent implements OnInit {
  currentStep = 1;
  selectedRole: 'producer' | 'consumer' | null = null;
  specificResource: string | null = null;
  isCreating = false;
  isProcessing = false;

  // Forms
  producerForm!: FormGroup;
  consumerForm!: FormGroup;
  securityProfileForm!: FormGroup;
  deploymentForms: FormGroup[] = [];

  // Selection tracking
  selectedZones: string[] = [];
  selectedNetworks: string[] = [];
  selectedRegions: string[] = [];

  // Zone selection strategy
  zoneSelectionStrategy: 'all-regions' | 'specific-regions' | 'specific-zones' = 'specific-zones';
  zoneSearchTerm: string = '';
  
  // Computed properties to avoid method calls in templates
  selectedZoneObjects: any[] = [];
  selectedNetworkObjects: any[] = [];

  // Mock data
  availableNetworks = [
    { id: 'vpc-1', name: 'default', description: 'Default VPC network', type: 'Auto' },
    { id: 'vpc-2', name: 'production-vpc', description: 'Production environment', type: 'Custom' },
    { id: 'vpc-3', name: 'development-vpc', description: 'Development environment', type: 'Custom' }
  ];

  availableRegions = [
    { id: 'us-central1', name: 'us-central1', location: 'Iowa, USA' },
    { id: 'us-east1', name: 'us-east1', location: 'South Carolina, USA' },
    { id: 'us-east4', name: 'us-east4', location: 'Northern Virginia, USA' },
    { id: 'us-west1', name: 'us-west1', location: 'Oregon, USA' },
    { id: 'us-west2', name: 'us-west2', location: 'Los Angeles, USA' },
    { id: 'us-west3', name: 'us-west3', location: 'Salt Lake City, USA' },
    { id: 'us-west4', name: 'us-west4', location: 'Las Vegas, USA' },
    { id: 'europe-west1', name: 'europe-west1', location: 'Belgium' },
    { id: 'europe-west2', name: 'europe-west2', location: 'London, UK' },
    { id: 'europe-west3', name: 'europe-west3', location: 'Frankfurt, Germany' },
    { id: 'europe-west4', name: 'europe-west4', location: 'Netherlands' },
    { id: 'europe-west6', name: 'europe-west6', location: 'Zurich, Switzerland' },
    { id: 'asia-east1', name: 'asia-east1', location: 'Taiwan' },
    { id: 'asia-east2', name: 'asia-east2', location: 'Hong Kong' },
    { id: 'asia-northeast1', name: 'asia-northeast1', location: 'Tokyo, Japan' },
    { id: 'asia-northeast2', name: 'asia-northeast2', location: 'Osaka, Japan' },
    { id: 'asia-south1', name: 'asia-south1', location: 'Mumbai, India' },
    { id: 'asia-southeast1', name: 'asia-southeast1', location: 'Singapore' },
    { id: 'australia-southeast1', name: 'australia-southeast1', location: 'Sydney, Australia' }
  ];

  availableZones = [
    // US Central
    { id: 'us-central1-a', region: 'us-central1', name: 'us-central1-a' },
    { id: 'us-central1-b', region: 'us-central1', name: 'us-central1-b' },
    { id: 'us-central1-c', region: 'us-central1', name: 'us-central1-c' },
    { id: 'us-central1-f', region: 'us-central1', name: 'us-central1-f' },
    // US East
    { id: 'us-east1-b', region: 'us-east1', name: 'us-east1-b' },
    { id: 'us-east1-c', region: 'us-east1', name: 'us-east1-c' },
    { id: 'us-east1-d', region: 'us-east1', name: 'us-east1-d' },
    { id: 'us-east4-a', region: 'us-east4', name: 'us-east4-a' },
    { id: 'us-east4-b', region: 'us-east4', name: 'us-east4-b' },
    { id: 'us-east4-c', region: 'us-east4', name: 'us-east4-c' },
    // US West
    { id: 'us-west1-a', region: 'us-west1', name: 'us-west1-a' },
    { id: 'us-west1-b', region: 'us-west1', name: 'us-west1-b' },
    { id: 'us-west1-c', region: 'us-west1', name: 'us-west1-c' },
    { id: 'us-west2-a', region: 'us-west2', name: 'us-west2-a' },
    { id: 'us-west2-b', region: 'us-west2', name: 'us-west2-b' },
    { id: 'us-west2-c', region: 'us-west2', name: 'us-west2-c' },
    { id: 'us-west3-a', region: 'us-west3', name: 'us-west3-a' },
    { id: 'us-west3-b', region: 'us-west3', name: 'us-west3-b' },
    { id: 'us-west3-c', region: 'us-west3', name: 'us-west3-c' },
    { id: 'us-west4-a', region: 'us-west4', name: 'us-west4-a' },
    { id: 'us-west4-b', region: 'us-west4', name: 'us-west4-b' },
    { id: 'us-west4-c', region: 'us-west4', name: 'us-west4-c' },
    // Europe
    { id: 'europe-west1-b', region: 'europe-west1', name: 'europe-west1-b' },
    { id: 'europe-west1-c', region: 'europe-west1', name: 'europe-west1-c' },
    { id: 'europe-west1-d', region: 'europe-west1', name: 'europe-west1-d' },
    { id: 'europe-west2-a', region: 'europe-west2', name: 'europe-west2-a' },
    { id: 'europe-west2-b', region: 'europe-west2', name: 'europe-west2-b' },
    { id: 'europe-west2-c', region: 'europe-west2', name: 'europe-west2-c' },
    { id: 'europe-west3-a', region: 'europe-west3', name: 'europe-west3-a' },
    { id: 'europe-west3-b', region: 'europe-west3', name: 'europe-west3-b' },
    { id: 'europe-west3-c', region: 'europe-west3', name: 'europe-west3-c' },
    { id: 'europe-west4-a', region: 'europe-west4', name: 'europe-west4-a' },
    { id: 'europe-west4-b', region: 'europe-west4', name: 'europe-west4-b' },
    { id: 'europe-west4-c', region: 'europe-west4', name: 'europe-west4-c' },
    { id: 'europe-west6-a', region: 'europe-west6', name: 'europe-west6-a' },
    { id: 'europe-west6-b', region: 'europe-west6', name: 'europe-west6-b' },
    { id: 'europe-west6-c', region: 'europe-west6', name: 'europe-west6-c' },
    // Asia
    { id: 'asia-east1-a', region: 'asia-east1', name: 'asia-east1-a' },
    { id: 'asia-east1-b', region: 'asia-east1', name: 'asia-east1-b' },
    { id: 'asia-east1-c', region: 'asia-east1', name: 'asia-east1-c' },
    { id: 'asia-east2-a', region: 'asia-east2', name: 'asia-east2-a' },
    { id: 'asia-east2-b', region: 'asia-east2', name: 'asia-east2-b' },
    { id: 'asia-east2-c', region: 'asia-east2', name: 'asia-east2-c' },
    { id: 'asia-northeast1-a', region: 'asia-northeast1', name: 'asia-northeast1-a' },
    { id: 'asia-northeast1-b', region: 'asia-northeast1', name: 'asia-northeast1-b' },
    { id: 'asia-northeast1-c', region: 'asia-northeast1', name: 'asia-northeast1-c' },
    { id: 'asia-northeast2-a', region: 'asia-northeast2', name: 'asia-northeast2-a' },
    { id: 'asia-northeast2-b', region: 'asia-northeast2', name: 'asia-northeast2-b' },
    { id: 'asia-northeast2-c', region: 'asia-northeast2', name: 'asia-northeast2-c' },
    { id: 'asia-south1-a', region: 'asia-south1', name: 'asia-south1-a' },
    { id: 'asia-south1-b', region: 'asia-south1', name: 'asia-south1-b' },
    { id: 'asia-south1-c', region: 'asia-south1', name: 'asia-south1-c' },
    { id: 'asia-southeast1-a', region: 'asia-southeast1', name: 'asia-southeast1-a' },
    { id: 'asia-southeast1-b', region: 'asia-southeast1', name: 'asia-southeast1-b' },
    { id: 'asia-southeast1-c', region: 'asia-southeast1', name: 'asia-southeast1-c' },
    { id: 'australia-southeast1-a', region: 'australia-southeast1', name: 'australia-southeast1-a' },
    { id: 'australia-southeast1-b', region: 'australia-southeast1', name: 'australia-southeast1-b' },
    { id: 'australia-southeast1-c', region: 'australia-southeast1', name: 'australia-southeast1-c' }
  ];

  securityProviders = [
    { id: 'provider-1', name: 'Enterprise Firewall Service', organization: 'Security Corp' },
    { id: 'provider-2', name: 'Advanced IDS/IPS', organization: 'CyberSec Inc' },
    { id: 'provider-3', name: 'Cloud Security Suite', organization: 'SecureNet Ltd' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private snackBar: MatSnackBar,
    private tppiService: TPPIService
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    // Get role and specific resource from route parameters
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        this.selectedRole = params['role'] as 'producer' | 'consumer';
        this.currentStep = 2;
      }
      if (params['resource']) {
        this.specificResource = params['resource'];
        // Skip to appropriate step for specific resource creation
        this.currentStep = this.getStepForResource(params['resource']);
      }
    });
    this.loadSecurityProviders();
  }

  initializeForms() {
    this.producerForm = this.fb.group({
      deploymentGroupName: ['', Validators.required],
      description: [''],
      network: ['', Validators.required]
    });

    this.consumerForm = this.fb.group({
      endpointGroupName: ['', Validators.required],
      deploymentGroup: ['', Validators.required]
    });

    this.securityProfileForm = this.fb.group({
      profileName: ['', Validators.required],
      profileType: ['CustomIntercept']
    });
  }

  selectRole(role: 'producer' | 'consumer') {
    this.selectedRole = role;
  }

  getStepForResource(resource: string): number {
    // Map specific resources to their appropriate wizard steps
    switch (resource) {
      case 'deployment-group':
      case 'endpoint-group':
        return 2; // Configuration step
      case 'deployment':
      case 'security-profile':
        return 3; // Resources step
      default:
        return 1; // Start from beginning
    }
  }

  getWizardTitle(): string {
    if (this.specificResource) {
      switch (this.specificResource) {
        case 'deployment-group':
          return 'Create Deployment Group';
        case 'deployment':
          return 'Create Deployment';
        case 'endpoint-group':
          return 'Create Endpoint Group';
        case 'security-profile':
          return 'Create Security Profile';
        default:
          return 'TPPI Setup Wizard';
      }
    }
    return 'TPPI Setup Wizard';
  }

  getWizardDescription(): string {
    if (this.specificResource) {
      switch (this.specificResource) {
        case 'deployment-group':
          return 'Create a logical container for your security service deployments';
        case 'deployment':
          return 'Deploy security appliances in specific zones';
        case 'endpoint-group':
          return 'Create a reference to external security services';
        case 'security-profile':
          return 'Define security policies and inspection rules';
        default:
          return 'Let\'s configure Third Party Packet Intercept step by step';
      }
    }
    return 'Let\'s configure Third Party Packet Intercept step by step';
  }

  nextStep() {
    if (this.isProcessing) {
      console.log('Already processing, ignoring click');
      return;
    }
    
    this.isProcessing = true;
    console.log('nextStep called');
    console.log('Current step:', this.currentStep);
    console.log('Can proceed:', this.canProceed());
    
    // Use setTimeout to break out of any potential change detection cycle
    setTimeout(() => {
      try {
        if (this.canProceed()) {
          console.log('Proceeding to next step');
          this.currentStep++;
          console.log('New step:', this.currentStep);
          
          if (this.currentStep === 3 && this.selectedRole === 'producer') {
            console.log('Creating deployment forms');
            this.createDeploymentForms();
          }
        } else {
          console.log('Cannot proceed - validation failed');
        }
      } catch (error) {
        console.error('Error in nextStep:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 100);
  }

  previousStep() {
    this.currentStep--;
  }

  canProceed(): boolean {
    try {
      console.log('canProceed called for step:', this.currentStep);
      switch (this.currentStep) {
        case 1:
          return this.selectedRole !== null;
        case 2:
          if (this.selectedRole === 'producer') {
            const hasName = this.producerForm?.value?.deploymentGroupName?.trim();
            const hasNetwork = this.producerForm?.value?.network;
            const hasZones = this.getEffectiveZoneCount() > 0;
            
            console.log('Producer validation:', { hasName, hasNetwork, hasZones, effectiveZones: this.getEffectiveZoneCount() });
            return !!(hasName && hasNetwork && hasZones);
          } else if (this.selectedRole === 'consumer') {
            const hasName = this.consumerForm?.value?.endpointGroupName?.trim();
            const hasProvider = this.consumerForm?.value?.deploymentGroup;
            const hasNetworks = this.selectedNetworks.length > 0;
            
            return !!(hasName && hasProvider && hasNetworks);
          }
          return false;
        case 3:
          return true;
        case 4:
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error in canProceed:', error);
      return false;
    }
  }

  onZoneChange(event: any, zoneId: string) {
    console.log('Zone change:', zoneId, event.checked);
    
    try {
      if (event.checked) {
        if (!this.selectedZones.includes(zoneId)) {
          this.selectedZones.push(zoneId);
          console.log('Added zone:', zoneId, 'Selected zones:', this.selectedZones);
        }
      } else {
        const index = this.selectedZones.indexOf(zoneId);
        if (index > -1) {
          this.selectedZones.splice(index, 1);
          console.log('Removed zone:', zoneId, 'Selected zones:', this.selectedZones);
        }
      }
    } catch (error) {
      console.error('Error in onZoneChange:', error);
    }
  }

  toggleZone(zoneId: string) {
    const index = this.selectedZones.indexOf(zoneId);
    if (index > -1) {
      this.selectedZones.splice(index, 1);
    } else {
      this.selectedZones.push(zoneId);
    }
  }

  onNetworkChange(event: any, networkId: string) {
    if (event.checked) {
      if (!this.selectedNetworks.includes(networkId)) {
        this.selectedNetworks.push(networkId);
      }
    } else {
      const index = this.selectedNetworks.indexOf(networkId);
      if (index > -1) {
        this.selectedNetworks.splice(index, 1);
      }
    }
  }

  toggleNetwork(networkId: string) {
    const index = this.selectedNetworks.indexOf(networkId);
    if (index > -1) {
      this.selectedNetworks.splice(index, 1);
    } else {
      this.selectedNetworks.push(networkId);
    }
  }

  createDeploymentForms() {
    this.deploymentForms = this.selectedZones.map(() => 
      this.fb.group({
        name: ['', Validators.required],
        forwardingRule: ['', Validators.required]
      })
    );
  }

  getSelectedZones() {
    // Always return the same array reference to prevent change detection loops
    return this.selectedZoneObjects;
  }

  private updateSelectedZoneObjects() {
    // Clear and rebuild the array to maintain the same reference
    this.selectedZoneObjects.length = 0;
    this.availableZones.forEach(zone => {
      if (this.selectedZones.includes(zone.id)) {
        this.selectedZoneObjects.push(zone);
      }
    });
  }

  getDeploymentForm(index: number): FormGroup {
    return this.deploymentForms[index];
  }

  getForwardingRulesForZone(zoneId: string) {
    // Mock forwarding rules for each zone
    return [
      { id: `ilb-${zoneId}-1`, name: `security-ilb-${zoneId}` },
      { id: `ilb-${zoneId}-2`, name: `firewall-ilb-${zoneId}` }
    ];
  }

  getNetworkName(networkId: string): string {
    const network = this.availableNetworks.find(n => n.id === networkId);
    return network ? network.name : networkId;
  }

  getNetworkType(networkId: string): string {
    const network = this.availableNetworks.find(n => n.id === networkId);
    return network ? network.type : 'Unknown';
  }

  getProviderName(providerId: string): string {
    const provider = this.securityProviders.find(p => p.id === providerId);
    return provider ? `${provider.name} (${provider.organization})` : providerId;
  }

  createResources() {
    this.isCreating = true;
    
    // Simulate API calls
    setTimeout(() => {
      this.snackBar.open('TPPI resources created successfully!', 'Close', {
        duration: 5000,
        panelClass: 'success-snackbar'
      });
      this.router.navigate(['/tppi']);
    }, 3000);
  }

  onCancel() {
    this.location.back();
  }

  loadSecurityProviders() {
    this.tppiService.getAvailableSecurityProviders().subscribe({
      next: (providers) => {
        this.securityProviders = providers;
      },
      error: (error) => {
        console.error('Error loading security providers:', error);
      }
    });
  }

  // Zone selection methods
  onZoneStrategyChange() {
    console.log('Zone strategy changed to:', this.zoneSelectionStrategy);
    this.selectedZones = [];
    this.selectedRegions = [];
    this.zoneSearchTerm = '';
    this.updateFilteredZones();
  }

  onRegionChange(event: any, regionId: string) {
    console.log('Region change:', regionId, event.checked);
    
    if (event.checked) {
      if (!this.selectedRegions.includes(regionId)) {
        this.selectedRegions.push(regionId);
      }
    } else {
      const index = this.selectedRegions.indexOf(regionId);
      if (index > -1) {
        this.selectedRegions.splice(index, 1);
      }
    }
    
    // Auto-update zones based on selected regions
    this.updateZonesFromRegions();
    console.log('Selected regions:', this.selectedRegions);
    console.log('Auto-selected zones:', this.selectedZones);
  }

  updateZonesFromRegions() {
    // Auto-select all zones in selected regions
    this.selectedZones = this.availableZones
      .filter(zone => this.selectedRegions.includes(zone.region))
      .map(zone => zone.id);
  }

  onZoneToggle(event: any, zoneId: string) {
    console.log('Zone toggle:', zoneId, event.checked);
    
    if (event.checked) {
      if (!this.selectedZones.includes(zoneId)) {
        this.selectedZones.push(zoneId);
      }
    } else {
      const index = this.selectedZones.indexOf(zoneId);
      if (index > -1) {
        this.selectedZones.splice(index, 1);
      }
    }
    
    console.log('Selected zones:', this.selectedZones);
  }

  updateFilteredZones() {
    // This method updates the displayed zones based on search term
    // The actual filtering is done in getDisplayedZones()
  }

  getDisplayedZones() {
    if (!this.zoneSearchTerm.trim()) {
      return this.availableZones;
    }
    
    const searchTerm = this.zoneSearchTerm.toLowerCase();
    return this.availableZones.filter(zone => 
      zone.id.toLowerCase().includes(searchTerm) ||
      zone.region.toLowerCase().includes(searchTerm)
    );
  }

  getZonesInRegion(regionId: string) {
    return this.availableZones.filter(zone => zone.region === regionId);
  }

  removeZone(zoneId: string) {
    const index = this.selectedZones.indexOf(zoneId);
    if (index > -1) {
      this.selectedZones.splice(index, 1);
      console.log('Removed zone:', zoneId, 'Remaining zones:', this.selectedZones);
    }
  }

  getEffectiveZoneCount(): number {
    switch (this.zoneSelectionStrategy) {
      case 'all-regions':
        return this.availableZones.length;
      case 'specific-regions':
        return this.availableZones.filter(zone => this.selectedRegions.includes(zone.region)).length;
      case 'specific-zones':
        return this.selectedZones.length;
      default:
        return 0;
    }
  }

  getEffectiveZones(): string[] {
    switch (this.zoneSelectionStrategy) {
      case 'all-regions':
        return this.availableZones.map(zone => zone.id);
      case 'specific-regions':
        return this.availableZones
          .filter(zone => this.selectedRegions.includes(zone.region))
          .map(zone => zone.id);
      case 'specific-zones':
        return this.selectedZones;
      default:
        return [];
    }
  }

  getZoneStrategyDisplayName(): string {
    switch (this.zoneSelectionStrategy) {
      case 'all-regions':
        return 'All zones in all regions';
      case 'specific-regions':
        return 'All zones in selected regions';
      case 'specific-zones':
        return 'Specific zones only';
      default:
        return 'Unknown';
    }
  }
} 