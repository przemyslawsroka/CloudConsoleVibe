import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CloudArmorPolicyRequest } from '../../services/cloud-armor.service';

export interface CreateCloudArmorPolicyDialogData {
  // Optional initial data
}

@Component({
  selector: 'app-create-cloud-armor-policy-dialog',
  template: `
    <div class="dialog-container">
      <mat-dialog-content class="dialog-content">
        <!-- Left side: Configuration form -->
        <div class="form-section">
          <div class="dialog-header">
            <h2>Create security policy</h2>
            <button mat-icon-button mat-dialog-close>
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Info banner -->
          <div class="info-banner">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <span>Cloud Armor advanced network DDoS protection is now generally available to protect applications and services using Network Load Balancer, Protocol Forwarding, or VMs with Public IP.</span>
              <a href="#" class="learn-more">Learn more</a>
            </div>
            <button mat-icon-button class="dismiss-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="policyForm" class="policy-form">
            
            <!-- Configure policy section -->
            <mat-expansion-panel expanded>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="section-icon">settings</mat-icon>
                  Configure policy
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="form-content">
                <p class="section-description">
                  A security policy contains one or more rules. Rules tell your security policy what to do (action) and when to do it (condition). Targets are where the rule is applied.
                  <a href="#" class="learn-more">Learn more</a>
                </p>

                <!-- Name field -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name *</mat-label>
                  <input matInput formControlName="name" placeholder="Lowercase letters, numbers, hyphens allowed">
                  <mat-error *ngIf="policyForm.get('name')?.hasError('required')">
                    Name is required
                  </mat-error>
                  <mat-error *ngIf="policyForm.get('name')?.hasError('pattern')">
                    Name must contain only lowercase letters, numbers, and hyphens
                  </mat-error>
                </mat-form-field>

                <!-- Description field -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="3"></textarea>
                </mat-form-field>

                <!-- Policy type -->
                <div class="form-group">
                  <label class="form-label">Policy type</label>
                  <mat-radio-group formControlName="policyType" class="radio-group-vertical">
                    <mat-radio-button value="backend">Backend security policy</mat-radio-button>
                    <mat-radio-button value="edge">Edge security policy</mat-radio-button>
                    <mat-radio-button value="network-edge">Network edge security policy</mat-radio-button>
                  </mat-radio-group>
                </div>

                <!-- Scope -->
                <div class="form-group">
                  <label class="form-label">Scope</label>
                  <mat-radio-group formControlName="scope" class="radio-group-horizontal">
                    <mat-radio-button value="global">Global</mat-radio-button>
                    <mat-radio-button value="regional">Regional</mat-radio-button>
                  </mat-radio-group>
                </div>

                <!-- Policy layer -->
                <div class="form-group">
                  <label class="form-label">Policy layer <mat-icon matTooltip="Information about policy layer">help_outline</mat-icon></label>
                  <mat-radio-group formControlName="policyLayer" class="radio-group-horizontal">
                    <mat-radio-button value="application">Application</mat-radio-button>
                    <mat-radio-button value="network">Network</mat-radio-button>
                  </mat-radio-group>
                </div>

                <!-- Default rule section -->
                <div class="default-rule-section">
                  <label class="form-label">Default rule action <mat-icon matTooltip="Information about default rule">help_outline</mat-icon></label>
                  <div class="default-rule-controls">
                    <mat-form-field appearance="outline" class="action-select">
                      <mat-label>Action</mat-label>
                      <mat-select formControlName="defaultAction">
                        <mat-option value="allow">Allow</mat-option>
                        <mat-option value="deny">Deny</mat-option>
                      </mat-select>
                    </mat-form-field>
                    
                    <mat-form-field appearance="outline" class="response-code-select" 
                                    *ngIf="policyForm.get('defaultAction')?.value === 'deny'">
                      <mat-label>Response code</mat-label>
                      <mat-select formControlName="defaultResponseCode">
                        <mat-option value="403">403 (Forbidden)</mat-option>
                        <mat-option value="404">404 (Not Found)</mat-option>
                        <mat-option value="502">502 (Bad Gateway)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Add more rules section -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="section-icon">add</mat-icon>
                  Add more rules (optional)
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="form-content">
                <div class="rules-section">
                  <h4>Rules</h4>
                  <button mat-stroked-button color="primary" (click)="addRule()">
                    <mat-icon>add</mat-icon>
                    Add a rule
                  </button>
                  <p class="info-text">You can also add/edit rules after the policy is created</p>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Apply policy to targets section -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="section-icon">gps_fixed</mat-icon>
                  Apply policy to targets (optional)
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="form-content">
                <p class="info-text">Configure targets for this policy</p>
              </div>
            </mat-expansion-panel>

            <!-- Advanced configurations section -->
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="section-icon">tune</mat-icon>
                  Advanced configurations (optional)
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="form-content">
                <p class="info-text">Configure advanced settings for this policy</p>
              </div>
            </mat-expansion-panel>

          </form>
        </div>

        <!-- Right side: Summary panel -->
        <div class="summary-section">
          <div class="summary-header">
            <h3>Summary</h3>
          </div>

          <div class="summary-content">
            <!-- Description -->
            <div class="summary-item">
              <label>Description (Optional):</label>
              <p>{{ policyForm.get('description')?.value || 'No description provided' }}</p>
            </div>

            <!-- Policy details -->
            <div class="summary-item">
              <label>The policy contains: 1 rule <mat-icon matTooltip="Rule information">help_outline</mat-icon></label>
            </div>

            <!-- Rules section -->
            <div class="summary-rules">
              <h4>Rules</h4>
              <div class="rule-item">
                <div class="rule-header">
                  <span class="rule-match">Match</span>
                  <span class="rule-action">Action</span>
                  <span class="rule-description">Description</span>
                  <span class="rule-priority">Priority</span>
                </div>
                <div class="rule-content">
                  <span class="rule-match">* (All IP addresses)</span>
                  <span class="rule-action" [class]="getActionClass()">
                    <mat-icon>{{ getActionIcon() }}</mat-icon>
                    {{ getActionText() }}
                  </span>
                  <span class="rule-description">Default rule, higher priority overrides it</span>
                  <span class="rule-priority">2147483647</span>
                </div>
              </div>
            </div>

            <!-- Policy enforcement -->
            <div class="summary-item">
              <label>This policy will enforce on: 0 targets <mat-icon matTooltip="Target information">help_outline</mat-icon></label>
              <mat-icon class="warning-icon">warning</mat-icon>
              <span class="warning-text">You don't have any targets yet, so the policy won't affect any traffic</span>
            </div>

            <!-- Advanced configurations -->
            <div class="summary-item">
              <h4>Advanced configurations</h4>
              <div class="config-item">
                <span class="config-label">Adaptive protection</span>
                <span class="config-value">Disabled</span>
              </div>
              <div class="config-item">
                <span class="config-label">Content parsing</span>
                <span class="config-value">Type: JSON standard</span>
              </div>
              <div class="config-item">
                <span class="config-label">Request body inspection size</span>
                <span class="config-value">8 KB</span>
              </div>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <!-- Dialog actions -->
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!policyForm.valid" 
                (click)="onCreate()">
          Create policy
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 1200px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
    }

    .dialog-content {
      display: flex;
      height: 80vh;
      padding: 0;
      margin: 0;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
    }

    .form-section {
      flex: 2;
      overflow-y: auto;
      border-right: 1px solid #e0e0e0;
    }

    .summary-section {
      flex: 1;
      background: #f8f9fa;
      overflow-y: auto;
    }

    .info-banner {
      display: flex;
      align-items: center;
      background-color: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 24px;
    }

    .info-icon {
      color: #1976d2;
      margin-right: 12px;
      font-size: 20px;
    }

    .info-text {
      flex: 1;
      font-size: 14px;
      color: #202124;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .dismiss-btn {
      color: #5f6368;
    }

    .policy-form {
      padding: 0 24px 24px;
    }

    .form-content {
      padding: 16px 0;
    }

    .section-description {
      color: #5f6368;
      font-size: 14px;
      margin: 0 0 24px 0;
      line-height: 1.4;
    }

    .section-icon {
      margin-right: 8px;
      color: #5f6368;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      color: #202124;
      font-size: 14px;
    }

    .radio-group-vertical {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .radio-group-horizontal {
      display: flex;
      gap: 24px;
    }

    .default-rule-section {
      margin-bottom: 24px;
    }

    .default-rule-controls {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .action-select {
      width: 150px;
    }

    .response-code-select {
      width: 200px;
    }

    .rules-section {
      text-align: center;
      padding: 32px 0;
    }

    .rules-section h4 {
      margin: 0 0 16px 0;
      color: #202124;
    }

    .info-text {
      color: #5f6368;
      font-size: 13px;
      margin: 8px 0 0 0;
    }

    /* Summary section styles */
    .summary-header {
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
    }

    .summary-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    }

    .summary-content {
      padding: 24px;
    }

    .summary-item {
      margin-bottom: 24px;
    }

    .summary-item label {
      font-weight: 500;
      color: #202124;
      display: block;
      margin-bottom: 8px;
    }

    .summary-item p {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    .summary-rules h4 {
      margin: 0 0 16px 0;
      color: #202124;
    }

    .rule-item {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .rule-header {
      display: grid;
      grid-template-columns: 1fr 1fr 2fr 80px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      text-transform: uppercase;
    }

    .rule-content {
      display: grid;
      grid-template-columns: 1fr 1fr 2fr 80px;
      padding: 12px;
      font-size: 13px;
      align-items: center;
    }

    .rule-action.deny {
      color: #d32f2f;
    }

    .rule-action.allow {
      color: #388e3c;
    }

    .rule-action mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .warning-icon {
      color: #f57c00;
      font-size: 16px;
      margin-right: 4px;
    }

    .warning-text {
      color: #f57c00;
      font-size: 13px;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .config-label {
      color: #202124;
    }

    .config-value {
      color: #5f6368;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    /* Expansion panel overrides */
    ::ng-deep .mat-expansion-panel {
      margin-bottom: 16px;
      box-shadow: none;
      border: 1px solid #e0e0e0;
    }

    ::ng-deep .mat-expansion-panel-header {
      padding: 16px;
    }

    ::ng-deep .mat-expansion-panel-header-title {
      display: flex;
      align-items: center;
      font-weight: 500;
    }

    ::ng-deep .mat-expansion-panel-content .mat-expansion-panel-body {
      padding: 0 16px 16px;
    }
  `]
})
export class CreateCloudArmorPolicyDialogComponent implements OnInit {
  policyForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateCloudArmorPolicyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateCloudArmorPolicyDialogData
  ) {
    this.policyForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]*$/)]],
      description: [''],
      policyType: ['backend', Validators.required],
      scope: ['global', Validators.required],
      policyLayer: ['application', Validators.required],
      defaultAction: ['deny', Validators.required],
      defaultResponseCode: ['403']
    });
  }

  ngOnInit() {
    // Update response code validation when action changes
    this.policyForm.get('defaultAction')?.valueChanges.subscribe(action => {
      const responseCodeControl = this.policyForm.get('defaultResponseCode');
      if (action === 'deny') {
        responseCodeControl?.setValidators([Validators.required]);
      } else {
        responseCodeControl?.clearValidators();
      }
      responseCodeControl?.updateValueAndValidity();
    });
  }

  addRule() {
    console.log('Add rule functionality to be implemented');
  }

  getActionText(): string {
    const action = this.policyForm.get('defaultAction')?.value;
    const responseCode = this.policyForm.get('defaultResponseCode')?.value;
    
    if (action === 'deny') {
      return `Deny (${responseCode})`;
    }
    return 'Allow';
  }

  getActionIcon(): string {
    return this.policyForm.get('defaultAction')?.value === 'deny' ? 'block' : 'check_circle';
  }

  getActionClass(): string {
    return this.policyForm.get('defaultAction')?.value === 'deny' ? 'deny' : 'allow';
  }

  onCreate() {
    if (this.policyForm.valid) {
      const formValue = this.policyForm.value;
      const policyData: CloudArmorPolicyRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        type: this.getPolicyTypeString(formValue.policyType),
        rules: [
          {
            priority: 2147483647,
            action: formValue.defaultAction,
            match: {
              versionedExpr: 'SRC_IPS_V1',
              config: {
                srcIpRanges: ['*']
              }
            },
            description: 'Default rule, higher priority overrides it'
          }
        ]
      };
      
      this.dialogRef.close(policyData);
    }
  }

  private getPolicyTypeString(type: string): string {
    switch (type) {
      case 'backend': return 'Backend security policy';
      case 'edge': return 'Edge security policy';
      case 'network-edge': return 'Network edge security policy';
      default: return 'Backend security policy';
    }
  }
} 