import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { FirewallService, FirewallRule, FirewallPolicy } from '../../services/firewall.service';
import { ProjectService, Project } from '../../services/project.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';
import { CreateFirewallRuleDialogComponent } from './create-firewall-rule-dialog.component';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-firewall-management',
  template: `
    <div class="firewall-management-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>
            <mat-icon class="header-icon">security</mat-icon>
            Firewall Management
          </h1>
          <p class="header-description">
            Manage firewall rules and policies to control network traffic to your resources
          </p>
        </div>
        <div class="header-actions">
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh all data">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-icon">
                <mat-icon>rule</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ firewallRules.length }}</div>
                <div class="stat-label">Firewall Rules</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-icon">
                <mat-icon>policy</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ firewallPolicies.length }}</div>
                <div class="stat-label">Firewall Policies</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-icon">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ getActiveRulesCount() }}</div>
                <div class="stat-label">Active Rules</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <div class="stat-icon">
                <mat-icon>block</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ getDenyRulesCount() }}</div>
                <div class="stat-label">Deny Rules</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Content with Tabs -->
      <mat-card class="main-content">
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          
          <!-- Firewall Rules Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>rule</mat-icon>
              <span>Firewall Rules</span>
              <mat-chip class="count-chip">{{ firewallRules.length }}</mat-chip>
            </ng-template>
            
            <div class="tab-content">
              <!-- Rules Actions Bar -->
              <div class="actions-bar">
                <div class="actions-left">
                  <button mat-raised-button color="primary" (click)="createFirewallRule()">
                    <mat-icon>add</mat-icon>
                    Create Firewall Rule
                  </button>
                  <button 
                    mat-stroked-button 
                    [disabled]="rulesSelection.isEmpty()" 
                    (click)="deleteSelectedRules()"
                    color="warn">
                    <mat-icon>delete</mat-icon>
                    Delete Selected ({{ rulesSelection.selected.length }})
                  </button>
                  <button mat-stroked-button (click)="configureLogs()">
                    <mat-icon>settings</mat-icon>
                    Configure Logs
                  </button>
                </div>
                <div class="actions-right">
                  <mat-form-field appearance="outline" class="search-field">
                    <mat-label>Search rules</mat-label>
                    <input matInput [formControl]="rulesFilterControl" (input)="applyRulesFilter()" 
                           placeholder="Filter by name, target, or protocol">
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>
                </div>
              </div>

              <!-- Rules Table -->
              <div class="table-container" *ngIf="!isLoadingRules">
                <table mat-table [dataSource]="filteredRules" class="rules-table">
                  
                  <!-- Selection Column -->
                  <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                      <mat-checkbox (change)="$event ? masterToggleRules() : null"
                                    [checked]="rulesSelection.hasValue() && isAllRulesSelected()"
                                    [indeterminate]="rulesSelection.hasValue() && !isAllRulesSelected()">
                      </mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let rule">
                      <mat-checkbox (click)="$event.stopPropagation()"
                                    (change)="$event ? rulesSelection.toggle(rule) : null"
                                    [checked]="rulesSelection.isSelected(rule)">
                      </mat-checkbox>
                    </td>
                  </ng-container>

                  <!-- Name Column -->
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let rule">
                      <div class="rule-name">
                        <span class="name-text">{{ rule.name }}</span>
                        <mat-chip *ngIf="rule.disabled" class="status-chip disabled">Disabled</mat-chip>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Type Column -->
                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let rule">
                      <mat-chip [class]="'type-chip ' + rule.type.toLowerCase()">
                        <mat-icon>{{ rule.type === 'Ingress' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
                        {{ rule.type }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <!-- Targets Column -->
                  <ng-container matColumnDef="targets">
                    <th mat-header-cell *matHeaderCellDef>Targets</th>
                    <td mat-cell *matCellDef="let rule">
                      <span class="targets-text">{{ rule.targets }}</span>
                    </td>
                  </ng-container>

                  <!-- Protocols/Ports Column -->
                  <ng-container matColumnDef="protocolsPorts">
                    <th mat-header-cell *matHeaderCellDef>Protocols/Ports</th>
                    <td mat-cell *matCellDef="let rule">
                      <mat-chip class="protocol-chip">{{ rule.protocolsPorts || 'N/A' }}</mat-chip>
                    </td>
                  </ng-container>

                  <!-- Action Column -->
                  <ng-container matColumnDef="action">
                    <th mat-header-cell *matHeaderCellDef>Action</th>
                    <td mat-cell *matCellDef="let rule">
                      <mat-chip [class]="'action-chip ' + rule.action?.toLowerCase()">
                        <mat-icon>{{ rule.action === 'Allow' ? 'check' : 'block' }}</mat-icon>
                        {{ rule.action }}
                      </mat-chip>
                    </td>
                  </ng-container>

                  <!-- Priority Column -->
                  <ng-container matColumnDef="priority">
                    <th mat-header-cell *matHeaderCellDef>Priority</th>
                    <td mat-cell *matCellDef="let rule">
                      <span class="priority-text">{{ rule.priority }}</span>
                    </td>
                  </ng-container>

                  <!-- Network Column -->
                  <ng-container matColumnDef="network">
                    <th mat-header-cell *matHeaderCellDef>Network</th>
                    <td mat-cell *matCellDef="let rule">
                      <a class="network-link">{{ rule.network }}</a>
                    </td>
                  </ng-container>

                  <!-- Actions Column -->
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let rule">
                      <button mat-icon-button [matMenuTriggerFor]="ruleMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #ruleMenu="matMenu">
                        <button mat-menu-item (click)="editRule(rule)">
                          <mat-icon>edit</mat-icon>
                          <span>Edit</span>
                        </button>
                        <button mat-menu-item (click)="cloneRule(rule)">
                          <mat-icon>content_copy</mat-icon>
                          <span>Clone</span>
                        </button>
                        <button mat-menu-item (click)="toggleRuleStatus(rule)">
                          <mat-icon>{{ rule.disabled ? 'play_arrow' : 'pause' }}</mat-icon>
                          <span>{{ rule.disabled ? 'Enable' : 'Disable' }}</span>
                        </button>
                        <mat-divider></mat-divider>
                        <button mat-menu-item (click)="deleteRule(rule)" class="delete-action">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="rulesDisplayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: rulesDisplayedColumns;"></tr>
                </table>

                <div *ngIf="filteredRules.length === 0" class="no-data">
                  <mat-icon>rule</mat-icon>
                  <p>No firewall rules found</p>
                  <button mat-raised-button color="primary" (click)="createFirewallRule()">
                    Create your first firewall rule
                  </button>
                </div>
              </div>

              <div *ngIf="isLoadingRules" class="loading-container">
                <mat-spinner diameter="50"></mat-spinner>
                <p>Loading firewall rules...</p>
              </div>
            </div>
          </mat-tab>

          <!-- Firewall Policies Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>policy</mat-icon>
              <span>Firewall Policies</span>
              <mat-chip class="count-chip">{{ firewallPolicies.length }}</mat-chip>
            </ng-template>
            
            <div class="tab-content">
              <!-- Policies Actions Bar -->
              <div class="actions-bar">
                <div class="actions-left">
                  <button mat-raised-button color="primary" (click)="createFirewallPolicy()">
                    <mat-icon>add</mat-icon>
                    Create Firewall Policy
                  </button>
                  <button 
                    mat-stroked-button 
                    [disabled]="policiesSelection.isEmpty()" 
                    (click)="deleteSelectedPolicies()"
                    color="warn">
                    <mat-icon>delete</mat-icon>
                    Delete Selected ({{ policiesSelection.selected.length }})
                  </button>
                </div>
                <div class="actions-right">
                  <mat-form-field appearance="outline" class="search-field">
                    <mat-label>Search policies</mat-label>
                    <input matInput [formControl]="policiesFilterControl" (input)="applyPoliciesFilter()" 
                           placeholder="Filter by name or description">
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>
                </div>
              </div>

              <!-- Policies Table -->
              <div class="table-container" *ngIf="!isLoadingPolicies">
                <table mat-table [dataSource]="filteredPolicies" class="policies-table">
                  
                  <!-- Selection Column -->
                  <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                      <mat-checkbox (change)="$event ? masterTogglePolicies() : null"
                                    [checked]="policiesSelection.hasValue() && isAllPoliciesSelected()"
                                    [indeterminate]="policiesSelection.hasValue() && !isAllPoliciesSelected()">
                      </mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let policy">
                      <mat-checkbox (click)="$event.stopPropagation()"
                                    (change)="$event ? policiesSelection.toggle(policy) : null"
                                    [checked]="policiesSelection.isSelected(policy)">
                      </mat-checkbox>
                    </td>
                  </ng-container>

                  <!-- Name Column -->
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Policy Name</th>
                    <td mat-cell *matCellDef="let policy">
                      <div class="policy-name">
                        <span class="name-text">{{ policy.name }}</span>
                        <mat-chip [class]="'type-chip ' + policy.type.toLowerCase()">{{ policy.type }}</mat-chip>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Rules Count Column -->
                  <ng-container matColumnDef="firewallRules">
                    <th mat-header-cell *matHeaderCellDef>Firewall Rules</th>
                    <td mat-cell *matCellDef="let policy">
                      <mat-chip class="rules-count-chip">{{ policy.firewallRules }} rules</mat-chip>
                    </td>
                  </ng-container>

                  <!-- Description Column -->
                  <ng-container matColumnDef="description">
                    <th mat-header-cell *matHeaderCellDef>Description</th>
                    <td mat-cell *matCellDef="let policy">
                      <span class="description-text">{{ policy.description || '—' }}</span>
                    </td>
                  </ng-container>

                  <!-- Deployment Scope Column -->
                  <ng-container matColumnDef="deploymentScope">
                    <th mat-header-cell *matHeaderCellDef>Deployment Scope</th>
                    <td mat-cell *matCellDef="let policy">
                      <mat-chip class="scope-chip">{{ policy.deploymentScope }}</mat-chip>
                    </td>
                  </ng-container>

                  <!-- Associated With Column -->
                  <ng-container matColumnDef="associatedWith">
                    <th mat-header-cell *matHeaderCellDef>Associated With</th>
                    <td mat-cell *matCellDef="let policy">
                      <div class="associated-items">
                        <mat-chip *ngFor="let item of policy.associatedWith.slice(0, 2)" class="association-chip">
                          {{ item }}
                        </mat-chip>
                        <span *ngIf="policy.associatedWith.length > 2" class="more-items">
                          +{{ policy.associatedWith.length - 2 }} more
                        </span>
                        <span *ngIf="policy.associatedWith.length === 0" class="no-associations">
                          Not associated
                        </span>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Actions Column -->
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let policy">
                      <button mat-icon-button [matMenuTriggerFor]="policyMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #policyMenu="matMenu">
                        <button mat-menu-item (click)="editPolicy(policy)">
                          <mat-icon>edit</mat-icon>
                          <span>Edit</span>
                        </button>
                        <button mat-menu-item (click)="viewPolicyRules(policy)">
                          <mat-icon>rule</mat-icon>
                          <span>View Rules</span>
                        </button>
                        <button mat-menu-item (click)="clonePolicy(policy)">
                          <mat-icon>content_copy</mat-icon>
                          <span>Clone</span>
                        </button>
                        <mat-divider></mat-divider>
                        <button mat-menu-item (click)="deletePolicy(policy)" class="delete-action">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="policiesDisplayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: policiesDisplayedColumns;"></tr>
                </table>

                <div *ngIf="filteredPolicies.length === 0" class="no-data">
                  <mat-icon>policy</mat-icon>
                  <div class="no-data-content">
                    <p *ngIf="!isLoadingPolicies" class="no-data-title">No firewall policies found</p>
                    <div class="no-data-explanation">
                      <p>Firewall policies are an advanced feature for managing firewall rules at scale.</p>
                      <p>You may not have any policies if:</p>
                      <ul>
                        <li>Your project doesn't use network firewall policies</li>
                        <li>Your organization doesn't have hierarchical firewall policies</li>
                        <li>You don't have permissions to view firewall policies</li>
                      </ul>
                      <p><strong>Note:</strong> Firewall rules and policies are different. Most projects use firewall rules directly.</p>
                    </div>
                    <div class="policy-actions">
                      <button mat-raised-button color="primary" (click)="createFirewallPolicy()">
                        <mat-icon>add</mat-icon>
                        Create Network Firewall Policy
                      </button>
                      <button mat-stroked-button (click)="selectedTabIndex = 0">
                        <mat-icon>rule</mat-icon>
                        View Firewall Rules Instead
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="isLoadingPolicies" class="loading-container">
                <mat-spinner diameter="50"></mat-spinner>
                <p>Loading firewall policies...</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .firewall-management-container {
      padding: 24px;
      max-width: 100%;
      background-color: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      background: var(--surface-color);
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--text-color);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      color: var(--primary-color);
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .header-description {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .stat-card mat-card-content {
      padding: 20px !important;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      background: var(--hover-color);
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      color: var(--primary-color);
      font-size: 24px;
    }

    .stat-number {
      font-size: 24px;
      font-weight: 500;
      color: var(--text-color);
      line-height: 1;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-secondary-color);
      margin-top: 4px;
    }

    .main-content {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .tab-content {
      padding: 24px;
    }

    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .actions-left {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .actions-right {
      display: flex;
      gap: 12px;
    }

    .search-field {
      width: 300px;
    }

    .table-container {
      border-radius: 8px;
      overflow: auto;
      max-height: 600px;
    }

    .rules-table, .policies-table {
      width: 100%;
      background: var(--surface-color);
    }

    .rule-name, .policy-name {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .name-text {
      font-weight: 500;
      color: var(--primary-color);
      cursor: pointer;
    }

    .name-text:hover {
      text-decoration: underline;
    }

    .type-chip {
      font-size: 12px;
      height: 24px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .type-chip.ingress {
      background-color: rgba(52, 168, 83, 0.12);
      color: #34a853;
    }

    .type-chip.egress {
      background-color: rgba(251, 188, 5, 0.12);
      color: #fbbc05;
    }

    .type-chip.global {
      background-color: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
    }

    .type-chip.regional {
      background-color: rgba(156, 39, 176, 0.12);
      color: #9c27b0;
    }

    .protocol-chip {
      background-color: var(--hover-color);
      color: var(--text-secondary-color);
      font-size: 12px;
      height: 24px;
      border: 1px solid var(--border-color);
    }

    .action-chip {
      font-size: 12px;
      height: 24px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-chip.allow {
      background-color: rgba(52, 168, 83, 0.12);
      color: #34a853;
    }

    .action-chip.deny {
      background-color: rgba(234, 67, 53, 0.12);
      color: #ea4335;
    }

    .status-chip.disabled {
      background-color: var(--hover-color);
      color: var(--text-secondary-color);
      font-size: 11px;
      height: 20px;
      border: 1px solid var(--border-color);
    }

    .count-chip {
      background-color: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
      font-size: 11px;
      height: 20px;
      margin-left: 8px;
    }

    .rules-count-chip {
      background-color: var(--hover-color);
      color: var(--text-secondary-color);
      font-size: 12px;
      height: 24px;
      border: 1px solid var(--border-color);
    }

    .scope-chip {
      background-color: rgba(103, 58, 183, 0.12);
      color: #673ab7;
      font-size: 12px;
      height: 24px;
    }

    .association-chip {
      background-color: var(--hover-color);
      color: var(--text-secondary-color);
      font-size: 11px;
      height: 20px;
      margin: 2px;
      border: 1px solid var(--border-color);
    }

    .associated-items {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .more-items {
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    .no-associations {
      font-size: 12px;
      color: var(--text-secondary-color);
      font-style: italic;
    }

    .priority-text {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    .targets-text {
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    .description-text {
      font-size: 13px;
      color: var(--text-secondary-color);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .network-link {
      color: var(--primary-color);
      cursor: pointer;
      text-decoration: none;
      font-size: 13px;
    }

    .network-link:hover {
      text-decoration: underline;
    }

    .delete-action {
      color: #ea4335;
    }

    .no-data {
      text-align: center;
      padding: 48px;
      color: var(--text-secondary-color);
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--text-secondary-color);
      opacity: 0.5;
    }

    .no-data-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .no-data-title {
      font-size: 18px;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: var(--text-color);
    }

    .no-data-explanation {
      text-align: left;
      background: var(--hover-color);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0 24px 0;
      border-left: 4px solid var(--primary-color);
      border: 1px solid var(--border-color);
    }

    .no-data-explanation p {
      margin: 0 0 12px 0;
      line-height: 1.5;
      color: var(--text-color);
    }

    .no-data-explanation ul {
      margin: 8px 0 12px 16px;
      line-height: 1.5;
      color: var(--text-color);
    }

    .no-data-explanation li {
      margin-bottom: 4px;
    }

    .policy-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .no-data p {
      margin: 0 0 24px 0;
      font-size: 16px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      gap: 16px;
    }

    .loading-container p {
      margin: 0;
      color: var(--text-secondary-color);
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .stat-card, .main-content, .header {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-form-field {
        color: var(--text-color) !important;
      }

      .mat-mdc-form-field .mat-mdc-form-field-input-control {
        color: var(--text-color) !important;
      }

      .mat-mdc-menu-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-menu-item {
        color: var(--text-color) !important;
      }

      .mat-tab-group {
        background: transparent;
      }

      .mat-tab-header {
        border-bottom: 1px solid var(--divider-color);
        background: var(--surface-color);
      }

      .mat-tab-label {
        height: 64px;
        padding: 0 24px;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 1;
        color: var(--text-secondary-color);
      }

      .mat-tab-label-active {
        color: var(--primary-color);
      }

      .mat-tab-label mat-icon {
        margin-right: 4px;
      }

      .mat-ink-bar {
        background-color: var(--primary-color) !important;
      }

      .mat-table {
        background: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-header-row {
        background-color: var(--surface-color) !important;
      }

      .mat-header-cell {
        color: var(--text-secondary-color) !important;
        border-bottom-color: var(--divider-color) !important;
      }

      .mat-row {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--divider-color) !important;
      }

      .mat-row:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-tab-group {
      background: transparent;
    }

    ::ng-deep .mat-tab-header {
      border-bottom: 1px solid var(--divider-color);
      background: var(--surface-color);
    }

    ::ng-deep .mat-tab-label {
      height: 64px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 1;
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-tab-label-active {
      color: var(--primary-color);
    }

    ::ng-deep .mat-tab-label mat-icon {
      margin-right: 4px;
    }

    @media (max-width: 768px) {
      .firewall-management-container {
        padding: 16px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .actions-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-field {
        width: 100%;
      }
    }
  `]
})
export class FirewallManagementComponent implements OnInit {
  // Data
  firewallRules: FirewallRule[] = [];
  firewallPolicies: FirewallPolicy[] = [];
  filteredRules: FirewallRule[] = [];
  filteredPolicies: FirewallPolicy[] = [];

  // UI State
  selectedTabIndex = 0;
  rulesFilterControl = new FormControl('');
  policiesFilterControl = new FormControl('');
  isLoadingRules = true;
  isLoadingPolicies = true;
  projectId: string | null = null;

  // Table Configuration
  rulesDisplayedColumns: string[] = [
    'select', 'name', 'type', 'targets', 'protocolsPorts', 'action', 'priority', 'network', 'actions'
  ];
  policiesDisplayedColumns: string[] = [
    'select', 'name', 'firewallRules', 'description', 'deploymentScope', 'associatedWith', 'actions'
  ];

  // Selection
  rulesSelection = new SelectionModel<FirewallRule>(true, []);
  policiesSelection = new SelectionModel<FirewallPolicy>(true, []);

  constructor(
    private firewallService: FirewallService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private googleAnalyticsService: GoogleAnalyticsService
  ) {}

  ngOnInit() {
    // Track page view
    this.googleAnalyticsService.trackPageView('/firewall', 'Firewall Management');
    
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadData();
    });

    // Fallback for development
    setTimeout(() => {
      if (this.isLoadingRules || this.isLoadingPolicies) {
        this.loadData();
      }
    }, 1000);
  }

  loadData() {
    this.loadFirewallRules();
    this.loadFirewallPolicies();
  }

  loadFirewallRules() {
    this.isLoadingRules = true;
    console.log('Loading firewall rules for project:', this.projectId);
    
    if (!this.projectId) {
      console.warn('No project ID available, cannot load firewall rules');
      this.isLoadingRules = false;
      return;
    }

    this.firewallService.getFirewallRules(this.projectId).subscribe({
      next: (rules) => {
        console.log('Successfully loaded firewall rules:', rules);
        this.firewallRules = rules;
        this.applyRulesFilter();
        this.isLoadingRules = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading firewall rules:', error);
        this.isLoadingRules = false;
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to load firewall rules';
        if (error.status === 403) {
          errorMessage = 'Access denied. Please check your permissions for the Compute Engine API.';
        } else if (error.status === 404) {
          errorMessage = 'Project not found or Compute Engine API not enabled.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        }
        
        // You could show a snackbar or other notification here
        console.error('User-friendly error:', errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  loadFirewallPolicies() {
    this.isLoadingPolicies = true;
    console.log('Loading firewall policies for project:', this.projectId);
    
    if (!this.projectId) {
      console.warn('No project ID available, cannot load firewall policies');
      this.isLoadingPolicies = false;
      return;
    }

    // Load both network-level and organization-level firewall policies
    const networkPolicies$ = this.firewallService.getFirewallPolicies(this.projectId);
    const hierarchicalPolicies$ = this.firewallService.getHierarchicalFirewallPolicies(this.projectId);

    // Combine both types of policies
    networkPolicies$.pipe(
      switchMap(networkPolicies => {
        return hierarchicalPolicies$.pipe(
          map(hierarchicalPolicies => {
            console.log('Network policies:', networkPolicies);
            console.log('Hierarchical policies:', hierarchicalPolicies);
            return [...networkPolicies, ...hierarchicalPolicies];
          })
        );
      })
    ).subscribe({
      next: (allPolicies) => {
        console.log('Successfully loaded all firewall policies:', allPolicies);
        this.firewallPolicies = allPolicies;
        this.applyPoliciesFilter();
        this.isLoadingPolicies = false;
        
        // Provide user feedback about policy types found
        if (allPolicies.length === 0) {
          console.log('No firewall policies found. This is normal for projects not using network firewall policies.');
        } else {
          const networkCount = allPolicies.filter(p => p.deploymentScope === 'Global' || p.deploymentScope?.includes('Regional')).length;
          const orgCount = allPolicies.filter(p => p.deploymentScope?.includes('Organization')).length;
          console.log(`Found ${networkCount} network policies and ${orgCount} organization policies`);
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading firewall policies:', error);
        this.isLoadingPolicies = false;
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to load firewall policies';
        if (error.status === 403) {
          errorMessage = 'Access denied. Firewall policies require specific permissions.';
        } else if (error.status === 404) {
          errorMessage = 'Firewall policies not available in this project.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        }
        
        console.error('User-friendly error:', errorMessage);
        
        // Set empty array so UI shows "no policies" state
        this.firewallPolicies = [];
        this.applyPoliciesFilter();
        this.cdr.detectChanges();
      }
    });
  }

  // Filtering
  applyRulesFilter() {
    let filtered = [...this.firewallRules];
    if (this.rulesFilterControl.value) {
      const searchTerm = this.rulesFilterControl.value.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm) ||
        (rule.targets || '').toLowerCase().includes(searchTerm) ||
        (rule.protocolsPorts || '').toLowerCase().includes(searchTerm) ||
        rule.network.toLowerCase().includes(searchTerm)
      );
    }
    this.filteredRules = filtered;
    this.rulesSelection.clear();
  }

  applyPoliciesFilter() {
    let filtered = [...this.firewallPolicies];
    if (this.policiesFilterControl.value) {
      const searchTerm = this.policiesFilterControl.value.toLowerCase();
      filtered = filtered.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm) ||
        (policy.description?.toLowerCase().includes(searchTerm)) ||
        (policy.deploymentScope || '').toLowerCase().includes(searchTerm)
      );
    }
    this.filteredPolicies = filtered;
    this.policiesSelection.clear();
  }

  // Tab Management
  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  // Stats
  getActiveRulesCount(): number {
    return this.firewallRules.filter(rule => !rule.disabled).length;
  }

  getDenyRulesCount(): number {
    return this.firewallRules.filter(rule => rule.action === 'Deny').length;
  }

  // Actions
  refresh() {
    this.loadData();
  }

  createFirewallRule() {
    // Track firewall rule creation initiation
    this.googleAnalyticsService.trackEvent({
      action: 'firewall_rule_creation_initiated',
      category: 'security',
      label: 'create_firewall_rule',
      custom_parameters: {
        project_id: this.projectId
      }
    });
    
    const dialogRef = this.dialog.open(CreateFirewallRuleDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Creating firewall rule with dialog data:', result);
        
        // Transform dialog result to API format
        const firewallRule = this.transformDialogDataToFirewallRule(result);
        console.log('Transformed firewall rule for API:', firewallRule);
        
        if (!this.projectId) {
          console.error('No project ID available');
          return;
        }

        this.firewallService.createFirewallRule(this.projectId, firewallRule).subscribe({
          next: (newRule) => {
            console.log('Rule created successfully:', newRule);
            this.loadFirewallRules(); // Reload the rules list
          },
          error: (error) => {
            console.error('Error creating rule:', error);
            // Handle error appropriately - could show snackbar notification
            let errorMessage = 'Failed to create firewall rule';
            if (error.status === 403) {
              errorMessage = 'Access denied. Please check your permissions.';
            } else if (error.status === 409) {
              errorMessage = 'A firewall rule with this name already exists.';
            } else if (error.status === 400) {
              errorMessage = 'Invalid firewall rule configuration.';
            }
            console.error('User-friendly error:', errorMessage);
          }
        });
      }
    });
  }

  private transformDialogDataToFirewallRule(dialogData: any): Partial<FirewallRule> {
    const rule: Partial<FirewallRule> = {
      name: dialogData.name,
      description: dialogData.description,
      network: dialogData.network,
      direction: dialogData.direction,
      priority: dialogData.priority,
      logs: dialogData.logs,
      disabled: dialogData.disabled
    };

    // Handle target tags
    if (dialogData.targetTags && dialogData.targetTags.length > 0) {
      rule.targetTags = dialogData.targetTags;
    }

    // Handle source ranges
    if (dialogData.sourceRanges && dialogData.sourceRanges.length > 0) {
      rule.sourceRanges = dialogData.sourceRanges;
    }

    // Handle protocols - this needs to be converted to GCP API format
    if (dialogData.protocols) {
      rule.allowed = [];
      
      if (dialogData.protocols.tcp?.enabled) {
        const tcpRule: any = { IPProtocol: 'tcp' };
        if (dialogData.protocols.tcp.ports) {
          tcpRule.ports = dialogData.protocols.tcp.ports.split(',').map((p: string) => p.trim());
        }
        rule.allowed.push(tcpRule);
      }

      if (dialogData.protocols.udp?.enabled) {
        const udpRule: any = { IPProtocol: 'udp' };
        if (dialogData.protocols.udp.ports) {
          udpRule.ports = dialogData.protocols.udp.ports.split(',').map((p: string) => p.trim());
        }
        rule.allowed.push(udpRule);
      }

      if (dialogData.protocols.icmp?.enabled) {
        rule.allowed.push({ IPProtocol: 'icmp' });
      }

      // If protocolType is 'all', allow all protocols
      if (dialogData.protocolType === 'all') {
        rule.allowed = [{ IPProtocol: 'all' }];
      }
    }

    // Set action based on dialog data
    rule.action = dialogData.action || 'Allow';

    return rule;
  }

  createFirewallPolicy() {
    console.log('Create firewall policy');
    // TODO: Implement create policy dialog
  }

  configureLogs() {
    console.log('Configure logs');
    // TODO: Implement configure logs dialog
  }

  // Rules Selection
  isAllRulesSelected() {
    const numSelected = this.rulesSelection.selected.length;
    const numRows = this.filteredRules.length;
    return numSelected === numRows;
  }

  masterToggleRules() {
    this.isAllRulesSelected() ?
      this.rulesSelection.clear() :
      this.filteredRules.forEach(row => this.rulesSelection.select(row));
  }

  // Policies Selection
  isAllPoliciesSelected() {
    const numSelected = this.policiesSelection.selected.length;
    const numRows = this.filteredPolicies.length;
    return numSelected === numRows;
  }

  masterTogglePolicies() {
    this.isAllPoliciesSelected() ?
      this.policiesSelection.clear() :
      this.filteredPolicies.forEach(row => this.policiesSelection.select(row));
  }

  // Rule Actions
  editRule(rule: FirewallRule) {
    console.log('Edit rule:', rule);
  }

  cloneRule(rule: FirewallRule) {
    console.log('Clone rule:', rule);
  }

  toggleRuleStatus(rule: FirewallRule) {
    rule.disabled = !rule.disabled;
    console.log('Toggle rule status:', rule);
  }

  deleteRule(rule: FirewallRule) {
    if (confirm(`Are you sure you want to delete the firewall rule "${rule.name}"?`)) {
      console.log('Delete rule:', rule);
    }
  }

  deleteSelectedRules() {
    const selectedRules = this.rulesSelection.selected;
    if (selectedRules.length === 0) return;
    
    const confirmMessage = selectedRules.length === 1 
      ? `Are you sure you want to delete the firewall rule "${selectedRules[0].name}"?`
      : `Are you sure you want to delete ${selectedRules.length} firewall rules?`;

    if (confirm(confirmMessage)) {
      console.log('Delete selected rules:', selectedRules);
    }
  }

  // Policy Actions
  editPolicy(policy: FirewallPolicy) {
    console.log('Edit policy:', policy);
  }

  viewPolicyRules(policy: FirewallPolicy) {
    console.log('View policy rules:', policy);
  }

  clonePolicy(policy: FirewallPolicy) {
    console.log('Clone policy:', policy);
  }

  deletePolicy(policy: FirewallPolicy) {
    if (confirm(`Are you sure you want to delete the firewall policy "${policy.name}"?`)) {
      console.log('Delete policy:', policy);
    }
  }

  deleteSelectedPolicies() {
    const selectedPolicies = this.policiesSelection.selected;
    if (selectedPolicies.length === 0) return;
    
    const confirmMessage = selectedPolicies.length === 1 
      ? `Are you sure you want to delete the firewall policy "${selectedPolicies[0].name}"?`
      : `Are you sure you want to delete ${selectedPolicies.length} firewall policies?`;

    if (confirm(confirmMessage)) {
      console.log('Delete selected policies:', selectedPolicies);
    }
  }
} 