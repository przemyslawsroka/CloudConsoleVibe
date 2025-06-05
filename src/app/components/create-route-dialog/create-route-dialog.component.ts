import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VpcService, VpcNetwork, Route } from '../../services/vpc.service';

@Component({
  selector: 'app-create-route-dialog',
  template: `
    <h2 mat-dialog-title>Create route</h2>
    <mat-dialog-content>
      <form [formGroup]="routeForm" class="route-form">
        <div class="form-section">
          <h3>Basic information</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter route name">
            <mat-hint>Name must be 1-63 characters long and match regex [a-z]([-a-z0-9]*[a-z0-9])?</mat-hint>
            <mat-error *ngIf="routeForm.get('name')?.hasError('required')">Name is required</mat-error>
            <mat-error *ngIf="routeForm.get('name')?.hasError('pattern')">Invalid name format</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description" placeholder="Enter route description">
          </mat-form-field>
        </div>

        <div class="form-section">
          <h3>Network and destination</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Network</mat-label>
            <mat-select formControlName="network">
              <mat-option *ngFor="let network of networks" [value]="network.selfLink">
                {{network.name}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="routeForm.get('network')?.hasError('required')">Network is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Destination IP range</mat-label>
            <input matInput formControlName="destRange" placeholder="Enter destination IP range (CIDR)">
            <mat-hint>Example: 10.0.0.0/24</mat-hint>
            <mat-error *ngIf="routeForm.get('destRange')?.hasError('required')">Destination range is required</mat-error>
            <mat-error *ngIf="routeForm.get('destRange')?.hasError('pattern')">Invalid CIDR format</mat-error>
          </mat-form-field>
        </div>

        <div class="form-section">
          <h3>Priority</h3>
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

        <div class="form-section">
          <h3>Next hop</h3>
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

          <mat-form-field *ngIf="routeForm.get('nextHopType')?.value === 'ip'" appearance="outline" class="full-width">
            <mat-label>IP address</mat-label>
            <input matInput formControlName="nextHopIp" placeholder="Enter IP address">
            <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('required')">IP address is required</mat-error>
            <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('pattern')">Invalid IP address format</mat-error>
            <mat-error *ngIf="routeForm.get('nextHopIp')?.hasError('ipNotInRange')">IP address must be within the allowed address spaces</mat-error>
          </mat-form-field>

          <mat-form-field *ngIf="routeForm.get('nextHopType')?.value === 'instance'" appearance="outline" class="full-width">
            <mat-label>Instance</mat-label>
            <input matInput formControlName="nextHopInstance" placeholder="Enter instance name">
            <mat-error *ngIf="routeForm.get('nextHopInstance')?.hasError('required')">Instance is required</mat-error>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!routeForm.valid">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .route-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 20px 0;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-section h3 {
      margin: 0;
      color: #5f6368;
      font-size: 16px;
    }
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      min-width: 500px;
    }
  `]
})
export class CreateRouteDialogComponent {
  routeForm: FormGroup;
  networks: VpcNetwork[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateRouteDialogComponent>,
    private vpcService: VpcService,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string }
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

    this.loadNetworks();
  }

  loadNetworks() {
    this.vpcService.getVpcNetworks(this.data.projectId).subscribe({
      next: (networks) => {
        this.networks = networks;
      },
      error: (error) => {
        console.error('Error loading networks:', error);
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

      this.dialogRef.close(route);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 