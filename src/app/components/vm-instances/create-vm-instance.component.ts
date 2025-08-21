import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ComputeEngineService } from '../../services/compute-engine.service';

interface MachineType {
  name: string;
  description: string;
  vCpus: number;
  memory: number;
  platform: string;
  series: string;
}

interface CostEstimate {
  vCpu: number;
  memory: number;
  storage: number;
  total: number;
}

@Component({
  selector: 'app-create-vm-instance',
  template: `
    <div class="create-vm-container">
      <!-- Header -->
      <div class="header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1>Create an instance</h1>
          <p class="subtitle">Create a virtual machine instance in Google Cloud</p>
        </div>
      </div>

      <div class="content-layout">
        <!-- Main Form -->
        <div class="form-section">
          <form [formGroup]="instanceForm" (ngSubmit)="createInstance()">
            
            <!-- Machine Configuration -->
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>computer</mat-icon>
                  Machine configuration
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <!-- Instance Name -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name *</mat-label>
                  <input matInput formControlName="name" placeholder="instance-20250612-191642">
                  <mat-hint>Name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens</mat-hint>
                </mat-form-field>

                <!-- Region and Zone -->
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Region *</mat-label>
                    <mat-select formControlName="region" (selectionChange)="onRegionChange()">
                      <mat-option value="us-central1">us-central1 (Iowa)</mat-option>
                      <mat-option value="us-east1">us-east1 (South Carolina)</mat-option>
                      <mat-option value="us-west1">us-west1 (Oregon)</mat-option>
                      <mat-option value="europe-west1">europe-west1 (Belgium)</mat-option>
                      <mat-option value="asia-east1">asia-east1 (Taiwan)</mat-option>
                    </mat-select>
                    <mat-hint>Region is permanent</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Zone *</mat-label>
                    <mat-select formControlName="zone">
                      <mat-option value="any">Any</mat-option>
                      <mat-option *ngFor="let zone of availableZones" [value]="zone">{{ zone }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <!-- Machine Type -->
                <div class="machine-type-section">
                  <h3>Machine type</h3>
                  <p class="section-description">Machine types for common workloads, optimized for cost and flexibility</p>
                  
                  <!-- Machine Type Selection -->
                  <mat-radio-group formControlName="machineTypeCategory" (change)="onMachineTypeCategoryChange()">
                    <div class="machine-type-options">
                      <mat-radio-button value="general-purpose" class="machine-type-option">
                        <div class="option-content">
                          <div class="option-header">
                            <span class="option-title">General-purpose</span>
                            <span class="option-badge">Recommended</span>
                          </div>
                          <p class="option-description">Compute-optimized</p>
                        </div>
                      </mat-radio-button>
                      
                      <mat-radio-button value="compute-optimized" class="machine-type-option">
                        <div class="option-content">
                          <div class="option-header">
                            <span class="option-title">Compute-optimized</span>
                          </div>
                          <p class="option-description">Memory-optimized</p>
                        </div>
                      </mat-radio-button>
                      
                      <mat-radio-button value="memory-optimized" class="machine-type-option">
                        <div class="option-content">
                          <div class="option-header">
                            <span class="option-title">Memory-optimized</span>
                          </div>
                          <p class="option-description">Storage-optimized</p>
                        </div>
                      </mat-radio-button>
                    </div>
                  </mat-radio-group>

                  <!-- Machine Type Table -->
                  <div class="machine-type-table" *ngIf="filteredMachineTypes.length > 0">
                    <table mat-table [dataSource]="filteredMachineTypes" class="machine-table">
                      <!-- Selection Column -->
                      <ng-container matColumnDef="select">
                        <th mat-header-cell *matHeaderCellDef></th>
                        <td mat-cell *matCellDef="let machineType">
                          <mat-radio-button 
                            [value]="machineType.name" 
                            formControlName="machineType"
                            (change)="onMachineTypeChange(machineType)">
                          </mat-radio-button>
                        </td>
                      </ng-container>

                      <!-- Series Column -->
                      <ng-container matColumnDef="series">
                        <th mat-header-cell *matHeaderCellDef>Series</th>
                        <td mat-cell *matCellDef="let machineType">{{ machineType.series }}</td>
                      </ng-container>

                      <!-- Description Column -->
                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Description</th>
                        <td mat-cell *matCellDef="let machineType">{{ machineType.description }}</td>
                      </ng-container>

                      <!-- vCPUs Column -->
                      <ng-container matColumnDef="vcpus">
                        <th mat-header-cell *matHeaderCellDef>vCPUs</th>
                        <td mat-cell *matCellDef="let machineType">{{ machineType.vCpus }}</td>
                      </ng-container>

                      <!-- Memory Column -->
                      <ng-container matColumnDef="memory">
                        <th mat-header-cell *matHeaderCellDef>Memory</th>
                        <td mat-cell *matCellDef="let machineType">{{ machineType.memory }} GB</td>
                      </ng-container>

                      <!-- CPU Platform Column -->
                      <ng-container matColumnDef="platform">
                        <th mat-header-cell *matHeaderCellDef>CPU Platform</th>
                        <td mat-cell *matCellDef="let machineType">{{ machineType.platform }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="machineTypeColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: machineTypeColumns;" 
                          [class.selected-row]="instanceForm.get('machineType')?.value === row.name"></tr>
                    </table>
                  </div>

                  <!-- Custom Machine Type -->
                  <div class="custom-machine-section" *ngIf="instanceForm.get('machineType')?.value === 'custom'">
                    <h4>Custom machine type</h4>
                    <div class="custom-config">
                      <mat-form-field appearance="outline">
                        <mat-label>vCPUs</mat-label>
                        <mat-select formControlName="customVcpus">
                          <mat-option value="1">1 vCPU (1 shared core)</mat-option>
                          <mat-option value="2">2 vCPUs</mat-option>
                          <mat-option value="4">4 vCPUs</mat-option>
                          <mat-option value="8">8 vCPUs</mat-option>
                        </mat-select>
                      </mat-form-field>
                      
                      <mat-form-field appearance="outline">
                        <mat-label>Memory</mat-label>
                        <mat-select formControlName="customMemory">
                          <mat-option value="4">4 GB</mat-option>
                          <mat-option value="8">8 GB</mat-option>
                          <mat-option value="16">16 GB</mat-option>
                          <mat-option value="32">32 GB</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- OS and Storage -->
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>storage</mat-icon>
                  OS and storage
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <!-- Boot Disk -->
                <div class="boot-disk-section">
                  <h3>Boot disk</h3>
                  <div class="boot-disk-config">
                    <mat-form-field appearance="outline">
                      <mat-label>Operating system</mat-label>
                      <mat-select formControlName="operatingSystem">
                        <mat-option value="debian-12">Debian GNU/Linux 12 (bookworm)</mat-option>
                        <mat-option value="ubuntu-20">Ubuntu 20.04 LTS</mat-option>
                        <mat-option value="ubuntu-22">Ubuntu 22.04 LTS</mat-option>
                        <mat-option value="centos-7">CentOS 7</mat-option>
                        <mat-option value="windows-2019">Windows Server 2019</mat-option>
                        <mat-option value="windows-2022">Windows Server 2022</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Boot disk type</mat-label>
                      <mat-select formControlName="bootDiskType">
                        <mat-option value="pd-balanced">Balanced persistent disk</mat-option>
                        <mat-option value="pd-standard">Standard persistent disk</mat-option>
                        <mat-option value="pd-ssd">SSD persistent disk</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Size (GB)</mat-label>
                      <input matInput type="number" formControlName="bootDiskSize" min="10" max="65536">
                    </mat-form-field>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Networking -->
            <mat-card class="config-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>network_check</mat-icon>
                  Networking
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <!-- Firewall -->
                <div class="firewall-section">
                  <h3>Firewall</h3>
                  <p class="section-description">Add network tags and firewall rules to allow specific network traffic from the Internet</p>
                  
                  <div class="firewall-options">
                    <mat-checkbox formControlName="allowHttpTraffic">
                      Allow HTTP traffic
                    </mat-checkbox>
                    <mat-checkbox formControlName="allowHttpsTraffic">
                      Allow HTTPS traffic
                    </mat-checkbox>
                    <mat-checkbox formControlName="allowLoadBalancerHealthChecks">
                      Allow Load Balancer Health Checks
                    </mat-checkbox>
                  </div>
                </div>

                <!-- Network Tags -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Network tags</mat-label>
                  <input matInput formControlName="networkTags" placeholder="web-server, database">
                  <mat-hint>Separate multiple tags with commas</mat-hint>
                </mat-form-field>

                <!-- Network Interfaces -->
                <div class="network-interfaces-section">
                  <h3>Network interfaces</h3>
                  <p class="section-description">Network interface is permanent</p>
                  
                  <div class="network-interface-config">
                    <mat-form-field appearance="outline">
                      <mat-label>Network</mat-label>
                      <mat-select formControlName="network">
                        <mat-option *ngFor="let network of availableNetworks" [value]="network.name">
                          {{ network.name }}
                          <span class="network-description" *ngIf="network.description"> - {{ network.description }}</span>
                        </mat-option>
                      </mat-select>
                      <mat-hint *ngIf="availableNetworks.length === 0">Loading networks...</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Subnet</mat-label>
                      <mat-select formControlName="subnet">
                        <mat-option *ngFor="let subnet of availableSubnetworks" [value]="subnet.name">
                          {{ subnet.name }}
                          <span class="subnet-cidr" *ngIf="subnet.ipCidrRange"> ({{ subnet.ipCidrRange }})</span>
                        </mat-option>
                        <mat-option value="auto" *ngIf="availableSubnetworks.length === 0">
                          Automatic (subnet will be created automatically)
                        </mat-option>
                      </mat-select>
                      <mat-hint *ngIf="availableSubnetworks.length === 0">Auto-mode network - subnets created automatically</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Primary internal IPv4 address</mat-label>
                      <mat-select formControlName="internalIpType">
                        <mat-option value="ephemeral">Ephemeral (Automatic)</mat-option>
                        <mat-option value="static">Static</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>External IPv4 address</mat-label>
                      <mat-select formControlName="externalIpType">
                        <mat-option value="ephemeral">Ephemeral</mat-option>
                        <mat-option value="static">Static</mat-option>
                        <mat-option value="none">None</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button mat-button type="button" (click)="goBack()">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="instanceForm.invalid || creating">
                <mat-icon *ngIf="creating">hourglass_empty</mat-icon>
                {{ creating ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Cost Estimation Sidebar -->
        <div class="cost-sidebar">
          <mat-card class="cost-card">
            <mat-card-header>
              <mat-card-title>Monthly estimate</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="cost-summary">
                <div class="total-cost">
                  <span class="cost-amount">\${{ costEstimate.total.toFixed(2) }}</span>
                  <span class="cost-period">That's about \${{ (costEstimate.total / 30).toFixed(2) }} hourly</span>
                </div>
                <p class="cost-disclaimer">Pay for what you use, no upfront costs and per second billing</p>
              </div>

              <div class="cost-breakdown">
                <div class="cost-item">
                  <span class="item-name">{{ getSelectedVcpus() }} vCPU + {{ getSelectedMemory() }} GB memory</span>
                  <span class="item-cost">\${{ costEstimate.vCpu.toFixed(2) }}</span>
                </div>
                <div class="cost-item">
                  <span class="item-name">{{ instanceForm.get('bootDiskSize')?.value || 10 }} GB balanced persistent disk</span>
                  <span class="item-cost">\${{ costEstimate.storage.toFixed(2) }}</span>
                </div>
                <div class="cost-item">
                  <span class="item-name">Logging</span>
                  <span class="item-cost">Cost varies</span>
                </div>
                <div class="cost-item">
                  <span class="item-name">Monitoring</span>
                  <span class="item-cost">Cost varies</span>
                </div>
                <div class="cost-item">
                  <span class="item-name">Backup plan</span>
                  <span class="item-cost">Cost varies</span>
                </div>
                <div class="cost-total">
                  <span class="total-label">Total</span>
                  <span class="total-amount">\${{ costEstimate.total.toFixed(2) }}</span>
                </div>
              </div>

              <div class="cost-links">
                <a href="#" class="cost-link">Compute Engine pricing</a>
                <a href="#" class="cost-link">Cloud Operations pricing</a>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .create-vm-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      background-color: var(--background-color);
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 32px;
      gap: 16px;
    }

    .back-button {
      color: var(--text-secondary-color);
    }

    .header-content h1 {
      font-size: 28px;
      font-weight: 400;
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .subtitle {
      color: var(--text-secondary-color);
      margin: 0;
      font-size: 14px;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 32px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .config-card {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    .config-card mat-card-header {
      padding-bottom: 16px;
    }

    .config-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
    }

    .config-card mat-card-title mat-icon {
      color: var(--primary-color);
    }

    .full-width {
      width: 100%;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .machine-type-section h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .section-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin: 0 0 16px 0;
    }

    .machine-type-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .machine-type-option {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      width: 100%;
    }

    .machine-type-option.mat-radio-button-checked {
      border-color: var(--primary-color);
      background-color: rgba(66, 133, 244, 0.04);
    }

    .option-content {
      margin-left: 32px;
    }

    .option-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .option-title {
      font-weight: 500;
      color: var(--text-color);
    }

    .option-badge {
      background: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .option-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin: 0;
    }

    .machine-type-table {
      margin-top: 16px;
    }

    .machine-table {
      width: 100%;
      background: var(--surface-color);
    }

    .machine-table th {
      background: var(--hover-color);
      font-weight: 500;
      color: var(--text-color);
    }

    .selected-row {
      background-color: rgba(66, 133, 244, 0.04);
    }

    .custom-machine-section {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--hover-color);
    }

    .custom-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .boot-disk-config {
      display: grid;
      grid-template-columns: 1fr 1fr 120px;
      gap: 16px;
    }

    .firewall-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .network-interface-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding: 24px 0;
    }

    .cost-sidebar {
      position: sticky;
      top: 24px;
      height: fit-content;
    }

    .cost-card {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    .cost-summary {
      margin-bottom: 24px;
    }

    .total-cost {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;
    }

    .cost-amount {
      font-size: 24px;
      font-weight: 500;
      color: var(--text-color);
    }

    .cost-period {
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    .cost-disclaimer {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin: 0;
    }

    .cost-breakdown {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    .cost-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
    }

    .item-name {
      color: var(--text-color);
    }

    .item-cost {
      color: var(--text-secondary-color);
      font-weight: 500;
    }

    .cost-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-top: 1px solid var(--border-color);
      margin-top: 8px;
      font-weight: 500;
    }

    .total-label {
      color: var(--text-color);
    }

    .total-amount {
      color: var(--text-color);
      font-size: 16px;
    }

    .cost-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .cost-link {
      color: var(--primary-color);
      text-decoration: none;
      font-size: 14px;
    }

    .cost-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 1024px) {
      .content-layout {
        grid-template-columns: 1fr;
      }

      .cost-sidebar {
        order: -1;
        position: static;
      }

      .form-row,
      .boot-disk-config,
      .custom-config,
      .network-interface-config {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreateVmInstanceComponent implements OnInit, OnDestroy {
  instanceForm: FormGroup;
  creating = false;
  availableZones: string[] = [];
  machineTypes: MachineType[] = [];
  filteredMachineTypes: MachineType[] = [];
  availableNetworks: any[] = [];
  availableSubnetworks: any[] = [];
  costEstimate: CostEstimate = { vCpu: 24.46, memory: 0, storage: 1.00, total: 25.46 };
  
  machineTypeColumns = ['select', 'series', 'description', 'vcpus', 'memory', 'platform'];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private computeEngineService: ComputeEngineService
  ) {
    this.instanceForm = this.createForm();
  }

  ngOnInit() {
    this.initializeMachineTypes();
    this.setupFormListeners();
    this.updateCostEstimate();
    this.loadNetworks();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['instance-' + this.generateInstanceId(), [Validators.required, Validators.pattern(/^[a-z]([a-z0-9-]*[a-z0-9])?$/)]],
      region: ['us-central1', Validators.required],
      zone: ['any', Validators.required],
      machineTypeCategory: ['general-purpose', Validators.required],
      machineType: ['e2-medium', Validators.required],
      customVcpus: [2],
      customMemory: [4],
      operatingSystem: ['debian-12', Validators.required],
      bootDiskType: ['pd-balanced', Validators.required],
      bootDiskSize: [10, [Validators.required, Validators.min(10), Validators.max(65536)]],
      allowHttpTraffic: [false],
      allowHttpsTraffic: [false],
      allowLoadBalancerHealthChecks: [false],
      networkTags: [''],
      network: ['', Validators.required],
      subnet: ['auto', Validators.required],
      internalIpType: ['ephemeral', Validators.required],
      externalIpType: ['ephemeral', Validators.required]
    });
  }

  private generateInstanceId(): string {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') + '-' +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
  }

  private initializeMachineTypes() {
    this.machineTypes = [
      { name: 'e2-medium', description: 'Consistently high performance', series: 'E2', vCpus: 1, memory: 4, platform: 'Intel Broadwell' },
      { name: 'e2-standard-2', description: 'Consistently high performance', series: 'E2', vCpus: 2, memory: 8, platform: 'Intel Broadwell' },
      { name: 'e2-standard-4', description: 'Consistently high performance', series: 'E2', vCpus: 4, memory: 16, platform: 'Intel Broadwell' },
      { name: 'c2-standard-4', description: 'Consistently high performance', series: 'C2', vCpus: 4, memory: 16, platform: 'Intel Cascade Lake' },
      { name: 'c2-standard-8', description: 'Consistently high performance', series: 'C2', vCpus: 8, memory: 32, platform: 'Intel Cascade Lake' },
      { name: 'n1-standard-1', description: 'Flexible & cost-optimized', series: 'N1', vCpus: 1, memory: 3.75, platform: 'Intel Broadwell' },
      { name: 'n1-standard-2', description: 'Flexible & cost-optimized', series: 'N1', vCpus: 2, memory: 7.5, platform: 'Intel Broadwell' },
      { name: 'n1-standard-4', description: 'Flexible & cost-optimized', series: 'N1', vCpus: 4, memory: 15, platform: 'Intel Broadwell' }
    ];
    
    this.filterMachineTypes();
  }

  private setupFormListeners() {
    // Update zones when region changes
    this.instanceForm.get('region')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAvailableZones();
        this.loadSubnetworks();
      });

    // Update machine types when category changes
    this.instanceForm.get('machineTypeCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.filterMachineTypes());

    // Update subnetworks when network changes
    this.instanceForm.get('network')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadSubnetworks());

    // Update cost estimate when relevant fields change
    this.instanceForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateCostEstimate());
  }

  onRegionChange() {
    this.updateAvailableZones();
  }

  onMachineTypeCategoryChange() {
    this.filterMachineTypes();
  }

  onMachineTypeChange(machineType: MachineType) {
    this.updateCostEstimate();
  }

  private updateAvailableZones() {
    const region = this.instanceForm.get('region')?.value;
    this.availableZones = [
      `${region}-a`,
      `${region}-b`,
      `${region}-c`,
      `${region}-f`
    ];
  }

  private loadNetworks() {
    this.computeEngineService.getNetworks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (networks) => {
          this.availableNetworks = networks || [];
          // Set default network if available
          if (this.availableNetworks.length > 0) {
            const defaultNetwork = this.availableNetworks.find(n => n.name === 'default') || this.availableNetworks[0];
            this.instanceForm.patchValue({ network: defaultNetwork.name });
          }
          this.loadSubnetworks();
        },
        error: (error) => {
          console.error('Error loading networks:', error);
          this.snackBar.open('Failed to load networks', 'Close', { duration: 3000 });
        }
      });
  }

  private loadSubnetworks() {
    const region = this.instanceForm.get('region')?.value;
    const networkName = this.instanceForm.get('network')?.value;
    
    if (!region || !networkName) {
      return;
    }

    this.computeEngineService.getSubnetworks(region)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subnetworks) => {
          this.availableSubnetworks = subnetworks || [];
          // Set default subnetwork if available
          if (this.availableSubnetworks.length > 0) {
            const defaultSubnet = this.availableSubnetworks.find(s => s.name === 'default') || this.availableSubnetworks[0];
            this.instanceForm.patchValue({ subnet: defaultSubnet.name });
          }
        },
        error: (error) => {
          console.error('Error loading subnetworks:', error);
          // Don't show error for subnetworks as they might not exist for auto-mode networks
        }
      });
  }

  private filterMachineTypes() {
    const category = this.instanceForm.get('machineTypeCategory')?.value;
    
    switch (category) {
      case 'general-purpose':
        this.filteredMachineTypes = this.machineTypes.filter(mt => mt.series === 'E2' || mt.series === 'N1');
        break;
      case 'compute-optimized':
        this.filteredMachineTypes = this.machineTypes.filter(mt => mt.series === 'C2');
        break;
      case 'memory-optimized':
        this.filteredMachineTypes = this.machineTypes.filter(mt => mt.series === 'M1' || mt.series === 'M2');
        break;
      default:
        this.filteredMachineTypes = this.machineTypes;
    }
  }

  private updateCostEstimate() {
    const selectedMachineType = this.getSelectedMachineType();
    const diskSize = this.instanceForm.get('bootDiskSize')?.value || 10;
    
    // Simple cost calculation (approximate)
    const vCpuCost = selectedMachineType ? selectedMachineType.vCpus * 12.23 : 24.46;
    const memoryCost = 0; // Included in vCPU cost for simplicity
    const storageCost = diskSize * 0.10;
    
    this.costEstimate = {
      vCpu: vCpuCost,
      memory: memoryCost,
      storage: storageCost,
      total: vCpuCost + memoryCost + storageCost
    };
  }

  getSelectedMachineType(): MachineType | null {
    const machineTypeName = this.instanceForm.get('machineType')?.value;
    return this.machineTypes.find(mt => mt.name === machineTypeName) || null;
  }

  getSelectedVcpus(): number {
    const selectedMachineType = this.getSelectedMachineType();
    if (selectedMachineType) {
      return selectedMachineType.vCpus;
    }
    return this.instanceForm.get('customVcpus')?.value || 2;
  }

  getSelectedMemory(): number {
    const selectedMachineType = this.getSelectedMachineType();
    if (selectedMachineType) {
      return selectedMachineType.memory;
    }
    return this.instanceForm.get('customMemory')?.value || 4;
  }

  goBack() {
    this.router.navigate(['/vm-instances']);
  }

  createInstance() {
    if (this.instanceForm.valid) {
      this.creating = true;
      
      const formValue = this.instanceForm.value;
      const instanceConfig = {
        name: formValue.name,
        zone: formValue.zone === 'any' ? `${formValue.region}-a` : formValue.zone,
        machineType: formValue.machineType,
        sourceImage: this.getSourceImage(formValue.operatingSystem),
        bootDiskType: formValue.bootDiskType,
        bootDiskSize: formValue.bootDiskSize,
        networkTags: formValue.networkTags ? formValue.networkTags.split(',').map((tag: string) => tag.trim()) : [],
        allowHttpTraffic: formValue.allowHttpTraffic,
        allowHttpsTraffic: formValue.allowHttpsTraffic,
        network: formValue.network,
        subnet: formValue.subnet,
        externalIp: formValue.externalIpType !== 'none'
      };

      // Call the compute engine service to create the instance
      this.computeEngineService.createInstance(instanceConfig).subscribe({
        next: (response) => {
          this.snackBar.open(`Instance ${formValue.name} is being created...`, 'Close', {
            duration: 5000
          });
          this.router.navigate(['/vm-instances']);
        },
        error: (error) => {
          this.creating = false;
          this.snackBar.open(`Failed to create instance: ${error.message}`, 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  private getSourceImage(os: string): string {
    const imageMap: { [key: string]: string } = {
      'debian-12': 'projects/debian-cloud/global/images/family/debian-12',
      'ubuntu-20': 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts',
      'ubuntu-22': 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts',
      'centos-7': 'projects/centos-cloud/global/images/family/centos-7',
      'windows-2019': 'projects/windows-cloud/global/images/family/windows-2019',
      'windows-2022': 'projects/windows-cloud/global/images/family/windows-2022'
    };
    
    return imageMap[os] || imageMap['debian-12'];
  }
} 