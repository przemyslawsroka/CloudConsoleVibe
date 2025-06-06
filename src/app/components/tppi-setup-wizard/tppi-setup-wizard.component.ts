import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TPPIService } from '../../services/tppi.service';

interface WizardData {
  role?: 'producer' | 'consumer';
  projectId?: string;
}

@Component({
  selector: 'app-tppi-setup-wizard',
  template: `
    <div class="wizard-container">
      <mat-dialog-content class="wizard-content">
        <div class="wizard-header">
          <h2>TPPI Setup Wizard</h2>
          <p>Let's configure Third Party Packet Intercept step by step</p>
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
                  <mat-option *ngFor="let network of availableNetworks" [value]="network.id">
                    {{ network.name }}
                  </mat-option>
                </mat-select>
                <mat-hint>VPC network where your security appliances are deployed</mat-hint>
                <mat-error *ngIf="producerForm.get('network')?.hasError('required')">
                  Network selection is required
                </mat-error>
              </mat-form-field>

              <div class="deployment-zones">
                <h4>Deployment Zones</h4>
                <p>Select zones where you want to deploy security appliances:</p>
                <div class="zones-grid">
                  <mat-checkbox *ngFor="let zone of availableZones" 
                               [checked]="selectedZones.includes(zone.id)"
                               (change)="toggleZone(zone.id)">
                    {{ zone.name }}
                    <span class="zone-description">{{ zone.description }}</span>
                  </mat-checkbox>
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
                  <mat-option *ngFor="let provider of securityProviders" [value]="provider.id">
                    {{ provider.name }} - {{ provider.organization }}
                  </mat-option>
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
                  <mat-checkbox *ngFor="let network of availableNetworks" 
                               [checked]="selectedNetworks.includes(network.id)"
                               (change)="toggleNetwork(network.id)">
                    {{ network.name }}
                    <span class="network-description">{{ network.description }}</span>
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
              <div *ngFor="let zone of getSelectedZones(); let i = index" class="deployment-config">
                <mat-card class="deployment-card">
                  <mat-card-header>
                    <mat-card-title>Deployment in {{ zone.name }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <form [formGroup]="getDeploymentForm(i)" class="deployment-form">
                      <mat-form-field appearance="outline">
                        <mat-label>Deployment Name *</mat-label>
                        <input matInput formControlName="name" [placeholder]="'security-' + zone.id">
                        <mat-error *ngIf="getDeploymentForm(i).get('name')?.hasError('required')">
                          Deployment name is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Forwarding Rule (ILB) *</mat-label>
                        <mat-select formControlName="forwardingRule">
                          <mat-option *ngFor="let rule of getForwardingRulesForZone(zone.id)" [value]="rule.id">
                            {{ rule.name }}
                          </mat-option>
                        </mat-select>
                        <mat-hint>Internal Load Balancer that fronts your security appliances</mat-hint>
                        <mat-error *ngIf="getDeploymentForm(i).get('forwardingRule')?.hasError('required')">
                          Forwarding rule is required
                        </mat-error>
                      </mat-form-field>
                    </form>
                  </mat-card-content>
                </mat-card>
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
                    <strong>Deployment Zones:</strong>
                    <div class="zones-list">
                      <mat-chip *ngFor="let zone of getSelectedZones()">{{ zone.name }}</mat-chip>
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
      </mat-dialog-content>

      <!-- Actions -->
      <mat-dialog-actions class="wizard-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-button (click)="previousStep()" [disabled]="currentStep === 1">
          <mat-icon>arrow_back</mat-icon>
          Previous
        </button>
        <button mat-raised-button color="primary" 
                (click)="nextStep()" 
                [disabled]="!canProceed()"
                *ngIf="currentStep < 4">
          Next
          <mat-icon>arrow_forward</mat-icon>
        </button>
        <button mat-raised-button color="primary" 
                (click)="createResources()" 
                [disabled]="!canProceed() || isCreating"
                *ngIf="currentStep === 4">
          <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
          <mat-icon *ngIf="!isCreating">check</mat-icon>
          {{ isCreating ? 'Creating...' : 'Create Resources' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .wizard-container {
      width: 800px;
      max-width: 90vw;
    }

    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .wizard-header h2 {
      margin: 0 0 8px 0;
      color: #6a1b9a;
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
      background: #6a1b9a;
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
      color: #6a1b9a;
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
      border-color: #6a1b9a;
      transform: translateY(-2px);
    }

    .role-card.selected {
      border-color: #6a1b9a;
      background: #f8f9ff;
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
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
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
  isCreating = false;

  // Forms
  producerForm!: FormGroup;
  consumerForm!: FormGroup;
  securityProfileForm!: FormGroup;
  deploymentForms: FormGroup[] = [];

  // Selection tracking
  selectedZones: string[] = [];
  selectedNetworks: string[] = [];

  // Mock data
  availableNetworks = [
    { id: 'vpc-1', name: 'default', description: 'Default VPC network', type: 'Auto' },
    { id: 'vpc-2', name: 'production-vpc', description: 'Production environment', type: 'Custom' },
    { id: 'vpc-3', name: 'development-vpc', description: 'Development environment', type: 'Custom' }
  ];

  availableZones = [
    { id: 'us-central1-a', name: 'us-central1-a', description: 'Iowa, USA' },
    { id: 'us-central1-b', name: 'us-central1-b', description: 'Iowa, USA' },
    { id: 'us-east1-a', name: 'us-east1-a', description: 'South Carolina, USA' },
    { id: 'europe-west1-a', name: 'europe-west1-a', description: 'Belgium' }
  ];

  securityProviders = [
    { id: 'provider-1', name: 'Enterprise Firewall Service', organization: 'Security Corp' },
    { id: 'provider-2', name: 'Advanced IDS/IPS', organization: 'CyberSec Inc' },
    { id: 'provider-3', name: 'Cloud Security Suite', organization: 'SecureNet Ltd' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TPPISetupWizardComponent>,
    private snackBar: MatSnackBar,
    private tppiService: TPPIService,
    @Inject(MAT_DIALOG_DATA) public data: WizardData
  ) {
    this.selectedRole = data.role || null;
    this.initializeForms();
  }

  ngOnInit() {
    if (this.selectedRole) {
      this.currentStep = 2;
    }
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

  nextStep() {
    if (this.canProceed()) {
      this.currentStep++;
      if (this.currentStep === 3 && this.selectedRole === 'producer') {
        this.createDeploymentForms();
      }
    }
  }

  previousStep() {
    this.currentStep--;
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.selectedRole !== null;
      case 2:
        if (this.selectedRole === 'producer') {
          return this.producerForm.valid && this.selectedZones.length > 0;
        } else {
          return this.consumerForm.valid && this.selectedNetworks.length > 0;
        }
      case 3:
        if (this.selectedRole === 'producer') {
          return this.deploymentForms.every(form => form.valid);
        } else {
          return this.securityProfileForm.valid;
        }
      case 4:
        return true;
      default:
        return false;
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
    return this.availableZones.filter(zone => this.selectedZones.includes(zone.id));
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
      this.dialogRef.close({ success: true, role: this.selectedRole });
    }, 3000);
  }

  onCancel() {
    this.dialogRef.close();
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
} 