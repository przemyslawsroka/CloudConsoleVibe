import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
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

export interface HealthCheck {
  name: string;
  protocol: string;
  port: number;
  checkInterval: number;
  unhealthyThreshold: number;
}

export interface RoutingRule {
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
                  <!-- Backend Service Configuration -->
                  <div class="backend-service-config">
                    <h4>Backend Service Configuration</h4>
                    
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Backend service name *</mat-label>
                        <input matInput formControlName="name">
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="form-field">
                        <mat-label>Description</mat-label>
                        <textarea matInput formControlName="description" rows="3"></textarea>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline" class="form-field-inline">
                        <mat-label>Backend type *</mat-label>
                        <mat-select formControlName="type">
                          <mat-option value="INSTANCE_GROUP">Instance group</mat-option>
                          <mat-option value="NETWORK_ENDPOINT_GROUP">Network endpoint group</mat-option>
                          <mat-option value="BUCKET">Cloud Storage bucket</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="form-field-inline">
                        <mat-label>Protocol *</mat-label>
                        <mat-select formControlName="protocol">
                          <mat-option value="HTTP">HTTP</mat-option>
                          <mat-option value="HTTPS">HTTPS</mat-option>
                          <mat-option value="HTTP2">HTTP/2</mat-option>
                        </mat-select>
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="form-field-inline">
                        <mat-label>Named port *</mat-label>
                        <input matInput formControlName="namedPort" placeholder="http">
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="form-field-inline">
                        <mat-label>Timeout *</mat-label>
                        <input matInput type="number" formControlName="timeout" placeholder="30">
                        <span matSuffix>seconds</span>
                        <mat-icon matSuffix class="info-icon">info</mat-icon>
                      </mat-form-field>
                    </div>
                  </div>

                  <!-- Backends Section -->
                  <div class="backends-section">
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

                  <!-- Health Check Section -->
                  <div class="health-check-section">
                    <h4>Health check <mat-icon class="edit-icon">edit</mat-icon></h4>
                    
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

                  <!-- Advanced Features Section -->
                  <div class="advanced-features-section">
                    <h4>Advanced features <mat-icon class="edit-icon">edit</mat-icon></h4>
                    
                    <div class="advanced-features-info">
                      <div class="feature-row">
                        <span class="label">Cloud CDN</span>
                        <span class="value">{{ backendService.cloudCDN ? 'On' : 'Off' }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Cache mode</span>
                        <span class="value">{{ backendService.cacheMode }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Logging</span>
                        <span class="value">{{ backendService.logging ? 'On' : 'Off' }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Cloud Armor backend security policy</span>
                        <span class="value">{{ backendService.cloudArmorBackendSecurityPolicy }}</span>
                      </div>
                      <div class="feature-row">
                        <span class="label">Cloud Armor edge security policy</span>
                        <span class="value">{{ backendService.cloudArmorEdgeSecurityPolicy }}</span>
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
                
                <div class="routing-rule-row">
                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Host 1 (Default)</mat-label>
                    <input matInput [(ngModel)]="defaultRoutingRule.hostPattern" placeholder="*">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Path 1 (Default)</mat-label>
                    <input matInput [(ngModel)]="defaultRoutingRule.pathPattern" placeholder="/*">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field-inline">
                    <mat-label>Backend service *</mat-label>
                    <mat-select [(ngModel)]="defaultRoutingRule.backendService">
                      <mat-option *ngFor="let bs of backendServices" [value]="bs.name">
                        {{ bs.name }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
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
    </div>
  `,
  styles: [`
    .configure-page {
      background: #f8f9fa;
      min-height: calc(100vh - 64px);
      padding: 0;
      position: relative;
      overflow-x: hidden;
    }

    .page-header {
      background: white;
      border-bottom: 1px solid #e0e0e0;
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
      color: #5f6368;
      font-size: 14px;
    }

    .breadcrumb-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
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
      color: #1976d2;
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
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      padding: 16px 24px;
    }

    .config-section mat-card-content {
      padding: 24px;
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h3 {
      margin: 0;
      color: #202124;
      font-size: 16px;
      font-weight: 500;
    }

    .section-description {
      color: #5f6368;
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
      color: #5f6368;
      font-size: 16px;
      cursor: help;
    }

    .edit-icon {
      color: #1976d2;
      font-size: 16px;
      cursor: pointer;
    }

    .tier-label {
      color: #5f6368;
      font-size: 14px;
    }

    /* Frontend Configuration */
    .frontend-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .frontend-header {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .frontend-header:hover {
      background: #f1f3f4;
    }

    .frontend-name {
      font-weight: 500;
      color: #202124;
    }

    .frontend-protocol {
      color: #5f6368;
      font-size: 14px;
      margin-left: 16px;
    }

    .frontend-status {
      color: #ea4335;
      font-size: 12px;
      margin-left: auto;
      margin-right: 16px;
    }

    .frontend-details {
      padding: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .frontend-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    /* Backend Configuration */
    .backend-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .backend-header {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .backend-header:hover {
      background: #f1f3f4;
    }

    .backend-info {
      flex: 1;
    }

    .backend-name {
      font-weight: 500;
      color: #202124;
      display: block;
    }

    .backend-details {
      color: #5f6368;
      font-size: 14px;
      display: block;
      margin-top: 4px;
    }

    .backend-status {
      color: #ea4335;
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
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    .backend-service-config {
      margin-bottom: 32px;
    }

    .backend-service-config h4 {
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    /* Backends Section */
    .backends-section {
      margin-bottom: 32px;
    }

    .backends-section h4 {
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .backend-entry {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .backend-entry-header {
      padding: 12px 16px;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 6px 6px 0 0;
    }

    .backend-entry-name {
      font-weight: 500;
      color: #202124;
    }

    .backend-entry-details {
      color: #5f6368;
      font-size: 14px;
      margin-left: 16px;
    }

    .backend-entry-expanded {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .balancing-mode-section {
      margin: 16px 0;
    }

    .balancing-mode-section h5 {
      color: #202124;
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

    .health-check-section h4 {
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .health-check-info {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
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
      color: #5f6368;
      font-size: 14px;
    }

    .health-check-row .value {
      color: #202124;
      font-size: 14px;
      font-weight: 500;
    }

    /* Advanced Features Section */
    .advanced-features-section {
      margin-bottom: 32px;
    }

    .advanced-features-section h4 {
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .advanced-features-info {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 16px;
    }

    .feature-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .feature-row:last-child {
      margin-bottom: 0;
    }

    .feature-row .label {
      color: #5f6368;
      font-size: 14px;
    }

    .feature-row .value {
      color: #202124;
      font-size: 14px;
      font-weight: 500;
    }

    .backend-service-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    /* Routing Rules */
    .routing-rules-section {
      margin-top: 32px;
    }

    .routing-rules-section h3 {
      color: #202124;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .routing-mode-section {
      margin-bottom: 24px;
    }

    .routing-mode-section h4 {
      color: #202124;
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
      border: 1px solid #e0e0e0;
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
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .routing-rule-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    /* Common Buttons */
    .add-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      border: 1px dashed #1976d2;
      background: transparent;
      margin-top: 16px;
    }

    .add-button:hover {
      background: rgba(25, 118, 210, 0.04);
    }

    .expand-icon {
      color: #5f6368;
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
      background: white;
      border-top: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    /* Form Validation */
    .mat-form-field.ng-invalid.ng-touched .mat-form-field-outline-thick {
      color: #d32f2f;
    }

    .mat-form-field.ng-invalid.ng-touched .mat-form-field-label {
      color: #d32f2f;
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
      color: #1976d2;
    }

    .mat-focused .mat-form-field-label {
      color: #1976d2;
    }

    .mat-select-panel {
      max-height: 300px;
    }

    /* Status Colors */
    .status-healthy {
      color: #137333;
    }

    .status-warning {
      color: #f9ab00;
    }

    .status-error {
      color: #ea4335;
    }

    /* Hover Effects */
    .clickable {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .clickable:hover {
      background-color: #f8f9fa;
    }

    /* Loading States */
    .loading {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Focus States */
    .backend-entry:focus-within {
      border-color: #1976d2;
      box-shadow: 0 0 0 1px #1976d2;
    }

    .frontend-item:focus-within {
      border-color: #1976d2;
      box-shadow: 0 0 0 1px #1976d2;
    }

    /* Advanced Routing Styles */
    .advanced-routing {
      margin-top: 24px;
    }

    .advanced-routing h4 {
      color: #1976d2;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .default-rule-container {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .default-rule-header {
      padding: 16px;
      background: #f8f9fa;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e0e0e0;
    }

    .default-rule-header:hover {
      background: #f1f3f4;
    }

    .default-rule-title {
      font-weight: 500;
      color: #202124;
      font-size: 16px;
    }

    .default-rule-content {
      background: white;
    }

    .view-tabs {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
    }

    .view-tabs button {
      padding: 12px 24px;
      border: none;
      background: transparent;
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .view-tabs button:hover {
      color: #1976d2;
      background: rgba(25, 118, 210, 0.04);
    }

    .view-tabs button.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
      background: white;
    }

    .form-view {
      padding: 24px;
    }

    .host-rules-section {
      margin-bottom: 32px;
    }

    .host-rules-section h5 {
      color: #202124;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .host-rules-content {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 16px;
      color: #5f6368;
    }

    .undefined-rules {
      color: #5f6368;
      font-size: 14px;
    }

    .route-rules-section h5 {
      color: #202124;
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
      color: #5f6368;
    }

    .filter-text {
      color: #5f6368;
      font-size: 14px;
      margin-right: 8px;
    }

    .route-rules-table {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .advanced-rules-table {
      width: 100%;
    }

    .advanced-rules-table .mat-header-cell {
      background: #f8f9fa;
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .advanced-rules-table .mat-cell {
      padding: 12px 16px;
      color: #202124;
      font-size: 14px;
      border-bottom: 1px solid #f1f3f4;
    }

    .advanced-rules-table .mat-header-row {
      background: #f8f9fa;
    }

    .advanced-rules-table .mat-row:hover {
      background: #f8f9fa;
    }

    .advanced-rules-table .mat-row:last-child .mat-cell {
      border-bottom: none;
    }

    .yaml-view {
      padding: 24px;
    }

    .yaml-editor {
      border: 1px solid #e0e0e0;
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
      background: #f8f9fa;
      color: #202124;
    }

    .yaml-textarea:focus {
      outline: none;
      background: white;
    }

    .default-rule-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .add-host-rule-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      border: 1px dashed #1976d2;
      background: transparent;
      margin-top: 16px;
    }

    .add-host-rule-button:hover {
      background: rgba(25, 118, 210, 0.04);
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
      background: white;
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
      background: #e3f2fd !important;
    }

    .rule-error {
      background: #ffebee !important;
    }

    .rule-warning {
      background: #fff3e0 !important;
    }

    /* Tooltip Overrides */
    .mat-tooltip {
      font-size: 12px;
      max-width: 200px;
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

  frontendConfig = {
    name: 'frontend-1',
    protocol: 'HTTP',
    port: 80
  };

  backendServices: BackendService[] = [];
  routingMode: 'simple' | 'advanced' = 'simple';
  defaultRoutingRule: RoutingRule = {
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
  yamlContent = `# YAML configuration for routing rules
# Define your routing rules here
defaultService: lb-2023-backend-1
hostRules: []
pathMatchers: []`;

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
      port: [80, [Validators.required, Validators.min(1), Validators.max(65535)]]
    });

    // Initialize with one backend service
    this.addBackendService();
    this.initializeAdvancedRouting();
  }

  ngOnInit() {
    // Component initialization
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateBack() {
    this.router.navigate(['/load-balancing']);
  }

  toggleFrontend() {
    this.expandedFrontend = !this.expandedFrontend;
  }

  saveFrontend() {
    if (this.frontendForm.valid) {
      this.frontendConfig = { ...this.frontendForm.value };
      this.expandedFrontend = false;
    }
  }

  cancelFrontend() {
    this.frontendForm.patchValue(this.frontendConfig);
    this.expandedFrontend = false;
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
      cloudArmorEdgeSecurityPolicy: 'Default'
    };

    this.backendServices.push(newBackendService);
    this.expandedBackendServices.push(true);
    this.expandedBackends.push([false]);

    // Create form for this backend service
    const backendServiceForm = this.fb.group({
      name: [newBackendService.name, Validators.required],
      description: [newBackendService.description],
      type: [newBackendService.type, Validators.required],
      protocol: [newBackendService.protocol, Validators.required],
      namedPort: [newBackendService.namedPort, Validators.required],
      timeout: [newBackendService.timeout, [Validators.required, Validators.min(1)]]
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
    const form = this.backendServiceForms[index];
    if (form.valid) {
      const formValue = form.value;
      this.backendServices[index] = {
        ...this.backendServices[index],
        ...formValue
      };
      this.expandedBackendServices[index] = false;
    }
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
    // For demo purposes, just log the action
    console.log('Adding new routing rule...');
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
        frontendConfig: this.frontendConfig,
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
    const newHostRule: HostRule = {
      id: `host-rule-${Date.now()}`,
      hosts: ['*'],
      pathMatcher: 'default-matcher'
    };
    
    this.hostRules.push(newHostRule);
    console.log('Added new host and route rule:', newHostRule);
  }
} 