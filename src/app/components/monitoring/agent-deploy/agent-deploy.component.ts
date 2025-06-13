import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { GcpDeploymentService, DeploymentConfig, DeploymentJob } from '../services/gcp-deployment.service';
import { VpcService, VpcNetwork, SubnetDetails } from '../../../services/vpc.service';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-agent-deploy',
  templateUrl: './agent-deploy.component.html',
  styleUrls: ['./agent-deploy.component.scss']
})
export class AgentDeployComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Main deployment form
  deploymentForm!: FormGroup;
  
  // Available resources
  availableNetworks: VpcNetwork[] = [];
  selectedNetworkSubnets: SubnetDetails[] = [];
  
  // Default monitoring targets
  defaultTargets = ['8.8.8.8', '1.1.1.1', 'google.com', 'cloudflare.com'];
  customTargets: string[] = [];
  
  // Deployment state
  isDeploying = false;
  deploymentInProgress = false;
  deploymentProgress = 0;
  deploymentComplete = false;
  deploymentError: string | null = null;
  deployedAgentId: string | null = null;
  deployedVmName: string | null = null;
  
  // Deployment steps for progress tracking
  deploymentSteps = [
    { name: 'Validating Configuration', active: false, completed: false },
    { name: 'Creating VM Instance', active: false, completed: false },
    { name: 'Installing Monitoring Agent', active: false, completed: false },
    { name: 'Configuring Network Monitoring', active: false, completed: false },
    { name: 'Starting Agent Services', active: false, completed: false }
  ];
  
  deploymentLogs: Array<{ timestamp: Date, message: string }> = [];

  constructor(
    private fb: FormBuilder,
    private gcpService: GcpDeploymentService,
    private vpcService: VpcService,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadNetworks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.deploymentForm = this.fb.group({
      agentName: ['monitoring-agent-1', [Validators.required, Validators.pattern(/^[a-z][a-z0-9-]*$/)]],
      collectionInterval: [60, [Validators.required, Validators.min(30)]],
      network: ['', Validators.required],
      subnetwork: ['', Validators.required]
    });
  }

  private loadNetworks(): void {
    const currentProject = this.projectService.getCurrentProject();
    if (!currentProject) {
      this.showError('No project selected');
      return;
    }

    console.log('🔄 Loading networks for project:', currentProject.id);
    this.vpcService.getVpcNetworks(currentProject.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (networks) => {
          console.log('✅ Networks loaded:', networks);
          this.availableNetworks = networks;
          
          // Auto-select default network if available
          const defaultNetwork = networks.find(n => n.name === 'default');
          if (defaultNetwork) {
            console.log('🎯 Auto-selecting default network:', defaultNetwork);
            this.deploymentForm.patchValue({ network: defaultNetwork.name });
            this.onNetworkChange(defaultNetwork.name);
          } else if (networks.length > 0) {
            // If no default network, select the first available
            console.log('🎯 Auto-selecting first network:', networks[0]);
            this.deploymentForm.patchValue({ network: networks[0].name });
            this.onNetworkChange(networks[0].name);
          }
        },
        error: (error) => {
          console.error('❌ Error loading networks:', error);
          this.showError('Failed to load networks');
        }
      });
  }

  onNetworkChange(networkName: string): void {
    console.log('🔄 Network changed to:', networkName);
    
    if (!networkName) {
      this.selectedNetworkSubnets = [];
      return;
    }

    // Find the selected network and use its subnetDetails
    const selectedNetwork = this.availableNetworks.find(n => n.name === networkName);
    console.log('🔍 Found network:', selectedNetwork);
    
    if (selectedNetwork && selectedNetwork.subnetDetails) {
      this.selectedNetworkSubnets = selectedNetwork.subnetDetails;
      console.log('✅ Subnets loaded from network details:', this.selectedNetworkSubnets);
      
      // Auto-select first subnet if available
      if (this.selectedNetworkSubnets.length > 0) {
        this.deploymentForm.patchValue({ 
          subnetwork: this.selectedNetworkSubnets[0].name 
        });
        console.log('🎯 Auto-selected subnet:', this.selectedNetworkSubnets[0].name);
      }
    } else {
      this.selectedNetworkSubnets = [];
      console.log('❌ No subnets found for network:', networkName);
    }
  }

  addCustomTarget(target: string): void {
    if (target && target.trim() && !this.customTargets.includes(target.trim())) {
      this.customTargets.push(target.trim());
    }
  }

  removeCustomTarget(target: string): void {
    const index = this.customTargets.indexOf(target);
    if (index >= 0) {
      this.customTargets.splice(index, 1);
    }
  }

  deployAgent(): void {
    if (!this.deploymentForm.valid) {
      this.showError('Please complete all required fields');
      return;
    }

    this.startDeployment();
  }

  private startDeployment(): void {
    this.deploymentInProgress = true;
    this.deploymentProgress = 0;
    this.deploymentError = null;
    this.deploymentLogs = [];
    this.isDeploying = true;

    // Reset deployment steps
    this.deploymentSteps.forEach(step => {
      step.active = false;
      step.completed = false;
    });

    // Start deployment simulation
    this.simulateDeployment();
  }

  private simulateDeployment(): void {
    const steps = [
      { step: 0, delay: 1000, message: 'Validating network configuration...' },
      { step: 1, delay: 2000, message: 'Creating e2-micro VM instance...' },
      { step: 2, delay: 3000, message: 'Installing monitoring agent software...' },
      { step: 3, delay: 2000, message: 'Configuring network monitoring targets...' },
      { step: 4, delay: 1500, message: 'Starting monitoring services...' }
    ];

    let currentStep = 0;
    
    const executeStep = () => {
      if (currentStep < steps.length) {
        const stepInfo = steps[currentStep];
        
        // Mark current step as active
        this.deploymentSteps[stepInfo.step].active = true;
        this.addLog(stepInfo.message);
        
        setTimeout(() => {
          // Mark current step as completed
          this.deploymentSteps[stepInfo.step].active = false;
          this.deploymentSteps[stepInfo.step].completed = true;
          this.deploymentProgress = ((currentStep + 1) / steps.length) * 100;
          
          currentStep++;
          executeStep();
        }, stepInfo.delay);
      } else {
        // Deployment completed
        this.completeDeployment();
      }
    };

    executeStep();
  }

  private completeDeployment(): void {
    this.deploymentInProgress = false;
    this.deploymentComplete = true;
    this.isDeploying = false;
    
    // Generate deployment results
    const formValues = this.deploymentForm.value;
    const timestamp = Date.now();
    
    this.deployedAgentId = `agent-${timestamp}`;
    this.deployedVmName = `${formValues.agentName}-vm-${timestamp.toString().slice(-6)}`;
    
    this.addLog('Monitoring agent deployed successfully!');
    this.addLog(`Agent ID: ${this.deployedAgentId}`);
    this.addLog(`VM Instance: ${this.deployedVmName}`);
    this.addLog('Agent is now collecting network metrics...');
    
    this.showSuccess('Monitoring agent deployed successfully!');
  }

  private addLog(message: string): void {
    this.deploymentLogs.push({
      timestamp: new Date(),
      message: message
    });
  }

  resetForm(): void {
    this.deploymentForm.reset();
    this.customTargets = [];
    this.selectedNetworkSubnets = [];
    
    // Reset to default values
    this.deploymentForm.patchValue({
      agentName: 'monitoring-agent-1',
      collectionInterval: 60
    });
    
    // Reload networks and auto-select default
    this.loadNetworks();
  }

  resetDeployment(): void {
    this.deploymentInProgress = false;
    this.deploymentComplete = false;
    this.deploymentError = null;
    this.deployedAgentId = null;
    this.deployedVmName = null;
    this.deploymentProgress = 0;
    this.deploymentLogs = [];
    this.isDeploying = false;
    
    // Reset deployment steps
    this.deploymentSteps.forEach(step => {
      step.active = false;
      step.completed = false;
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
} 