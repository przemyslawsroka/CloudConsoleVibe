import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';

export interface CreateFirewallRuleDialogData {
  mode: 'create' | 'edit';
  rule?: any;
}

interface Protocol {
  name: string;
  enabled: boolean;
  ports: string;
}

@Component({
  selector: 'app-create-firewall-rule-dialog',
  template: `
    <div class="dialog-container">
      <mat-dialog-content class="dialog-content">
        <div class="dialog-header">
          <h2 mat-dialog-title>
            <mat-icon class="header-icon">security</mat-icon>
            {{ data.mode === 'create' ? 'Create' : 'Edit' }} Firewall Rule
          </h2>
          <p class="header-description">
            Configure a firewall rule to control network traffic flow
          </p>
        </div>

        <mat-stepper #stepper orientation="horizontal" [linear]="true" class="rule-stepper">
          
          <!-- Step 1: Basic Information -->
          <mat-step [stepControl]="basicInfoForm" label="Basic Information">
            <ng-template matStepLabel>
              <mat-icon>info</mat-icon>
              Basic Info
            </ng-template>
            
            <form [formGroup]="basicInfoForm" class="step-form">
              <div class="form-section">
                <h3>Rule Identity</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Name *</mat-label>
                    <input matInput formControlName="name" placeholder="e.g., allow-http-traffic">
                    <mat-hint>Lowercase letters, numbers, and hyphens only</mat-hint>
                    <mat-error *ngIf="basicInfoForm.get('name')?.hasError('required')">
                      Name is required
                    </mat-error>
                    <mat-error *ngIf="basicInfoForm.get('name')?.hasError('pattern')">
                      Only lowercase letters, numbers, and hyphens allowed
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="2" 
                              placeholder="Describe what this rule does"></textarea>
                    <mat-hint>Optional but recommended for clarity</mat-hint>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3>Network & Priority</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Network *</mat-label>
                    <mat-select formControlName="network">
                      <mat-option value="default">default</mat-option>
                      <mat-option value="przemeksroka-test">przemeksroka-test</mat-option>
                      <mat-option value="custom-vpc">custom-vpc</mat-option>
                    </mat-select>
                    <mat-hint>VPC network for this rule</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Priority *</mat-label>
                    <input matInput type="number" formControlName="priority" 
                           placeholder="1000" min="0" max="65535">
                    <mat-hint>0-65535 (lower = higher priority)</mat-hint>
                    <mat-error *ngIf="basicInfoForm.get('priority')?.hasError('required')">
                      Priority is required
                    </mat-error>
                    <mat-error *ngIf="basicInfoForm.get('priority')?.hasError('min')">
                      Priority must be at least 0
                    </mat-error>
                    <mat-error *ngIf="basicInfoForm.get('priority')?.hasError('max')">
                      Priority must be at most 65535
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3>Logging</h3>
                <mat-radio-group formControlName="logs" class="radio-group">
                  <div class="radio-option">
                    <mat-radio-button value="off">
                      <div class="radio-content">
                        <span class="radio-title">Logs Off</span>
                        <span class="radio-description">No logging (recommended for high-traffic rules)</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option">
                    <mat-radio-button value="on">
                      <div class="radio-content">
                        <span class="radio-title">Logs On</span>
                        <span class="radio-description">Enable logging (may increase costs)</span>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>
              </div>

              <div class="step-actions">
                <button mat-raised-button color="primary" 
                        [disabled]="!basicInfoForm.valid"
                        (click)="stepper.next()">
                  Next: Traffic Direction
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Traffic Direction & Action -->
          <mat-step [stepControl]="trafficForm" label="Traffic & Action">
            <ng-template matStepLabel>
              <mat-icon>swap_vert</mat-icon>
              Traffic
            </ng-template>
            
            <form [formGroup]="trafficForm" class="step-form">
              <div class="form-section">
                <h3>Traffic Direction</h3>
                <mat-radio-group formControlName="direction" class="radio-group">
                  <div class="radio-option recommended">
                    <mat-radio-button value="INGRESS">
                      <div class="radio-content">
                        <span class="radio-title">
                          <mat-icon>arrow_downward</mat-icon>
                          Ingress
                          <mat-chip class="recommended-chip">Most Common</mat-chip>
                        </span>
                        <span class="radio-description">Incoming traffic to your instances</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option">
                    <mat-radio-button value="EGRESS">
                      <div class="radio-content">
                        <span class="radio-title">
                          <mat-icon>arrow_upward</mat-icon>
                          Egress
                        </span>
                        <span class="radio-description">Outgoing traffic from your instances</span>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>
              </div>

              <div class="form-section">
                <h3>Action</h3>
                <mat-radio-group formControlName="action" class="radio-group">
                  <div class="radio-option recommended">
                    <mat-radio-button value="ALLOW">
                      <div class="radio-content">
                        <span class="radio-title">
                          <mat-icon class="allow-icon">check_circle</mat-icon>
                          Allow
                          <mat-chip class="recommended-chip">Recommended</mat-chip>
                        </span>
                        <span class="radio-description">Permit matching traffic</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option">
                    <mat-radio-button value="DENY">
                      <div class="radio-content">
                        <span class="radio-title">
                          <mat-icon class="deny-icon">block</mat-icon>
                          Deny
                        </span>
                        <span class="radio-description">Block matching traffic</span>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>
              </div>

              <div class="step-actions">
                <button mat-stroked-button (click)="stepper.previous()">
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button color="primary" 
                        [disabled]="!trafficForm.valid"
                        (click)="stepper.next()">
                  Next: Targets & Sources
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Targets & Sources -->
          <mat-step [stepControl]="targetsForm" label="Targets & Sources">
            <ng-template matStepLabel>
              <mat-icon>my_location</mat-icon>
              Targets
            </ng-template>
            
            <form [formGroup]="targetsForm" class="step-form">
              <div class="form-section">
                <h3>Apply Rule To</h3>
                <mat-radio-group formControlName="targetType" class="radio-group">
                  <div class="radio-option">
                    <mat-radio-button value="all">
                      <div class="radio-content">
                        <span class="radio-title">All instances in the VPC</span>
                        <span class="radio-description">Apply to every instance (simple but broad)</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option recommended">
                    <mat-radio-button value="tags">
                      <div class="radio-content">
                        <span class="radio-title">
                          Specified target tags
                          <mat-chip class="recommended-chip">Recommended</mat-chip>
                        </span>
                        <span class="radio-description">Apply to instances with specific tags (more secure)</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option">
                    <mat-radio-button value="service-accounts">
                      <div class="radio-content">
                        <span class="radio-title">Specified service accounts</span>
                        <span class="radio-description">Apply to instances using specific service accounts</span>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>

                <div *ngIf="targetsForm.get('targetType')?.value === 'tags'" class="conditional-section">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Target Tags</mat-label>
                    <mat-chip-grid #chipGrid>
                      <mat-chip-row *ngFor="let tag of targetTags" 
                                   (removed)="removeTargetTag(tag)"
                                   [removable]="true">
                        {{ tag }}
                        <mat-icon matChipRemove>cancel</mat-icon>
                      </mat-chip-row>
                    </mat-chip-grid>
                    <input matInput #tagInput 
                           [matChipInputFor]="chipGrid"
                           (matChipInputTokenEnd)="addTargetTag($event)"
                           placeholder="Enter tag names (e.g., http-server, web-tier)">
                    <mat-hint>Press Enter to add tags. Examples: http-server, web-tier, frontend</mat-hint>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section" *ngIf="trafficForm.get('direction')?.value === 'INGRESS'">
                <h3>Source IP Ranges</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Source IP ranges</mat-label>
                    <mat-chip-grid #sourceChipGrid>
                      <mat-chip-row *ngFor="let range of sourceRanges" 
                                   (removed)="removeSourceRange(range)"
                                   [removable]="true">
                        {{ range }}
                        <mat-icon matChipRemove>cancel</mat-icon>
                      </mat-chip-row>
                    </mat-chip-grid>
                    <input matInput #sourceInput 
                           [matChipInputFor]="sourceChipGrid"
                           (matChipInputTokenEnd)="addSourceRange($event)"
                           placeholder="0.0.0.0/0">
                    <mat-hint>
                      <mat-icon class="hint-icon">lightbulb</mat-icon>
                      Use 0.0.0.0/0 for anywhere, or specific CIDR blocks like 10.0.0.0/8
                    </mat-hint>
                  </mat-form-field>
                </div>

                <div class="quick-options">
                  <span class="quick-label">Quick options:</span>
                  <button mat-stroked-button type="button" (click)="addQuickSource('0.0.0.0/0')">
                    Anywhere (0.0.0.0/0)
                  </button>
                  <button mat-stroked-button type="button" (click)="addQuickSource('10.0.0.0/8')">
                    Private (10.0.0.0/8)
                  </button>
                  <button mat-stroked-button type="button" (click)="addQuickSource('192.168.0.0/16')">
                    Local (192.168.0.0/16)
                  </button>
                </div>
              </div>

              <div class="step-actions">
                <button mat-stroked-button (click)="stepper.previous()">
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button color="primary" 
                        [disabled]="!targetsForm.valid"
                        (click)="stepper.next()">
                  Next: Protocols & Ports
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 4: Protocols & Ports -->
          <mat-step [stepControl]="protocolsForm" label="Protocols & Ports">
            <ng-template matStepLabel>
              <mat-icon>router</mat-icon>
              Protocols
            </ng-template>
            
            <form [formGroup]="protocolsForm" class="step-form">
              <div class="form-section">
                <h3>Protocol Configuration</h3>
                <mat-radio-group formControlName="protocolType" class="radio-group">
                  <div class="radio-option">
                    <mat-radio-button value="all">
                      <div class="radio-content">
                        <span class="radio-title">Allow all protocols and ports</span>
                        <span class="radio-description">Simplest option, but less secure</span>
                      </div>
                    </mat-radio-button>
                  </div>
                  <div class="radio-option recommended">
                    <mat-radio-button value="specified">
                      <div class="radio-content">
                        <span class="radio-title">
                          Specified protocols and ports
                          <mat-chip class="recommended-chip">Recommended</mat-chip>
                        </span>
                        <span class="radio-description">More secure, specify exactly what you need</span>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>

                <div *ngIf="protocolsForm.get('protocolType')?.value === 'specified'" class="protocols-section">
                  <h4>Select Protocols & Ports</h4>
                  
                  <!-- TCP -->
                  <div class="protocol-row">
                    <mat-checkbox [formControl]="tcpEnabledControl"
                                  (change)="updateProtocolsForm()">
                      <span class="protocol-name">TCP</span>
                    </mat-checkbox>
                    <mat-form-field *ngIf="tcpEnabledControl.value" appearance="outline" class="port-field">
                      <mat-label>Ports</mat-label>
                      <input matInput [formControl]="tcpPortsControl"
                             (input)="updateProtocolsForm()"
                             placeholder="80, 443, 8080-8090">
                      <mat-hint>Examples: 80, 443, 8080-8090</mat-hint>
                    </mat-form-field>
                  </div>

                  <!-- UDP -->
                  <div class="protocol-row">
                    <mat-checkbox [formControl]="udpEnabledControl"
                                  (change)="updateProtocolsForm()">
                      <span class="protocol-name">UDP</span>
                    </mat-checkbox>
                    <mat-form-field *ngIf="udpEnabledControl.value" appearance="outline" class="port-field">
                      <mat-label>Ports</mat-label>
                      <input matInput [formControl]="udpPortsControl"
                             (input)="updateProtocolsForm()"
                             placeholder="53, 67-68">
                      <mat-hint>Examples: 53, 67-68</mat-hint>
                    </mat-form-field>
                  </div>

                  <!-- ICMP -->
                  <div class="protocol-row">
                    <mat-checkbox [formControl]="icmpEnabledControl"
                                  (change)="updateProtocolsForm()">
                      <span class="protocol-name">ICMP</span>
                      <span class="protocol-description">(ping, traceroute)</span>
                    </mat-checkbox>
                  </div>

                  <!-- Quick presets -->
                  <div class="protocol-presets">
                    <span class="preset-label">Quick presets:</span>
                    <button mat-stroked-button type="button" (click)="applyPreset('web')">
                      <mat-icon>web</mat-icon>
                      Web Server (HTTP/HTTPS)
                    </button>
                    <button mat-stroked-button type="button" (click)="applyPreset('ssh')">
                      <mat-icon>terminal</mat-icon>
                      SSH Access
                    </button>
                    <button mat-stroked-button type="button" (click)="applyPreset('rdp')">
                      <mat-icon>desktop_windows</mat-icon>
                      RDP Access
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h3>Advanced Options</h3>
                <mat-checkbox formControlName="disabled" class="disabled-checkbox">
                  <div class="checkbox-content">
                    <span class="checkbox-title">Create rule in disabled state</span>
                    <span class="checkbox-description">Rule will be created but not enforced until enabled</span>
                  </div>
                </mat-checkbox>
              </div>

              <div class="step-actions">
                <button mat-stroked-button (click)="stepper.previous()">
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button color="primary" 
                        [disabled]="!protocolsForm.valid"
                        (click)="stepper.next()">
                  Review & Create
                  <mat-icon>preview</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 5: Review -->
          <mat-step label="Review & Create">
            <ng-template matStepLabel>
              <mat-icon>preview</mat-icon>
              Review
            </ng-template>
            
            <div class="review-section">
              <h3>Review Your Firewall Rule</h3>
              
              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>{{ basicInfoForm.get('name')?.value }}</mat-card-title>
                  <mat-card-subtitle>{{ basicInfoForm.get('description')?.value || 'No description' }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-grid">
                    <div class="review-item">
                      <span class="review-label">Direction:</span>
                      <mat-chip [class]="'direction-chip ' + trafficForm.get('direction')?.value?.toLowerCase()">
                        <mat-icon>{{ trafficForm.get('direction')?.value === 'INGRESS' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
                        {{ trafficForm.get('direction')?.value }}
                      </mat-chip>
                    </div>
                    
                    <div class="review-item">
                      <span class="review-label">Action:</span>
                      <mat-chip [class]="'action-chip ' + trafficForm.get('action')?.value?.toLowerCase()">
                        <mat-icon>{{ trafficForm.get('action')?.value === 'ALLOW' ? 'check' : 'block' }}</mat-icon>
                        {{ trafficForm.get('action')?.value }}
                      </mat-chip>
                    </div>

                    <div class="review-item">
                      <span class="review-label">Priority:</span>
                      <span class="review-value">{{ basicInfoForm.get('priority')?.value }}</span>
                    </div>

                    <div class="review-item">
                      <span class="review-label">Network:</span>
                      <span class="review-value">{{ basicInfoForm.get('network')?.value }}</span>
                    </div>

                    <div class="review-item">
                      <span class="review-label">Targets:</span>
                      <span class="review-value">
                        {{ targetsForm.get('targetType')?.value === 'all' ? 'All instances' : 
                           (targetTags.length > 0 ? targetTags.join(', ') : 'None specified') }}
                      </span>
                    </div>

                    <div class="review-item" *ngIf="sourceRanges.length > 0">
                      <span class="review-label">Source Ranges:</span>
                      <span class="review-value">{{ sourceRanges.join(', ') }}</span>
                    </div>

                    <div class="review-item">
                      <span class="review-label">Protocols:</span>
                      <span class="review-value">{{ getProtocolsSummary() }}</span>
                    </div>

                    <div class="review-item">
                      <span class="review-label">Logging:</span>
                      <span class="review-value">{{ basicInfoForm.get('logs')?.value === 'on' ? 'Enabled' : 'Disabled' }}</span>
                    </div>

                    <div class="review-item" *ngIf="protocolsForm.get('disabled')?.value">
                      <span class="review-label">Status:</span>
                      <mat-chip class="disabled-chip">Disabled</mat-chip>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <div class="step-actions">
                <button mat-stroked-button (click)="stepper.previous()">
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button color="primary" (click)="createRule()">
                  <mat-icon>add_circle</mat-icon>
                  Create Firewall Rule
                </button>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .dialog-container {
      max-width: 800px;
      min-height: 600px;
    }

    .dialog-content {
      padding: 0 !important;
      overflow: visible;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .dialog-header h2 {
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #202124;
      font-size: 24px;
      font-weight: 400;
    }

    .header-icon {
      color: #1976d2;
      font-size: 28px;
    }

    .header-description {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    .rule-stepper {
      background: transparent;
    }

    .step-form {
      padding: 24px;
      min-height: 400px;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      color: #202124;
      font-size: 18px;
      font-weight: 500;
    }

    .form-section h4 {
      margin: 16px 0 12px 0;
      color: #5f6368;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-option {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;
    }

    .radio-option:hover {
      border-color: #1976d2;
      background-color: #f8f9fa;
    }

    .radio-option.recommended {
      border-color: #1976d2;
      background-color: #f3f8ff;
    }

    .radio-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 8px;
    }

    .radio-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #202124;
    }

    .radio-description {
      font-size: 13px;
      color: #5f6368;
    }

    .recommended-chip {
      background-color: #e8f5e8;
      color: #2e7d32;
      font-size: 11px;
      height: 20px;
    }

    .allow-icon {
      color: #2e7d32;
    }

    .deny-icon {
      color: #d32f2f;
    }

    .conditional-section {
      margin-top: 16px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }

    .quick-options {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .quick-label {
      font-size: 13px;
      color: #5f6368;
      margin-right: 8px;
    }

    .hint-icon {
      font-size: 16px;
      margin-right: 4px;
      vertical-align: middle;
    }

    .protocols-section {
      margin-top: 16px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .protocol-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: white;
    }

    .protocol-name {
      font-weight: 500;
      min-width: 60px;
    }

    .protocol-description {
      font-size: 12px;
      color: #5f6368;
      margin-left: 8px;
    }

    .port-field {
      flex: 1;
      max-width: 200px;
    }

    .protocol-presets {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .preset-label {
      font-size: 13px;
      color: #5f6368;
      margin-right: 8px;
    }

    .disabled-checkbox {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .checkbox-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 8px;
    }

    .checkbox-title {
      font-weight: 500;
      color: #202124;
    }

    .checkbox-description {
      font-size: 13px;
      color: #5f6368;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      margin-top: 32px;
    }

    .review-section {
      padding: 24px;
    }

    .review-section h3 {
      margin: 0 0 24px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 500;
    }

    .review-card {
      margin-bottom: 24px;
    }

    .review-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .review-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .review-label {
      font-weight: 500;
      color: #5f6368;
      min-width: 80px;
    }

    .review-value {
      color: #202124;
    }

    .direction-chip.ingress {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .direction-chip.egress {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .action-chip.allow {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .action-chip.deny {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .disabled-chip {
      background-color: #fafafa;
      color: #9e9e9e;
    }

    ::ng-deep .mat-stepper-horizontal {
      margin-top: 0;
    }

    ::ng-deep .mat-step-header {
      padding: 16px 24px;
    }

    ::ng-deep .mat-step-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    ::ng-deep .mat-step-icon {
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .dialog-container {
        max-width: 100%;
      }
      
      .form-row {
        flex-direction: column;
      }
      
      .quick-options,
      .protocol-presets {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .review-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreateFirewallRuleDialogComponent implements OnInit {
  basicInfoForm!: FormGroup;
  trafficForm!: FormGroup;
  targetsForm!: FormGroup;
  protocolsForm!: FormGroup;

  targetTags: string[] = [];
  sourceRanges: string[] = ['0.0.0.0/0'];

  protocols = {
    tcp: { enabled: true, ports: '80,443' },
    udp: { enabled: false, ports: '' },
    icmp: { enabled: false, ports: '' }
  };

  tcpEnabledControl = this.fb.control(true);
  tcpPortsControl = this.fb.control('80,443');
  udpEnabledControl = this.fb.control(false);
  udpPortsControl = this.fb.control('');
  icmpEnabledControl = this.fb.control(false);

  constructor(
    public dialogRef: MatDialogRef<CreateFirewallRuleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateFirewallRuleDialogData,
    private fb: FormBuilder
  ) {
    this.initializeForms();
    this.initializeProtocolControls();
  }

  ngOnInit() {
    if (this.data.mode === 'edit' && this.data.rule) {
      this.populateFormWithRule(this.data.rule);
    }
  }

  initializeForms() {
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9\-]+$/)]],
      description: [''],
      network: ['default', Validators.required],
      priority: [1000, [Validators.required, Validators.min(0), Validators.max(65535)]],
      logs: ['off', Validators.required]
    });

    this.trafficForm = this.fb.group({
      direction: ['INGRESS', Validators.required],
      action: ['ALLOW', Validators.required]
    });

    this.targetsForm = this.fb.group({
      targetType: ['tags', Validators.required]
    });

    this.protocolsForm = this.fb.group({
      protocolType: ['specified', Validators.required],
      disabled: [false]
    });
  }

  initializeProtocolControls() {
    this.tcpEnabledControl = this.fb.control(true);
    this.tcpPortsControl = this.fb.control('80,443');
    this.udpEnabledControl = this.fb.control(false);
    this.udpPortsControl = this.fb.control('');
    this.icmpEnabledControl = this.fb.control(false);
  }

  populateFormWithRule(rule: any) {
    // TODO: Populate forms with existing rule data for edit mode
  }

  // Target tags management
  addTargetTag(event: any) {
    const value = (event.target.value || '').trim();
    if (value && !this.targetTags.includes(value)) {
      this.targetTags.push(value);
    }
    event.target.value = '';
  }

  removeTargetTag(tag: string) {
    const index = this.targetTags.indexOf(tag);
    if (index >= 0) {
      this.targetTags.splice(index, 1);
    }
  }

  // Source ranges management
  addSourceRange(event: any) {
    const value = (event.target.value || '').trim();
    if (value && !this.sourceRanges.includes(value)) {
      this.sourceRanges.push(value);
    }
    event.target.value = '';
  }

  removeSourceRange(range: string) {
    const index = this.sourceRanges.indexOf(range);
    if (index >= 0) {
      this.sourceRanges.splice(index, 1);
    }
  }

  addQuickSource(range: string) {
    if (!this.sourceRanges.includes(range)) {
      this.sourceRanges.push(range);
    }
  }

  // Protocol management
  updateProtocolsForm() {
    // Update protocols object from form controls
    this.protocols.tcp.enabled = this.tcpEnabledControl.value || false;
    this.protocols.tcp.ports = this.tcpPortsControl.value || '';
    this.protocols.udp.enabled = this.udpEnabledControl.value || false;
    this.protocols.udp.ports = this.udpPortsControl.value || '';
    this.protocols.icmp.enabled = this.icmpEnabledControl.value || false;
  }

  applyPreset(preset: string) {
    switch (preset) {
      case 'web':
        this.tcpEnabledControl.setValue(true);
        this.tcpPortsControl.setValue('80,443');
        this.udpEnabledControl.setValue(false);
        this.icmpEnabledControl.setValue(false);
        this.targetTags = ['http-server', 'https-server'];
        break;
      case 'ssh':
        this.tcpEnabledControl.setValue(true);
        this.tcpPortsControl.setValue('22');
        this.udpEnabledControl.setValue(false);
        this.icmpEnabledControl.setValue(false);
        break;
      case 'rdp':
        this.tcpEnabledControl.setValue(true);
        this.tcpPortsControl.setValue('3389');
        this.udpEnabledControl.setValue(false);
        this.icmpEnabledControl.setValue(false);
        break;
    }
    this.updateProtocolsForm();
  }

  getProtocolsSummary(): string {
    if (this.protocolsForm.get('protocolType')?.value === 'all') {
      return 'All protocols and ports';
    }

    const enabledProtocols = [];
    if (this.tcpEnabledControl.value) {
      enabledProtocols.push(`TCP${this.tcpPortsControl.value ? ':' + this.tcpPortsControl.value : ''}`);
    }
    if (this.udpEnabledControl.value) {
      enabledProtocols.push(`UDP${this.udpPortsControl.value ? ':' + this.udpPortsControl.value : ''}`);
    }
    if (this.icmpEnabledControl.value) {
      enabledProtocols.push('ICMP');
    }

    return enabledProtocols.length > 0 ? enabledProtocols.join(', ') : 'None specified';
  }

  createRule() {
    if (this.basicInfoForm.valid && this.trafficForm.valid && this.targetsForm.valid && this.protocolsForm.valid) {
      const ruleData = {
        ...this.basicInfoForm.value,
        ...this.trafficForm.value,
        ...this.targetsForm.value,
        ...this.protocolsForm.value,
        targetTags: this.targetTags,
        sourceRanges: this.sourceRanges,
        protocols: this.protocols
      };

      this.dialogRef.close(ruleData);
    }
  }
} 