import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadBalancerService } from '../../services/load-balancer.service';

export interface LoadBalancerConfig {
  type: 'APPLICATION' | 'NETWORK';
  facing: 'EXTERNAL' | 'INTERNAL';
  deployment: 'GLOBAL' | 'REGIONAL';
  generation: 'GLOBAL_EXTERNAL' | 'CLASSIC';
  region?: string;
}

@Component({
  selector: 'app-create-load-balancer',
  template: `
    <div class="create-load-balancer-page">
      <div class="page-header">
        <div class="breadcrumb">
          <a (click)="navigateBack()" class="breadcrumb-link">
            <mat-icon>arrow_back</mat-icon>
            Load balancing
          </a>
          <span class="breadcrumb-separator">></span>
          <span class="breadcrumb-current">Create a load balancer</span>
        </div>
        <h1>Create a load balancer</h1>
      </div>

      <div class="page-content">
        <mat-stepper #stepper orientation="vertical" [linear]="true" class="stepper">
          
          <!-- Step 1: Type of load balancer -->
          <mat-step [stepControl]="typeForm" [completed]="typeForm.valid">
            <form [formGroup]="typeForm">
              <ng-template matStepLabel>Type of load balancer</ng-template>
              
              <div class="step-content">
                <mat-radio-group formControlName="type" class="type-radio-group">
                  <div class="load-balancer-options">
                    <div class="option-card" 
                         [class.selected]="typeForm.get('type')?.value === 'APPLICATION'"
                         (click)="selectType('APPLICATION')">
                      <mat-radio-button value="APPLICATION">
                        Application Load Balancer (HTTP/HTTPS)
                      </mat-radio-button>
                      <p class="option-description">
                        Choose an Application Load Balancer when you need a flexible feature set for your applications with HTTP and HTTPS traffic.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="diagram-row">
                          <div class="diagram-box internet">
                            <mat-icon>public</mat-icon>
                            <span>Internet</span>
                          </div>
                          <div class="diagram-box vpc">
                            <mat-icon>cloud</mat-icon>
                            <span>VPC network</span>
                          </div>
                        </div>
                        <div class="diagram-center">
                          <div class="load-balancer-box">
                            <span>Application Load Balancer</span>
                            <div class="protocols">
                              <span class="protocol">HTTP</span>
                              <span class="protocol">HTTPS</span>
                            </div>
                          </div>
                        </div>
                        <div class="diagram-row">
                          <div class="workload-box">
                            <mat-icon>storage</mat-icon>
                            <span>Workloads</span>
                          </div>
                          <div class="workload-box">
                            <mat-icon>storage</mat-icon>
                            <span>Workloads</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="option-card" 
                         [class.selected]="typeForm.get('type')?.value === 'NETWORK'"
                         (click)="selectType('NETWORK')">
                      <mat-radio-button value="NETWORK">
                        Network Load Balancer (TCP/UDP/SSL)
                      </mat-radio-button>
                      <p class="option-description">
                        Choose a Network Load Balancer when you need TLS offloading at scale, support for UDP and exposing IP addresses to your applications.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="diagram-row">
                          <div class="diagram-box internet">
                            <mat-icon>public</mat-icon>
                            <span>Internet</span>
                          </div>
                          <div class="diagram-box vpc">
                            <mat-icon>cloud</mat-icon>
                            <span>VPC network</span>
                          </div>
                        </div>
                        <div class="diagram-center">
                          <div class="load-balancer-box">
                            <span>Network Load Balancer</span>
                            <div class="protocols">
                              <span class="protocol">TCP</span>
                              <span class="protocol">UDP</span>
                              <span class="protocol">TLS</span>
                              <span class="protocol">Other L4 protocols</span>
                            </div>
                          </div>
                        </div>
                        <div class="diagram-row">
                          <div class="workload-box">
                            <mat-icon>storage</mat-icon>
                            <span>Workloads</span>
                          </div>
                          <div class="workload-box">
                            <mat-icon>storage</mat-icon>
                            <span>Workloads</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-radio-group>

                <div class="step-actions">
                  <button mat-raised-button color="primary" 
                          [disabled]="!typeForm.valid"
                          (click)="stepper.next()">
                    Next
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Public facing or internal -->
          <mat-step [stepControl]="facingForm" [completed]="facingForm.valid">
            <form [formGroup]="facingForm">
              <ng-template matStepLabel>Public facing or internal</ng-template>
              
              <div class="step-content">
                <mat-radio-group formControlName="facing" class="facing-radio-group">
                  <div class="load-balancer-options">
                    <div class="option-card" 
                         [class.selected]="facingForm.get('facing')?.value === 'EXTERNAL'"
                         (click)="selectFacing('EXTERNAL')">
                      <mat-radio-button value="EXTERNAL">
                        Public facing (external)
                      </mat-radio-button>
                      <p class="option-description">
                        An internet-facing load balancer routes requests from clients over the internet to targets.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>External Client</span>
                        </div>
                        <div class="internet-icon">
                          <mat-icon>public</mat-icon>
                          <span>Internet</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>External {{ getLoadBalancerTypeName() }}</span>
                        </div>
                        <div class="workload-box">
                          <mat-icon>storage</mat-icon>
                          <span>Workloads</span>
                        </div>
                      </div>
                    </div>

                    <div class="option-card" 
                         [class.selected]="facingForm.get('facing')?.value === 'INTERNAL'"
                         (click)="selectFacing('INTERNAL')">
                      <mat-radio-button value="INTERNAL">
                        Internal
                      </mat-radio-button>
                      <p class="option-description">
                        An internal load balancer routes requests from clients to backends using private IP addresses.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>Internal Client</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>Internal {{ getLoadBalancerTypeName() }}</span>
                        </div>
                        <div class="workload-box">
                          <mat-icon>storage</mat-icon>
                          <span>Workloads</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-radio-group>

                <div class="step-actions">
                  <button mat-button (click)="stepper.previous()">Back</button>
                  <button mat-raised-button color="primary" 
                          [disabled]="!facingForm.valid"
                          (click)="stepper.next()">
                    Next
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Global or single region deployment -->
          <mat-step [stepControl]="deploymentForm" [completed]="deploymentForm.valid">
            <form [formGroup]="deploymentForm">
              <ng-template matStepLabel>Global or single region deployment</ng-template>
              
              <div class="step-content">
                <mat-radio-group formControlName="deployment" class="deployment-radio-group">
                  <div class="load-balancer-options">
                    <div class="option-card" 
                         [class.selected]="deploymentForm.get('deployment')?.value === 'GLOBAL'"
                         (click)="selectDeployment('GLOBAL')">
                      <mat-radio-button value="GLOBAL">
                        Best for global workloads
                      </mat-radio-button>
                      <p class="option-description">
                        Multiple regions. Use this for better performance if you have clients distributed globally (with a global anycast IP) or if you want to deploy backends in multiple regions.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>External Client</span>
                        </div>
                        <div class="internet-icon">
                          <mat-icon>public</mat-icon>
                          <span>Internet</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>Global external {{ getLoadBalancerTypeName() }}</span>
                        </div>
                        <div class="regions-row">
                          <div class="region-box">
                            <span>Region A</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                          <div class="region-box">
                            <span>Region B</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="option-card" 
                         [class.selected]="deploymentForm.get('deployment')?.value === 'REGIONAL'"
                         (click)="selectDeployment('REGIONAL')">
                      <mat-radio-button value="REGIONAL">
                        Best for regional workloads
                      </mat-radio-button>
                      <p class="option-description">
                        Single region. Use this if you want traffic to remain in a single region. For example, for workloads with jurisdictional compliance.
                      </p>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>External Client</span>
                        </div>
                        <div class="internet-icon">
                          <mat-icon>public</mat-icon>
                          <span>Internet</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>Regional external {{ getLoadBalancerTypeName() }}</span>
                        </div>
                        <div class="region-box">
                          <span>Region A</span>
                          <div class="workload-box">
                            <mat-icon>storage</mat-icon>
                            <span>Workloads</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-radio-group>

                <div class="step-actions">
                  <button mat-button (click)="stepper.previous()">Back</button>
                  <button mat-raised-button color="primary" 
                          [disabled]="!deploymentForm.valid"
                          (click)="stepper.next()">
                    Next
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 4: Load balancer generation (only for Application Load Balancer) -->
          <mat-step [stepControl]="generationForm" [completed]="generationForm.valid" 
                    *ngIf="typeForm.get('type')?.value === 'APPLICATION'">
            <form [formGroup]="generationForm">
              <ng-template matStepLabel>Load balancer generation</ng-template>
              
              <div class="step-content">
                <mat-radio-group formControlName="generation" class="generation-radio-group">
                  <div class="load-balancer-options">
                    <div class="option-card" 
                         [class.selected]="generationForm.get('generation')?.value === 'GLOBAL_EXTERNAL'"
                         (click)="selectGeneration('GLOBAL_EXTERNAL')">
                      <mat-radio-button value="GLOBAL_EXTERNAL">
                        Global external Application Load Balancer
                      </mat-radio-button>
                      <p class="option-description">
                        Load balancer with EXTERNAL_MANAGED load balancing scheme (Recommended)
                      </p>
                      <a href="#" class="learn-more">Learn more ↗</a>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>External Client</span>
                        </div>
                        <div class="internet-icon">
                          <mat-icon>public</mat-icon>
                          <span>Internet</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>Global external Application Load Balancer</span>
                          <div class="feature-badge">Advanced Traffic Management</div>
                        </div>
                        <div class="regions-row">
                          <div class="region-box">
                            <span>Region A</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                          <div class="region-box">
                            <span>Region B</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="option-card" 
                         [class.selected]="generationForm.get('generation')?.value === 'CLASSIC'"
                         (click)="selectGeneration('CLASSIC')">
                      <mat-radio-button value="CLASSIC">
                        Classic Application Load Balancer
                      </mat-radio-button>
                      <p class="option-description">
                        Previous generation load balancer with EXTERNAL load balancing scheme
                      </p>
                      <a href="#" class="learn-more">Learn more ↗</a>
                      
                      <div class="architecture-diagram">
                        <div class="client-box">
                          <mat-icon>person</mat-icon>
                          <span>External Client</span>
                        </div>
                        <div class="internet-icon">
                          <mat-icon>public</mat-icon>
                          <span>Internet</span>
                        </div>
                        <div class="load-balancer-box">
                          <span>Classic Application Load Balancer</span>
                          <div class="feature-badge">Basic Traffic Management</div>
                        </div>
                        <div class="regions-row">
                          <div class="region-box">
                            <span>Region A</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                          <div class="region-box">
                            <span>Region B</span>
                            <div class="workload-box">
                              <mat-icon>storage</mat-icon>
                              <span>Workloads</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-radio-group>

                <div class="step-actions">
                  <button mat-button (click)="stepper.previous()">Back</button>
                  <button mat-raised-button color="primary" 
                          [disabled]="!generationForm.valid"
                          (click)="stepper.next()">
                    Next
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 5: Create load balancer -->
          <mat-step>
            <ng-template matStepLabel>Create load balancer</ng-template>
            
            <div class="step-content">
              <div class="summary-container">
                <div class="summary-icon">
                  <mat-icon>balance</mat-icon>
                </div>
                
                <div class="summary-content">
                  <h3>You are about to create an {{ getLoadBalancerTypeName() }}</h3>
                  
                  <div class="summary-features">
                    <h4>with following features:</h4>
                    <ul>
                      <li>{{ facingForm.get('facing')?.value === 'EXTERNAL' ? 'Public facing (external)' : 'Internal' }}</li>
                      <li>{{ deploymentForm.get('deployment')?.value === 'GLOBAL' ? 'Global' : 'Regional' }}</li>
                      <li *ngIf="typeForm.get('type')?.value === 'APPLICATION' && generationForm.get('generation')?.value">
                        {{ generationForm.get('generation')?.value === 'GLOBAL_EXTERNAL' ? 'Advanced Traffic Management' : 'Basic Traffic Management' }}
                      </li>
                    </ul>
                  </div>

                  <div class="architecture-summary">
                    <div class="load-balancer-diagram">
                      <div class="diagram-element">
                        <mat-icon>public</mat-icon>
                        <span>Internet</span>
                      </div>
                      <div class="diagram-element main">
                        <mat-icon>balance</mat-icon>
                        <span>Load Balancer</span>
                      </div>
                      <div class="diagram-element">
                        <mat-icon>storage</mat-icon>
                        <span>Backends</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-actions">
                <button mat-button (click)="stepper.previous()">Back</button>
                <button mat-button (click)="cancel()">Cancel</button>
                <button mat-raised-button color="primary" (click)="createLoadBalancer()">
                  Configure
                </button>
              </div>
            </div>
          </mat-step>

        </mat-stepper>
      </div>
    </div>
  `,
  styles: [`
    .create-load-balancer-page {
      padding: 20px;
      background-color: #fafafa;
      min-height: 100vh;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
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

    .page-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 400;
      color: #202124;
    }

    .page-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 24px;
    }

    .stepper {
      background: transparent;
    }

    .step-content {
      padding: 24px 0;
      min-height: 600px;
    }

    .load-balancer-options {
      display: flex;
      flex-direction: row;
      gap: 24px;
      margin-bottom: 48px;
    }

    .option-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      flex: 1;
      min-width: 0;
    }

    .option-card:hover {
      border-color: #1a73e8;
      box-shadow: 0 4px 12px rgba(26, 115, 232, 0.15);
      transform: translateY(-2px);
    }

    .option-card.selected {
      border-color: #1a73e8;
      background-color: #f8f9ff;
      box-shadow: 0 4px 12px rgba(26, 115, 232, 0.15);
    }

    .option-card mat-radio-button {
      font-weight: 500;
      font-size: 18px;
      color: #202124;
    }

    .option-description {
      margin: 12px 0 20px 32px;
      color: #5f6368;
      font-size: 14px;
      line-height: 1.5;
    }

    .learn-more {
      margin-left: 32px;
      color: #1a73e8;
      text-decoration: none;
      font-size: 14px;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .architecture-diagram {
      margin: 20px 0 0 32px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e8eaed;
    }

    .diagram-row {
      display: flex;
      justify-content: space-around;
      margin-bottom: 12px;
    }

    .diagram-center {
      display: flex;
      justify-content: center;
      margin: 12px 0;
    }

    .diagram-box, .client-box, .workload-box, .region-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 8px;
      min-width: 80px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    }

    .diagram-box:hover, .client-box:hover, .workload-box:hover, .region-box:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .diagram-box mat-icon, .client-box mat-icon, .workload-box mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-bottom: 6px;
    }

    .diagram-box span, .client-box span, .workload-box span, .region-box span {
      font-size: 10px;
      font-weight: 500;
      color: #5f6368;
    }

    .diagram-box.internet {
      background: #e3f2fd;
      border-color: #1976d2;
    }

    .diagram-box.vpc {
      background: #f3e5f5;
      border-color: #7b1fa2;
    }

    .load-balancer-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      background: #e8f0fe;
      border: 2px solid #1a73e8;
      border-radius: 12px;
      min-width: 180px;
      text-align: center;
      font-weight: 500;
      box-shadow: 0 4px 8px rgba(26, 115, 232, 0.2);
      font-size: 12px;
    }

    .protocols {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .protocol {
      background: #1a73e8;
      color: white;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 500;
    }

    .feature-badge {
      background: #34a853;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      margin-top: 8px;
    }

    .internet-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 12px 0;
      color: #1976d2;
    }

    .regions-row {
      display: flex;
      justify-content: space-around;
      margin-top: 12px;
      gap: 8px;
    }

    .region-box {
      border: 2px solid #4caf50;
      background: #e8f5e8;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: auto;
      padding-top: 32px;
      border-top: 1px solid #e0e0e0;
    }

    .type-radio-group,
    .facing-radio-group,
    .deployment-radio-group,
    .generation-radio-group {
      width: 100%;
    }

    .type-radio-group .mat-radio-group,
    .facing-radio-group .mat-radio-group,
    .deployment-radio-group .mat-radio-group,
    .generation-radio-group .mat-radio-group {
      display: block;
      width: 100%;
    }

    .summary-container {
      display: flex;
      gap: 32px;
      align-items: flex-start;
      margin-bottom: 48px;
      padding: 24px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e8eaed;
    }

    .summary-icon mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #1a73e8;
    }

    .summary-content h3 {
      margin: 0 0 20px 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .summary-features h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
      color: #5f6368;
    }

    .summary-features ul {
      margin: 0;
      padding-left: 24px;
      color: #202124;
    }

    .summary-features li {
      margin-bottom: 8px;
      font-size: 14px;
    }

    .architecture-summary {
      margin-top: 32px;
    }

    .load-balancer-diagram {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 24px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e8eaed;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .diagram-element {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 8px;
      min-width: 100px;
    }

    .diagram-element.main {
      border: 2px solid #1a73e8;
      background: #e8f0fe;
    }

    .diagram-element mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .diagram-element span {
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }

    ::ng-deep .mat-stepper-vertical-line::before {
      border-left-color: #e0e0e0;
    }

    ::ng-deep .mat-step-header .mat-step-icon {
      background-color: #1a73e8;
    }

    ::ng-deep .mat-step-header .mat-step-icon-selected {
      background-color: #1a73e8;
    }

    ::ng-deep .mat-step-header .mat-step-label {
      font-size: 16px;
      font-weight: 500;
    }

    @media (max-width: 1200px) {
      .load-balancer-options {
        flex-direction: column;
      }
      
      .option-card {
        flex: none;
      }
    }
  `]
})
export class CreateLoadBalancerComponent implements OnInit {
  typeForm: FormGroup;
  facingForm: FormGroup;
  deploymentForm: FormGroup;
  generationForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loadBalancerService: LoadBalancerService
  ) {
    this.typeForm = this.fb.group({
      type: ['APPLICATION', Validators.required]
    });

    this.facingForm = this.fb.group({
      facing: ['EXTERNAL', Validators.required]
    });

    this.deploymentForm = this.fb.group({
      deployment: ['GLOBAL', Validators.required]
    });

    this.generationForm = this.fb.group({
      generation: ['GLOBAL_EXTERNAL', Validators.required]
    });
  }

  ngOnInit() {
    // Component initialization
  }

  navigateBack() {
    this.router.navigate(['/load-balancing']);
  }

  cancel() {
    this.router.navigate(['/load-balancing']);
  }

  selectType(type: 'APPLICATION' | 'NETWORK') {
    this.typeForm.patchValue({ type });
  }

  selectFacing(facing: 'EXTERNAL' | 'INTERNAL') {
    this.facingForm.patchValue({ facing });
  }

  selectDeployment(deployment: 'GLOBAL' | 'REGIONAL') {
    this.deploymentForm.patchValue({ deployment });
  }

  selectGeneration(generation: 'GLOBAL_EXTERNAL' | 'CLASSIC') {
    this.generationForm.patchValue({ generation });
  }

  getLoadBalancerTypeName(): string {
    const type = this.typeForm.get('type')?.value;
    return type === 'APPLICATION' ? 'Application Load Balancer' : 'Network Load Balancer';
  }

  createLoadBalancer() {
    const config: LoadBalancerConfig = {
      type: this.typeForm.get('type')?.value,
      facing: this.facingForm.get('facing')?.value,
      deployment: this.deploymentForm.get('deployment')?.value,
      generation: this.generationForm.get('generation')?.value
    };

    // Store configuration in service or pass as route params
    localStorage.setItem('loadBalancerConfig', JSON.stringify(config));
    
    // Navigate to detailed configuration page
    this.router.navigate(['/load-balancing/configure']);
  }
} 