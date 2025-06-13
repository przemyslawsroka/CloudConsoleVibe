import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { GcpDeploymentService, DeploymentConfig, DeploymentJob } from '../services/gcp-deployment.service';
import { VpcService, VpcNetwork, SubnetDetails } from '../../../services/vpc.service';
import { ProjectService } from '../../../services/project.service';

interface DeploymentProgress {
  step: number;
  message: string;
  percentage: number;
  status: 'in-progress' | 'completed' | 'failed';
  error?: string;
}

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
  deploymentId: string | null = null;
  
  // Backend URL
  private backendUrl = 'http://localhost:8080/api/v1/monitoring';
  
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
    private projectService: ProjectService,
    private http: HttpClient
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

    // Find the selected network
    const selectedNetwork = this.availableNetworks.find(n => n.name === networkName);
    console.log('🔍 Found network:', selectedNetwork);
    
    if (selectedNetwork) {
      // Check if we have detailed subnet information (demo mode)
      if (selectedNetwork.subnetDetails && selectedNetwork.subnetDetails.length > 0) {
        this.selectedNetworkSubnets = selectedNetwork.subnetDetails;
        console.log('✅ Subnets loaded from subnetDetails:', this.selectedNetworkSubnets);
      } 
      // Handle real GCP data with subnetworks URLs
      else if (selectedNetwork.subnetworks && selectedNetwork.subnetworks.length > 0) {
        this.selectedNetworkSubnets = this.extractSubnetsFromUrls(selectedNetwork.subnetworks);
        console.log('✅ Subnets extracted from URLs:', this.selectedNetworkSubnets);
      }
      // Fallback: create default subnets for the network
      else {
        this.selectedNetworkSubnets = this.createDefaultSubnets(networkName);
        console.log('✅ Created default subnets for network:', this.selectedNetworkSubnets);
      }
      
      // Auto-select first subnet if available
      if (this.selectedNetworkSubnets.length > 0) {
        this.deploymentForm.patchValue({ 
          subnetwork: this.selectedNetworkSubnets[0].name 
        });
        console.log('🎯 Auto-selected subnet:', this.selectedNetworkSubnets[0].name);
      }
    } else {
      this.selectedNetworkSubnets = [];
      console.log('❌ No network found with name:', networkName);
    }
  }

  private extractSubnetsFromUrls(subnetworkUrls: string[]): SubnetDetails[] {
    return subnetworkUrls.map((url, index) => {
      // Extract region and subnet name from URL
      // URL format: https://www.googleapis.com/compute/v1/projects/{project}/regions/{region}/subnetworks/{subnet}
      const urlParts = url.split('/');
      const region = urlParts[urlParts.length - 3] || 'us-central1';
      const subnetName = urlParts[urlParts.length - 1] || `subnet-${index + 1}`;
      
      return {
        name: subnetName,
        region: region,
        ipCidrRange: `10.${128 + index}.0.0/20`, // Generate reasonable CIDR
        gatewayAddress: `10.${128 + index}.0.1`,
        selfLink: url
      };
    });
  }

  private createDefaultSubnets(networkName: string): SubnetDetails[] {
    // Create default subnets for common regions
    const defaultRegions = ['us-central1', 'us-east1', 'europe-west1'];
    return defaultRegions.map((region, index) => ({
      name: `${networkName}-${region}`,
      region: region,
      ipCidrRange: `10.${index + 1}.0.0/24`,
      gatewayAddress: `10.${index + 1}.0.1`,
      selfLink: `https://www.googleapis.com/compute/v1/projects/demo-project/regions/${region}/subnetworks/${networkName}-${region}`
    }));
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
    this.deploymentId = null;

    // Reset deployment steps
    this.deploymentSteps.forEach(step => {
      step.active = false;
      step.completed = false;
    });

    // Start real deployment
    this.startRealDeployment();
  }

  private startRealDeployment(): void {
    const formValues = this.deploymentForm.value;
    const currentProject = this.projectService.getCurrentProject();
    
    if (!currentProject) {
      this.showError('No project selected');
      return;
    }

    const deploymentConfig = {
      agentName: formValues.agentName,
      network: formValues.network,
      subnetwork: formValues.subnetwork,
      collectionInterval: formValues.collectionInterval,
      defaultTargets: this.defaultTargets,
      customTargets: this.customTargets,
      projectId: currentProject.id
    };

    console.log('🚀 Starting real deployment with config:', deploymentConfig);
    this.addLog('Starting deployment of GoLang monitoring agent...');

    // Call backend to start deployment
    this.http.post<{success: boolean, deploymentId: string, message: string}>
      (`${this.backendUrl}/deploy`, deploymentConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.deploymentId = response.deploymentId;
            this.addLog(`Deployment started with ID: ${this.deploymentId}`);
            console.log('✅ Deployment started:', response);
            
            // Start polling for progress
            this.pollDeploymentProgress();
          } else {
            this.handleDeploymentError('Failed to start deployment');
          }
        },
        error: (error) => {
          console.error('❌ Failed to start deployment:', error);
          this.handleDeploymentError(error.message || 'Failed to start deployment');
        }
      });
  }

  private pollDeploymentProgress(): void {
    if (!this.deploymentId) return;

    const pollInterval = setInterval(() => {
      if (!this.deploymentId || this.deploymentComplete || this.deploymentError) {
        clearInterval(pollInterval);
        return;
      }

      this.http.get<{success: boolean, deployment: any}>
        (`${this.backendUrl}/deploy/${this.deploymentId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.deployment) {
              this.updateDeploymentProgress(response.deployment);
            }
          },
          error: (error) => {
            console.error('❌ Failed to get deployment status:', error);
            clearInterval(pollInterval);
          }
        });
    }, 2000); // Poll every 2 seconds
  }

  private updateDeploymentProgress(deployment: any): void {
    console.log('📊 Deployment progress update:', deployment);
    
    if (deployment.steps && deployment.steps.length > 0) {
      const latestStep = deployment.steps[deployment.steps.length - 1];
      
      // Update progress
      this.deploymentProgress = latestStep.percentage || 0;
      
      // Update step status
      if (latestStep.step >= 0 && latestStep.step < this.deploymentSteps.length) {
        // Mark previous steps as completed
        for (let i = 0; i < latestStep.step; i++) {
          this.deploymentSteps[i].active = false;
          this.deploymentSteps[i].completed = true;
        }
        
        // Update current step
        if (latestStep.status === 'in-progress') {
          this.deploymentSteps[latestStep.step].active = true;
          this.deploymentSteps[latestStep.step].completed = false;
        } else if (latestStep.status === 'completed') {
          this.deploymentSteps[latestStep.step].active = false;
          this.deploymentSteps[latestStep.step].completed = true;
        }
      }
      
      // Add log message
      if (latestStep.message) {
        this.addLog(latestStep.message);
      }
      
      // Check if deployment is complete
      if (deployment.status === 'completed') {
        this.completeRealDeployment(deployment);
      } else if (deployment.status === 'failed') {
        this.handleDeploymentError(deployment.error || 'Deployment failed');
      }
    }
  }

  private completeRealDeployment(deployment: any): void {
    this.deploymentInProgress = false;
    this.deploymentComplete = true;
    this.isDeploying = false;
    this.deploymentProgress = 100;
    
    // Extract deployment results
    if (deployment.result) {
      this.deployedAgentId = deployment.result.agentId;
      this.deployedVmName = deployment.result.vmInstance;
      
      this.addLog('✅ GoLang monitoring agent deployed successfully!');
      this.addLog(`🤖 Agent ID: ${this.deployedAgentId}`);
      this.addLog(`💻 VM Instance: ${this.deployedVmName}`);
      this.addLog(`🌐 External IP: ${deployment.result.externalIP}`);
      this.addLog(`🔒 Internal IP: ${deployment.result.internalIP}`);
      this.addLog('📊 Agent is now collecting network metrics...');
    }
    
    this.showSuccess('GoLang monitoring agent deployed successfully!');
  }

  private handleDeploymentError(errorMessage: string): void {
    this.deploymentInProgress = false;
    this.deploymentError = errorMessage;
    this.isDeploying = false;
    
    this.addLog(`❌ Deployment failed: ${errorMessage}`);
    this.showError(`Deployment failed: ${errorMessage}`);
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
    this.deploymentId = null;
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