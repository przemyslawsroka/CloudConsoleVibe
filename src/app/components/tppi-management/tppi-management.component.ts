import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService, Project } from '../../services/project.service';

interface TPPIResource {
  id: string;
  name: string;
  type: string;
  status: string;
  scope: string;
  description?: string;
  dependencies?: string[];
}

@Component({
  selector: 'app-tppi-management',
  template: `
    <div class="tppi-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Third Party Packet Intercept (TPPI)</h1>
          <h2 class="page-subtitle">Network Traffic Security Inspection Service</h2>
          <p class="page-description">
            Configure and manage third-party packet interception for network security and monitoring. 
            TPPI enables organizations to redirect network traffic to external security appliances for 
            deep packet inspection, threat detection, and compliance monitoring without disrupting 
            existing network infrastructure.
          </p>

        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openSetupWizard()">
            <mat-icon>add</mat-icon>
            Setup TPPI
          </button>
        </div>
      </div>

      <!-- Architecture Overview - Compact -->
      <mat-card class="architecture-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>architecture</mat-icon>
            TPPI Architecture Overview
          </mat-card-title>
          <button mat-icon-button (click)="toggleArchitectureView()" 
                  [attr.aria-label]="showDetailedArchitecture ? 'Collapse' : 'Expand'">
            <mat-icon>{{ showDetailedArchitecture ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <!-- Compact Flow Diagram -->
          <div class="flow-diagram">
            <!-- Single Line Flow -->
            <div class="single-line-flow">
              <!-- Producer Steps -->
              <div class="flow-section producer-section">
                <div class="section-label">
                  <mat-icon class="section-icon producer-icon">security</mat-icon>
                  <div class="label-content">
                    <span class="label-title">Security Service Provider</span>
                    <span class="label-subtitle">(Producer)</span>
                    <span class="label-description">Offers security inspection services through transparent packet intercept</span>
                  </div>
                </div>
                <div class="flow-step producer-step" 
                     matTooltip="Creates a logical container that organizes all security service deployments for a specific offering"
                     matTooltipPosition="above">
                  <div class="step-number">1</div>
                  <span>Deployment Group</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step producer-step"
                     matTooltip="Deploys actual security appliances (VMs, containers) with Internal Load Balancer frontends in specific zones"
                     matTooltipPosition="above">
                  <div class="step-number">2</div>
                  <span>Deployment</span>
                </div>
              </div>

              <!-- Connection -->
              <div class="connection-divider">
                <div class="intercept-flow">
                  <mat-icon class="intercept-icon">swap_horiz</mat-icon>
                  <div class="intercept-label">
                    <span class="intercept-title">Packet Intercept</span>
                    <span class="intercept-description">Traffic Redirection</span>
                  </div>
                </div>
              </div>

              <!-- Consumer Steps -->
              <div class="flow-section consumer-section">
                <div class="section-label">
                  <mat-icon class="section-icon consumer-icon">traffic</mat-icon>
                  <div class="label-content">
                    <span class="label-title">Traffic Owner</span>
                    <span class="label-subtitle">(Consumer)</span>
                    <span class="label-description">Needs traffic inspection services via network traffic redirection</span>
                  </div>
                </div>
                <div class="flow-step consumer-step"
                     matTooltip="References and connects to the security service provider's deployment group"
                     matTooltipPosition="above">
                  <div class="step-number">3</div>
                  <span>Endpoint Group</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step consumer-step"
                     matTooltip="Associates specific VPC networks with the endpoint group to enable traffic interception"
                     matTooltipPosition="above">
                  <div class="step-number">4</div>
                  <span>VPC Association</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step consumer-step"
                     matTooltip="Defines security policies and rules that are applied via firewall configurations"
                     matTooltipPosition="above">
                  <div class="step-number">5</div>
                  <span>Security Profiles</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Detailed view (expandable) -->
          <div *ngIf="showDetailedArchitecture" class="detailed-architecture">
            <div class="workflow-section producer-workflow">
              <h4><mat-icon>business</mat-icon> Security Service Provider Workflow</h4>
              <p class="workflow-description">Organizations that provide security services (firewalls, IDS, DLP, etc.)</p>
              <div class="workflow-details">
                <div class="detail-step">
                  <strong>1. Deployment Group:</strong> Creates a logical container that organizes all security service deployments for a specific offering
                </div>
                <div class="detail-step">
                  <strong>2. Deployment:</strong> Deploys actual security appliances (VMs, containers) with Internal Load Balancer frontends in specific zones
                </div>
              </div>
            </div>
            
            <div class="workflow-section consumer-workflow">
              <h4><mat-icon>person</mat-icon> Traffic Owner Workflow</h4>
              <p class="workflow-description">Organizations that want their network traffic inspected by third-party security services</p>
              <div class="workflow-details">
                <div class="detail-step">
                  <strong>3. Endpoint Group:</strong> References and connects to the security service provider's deployment group
                </div>
                <div class="detail-step">
                  <strong>4. VPC Association:</strong> Associates specific VPC networks with the endpoint group to enable traffic interception
                </div>
                <div class="detail-step">
                  <strong>5. Security Profiles:</strong> Defines security policies and rules that are applied via firewall configurations
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Current Resources -->
      <div class="resources-section">
        <div class="section-header">
          <h2>Current TPPI Resources</h2>
          <div class="view-controls">
            <mat-button-toggle-group [(value)]="viewMode" class="layout-toggle">
              <mat-button-toggle value="table">
                <mat-icon>table_view</mat-icon>
                Table
              </mat-button-toggle>
              <mat-button-toggle value="cards">
                <mat-icon>view_module</mat-icon>
                Cards
              </mat-button-toggle>
            </mat-button-toggle-group>
            <mat-button-toggle-group [(value)]="currentView" class="filter-toggle">
              <mat-button-toggle value="producer">Service Provider</mat-button-toggle>
              <mat-button-toggle value="consumer">Traffic Owner</mat-button-toggle>
              <mat-button-toggle value="all">All Resources</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        </div>

        <!-- Table View -->
        <div *ngIf="viewMode === 'table'" class="table-view">
          <mat-card class="resources-table-card">
            <mat-card-content>
              <table mat-table [dataSource]="getFilteredResources()" class="resources-table">
                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let resource">
                    <div class="resource-name">
                      <mat-icon [class]="getResourceTypeIcon(resource.type)">{{ getResourceIcon(resource.type) }}</mat-icon>
                      <span>{{ resource.name }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Type Column -->
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let resource">{{ resource.type }}</td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let resource">
                    <mat-chip [ngClass]="'status-' + resource.status.toLowerCase()">
                      {{ resource.status }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Scope Column -->
                <ng-container matColumnDef="scope">
                  <th mat-header-cell *matHeaderCellDef>Scope</th>
                  <td mat-cell *matCellDef="let resource">{{ resource.scope }}</td>
                </ng-container>

                <!-- Description Column -->
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let resource" class="description-cell">
                    {{ resource.description || 'No description' }}
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let resource">
                    <button mat-icon-button (click)="viewResource(resource)" matTooltip="View details">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="editResource(resource)" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                    [class.selected]="false"></tr>
              </table>

              <!-- Empty state for table -->
              <div *ngIf="getFilteredResources().length === 0" class="empty-table-state">
                <mat-icon>inbox</mat-icon>
                <h3>No TPPI resources found</h3>
                <p>Get started by creating your first resource</p>
                <button mat-raised-button color="primary" (click)="openSetupWizard()">
                  <mat-icon>add</mat-icon>
                  Setup TPPI
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Card View -->
        <div *ngIf="viewMode === 'cards'">
          <!-- Producer Resources -->
          <div *ngIf="currentView === 'producer' || currentView === 'all'">
            <mat-card class="resource-category-card producer-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="producer-icon">business</mat-icon>
                  Security Service Provider Resources
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div *ngIf="getProducerResources().length === 0" class="empty-state">
                  <mat-icon>business</mat-icon>
                  <p>No producer resources configured</p>
                  <button mat-raised-button color="primary" (click)="openSetupWizard('producer')">
                    Create Producer Resources
                  </button>
                </div>
                <div *ngIf="getProducerResources().length > 0" class="resources-grid">
                  <mat-card *ngFor="let resource of getProducerResources()" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <div class="resource-name">
                          <mat-icon [class]="getResourceTypeIcon(resource.type)">{{ getResourceIcon(resource.type) }}</mat-icon>
                          <h4>{{ resource.name }}</h4>
                        </div>
                        <mat-chip [ngClass]="'status-' + resource.status.toLowerCase()">{{ resource.status }}</mat-chip>
                      </div>
                      <p class="resource-description">{{ resource.description || 'No description' }}</p>
                      <div class="resource-details">
                        <span><strong>Type:</strong> {{ resource.type }}</span>
                        <span><strong>Scope:</strong> {{ resource.scope }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(resource)">View</button>
                      <button mat-button (click)="editResource(resource)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Consumer Resources -->
          <div *ngIf="currentView === 'consumer' || currentView === 'all'">
            <mat-card class="resource-category-card consumer-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon class="consumer-icon">person</mat-icon>
                  Traffic Owner Resources
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div *ngIf="getConsumerResources().length === 0" class="empty-state">
                  <mat-icon>person</mat-icon>
                  <p>No consumer resources configured</p>
                  <button mat-raised-button color="primary" (click)="openSetupWizard('consumer')">
                    Create Consumer Resources
                  </button>
                </div>
                <div *ngIf="getConsumerResources().length > 0" class="resources-grid">
                  <mat-card *ngFor="let resource of getConsumerResources()" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <div class="resource-name">
                          <mat-icon [class]="getResourceTypeIcon(resource.type)">{{ getResourceIcon(resource.type) }}</mat-icon>
                          <h4>{{ resource.name }}</h4>
                        </div>
                        <mat-chip [ngClass]="'status-' + resource.status.toLowerCase()">{{ resource.status }}</mat-chip>
                      </div>
                      <p class="resource-description">{{ resource.description || 'No description' }}</p>
                      <div class="resource-details">
                        <span><strong>Type:</strong> {{ resource.type }}</span>
                        <span><strong>Scope:</strong> {{ resource.scope }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(resource)">View</button>
                      <button mat-button (click)="editResource(resource)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <mat-card class="quick-actions-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>flash_on</mat-icon>
            Quick Actions
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="actions-grid">
            <button mat-raised-button class="action-button producer" (click)="openSetupWizard('producer')">
              <mat-icon>business</mat-icon>
              <div class="action-content">
                <h4>Set up as Security Service Provider</h4>
                <p>Offer security inspection services (firewall, IDS, DLP) to other organizations</p>
              </div>
            </button>
            <button mat-raised-button class="action-button consumer" (click)="openSetupWizard('consumer')">
              <mat-icon>person</mat-icon>
              <div class="action-content">
                <h4>Set up as Traffic Owner</h4>
                <p>Route your network traffic through third-party security services for inspection</p>
              </div>
            </button>
            <button mat-raised-button class="action-button" (click)="viewDocumentation()">
              <mat-icon>help</mat-icon>
              <div class="action-content">
                <h4>Documentation</h4>
                <p>Learn more about TPPI configuration</p>
              </div>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .tppi-container {
      padding: 0;
      background: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .page-header {
      background: white;
      color: var(--text-color);
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      flex: 1;
      max-width: 900px;
    }

    .header-content h1 {
      font-size: 2.5rem;
      font-weight: 400;
      margin: 0 0 4px 0;
      color: #1a73e8;
    }

    .page-subtitle {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: var(--text-secondary-color);
    }

    .page-description {
      font-size: 1rem;
      line-height: 1.6;
      margin: 0 0 20px 0;
      color: var(--text-secondary-color);
      max-width: 800px;
    }



    .header-actions {
      margin-top: 8px;
    }

    .header-actions button {
      background: #1a73e8;
      color: white;
      border: none;
    }

    .architecture-card {
      margin: 24px 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .architecture-card mat-card-header {
      padding-bottom: 8px;
    }

    .flow-diagram {
      margin: 16px 0;
    }

    .single-line-flow {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 16px;
      background: var(--hover-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      flex-wrap: wrap;
    }

    .flow-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 16px;
      text-align: center;
      min-width: 120px;
    }

    .section-label mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      margin-bottom: 8px;
    }

    .label-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .label-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.1;
    }

    .label-subtitle {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.8;
      line-height: 1;
    }

    .label-description {
      font-size: 10px;
      font-weight: 400;
      opacity: 0.7;
      line-height: 1.2;
      margin-top: 2px;
    }

    .producer-section .section-label {
      color: #1a73e8;
    }

    .consumer-section .section-label {
      color: #34a853;
    }

    .connection-divider {
      display: flex;
      align-items: center;
      margin: 0 8px;
    }

    .connection-divider mat-icon {
      font-size: 24px;
      color: #1a73e8;
    }

    .flow-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 16px;
      border-radius: 6px;
      min-width: 90px;
      font-size: 11px;
      text-align: center;
      transition: all 0.2s ease;
      cursor: help;
      position: relative;
    }

    .flow-step:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .flow-step.producer-step {
      background: rgba(26, 115, 232, 0.1);
      border: 1px solid rgba(26, 115, 232, 0.3);
    }

    .flow-step.producer-step:hover {
      background: rgba(26, 115, 232, 0.15);
    }

    .flow-step.consumer-step {
      background: rgba(52, 168, 83, 0.1);
      border: 1px solid rgba(52, 168, 83, 0.3);
    }

    .flow-step.consumer-step:hover {
      background: rgba(52, 168, 83, 0.15);
    }

    .flow-step .step-number {
      background: #1a73e8;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 6px;
      box-shadow: 0 2px 4px rgba(26, 115, 232, 0.3);
    }

    .flow-step span {
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.2;
    }

    .flow-arrow {
      color: #1a73e8;
      font-size: 18px;
      margin: 0 4px;
      opacity: 0.7;
    }

    .section-icon {
      font-size: 20px !important;
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    .producer-icon {
      color: #1a73e8;
    }

    .consumer-icon {
      color: #34a853;
    }

    .intercept-flow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .intercept-icon {
      color: #ea4335;
      font-size: 24px !important;
      width: 24px;
      height: 24px;
    }

    .intercept-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .intercept-title {
      font-weight: 600;
      font-size: 11px;
      color: #ea4335;
      line-height: 1;
    }

    .intercept-description {
      font-size: 10px;
      color: var(--text-secondary-color);
      line-height: 1;
    }

    .detailed-architecture {
      margin-top: 16px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    .workflow-section {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }

    .workflow-section.producer-workflow {
      background: rgba(26, 115, 232, 0.04);
      border-color: rgba(26, 115, 232, 0.2);
    }

    .workflow-section.consumer-workflow {
      background: rgba(52, 168, 83, 0.04);
      border-color: rgba(52, 168, 83, 0.2);
    }

    .workflow-section h4 {
      margin: 0 0 8px 0;
      color: #1a73e8;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .workflow-description {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: var(--text-secondary-color);
      font-style: italic;
    }

    .workflow-details {
      margin-left: 28px;
    }

    .detail-step {
      margin-bottom: 4px;
      font-size: 13px;
      color: var(--text-secondary-color);
    }



    .resources-section {
      margin: 0 40px 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      margin: 0;
      color: var(--text-color);
      font-size: 1.4rem;
    }

    .view-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .layout-toggle,
    .filter-toggle {
      background: var(--surface-color);
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }

    .layout-toggle .mat-button-toggle {
      border: none;
    }

    .filter-toggle .mat-button-toggle {
      border: none;
    }

    /* Table View Styles */
    .table-view {
      margin-bottom: 24px;
    }

    .resources-table-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .resources-table {
      width: 100%;
      background: var(--surface-color);
    }

    .resources-table th {
      background: var(--hover-color);
      color: var(--text-color);
      font-weight: 600;
      border-bottom: 2px solid #1a73e8;
    }

    .resources-table td {
      border-bottom: 1px solid var(--border-color);
    }

    .resource-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .description-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-table-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary-color);
    }

    .empty-table-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-table-state h3 {
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    /* Status chips in table */
    .status-active {
      background: rgba(52, 168, 83, 0.1);
      color: #34a853;
      border: 1px solid rgba(52, 168, 83, 0.3);
    }

    .status-inactive {
      background: rgba(158, 158, 158, 0.1);
      color: #9e9e9e;
      border: 1px solid rgba(158, 158, 158, 0.3);
    }

    .status-pending {
      background: rgba(251, 188, 5, 0.1);
      color: #fbbc05;
      border: 1px solid rgba(251, 188, 5, 0.3);
    }

    .status-error {
      background: rgba(234, 67, 53, 0.1);
      color: #ea4335;
      border: 1px solid rgba(234, 67, 53, 0.3);
    }

    /* Card View Styles */
    .resource-category-card {
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .resource-category-card.producer-card {
      border-left: 4px solid #1a73e8;
    }

    .resource-category-card.consumer-card {
      border-left: 4px solid #34a853;
    }

    .producer-icon {
      color: #1a73e8;
    }

    .consumer-icon {
      color: #34a853;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary-color);
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
      color: var(--text-secondary-color);
    }

    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .resource-card {
      border-radius: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .resource-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .resource-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .resource-header .resource-name {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .resource-header h4 {
      margin: 0;
      color: var(--text-color);
      font-size: 16px;
    }

    .resource-description {
      margin: 8px 0;
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .resource-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 12px;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    /* Resource type icons */
    .deployment-group-icon {
      color: #1a73e8;
    }

    .deployment-icon {
      color: #4285f4;
    }

    .endpoint-group-icon {
      color: #34a853;
    }

    .security-profile-icon {
      color: #ea4335;
    }

    .quick-actions-card {
      margin: 0 40px 40px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .action-button {
      padding: 24px;
      text-align: left;
      display: flex;
      align-items: flex-start;
      gap: 20px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      background: var(--surface-color);
      transition: all 0.3s ease;
      min-height: 120px;
      width: 100%;
      box-sizing: border-box;
      color: var(--text-color);
    }

    .action-button:hover {
      border-color: #6a1b9a;
      background: var(--hover-color);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(106, 27, 154, 0.15);
    }

    .action-button.producer:hover {
      border-color: #1976d2;
      background: rgba(25, 118, 210, 0.08);
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    }

    .action-button.consumer:hover {
      border-color: #388e3c;
      background: rgba(56, 142, 60, 0.08);
      box-shadow: 0 4px 12px rgba(56, 142, 60, 0.15);
    }

    .action-button mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-top: 2px;
      flex-shrink: 0;
      color: var(--text-secondary-color);
    }

    .action-content {
      flex: 1;
      min-width: 0;
    }

    .action-content h4 {
      margin: 0 0 8px 0;
      color: var(--text-color);
      font-size: 16px;
      font-weight: 500;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .action-content p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
        padding: 20px;
      }



      .architecture-card,
      .resources-section,
      .quick-actions-card {
        margin-left: 20px;
        margin-right: 20px;
      }

      .single-line-flow {
        flex-direction: column;
        gap: 16px;
      }

      .flow-section {
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .section-label {
        margin-right: 0;
        margin-bottom: 8px;
      }

      .flow-arrow {
        transform: rotate(90deg);
        margin: 8px 0;
      }

      .connection-divider {
        margin: 12px 0;
      }

      .section-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .page-header {
        background: var(--surface-color) !important;
        border-bottom-color: var(--border-color);
      }



      .architecture-card,
      .resource-category-card,
      .quick-actions-card,
      .resource-card,
      .concept-card {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .workflow-section {
        background: rgba(var(--primary-rgb), 0.05);
      }

      .step {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .resource-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }

      .action-button:hover {
        box-shadow: 0 4px 12px rgba(106, 27, 154, 0.25);
      }

      .action-button.producer:hover {
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.25);
      }

      .action-button.consumer:hover {
        box-shadow: 0 4px 12px rgba(56, 142, 60, 0.25);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-header {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-title {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-subtitle {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-card-content {
        color: var(--text-color) !important;
      }

      .mat-mdc-chip {
        background-color: rgba(66, 133, 244, 0.12) !important;
        color: var(--primary-color) !important;
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-raised-button {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-button-toggle-group {
        background-color: var(--surface-color) !important;
        border: 1px solid var(--border-color) !important;
      }

      .mat-mdc-button-toggle {
        color: var(--text-color) !important;
        background-color: var(--surface-color) !important;
        border: none !important;
      }

      .mat-mdc-button-toggle.mat-mdc-button-toggle-checked {
        background-color: rgba(var(--primary-rgb), 0.12) !important;
        color: var(--primary-color) !important;
      }

      .mat-mdc-button-toggle:hover {
        background-color: var(--hover-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-card {
      background-color: var(--surface-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    ::ng-deep .mat-mdc-card-title {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-card-subtitle {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-card-content {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-chip {
      background-color: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
    }

    ::ng-deep .mat-mdc-button {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-button-toggle-group {
      background-color: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    ::ng-deep .mat-mdc-button-toggle {
      color: var(--text-color);
      background-color: var(--surface-color);
    }

    ::ng-deep .mat-mdc-button-toggle.mat-mdc-button-toggle-checked {
      background-color: rgba(var(--primary-rgb), 0.12);
      color: var(--primary-color);
    }
  `]
})
export class TPPIManagementComponent implements OnInit {
  currentView = 'all';
  viewMode = 'table';
  showDetailedArchitecture = false;
  projectId: string | null = null;

  // Table columns
  displayedColumns: string[] = ['name', 'type', 'status', 'scope', 'description', 'actions'];

  // Mock data for demonstration
  deploymentGroups: TPPIResource[] = [];
  deployments: TPPIResource[] = [];
  endpointGroups: TPPIResource[] = [];
  securityProfiles: TPPIResource[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadTPPIResources();
    });
  }

  loadTPPIResources() {
    // Mock data - in real implementation, this would call the TPPI APIs
    this.deploymentGroups = [
      {
        id: 'dg-1',
        name: 'security-service-group',
        type: 'Deployment Group',
        status: 'Active',
        scope: 'Project',
        description: 'Main deployment group for security services',
        dependencies: ['dep-1', 'dep-2']
      }
    ];

    this.deployments = [
      {
        id: 'dep-1',
        name: 'firewall-deployment-us-central1-a',
        type: 'Deployment',
        status: 'Active',
        scope: 'Zone',
        description: 'Firewall deployment in us-central1-a'
      }
    ];

    this.endpointGroups = [
      {
        id: 'eg-1',
        name: 'corp-security-endpoints',
        type: 'Endpoint Group',
        status: 'Active',
        scope: 'Organization',
        description: 'Corporate security endpoint group',
        dependencies: ['assoc-1']
      }
    ];

    this.securityProfiles = [
      {
        id: 'sp-1',
        name: 'custom-intercept-profile',
        type: 'Security Profile',
        status: 'Active',
        scope: 'Organization',
        description: 'Custom intercept security profile'
      }
    ];
  }

  toggleArchitectureView() {
    this.showDetailedArchitecture = !this.showDetailedArchitecture;
  }

  getAllResources(): TPPIResource[] {
    return [
      ...this.deploymentGroups,
      ...this.deployments,
      ...this.endpointGroups,
      ...this.securityProfiles
    ];
  }

  getFilteredResources(): TPPIResource[] {
    const allResources = this.getAllResources();
    
    if (this.currentView === 'producer') {
      return allResources.filter(r => 
        r.type === 'Deployment Group' || r.type === 'Deployment'
      );
    } else if (this.currentView === 'consumer') {
      return allResources.filter(r => 
        r.type === 'Endpoint Group' || r.type === 'Security Profile'
      );
    }
    
    return allResources;
  }

  getProducerResources(): TPPIResource[] {
    return [...this.deploymentGroups, ...this.deployments];
  }

  getConsumerResources(): TPPIResource[] {
    return [...this.endpointGroups, ...this.securityProfiles];
  }

  getResourceIcon(type: string): string {
    switch (type) {
      case 'Deployment Group':
        return 'business_center';
      case 'Deployment':
        return 'cloud_queue';
      case 'Endpoint Group':
        return 'hub';
      case 'Security Profile':
        return 'security';
      default:
        return 'help';
    }
  }

  getResourceTypeIcon(type: string): string {
    switch (type) {
      case 'Deployment Group':
        return 'deployment-group-icon';
      case 'Deployment':
        return 'deployment-icon';
      case 'Endpoint Group':
        return 'endpoint-group-icon';
      case 'Security Profile':
        return 'security-profile-icon';
      default:
        return '';
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'primary';
      case 'pending': return 'accent';
      case 'error': return 'warn';
      default: return '';
    }
  }

  openSetupWizard(role?: string) {
    if (role) {
      this.router.navigate(['/tppi/setup'], { queryParams: { role } });
    } else {
      this.router.navigate(['/tppi/setup']);
    }
  }

  createDeploymentGroup() {
    this.router.navigate(['/tppi/setup'], { queryParams: { role: 'producer', resource: 'deployment-group' } });
  }

  createDeployment() {
    this.router.navigate(['/tppi/setup'], { queryParams: { role: 'producer', resource: 'deployment' } });
  }

  createEndpointGroup() {
    this.router.navigate(['/tppi/setup'], { queryParams: { role: 'consumer', resource: 'endpoint-group' } });
  }

  createSecurityProfile() {
    this.router.navigate(['/tppi/setup'], { queryParams: { role: 'consumer', resource: 'security-profile' } });
  }

  viewResource(resource: TPPIResource) {
    this.snackBar.open(`Viewing ${resource.name}...`, 'Close', {
      duration: 3000
    });
  }

  editResource(resource: TPPIResource) {
    this.snackBar.open(`Editing ${resource.name}...`, 'Close', {
      duration: 3000
    });
  }

  viewDocumentation() {
    this.snackBar.open('Opening TPPI documentation...', 'Close', {
      duration: 3000
    });
  }
} 