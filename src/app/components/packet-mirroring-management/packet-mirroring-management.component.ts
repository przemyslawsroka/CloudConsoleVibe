import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService, Project } from '../../services/project.service';
import { PacketMirroringSetupWizardComponent } from '../packet-mirroring-setup-wizard/packet-mirroring-setup-wizard.component';

interface MirroringResource {
  id: string;
  name: string;
  type: string;
  status: string;
  scope: string;
  description?: string;
  dependencies?: string[];
}

@Component({
  selector: 'app-packet-mirroring-management',
  template: `
    <div class="mirroring-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Packet Mirroring</h1>
          <p class="page-description">
            Configure and manage packet mirroring for network monitoring and analysis.
            Packet Mirroring allows you to copy network traffic to third-party monitoring tools for inspection without affecting the original traffic flow.
          </p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openSetupWizard()">
            <mat-icon>add</mat-icon>
            Setup Mirroring
          </button>
        </div>
      </div>

      <!-- Architecture Overview -->
      <mat-card class="architecture-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>architecture</mat-icon>
            Packet Mirroring Architecture Overview
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="architecture-diagram">
            <div class="workflow-section">
              <h3>Monitoring Provider Workflow (Service Producer)</h3>
              <div class="workflow-steps">
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <h4>Mirror Deployment Group</h4>
                    <p>Create a logical container for your monitoring service deployments</p>
                  </div>
                </div>
                <div class="step-arrow">→</div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <h4>Mirror Deployment</h4>
                    <p>Deploy monitoring tools in specific zones with ILB frontends</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="workflow-section">
              <h3>Traffic Owner Workflow (Consumer)</h3>
              <div class="workflow-steps">
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <h4>Mirror Endpoint Group</h4>
                    <p>Reference the monitoring service you want to use</p>
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
                    <h4>Mirror Profiles</h4>
                    <p>Create policies and apply them via firewall rules for traffic mirroring</p>
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
                  <h4>Monitoring Provider</h4>
                  <p>Organizations that provide network monitoring and analysis services through packet mirroring</p>
                </mat-card-content>
              </mat-card>
              <mat-card class="concept-card">
                <mat-card-content>
                  <mat-icon class="concept-icon consumer">person</mat-icon>
                  <h4>Traffic Owner</h4>
                  <p>Organizations that want their traffic mirrored to third-party monitoring services</p>
                </mat-card-content>
              </mat-card>
              <mat-card class="concept-card">
                <mat-card-content>
                  <mat-icon class="concept-icon">visibility</mat-icon>
                  <h4>Packet Mirroring</h4>
                  <p>Copy network traffic to monitoring tools for analysis without impacting original traffic</p>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Current Resources -->
      <div class="resources-section">
        <div class="section-header">
          <h2>Current Mirroring Resources</h2>
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
                Producer Resources (Monitoring Service Provider)
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Deployment Groups -->
              <div class="resource-section">
                <h3>Mirror Deployment Groups</h3>
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
                <h3>Mirror Deployments</h3>
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
                <h3>Mirror Endpoint Groups</h3>
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

              <!-- Mirror Profiles -->
              <div class="resource-section">
                <h3>Mirror Profiles & Groups</h3>
                <div *ngIf="mirrorProfiles.length === 0" class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>No mirror profiles configured</p>
                  <button mat-raised-button color="primary" (click)="createMirrorProfile()">
                    Create Mirror Profile
                  </button>
                </div>
                <div *ngIf="mirrorProfiles.length > 0" class="resources-grid">
                  <mat-card *ngFor="let profile of mirrorProfiles" class="resource-card">
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
                <h4>Set up as Provider</h4>
                <p>Provide monitoring services to other organizations</p>
              </div>
            </button>
            <button mat-raised-button class="action-button consumer" (click)="openSetupWizard('consumer')">
              <mat-icon>person</mat-icon>
              <div class="action-content">
                <h4>Set up as Consumer</h4>
                <p>Use third-party monitoring services for your traffic</p>
              </div>
            </button>
            <button mat-raised-button class="action-button" (click)="viewDocumentation()">
              <mat-icon>help</mat-icon>
              <div class="action-content">
                <h4>Documentation</h4>
                <p>Learn more about Packet Mirroring configuration</p>
              </div>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mirroring-container {
      padding: 0;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .page-header {
      background: linear-gradient(135deg, #1976d2, #1565c0);
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
    }

    .architecture-diagram {
      margin: 24px 0;
    }

    .workflow-section {
      margin-bottom: 32px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .workflow-section h3 {
      margin: 0 0 20px 0;
      color: #1976d2;
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
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      min-width: 200px;
      flex: 1;
    }

    .step-number {
      background: #1976d2;
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
      color: #333;
    }

    .step-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    }

    .step-arrow {
      font-size: 24px;
      color: #1976d2;
      font-weight: bold;
    }

    .key-concepts {
      margin-top: 32px;
    }

    .key-concepts h3 {
      margin: 0 0 16px 0;
      color: #1976d2;
    }

    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .concept-card {
      text-align: center;
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
      color: #333;
    }

    .concept-card p {
      margin: 0;
      color: #666;
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
      color: #333;
    }

    .view-toggle {
      background: white;
      border-radius: 8px;
    }

    .resource-category-card {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      color: #1976d2;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .resource-card {
      border-radius: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
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
      color: #333;
    }

    .resource-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 12px;
      font-size: 12px;
      color: #666;
    }

    .quick-actions-card {
      margin: 0 40px 40px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      background: white;
      transition: all 0.3s ease;
      min-height: 120px;
      width: 100%;
      box-sizing: border-box;
    }

    .action-button:hover {
      border-color: #1976d2;
      background: #f3f8ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    }

    .action-button.producer:hover {
      border-color: #1976d2;
      background: #f3f8ff;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    }

    .action-button.consumer:hover {
      border-color: #388e3c;
      background: #f8fff8;
      box-shadow: 0 4px 12px rgba(56, 142, 60, 0.15);
    }

    .action-button mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .action-content {
      flex: 1;
      min-width: 0;
    }

    .action-content h4 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
      line-height: 1.3;
      word-wrap: break-word;
    }

    .action-content p {
      margin: 0;
      color: #666;
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
  `]
})
export class PacketMirroringManagementComponent implements OnInit {
  currentView = 'all';
  projectId: string | null = null;

  // Mock data for demonstration
  deploymentGroups: MirroringResource[] = [];
  deployments: MirroringResource[] = [];
  endpointGroups: MirroringResource[] = [];
  mirrorProfiles: MirroringResource[] = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadMirroringResources();
    });
  }

  loadMirroringResources() {
    // Mock data - in real implementation, this would call the Packet Mirroring APIs
    this.deploymentGroups = [
      {
        id: 'dg-1',
        name: 'network-monitoring-group',
        type: 'Deployment Group',
        status: 'Active',
        scope: 'Project',
        description: 'Main deployment group for network monitoring services',
        dependencies: ['dep-1', 'dep-2']
      }
    ];

    this.deployments = [
      {
        id: 'dep-1',
        name: 'monitor-deployment-us-central1-a',
        type: 'Deployment',
        status: 'Active',
        scope: 'Zone',
        description: 'Monitoring deployment in us-central1-a'
      }
    ];

    this.endpointGroups = [
      {
        id: 'eg-1',
        name: 'corp-monitoring-endpoints',
        type: 'Endpoint Group',
        status: 'Active',
        scope: 'Organization',
        description: 'Corporate monitoring endpoint group',
        dependencies: ['assoc-1']
      }
    ];

    this.mirrorProfiles = [
      {
        id: 'sp-1',
        name: 'custom-mirror-profile',
        type: 'Mirror Profile',
        status: 'Active',
        scope: 'Organization',
        description: 'Custom mirror profile for traffic monitoring'
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
    const dialogRef = this.dialog.open(PacketMirroringSetupWizardComponent, {
      width: '900px',
      maxWidth: '90vw',
      disableClose: true,
      data: { role, projectId: this.projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open(`Packet Mirroring setup completed successfully for ${result.role}!`, 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar'
        });
        this.loadMirroringResources(); // Refresh the resources
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

  createMirrorProfile() {
    this.snackBar.open('Opening Mirror Profile creation wizard...', 'Close', {
      duration: 3000
    });
  }

  viewResource(resource: MirroringResource) {
    this.snackBar.open(`Viewing ${resource.name}...`, 'Close', {
      duration: 3000
    });
  }

  editResource(resource: MirroringResource) {
    this.snackBar.open(`Editing ${resource.name}...`, 'Close', {
      duration: 3000
    });
  }

  viewDocumentation() {
    this.snackBar.open('Opening Packet Mirroring documentation...', 'Close', {
      duration: 3000
    });
  }
} 