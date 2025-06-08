import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IpAddressService } from '../../services/ip-address.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-reserve-ip',
  template: `
    <div class="reserve-ip-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-navigation">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-item">IP addresses</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="breadcrumb-item active">Reserve {{ ipType }} static IP address</span>
          </div>
        </div>
        <h1>Reserve {{ ipType }} static IP address</h1>
        <p class="page-description">
          {{ ipType === 'external' ? 
            'Reserve an external static IP address that can be used by Google Cloud resources to communicate with the internet.' :
            'Reserve an internal static IP address for use within your VPC network.'
          }}
        </p>
      </div>

      <!-- Main Form -->
      <div class="form-container">
        <form [formGroup]="reserveForm" (ngSubmit)="onSubmit()">
          
          <!-- Basic Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <div class="section-header">
                <div class="section-number">1</div>
                <div class="section-content">
                  <mat-card-title>Basic Information</mat-card-title>
                  <mat-card-subtitle>Provide a name and description for your IP address</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="form-fields">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name *</mat-label>
                  <input matInput formControlName="name" placeholder="my-static-ip">
                  <mat-icon matSuffix matTooltip="Choose a descriptive name for this IP address">info</mat-icon>
                  <mat-hint>Choose a descriptive name (e.g., web-server-ip, load-balancer-ip)</mat-hint>
                  <mat-error *ngIf="reserveForm.get('name')?.hasError('required')">Name is required</mat-error>
                  <mat-error *ngIf="reserveForm.get('name')?.hasError('pattern')">Name must be lowercase letters, numbers, and hyphens only</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description (optional)</mat-label>
                  <textarea matInput formControlName="description" rows="3" 
                    placeholder="Describe the purpose of this IP address"></textarea>
                  <mat-hint>Optional: Help your team understand what this IP address is for</mat-hint>
                </mat-form-field>
              </div>

              <div class="info-box">
                <mat-icon class="info-icon">lightbulb</mat-icon>
                <div class="info-text">
                  <h4>{{ ipType === 'external' ? 'External IP Addresses' : 'Internal IP Addresses' }}</h4>
                  <p>{{ ipType === 'external' ? 
                    'External static IP addresses allow your resources to communicate with the internet and retain the same IP address across restarts.' :
                    'Internal static IP addresses provide consistent IP addresses for resources within your VPC network.'
                  }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Network Configuration -->
          <mat-card class="form-section">
            <mat-card-header>
              <div class="section-header">
                <div class="section-number">2</div>
                <div class="section-content">
                  <mat-card-title>Network Configuration</mat-card-title>
                  <mat-card-subtitle>Select the region and network settings</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="form-fields">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Region *</mat-label>
                  <mat-select formControlName="region">
                    <mat-option value="us-central1">Iowa, USA (us-central1)</mat-option>
                    <mat-option value="us-east1">South Carolina, USA (us-east1)</mat-option>
                    <mat-option value="us-west1">Oregon, USA (us-west1)</mat-option>
                    <mat-option value="us-west2">California, USA (us-west2)</mat-option>
                    <mat-option value="europe-west1">Belgium (europe-west1)</mat-option>
                    <mat-option value="europe-west2">London, England (europe-west2)</mat-option>
                    <mat-option value="asia-east1">Taiwan (asia-east1)</mat-option>
                    <mat-option value="asia-southeast1">Singapore (asia-southeast1)</mat-option>
                    <mat-option value="australia-southeast1">Sydney, Australia (australia-southeast1)</mat-option>
                  </mat-select>
                  <mat-error *ngIf="reserveForm.get('region')?.hasError('required')">Region is required</mat-error>
                </mat-form-field>

                <div *ngIf="ipType === 'internal'" class="internal-fields">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Network *</mat-label>
                    <mat-select formControlName="network" (selectionChange)="onNetworkChange()">
                      <mat-option value="default">default</mat-option>
                      <mat-option value="production-vpc">production-vpc</mat-option>
                      <mat-option value="development-vpc">development-vpc</mat-option>
                      <mat-option value="staging-vpc">staging-vpc</mat-option>
                    </mat-select>
                    <mat-error *ngIf="reserveForm.get('network')?.hasError('required')">Network is required</mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Subnetwork *</mat-label>
                    <mat-select formControlName="subnetwork">
                      <mat-option value="default">default</mat-option>
                      <mat-option value="web-subnet">web-subnet</mat-option>
                      <mat-option value="app-subnet">app-subnet</mat-option>
                      <mat-option value="db-subnet">db-subnet</mat-option>
                    </mat-select>
                    <mat-error *ngIf="reserveForm.get('subnetwork')?.hasError('required')">Subnetwork is required</mat-error>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>IP version</mat-label>
                  <mat-select formControlName="ipVersion">
                    <mat-option value="IPv4">IPv4</mat-option>
                    <mat-option value="IPv6" [disabled]="ipType === 'internal'">IPv6 {{ ipType === 'internal' ? '(not available for internal)' : '' }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="info-box" *ngIf="ipType === 'internal'">
                <mat-icon class="info-icon">info</mat-icon>
                <div class="info-text">
                  <h4>Network Selection</h4>
                  <p>Internal static IP addresses are allocated from the subnet's IP range. Make sure to select the correct network and subnetwork for your use case.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- IP Assignment -->
          <mat-card class="form-section">
            <mat-card-header>
              <div class="section-header">
                <div class="section-number">3</div>
                <div class="section-content">
                  <mat-card-title>IP Assignment</mat-card-title>
                  <mat-card-subtitle>Choose how to assign the IP address</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="ip-assignment-section">
                <mat-radio-group formControlName="ipAssignment" class="assignment-group">
                  <mat-radio-button value="automatic" class="assignment-option">
                    <div class="radio-content">
                      <div class="radio-header">
                        <mat-icon class="option-icon">auto_awesome</mat-icon>
                        <strong>Automatic assignment</strong>
                        <mat-chip class="recommended-chip">Recommended</mat-chip>
                      </div>
                      <div class="radio-description">
                        Google Cloud will automatically assign an available IP address from the {{ ipType === 'external' ? 'external' : 'internal' }} pool.
                      </div>
                    </div>
                  </mat-radio-button>

                  <mat-radio-button value="custom" class="assignment-option">
                    <div class="radio-content">
                      <div class="radio-header">
                        <mat-icon class="option-icon">edit</mat-icon>
                        <strong>Manual assignment</strong>
                        <mat-chip class="advanced-chip">Advanced</mat-chip>
                      </div>
                      <div class="radio-description">
                        Specify a particular IP address to reserve. The address must be available and valid for the selected {{ ipType === 'external' ? 'region' : 'subnetwork' }}.
                      </div>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>

                <mat-form-field 
                  *ngIf="reserveForm.get('ipAssignment')?.value === 'custom'" 
                  appearance="outline" 
                  class="full-width custom-ip-field">
                  <mat-label>Custom IP address *</mat-label>
                  <input matInput formControlName="customIp" placeholder="Enter IP address (e.g., 10.0.1.100)">
                  <mat-icon matSuffix matTooltip="Enter a valid IP address in the correct format">info</mat-icon>
                  <mat-hint>{{ ipType === 'external' ? 'Enter a valid external IP address' : 'Enter a valid IP address within the selected subnetwork range' }}</mat-hint>
                  <mat-error *ngIf="reserveForm.get('customIp')?.hasError('required')">Custom IP address is required</mat-error>
                  <mat-error *ngIf="reserveForm.get('customIp')?.hasError('pattern')">Invalid IP address format</mat-error>
                </mat-form-field>
              </div>

              <div class="info-box">
                <mat-icon class="info-icon">security</mat-icon>
                <div class="info-text">
                  <h4>IP Address Assignment</h4>
                  <p>{{ ipType === 'external' ? 
                    'External IP addresses can be used with load balancers, VMs with external access, and other internet-facing resources.' :
                    'Internal IP addresses are only accessible within your VPC network and connected networks.'
                  }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Actions -->
          <div class="form-actions">
            <div class="action-buttons">
              <button mat-button type="button" (click)="goBack()" class="cancel-btn">
                Cancel
              </button>
              <button mat-raised-button color="primary" 
                      type="submit" 
                      [disabled]="!reserveForm.valid || isReserving"
                      class="reserve-btn">
                <mat-spinner diameter="20" *ngIf="isReserving"></mat-spinner>
                <mat-icon *ngIf="!isReserving">add</mat-icon>
                {{ isReserving ? 'Reserving...' : 'Reserve IP Address' }}
              </button>
            </div>
            
            <div class="cost-estimate" *ngIf="!isReserving">
              <mat-icon class="cost-icon">info</mat-icon>
              <div class="cost-text">
                <strong>Estimated monthly cost:</strong>
                <p>{{ ipType === 'external' ? 
                  'External static IP addresses: $1.46/month (if unused), free when attached to a running instance' :
                  'Internal static IP addresses: Free'
                }}</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reserve-ip-container {
      min-height: 100vh;
      background: var(--background-color);
      padding: 0;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
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
      text-transform: capitalize;
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

    .form-section {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .section-header {
      display: flex;
      align-items: center;
    }

    .section-number {
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

    .section-content {
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

    .internal-fields {
      display: grid;
      gap: 20px;
    }

    .info-box {
      background: var(--hover-color);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      margin-top: 24px;
    }

    .info-icon {
      color: #4caf50;
      margin-right: 12px;
      margin-top: 2px;
    }

    .info-text h4 {
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .info-text p {
      margin: 0;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    /* IP Assignment Styles */
    .ip-assignment-section {
      margin-bottom: 24px;
    }

    .assignment-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .assignment-option {
      padding: 20px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      margin: 0;
      transition: all 0.3s ease;
      background: var(--surface-color);
    }

    .assignment-option:hover {
      border-color: #1976d2;
      background: var(--hover-color);
    }

    .assignment-option.mat-radio-checked {
      border-color: #1976d2;
      background: var(--hover-color);
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

    .option-icon {
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
      color: var(--text-secondary-color);
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .custom-ip-field {
      margin-top: 20px;
    }

    /* Form Actions */
    .form-actions {
      background: var(--surface-color);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-top: 24px;
      border: 1px solid var(--border-color);
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 20px;
    }

    .cancel-btn {
      color: var(--text-secondary-color);
    }

    .reserve-btn {
      background: #1976d2;
      color: white;
      padding: 12px 32px;
    }

    .reserve-btn:disabled {
      background: #ccc;
    }

    .cost-estimate {
      display: flex;
      align-items: flex-start;
      background: var(--hover-color);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--border-color);
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
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .form-section,
      .form-actions {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .info-box {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .info-text h4 {
        color: #4caf50;
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-title {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-subtitle {
        color: var(--text-secondary-color) !important;
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

      .mat-mdc-select {
        color: var(--text-color) !important;
      }

      .mat-mdc-select-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-option {
        color: var(--text-color) !important;
      }

      .mat-mdc-option:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-radio-button {
        .mat-mdc-radio-outer-circle {
          border-color: var(--border-color) !important;
        }

        .mat-mdc-radio-inner-circle {
          background-color: #1976d2 !important;
        }

        .mdc-radio__background::before {
          background-color: #1976d2 !important;
        }
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-raised-button {
        background-color: var(--primary-color) !important;
        color: white !important;
      }

      .mat-mdc-icon-button {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-chip {
        background-color: var(--hover-color) !important;
        color: var(--text-color) !important;
      }

      .mat-hint {
        color: var(--text-secondary-color) !important;
      }

      .mat-error {
        color: #f44336 !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-card {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-card-title {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-card-subtitle {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-form-field-input-control {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-form-field-label {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-button {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-icon-button {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-hint {
      color: var(--text-secondary-color);
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

      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }

      .assignment-group {
        gap: 12px;
      }

      .assignment-option {
        padding: 16px;
      }
    }
  `]
})
export class ReserveIpComponent implements OnInit {
  reserveForm: FormGroup;
  ipType: 'external' | 'internal' = 'external';
  isReserving = false;
  projectId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private ipAddressService: IpAddressService,
    private projectService: ProjectService
  ) {
    this.reserveForm = this.createForm();
  }

  ngOnInit() {
    // Get IP type from route
    this.route.queryParams.subscribe(params => {
      this.ipType = params['type'] === 'internal' ? 'internal' : 'external';
      this.updateFormValidation();
    });

    // Get current project
    this.projectService.currentProject$.subscribe(project => {
      this.projectId = project?.id || null;
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)]],
      description: [''],
      region: ['us-central1', Validators.required],
      network: [''],
      subnetwork: [''],
      ipVersion: ['IPv4'],
      ipAssignment: ['automatic'],
      customIp: ['']
    });
  }

  updateFormValidation() {
    if (this.ipType === 'internal') {
      this.reserveForm.get('network')?.setValidators([Validators.required]);
      this.reserveForm.get('subnetwork')?.setValidators([Validators.required]);
      this.reserveForm.get('network')?.setValue('default');
      this.reserveForm.get('subnetwork')?.setValue('default');
    } else {
      this.reserveForm.get('network')?.clearValidators();
      this.reserveForm.get('subnetwork')?.clearValidators();
      this.reserveForm.get('network')?.setValue('');
      this.reserveForm.get('subnetwork')?.setValue('');
    }

    // Add custom IP validation when manual assignment is selected
    this.reserveForm.get('ipAssignment')?.valueChanges.subscribe(value => {
      if (value === 'custom') {
        this.reserveForm.get('customIp')?.setValidators([
          Validators.required,
          Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)
        ]);
      } else {
        this.reserveForm.get('customIp')?.clearValidators();
      }
      this.reserveForm.get('customIp')?.updateValueAndValidity();
    });

    this.reserveForm.updateValueAndValidity();
  }

  onNetworkChange() {
    // Reset subnetwork when network changes
    this.reserveForm.get('subnetwork')?.setValue('default');
  }

  onSubmit() {
    if (this.reserveForm.valid && this.projectId) {
      this.isReserving = true;
      const formValue = this.reserveForm.value;

      const reserveData = {
        name: formValue.name,
        description: formValue.description,
        region: formValue.region,
        network: formValue.network,
        subnetwork: formValue.subnetwork,
        ipVersion: formValue.ipVersion,
        customIp: formValue.ipAssignment === 'custom' ? formValue.customIp : null
      };

      const serviceCall = this.ipType === 'external' 
        ? this.ipAddressService.reserveExternalStaticIp(this.projectId, reserveData)
        : this.ipAddressService.reserveInternalStaticIp(this.projectId, reserveData);

      serviceCall.subscribe({
        next: () => {
          this.snackBar.open(`${this.ipType} static IP reserved successfully!`, 'Close', {
            duration: 5000,
            panelClass: 'success-snackbar'
          });
          this.router.navigate(['/ip-addresses']);
        },
        error: (error) => {
          console.error(`Error reserving ${this.ipType} static IP:`, error);
          this.snackBar.open(`Error reserving ${this.ipType} static IP. Please try again.`, 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.isReserving = false;
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/ip-addresses']);
  }
} 