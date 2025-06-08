import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadBalancerService } from '../../services/load-balancer.service';
import { LoadBalancerCreationService, LoadBalancerCreationConfig } from '../../services/load-balancer-creation.service';
import { MatDialog } from '@angular/material/dialog';
import { LoadBalancerCreationProgressComponent, LoadBalancerCreationData, CreationStep } from './load-balancer-creation-progress.component';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

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

export interface BackendService {
  id: string;
  name: string;
  description?: string;
  type: 'SERVICE' | 'BUCKET';
  protocol?: string;
  namedPort?: string;
  timeout?: number;
  backends: Backend[];
  healthCheck: HealthCheck;
  cloudCDN: boolean;
  cacheMode: string;
  logging: boolean;
  cloudArmorBackendSecurityPolicy: string;
  cloudArmorEdgeSecurityPolicy: string;
  addingMethod: 'CREATE_SERVICE' | 'CREATE_BUCKET' | 'SELECT_EXISTING';
  cloudStorageBucket?: string;
}

export interface Backend {
  id: string;
  instanceGroup: string;
  zone: string;
  port: number;
  balancingMode: 'UTILIZATION' | 'RATE';
  maxBackendUtilization?: number;
  maxRPS?: number;
  capacity?: number;
  scope: string;
}

export interface HealthCheckOption {
  id: string;
  name: string;
  description: string;
  protocol: string;
  port: number;
  checkInterval: number;
  timeout: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
}

export interface HealthCheck {
  name: string;
  protocol: string;
  port: number;
  checkInterval: number;
  unhealthyThreshold: number;
  healthyThreshold?: number;
  timeout?: number;
  proxyProtocol?: string;
  request?: string;
  response?: string;
  logs?: boolean;
}

export interface RoutingRule {
  id: string;
  hostPattern: string;
  pathPattern: string;
  backendService: string;
}

export interface AdvancedRoutingRule {
  id: string;
  matchRule: string;
  routeAction: string;
  service: string;
  priority: string;
  hostPattern?: string;
  pathMatcher?: string;
}

export interface HostRule {
  id: string;
  hosts: string[];
  pathMatcher: string;
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
          <button mat-button class="action-button" (click)="showLoadBalancerIllustration()">
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
            
            <div *ngFor="let frontend of frontendConfigs; let i = index; trackBy: trackByFrontendName" class="frontend-item">
              <div class="frontend-header" (click)="toggleFrontend(i)">
                <div class="frontend-info">
                  <span class="frontend-name">{{ frontend.name }}</span>
                  <span class="frontend-protocol">Protocol: {{ frontend.protocol }}, Port: {{ frontend.port }}</span>
                <span class="frontend-status">(Not saved)</span>
                </div>
                <div class="frontend-actions">
                  <button *ngIf="i > 0" 
                          mat-icon-button 
                          (click)="deleteFrontend(i); $event.stopPropagation()"
                          matTooltip="Delete frontend">
                    <mat-icon>delete</mat-icon>
                  </button>
                <mat-icon class="expand-icon">
                    {{ expandedFrontends[i] ? 'expand_less' : 'expand_more' }}
                </mat-icon>
                </div>
              </div>
              
              <div class="frontend-details" *ngIf="expandedFrontends[i]">
                <div class="frontend-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Frontend name</mat-label>
                      <input matInput [(ngModel)]="frontend.name">
                      <mat-hint>Lower case letters, numbers, hyphens allowed with no space</mat-hint>
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Description</mat-label>
                      <textarea matInput [(ngModel)]="frontend.description" rows="2"></textarea>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Protocol *</mat-label>
                      <mat-select [(ngModel)]="frontend.protocol">
                        <mat-option value="HTTP">HTTP</mat-option>
                        <mat-option value="HTTPS">HTTPS (includes HTTP/2)</mat-option>
                      </mat-select>
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>IP version *</mat-label>
                      <mat-select [(ngModel)]="frontend.ipVersion">
                        <mat-option value="IPv4">IPv4</mat-option>
                        <mat-option value="IPv6">IPv6</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>IP address *</mat-label>
                      <mat-select [(ngModel)]="frontend.ipAddress">
                        <mat-option value="Ephemeral">Ephemeral</mat-option>
                        <mat-option value="Static">Create IP address</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Port *</mat-label>
                      <input matInput type="number" [(ngModel)]="frontend.port">
                      <mat-icon matSuffix class="info-icon">info</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <h4>Network service tier</h4>
                    <span class="tier-label">{{ frontend.networkServiceTier }}</span>
                  </div>

                  <div class="frontend-actions">
                    <button mat-button (click)="cancelFrontend(i)">CANCEL</button>
                    <button mat-raised-button color="primary" (click)="saveFrontend(i)">DONE</button>
                  </div>
                </div>
              </div>
            </div>

            <button mat-button color="primary" class="add-button" (click)="addFrontend()">
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

            <!-- Existing Backend Services -->
            <div *ngFor="let backendService of backendServices; let i = index" class="backend-item">
              <div class="backend-header" (click)="toggleBackendService(i)">
                <div class="backend-info">
                  <span class="backend-name">{{ backendService.name }}</span>
                  <span class="backend-details">
                    Backend service, {{ backendService.backends.length }} 
                    {{ backendService.backends.length === 1 ? 'Instance group' : 'Instance groups' }}, 
                    Cloud CDN: {{ backendService.cloudCDN ? 'On' : 'Off' }}
                  </span>
                <span class="backend-status">(Not saved)</span>
                </div>
                <div class="backend-actions">
                  <button mat-icon-button (click)="deleteBackendService(i); $event.stopPropagation()">
                    <mat-icon>delete</mat-icon>
                  </button>
                  <mat-icon class="expand-icon">
                    {{ expandedBackendServices[i] ? 'expand_less' : 'expand_more' }}
                  </mat-icon>
              </div>
            </div>

              <!-- Backend Service Details -->
              <div class="backend-details-panel" *ngIf="expandedBackendServices[i]">
                <form [formGroup]="getBackendServiceForm(i)">
                  
                  <!-- Adding Method Section -->
                  <div class="adding-method-section">
                    <h4>Adding method</h4>
                    <mat-radio-group 
                      [value]="backendService.addingMethod" 
                      (change)="onAddingMethodChange(i, $event.value)"
                      class="adding-method-group">
                      <mat-radio-button value="CREATE_SERVICE">
                        Create new backend service
                      </mat-radio-button>
                      <mat-radio-button value="CREATE_BUCKET">
                        Create new backend bucket
                      </mat-radio-button>
                      <mat-radio-button value="SELECT_EXISTING">
                        Select an existing backend service or backend bucket
                      </mat-radio-button>
                    </mat-radio-group>
                  </div>

                  <!-- Basics Section -->
                  <div class="basics-section">
                    <h4>Basics</h4>
                    
                    <!-- Backend Service Name -->
                    <div class="form-row" *ngIf="backendService.addingMethod === 'CREATE_SERVICE'">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Backend service name *</mat-label>
                        <input matInput formControlName="name" [value]="backendService.name">
                        <mat-hint>Cannot be changed later. Lower case letters, numbers, hyphens allowed with no space</mat-hint>
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>
                    </div>

                    <!-- Backend Bucket Name -->
                    <div class="form-row" *ngIf="backendService.addingMethod === 'CREATE_BUCKET'">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Backend bucket name *</mat-label>
                        <input matInput formControlName="name" [value]="backendService.name">
                        <mat-hint>Cannot be changed later. Lower case letters, numbers, hyphens allowed with no space</mat-hint>
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>
                    </div>

                    <!-- Description -->
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Description</mat-label>
                        <textarea matInput formControlName="description" [value]="backendService.description" rows="3"></textarea>
                      </mat-form-field>
                    </div>

                    <!-- Cloud Storage Bucket (for bucket type) -->
                    <div class="form-row" *ngIf="backendService.addingMethod === 'CREATE_BUCKET'">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Cloud storage bucket *</mat-label>
                        <input matInput formControlName="cloudStorageBucket" [value]="backendService.cloudStorageBucket" readonly>
                        <button mat-stroked-button matSuffix (click)="browseBucket(i)" class="browse-button">
                          BROWSE
                        </button>
                        <mat-icon matPrefix class="bucket-icon">folder</mat-icon>
                      </mat-form-field>
                    </div>

                    <!-- Backend Service Configuration (for service type) -->
                    <div *ngIf="backendService.addingMethod === 'CREATE_SERVICE'" class="service-config">
                      <div class="form-row">
                        <mat-form-field appearance="outline" class="form-field-inline">
                          <mat-label>Backend type *</mat-label>
                          <mat-select formControlName="type" [value]="backendService.type">
                            <mat-option value="INSTANCE_GROUP">Instance group</mat-option>
                            <mat-option value="NETWORK_ENDPOINT_GROUP">Network endpoint group</mat-option>
                            <mat-option value="BUCKET">Cloud Storage bucket</mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="form-field-inline">
                          <mat-label>Protocol *</mat-label>
                          <mat-select formControlName="protocol" [value]="backendService.protocol">
                            <mat-option value="HTTP">HTTP</mat-option>
                            <mat-option value="HTTPS">HTTPS</mat-option>
                            <mat-option value="HTTP2">HTTP/2</mat-option>
                          </mat-select>
                          <mat-icon matSuffix class="info-icon">info</mat-icon>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="form-field-inline">
                          <mat-label>Named port *</mat-label>
                          <input matInput formControlName="namedPort" [value]="backendService.namedPort" placeholder="http">
                          <mat-icon matSuffix class="info-icon">info</mat-icon>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="form-field-inline">
                          <mat-label>Timeout *</mat-label>
                          <input matInput type="number" formControlName="timeout" [value]="backendService.timeout" placeholder="30">
                          <span matSuffix>seconds</span>
                          <mat-icon matSuffix class="info-icon">info</mat-icon>
                        </mat-form-field>
                      </div>
                    </div>
                  </div>

                  <!-- Advanced Features Section -->
                  <div class="advanced-features-section">
                    <div class="advanced-features-header" (click)="editAdvancedFeatures(i)">
                      <h4>Advanced features</h4>
                      <mat-icon class="edit-icon">edit</mat-icon>
                    </div>
                    
                    <div class="advanced-features-info">
                      <div class="feature-row">
                        <span class="label">Cloud CDN</span>
                        <span class="value">{{ backendService.cloudCDN ? 'On' : 'Off' }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Cache mode</span>
                        <span class="value">{{ backendService.cacheMode }}</span>
                      </div>
                      <div class="feature-row" *ngIf="backendService.addingMethod === 'CREATE_SERVICE'">
                        <span class="label">Logging</span>
                        <span class="value">{{ backendService.logging ? 'On' : 'Off' }}</span>
                      </div>
                      <div class="feature-row" *ngIf="backendService.addingMethod === 'CREATE_SERVICE'">
                        <span class="label">Cloud Armor backend security policy</span>
                        <span class="value">{{ backendService.cloudArmorBackendSecurityPolicy }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Cloud Armor edge security policy</span>
                        <span class="value">{{ backendService.cloudArmorEdgeSecurityPolicy }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Backends Section (only for services) -->
                  <div class="backends-section" *ngIf="backendService.addingMethod === 'CREATE_SERVICE'">
                    <h4>Backends</h4>
                    
                    <div *ngFor="let backend of backendService.backends; let j = index" class="backend-entry">
                      <div class="backend-entry-header">
                        <span class="backend-entry-name">{{ backend.instanceGroup }}</span>
                        <span class="backend-entry-details">Zone: {{ backend.zone }}, Port: {{ backend.port }}</span>
                        <button mat-icon-button (click)="removeBackend(i, j)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                      
                      <div class="backend-entry-expanded" *ngIf="expandedBackends[i]?.[j]">
                        <div class="form-row">
                          <mat-form-field appearance="outline" class="form-field-inline">
                            <mat-label>Instance group *</mat-label>
                            <mat-select [(ngModel)]="backend.instanceGroup">
                              <mat-option value="username-instance-group-1">username-instance-group-1</mat-option>
                              <mat-option value="web-servers-group">web-servers-group</mat-option>
                              <mat-option value="api-servers-group">api-servers-group</mat-option>
                            </mat-select>
                          </mat-form-field>

                          <mat-form-field appearance="outline" class="form-field-inline">
                            <mat-label>Port numbers *</mat-label>
                            <input matInput type="number" [(ngModel)]="backend.port" placeholder="80">
                          </mat-form-field>
                        </div>

                        <div class="balancing-mode-section">
                          <h5>Balancing mode <mat-icon class="info-icon">info</mat-icon></h5>
                          
                          <mat-radio-group [(ngModel)]="backend.balancingMode" class="balancing-mode-group">
                            <mat-radio-button value="UTILIZATION">Utilization</mat-radio-button>
                            <mat-radio-button value="RATE">Rate</mat-radio-button>
                          </mat-radio-group>

                          <div *ngIf="backend.balancingMode === 'UTILIZATION'" class="balancing-config">
                            <div class="form-row">
                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Maximum backend utilization *</mat-label>
                                <input matInput type="number" [(ngModel)]="backend.maxBackendUtilization" placeholder="80">
                                <span matSuffix>%</span>
                                <mat-icon matSuffix class="info-icon">info</mat-icon>
                              </mat-form-field>

                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Maximum RPS</mat-label>
                                <input matInput type="number" [(ngModel)]="backend.maxRPS" placeholder="35">
                                <span matSuffix>RPS</span>
                                <mat-icon matSuffix class="info-icon">info</mat-icon>
                              </mat-form-field>

                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Capacity *</mat-label>
                                <input matInput type="number" [(ngModel)]="backend.capacity" placeholder="100">
                                <span matSuffix>%</span>
                                <mat-icon matSuffix class="info-icon">info</mat-icon>
                              </mat-form-field>

                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Scope</mat-label>
                                <mat-select [(ngModel)]="backend.scope">
                                  <mat-option value="per instance">per instance</mat-option>
                                  <mat-option value="per group">per group</mat-option>
                                </mat-select>
                              </mat-form-field>
                            </div>
                          </div>

                          <div *ngIf="backend.balancingMode === 'RATE'" class="balancing-config">
                            <div class="form-row">
                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Maximum RPS *</mat-label>
                                <input matInput type="number" [(ngModel)]="backend.maxRPS" placeholder="100">
                                <span matSuffix>RPS</span>
                                <mat-icon matSuffix class="info-icon">info</mat-icon>
                              </mat-form-field>

                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Capacity *</mat-label>
                                <input matInput type="number" [(ngModel)]="backend.capacity" placeholder="100">
                                <span matSuffix>%</span>
                                <mat-icon matSuffix class="info-icon">info</mat-icon>
                              </mat-form-field>

                              <mat-form-field appearance="outline" class="form-field-inline">
                                <mat-label>Scope</mat-label>
                                <mat-select [(ngModel)]="backend.scope">
                                  <mat-option value="per instance">per instance</mat-option>
                                  <mat-option value="per group">per group</mat-option>
                                </mat-select>
                              </mat-form-field>
                            </div>
                          </div>
                        </div>
                        
                        <div class="backend-actions">
                          <button mat-button (click)="cancelBackendEdit(i, j)">CANCEL</button>
                          <button mat-raised-button color="primary" (click)="saveBackend(i, j)">DONE</button>
                        </div>
                      </div>
                    </div>

                    <button mat-button color="primary" class="add-button" (click)="addBackend(i)">
              <mat-icon>add</mat-icon>
                      ADD BACKEND
            </button>
                  </div>

                  <!-- Health Check Section (only for services) -->
                  <div class="health-check-section" *ngIf="backendService.addingMethod === 'CREATE_SERVICE'">
                    <div class="health-check-header" (click)="editHealthCheck(i)">
                      <h4>Health check</h4>
                      <mat-icon class="edit-icon">edit</mat-icon>
            </div>

                    <div class="health-check-info">
                      <div class="health-check-row">
                        <span class="label">Health check policy name</span>
                        <span class="value">{{ backendService.healthCheck.name }}</span>
                      </div>
                      <div class="health-check-row">
                        <span class="label">Protocol</span>
                        <span class="value">{{ backendService.healthCheck.protocol }}</span>
                      </div>
                      <div class="health-check-row">
                        <span class="label">Port</span>
                        <span class="value">{{ backendService.healthCheck.port }}</span>
                      </div>
                      <div class="health-check-row">
                        <span class="label">Check interval</span>
                        <span class="value">{{ backendService.healthCheck.checkInterval }} seconds</span>
                      </div>
                      <div class="health-check-row">
                        <span class="label">Unhealthy threshold</span>
                        <span class="value">{{ backendService.healthCheck.unhealthyThreshold }} consecutive failures</span>
                      </div>
                    </div>
                  </div>

                  <div class="backend-service-actions">
                    <button mat-button (click)="cancelBackendService(i)">CANCEL</button>
                    <button mat-raised-button color="primary" (click)="saveBackendService(i)">DONE</button>
                  </div>
                </form>
              </div>
            </div>

            <button mat-button color="primary" class="add-button" (click)="addBackendService()">
              <mat-icon>add</mat-icon>
              ADD BACKEND SERVICE OR BACKEND BUCKET
            </button>

            <!-- Routing Rules Section -->
            <div class="routing-rules-section">
              <h3>Routing rules</h3>
              <p class="section-description">
                Routing rules determine how your traffic will be directed. You can direct traffic to a backend service or a storage bucket.
              </p>

              <div class="routing-mode-section">
                <h4>Routing rules mode</h4>
                
                <mat-radio-group [(ngModel)]="routingMode" class="routing-mode-group">
                <div class="routing-option">
                  <mat-radio-button value="simple">Simple</mat-radio-button>
                  <div class="routing-description">
                      <p>Configure simple routing based on the request host and path.</p>
                  </div>
                </div>
                  
                <div class="routing-option">
                  <mat-radio-button value="advanced">Advanced</mat-radio-button>
                  <div class="routing-description">
                      <p>Configure advanced traffic management features such as redirects, URL rewrites, traffic splitting, HTTP header transformations, and so on.</p>
                  </div>
                </div>
              </mat-radio-group>
                </div>

              <div *ngIf="routingMode === 'simple'" class="simple-routing">
                <h4>Simple host and path rules</h4>
                
                <div *ngFor="let rule of routingRules; let i = index; trackBy: trackByRuleId" class="routing-rule-row">
                    <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Host {{ i + 1 }} {{ i === 0 ? '(Default)' : '' }}</mat-label>
                    <input matInput 
                           [(ngModel)]="rule.hostPattern" 
                           [placeholder]="i === 0 ? '*' : 'web.example.com'">
                    <mat-hint *ngIf="i > 0">Example: web.example.com</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Path {{ i + 1 }} {{ i === 0 ? '(Default)' : '' }}</mat-label>
                    <input matInput 
                           [(ngModel)]="rule.pathPattern" 
                           [placeholder]="i === 0 ? '/*' : '/images/*'">
                    <mat-hint *ngIf="i > 0">Example: /images/*</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="form-field-inline">
                      <mat-label>Backend service *</mat-label>
                    <mat-select [(ngModel)]="rule.backendService">
                      <mat-option *ngFor="let bs of backendServices" [value]="bs.name">
                        {{ bs.name }}
                      </mat-option>
                      </mat-select>
                    </mat-form-field>

                  <button *ngIf="i > 0" 
                          mat-icon-button 
                          class="delete-rule-button" 
                          (click)="deleteRoutingRule(i)"
                          matTooltip="Delete rule">
                    <mat-icon>delete</mat-icon>
                  </button>
                  </div>

                <button mat-button color="primary" class="add-button" (click)="addRoutingRule()">
                    <mat-icon>add</mat-icon>
                    ADD HOST AND PATH RULE
                  </button>
                </div>

              <div *ngIf="routingMode === 'advanced'" class="advanced-routing">
                <h4>Advanced host and route rules</h4>
                
                <!-- Default Host and Route Rule -->
                <div class="default-rule-container">
                  <div class="default-rule-header" (click)="toggleDefaultRule()">
                    <span class="default-rule-title">Edit default host and route rule</span>
                    <mat-icon class="expand-icon">
                      {{ expandedDefaultRule ? 'expand_less' : 'expand_more' }}
                    </mat-icon>
              </div>
                  
                  <div class="default-rule-content" *ngIf="expandedDefaultRule">
                    <!-- View Tabs -->
                    <div class="view-tabs">
                      <button mat-button [class.active]="currentView === 'form'" (click)="setView('form')">
                        FORM VIEW
                      </button>
                      <button mat-button [class.active]="currentView === 'yaml'" (click)="setView('yaml')">
                        YAML VIEW
                      </button>
                    </div>

                    <div *ngIf="currentView === 'form'" class="form-view">
                      <!-- Host Rules -->
                      <div class="host-rules-section">
                        <h5>Host rules</h5>
                        <div class="host-rules-content">
                          <span class="undefined-rules">Any undefined host rules</span>
                        </div>
                      </div>

                      <!-- Route Rules -->
                      <div class="route-rules-section">
                        <h5>Route rules</h5>
                        
                        <div class="route-rules-header">
                          <button mat-raised-button color="primary" class="create-rule-button" (click)="createRouteRule()">
                            <mat-icon>add</mat-icon>
                            CREATE ROUTE RULE
                          </button>
                          
                          <div class="table-controls">
                            <button mat-icon-button class="filter-button" matTooltip="Filter table">
                              <mat-icon>filter_list</mat-icon>
                            </button>
                            <span class="filter-text">Filter table</span>
                            <button mat-icon-button class="help-button" matTooltip="Help">
                              <mat-icon>help</mat-icon>
                            </button>
                            <button mat-icon-button class="columns-button" matTooltip="Select columns">
                              <mat-icon>view_column</mat-icon>
                            </button>
                          </div>
                        </div>

                        <!-- Route Rules Table -->
                        <div class="route-rules-table">
                          <table mat-table [dataSource]="advancedRoutingRules" class="advanced-rules-table">
                            <!-- Match Rule Column -->
                            <ng-container matColumnDef="matchRule">
                              <th mat-header-cell *matHeaderCellDef>Match rule</th>
                              <td mat-cell *matCellDef="let rule">{{ rule.matchRule }}</td>
                            </ng-container>

                            <!-- Route Action Column -->
                            <ng-container matColumnDef="routeAction">
                              <th mat-header-cell *matHeaderCellDef>Route action</th>
                              <td mat-cell *matCellDef="let rule">{{ rule.routeAction }}</td>
                            </ng-container>

                            <!-- Service Column -->
                            <ng-container matColumnDef="service">
                              <th mat-header-cell *matHeaderCellDef>Service</th>
                              <td mat-cell *matCellDef="let rule">{{ rule.service }}</td>
                            </ng-container>

                            <!-- Priority Column -->
                            <ng-container matColumnDef="priority">
                              <th mat-header-cell *matHeaderCellDef>
                                Priority
                                <mat-icon class="info-icon" matTooltip="Priority information">help</mat-icon>
                              </th>
                              <td mat-cell *matCellDef="let rule">{{ rule.priority }}</td>
                            </ng-container>

                            <!-- Actions Column -->
                            <ng-container matColumnDef="actions">
                              <th mat-header-cell *matHeaderCellDef></th>
                              <td mat-cell *matCellDef="let rule; let i = index">
                                <button mat-icon-button (click)="editRouteRule(i)" matTooltip="Edit rule">
                                  <mat-icon>edit</mat-icon>
                                </button>
                              </td>
                            </ng-container>

                            <tr mat-header-row *matHeaderRowDef="advancedRuleColumns"></tr>
                            <tr mat-row *matRowDef="let row; columns: advancedRuleColumns;"></tr>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div *ngIf="currentView === 'yaml'" class="yaml-view">
                      <div class="yaml-editor">
                        <textarea 
                          class="yaml-textarea" 
                          [(ngModel)]="yamlContent"
                          placeholder="Enter YAML configuration...">
                        </textarea>
                      </div>
                    </div>

                    <div class="default-rule-actions">
                      <button mat-button (click)="cancelDefaultRule()">CANCEL</button>
                      <button mat-raised-button color="primary" (click)="saveDefaultRule()">DONE</button>
                    </div>
                  </div>
                </div>

                <button mat-button color="primary" class="add-host-rule-button" (click)="addHostAndRouteRule()">
                  <mat-icon>add</mat-icon>
                  ADD HOST AND ROUTE RULE
                </button>

                <!-- Additional Host and Route Rules -->
                <div *ngFor="let rule of newHostAndRouteRules; let i = index" class="host-and-route-rule-container">
                  <div class="rule-header" (click)="toggleHostAndRouteRule(i)">
                    <span class="rule-title">{{ rule.name }}</span>
                    <div class="rule-actions">
                      <button mat-icon-button (click)="deleteHostAndRouteRule(i); $event.stopPropagation()" 
                              matTooltip="Delete rule">
                        <mat-icon>delete</mat-icon>
                      </button>
                      <mat-icon class="expand-icon">
                        {{ expandedHostAndRouteRules[i] ? 'expand_less' : 'expand_more' }}
                      </mat-icon>
                    </div>
                  </div>
                  
                  <div class="rule-content" *ngIf="expandedHostAndRouteRules[i]">
                    <!-- View Tabs -->
                    <div class="view-tabs">
                      <button mat-button 
                              [class.active]="rule.currentView === 'form'" 
                              (click)="setHostRuleView(i, 'form')">
                        FORM VIEW
                      </button>
                      <button mat-button 
                              [class.active]="rule.currentView === 'yaml'" 
                              (click)="setHostRuleView(i, 'yaml')">
                        YAML VIEW
                      </button>
                    </div>

                    <div *ngIf="rule.currentView === 'form'" class="form-view">
                      <!-- Host Rules -->
                      <div class="host-rules-section">
                        <h5>Host rules</h5>
                        <div class="hosts-list">
                          <div *ngFor="let host of rule.hosts; let j = index" class="host-input-row">
                            <mat-form-field appearance="outline" class="host-field">
                              <mat-label>Hosts *</mat-label>
                              <input matInput [(ngModel)]="rule.hosts[j]" placeholder="web.example.com">
                              <mat-hint>Example: web.example.com</mat-hint>
                            </mat-form-field>
                            <button *ngIf="rule.hosts.length > 1" 
                                    mat-icon-button 
                                    (click)="removeHostFromRule(i, j)"
                                    matTooltip="Remove host">
                              <mat-icon>remove</mat-icon>
                            </button>
                          </div>
                          <button mat-button color="primary" (click)="addHostToRule(i)" class="add-host-button">
                            <mat-icon>add</mat-icon>
                            ADD HOST
                          </button>
                        </div>
                      </div>

                      <!-- Route Rules -->
                      <div class="route-rules-section">
                        <h5>Route rules</h5>
                        
                        <div class="route-rules-header">
                          <button mat-raised-button color="primary" 
                                  class="create-rule-button" 
                                  (click)="createRouteRuleForHost(i)">
                            <mat-icon>add</mat-icon>
                            CREATE ROUTE RULE
                          </button>
                          
                          <div class="table-controls">
                            <button mat-icon-button class="filter-button" matTooltip="Filter table">
                              <mat-icon>filter_list</mat-icon>
                            </button>
                            <span class="filter-text">Filter table</span>
                            <button mat-icon-button class="help-button" matTooltip="Help">
                              <mat-icon>help</mat-icon>
                            </button>
                            <button mat-icon-button class="columns-button" matTooltip="Select columns">
                              <mat-icon>view_column</mat-icon>
                            </button>
                          </div>
                        </div>

                        <!-- Route Rules Table -->
                        <div class="route-rules-table">
                          <table mat-table [dataSource]="rule.routeRules" class="advanced-rules-table">
                            <!-- Match Rule Column -->
                            <ng-container matColumnDef="matchRule">
                              <th mat-header-cell *matHeaderCellDef>Match rule</th>
                              <td mat-cell *matCellDef="let routeRule">{{ routeRule.matchRule }}</td>
                            </ng-container>

                            <!-- Route Action Column -->
                            <ng-container matColumnDef="routeAction">
                              <th mat-header-cell *matHeaderCellDef>Route action</th>
                              <td mat-cell *matCellDef="let routeRule">{{ routeRule.routeAction }}</td>
                            </ng-container>

                            <!-- Service Column -->
                            <ng-container matColumnDef="service">
                              <th mat-header-cell *matHeaderCellDef>Service</th>
                              <td mat-cell *matCellDef="let routeRule">{{ routeRule.service }}</td>
                            </ng-container>

                            <!-- Priority Column -->
                            <ng-container matColumnDef="priority">
                              <th mat-header-cell *matHeaderCellDef>
                                Priority
                                <mat-icon class="info-icon" matTooltip="Priority information">help</mat-icon>
                              </th>
                              <td mat-cell *matCellDef="let routeRule">{{ routeRule.priority }}</td>
                            </ng-container>

                            <!-- Actions Column -->
                            <ng-container matColumnDef="actions">
                              <th mat-header-cell *matHeaderCellDef></th>
                              <td mat-cell *matCellDef="let routeRule; let j = index">
                                <button mat-icon-button (click)="editRouteRuleForHost(i, j)" matTooltip="Edit rule">
                                  <mat-icon>edit</mat-icon>
                                </button>
                              </td>
                            </ng-container>

                            <tr mat-header-row *matHeaderRowDef="advancedRuleColumns"></tr>
                            <tr mat-row *matRowDef="let row; columns: advancedRuleColumns;"></tr>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div *ngIf="rule.currentView === 'yaml'" class="yaml-view">
                      <div class="yaml-editor">
                        <textarea 
                          class="yaml-textarea" 
                          [(ngModel)]="rule.yamlContent"
                          placeholder="Enter YAML configuration...">
                        </textarea>
                      </div>
                    </div>

                    <div class="rule-actions-footer">
                      <button mat-button (click)="cancelHostAndRouteRule(i)">CANCEL</button>
                      <button mat-raised-button color="primary" (click)="saveHostAndRouteRule(i)">DONE</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Action Buttons -->
        <div class="page-actions">
          <button mat-button (click)="cancel()">CANCEL</button>
          <button mat-raised-button color="primary" (click)="createLoadBalancer()">CREATE</button>
        </div>
      </div>

      <!-- Health Check Modal -->
      <div class="modal-overlay" *ngIf="showHealthCheckModal" (click)="closeHealthCheckModal()">
        <div class="health-check-modal" (click)="$event.stopPropagation()">
          <!-- Health Check Selection -->
          <div *ngIf="!showCreateHealthCheck" class="health-check-selection">
            <div class="modal-header">
              <h3>Health check *</h3>
              <button mat-icon-button (click)="closeHealthCheckModal()">
                <mat-icon>close</mat-icon>
          </button>
        </div>

            <div class="health-check-dropdown">
              <mat-form-field appearance="outline" class="dropdown-field">
                <mat-label>Select health check</mat-label>
                <mat-select [(ngModel)]="selectedHealthCheckId" (selectionChange)="onHealthCheckSelect($event.value)">
                  <mat-option *ngFor="let healthCheck of availableHealthChecks" [value]="healthCheck.id">
                    <div class="health-check-option-content">
                      <div class="health-check-name">{{ healthCheck.name }}</div>
                      <div class="health-check-details">
                        port: {{ healthCheck.port }}, timeout: {{ healthCheck.timeout }}s, 
                        check interval: {{ healthCheck.checkInterval }}s, 
                        unhealthy threshold: {{ healthCheck.unhealthyThreshold }} attempts
                      </div>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="create-health-check-option" (click)="createNewHealthCheck()">
              <mat-icon>add</mat-icon>
              <span>Create a health check</span>
            </div>

            <div class="modal-actions">
              <button mat-button (click)="closeHealthCheckModal()">Cancel</button>
              <button mat-raised-button color="primary" (click)="applySelectedHealthCheck()" [disabled]="!selectedHealthCheckId">Apply</button>
            </div>
          </div>

          <!-- Health Check Creation Form -->
          <div *ngIf="showCreateHealthCheck" class="health-check-creation">
            <div class="modal-header">
              <h3>Health Check</h3>
              <button mat-icon-button (click)="cancelHealthCheck()">
                <mat-icon>arrow_back</mat-icon>
              </button>
            </div>

            <form [formGroup]="healthCheckForm" class="health-check-form">
              <!-- Name -->
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Name *</mat-label>
                <input matInput formControlName="name">
                <mat-hint>Lowercase, no spaces.</mat-hint>
                <mat-icon matSuffix class="info-icon">info</mat-icon>
              </mat-form-field>

              <!-- Description -->
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3"></textarea>
                <mat-icon matSuffix class="info-icon">edit</mat-icon>
              </mat-form-field>

              <!-- Protocol and Port -->
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field-inline">
                  <mat-label>Protocol</mat-label>
                  <mat-select formControlName="protocol">
                    <mat-option value="HTTP">HTTP</mat-option>
                    <mat-option value="HTTPS">HTTPS</mat-option>
                    <mat-option value="TCP">TCP</mat-option>
                    <mat-option value="SSL">SSL</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-field-inline">
                  <mat-label>Port *</mat-label>
                  <input matInput type="number" formControlName="port">
                  <mat-icon matSuffix class="info-icon">info</mat-icon>
                </mat-form-field>
              </div>

              <!-- Proxy Protocol -->
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Proxy protocol</mat-label>
                <mat-select formControlName="proxyProtocol">
                  <mat-option value="NONE">NONE</mat-option>
                  <mat-option value="PROXY_V1">PROXY_V1</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Request and Response -->
              <div class="form-row">
                <mat-form-field appearance="outline" class="form-field-inline">
                  <mat-label>Request</mat-label>
                  <input matInput formControlName="request">
                  <mat-icon matSuffix class="info-icon">info</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-field-inline">
                  <mat-label>Response</mat-label>
                  <input matInput formControlName="response">
                  <mat-icon matSuffix class="info-icon">info</mat-icon>
                </mat-form-field>
              </div>

              <!-- Logs -->
              <div class="logs-section">
                <h4>Logs</h4>
                <mat-radio-group formControlName="logs" class="logs-radio-group">
                  <mat-radio-button [value]="true">
                    <div class="radio-content">
                      <div class="radio-title">On</div>
                      <div class="radio-subtitle">Turning on Health check logs can increase costs in Logging.</div>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button [value]="false">
                    <div class="radio-content">
                      <div class="radio-title">Off</div>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <!-- Health Criteria -->
              <div class="health-criteria-section">
                <h4>Health criteria</h4>
                <p class="criteria-description">
                  Define how health is determined: how often to check, how long to wait for a response, 
                  and how many successful or failed attempts are decisive
                </p>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Check interval *</mat-label>
                    <input matInput type="number" formControlName="checkInterval">
                    <span matSuffix>seconds</span>
                    <mat-icon matSuffix class="info-icon">info</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Timeout *</mat-label>
                    <input matInput type="number" formControlName="timeout">
                    <span matSuffix>seconds</span>
                    <mat-icon matSuffix class="info-icon">info</mat-icon>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Healthy threshold *</mat-label>
                    <input matInput type="number" formControlName="healthyThreshold">
                    <span matSuffix>consecutive successes</span>
                    <mat-icon matSuffix class="info-icon">info</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Unhealthy threshold *</mat-label>
                    <input matInput type="number" formControlName="unhealthyThreshold">
                    <span matSuffix>consecutive failures</span>
                    <mat-icon matSuffix class="info-icon">info</mat-icon>
                  </mat-form-field>
                </div>
              </div>

              <!-- Actions -->
              <div class="modal-actions">
                <button mat-button type="button" (click)="cancelHealthCheck()">Cancel</button>
                <button mat-raised-button color="primary" type="button" (click)="saveHealthCheck()">Create</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Advanced Features Modal -->
      <div class="modal-overlay" *ngIf="showAdvancedFeaturesModal" (click)="closeAdvancedFeaturesModal()">
        <div class="advanced-features-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Advanced features</h3>
            <button mat-icon-button (click)="closeAdvancedFeaturesModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="advancedFeaturesForm" class="advanced-features-form">
            <!-- Cloud CDN -->
            <div class="feature-form-row">
              <mat-slide-toggle formControlName="cloudCDN">
                Cloud CDN
              </mat-slide-toggle>
              <mat-icon class="info-icon" matTooltip="Enable Cloud CDN for caching">info</mat-icon>
            </div>

            <!-- Cache Mode -->
            <div class="feature-form-row" *ngIf="advancedFeaturesForm.get('cloudCDN')?.value">
              <mat-form-field appearance="outline" class="feature-form-field">
                <mat-label>Cache mode</mat-label>
                <mat-select formControlName="cacheMode">
                  <mat-option value="Cache static content (recommended)">Cache static content (recommended)</mat-option>
                  <mat-option value="Cache all content">Cache all content</mat-option>
                  <mat-option value="Use origin headers">Use origin headers</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Logging (for services only) -->
            <div class="feature-form-row" *ngIf="getSelectedBackendService()?.addingMethod === 'CREATE_SERVICE'">
              <mat-slide-toggle formControlName="logging">
                Logging
              </mat-slide-toggle>
              <mat-icon class="info-icon" matTooltip="Enable request logging">info</mat-icon>
            </div>

            <!-- Cloud Armor Backend Security Policy (for services only) -->
            <div class="feature-form-row" *ngIf="getSelectedBackendService()?.addingMethod === 'CREATE_SERVICE'">
              <mat-form-field appearance="outline" class="feature-form-field">
                <mat-label>Cloud Armor backend security policy</mat-label>
                <mat-select formControlName="cloudArmorBackendSecurityPolicy">
                  <mat-option value="Default">Default</mat-option>
                  <mat-option value="Custom policy 1">Custom policy 1</mat-option>
                  <mat-option value="Custom policy 2">Custom policy 2</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Cloud Armor Edge Security Policy -->
            <div class="feature-form-row">
              <mat-form-field appearance="outline" class="feature-form-field">
                <mat-label>Cloud Armor edge security policy</mat-label>
                <mat-select formControlName="cloudArmorEdgeSecurityPolicy">
                  <mat-option value="Default">Default</mat-option>
                  <mat-option value="Custom edge policy 1">Custom edge policy 1</mat-option>
                  <mat-option value="Custom edge policy 2">Custom edge policy 2</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button mat-button (click)="closeAdvancedFeaturesModal()">Cancel</button>
              <button mat-raised-button color="primary" (click)="saveAdvancedFeatures()">Done</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Load Balancer Illustration Modal -->
      <div class="modal-overlay" *ngIf="showIllustration" (click)="closeIllustration()">
        <div class="illustration-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Load Balancer Architecture Illustration</h3>
            <button mat-icon-button (click)="closeIllustration()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="illustration-content">
            <div class="diagram-container">
              <svg viewBox="0 0 1000 800" class="architecture-diagram">
                <!-- Background -->
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                  </pattern>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000020"/>
                  </filter>
                </defs>
                
                <rect width="1000" height="800" fill="url(#grid)"/>
                
                <!-- Internet Cloud -->
                <g class="internet-section">
                  <ellipse cx="100" cy="100" rx="80" ry="40" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>
                  <text x="100" y="90" text-anchor="middle" class="section-title">Internet</text>
                  <text x="100" y="110" text-anchor="middle" class="section-subtitle">Users & Traffic</text>
                </g>

                <!-- Frontend Configuration -->
                <g class="frontend-section">
                  <rect x="250" y="50" width="200" height="100" rx="10" fill="#fff3e0" stroke="#ff9800" stroke-width="2" filter="url(#shadow)"/>
                  <text x="350" y="75" text-anchor="middle" class="section-title">Frontend</text>
                  <text x="350" y="95" text-anchor="middle" class="config-text">{{ getCurrentFrontendConfig() }}</text>
                  <text x="350" y="115" text-anchor="middle" class="config-text">{{ getFrontendDetails() }}</text>
                  <text x="350" y="135" text-anchor="middle" class="status-text">{{ frontendConfigs.length }} Frontend(s)</text>
                </g>

                <!-- SSL/TLS Certificate -->
                <g class="ssl-section" *ngIf="hasSslCertificate()">
                  <rect x="480" y="70" width="120" height="60" rx="8" fill="#e8f5e8" stroke="#4caf50" stroke-width="2"/>
                  <text x="540" y="90" text-anchor="middle" class="small-title">SSL/TLS</text>
                  <text x="540" y="110" text-anchor="middle" class="small-text">Certificate</text>
                </g>

                <!-- Load Balancer Core -->
                <g class="lb-core">
                  <rect x="350" y="200" width="300" height="80" rx="15" fill="#f3e5f5" stroke="#9c27b0" stroke-width="3" filter="url(#shadow)"/>
                  <text x="500" y="230" text-anchor="middle" class="main-title">{{ configForm.get('name')?.value || 'Load Balancer' }}</text>
                  <text x="500" y="250" text-anchor="middle" class="config-text">Global External Application Load Balancer</text>
                  <text x="500" y="270" text-anchor="middle" class="config-text">Routing Mode: {{ routingMode | titlecase }}</text>
                </g>

                <!-- Routing Rules -->
                <g class="routing-section">
                  <rect x="150" y="320" width="180" height="120" rx="10" fill="#fff8e1" stroke="#ffc107" stroke-width="2" filter="url(#shadow)"/>
                  <text x="240" y="345" text-anchor="middle" class="section-title">Routing Rules</text>
                  <text x="240" y="365" text-anchor="middle" class="config-text">{{ getRoutingRulesCount() }} Rule(s)</text>
                  <text x="240" y="385" text-anchor="middle" class="small-text">Host patterns:</text>
                  <text x="240" y="405" text-anchor="middle" class="small-text">{{ getHostPatterns() }}</text>
                  <text x="240" y="425" text-anchor="middle" class="small-text">Path patterns:</text>
                  <text x="240" y="445" text-anchor="middle" class="small-text">{{ getPathPatterns() }}</text>
                </g>

                <!-- Cloud Armor -->
                <g class="armor-section" *ngIf="hasCloudArmor()">
                  <rect x="670" y="320" width="150" height="100" rx="10" fill="#ffebee" stroke="#f44336" stroke-width="2" filter="url(#shadow)"/>
                  <text x="745" y="345" text-anchor="middle" class="section-title">Cloud Armor</text>
                  <text x="745" y="365" text-anchor="middle" class="small-text">Security Policies</text>
                  <text x="745" y="385" text-anchor="middle" class="small-text">Backend: {{ getCloudArmorBackend() }}</text>
                  <text x="745" y="405" text-anchor="middle" class="small-text">Edge: {{ getCloudArmorEdge() }}</text>
                </g>

                <!-- Backend Services -->
                <g class="backend-section">
                  <rect x="200" y="500" width="600" height="180" rx="15" fill="#e1f5fe" stroke="#03a9f4" stroke-width="2" filter="url(#shadow)"/>
                  <text x="500" y="530" text-anchor="middle" class="section-title">Backend Services</text>
                  
                  <!-- Individual Backend Services -->
                  <g *ngFor="let service of backendServices; let i = index" [attr.transform]="'translate(' + (220 + i * 180) + ', 550)'">
                    <rect x="0" y="0" width="160" height="100" rx="8" fill="white" stroke="#03a9f4" stroke-width="1"/>
                    <text x="80" y="20" text-anchor="middle" class="backend-title">{{ service.name }}</text>
                    <text x="80" y="40" text-anchor="middle" class="backend-text">{{ service.type === 'SERVICE' ? 'Service' : 'Bucket' }}</text>
                    <text x="80" y="55" text-anchor="middle" class="backend-text">{{ service.protocol || 'N/A' }}</text>
                    <text x="80" y="70" text-anchor="middle" class="backend-text">{{ service.backends?.length || 0 }} Backend(s)</text>
                    <text x="80" y="85" text-anchor="middle" class="backend-text">CDN: {{ service.cloudCDN ? 'On' : 'Off' }}</text>
                  </g>
                </g>

                <!-- Cloud CDN -->
                <g class="cdn-section" *ngIf="hasCloudCDN()">
                  <rect x="50" y="500" width="120" height="80" rx="10" fill="#e8f5e8" stroke="#4caf50" stroke-width="2" filter="url(#shadow)"/>
                  <text x="110" y="525" text-anchor="middle" class="section-title">Cloud CDN</text>
                  <text x="110" y="545" text-anchor="middle" class="small-text">{{ getCdnEnabledCount() }} Service(s)</text>
                  <text x="110" y="565" text-anchor="middle" class="small-text">Cache Mode:</text>
                  <text x="110" y="580" text-anchor="middle" class="small-text">{{ getCacheMode() }}</text>
                </g>

                <!-- Health Checks -->
                <g class="health-section">
                  <rect x="850" y="500" width="120" height="120" rx="10" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" filter="url(#shadow)"/>
                  <text x="910" y="525" text-anchor="middle" class="section-title">Health Checks</text>
                  <text x="910" y="545" text-anchor="middle" class="small-text">{{ getHealthCheckCount() }} Check(s)</text>
                  <text x="910" y="565" text-anchor="middle" class="small-text">Protocols:</text>
                  <text x="910" y="580" text-anchor="middle" class="small-text">{{ getHealthCheckProtocols() }}</text>
                  <text x="910" y="595" text-anchor="middle" class="small-text">Intervals:</text>
                  <text x="910" y="610" text-anchor="middle" class="small-text">{{ getHealthCheckIntervals() }}</text>
                </g>

                <!-- Connection Lines -->
                <!-- Internet to Frontend -->
                <line x1="180" y1="100" x2="250" y2="100" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
                
                <!-- Frontend to Load Balancer -->
                <line x1="350" y1="150" x2="420" y2="200" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
                
                <!-- Load Balancer to Routing -->
                <line x1="400" y1="280" x2="300" y2="320" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
                
                <!-- Load Balancer to Cloud Armor -->
                <line x1="600" y1="280" x2="700" y2="320" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)" *ngIf="hasCloudArmor()"/>
                
                <!-- Routing to Backends -->
                <line x1="300" y1="440" x2="400" y2="500" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
                
                <!-- CDN to Backends -->
                <line x1="170" y1="540" x2="200" y2="540" stroke="#4caf50" stroke-width="2" marker-end="url(#arrowhead)" *ngIf="hasCloudCDN()"/>
                
                <!-- Backends to Health Checks -->
                <line x1="800" y1="560" x2="850" y2="560" stroke="#9c27b0" stroke-width="2" marker-end="url(#arrowhead)"/>

                <!-- Arrow marker definition -->
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>
                  </marker>
                </defs>

                <!-- Traffic Flow Indicators -->
                <g class="traffic-flow">
                  <text x="215" y="95" class="flow-text">HTTPS/HTTP</text>
                  <text x="385" y="175" class="flow-text">SSL Termination</text>
                  <text x="350" y="300" class="flow-text">Routing Logic</text>
                  <text x="600" y="470" class="flow-text">Backend Traffic</text>
                </g>

                <!-- Legend -->
                <g class="legend" transform="translate(50, 720)">
                  <rect x="0" y="0" width="900" height="60" fill="white" stroke="#ccc" stroke-width="1" rx="5"/>
                  <text x="20" y="20" class="legend-title">Legend:</text>
                  <circle cx="100" cy="15" r="5" fill="#1976d2"/>
                  <text x="110" y="20" class="legend-text">Frontend</text>
                  <circle cx="200" cy="15" r="5" fill="#9c27b0"/>
                  <text x="210" y="20" class="legend-text">Core LB</text>
                  <circle cx="300" cy="15" r="5" fill="#03a9f4"/>
                  <text x="310" y="20" class="legend-text">Backend</text>
                  <circle cx="400" cy="15" r="5" fill="#4caf50"/>
                  <text x="410" y="20" class="legend-text">CDN</text>
                  <circle cx="480" cy="15" r="5" fill="#f44336"/>
                  <text x="490" y="20" class="legend-text">Security</text>
                  
                  <text x="20" y="45" class="legend-text">Traffic Flow: Internet → Frontend → Load Balancer → Routing Rules → Backend Services</text>
                  <text x="20" y="60" class="legend-text">Features: CDN caching, Health monitoring, SSL termination, Security policies</text>
                </g>
              </svg>
            </div>

            <!-- Configuration Summary -->
            <div class="config-summary">
              <h4>Current Configuration Summary</h4>
              <div class="summary-grid">
                <div class="summary-item">
                  <strong>Load Balancer:</strong>
                  <span>{{ configForm.get('name')?.value || 'Unnamed' }}</span>
                </div>
                <div class="summary-item">
                  <strong>Type:</strong>
                  <span>Global External Application Load Balancer</span>
                </div>
                <div class="summary-item">
                  <strong>Frontend IPs:</strong>
                  <span>{{ frontendConfigs.length }} configured</span>
                </div>
                <div class="summary-item">
                  <strong>Backend Services:</strong>
                  <span>{{ backendServices.length }} configured</span>
                </div>
                <div class="summary-item">
                  <strong>Routing Mode:</strong>
                  <span>{{ routingMode | titlecase }}</span>
                </div>
                <div class="summary-item">
                  <strong>Cloud CDN:</strong>
                  <span>{{ getCdnStatus() }}</span>
                </div>
                <div class="summary-item">
                  <strong>Cloud Armor:</strong>
                  <span>{{ getCloudArmorStatus() }}</span>
                </div>
                <div class="summary-item">
                  <strong>Health Checks:</strong>
                  <span>{{ getHealthCheckSummary() }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button mat-button (click)="closeIllustration()">Close</button>
            <button mat-raised-button color="primary" (click)="downloadIllustration()">
              <mat-icon>download</mat-icon>
              Download Diagram
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .configure-page {
      background: var(--background-color);
      min-height: calc(100vh - 64px);
      padding: 0;
      position: relative;
      overflow-x: hidden;
    }

    .page-header {
      background: var(--surface-color);
      border-bottom: 1px solid var(--border-color);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .breadcrumb-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .breadcrumb-separator {
      margin: 0 4px;
    }

    .breadcrumb-current {
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
      color: var(--primary-color);
    }

    .config-form {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px;
      min-height: calc(100vh - 120px);
    }

    .config-section {
      margin-bottom: 32px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .config-section mat-card-header {
      background: var(--hover-color);
      border-bottom: 1px solid var(--border-color);
      padding: 16px 24px;
    }

    .config-section mat-card-content {
      padding: 24px;
      background: var(--surface-color);
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h3 {
      margin: 0;
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
    }

    .section-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: flex-start;
    }

    .form-field {
      flex: 1;
    }

    .form-field-inline {
      flex: 1;
      min-width: 200px;
    }

    .info-icon {
      color: var(--text-secondary-color);
      font-size: 16px;
      cursor: help;
    }

    .edit-icon {
      color: var(--primary-color);
      font-size: 16px;
      cursor: pointer;
    }

    .tier-label {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    /* Frontend Configuration */
    .frontend-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 16px;
      background: var(--surface-color);
    }

    .frontend-header {
      padding: 16px;
      background: var(--hover-color);
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .frontend-header:hover {
      background: var(--selected-color);
    }

    .frontend-name {
      font-weight: 500;
      color: var(--text-color);
    }

    .frontend-protocol {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-left: 16px;
    }

    .frontend-status {
      color: var(--warn-color);
      font-size: 12px;
      margin-left: auto;
      margin-right: 16px;
    }

    .frontend-details {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      background: var(--surface-color);
    }

    .frontend-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    /* Backend Configuration */
    .backend-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 16px;
      background: var(--surface-color);
    }

    .backend-header {
      padding: 16px;
      background: var(--hover-color);
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .backend-header:hover {
      background: var(--selected-color);
    }

    .backend-info {
      flex: 1;
    }

    .backend-name {
      font-weight: 500;
      color: var(--text-color);
      display: block;
    }

    .backend-details {
      color: var(--text-secondary-color);
      font-size: 14px;
      display: block;
      margin-top: 4px;
    }

    .backend-status {
      color: var(--warn-color);
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }

    .backend-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .backend-details-panel {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      background: var(--surface-color);
    }

    /* Adding Method Section */
    .adding-method-section {
      margin-bottom: 32px;
    }

    .adding-method-section h4 {
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .adding-method-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .adding-method-group .mat-radio-button {
      margin-bottom: 8px;
    }

    /* Basics Section */
    .basics-section {
      margin-bottom: 32px;
    }

    .basics-section h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    /* Cloud Storage Bucket Field */
    .browse-button {
      margin-left: 8px !important;
      min-width: 80px;
      font-size: 12px;
      font-weight: 500;
    }

    .bucket-icon {
      color: var(--accent-color);
      margin-right: 8px;
    }

    .mat-form-field-suffix .browse-button {
      margin-top: -8px;
      margin-bottom: -8px;
    }

    /* Service Configuration */
    .service-config {
      margin-top: 16px;
    }

    .service-config .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .service-config .form-field-inline {
      flex: 1;
      min-width: 200px;
    }

    /* Form Field Improvements */
    .form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-field-inline {
      flex: 1;
      min-width: 200px;
      margin-bottom: 16px;
    }

    /* Hints and Info Icons */
    .mat-form-field-hint {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin-top: 4px;
    }

    .info-icon {
      color: var(--text-secondary-color);
      font-size: 16px;
      cursor: help;
    }

    /* Advanced Features Section */
    .advanced-features-section {
      margin-bottom: 32px;
    }

    .advanced-features-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 16px;
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }

    .advanced-features-header:hover {
      background: var(--selected-color);
    }

    .advanced-features-header h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    .advanced-features-summary {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 16px;
    }

    .advanced-features-form {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 24px;
    }

    .feature-form-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .feature-form-row:last-child {
      margin-bottom: 0;
    }

    .feature-form-field {
      flex: 1;
      max-width: 400px;
    }

    .mat-slide-toggle {
      margin-right: 8px;
    }

    .advanced-features-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color);
    }

    /* Feature Row Styling */
    .feature-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .feature-row:last-child {
      margin-bottom: 0;
    }

    .feature-row .label {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .feature-row .value {
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    /* Toggle and Form Styling */
    .mat-slide-toggle.mat-checked .mat-slide-toggle-thumb {
      background-color: var(--primary-color);
    }

    .mat-slide-toggle.mat-checked .mat-slide-toggle-bar {
      background-color: rgba(25, 118, 210, 0.54);
    }

    /* Form Field Customization */
    .feature-form-field .mat-form-field-appearance-outline .mat-form-field-outline-thick {
      color: var(--primary-color);
    }

    .feature-form-field .mat-focused .mat-form-field-label {
      color: var(--primary-color);
    }

    /* Backends Section */
    .backends-section {
      margin-bottom: 32px;
    }

    .backends-section h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .backend-entry {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-bottom: 12px;
      background: var(--surface-color);
    }

    .backend-entry-header {
      padding: 12px 16px;
      background: var(--hover-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 6px 6px 0 0;
    }

    .backend-entry-name {
      font-weight: 500;
      color: var(--text-color);
    }

    .backend-entry-details {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-left: 16px;
    }

    .backend-entry-expanded {
      padding: 16px;
      border-top: 1px solid var(--border-color);
    }

    .balancing-mode-section {
      margin: 16px 0;
    }

    .balancing-mode-section h5 {
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .balancing-mode-group {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }

    .balancing-config {
      margin-top: 16px;
    }

    .backend-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    /* Health Check Section */
    .health-check-section {
      margin-bottom: 32px;
    }

    .health-check-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      margin-bottom: 16px;
    }

    .health-check-header h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    .health-check-header:hover .edit-icon {
      color: var(--primary-color);
    }

    .health-check-info {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
    }

    .health-check-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .health-check-row:last-child {
      margin-bottom: 0;
    }

    .health-check-row .label {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .health-check-row .value {
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    .backend-service-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    /* Health Check Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .health-check-modal {
      background: var(--surface-color);
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 24px;
    }

    .modal-header h3 {
      margin: 0;
      color: var(--text-color);
      font-size: 20px;
      font-weight: 500;
    }

    /* Health Check Selection */
    .health-check-selection {
      padding: 0 24px 24px 24px;
    }

    .health-check-dropdown {
      margin-bottom: 16px;
    }

    .dropdown-field {
      width: 100%;
    }

    .health-check-option-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .health-check-name {
      font-weight: 500;
      color: var(--primary-color);
    }

    .health-check-details {
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    .health-check-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-bottom: 16px;
      background: var(--surface-color);
    }

    .health-check-option {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .health-check-option:hover {
      background: var(--hover-color);
    }

    .health-check-option:last-child {
      border-bottom: none;
    }

    .create-health-check-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: var(--primary-color);
      cursor: pointer;
      border: 1px dashed var(--primary-color);
      border-radius: 6px;
      transition: background-color 0.2s ease;
      margin-bottom: 16px;
    }

    .create-health-check-option:hover {
      background: var(--hover-color);
    }

    /* Health Check Creation */
    .health-check-creation {
      padding: 0 24px 24px 24px;
    }

    .health-check-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .logs-section h4,
    .health-criteria-section h4 {
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .logs-radio-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .radio-content {
      margin-left: 8px;
    }

    .radio-title {
      font-weight: 500;
      color: var(--text-color);
    }

    .radio-subtitle {
      font-size: 12px;
      color: var(--text-secondary-color);
      margin-top: 4px;
    }

    .criteria-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .modal-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      margin-top: 24px;
    }

    /* Routing Rules */
    .routing-rules-section {
      margin-top: 32px;
    }

    .routing-rules-section h3 {
      color: var(--text-color);
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .routing-mode-section {
      margin-bottom: 24px;
    }

    .routing-mode-section h4 {
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .routing-mode-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .routing-option {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.2s ease;
    }

    .routing-option:hover {
      border-color: #1976d2;
    }

    .routing-description {
      margin-top: 8px;
      margin-left: 32px;
    }

    .routing-description p {
      color: #5f6368;
      font-size: 14px;
      margin: 0;
    }

    .simple-routing {
      margin-top: 24px;
    }

    .simple-routing h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .routing-rule-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
      padding: 16px;
      background: var(--surface-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .routing-rule-row .form-field-inline {
      flex: 1;
      min-width: 200px;
    }

    .delete-rule-button {
      margin-top: 8px;
      color: var(--warn-color);
    }

    .delete-rule-button:hover {
      background-color: var(--hover-color);
    }

    /* Common Buttons */
    .add-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-color);
      border: 1px dashed var(--primary-color);
      background: transparent;
      margin-top: 16px;
    }

    .add-button:hover {
      background: var(--hover-color);
    }

    .expand-icon {
      color: var(--text-secondary-color);
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    /* Page Actions */
    .page-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 32px;
      padding: 24px;
      background: var(--surface-color);
      border-top: 1px solid var(--border-color);
      border-radius: 8px;
    }

    /* Form Validation */
    .mat-form-field.ng-invalid.ng-touched .mat-form-field-outline-thick {
      color: var(--warn-color);
    }

    .mat-form-field.ng-invalid.ng-touched .mat-form-field-label {
      color: var(--warn-color);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .config-form {
      padding: 16px;
    }

      .form-row {
        flex-direction: column;
        gap: 12px;
      }

      .form-field-inline {
        min-width: unset;
      }

      .routing-rule-row {
        flex-direction: column;
        gap: 12px;
      }

      .backend-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .backend-actions {
        align-self: flex-end;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-actions {
        flex-wrap: wrap;
      }
    }

    /* Material Design Overrides */
    .mat-radio-button {
      margin-bottom: 8px;
    }

    .mat-radio-group {
      display: flex;
      flex-direction: column;
    }

    .mat-form-field-appearance-outline .mat-form-field-outline-thick {
      color: var(--primary-color);
    }

    .mat-focused .mat-form-field-label {
      color: var(--primary-color);
    }

    .mat-select-panel {
      max-height: 300px;
    }

    /* Status Colors */
    .status-healthy {
      color: var(--accent-color);
    }

    .status-warning {
      color: #f9ab00;
    }

    .status-error {
      color: var(--warn-color);
    }

    /* Hover Effects */
    .clickable {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .clickable:hover {
      background-color: var(--hover-color);
    }

    /* Loading States */
    .loading {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Focus States */
    .backend-entry:focus-within {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }

    .frontend-item:focus-within {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }

    /* Advanced Routing Styles */
    .advanced-routing {
      margin-top: 24px;
    }

    .advanced-routing h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .default-rule-container {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
      background: var(--surface-color);
    }

    .default-rule-header {
      padding: 16px;
      background: var(--hover-color);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
    }

    .default-rule-header:hover {
      background: var(--selected-color);
    }

    .default-rule-title {
      font-weight: 500;
      color: var(--text-color);
      font-size: 16px;
    }

    .default-rule-content {
      background: var(--surface-color);
    }

    .view-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
    }

    .view-tabs button {
      padding: 12px 24px;
      border: none;
      background: transparent;
      color: var(--text-secondary-color);
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .view-tabs button:hover {
      color: var(--primary-color);
      background: var(--hover-color);
    }

    .view-tabs button.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
      background: var(--surface-color);
    }

    .form-view {
      padding: 24px;
    }

    .host-rules-section {
      margin-bottom: 32px;
    }

    .host-rules-section h5 {
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .host-rules-content {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
      color: var(--text-secondary-color);
    }

    .undefined-rules {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .route-rules-section h5 {
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .route-rules-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .create-rule-button {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
    }

    .table-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-button,
    .help-button,
    .columns-button {
      color: var(--text-secondary-color);
    }

    .filter-text {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-right: 8px;
    }

    .route-rules-table {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface-color);
    }

    .advanced-rules-table {
      width: 100%;
    }

    .advanced-rules-table .mat-header-cell {
      background: var(--hover-color);
      color: var(--text-secondary-color);
      font-weight: 500;
      font-size: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .advanced-rules-table .mat-cell {
      padding: 12px 16px;
      color: var(--text-color);
      font-size: 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .advanced-rules-table .mat-header-row {
      background: var(--hover-color);
    }

    .advanced-rules-table .mat-row:hover {
      background: var(--hover-color);
    }

    .advanced-rules-table .mat-row:last-child .mat-cell {
      border-bottom: none;
    }

    .yaml-view {
      padding: 24px;
    }

    .yaml-editor {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
    }

    .yaml-textarea {
      width: 100%;
      min-height: 300px;
      padding: 16px;
      border: none;
      resize: vertical;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.5;
      background: var(--hover-color);
      color: var(--text-color);
    }

    .yaml-textarea:focus {
      outline: none;
      background: var(--surface-color);
    }

    .default-rule-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: var(--hover-color);
    }

    .add-host-rule-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-color);
      border: 1px dashed var(--primary-color);
      background: transparent;
      margin-top: 16px;
    }

    .add-host-rule-button:hover {
      background: var(--hover-color);
    }

    /* Table Responsive */
    @media (max-width: 768px) {
      .route-rules-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .table-controls {
        justify-content: space-between;
      }

      .advanced-rules-table .mat-header-cell,
      .advanced-rules-table .mat-cell {
        padding: 8px 12px;
        font-size: 12px;
      }

      .view-tabs {
        flex-wrap: wrap;
      }

      .view-tabs button {
        flex: 1;
        min-width: 120px;
      }

      .yaml-textarea {
        min-height: 200px;
        font-size: 12px;
      }
    }

    /* Material Table Overrides */
    .mat-table {
      background: var(--surface-color);
    }

    .mat-header-cell {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .mat-cell .mat-icon-button {
      width: 32px;
      height: 32px;
      line-height: 32px;
    }

    .mat-cell .mat-icon-button .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Advanced Rule States */
    .rule-editing {
      background: var(--hover-color) !important;
    }

    .rule-error {
      background: rgba(244, 67, 54, 0.1) !important;
    }

    .rule-warning {
      background: rgba(255, 193, 7, 0.1) !important;
    }

    /* Tooltip Overrides */
    .mat-tooltip {
      font-size: 12px;
      max-width: 200px;
    }

    /* Additional Host and Route Rules */
    .host-and-route-rule-container {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      background: var(--surface-color);
    }

    .rule-header {
      padding: 16px;
      background: var(--hover-color);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
    }

    .rule-header:hover {
      background: var(--selected-color);
    }

    .rule-title {
      font-weight: 500;
      color: var(--text-color);
      font-size: 16px;
    }

    .rule-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rule-content {
      background: var(--surface-color);
    }

    .host-rules-section {
      margin-bottom: 32px;
    }

    .hosts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .host-input-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .host-field {
      flex: 1;
    }

    .add-host-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-color);
      border: 1px dashed var(--primary-color);
      background: transparent;
      margin-top: 8px;
      align-self: flex-start;
    }

    .add-host-button:hover {
      background: var(--hover-color);
    }

    .rule-actions-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: var(--hover-color);
    }

    /* Responsive Design for New Rules */
    @media (max-width: 768px) {
      .rule-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .rule-actions {
        align-self: flex-end;
      }

      .host-input-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .rule-actions-footer {
        flex-direction: column;
        align-items: stretch;
      }
    }

    /* Advanced Features Modal */
    .advanced-features-modal {
      background: var(--surface-color);
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .advanced-features-form {
      padding: 0 24px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .advanced-features-info {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
    }

    .advanced-features-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      margin-bottom: 16px;
    }

    .advanced-features-header h4 {
      color: var(--primary-color);
      font-size: 16px;
      font-weight: 500;
      margin: 0;
    }

    .advanced-features-header:hover .edit-icon {
      color: var(--primary-color);
    }

    /* Load Balancer Illustration Modal */
    .illustration-modal {
      background: var(--surface-color);
      border-radius: 12px;
      width: 95%;
      max-width: 1200px;
      max-height: 95vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .illustration-content {
      padding: 0 24px 24px 24px;
    }

    .diagram-container {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .architecture-diagram {
      width: 100%;
      height: auto;
      max-height: 600px;
      background: var(--hover-color);
    }

    /* SVG Text Styles */
    .section-title {
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      font-weight: 500;
      fill: var(--text-color);
    }

    .section-subtitle {
      font-family: 'Roboto', sans-serif;
      font-size: 12px;
      fill: var(--text-secondary-color);
    }

    .main-title {
      font-family: 'Roboto', sans-serif;
      font-size: 16px;
      font-weight: 600;
      fill: var(--text-color);
    }

    .config-text {
      font-family: 'Roboto', sans-serif;
      font-size: 12px;
      fill: var(--text-secondary-color);
    }

    .status-text {
      font-family: 'Roboto', sans-serif;
      font-size: 11px;
      fill: var(--primary-color);
      font-weight: 500;
    }

    .small-title {
      font-family: 'Roboto', sans-serif;
      font-size: 12px;
      font-weight: 500;
      fill: var(--text-color);
    }

    .small-text {
      font-family: 'Roboto', sans-serif;
      font-size: 10px;
      fill: var(--text-secondary-color);
    }

    .backend-title {
      font-family: 'Roboto', sans-serif;
      font-size: 11px;
      font-weight: 500;
      fill: var(--primary-color);
    }

    .backend-text {
      font-family: 'Roboto', sans-serif;
      font-size: 9px;
      fill: var(--text-secondary-color);
    }

    .flow-text {
      font-family: 'Roboto', sans-serif;
      font-size: 10px;
      fill: var(--text-secondary-color);
      font-style: italic;
    }

    .legend-title {
      font-family: 'Roboto', sans-serif;
      font-size: 12px;
      font-weight: 600;
      fill: var(--text-color);
    }

    .legend-text {
      font-family: 'Roboto', sans-serif;
      font-size: 10px;
      fill: var(--text-secondary-color);
    }

    /* Configuration Summary */
    .config-summary {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
    }

    .config-summary h4 {
      margin: 0 0 16px 0;
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .summary-item strong {
      color: var(--text-secondary-color);
      font-size: 13px;
      font-weight: 500;
    }

    .summary-item span {
      color: var(--text-color);
      font-size: 13px;
      font-weight: 400;
      text-align: right;
    }

    /* Animation for illustration */
    .illustration-modal {
      animation: slideInFromTop 0.3s ease-out;
    }

    @keyframes slideInFromTop {
      from {
        opacity: 0;
        transform: translateY(-50px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Responsive Design for Illustration */
    @media (max-width: 768px) {
      .illustration-modal {
        width: 98%;
        max-height: 98vh;
      }

      .illustration-content {
        padding: 0 12px 12px 12px;
      }

      .architecture-diagram {
        max-height: 400px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .config-summary {
        padding: 16px;
      }

      .summary-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .summary-item span {
        text-align: left;
        font-weight: 500;
        color: var(--primary-color);
      }

      /* Adjust SVG text for mobile */
      .section-title {
        font-size: 12px;
      }

      .config-text {
        font-size: 10px;
      }

      .backend-title {
        font-size: 10px;
      }

      .backend-text {
        font-size: 8px;
      }
    }

    /* Print styles for diagram */
    @media print {
      .illustration-modal {
        box-shadow: none;
        border: 1px solid var(--border-color);
      }

      .modal-actions {
        display: none;
      }

      .architecture-diagram {
        max-height: none;
        height: 600px;
      }
    }

    /* Hover effects for diagram elements */
    .frontend-section:hover,
    .backend-section:hover,
    .routing-section:hover,
    .cdn-section:hover,
    .health-section:hover,
    .armor-section:hover {
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }

    /* Loading state for illustration */
    .diagram-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 400px;
      background: var(--hover-color);
      border-radius: 8px;
    }

    .diagram-loading mat-spinner {
      margin-right: 16px;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .config-section,
      .frontend-item,
      .backend-item,
      .advanced-features-modal,
      .illustration-modal,
      .diagram-container {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .frontend-header:hover,
      .backend-header:hover,
      .advanced-features-header:hover {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .summary-item {
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }

    /* Angular Material overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
        border: 1px solid var(--border-color) !important;
      }

      .mat-mdc-card-header {
        background-color: var(--hover-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-title {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-subtitle {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-card-content {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--surface-color) !important;
        }

        .mat-mdc-form-field-input-control {
          color: var(--text-color) !important;
        }

        .mat-mdc-floating-label {
          color: var(--text-secondary-color) !important;
        }

        .mat-mdc-form-field-outline {
          color: var(--border-color) !important;
        }

        input, textarea {
          color: var(--text-color) !important;
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
          border-color: var(--text-secondary-color) !important;
        }

        &.mat-mdc-radio-checked .mat-mdc-radio-outer-circle {
          border-color: var(--primary-color) !important;
        }

        &.mat-mdc-radio-checked .mat-mdc-radio-inner-circle {
          background-color: var(--primary-color) !important;
        }

        .mat-mdc-radio-label-content {
          color: var(--text-color) !important;
        }
      }

      .mat-mdc-slide-toggle {
        .mat-mdc-slide-toggle-bar {
          background-color: var(--border-color) !important;
        }

        &.mat-mdc-slide-toggle-checked .mat-mdc-slide-toggle-bar {
          background-color: rgba(66, 133, 244, 0.54) !important;
        }

        .mat-mdc-slide-toggle-thumb {
          background-color: var(--surface-color) !important;
        }

        &.mat-mdc-slide-toggle-checked .mat-mdc-slide-toggle-thumb {
          background-color: var(--primary-color) !important;
        }
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-raised-button {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button {
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
      }

      .mat-mdc-icon-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-panel {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-item {
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-item:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-dialog-container {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-snack-bar-container {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-progress-spinner circle {
        stroke: var(--primary-color) !important;
      }

      .mat-mdc-table {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-header-row {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-header-cell {
        color: var(--text-secondary-color) !important;
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-row {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-cell {
        color: var(--text-color) !important;
      }

      .mat-mdc-row:hover {
        background-color: var(--hover-color) !important;
      }
    }
  `]
})
export class LoadBalancerConfigureComponent implements OnInit, OnDestroy {
  configForm: FormGroup;
  frontendForm: FormGroup;
  backendServiceForms: FormGroup[] = [];
  expandedFrontend = false;
  expandedBackendServices: boolean[] = [];
  expandedBackends: boolean[][] = [];

  frontendConfigs: FrontendConfig[] = [];
  expandedFrontends: boolean[] = [];

  backendServices: BackendService[] = [];
  expandedAdvancedFeatures: boolean[] = []; // Add this for tracking advanced features expansion
  routingMode: 'simple' | 'advanced' = 'simple';
  routingRules: RoutingRule[] = [];
  defaultRoutingRule: RoutingRule = {
    id: 'default',
    hostPattern: '*',
    pathPattern: '/*',
    backendService: ''
  };

  // Advanced routing properties
  expandedDefaultRule = false;
  currentView: 'form' | 'yaml' = 'form';
  advancedRoutingRules: AdvancedRoutingRule[] = [];
  advancedRuleColumns: string[] = ['matchRule', 'routeAction', 'service', 'priority', 'actions'];
  hostRules: HostRule[] = [];
  newHostAndRouteRules: any[] = []; // Track additional host and route rule sections
  expandedHostAndRouteRules: boolean[] = []; // Track expansion state for each new rule
  yamlContent = `# YAML configuration for routing rules
# Define your routing rules here
defaultService: lb-2023-backend-1
hostRules: []
pathMatchers: []`;

  // Health check properties
  availableHealthChecks: HealthCheckOption[] = [];
  showHealthCheckModal = false;
  showCreateHealthCheck = false;
  selectedHealthCheckIndex = -1;
  selectedHealthCheckId = ''; // Add this for dropdown selection
  healthCheckForm: FormGroup;

  // Advanced features properties
  showAdvancedFeaturesModal = false;
  selectedAdvancedFeaturesIndex = -1;
  advancedFeaturesForm: FormGroup;

  // Illustration properties
  showIllustration = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loadBalancerService: LoadBalancerService,
    private loadBalancerCreationService: LoadBalancerCreationService,
    private dialog: MatDialog
  ) {
    this.configForm = this.fb.group({
      name: ['username-global-external-application-1', Validators.required],
      description: ['']
    });

    this.frontendForm = this.fb.group({
      name: ['frontend-1', Validators.required],
      description: [''],
      protocol: ['HTTP', Validators.required],
      ipVersion: ['IPv4', Validators.required],
      ipAddress: ['Ephemeral', Validators.required],
      port: [80, [Validators.required, Validators.min(1), Validators.max(65535)]],
      certificate: [''],
      networkServiceTier: ['Premium', Validators.required]
    });

    // Initialize health check form
    this.healthCheckForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      protocol: ['HTTP', Validators.required],
      port: [80, [Validators.required, Validators.min(1), Validators.max(65535)]],
      proxyProtocol: ['NONE'],
      request: [''],
      response: [''],
      logs: [false],
      checkInterval: [5, [Validators.required, Validators.min(1)]],
      timeout: [5, [Validators.required, Validators.min(1)]],
      healthyThreshold: [2, [Validators.required, Validators.min(1)]],
      unhealthyThreshold: [2, [Validators.required, Validators.min(1)]]
    });

    // Initialize advanced features form
    this.advancedFeaturesForm = this.fb.group({
      cloudCDN: [false],
      cacheMode: ['Cache static content (recommended)'],
      logging: [false],
      cloudArmorBackendSecurityPolicy: ['Default'],
      cloudArmorEdgeSecurityPolicy: ['Default']
    });

    // Initialize frontend configurations
    this.initializeFrontends();
    this.initializeAdvancedRouting();
    this.initializeHealthChecks();
  }

  ngOnInit() {
    this.initializeForms();
    this.initializeAdvancedRouting();
    this.initializeSampleBackendServices();
    
    // Initialize with default routing rule
    this.routingRules = [{ ...this.defaultRoutingRule }];
    
    // Update routing rules when backend services change
    this.updateRoutingRulesBackendServices();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForms() {
    this.configForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });

    this.frontendForm = this.fb.group({
      name: [this.frontendConfigs[0]?.name || 'frontend-1', [Validators.required]],
      description: [''],
      protocol: [this.frontendConfigs[0]?.protocol || 'HTTP', [Validators.required]],
      ipVersion: [this.frontendConfigs[0]?.ipVersion || 'IPv4', [Validators.required]],
      ipAddress: [this.frontendConfigs[0]?.ipAddress || 'Ephemeral', [Validators.required]],
      port: [this.frontendConfigs[0]?.port || 80, [Validators.required, Validators.min(1), Validators.max(65535)]],
      certificate: [''],
      networkServiceTier: [this.frontendConfigs[0]?.networkServiceTier || 'Premium', [Validators.required]]
    });
  }

  navigateBack() {
    this.router.navigate(['/load-balancing']);
  }

  toggleFrontend(index: number) {
    this.expandedFrontends[index] = !this.expandedFrontends[index];
  }

  saveFrontend(index: number) {
    if (this.frontendForm.valid) {
      this.frontendConfigs[index] = { ...this.frontendForm.value };
      this.expandedFrontends[index] = false;
    }
  }

  cancelFrontend(index: number) {
    this.frontendForm.patchValue(this.frontendConfigs[index]);
    this.expandedFrontends[index] = false;
  }

  // Backend Service Management
  addBackendService() {
    const id = `backend-service-${Date.now()}`;
    const newBackendService: BackendService = {
      id,
      name: `lb-2023-backend-${this.backendServices.length + 1}`,
      description: '',
      type: 'SERVICE',
      protocol: 'HTTP',
      namedPort: 'http',
      timeout: 30,
      backends: [this.createDefaultBackend()],
      healthCheck: {
        name: 'default-gcp-health-check',
        protocol: 'HTTPS',
        port: 443,
        checkInterval: 5,
        unhealthyThreshold: 2
      },
      cloudCDN: true,
      cacheMode: 'Cache static content (recommended)',
      logging: false,
      cloudArmorBackendSecurityPolicy: 'Default',
      cloudArmorEdgeSecurityPolicy: 'Default',
      addingMethod: 'CREATE_SERVICE',
      cloudStorageBucket: ''
    };

    this.backendServices.push(newBackendService);
    this.expandedBackendServices.push(true);
    this.expandedBackends.push([false]);
    this.expandedAdvancedFeatures.push(false); // Initialize advanced features expansion state

    // Create form for this backend service
    const backendServiceForm = this.fb.group({
      name: [newBackendService.name, Validators.required],
      description: [newBackendService.description],
      type: [newBackendService.type, Validators.required],
      protocol: [newBackendService.protocol, Validators.required],
      namedPort: [newBackendService.namedPort, Validators.required],
      timeout: [newBackendService.timeout, [Validators.required, Validators.min(1)]],
      addingMethod: [newBackendService.addingMethod, Validators.required],
      cloudStorageBucket: [newBackendService.cloudStorageBucket],
      // Advanced features form controls
      cloudCDN: [newBackendService.cloudCDN],
      cacheMode: [newBackendService.cacheMode],
      logging: [newBackendService.logging],
      cloudArmorBackendSecurityPolicy: [newBackendService.cloudArmorBackendSecurityPolicy],
      cloudArmorEdgeSecurityPolicy: [newBackendService.cloudArmorEdgeSecurityPolicy]
    });

    this.backendServiceForms.push(backendServiceForm);

    // Set as default routing target if it's the first one
    if (this.backendServices.length === 1) {
      this.defaultRoutingRule.backendService = newBackendService.name;
    }
  }

  deleteBackendService(index: number) {
    this.backendServices.splice(index, 1);
    this.expandedBackendServices.splice(index, 1);
    this.expandedBackends.splice(index, 1);
    this.backendServiceForms.splice(index, 1);
    this.expandedAdvancedFeatures.splice(index, 1); // Remove advanced features expansion state

    // Update default routing rule if needed
    if (this.backendServices.length > 0 && 
        this.defaultRoutingRule.backendService === this.backendServices[index]?.name) {
      this.defaultRoutingRule.backendService = this.backendServices[0].name;
    }
  }

  toggleBackendService(index: number) {
    this.expandedBackendServices[index] = !this.expandedBackendServices[index];
  }

  getBackendServiceForm(index: number): FormGroup {
    return this.backendServiceForms[index];
  }

  saveBackendService(index: number) {
    const formData = this.getBackendServiceForm(index).value;
    this.backendServices[index] = {
      ...this.backendServices[index],
      ...formData
    };
    this.expandedBackendServices[index] = false;
    
    // Update routing rules with new backend services
    this.updateRoutingRulesBackendServices();
  }

  cancelBackendService(index: number) {
    const backendService = this.backendServices[index];
    this.backendServiceForms[index].patchValue({
      name: backendService.name,
      description: backendService.description,
      type: backendService.type,
      protocol: backendService.protocol,
      namedPort: backendService.namedPort,
      timeout: backendService.timeout
    });
    this.expandedBackendServices[index] = false;
  }

  // Backend Management
  createDefaultBackend(): Backend {
    return {
      id: `backend-${Date.now()}`,
      instanceGroup: 'username-instance-group-1',
      zone: 'us-central1-a',
      port: 80,
      balancingMode: 'UTILIZATION',
      maxBackendUtilization: 80,
      maxRPS: 35,
      capacity: 100,
      scope: 'per instance'
    };
  }

  addBackend(backendServiceIndex: number) {
    const newBackend = this.createDefaultBackend();
    this.backendServices[backendServiceIndex].backends.push(newBackend);
    
    // Initialize expanded state for new backend
    if (!this.expandedBackends[backendServiceIndex]) {
      this.expandedBackends[backendServiceIndex] = [];
    }
    this.expandedBackends[backendServiceIndex].push(true);
  }

  removeBackend(backendServiceIndex: number, backendIndex: number) {
    this.backendServices[backendServiceIndex].backends.splice(backendIndex, 1);
    this.expandedBackends[backendServiceIndex].splice(backendIndex, 1);
  }

  saveBackend(backendServiceIndex: number, backendIndex: number) {
    // Backend is saved via two-way binding, just close the expanded state
    this.expandedBackends[backendServiceIndex][backendIndex] = false;
  }

  cancelBackendEdit(backendServiceIndex: number, backendIndex: number) {
    // Reset to previous values if needed
    this.expandedBackends[backendServiceIndex][backendIndex] = false;
  }

  // Routing Rules Management
  addRoutingRule() {
    const newRule: RoutingRule = {
      id: `rule-${Date.now()}`,
      hostPattern: '',
      pathPattern: '',
      backendService: this.backendServices.length > 0 ? this.backendServices[0].name : ''
    };
    
    this.routingRules.push(newRule);
  }

  deleteRoutingRule(index: number) {
    if (this.routingRules.length > 1) {
      this.routingRules.splice(index, 1);
    }
  }

  trackByRuleId(index: number, rule: RoutingRule): string {
    return rule.id;
  }

  cancel() {
    this.router.navigate(['/load-balancing']);
  }

  createLoadBalancer() {
    if (this.configForm.valid && this.backendServices.length > 0) {
      // Prepare the configuration
      const creationConfig: LoadBalancerCreationConfig = {
        name: this.configForm.value.name,
        description: this.configForm.value.description,
        type: 'APPLICATION', // Get from stored config or form
        facing: 'EXTERNAL',   // Get from stored config or form
        deployment: 'GLOBAL', // Get from stored config or form
        generation: 'GLOBAL_EXTERNAL', // Get from stored config or form
        frontendConfig: this.frontendConfigs[0] || {
          name: 'frontend-1',
          protocol: 'HTTP',
          port: 80,
          ipVersion: 'IPv4',
          ipAddress: 'Ephemeral',
          networkServiceTier: 'Premium'
        },
        backendServices: this.backendServices,
        routingRules: this.routingMode === 'simple' ? [this.defaultRoutingRule] : this.advancedRoutingRules
      };

      // Get stored configuration from localStorage if available
      const storedConfig = localStorage.getItem('loadBalancerConfig');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        creationConfig.type = config.type;
        creationConfig.facing = config.facing;
        creationConfig.deployment = config.deployment;
        creationConfig.generation = config.generation;
      }

      // Initialize progress dialog data
      const dialogData: LoadBalancerCreationData = {
        name: creationConfig.name,
        steps: [] // Will be populated by the service
      };

      // Open the progress dialog
      const dialogRef = this.dialog.open(LoadBalancerCreationProgressComponent, {
        data: dialogData,
        width: '600px',
        disableClose: true
      });

      // Start the creation process
      this.loadBalancerCreationService.createLoadBalancer(creationConfig)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (steps: CreationStep[]) => {
            // Update dialog data with latest steps
            dialogData.steps = steps;
          },
          error: (error) => {
            console.error('Load balancer creation failed:', error);
            // The dialog will handle the error display
          },
          complete: () => {
            console.log('Load balancer creation process completed');
          }
        });

      // Subscribe to steps updates to update dialog in real-time
      this.loadBalancerCreationService.steps$
        .pipe(takeUntil(this.destroy$))
        .subscribe(steps => {
          dialogData.steps = steps;
        });

      // Handle dialog result
      dialogRef.afterClosed().subscribe(result => {
        if (result?.action === 'view') {
          // Navigate to load balancer details
          this.router.navigate(['/load-balancing']);
        } else if (result?.action === 'cancelled') {
          console.log('Load balancer creation was cancelled');
          this.loadBalancerCreationService.cancelCreation();
          this.router.navigate(['/load-balancing']);
        } else if (result?.action === 'retry') {
          // Restart the creation process
          this.createLoadBalancer();
        } else {
          // Dialog closed normally, navigate back to list
    this.router.navigate(['/load-balancing']);
        }
      });
    } else {
      console.warn('Form is invalid or no backend services configured');
      
      // Show validation errors
      this.configForm.markAllAsTouched();
      if (this.backendServices.length === 0) {
        // You could show a snackbar or alert here
        alert('Please configure at least one backend service before creating the load balancer.');
      }
    }
  }

  // Advanced Routing Methods
  initializeAdvancedRouting() {
    // Initialize with a default routing rule
    this.advancedRoutingRules = [
      {
        id: 'default-rule',
        matchRule: 'Any unmatched',
        routeAction: 'Route traffic to a single backend',
        service: 'lb-2023-backend-1',
        priority: 'Default'
      }
    ];
  }

  toggleDefaultRule() {
    this.expandedDefaultRule = !this.expandedDefaultRule;
  }

  setView(view: 'form' | 'yaml') {
    this.currentView = view;
  }

  createRouteRule() {
    const newRule: AdvancedRoutingRule = {
      id: `rule-${Date.now()}`,
      matchRule: 'Custom rule',
      routeAction: 'Route traffic to a single backend',
      service: this.backendServices.length > 0 ? this.backendServices[0].name : 'No backend service',
      priority: 'High'
    };
    
    this.advancedRoutingRules.push(newRule);
    console.log('Created new route rule:', newRule);
  }

  editRouteRule(index: number) {
    const rule = this.advancedRoutingRules[index];
    console.log('Editing route rule:', rule);
    // In a real implementation, this would open a dialog or expand an edit form
  }

  saveDefaultRule() {
    console.log('Saving default rule configuration');
    console.log('Current view:', this.currentView);
    console.log('YAML content:', this.yamlContent);
    console.log('Advanced routing rules:', this.advancedRoutingRules);
    this.expandedDefaultRule = false;
  }

  cancelDefaultRule() {
    this.expandedDefaultRule = false;
    // Reset any unsaved changes
  }

  addHostAndRouteRule() {
    const newRule = {
      id: `host-rule-${Date.now()}`,
      name: `New host and route rule`,
      hosts: [''],
      routeRules: [
        {
          id: `route-rule-${Date.now()}`,
          matchRule: 'Any unmatched',
          routeAction: 'Route traffic to a single backend',
          service: this.backendServices.length > 0 ? this.backendServices[0].name : '',
          priority: 'Default'
        }
      ],
      currentView: 'form',
      yamlContent: `# YAML configuration for this host and route rule
hosts: []
pathMatchers: []`
    };
    
    this.newHostAndRouteRules.push(newRule);
    this.expandedHostAndRouteRules.push(true); // Auto-expand new rules
    console.log('Added new host and route rule:', newRule);
  }

  deleteHostAndRouteRule(index: number) {
    this.newHostAndRouteRules.splice(index, 1);
    this.expandedHostAndRouteRules.splice(index, 1);
  }

  toggleHostAndRouteRule(index: number) {
    this.expandedHostAndRouteRules[index] = !this.expandedHostAndRouteRules[index];
  }

  setHostRuleView(index: number, view: 'form' | 'yaml') {
    this.newHostAndRouteRules[index].currentView = view;
  }

  addHostToRule(ruleIndex: number) {
    this.newHostAndRouteRules[ruleIndex].hosts.push('');
  }

  removeHostFromRule(ruleIndex: number, hostIndex: number) {
    if (this.newHostAndRouteRules[ruleIndex].hosts.length > 1) {
      this.newHostAndRouteRules[ruleIndex].hosts.splice(hostIndex, 1);
    }
  }

  createRouteRuleForHost(ruleIndex: number) {
    const newRouteRule = {
      id: `route-rule-${Date.now()}`,
      matchRule: 'Custom rule',
      routeAction: 'Route traffic to a single backend',
      service: this.backendServices.length > 0 ? this.backendServices[0].name : '',
      priority: 'High'
    };
    
    this.newHostAndRouteRules[ruleIndex].routeRules.push(newRouteRule);
  }

  editRouteRuleForHost(ruleIndex: number, routeRuleIndex: number) {
    const rule = this.newHostAndRouteRules[ruleIndex].routeRules[routeRuleIndex];
    console.log('Editing route rule:', rule);
    // In a real implementation, this would open a dialog or expand an edit form
  }

  saveHostAndRouteRule(index: number) {
    console.log('Saving host and route rule:', this.newHostAndRouteRules[index]);
    this.expandedHostAndRouteRules[index] = false;
  }

  cancelHostAndRouteRule(index: number) {
    this.expandedHostAndRouteRules[index] = false;
    // Reset any unsaved changes
  }

  updateRoutingRulesBackendServices() {
    // Set default backend service for routing rules if not set
    if (this.backendServices.length > 0) {
      this.routingRules.forEach(rule => {
        if (!rule.backendService || !this.backendServices.find(bs => bs.name === rule.backendService)) {
          rule.backendService = this.backendServices[0].name;
        }
      });
      
      // Update default routing rule
      if (!this.defaultRoutingRule.backendService || 
          !this.backendServices.find(bs => bs.name === this.defaultRoutingRule.backendService)) {
        this.defaultRoutingRule.backendService = this.backendServices[0].name;
      }
    }
  }

  initializeSampleBackendServices() {
    // Add only one sample backend service for initial configuration
    if (this.backendServices.length === 0) {
      this.backendServices = [
        {
          id: 'bs-1',
          name: 'lb-2023-backend-1',
          description: 'Backend service, 0 instance groups, Cloud CDN: On',
          type: 'SERVICE',
          protocol: 'HTTP',
          namedPort: 'http',
          timeout: 30,
          backends: [],
          healthCheck: {
            name: 'health-check-1',
            protocol: 'HTTP',
            port: 80,
            checkInterval: 10,
            unhealthyThreshold: 3
          },
          cloudCDN: true,
          cacheMode: 'Cache static content (recommended)',
          logging: false,
          cloudArmorBackendSecurityPolicy: 'Default',
          cloudArmorEdgeSecurityPolicy: 'Default',
          addingMethod: 'CREATE_SERVICE',
          cloudStorageBucket: ''
        }
      ];

      // Initialize expanded states
      this.expandedBackendServices = new Array(this.backendServices.length).fill(false);
      this.expandedBackends = this.backendServices.map(() => []);
      this.expandedAdvancedFeatures = new Array(this.backendServices.length).fill(false);

      // Create forms for each backend service
      this.backendServiceForms = this.backendServices.map(backendService => {
        return this.fb.group({
          name: [backendService.name, Validators.required],
          description: [backendService.description],
          type: [backendService.type, Validators.required],
          protocol: [backendService.protocol, Validators.required],
          namedPort: [backendService.namedPort, Validators.required],
          timeout: [backendService.timeout, [Validators.required, Validators.min(1)]],
          addingMethod: [backendService.addingMethod, Validators.required],
          cloudStorageBucket: [backendService.cloudStorageBucket],
          // Advanced features form controls
          cloudCDN: [backendService.cloudCDN],
          cacheMode: [backendService.cacheMode],
          logging: [backendService.logging],
          cloudArmorBackendSecurityPolicy: [backendService.cloudArmorBackendSecurityPolicy],
          cloudArmorEdgeSecurityPolicy: [backendService.cloudArmorEdgeSecurityPolicy]
        });
      });
    }
  }

  initializeFrontends() {
    // Initialize with default frontend
    this.frontendConfigs = [
      {
        name: 'frontend-1',
        protocol: 'HTTP',
        port: 80,
        ipVersion: 'IPv4',
        ipAddress: 'Ephemeral',
        networkServiceTier: 'Premium'
      }
    ];
    this.expandedFrontends = [false];
  }

  // Frontend Management
  addFrontend() {
    const newFrontend: FrontendConfig = {
      name: `frontend-${this.frontendConfigs.length + 1}`,
      protocol: 'HTTP',
      port: this.frontendConfigs.length === 0 ? 80 : 443,
      ipVersion: 'IPv4',
      ipAddress: 'Ephemeral',
      networkServiceTier: 'Premium'
    };

    this.frontendConfigs.push(newFrontend);
    this.expandedFrontends.push(true);
  }

  deleteFrontend(index: number) {
    if (this.frontendConfigs.length > 1) {
      this.frontendConfigs.splice(index, 1);
      this.expandedFrontends.splice(index, 1);
    }
  }

  trackByFrontendName(index: number, frontend: FrontendConfig): string {
    return frontend.name;
  }

  // Backend bucket methods
  onAddingMethodChange(index: number, method: string) {
    const backendService = this.backendServices[index];
    const form = this.getBackendServiceForm(index);
    
    backendService.addingMethod = method as 'CREATE_SERVICE' | 'CREATE_BUCKET' | 'SELECT_EXISTING';
    form.patchValue({ addingMethod: method });

    if (method === 'CREATE_BUCKET') {
      backendService.type = 'BUCKET';
      backendService.name = `lb-2023-backend-${index + 1}`;
      form.patchValue({ 
        type: 'BUCKET',
        name: backendService.name
      });
    } else if (method === 'CREATE_SERVICE') {
      backendService.type = 'SERVICE';
      backendService.name = `lb-2023-backend-${index + 1}`;
      form.patchValue({ 
        type: 'SERVICE',
        name: backendService.name
      });
    }
  }

  browseBucket(index: number) {
    // In a real implementation, this would open a bucket browser dialog
    const form = this.getBackendServiceForm(index);
    const bucketName = 'my-new-bucket';
    form.patchValue({ cloudStorageBucket: bucketName });
    this.backendServices[index].cloudStorageBucket = bucketName;
  }

  // Add methods for advanced features management
  editAdvancedFeatures(index: number) {
    this.selectedAdvancedFeaturesIndex = index;
    const backendService = this.backendServices[index];
    
    // Populate the form with current values
    this.advancedFeaturesForm.patchValue({
      cloudCDN: backendService.cloudCDN,
      cacheMode: backendService.cacheMode,
      logging: backendService.logging,
      cloudArmorBackendSecurityPolicy: backendService.cloudArmorBackendSecurityPolicy,
      cloudArmorEdgeSecurityPolicy: backendService.cloudArmorEdgeSecurityPolicy
    });
    
    this.showAdvancedFeaturesModal = true;
  }

  closeAdvancedFeaturesModal() {
    this.showAdvancedFeaturesModal = false;
    this.selectedAdvancedFeaturesIndex = -1;
  }

  saveAdvancedFeatures() {
    if (this.selectedAdvancedFeaturesIndex >= 0 && this.advancedFeaturesForm.valid) {
      const formValue = this.advancedFeaturesForm.value;
      const backendService = this.backendServices[this.selectedAdvancedFeaturesIndex];
      
      // Update backend service with form values
      backendService.cloudCDN = formValue.cloudCDN;
      backendService.cacheMode = formValue.cacheMode;
      backendService.logging = formValue.logging;
      backendService.cloudArmorBackendSecurityPolicy = formValue.cloudArmorBackendSecurityPolicy;
      backendService.cloudArmorEdgeSecurityPolicy = formValue.cloudArmorEdgeSecurityPolicy;
      
      // Update the corresponding form if it exists
      const backendServiceForm = this.getBackendServiceForm(this.selectedAdvancedFeaturesIndex);
      if (backendServiceForm) {
        backendServiceForm.patchValue(formValue);
      }
      
      this.closeAdvancedFeaturesModal();
    }
  }

  // Remove old toggle and inline methods
  toggleAdvancedFeatures(index: number) {
    // Method removed - now using modal
  }

  cancelAdvancedFeatures(index: number) {
    // Method removed - now using modal
  }

  onHealthCheckSelect(healthCheckId: string) {
    this.selectedHealthCheckId = healthCheckId;
  }

  applySelectedHealthCheck() {
    if (this.selectedHealthCheckId && this.selectedHealthCheckIndex >= 0) {
      const selectedHealthCheck = this.availableHealthChecks.find(hc => hc.id === this.selectedHealthCheckId);
      if (selectedHealthCheck) {
        this.backendServices[this.selectedHealthCheckIndex].healthCheck = {
          name: selectedHealthCheck.name,
          protocol: selectedHealthCheck.protocol,
          port: selectedHealthCheck.port,
          checkInterval: selectedHealthCheck.checkInterval,
          unhealthyThreshold: selectedHealthCheck.unhealthyThreshold,
          healthyThreshold: selectedHealthCheck.healthyThreshold,
          timeout: selectedHealthCheck.timeout
        };
      }
    }
    this.closeHealthCheckModal();
  }

  getSelectedBackendService(): BackendService | undefined {
    if (this.selectedAdvancedFeaturesIndex >= 0) {
      return this.backendServices[this.selectedAdvancedFeaturesIndex];
    }
    return undefined;
  }

  // Health Check Management
  initializeHealthChecks() {
    this.availableHealthChecks = [
      {
        id: 'default',
        name: 'default',
        description: 'Default health check',
        protocol: 'HTTP',
        port: 80,
        checkInterval: 10,
        timeout: 10,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      {
        id: 'k8s-977b857f8943e33f-node',
        name: 'k8s-977b857f8943e33f-node',
        description: 'Kubernetes node health check',
        protocol: 'HTTP',
        port: 10256,
        checkInterval: 8,
        timeout: 1,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      {
        id: 'test-25',
        name: 'test-25',
        description: 'Test health check on port 25',
        protocol: 'TCP',
        port: 25,
        checkInterval: 10,
        timeout: 5,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      {
        id: 'test-hc',
        name: 'test-hc',
        description: 'Test health check',
        protocol: 'HTTPS',
        port: 443,
        checkInterval: 5,
        timeout: 5,
        unhealthyThreshold: 2,
        healthyThreshold: 2
      },
      {
        id: 'test80',
        name: 'test80',
        description: 'Test health check on port 80',
        protocol: 'HTTP',
        port: 80,
        checkInterval: 10,
        timeout: 5,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      }
    ];
  }

  editHealthCheck(backendServiceIndex: number) {
    this.selectedHealthCheckIndex = backendServiceIndex;
    this.showHealthCheckModal = true;
    this.showCreateHealthCheck = false;
  }

  selectHealthCheck(healthCheck: HealthCheckOption) {
    if (this.selectedHealthCheckIndex >= 0) {
      this.backendServices[this.selectedHealthCheckIndex].healthCheck = {
        name: healthCheck.name,
        protocol: healthCheck.protocol,
        port: healthCheck.port,
        checkInterval: healthCheck.checkInterval,
        unhealthyThreshold: healthCheck.unhealthyThreshold,
        healthyThreshold: healthCheck.healthyThreshold,
        timeout: healthCheck.timeout
      };
    }
    this.closeHealthCheckModal();
  }

  createNewHealthCheck() {
    this.showCreateHealthCheck = true;
    // Initialize form with default values
    this.healthCheckForm.patchValue({
      name: '',
      description: '',
      protocol: 'HTTP',
      port: 80,
      proxyProtocol: 'NONE',
      request: '',
      response: '',
      logs: false,
      checkInterval: 5,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 2
    });
  }

  saveHealthCheck() {
    if (this.healthCheckForm.valid) {
      const formValue = this.healthCheckForm.value;
      
      // Create new health check option
      const newHealthCheck: HealthCheckOption = {
        id: `hc-${Date.now()}`,
        name: formValue.name,
        description: formValue.description,
        protocol: formValue.protocol,
        port: formValue.port,
        checkInterval: formValue.checkInterval,
        timeout: formValue.timeout,
        unhealthyThreshold: formValue.unhealthyThreshold,
        healthyThreshold: formValue.healthyThreshold
      };

      // Add to available health checks
      this.availableHealthChecks.push(newHealthCheck);

      // Apply to current backend service
      if (this.selectedHealthCheckIndex >= 0) {
        this.backendServices[this.selectedHealthCheckIndex].healthCheck = {
          name: newHealthCheck.name,
          protocol: newHealthCheck.protocol,
          port: newHealthCheck.port,
          checkInterval: newHealthCheck.checkInterval,
          unhealthyThreshold: newHealthCheck.unhealthyThreshold,
          healthyThreshold: newHealthCheck.healthyThreshold,
          timeout: newHealthCheck.timeout
        };
      }

      this.closeHealthCheckModal();
    }
  }

  cancelHealthCheck() {
    this.showCreateHealthCheck = false;
  }

  closeHealthCheckModal() {
    this.showHealthCheckModal = false;
    this.showCreateHealthCheck = false;
    this.selectedHealthCheckIndex = -1;
  }

  showLoadBalancerIllustration() {
    this.showIllustration = true;
  }

  closeIllustration() {
    this.showIllustration = false;
  }

  downloadIllustration() {
    // Create SVG content for download
    const svgElement = document.querySelector('.architecture-diagram') as SVGElement;
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `${this.configForm.get('name')?.value || 'load-balancer'}-architecture.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  }

  hasSslCertificate(): boolean {
    return this.frontendConfigs.some(config => config.protocol === 'HTTPS');
  }

  getCurrentFrontendConfig(): string {
    return `${this.frontendConfigs[0].protocol} ${this.frontendConfigs[0].ipVersion} ${this.frontendConfigs[0].ipAddress}:${this.frontendConfigs[0].port}`;
  }

  getFrontendDetails(): string {
    return `${this.frontendConfigs[0].networkServiceTier} Network Service Tier`;
  }

  getRoutingRulesCount(): string {
    return this.routingRules.length.toString();
  }

  getHostPatterns(): string {
    return this.routingRules.map(rule => rule.hostPattern).join(', ');
  }

  getPathPatterns(): string {
    return this.routingRules.map(rule => rule.pathPattern).join(', ');
  }

  hasCloudArmor(): boolean {
    return this.backendServices.some(service => service.cloudArmorBackendSecurityPolicy || service.cloudArmorEdgeSecurityPolicy);
  }

  getCloudArmorBackend(): string {
    return this.backendServices.find(service => service.cloudArmorBackendSecurityPolicy)?.cloudArmorBackendSecurityPolicy || 'N/A';
  }

  getCloudArmorEdge(): string {
    return this.backendServices.find(service => service.cloudArmorEdgeSecurityPolicy)?.cloudArmorEdgeSecurityPolicy || 'N/A';
  }

  hasCloudCDN(): boolean {
    return this.backendServices.some(service => service.cloudCDN);
  }

  getCdnEnabledCount(): string {
    return this.backendServices.filter(service => service.cloudCDN).length.toString();
  }

  getCacheMode(): string {
    return this.backendServices[0].cacheMode;
  }

  getHealthCheckCount(): string {
    return this.backendServices.length.toString();
  }

  getHealthCheckProtocols(): string {
    return this.backendServices.map(service => service.healthCheck.protocol).join(', ');
  }

  getHealthCheckIntervals(): string {
    return this.backendServices.map(service => `${service.healthCheck.checkInterval} seconds`).join(', ');
  }

  getHealthCheckSummary(): string {
    return this.backendServices.map(service => `${service.healthCheck.name} (${service.healthCheck.protocol})`).join(', ');
  }

  getCdnStatus(): string {
    return this.backendServices.some(service => service.cloudCDN) ? 'Enabled' : 'Disabled';
  }

  getCloudArmorStatus(): string {
    return this.backendServices.some(service => service.cloudArmorBackendSecurityPolicy || service.cloudArmorEdgeSecurityPolicy) ? 'Enabled' : 'Disabled';
  }
} 