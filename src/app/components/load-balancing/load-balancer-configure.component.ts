import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadBalancerService } from '../../services/load-balancer.service';

export interface FrontendConfig {
  name: string;
  description?: string;
  protocol: string;
  ipVersion: string;
  ipAddress: string;
  port: number;
  certificate?: string;
  networkServiceTier: string;
}

export interface BackendConfig {
  name: string;
  description?: string;
  type: 'SERVICE' | 'BUCKET';
  protocol?: string;
  namedPort?: string;
  timeout?: number;
  backends: any[];
  healthCheck: string;
}

@Component({
  selector: 'app-load-balancer-configure',
  template: `
    <div class="configure-page">
      <div class="page-header">
        <div class="breadcrumb">
          <a (click)="navigateBack()" class="breadcrumb-link">
            <mat-icon>arrow_back</mat-icon>
            Load balancing
          </a>
          <span class="breadcrumb-separator">></span>
          <span class="breadcrumb-current">Create global external Application Load Balancer</span>
        </div>
        <div class="header-actions">
          <button mat-button class="action-button">
            <mat-icon>visibility</mat-icon>
            VIEW ILLUSTRATION
          </button>
          <button mat-button class="action-button">
            <mat-icon>help</mat-icon>
            HELP ASSISTANT
          </button>
          <button mat-button class="action-button">
            <mat-icon>school</mat-icon>
            LEARN
          </button>
        </div>
      </div>

      <div class="config-form">
        
        <!-- Basics Section -->
        <mat-card class="config-section">
          <mat-card-header>
            <mat-card-title>Basics</mat-card-title>
            <mat-card-subtitle>Provide basic information for your load balancer.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="configForm">
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Load balancer name *</mat-label>
                  <input matInput formControlName="name" placeholder="username-global-external-application-1">
                  <mat-hint>Cannot be changed later. Lower case letters, numbers, hyphens allowed with no space</mat-hint>
                  <mat-icon matSuffix class="info-icon">info</mat-icon>
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3"></textarea>
                </mat-form-field>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Frontend Configuration -->
        <mat-card class="config-section">
          <mat-card-header>
            <mat-card-title>Frontend configuration</mat-card-title>
            <mat-card-subtitle>Configure the load balancer's frontend IP address, port, and protocol. Configure an SSL certificate if using HTTPS.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="section-header">
              <h3>Frontend IPs and ports</h3>
            </div>
            
            <div class="frontend-item">
              <div class="frontend-header" (click)="toggleFrontend()">
                <span class="frontend-name">{{ frontendConfig.name }}</span>
                <span class="frontend-protocol">Protocol: {{ frontendConfig.protocol }}, Port: {{ frontendConfig.port }}</span>
                <span class="frontend-status">(Not saved)</span>
                <mat-icon class="expand-icon">
                  {{ expandedFrontend ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </div>
              
              <div class="frontend-details" *ngIf="expandedFrontend">
                <form [formGroup]="frontendForm">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Frontend name</mat-label>
                      <input matInput formControlName="name">
                      <mat-hint>Lower case letters, numbers, hyphens allowed with no space</mat-hint>
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Description</mat-label>
                      <textarea matInput formControlName="description" rows="2"></textarea>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Protocol *</mat-label>
                      <mat-select formControlName="protocol">
                        <mat-option value="HTTP">HTTP</mat-option>
                        <mat-option value="HTTPS">HTTPS (includes HTTP/2)</mat-option>
                      </mat-select>
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>IP version *</mat-label>
                      <mat-select formControlName="ipVersion">
                        <mat-option value="IPv4">IPv4</mat-option>
                        <mat-option value="IPv6">IPv6</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>IP address *</mat-label>
                      <mat-select formControlName="ipAddress">
                        <mat-option value="Ephemeral">Ephemeral</mat-option>
                        <mat-option value="Static">Create IP address</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Port *</mat-label>
                      <input matInput type="number" formControlName="port">
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <h4>Network service tier</h4>
                    <span class="tier-label">Premium</span>
                  </div>

                  <div class="frontend-actions">
                    <button mat-button (click)="cancelFrontend()">CANCEL</button>
                    <button mat-raised-button color="primary" (click)="saveFrontend()">DONE</button>
                  </div>
                </form>
              </div>
            </div>

            <button mat-button color="primary" class="add-button">
              <mat-icon>add</mat-icon>
              ADD FRONTEND IP AND PORT
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Backend Configuration -->
        <mat-card class="config-section">
          <mat-card-header>
            <mat-card-title>Backend configuration</mat-card-title>
            <mat-card-subtitle>Create or select a backend service for incoming traffic. You can add multiple backend services and backend buckets to serve different types of content.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="section-header">
              <h3>Backend services and backend buckets</h3>
            </div>

            <div class="backend-item">
              <div class="backend-header">
                <span class="backend-name">{{ backendConfig.name }}</span>
                <span class="backend-info">Backend service, 1 Instance group, Cloud CDN: On</span>
                <span class="backend-status">(Not saved)</span>
                <mat-icon class="expand-icon">expand_more</mat-icon>
              </div>
            </div>

            <button mat-button color="primary" class="add-button">
              <mat-icon>add</mat-icon>
              ADD BACKEND SERVICE OR BACKEND BUCKET
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Routing Rules -->
        <mat-card class="config-section">
          <mat-card-header>
            <mat-card-title>Routing rules</mat-card-title>
            <mat-card-subtitle>Routing rules determine how your traffic will be directed. You can direct traffic to a backend service or a storage bucket.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="section-header">
              <h3>Routing rules mode</h3>
            </div>

            <form [formGroup]="routingForm">
              <mat-radio-group formControlName="routingMode" class="routing-mode-group">
                <div class="routing-option">
                  <mat-radio-button value="simple">Simple</mat-radio-button>
                  <div class="routing-description">
                    <span>Configure simple routing based on the request host and path.</span>
                  </div>
                </div>
                <div class="routing-option">
                  <mat-radio-button value="advanced">Advanced</mat-radio-button>
                  <div class="routing-description">
                    <span>Configure advanced traffic management features such as redirects, URL rewrites, traffic splitting, HTTP header transformations, and so on.</span>
                  </div>
                </div>
              </mat-radio-group>

              <div *ngIf="routingForm.get('routingMode')?.value === 'simple'">
                <div class="section-header">
                  <h3>Simple host and path rules</h3>
                </div>

                <div class="routing-rules">
                  <div class="rule-row">
                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Host 1 (Default)</mat-label>
                      <input matInput readonly>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Path 1 (Default)</mat-label>
                      <input matInput readonly>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Backend service *</mat-label>
                      <mat-select formControlName="defaultBackend">
                        <mat-option value="lb-2023-backend-1">lb-2023-backend-1</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <button mat-button color="primary" class="add-button">
                    <mat-icon>add</mat-icon>
                    ADD HOST AND PATH RULE
                  </button>
                </div>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Final Actions -->
        <div class="final-actions">
          <button mat-button (click)="cancel()">CANCEL</button>
          <button mat-raised-button color="primary" (click)="createLoadBalancer()">
            CREATE
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .configure-page {
      padding: 20px;
      background-color: #fafafa;
      min-height: 100vh;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      font-size: 14px;
    }

    .breadcrumb-link {
      display: flex;
      align-items: center;
      color: #1a73e8;
      text-decoration: none;
      cursor: pointer;
      gap: 4px;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      margin: 0 8px;
      color: #5f6368;
    }

    .breadcrumb-current {
      color: #5f6368;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1a73e8;
      font-weight: 500;
    }

    .config-form {
      max-width: 1200px;
    }

    .config-section {
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .config-section mat-card-header {
      padding-bottom: 16px;
    }

    .config-section mat-card-title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    }

    .config-section mat-card-subtitle {
      font-size: 14px;
      color: #5f6368;
      margin-top: 4px;
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .form-row {
      margin-bottom: 16px;
    }

    .form-field {
      width: 100%;
    }

    .form-field-inline {
      width: calc(25% - 12px);
      margin-right: 16px;
    }

    .form-field-inline:last-child {
      margin-right: 0;
    }

    .info-icon {
      color: #5f6368;
      font-size: 18px;
    }

    .frontend-item, .backend-item {
      border: 1px solid #dadce0;
      border-radius: 8px;
      margin-bottom: 12px;
      background: white;
    }

    .frontend-header, .backend-header {
      display: flex;
      align-items: center;
      padding: 16px;
      cursor: pointer;
    }

    .frontend-name, .backend-name {
      font-weight: 500;
      margin-right: 16px;
    }

    .frontend-protocol, .frontend-status, .backend-info, .backend-status {
      color: #5f6368;
      font-size: 14px;
      margin-right: 16px;
    }

    .expand-icon {
      margin-left: auto;
      color: #5f6368;
    }

    .frontend-details {
      padding: 16px;
      border-top: 1px solid #e8eaed;
    }

    .frontend-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e8eaed;
    }

    .tier-label {
      background: #e8f0fe;
      color: #1a73e8;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .add-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1a73e8;
      font-weight: 500;
    }

    .routing-mode-group {
      margin-bottom: 24px;
    }

    .routing-option {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .routing-description {
      margin-left: 32px;
      color: #5f6368;
      font-size: 14px;
    }

    .routing-rules {
      background: #f8f9fa;
      border: 1px solid #e8eaed;
      border-radius: 8px;
      padding: 16px;
    }

    .rule-row {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      gap: 16px;
    }

    .rule-row:last-child {
      margin-bottom: 0;
    }

    .final-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding: 24px 0;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class LoadBalancerConfigureComponent implements OnInit {
  configForm: FormGroup;
  frontendForm: FormGroup;
  routingForm: FormGroup;
  expandedFrontend = false;

  frontendConfig = {
    name: 'lb-2023-frontend-1',
    protocol: 'HTTP',
    port: 80
  };

  backendConfig = {
    name: 'lb-2023-backend-1'
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loadBalancerService: LoadBalancerService
  ) {
    this.configForm = this.fb.group({
      name: ['username-global-external-application-1', Validators.required],
      description: ['']
    });

    this.frontendForm = this.fb.group({
      name: ['lb-2023-frontend-1'],
      description: [''],
      protocol: ['HTTP'],
      ipVersion: ['IPv4'],
      ipAddress: ['Ephemeral'],
      port: [80]
    });

    this.routingForm = this.fb.group({
      routingMode: ['simple'],
      defaultBackend: ['lb-2023-backend-1']
    });
  }

  ngOnInit() {
    // Component is ready
  }

  navigateBack() {
    this.router.navigate(['/load-balancing/create']);
  }

  toggleFrontend() {
    this.expandedFrontend = !this.expandedFrontend;
  }

  saveFrontend() {
    this.frontendConfig.name = this.frontendForm.get('name')?.value || 'lb-2023-frontend-1';
    this.frontendConfig.protocol = this.frontendForm.get('protocol')?.value || 'HTTP';
    this.frontendConfig.port = this.frontendForm.get('port')?.value || 80;
    this.expandedFrontend = false;
  }

  cancelFrontend() {
    this.expandedFrontend = false;
  }

  cancel() {
    this.router.navigate(['/load-balancing']);
  }

  createLoadBalancer() {
    const config = {
      basics: this.configForm.value,
      frontend: this.frontendForm.value,
      routing: this.routingForm.value
    };
    
    console.log('Creating load balancer with configuration:', config);
    this.router.navigate(['/load-balancing']);
  }
} 