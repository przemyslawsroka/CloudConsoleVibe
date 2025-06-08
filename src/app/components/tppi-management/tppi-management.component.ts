import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService, Project } from '../../services/project.service';
import { TPPISetupWizardComponent } from '../tppi-setup-wizard/tppi-setup-wizard.component';

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
          <p class="page-description">
            Configure and manage third-party packet interception for network security and monitoring.
            TPPI allows you to redirect network traffic to external security appliances for inspection.
          </p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openSetupWizard()">
            <mat-icon>add</mat-icon>
            Setup TPPI
          </button>
        </div>
      </div>

      <!-- Architecture Overview -->
      <mat-card class="architecture-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>architecture</mat-icon>
            TPPI Architecture Overview
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="architecture-diagram">
            <div class="workflow-section">
              <h3>Producer Workflow (Security Service Provider)</h3>
              <div class="workflow-steps">
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <h4>Intercept Deployment Group</h4>
                    <p>Create a logical container for your security service deployments</p>
                  </div>
                </div>
                <div class="step-arrow">→</div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <h4>Intercept Deployment</h4>
                    <p>Deploy security appliances in specific zones with ILB frontends</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="workflow-section">
              <h3>Consumer Workflow (Traffic Owner)</h3>
              <div class="workflow-steps">
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <h4>Intercept Endpoint Group</h4>
                    <p>Reference the producer's security service you want to use</p>
                  </div>
                </div>
                <div class="step-arrow">→</div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div class="step-content">
                    <h4>VPC Association</h4>
                    <p>Connect your VPC networks to the endpoint group</p>
                  </div>
                </div>
                <div class="step-arrow">→</div>
                <div class="step">
                  <div class="step-number">5</div>
                  <div class="step-content">
                    <h4>Security Profiles</h4>
                    <p>Create policies and apply them via firewall rules</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="key-concepts">
            <h3>Key Concepts</h3>
            <div class="concepts-grid">
              <mat-card class="concept-card">
                <mat-card-content>
                  <mat-icon class="concept-icon producer">business</mat-icon>
                  <h4>Service Producer</h4>
                  <p>Organizations that provide security services (firewall, IDS, etc.) through TPPI</p>
                </mat-card-content>
              </mat-card>
              <mat-card class="concept-card">
                <mat-card-content>
                  <mat-icon class="concept-icon consumer">person</mat-icon>
                  <h4>Service Consumer</h4>
                  <p>Organizations that want their traffic inspected by third-party security services</p>
                </mat-card-content>
              </mat-card>
              <mat-card class="concept-card">
                <mat-card-content>
                  <mat-icon class="concept-icon">security</mat-icon>
                  <h4>Packet Intercept</h4>
                  <p>Transparent redirection of network traffic to security appliances for inspection</p>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Current Resources -->
      <div class="resources-section">
        <div class="section-header">
          <h2>Current TPPI Resources</h2>
          <mat-button-toggle-group [(value)]="currentView" class="view-toggle">
            <mat-button-toggle value="producer">Producer Resources</mat-button-toggle>
            <mat-button-toggle value="consumer">Consumer Resources</mat-button-toggle>
            <mat-button-toggle value="all">All Resources</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <!-- Producer Resources -->
        <div *ngIf="currentView === 'producer' || currentView === 'all'">
          <mat-card class="resource-category-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="producer-icon">business</mat-icon>
                Producer Resources (Security Service Provider)
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Deployment Groups -->
              <div class="resource-section">
                <h3>Intercept Deployment Groups</h3>
                <div *ngIf="deploymentGroups.length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No deployment groups configured</p>
                  <button mat-raised-button color="primary" (click)="createDeploymentGroup()">
                    Create Deployment Group
                  </button>
                </div>
                <div *ngIf="deploymentGroups.length > 0" class="resources-grid">
                  <mat-card *ngFor="let group of deploymentGroups" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <h4>{{ group.name }}</h4>
                        <mat-chip [color]="getStatusColor(group.status)">{{ group.status }}</mat-chip>
                      </div>
                      <p>{{ group.description }}</p>
                      <div class="resource-details">
                        <span><strong>Scope:</strong> {{ group.scope }}</span>
                        <span><strong>Deployments:</strong> {{ group.dependencies?.length || 0 }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(group)">View</button>
                      <button mat-button (click)="editResource(group)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>

              <!-- Deployments -->
              <div class="resource-section">
                <h3>Intercept Deployments</h3>
                <div *ngIf="deployments.length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No deployments configured</p>
                  <button mat-raised-button color="primary" (click)="createDeployment()">
                    Create Deployment
                  </button>
                </div>
                <div *ngIf="deployments.length > 0" class="resources-grid">
                  <mat-card *ngFor="let deployment of deployments" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <h4>{{ deployment.name }}</h4>
                        <mat-chip [color]="getStatusColor(deployment.status)">{{ deployment.status }}</mat-chip>
                      </div>
                      <p>{{ deployment.description }}</p>
                      <div class="resource-details">
                        <span><strong>Scope:</strong> {{ deployment.scope }}</span>
                        <span><strong>Type:</strong> {{ deployment.type }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(deployment)">View</button>
                      <button mat-button (click)="editResource(deployment)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Consumer Resources -->
        <div *ngIf="currentView === 'consumer' || currentView === 'all'">
          <mat-card class="resource-category-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon class="consumer-icon">person</mat-icon>
                Consumer Resources (Traffic Owner)
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Endpoint Groups -->
              <div class="resource-section">
                <h3>Intercept Endpoint Groups</h3>
                <div *ngIf="endpointGroups.length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No endpoint groups configured</p>
                  <button mat-raised-button color="primary" (click)="createEndpointGroup()">
                    Create Endpoint Group
                  </button>
                </div>
                <div *ngIf="endpointGroups.length > 0" class="resources-grid">
                  <mat-card *ngFor="let group of endpointGroups" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <h4>{{ group.name }}</h4>
                        <mat-chip [color]="getStatusColor(group.status)">{{ group.status }}</mat-chip>
                      </div>
                      <p>{{ group.description }}</p>
                      <div class="resource-details">
                        <span><strong>Scope:</strong> {{ group.scope }}</span>
                        <span><strong>Associations:</strong> {{ group.dependencies?.length || 0 }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(group)">View</button>
                      <button mat-button (click)="editResource(group)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>

              <!-- Security Profiles -->
              <div class="resource-section">
                <h3>Security Profiles & Groups</h3>
                <div *ngIf="securityProfiles.length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No security profiles configured</p>
                  <button mat-raised-button color="primary" (click)="createSecurityProfile()">
                    Create Security Profile
                  </button>
                </div>
                <div *ngIf="securityProfiles.length > 0" class="resources-grid">
                  <mat-card *ngFor="let profile of securityProfiles" class="resource-card">
                    <mat-card-content>
                      <div class="resource-header">
                        <h4>{{ profile.name }}</h4>
                        <mat-chip [color]="getStatusColor(profile.status)">{{ profile.status }}</mat-chip>
                      </div>
                      <p>{{ profile.description }}</p>
                      <div class="resource-details">
                        <span><strong>Type:</strong> {{ profile.type }}</span>
                        <span><strong>Scope:</strong> {{ profile.scope }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="viewResource(profile)">View</button>
                      <button mat-button (click)="editResource(profile)">Edit</button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
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
                <h4>Set up as Producer</h4>
                <p>Provide security services to other organizations</p>
              </div>
            </button>
            <button mat-raised-button class="action-button consumer" (click)="openSetupWizard('consumer')">
              <mat-icon>person</mat-icon>
              <div class="action-content">
                <h4>Set up as Consumer</h4>
                <p>Use third-party security services for your traffic</p>
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
      background: linear-gradient(135deg, #6a1b9a, #8e24aa);
      color: white;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      font-size: 2.5rem;
      font-weight: 300;
      margin: 0 0 8px 0;
    }

    .page-description {
      font-size: 1.1rem;
      opacity: 0.9;
      max-width: 800px;
      line-height: 1.5;
      margin: 0;
    }

    .header-actions button {
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
    }

    .architecture-card {
      margin: -20px 40px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .architecture-diagram {
      margin: 24px 0;
    }

    .workflow-section {
      margin-bottom: 32px;
      padding: 20px;
      background: var(--hover-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .workflow-section h3 {
      margin: 0 0 20px 0;
      color: #6a1b9a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .workflow-steps {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .step {
      background: var(--surface-color);
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      min-width: 200px;
      flex: 1;
      border: 1px solid var(--border-color);
    }

    .step-number {
      background: #6a1b9a;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-bottom: 12px;
    }

    .step-content h4 {
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .step-content p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .step-arrow {
      font-size: 24px;
      color: #6a1b9a;
      font-weight: bold;
    }

    .key-concepts {
      margin-top: 32px;
    }

    .key-concepts h3 {
      margin: 0 0 16px 0;
      color: #6a1b9a;
    }

    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .concept-card {
      text-align: center;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .concept-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }

    .concept-icon.producer {
      color: #1976d2;
    }

    .concept-icon.consumer {
      color: #388e3c;
    }

    .concept-card h4 {
      margin: 0 0 8px 0;
      color: var(--text-color);
    }

    .concept-card p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .resources-section {
      margin: 0 40px 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0;
      color: var(--text-color);
    }

    .view-toggle {
      background: var(--surface-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .resource-category-card {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: var(--surface-color);
      border: 1px solid var(--border-color);
    }

    .producer-icon {
      color: #1976d2;
    }

    .consumer-icon {
      color: #388e3c;
    }

    .resource-section {
      margin-bottom: 32px;
    }

    .resource-section h3 {
      margin: 0 0 16px 0;
      color: #6a1b9a;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 8px;
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
      align-items: center;
      margin-bottom: 8px;
    }

    .resource-header h4 {
      margin: 0;
      color: var(--text-color);
    }

    .resource-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 12px;
      font-size: 12px;
      color: var(--text-secondary-color);
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

      .workflow-steps {
        flex-direction: column;
      }

      .step-arrow {
        transform: rotate(90deg);
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
  projectId: string | null = null;

  // Mock data for demonstration
  deploymentGroups: TPPIResource[] = [];
  deployments: TPPIResource[] = [];
  endpointGroups: TPPIResource[] = [];
  securityProfiles: TPPIResource[] = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
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

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'primary';
      case 'pending': return 'accent';
      case 'error': return 'warn';
      default: return '';
    }
  }

  openSetupWizard(role?: string) {
    const dialogRef = this.dialog.open(TPPISetupWizardComponent, {
      width: '900px',
      maxWidth: '90vw',
      disableClose: true,
      data: { role, projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open(`TPPI setup completed successfully for ${result.role}!`, 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar'
        });
        this.loadTPPIResources(); // Refresh the resources
      }
    });
  }

  createDeploymentGroup() {
    this.snackBar.open('Opening Deployment Group creation wizard...', 'Close', {
      duration: 3000
    });
  }

  createDeployment() {
    this.snackBar.open('Opening Deployment creation wizard...', 'Close', {
      duration: 3000
    });
  }

  createEndpointGroup() {
    this.snackBar.open('Opening Endpoint Group creation wizard...', 'Close', {
      duration: 3000
    });
  }

  createSecurityProfile() {
    this.snackBar.open('Opening Security Profile creation wizard...', 'Close', {
      duration: 3000
    });
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