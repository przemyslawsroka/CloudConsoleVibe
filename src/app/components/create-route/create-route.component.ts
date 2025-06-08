import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VpcService, VpcNetwork, Route } from '../../services/vpc.service';

@Component({
  selector: 'app-create-route',
  template: `
    <div class="create-route-container">
      <!-- Header -->
      <div class="header">
        <div class="breadcrumb">
          <a [routerLink]="['/routes']" class="breadcrumb-link">Routes</a>
          <mat-icon>chevron_right</mat-icon>
          <span class="current-page">Create route</span>
        </div>
        <h1>Create route</h1>
      </div>

      <!-- Main content -->
      <div class="content">
        <form [formGroup]="routeForm" class="route-form">
          <!-- Basic information section -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Basic information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter route name">
                  <mat-hint>Name must be 1-63 characters long and match regex [a-z]([-a-z0-9]*[a-z0-9])?</mat-hint>
                  <mat-error *ngIf="routeForm.get('name')?.hasError('required')">Name is required</mat-error>
                  <mat-error *ngIf="routeForm.get('name')?.hasError('pattern')">Invalid name format</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description" placeholder="Enter route description">
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Network and destination section -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Network and destination</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Network</mat-label>
                  <mat-select formControlName="network">
                    <mat-option *ngFor="let network of networks" [value]="network.selfLink">
                      {{network.name}}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="routeForm.get('network')?.hasError('required')">Network is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Destination IP range</mat-label>
                  <input matInput formControlName="destRange" placeholder="Enter destination IP range (CIDR)">
                  <mat-hint>Example: 10.0.0.0/24</mat-hint>
                  <mat-error *ngIf="routeForm.get('destRange')?.hasError('required')">Destination range is required</mat-error>
                  <mat-error *ngIf="routeForm.get('destRange')?.hasError('pattern')">Invalid CIDR format</mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Priority section -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Priority</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Priority</mat-label>
                  <input matInput type="number" formControlName="priority" min="0" max="65535">
                  <mat-hint>Lower values have higher priority (0-65535)</mat-hint>
                  <mat-error *ngIf="routeForm.get('priority')?.hasError('required')">Priority is required</mat-error>
                  <mat-error *ngIf="routeForm.get('priority')?.hasError('min') || routeForm.get('priority')?.hasError('max')">
                    Priority must be between 0 and 65535
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Next hop section -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Next hop</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Next hop type</mat-label>
                  <mat-select formControlName="nextHopType" (selectionChange)="onNextHopTypeChange($event)">
                    <mat-option value="instance">Instance</mat-option>
                    <mat-option value="ip">IP address</mat-option>
                    <mat-option value="network">Network</mat-option>
                    <mat-option value="gateway">Internet gateway</mat-option>
                    <mat-option value="vpn">VPN tunnel</mat-option>
                    <mat-option value="ilb">Internal load balancer</mat-option>
                  </mat-select>
                  <mat-error *ngIf="routeForm.get('nextHopType')?.hasError('required')">Next hop type is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row" *ngIf="routeForm.get('nextHopType')?.value === 'ip'">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>IP address</mat-label>
                  <input matInput formControlName="nextHopIp" placeholder="Enter IP address">
                  <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('required')">IP address is required</mat-error>
                  <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('pattern')">Invalid IP address format</mat-error>
                  <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('ipNotInRange')">IP address must be within the allowed address spaces</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row" *ngIf="routeForm.get('nextHopType')?.value === 'instance'">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Instance</mat-label>
                  <input matInput formControlName="nextHopInstance" placeholder="Enter instance name">
                  <mat-error *ngIf="routeForm.get('nextHopInstance')?.hasError('required')">Instance is required</mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </form>
      </div>

      <!-- Footer actions -->
      <div class="page-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!routeForm.valid || isCreating">
          <mat-spinner *ngIf="isCreating" diameter="20"></mat-spinner>
          {{isCreating ? 'Creating...' : 'Create'}}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .create-route-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--background-color);
      color: var(--text-color);
    }

    .header {
      padding: 24px 32px;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface-color);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .breadcrumb-link {
      color: var(--primary-color);
      text-decoration: none;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .current-page {
      color: var(--text-secondary-color);
    }

    .breadcrumb mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-secondary-color);
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 400;
      color: var(--text-color);
    }

    .content {
      flex: 1;
      padding: 32px;
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
    }

    .route-form {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .form-section {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .form-section mat-card-header {
      margin-bottom: 24px;
    }

    .form-section mat-card-title {
      color: var(--text-color);
      font-size: 20px;
      font-weight: 500;
    }

    .form-row {
      margin-bottom: 20px;
    }

    .form-row:last-child {
      margin-bottom: 0;
    }

    .full-width {
      width: 100%;
    }

    .page-actions {
      padding: 24px 32px;
      border-top: 1px solid var(--border-color);
      background: var(--surface-color);
      display: flex;
      justify-content: flex-end;
      gap: 16px;
    }

    .page-actions button {
      min-width: 120px;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) .form-section {
      background: var(--surface-color);
      border-color: var(--border-color);
    }

    :host-context(.dark-theme) mat-card-title {
      color: var(--text-color);
    }

    /* Angular Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--input-background-color);
        }
        
        .mat-mdc-form-field-subscript-wrapper {
          color: var(--text-secondary-color);
        }
      }

      .mat-mdc-outlined-form-field {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--border-color);
        }

        &:hover .mdc-notched-outline__leading,
        &:hover .mdc-notched-outline__notch,
        &:hover .mdc-notched-outline__trailing {
          border-color: var(--border-hover-color);
        }

        &.mat-focused .mdc-notched-outline__leading,
        &.mat-focused .mdc-notched-outline__notch,
        &.mat-focused .mdc-notched-outline__trailing {
          border-color: var(--primary-color);
        }
      }

      .mat-mdc-form-field-label {
        color: var(--text-secondary-color);
      }

      .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
        color: var(--primary-color);
      }

      .mat-mdc-input-element {
        color: var(--text-color);
        caret-color: var(--primary-color);
      }

      .mat-mdc-select-value {
        color: var(--text-color);
      }

      .mat-mdc-select-arrow {
        color: var(--text-secondary-color);
      }

      .mat-mdc-form-field-hint {
        color: var(--text-secondary-color);
      }

      .mat-mdc-form-field-error {
        color: var(--error-color);
      }

      .mat-mdc-card {
        background: var(--surface-color);
        color: var(--text-color);
      }

      .mat-mdc-button {
        color: var(--text-color);
      }

      .mat-mdc-raised-button.mat-primary {
        background-color: var(--primary-color);
        color: white;
      }

      .mat-mdc-raised-button.mat-primary:hover {
        background-color: var(--primary-hover-color);
      }

      .mat-mdc-raised-button.mat-primary:disabled {
        background-color: var(--disabled-color);
        color: var(--disabled-text-color);
      }

      .mat-mdc-progress-spinner circle {
        stroke: white;
      }
    }
  `]
})
export class CreateRouteComponent implements OnInit {
  routeForm: FormGroup;
  networks: VpcNetwork[] = [];
  projectId = 'net-top-viz-demo-208511';
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private vpcService: VpcService,
    private snackBar: MatSnackBar
  ) {
    this.routeForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('^[a-z]([-a-z0-9]*[a-z0-9])?$')]],
      description: [''],
      network: ['', Validators.required],
      destRange: ['', [Validators.required, Validators.pattern('^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[1-2][0-9]|3[0-2])$')]],
      priority: [1000, [Validators.required, Validators.min(0), Validators.max(65535)]],
      nextHopType: ['', Validators.required],
      nextHopIp: ['', [Validators.pattern('^([0-9]{1,3}\.){3}[0-9]{1,3}$'), this.ipInRangeValidator()]],
      nextHopInstance: [''],
      nextHopNetwork: [''],
      nextHopGateway: [''],
      nextHopVpnTunnel: [''],
      nextHopIlb: ['']
    });
  }

  ngOnInit() {
    this.loadNetworks();
  }

  loadNetworks() {
    this.vpcService.getVpcNetworks(this.projectId).subscribe({
      next: (networks) => {
        this.networks = networks;
      },
      error: (error) => {
        console.error('Error loading networks:', error);
        this.snackBar.open('Error loading networks', 'Close', { duration: 3000 });
      }
    });
  }

  onNextHopTypeChange(event: any) {
    // Reset all next hop fields
    this.routeForm.patchValue({
      nextHopIp: '',
      nextHopInstance: '',
      nextHopNetwork: '',
      nextHopGateway: '',
      nextHopVpnTunnel: '',
      nextHopIlb: ''
    });

    // Set required validator based on selected type
    const nextHopType = event.value;
    const nextHopField = this.getNextHopField(nextHopType);
    if (nextHopField) {
      this.routeForm.get(nextHopField)?.setValidators([Validators.required]);
      this.routeForm.get(nextHopField)?.updateValueAndValidity();
    }
  }

  private getNextHopField(type: string): string | null {
    switch (type) {
      case 'ip': return 'nextHopIp';
      case 'instance': return 'nextHopInstance';
      case 'network': return 'nextHopNetwork';
      case 'gateway': return 'nextHopGateway';
      case 'vpn': return 'nextHopVpnTunnel';
      case 'ilb': return 'nextHopIlb';
      default: return null;
    }
  }

  ipInRangeValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const ip = control.value;
      if (!ip) return null;

      const allowedRanges = [
        '10.170.0.0/20', '10.202.0.0/20', '10.186.0.0/20', '10.182.0.0/20',
        '10.128.0.0/20', '10.158.0.0/20', '10.174.0.0/20', '10.224.0.0/20',
        '10.188.0.0/20', '10.212.0.0/20', '10.150.0.0/20', '10.192.0.0/20',
        '10.200.0.0/20', '10.138.0.0/20', '10.160.0.0/20', '10.148.0.0/20',
        '10.178.0.0/20', '10.146.0.0/20', '10.180.0.0/20', '10.206.0.0/20',
        '10.132.0.0/20', '10.210.0.0/20', '10.190.0.0/20', '10.214.0.0/20',
        '10.172.0.0/20', '10.156.0.0/20', '10.152.0.0/20', '10.164.0.0/20',
        '10.220.0.0/20', '10.218.0.0/20', '10.162.0.0/20', '10.226.0.0/20',
        '10.184.0.0/20', '10.198.0.0/20', '10.154.0.0/20', '10.142.0.0/20',
        '10.140.0.0/20', '10.168.0.0/20', '10.194.0.0/20', '10.166.0.0/20',
        '10.196.0.0/20', '10.216.0.0/20', '10.204.0.0/20', '10.208.0.0/20'
      ];

      const isInRange = allowedRanges.some(range => {
        const [rangeIp, prefix] = range.split('/');
        const ipNum = this.ipToNumber(ip);
        const rangeNum = this.ipToNumber(rangeIp);
        const mask = ~((1 << (32 - parseInt(prefix))) - 1);
        return (ipNum & mask) === (rangeNum & mask);
      });

      return isInRange ? null : { ipNotInRange: true };
    };
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  onSubmit() {
    if (this.routeForm.valid) {
      this.isCreating = true;
      const formValue = this.routeForm.value;
      const route: Partial<Route> = {
        name: formValue.name,
        description: formValue.description || undefined,
        network: formValue.network,
        destRange: formValue.destRange,
        priority: formValue.priority,
        tags: []
      };

      // Add the appropriate next hop field based on the type
      const nextHopType = formValue.nextHopType;
      const nextHopValue = formValue[this.getNextHopField(nextHopType)!];
      
      if (nextHopType && nextHopValue) {
        switch (nextHopType) {
          case 'ip':
            route.nextHopIp = nextHopValue;
            break;
          case 'instance':
            route.nextHopInstance = nextHopValue;
            break;
          case 'network':
            route.nextHopNetwork = nextHopValue;
            break;
          case 'gateway':
            route.nextHopGateway = nextHopValue;
            break;
          case 'vpn':
            route.nextHopVpnTunnel = nextHopValue;
            break;
          case 'ilb':
            route.nextHopIlb = nextHopValue;
            break;
        }
      }

      this.vpcService.createRoute(this.projectId, route).subscribe({
        next: () => {
          this.snackBar.open('Route created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/routes']);
        },
        error: (error) => {
          console.error('Error creating route:', error);
          this.snackBar.open('Error creating route', 'Close', { duration: 3000 });
          this.isCreating = false;
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/routes']);
  }
} 