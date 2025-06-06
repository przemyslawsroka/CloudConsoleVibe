import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NetworkHealthMonitorService } from '../../services/network-health-monitor.service';

interface DialogData {
  projectId: string;
}

@Component({
  selector: 'app-create-health-monitor-dialog',
  template: `
    <div class="dialog-header">
      <button mat-icon-button mat-dialog-close class="back-button">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2 mat-dialog-title>Create Health Monitor</h2>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="monitorForm" class="monitor-form">
        <!-- Monitor Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monitor name *</mat-label>
          <input matInput formControlName="name" placeholder="cross-zonal-health">
          <mat-icon matSuffix matTooltip="Lowercase letters, numbers, hyphens allowed">info</mat-icon>
          <mat-hint>Lowercase letters, numbers, hyphens allowed</mat-hint>
          <mat-error *ngIf="monitorForm.get('name')?.hasError('required')">
            Monitor name is required
          </mat-error>
          <mat-error *ngIf="monitorForm.get('name')?.hasError('pattern')">
            Invalid format. Use lowercase letters, numbers, and hyphens only
          </mat-error>
        </mat-form-field>

        <!-- Source Section -->
        <div class="section-header">
          <h3>Source</h3>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Source type</mat-label>
          <mat-select formControlName="sourceType">
            <mat-option value="subnetwork">Subnetwork</mat-option>
            <mat-option value="instance">VM Instance</mat-option>
            <mat-option value="region">Region</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('sourceType')?.value === 'subnetwork'">
          <mat-label>Subnetwork</mat-label>
          <mat-select formControlName="sourceSubnetwork">
            <mat-option *ngFor="let source of availableSources" [value]="source.id">
              {{ source.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('sourceType')?.value === 'instance'">
          <mat-label>VM Instance IP</mat-label>
          <input matInput formControlName="sourceInstance" placeholder="35.208.158.96">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('sourceType')?.value === 'region'">
          <mat-label>Region</mat-label>
          <mat-select formControlName="sourceRegion">
            <mat-option value="us-central1">us-central1</mat-option>
            <mat-option value="us-east1">us-east1</mat-option>
            <mat-option value="eu-west1">eu-west1</mat-option>
            <mat-option value="asia-east1">asia-east1</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Additional packet header configuration -->
        <div class="expandable-section">
          <button type="button" mat-button class="expand-button" (click)="toggleSourceConfig()">
            <mat-icon>{{ showSourceConfig ? 'expand_less' : 'expand_more' }}</mat-icon>
            Additional packet header configuration (optional)
          </button>
          
          <div class="expandable-content" *ngIf="showSourceConfig">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Protocol</mat-label>
              <mat-select formControlName="sourceProtocol">
                <mat-option value="tcp">TCP</mat-option>
                <mat-option value="udp">UDP</mat-option>
                <mat-option value="icmp">ICMP</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Ports (comma-separated)</mat-label>
              <input matInput formControlName="sourcePorts" placeholder="80, 443, 8080">
            </mat-form-field>
          </div>
        </div>

        <!-- Destination Section -->
        <div class="section-header">
          <h3>Destination</h3>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Source type</mat-label>
          <mat-select formControlName="destinationType">
            <mat-option value="subnetwork">Subnetwork</mat-option>
            <mat-option value="instance">VM Instance</mat-option>
            <mat-option value="region">Region</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('destinationType')?.value === 'subnetwork'">
          <mat-label>Subnetwork</mat-label>
          <mat-select formControlName="destinationSubnetwork">
            <mat-option *ngFor="let source of availableSources" [value]="source.id">
              {{ source.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('destinationType')?.value === 'instance'">
          <mat-label>VM Instance IP</mat-label>
          <input matInput formControlName="destinationInstance" placeholder="35.208.158.96">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="monitorForm.get('destinationType')?.value === 'region'">
          <mat-label>Region</mat-label>
          <mat-select formControlName="destinationRegion">
            <mat-option value="us-central1">us-central1</mat-option>
            <mat-option value="us-east1">us-east1</mat-option>
            <mat-option value="eu-west1">eu-west1</mat-option>
            <mat-option value="asia-east1">asia-east1</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Additional packet header configuration for destination -->
        <div class="expandable-section">
          <button type="button" mat-button class="expand-button" (click)="toggleDestinationConfig()">
            <mat-icon>{{ showDestinationConfig ? 'expand_less' : 'expand_more' }}</mat-icon>
            Additional packet header configuration (optional)
          </button>
          
          <div class="expandable-content" *ngIf="showDestinationConfig">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Protocol</mat-label>
              <mat-select formControlName="destinationProtocol">
                <mat-option value="tcp">TCP</mat-option>
                <mat-option value="udp">UDP</mat-option>
                <mat-option value="icmp">ICMP</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Ports (comma-separated)</mat-label>
              <input matInput formControlName="destinationPorts" placeholder="80, 443, 8080">
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button (click)="onCancel()">CANCEL</button>
      <div class="action-group">
        <button mat-button class="equivalent-rest-button">
          EQUIVALENT REST
          <mat-icon>expand_more</mat-icon>
        </button>
        <button mat-raised-button color="primary" 
                [disabled]="!monitorForm.valid || isCreating"
                (click)="onCreate()">
          <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
          {{ isCreating ? 'CREATING...' : 'CREATE' }}
        </button>
      </div>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 0;
      margin-bottom: 16px;
    }

    .back-button {
      color: #5f6368;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: #202124;
    }

    .dialog-content {
      padding: 0 24px;
      max-height: 600px;
      overflow-y: auto;
    }

    .monitor-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .section-header {
      margin: 24px 0 8px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8eaed;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .expandable-section {
      margin: 16px 0;
    }

    .expand-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1a73e8;
      text-transform: none;
      font-size: 14px;
      padding: 8px 0;
      justify-content: flex-start;
    }

    .expandable-content {
      margin-top: 16px;
      padding-left: 24px;
      border-left: 2px solid #e8eaed;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-actions {
      padding: 24px;
      border-top: 1px solid #e8eaed;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .action-group {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .equivalent-rest-button {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1a73e8;
      border: 1px solid #dadce0;
    }

    @media (max-width: 600px) {
      .dialog-header,
      .dialog-content,
      .dialog-actions {
        padding-left: 16px;
        padding-right: 16px;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .action-group {
        justify-content: flex-end;
      }
    }
  `]
})
export class CreateHealthMonitorDialogComponent implements OnInit {
  monitorForm!: FormGroup;
  availableSources: any[] = [];
  showSourceConfig = false;
  showDestinationConfig = false;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateHealthMonitorDialogComponent>,
    private snackBar: MatSnackBar,
    private networkHealthService: NetworkHealthMonitorService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.loadAvailableSources();
  }

  initializeForm() {
    this.monitorForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      sourceType: ['subnetwork', Validators.required],
      sourceSubnetwork: [''],
      sourceInstance: [''],
      sourceRegion: [''],
      sourceProtocol: ['tcp'],
      sourcePorts: [''],
      destinationType: ['subnetwork', Validators.required],
      destinationSubnetwork: [''],
      destinationInstance: [''],
      destinationRegion: [''],
      destinationProtocol: ['tcp'],
      destinationPorts: ['']
    });

    // Set default values
    this.monitorForm.patchValue({
      sourceType: 'subnetwork',
      destinationType: 'subnetwork'
    });
  }

  loadAvailableSources() {
    this.networkHealthService.getAvailableNetworkSources(this.data.projectId).subscribe({
      next: (sources) => {
        this.availableSources = sources;
        // Set default selections if available
        if (sources.length > 0) {
          this.monitorForm.patchValue({
            sourceSubnetwork: sources[0].id,
            destinationSubnetwork: sources.length > 1 ? sources[1].id : sources[0].id
          });
        }
      },
      error: (error) => {
        console.error('Error loading available sources:', error);
        this.snackBar.open('Error loading network sources', 'Close', { duration: 3000 });
      }
    });
  }

  toggleSourceConfig() {
    this.showSourceConfig = !this.showSourceConfig;
  }

  toggleDestinationConfig() {
    this.showDestinationConfig = !this.showDestinationConfig;
  }

  onCreate() {
    if (!this.monitorForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isCreating = true;
    const formValue = this.monitorForm.value;

    // Build the monitor configuration
    const monitor = {
      name: formValue.name,
      source: this.buildSourceConfig(formValue),
      destination: this.buildDestinationConfig(formValue),
      googleNetworkStatus: 'Unknown' as const,
      customerNetworkStatus: 'Unknown' as const,
      packetHeaderConfig: this.buildPacketHeaderConfig(formValue)
    };

    // Validate the configuration
    this.networkHealthService.validateMonitorConfig(monitor).subscribe({
      next: (validation) => {
        if (!validation.valid) {
          this.isCreating = false;
          this.snackBar.open(`Validation failed: ${validation.errors.join(', ')}`, 'Close', { duration: 5000 });
          return;
        }

        // Create the monitor
        this.networkHealthService.createHealthMonitor(this.data.projectId, monitor).subscribe({
          next: (result) => {
            this.isCreating = false;
            this.dialogRef.close(result);
          },
          error: (error) => {
            this.isCreating = false;
            console.error('Error creating monitor:', error);
            this.snackBar.open('Error creating health monitor', 'Close', { duration: 3000 });
          }
        });
      },
      error: (error) => {
        this.isCreating = false;
        console.error('Error validating monitor:', error);
        this.snackBar.open('Error validating monitor configuration', 'Close', { duration: 3000 });
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  private buildSourceConfig(formValue: any) {
    const config: any = {
      type: formValue.sourceType
    };

    switch (formValue.sourceType) {
      case 'subnetwork':
        config.subnetwork = formValue.sourceSubnetwork;
        config.project = this.data.projectId;
        break;
      case 'instance':
        config.instance = formValue.sourceInstance;
        break;
      case 'region':
        config.region = formValue.sourceRegion;
        break;
    }

    return config;
  }

  private buildDestinationConfig(formValue: any) {
    const config: any = {
      type: formValue.destinationType
    };

    switch (formValue.destinationType) {
      case 'subnetwork':
        config.subnetwork = formValue.destinationSubnetwork;
        config.project = this.data.projectId;
        break;
      case 'instance':
        config.instance = formValue.destinationInstance;
        break;
      case 'region':
        config.region = formValue.destinationRegion;
        break;
    }

    return config;
  }

  private buildPacketHeaderConfig(formValue: any) {
    const config: any = {};

    if (formValue.sourceProtocol || formValue.destinationProtocol) {
      config.protocol = formValue.sourceProtocol || formValue.destinationProtocol;
    }

    const ports = [];
    if (formValue.sourcePorts) {
      ports.push(...formValue.sourcePorts.split(',').map((p: string) => parseInt(p.trim())));
    }
    if (formValue.destinationPorts) {
      ports.push(...formValue.destinationPorts.split(',').map((p: string) => parseInt(p.trim())));
    }

    if (ports.length > 0) {
      config.ports = ports;
    }

    return Object.keys(config).length > 0 ? config : undefined;
  }

  private markFormGroupTouched() {
    Object.keys(this.monitorForm.controls).forEach(key => {
      const control = this.monitorForm.get(key);
      control?.markAsTouched();
    });
  }
} 