import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { VpcService } from '../../services/vpc.service';
import { ProjectService, Project } from '../../services/project.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-create-vpc-network',
  template: `
    <div class="create-vpc-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-navigation">
          <button mat-icon-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-item">VPC Networks</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="breadcrumb-item active">Create VPC Network</span>
          </div>
        </div>
        <h1>Create a VPC Network</h1>
        <p class="page-description">
          A Virtual Private Cloud (VPC) network provides networking functionality to your cloud resources. 
          It's a global resource that consists of regional subnetworks (subnets) and connects to other Google Cloud services.
        </p>
      </div>

      <!-- Main Form -->
      <div class="form-container">
        <form [formGroup]="vpcForm" (ngSubmit)="onSubmit()">
          
          <!-- Step 1: Basic Information -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">1</div>
                <div class="step-content">
                  <mat-card-title>Basic Information</mat-card-title>
                  <mat-card-subtitle>Give your VPC network a name and description</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="form-fields">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name *</mat-label>
                  <input matInput formControlName="name" placeholder="my-vpc-network">
                  <mat-icon matSuffix matTooltip="Network names must be lowercase, use hyphens instead of spaces">info</mat-icon>
                  <mat-hint>Choose a descriptive name (e.g., production-vpc, development-vpc)</mat-hint>
                  <mat-error *ngIf="vpcForm.get('name')?.hasError('required')">Network name is required</mat-error>
                  <mat-error *ngIf="vpcForm.get('name')?.hasError('pattern')">Name must be lowercase letters, numbers, and hyphens only</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3" 
                    placeholder="Describe the purpose of this VPC network"></textarea>
                  <mat-hint>Optional: Help your team understand what this network is for</mat-hint>
                </mat-form-field>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">lightbulb</mat-icon>
                <div class="concept-text">
                  <h4>What is a VPC Network?</h4>
                  <p>Think of a VPC network like your own private section of the internet in the cloud. 
                     It allows your resources to communicate securely with each other and provides 
                     isolation from other customers' resources.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 2: Subnet Creation Mode -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">2</div>
                <div class="step-content">
                  <mat-card-title>Subnet Creation Mode</mat-card-title>
                  <mat-card-subtitle>Choose how subnets will be created in your VPC</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <mat-radio-group formControlName="subnetMode" class="subnet-mode-group">
                <mat-radio-button value="automatic" class="subnet-mode-option">
                  <div class="radio-content">
                    <div class="radio-header">
                      <mat-icon class="mode-icon">auto_awesome</mat-icon>
                      <strong>Automatic</strong>
                      <mat-chip class="recommended-chip">Recommended for beginners</mat-chip>
                    </div>
                    <div class="radio-description">
                      Google automatically creates one subnet in each region with predefined IP ranges.
                      This is the easiest option and works well for most use cases.
                    </div>
                    <div class="radio-benefits">
                      <mat-icon class="benefit-icon">check_circle</mat-icon>
                      <span>No IP planning required</span>
                    </div>
                  </div>
                </mat-radio-button>

                <mat-radio-button value="custom" class="subnet-mode-option">
                  <div class="radio-content">
                    <div class="radio-header">
                      <mat-icon class="mode-icon">tune</mat-icon>
                      <strong>Custom</strong>
                      <mat-chip class="advanced-chip">Advanced</mat-chip>
                    </div>
                    <div class="radio-description">
                      You manually create subnets in specific regions with custom IP ranges.
                      Choose this for more control over network topology and IP addressing.
                    </div>
                    <div class="radio-benefits">
                      <mat-icon class="benefit-icon">build</mat-icon>
                      <span>Full control over subnets and IP ranges</span>
                    </div>
                  </div>
                </mat-radio-button>
              </mat-radio-group>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">map</mat-icon>
                <div class="concept-text">
                  <h4>Understanding Subnets</h4>
                  <p>Subnets are regional networks within your VPC. They define IP address ranges for your resources. 
                     Each subnet exists in a single region but can span multiple zones within that region.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 3: Custom Subnets (only if custom mode) -->
          <mat-card class="form-step" *ngIf="vpcForm.get('subnetMode')?.value === 'custom'">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">3</div>
                <div class="step-content">
                  <mat-card-title>Create Subnets</mat-card-title>
                  <mat-card-subtitle>Define your network topology with custom subnets</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="subnets-section">
                <div formArrayName="subnets">
                  <div *ngFor="let subnet of subnets.controls; let i = index" 
                       [formGroupName]="i" class="subnet-card">
                    <div class="subnet-header">
                      <h4>Subnet {{ i + 1 }}</h4>
                      <button mat-icon-button color="warn" 
                              (click)="removeSubnet(i)" 
                              type="button"
                              *ngIf="subnets.length > 1">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                    
                    <div class="subnet-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Subnet name *</mat-label>
                        <input matInput formControlName="name" placeholder="subnet-{{ i + 1 }}">
                        <mat-error *ngIf="subnet.get('name')?.hasError('required')">Subnet name is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Region *</mat-label>
                        <mat-select formControlName="region">
                          <mat-option *ngFor="let region of availableRegions" [value]="region.name">
                            {{ region.description }} ({{ region.name }})
                          </mat-option>
                        </mat-select>
                        <mat-error *ngIf="subnet.get('region')?.hasError('required')">Region is required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>IP address range (CIDR) *</mat-label>
                        <input matInput formControlName="ipRange" placeholder="10.0.{{ i }}.0/24">
                        <mat-icon matSuffix matTooltip="CIDR notation defines the IP range. /24 gives you 256 IP addresses">info</mat-icon>
                        <mat-hint>Example: 10.0.{{ i }}.0/24 (provides 256 IP addresses)</mat-hint>
                        <mat-error *ngIf="subnet.get('ipRange')?.hasError('required')">IP range is required</mat-error>
                        <mat-error *ngIf="subnet.get('ipRange')?.hasError('pattern')">Invalid CIDR format</mat-error>
                      </mat-form-field>
                    </div>

                    <div class="subnet-advanced" *ngIf="showAdvancedSubnetOptions">
                      <h5>Advanced Options</h5>
                      <div class="advanced-options">
                        <mat-slide-toggle formControlName="privateGoogleAccess">
                          Private Google Access
                          <mat-icon matTooltip="Allows VMs without external IPs to reach Google APIs">info</mat-icon>
                        </mat-slide-toggle>
                        
                        <mat-slide-toggle formControlName="flowLogs">
                          Enable Flow Logs
                          <mat-icon matTooltip="Records network flows for monitoring and troubleshooting">info</mat-icon>
                        </mat-slide-toggle>

                        <!-- Flow Logs Advanced Options - Show when Flow Logs are enabled -->
                        <div class="flow-logs-advanced" *ngIf="subnet.get('flowLogs')?.value">
                          <h6>Flow Logs Configuration</h6>
                          
                          <mat-form-field appearance="outline" class="flow-logs-field">
                            <mat-label>Aggregation interval</mat-label>
                            <mat-select formControlName="flowLogsAggregationInterval">
                              <mat-option value="INTERVAL_5_SEC">5 seconds</mat-option>
                              <mat-option value="INTERVAL_30_SEC">30 seconds</mat-option>
                              <mat-option value="INTERVAL_1_MIN">1 minute</mat-option>
                              <mat-option value="INTERVAL_5_MIN">5 minutes</mat-option>
                              <mat-option value="INTERVAL_10_MIN">10 minutes</mat-option>
                              <mat-option value="INTERVAL_15_MIN">15 minutes</mat-option>
                            </mat-select>
                            <mat-hint>Information for sampled packets is aggregated over this interval to generate a flow log record</mat-hint>
                          </mat-form-field>

                          <div class="flow-logs-advanced-toggle">
                            <button mat-button type="button" 
                                    (click)="toggleFlowLogsAdvanced(i)"
                                    class="advanced-toggle-btn">
                              <mat-icon>{{ subnet.get('showFlowLogsAdvanced')?.value ? 'expand_less' : 'expand_more' }}</mat-icon>
                              Advanced settings
                            </button>
                          </div>

                          <div class="flow-logs-advanced-section" *ngIf="subnet.get('showFlowLogsAdvanced')?.value">
                            <mat-checkbox formControlName="flowLogsKeepOnlyMatchingLogs" class="flow-logs-checkbox">
                              <div class="checkbox-content">
                                <strong>Keep only logs that match a filter</strong>
                                <div class="checkbox-description">For details, see Log filtering</div>
                              </div>
                            </mat-checkbox>

                            <mat-form-field appearance="outline" class="flow-logs-field" 
                                           *ngIf="subnet.get('flowLogsKeepOnlyMatchingLogs')?.value">
                              <mat-label>Filter expression</mat-label>
                              <input matInput formControlName="flowLogsFilterExpression" 
                                     placeholder="Enter filter expression">
                            </mat-form-field>

                            <mat-checkbox formControlName="flowLogsMetadataAnnotations" class="flow-logs-checkbox">
                              <div class="checkbox-content">
                                <strong>Metadata annotations</strong>
                                <div class="checkbox-description">Additional information that you can include in flow log records. For a list of available metadata annotations, see Record format</div>
                              </div>
                            </mat-checkbox>

                            <div class="sampling-rate-section">
                              <label class="sampling-rate-label">Secondary sampling rate *</label>
                              <div class="sampling-rate-input">
                                <mat-form-field appearance="outline" class="sampling-input">
                                  <input matInput type="number" 
                                         formControlName="flowLogsSamplingRate" 
                                         min="0" max="100">
                                </mat-form-field>
                                <span class="percent-symbol">%</span>
                                <mat-icon matTooltip="Percentage of packets to sample">info</mat-icon>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="subnet-actions">
                  <button mat-raised-button color="primary" 
                          (click)="addSubnet()" 
                          type="button"
                          class="add-subnet-btn">
                    <mat-icon>add</mat-icon>
                    Add Another Subnet
                  </button>
                  
                  <button mat-button 
                          (click)="showAdvancedSubnetOptions = !showAdvancedSubnetOptions" 
                          type="button">
                    <mat-icon>{{ showAdvancedSubnetOptions ? 'expand_less' : 'expand_more' }}</mat-icon>
                    {{ showAdvancedSubnetOptions ? 'Hide' : 'Show' }} Advanced Options
                  </button>
                </div>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">device_hub</mat-icon>
                <div class="concept-text">
                  <h4>Planning IP Ranges</h4>
                  <p>Use private IP ranges like 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16. 
                     Avoid overlapping ranges if you plan to connect networks later. 
                     The /24 suffix gives you 256 IP addresses (254 usable).</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 4: Firewall Rules -->
          <mat-card class="form-step">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">{{ vpcForm.get('subnetMode')?.value === 'custom' ? '4' : '3' }}</div>
                <div class="step-content">
                  <mat-card-title>Firewall Rules</mat-card-title>
                  <mat-card-subtitle>Control traffic to and from your VPC network</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <div class="firewall-section">
                <div class="firewall-presets">
                  <h4>Quick Setup - Common Firewall Rules</h4>
                  <p>These rules allow common types of traffic. You can modify them later.</p>
                  
                  <div class="firewall-options">
                    <mat-checkbox formControlName="allowHttp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow HTTP traffic (port 80)</strong>
                        <div class="rule-description">Enables web traffic from the internet</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowHttps" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow HTTPS traffic (port 443)</strong>
                        <div class="rule-description">Enables secure web traffic from the internet</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowSsh" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow SSH traffic (port 22)</strong>
                        <div class="rule-description">Enables remote terminal access to VMs</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowRdp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow RDP traffic (port 3389)</strong>
                        <div class="rule-description">Enables remote desktop access to Windows VMs</div>
                      </div>
                    </mat-checkbox>

                    <mat-checkbox formControlName="allowIcmp" class="firewall-rule">
                      <div class="rule-content">
                        <strong>Allow ICMP (ping)</strong>
                        <div class="rule-description">Enables ping for network troubleshooting</div>
                      </div>
                    </mat-checkbox>
                  </div>
                </div>
              </div>

              <div class="concept-explanation">
                <mat-icon class="concept-icon">security</mat-icon>
                <div class="concept-text">
                  <h4>Understanding Firewall Rules</h4>
                  <p>Firewall rules control which network traffic is allowed to reach your resources. 
                     By default, incoming traffic is blocked and outgoing traffic is allowed. 
                     You can always add more specific rules after creating the VPC.</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Step 5: Advanced Configuration -->
          <mat-card class="form-step" *ngIf="showAdvancedOptions">
            <mat-card-header>
              <div class="step-header">
                <div class="step-number">{{ vpcForm.get('subnetMode')?.value === 'custom' ? '5' : '4' }}</div>
                <div class="step-content">
                  <mat-card-title>Advanced Configuration</mat-card-title>
                  <mat-card-subtitle>Optional settings for specialized use cases</mat-card-subtitle>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <!-- Dynamic Routing -->
              <div class="form-section">
                <h4>Dynamic Routing</h4>
                <mat-radio-group formControlName="routingMode" class="routing-mode-group">
                  <mat-radio-button value="REGIONAL">
                    <div class="radio-content-simple">
                      <strong>Regional</strong>
                      <div class="description">Routes learned by Cloud Router only apply to the same region</div>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="GLOBAL">
                    <div class="radio-content-simple">
                      <strong>Global</strong>
                      <div class="description">Routes learned by Cloud Router apply to all regions</div>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <!-- DNS Configuration -->
              <div class="form-section">
                <h4>DNS Configuration</h4>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>DNS Server Policy</mat-label>
                  <mat-select formControlName="dnsPolicy">
                    <mat-option value="DEFAULT">Default (Google DNS)</mat-option>
                    <mat-option value="ALTERNATIVE">Alternative DNS</mat-option>
                  </mat-select>
                  <mat-hint>Most users should keep the default setting</mat-hint>
                </mat-form-field>
              </div>

              <!-- Flow Logs -->
              <div class="form-section">
                <h4>Network Monitoring</h4>
                <mat-slide-toggle formControlName="enableFlowLogs">
                  Enable VPC Flow Logs by default
                  <mat-icon matTooltip="Records network flows for monitoring, troubleshooting, and security analysis">info</mat-icon>
                </mat-slide-toggle>
                <p class="toggle-description">Captures network flow data for analysis and monitoring</p>
              </div>

              <!-- Hybrid Subnets -->
              <div class="form-section">
                <h4>Hybrid Subnets</h4>
                <mat-radio-group formControlName="hybridSubnets" class="hybrid-subnets-group">
                  <mat-radio-button value="on">
                    <div class="radio-content-simple">
                      <strong>On</strong>
                      <div class="description">Enable hybrid subnet functionality</div>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="off">
                    <div class="radio-content-simple">
                      <strong>Off</strong>
                      <div class="description">Standard subnet configuration</div>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
                <p class="toggle-description">Hybrid subnets allow for specialized network configurations</p>
              </div>

              <!-- Network Firewall Policy Enforcement Order -->
              <div class="form-section">
                <h4>Network Firewall Policy Enforcement</h4>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Enforcement Order</mat-label>
                  <mat-select formControlName="networkFirewallPolicyEnforcementOrder">
                    <mat-option value="AFTER_CLASSIC_FIREWALL">After Classic Firewall</mat-option>
                    <mat-option value="BEFORE_CLASSIC_FIREWALL">Before Classic Firewall</mat-option>
                  </mat-select>
                  <mat-icon matSuffix matTooltip="Determines whether network firewall policies are applied before or after classic firewall rules">info</mat-icon>
                  <mat-hint>Controls how network firewall policies interact with classic firewall rules</mat-hint>
                </mat-form-field>
                <p class="toggle-description">
                  Configures the order in which network firewall policies and classic firewall rules are applied. 
                  Most users should keep the default "After Classic Firewall" setting.
                </p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Actions -->
          <div class="form-actions">
            <div class="action-buttons">
              <button mat-button type="button" (click)="goBack()" class="cancel-btn">
                Cancel
              </button>
              <button mat-button type="button" 
                      (click)="showAdvancedOptions = !showAdvancedOptions"
                      class="advanced-btn">
                <mat-icon>{{ showAdvancedOptions ? 'expand_less' : 'expand_more' }}</mat-icon>
                {{ showAdvancedOptions ? 'Hide' : 'Show' }} Advanced Options
              </button>
              <button mat-raised-button color="primary" 
                      type="submit" 
                      [disabled]="!vpcForm.valid || isCreating"
                      class="create-btn">
                <mat-spinner diameter="20" *ngIf="isCreating"></mat-spinner>
                <mat-icon *ngIf="!isCreating">add</mat-icon>
                {{ isCreating ? 'Creating...' : 'Create VPC Network' }}
              </button>
            </div>
            
            <div class="cost-estimate" *ngIf="!isCreating">
              <mat-icon class="cost-icon">info</mat-icon>
              <div class="cost-text">
                <strong>Estimated monthly cost: Free</strong>
                <p>VPC networks are free. You only pay for the resources you deploy within them.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-vpc-container {
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

    .form-step {
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .step-header {
      display: flex;
      align-items: center;
    }

    .step-number {
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

    .step-content {
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

    .concept-explanation {
      background: var(--hover-color);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      margin-top: 24px;
    }

    .concept-icon {
      color: #4caf50;
      margin-right: 12px;
      margin-top: 2px;
    }

    .concept-text h4 {
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .concept-text p {
      margin: 0;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    /* Subnet Mode Styles */
    .subnet-mode-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .subnet-mode-option {
      padding: 20px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      margin: 0;
      transition: all 0.3s ease;
      background: var(--surface-color);
    }

    .subnet-mode-option:hover {
      border-color: #1976d2;
      background: var(--hover-color);
    }

    .subnet-mode-option.mat-radio-checked {
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

    .mode-icon {
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

    .radio-benefits {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .benefit-icon {
      color: #4caf50;
      font-size: 16px;
    }

    /* Custom Subnets Styles */
    .subnet-card {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      background: var(--surface-color);
    }

    .subnet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .subnet-header h4 {
      margin: 0;
      color: #1976d2;
    }

    .subnet-fields {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .subnet-advanced {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    .subnet-advanced h5 {
      margin: 0 0 12px 0;
      color: var(--text-secondary-color);
    }

    .advanced-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Flow Logs Advanced Styles */
    .flow-logs-advanced {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }

    .flow-logs-advanced h6 {
      margin: 0 0 16px 0;
      color: #1976d2;
      font-size: 14px;
      font-weight: 500;
    }

    .flow-logs-field {
      width: 100%;
      margin-bottom: 12px;
    }

    .flow-logs-advanced-toggle {
      margin: 16px 0;
    }

    .advanced-toggle-btn {
      color: #1976d2;
      padding: 8px 16px;
    }

    .flow-logs-advanced-section {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
      margin-top: 8px;
    }

    .flow-logs-checkbox {
      width: 100%;
      margin-bottom: 16px;
    }

    .checkbox-content strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-color);
    }

    .checkbox-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .sampling-rate-section {
      margin-top: 16px;
    }

    .sampling-rate-label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-color);
      font-weight: 500;
    }

    .sampling-rate-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sampling-input {
      width: 100px;
    }

    .percent-symbol {
      color: var(--text-secondary-color);
      font-weight: bold;
    }

    /* Hybrid Subnets Styles */
    .hybrid-subnets-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .subnet-actions {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-top: 20px;
    }

    .add-subnet-btn {
      background: #4caf50;
      color: white;
    }

    /* Firewall Rules Styles */
    .firewall-section h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .firewall-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .firewall-rule {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface-color);
    }

    .rule-content strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-color);
    }

    .rule-description {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    /* Advanced Configuration Styles */
    .form-section {
      margin-bottom: 24px;
    }

    .form-section h4 {
      margin: 0 0 12px 0;
      color: #1976d2;
    }

    .routing-mode-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-content-simple {
      margin-left: 8px;
    }

    .radio-content-simple .description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin-top: 4px;
    }

    .toggle-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      margin: 8px 0 0 36px;
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

    .advanced-btn {
      color: #1976d2;
    }

    .create-btn {
      background: #1976d2;
      color: white;
      padding: 12px 32px;
    }

    .create-btn:disabled {
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
      .form-step,
      .subnet-card,
      .form-actions {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .concept-explanation {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .concept-text h4 {
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

      .mat-mdc-checkbox {
        .mat-mdc-checkbox-frame {
          border-color: var(--border-color) !important;
        }

        .mat-mdc-checkbox-checkmark {
          color: white !important;
        }
      }

      .mat-mdc-slide-toggle {
        .mat-mdc-slide-toggle-bar {
          background-color: var(--border-color) !important;
        }
      }

      .mat-mdc-slide-toggle.mat-checked {
        .mat-mdc-slide-toggle-bar {
          background-color: rgba(25, 118, 210, 0.5) !important;
        }

        .mat-mdc-slide-toggle-thumb {
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

      .subnet-fields {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }

      .subnet-mode-group {
        gap: 12px;
      }

      .subnet-mode-option {
        padding: 16px;
      }
    }
  `]
})
export class CreateVpcNetworkComponent implements OnInit {
  vpcForm: FormGroup;
  showAdvancedOptions = false;
  showAdvancedSubnetOptions = false;
  isCreating = false;
  projectId: string | null = null;

  availableRegions = [
    { name: 'us-central1', description: 'Iowa, USA' },
    { name: 'us-east1', description: 'South Carolina, USA' },
    { name: 'us-west1', description: 'Oregon, USA' },
    { name: 'europe-west1', description: 'Belgium' },
    { name: 'europe-west2', description: 'London, England' },
    { name: 'asia-east1', description: 'Taiwan' },
    { name: 'asia-southeast1', description: 'Singapore' },
    { name: 'australia-southeast1', description: 'Sydney, Australia' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private vpcService: VpcService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {
    this.vpcForm = this.createForm();
  }

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)]],
      description: [''],
      subnetMode: ['automatic', Validators.required],
      subnets: this.fb.array([this.createSubnetGroup()]),
      allowHttp: [false],
      allowHttps: [true],
      allowSsh: [true],
      allowRdp: [false],
      allowIcmp: [true],
      routingMode: ['REGIONAL'],
      dnsPolicy: ['DEFAULT'],
      enableFlowLogs: [false],
      hybridSubnets: ['off'],
      networkFirewallPolicyEnforcementOrder: ['AFTER_CLASSIC_FIREWALL']
    });
  }

  createSubnetGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      region: ['', Validators.required],
      ipRange: ['', [Validators.required, Validators.pattern(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/)]],
      privateGoogleAccess: [true],
      flowLogs: [false],
      // Flow Logs advanced options
      flowLogsAggregationInterval: ['INTERVAL_5_SEC'],
      flowLogsKeepOnlyMatchingLogs: [false],
      flowLogsFilterExpression: [''],
      flowLogsMetadataAnnotations: [true],
      flowLogsSamplingRate: [50],
      showFlowLogsAdvanced: [false]
    });
  }

  get subnets(): FormArray {
    return this.vpcForm.get('subnets') as FormArray;
  }

  addSubnet() {
    this.subnets.push(this.createSubnetGroup());
  }

  removeSubnet(index: number) {
    if (this.subnets.length > 1) {
      this.subnets.removeAt(index);
    }
  }

  toggleFlowLogsAdvanced(index: number) {
    const subnet = this.subnets.controls[index] as FormGroup;
    subnet.get('showFlowLogsAdvanced')?.setValue(!subnet.get('showFlowLogsAdvanced')?.value);
  }

  onSubmit() {
    if (this.vpcForm.valid && this.projectId) {
      this.isCreating = true;
      const formValue = this.vpcForm.value;
      
      const vpcData = {
        name: formValue.name,
        description: formValue.description,
        autoCreateSubnetworks: formValue.subnetMode === 'automatic',
        routingConfig: {
          routingMode: formValue.routingMode
        },
        networkFirewallPolicyEnforcementOrder: formValue.networkFirewallPolicyEnforcementOrder
      };

      // Include subnets data for custom mode
      const subnetsData = formValue.subnetMode === 'custom' ? formValue.subnets : null;

      this.vpcService.createVpcNetworkWithSubnets(this.projectId, vpcData, subnetsData).subscribe({
        next: (response) => {
          this.snackBar.open('VPC Network created successfully!', 'Close', {
            duration: 5000,
            panelClass: 'success-snackbar'
          });
          this.router.navigate(['/vpc']);
        },
        error: (error) => {
          console.error('Error creating VPC network:', error);
          this.snackBar.open('Error creating VPC network. Please try again.', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.isCreating = false;
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/vpc']);
  }
} 