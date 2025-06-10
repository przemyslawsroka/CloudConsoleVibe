import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { GcpDeploymentService, DeploymentConfig, DeploymentJob, GcpRegion, GcpMachineType } from '../services/gcp-deployment.service';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-agent-deploy',
  templateUrl: './agent-deploy.component.html',
  styleUrls: ['./agent-deploy.component.scss']
})
export class AgentDeployComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Form groups for each step (template compatibility)
  platformForm!: FormGroup;
  configForm!: FormGroup;
  resourceForm!: FormGroup;
  
  // Original forms
  basicConfigForm!: FormGroup;
  infraConfigForm!: FormGroup;
  agentConfigForm!: FormGroup;
  
  // Deployment options
  deploymentTypes = [
    { value: 'compute-engine', label: 'Compute Engine', description: 'Deploy to Google Compute Engine VM instances' },
    { value: 'gke', label: 'Google Kubernetes Engine', description: 'Deploy as Kubernetes pods in GKE cluster' },
    { value: 'cloud-run-jobs', label: 'Cloud Run Jobs', description: 'Deploy as scheduled Cloud Run jobs' }
  ];

  // Template compatibility properties
  targets: string[] = [];
  loadingResources = false;
  availableProjects: any[] = [];
  availableRegions: any[] = [];
  availableZones: any[] = [];
  availableMachineTypes: any[] = [];
  availableNetworks: any[] = [];
  availableClusters: any[] = [];
  deploymentInProgress = false;
  deploymentProgress = 0;
  deploymentComplete = false;
  deploymentError: string | null = null;
  deployedAgentId: string | null = null;
  deploymentSteps: any[] = [];
  deploymentLogs: any[] = [];
  estimatedCost = 0;
  
  // Platform options for template
  platforms = [
    {
      value: 'compute',
      name: 'Compute Engine',
      description: 'Deploy on Google Cloud virtual machines',
      icon: 'computer',
      tags: [
        { label: 'Popular', color: 'primary' },
        { label: 'Flexible', color: 'accent' }
      ]
    },
    {
      value: 'gke',
      name: 'Google Kubernetes Engine',
      description: 'Deploy as Kubernetes pods with auto-scaling',
      icon: 'account_tree',
      tags: [
        { label: 'Scalable', color: 'primary' },
        { label: 'Container', color: 'warn' }
      ]
    },
    {
      value: 'cloudrun',
      name: 'Cloud Run',
      description: 'Serverless container deployment with pay-per-use',
      icon: 'directions_run',
      tags: [
        { label: 'Serverless', color: 'accent' },
        { label: 'Cost-effective', color: 'primary' }
      ]
    }
  ];

  // GCP resources
  regions: GcpRegion[] = [];
  zones: string[] = [];
  machineTypes: GcpMachineType[] = [];
  networks: any[] = [];
  subnets: any[] = [];

  // UI state
  isLoading = false;
  isDeploying = false;
  deploymentResult: DeploymentJob | null = null;
  
  // Predefined target options
  commonTargets = [
    { name: 'Google DNS', value: '8.8.8.8' },
    { name: 'Cloudflare DNS', value: '1.1.1.1' },
    { name: 'OpenDNS', value: '208.67.222.222' },
    { name: 'Google Public DNS IPv6', value: '2001:4860:4860::8888' }
  ];

  constructor(
    private fb: FormBuilder,
    private gcpService: GcpDeploymentService,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) {
    this.initializeForms();
    this.initializeTemplateCompatibilityForms();
  }

  ngOnInit(): void {
    this.loadGcpResources();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Basic configuration form
    this.basicConfigForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      deploymentType: ['compute-engine', Validators.required]
    });

    // Infrastructure configuration form
    this.infraConfigForm = this.fb.group({
      region: ['', Validators.required],
      zone: [''],
      machineType: ['e2-micro', Validators.required],
      vpc: ['default'],
      subnet: [''],
      preemptible: [false],
      automaticRestart: [true],
      // GKE specific
      cluster: [''],
      namespace: ['default'],
      replicas: [1],
      // Cloud Run Jobs specific
      schedule: [''],
      maxRetries: [3],
      timeout: ['3600s']
    });

    // Agent configuration form
    this.agentConfigForm = this.fb.group({
      version: ['latest', Validators.required],
      collectionInterval: [30, [Validators.required, Validators.min(10)]],
      transmissionInterval: [60, [Validators.required, Validators.min(30)]],
      targets: this.fb.array([]),
      customTargets: ['']
    });

    // Add default ping targets
    this.addTarget('8.8.8.8');
    this.addTarget('1.1.1.1');
  }

  private initializeTemplateCompatibilityForms(): void {
    // Initialize template compatibility forms that mirror the original ones
    this.platformForm = this.fb.group({
      platform: ['compute', Validators.required]
    });

    this.configForm = this.fb.group({
      agentName: ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9-]*$/)]],
      interval: [60, [Validators.required, Validators.min(30)]]
    });

    this.resourceForm = this.fb.group({
      project: ['', Validators.required],
      region: ['us-central1', Validators.required],
      zone: [''],
      machineType: ['e2-micro'],
      network: [''],
      cluster: [''],
      namespace: ['default'],
      memory: ['512Mi'],
      cpu: ['1']
    });

    // Initialize with current project from project service
    this.loadProjects();
    
    // Initialize available regions, zones, networks arrays
    this.availableRegions = [];
    this.availableZones = [];
    this.availableMachineTypes = [];
    this.availableNetworks = [];
  }

  private loadProjects(): void {
    // Get current project and load available projects
    const currentProject = this.projectService.getCurrentProject();
    if (currentProject) {
      this.availableProjects = [
        { id: currentProject.id, name: currentProject.name }
      ];
      this.resourceForm.patchValue({ project: currentProject.id });
    } else {
      // If no project is selected, load available projects
      this.projectService.loadProjects().subscribe({
        next: (projects) => {
          this.availableProjects = projects.map(p => ({ id: p.id, name: p.name }));
          if (projects.length > 0) {
            this.resourceForm.patchValue({ project: projects[0].id });
          }
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          // Fallback to demo projects
          this.availableProjects = [
            { id: 'demo-project-123', name: 'Demo Project' }
          ];
          this.resourceForm.patchValue({ project: 'demo-project-123' });
        }
      });
    }
  }

  private loadGcpResources(): void {
    this.isLoading = true;

    // Load regions
    this.gcpService.getRegions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (regions) => {
          this.regions = regions;
          this.availableRegions = regions.map(r => ({ name: r.name, description: r.displayName }));
          this.isLoading = false;
          
          // Auto-load zones and machine types for the default region
          const defaultRegion = this.resourceForm.get('region')?.value || 'us-central1';
          if (defaultRegion) {
            this.onRegionChange(defaultRegion);
          }
        },
        error: (error) => {
          console.error('Error loading regions:', error);
          this.showError('Failed to load GCP regions');
          this.isLoading = false;
        }
      });

    // Load networks
    this.gcpService.getNetworks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (networks) => {
          this.networks = networks;
          this.availableNetworks = networks;
        },
        error: (error) => {
          console.error('Error loading networks:', error);
        }
      });
  }

  // Form event handlers
  onRegionChange(region?: string): void {
    const selectedRegion = region || this.resourceForm.get('region')?.value || this.infraConfigForm.get('region')?.value;
    console.log('🔄 Region changed to:', selectedRegion);
    if (selectedRegion) {
      this.loadZones(selectedRegion);
      this.loadMachineTypes(selectedRegion);
    }
  }

  onNetworkChange(): void {
    const network = this.resourceForm.get('network')?.value || this.infraConfigForm.get('vpc')?.value;
    console.log('🔄 Network changed to:', network);
    if (network) {
      this.loadSubnets(network);
    }
  }

  onDeploymentTypeChange(): void {
    const deploymentType = this.basicConfigForm.get('deploymentType')?.value;
    this.updateFormValidation(deploymentType);
  }

  private loadZones(region: string): void {
    console.log('🔄 Loading zones for region:', region);
    this.gcpService.getZones(region)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (zones) => {
          console.log('✅ Zones loaded:', zones);
          this.zones = zones;
        },
        error: (error) => {
          console.error('❌ Error loading zones:', error);
        }
      });
  }

  private loadMachineTypes(region: string): void {
    console.log('🔄 Loading machine types for region:', region);
    this.gcpService.getMachineTypes(region)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (machineTypes) => {
          console.log('✅ Machine types loaded:', machineTypes);
          this.machineTypes = machineTypes;
        },
        error: (error) => {
          console.error('❌ Error loading machine types:', error);
        }
      });
  }

  private loadSubnets(network: string): void {
    this.gcpService.getSubnets(network)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subnets) => {
          this.subnets = subnets;
        },
        error: (error) => {
          console.error('Error loading subnets:', error);
        }
      });
  }

  private updateFormValidation(deploymentType: string): void {
    const infraForm = this.infraConfigForm;

    // Reset all validators
    Object.keys(infraForm.controls).forEach(key => {
      infraForm.get(key)?.clearValidators();
    });

    // Add required validators based on deployment type
    infraForm.get('region')?.setValidators([Validators.required]);
    infraForm.get('machineType')?.setValidators([Validators.required]);

    switch (deploymentType) {
      case 'compute-engine':
        infraForm.get('zone')?.setValidators([Validators.required]);
        break;
      case 'gke':
        infraForm.get('cluster')?.setValidators([Validators.required]);
        infraForm.get('namespace')?.setValidators([Validators.required]);
        break;
      case 'cloud-run-jobs':
        // No additional validators for Cloud Run Jobs
        break;
    }

    // Update form validation
    Object.keys(infraForm.controls).forEach(key => {
      infraForm.get(key)?.updateValueAndValidity();
    });
  }

  // Target management
  get targetsArray(): FormArray {
    return this.agentConfigForm.get('targets') as FormArray;
  }

  addTarget(target?: string): void {
    const targetControl = this.fb.control(target || '', Validators.required);
    this.targetsArray.push(targetControl);
  }

  removeTarget(indexOrTarget: number | string): void {
    if (typeof indexOrTarget === 'number') {
      // Original functionality for FormArray
      this.targetsArray.removeAt(indexOrTarget);
    } else {
      // Template compatibility for target string
      const index = this.targets.indexOf(indexOrTarget);
      if (index > -1) {
        this.targets.splice(index, 1);
      }
    }
  }

  addCommonTarget(target: string): void {
    this.addTarget(target);
  }

  addCustomTargets(): void {
    const customTargets = this.agentConfigForm.get('customTargets')?.value;
    if (customTargets) {
      const targets = customTargets.split(',').map((t: string) => t.trim()).filter((t: string) => t);
      targets.forEach((target: string) => this.addTarget(target));
      this.agentConfigForm.get('customTargets')?.setValue('');
    }
  }

  // Deployment
  async deploy(): Promise<void> {
    if (!this.isValidConfiguration()) {
      this.showError('Please complete all required fields');
      return;
    }

    this.isDeploying = true;

    try {
      const config = this.buildDeploymentConfig();
      
      // Validate configuration first
      await this.gcpService.validateDeploymentConfig(config).toPromise();

      // Deploy based on type
      let deploymentObservable;
      
      switch (config.deploymentType) {
        case 'compute-engine':
          deploymentObservable = this.gcpService.deployToComputeEngine(config);
          break;
        case 'gke':
          deploymentObservable = this.gcpService.deployToGKE(config as any);
          break;
        case 'cloud-run-jobs':
          deploymentObservable = this.gcpService.deployToCloudRunJobs(config as any);
          break;
        default:
          throw new Error('Invalid deployment type');
      }

      deploymentObservable
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.deploymentResult = result;
            this.showSuccess('Deployment started successfully!');
            this.monitorDeployment(result.id);
          },
          error: (error) => {
            console.error('Deployment error:', error);
            this.showError('Deployment failed: ' + (error.message || 'Unknown error'));
            this.isDeploying = false;
          }
        });

    } catch (error: any) {
      console.error('Configuration validation error:', error);
      this.showError('Configuration validation failed: ' + (error.message || 'Unknown error'));
      this.isDeploying = false;
    }
  }

  private buildDeploymentConfig(): DeploymentConfig {
    const basic = this.basicConfigForm.value;
    const infra = this.infraConfigForm.value;
    const agent = this.agentConfigForm.value;

    return {
      name: basic.name,
      description: basic.description,
      region: infra.region,
      zone: infra.zone,
      machineType: infra.machineType,
      deploymentType: basic.deploymentType,
      networkConfig: {
        vpc: infra.vpc,
        subnet: infra.subnet,
        firewall: ['allow-monitoring-agent']
      },
      agentConfig: {
        version: agent.version,
        targets: agent.targets.filter((t: string) => t.trim()),
        collection_interval: agent.collectionInterval,
        transmission_interval: agent.transmissionInterval
      },
      scheduling: {
        preemptible: infra.preemptible,
        automaticRestart: infra.automaticRestart
      }
    };
  }

  private isValidConfiguration(): boolean {
    return this.basicConfigForm.valid && 
           this.infraConfigForm.valid && 
           this.agentConfigForm.valid &&
           this.targetsArray.length > 0;
  }

  private monitorDeployment(deploymentId: string): void {
    const checkStatus = () => {
      this.gcpService.getDeployment(deploymentId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (deployment) => {
            this.deploymentResult = deployment;
            
            if (['completed', 'failed', 'cancelled'].includes(deployment.status)) {
              this.isDeploying = false;
              
              if (deployment.status === 'completed') {
                this.showSuccess('Deployment completed successfully!');
              } else if (deployment.status === 'failed') {
                this.showError('Deployment failed: ' + (deployment.error || 'Unknown error'));
              }
            } else {
              // Continue monitoring
              setTimeout(checkStatus, 5000);
            }
          },
          error: (error) => {
            console.error('Error monitoring deployment:', error);
            this.isDeploying = false;
          }
        });
    };

    setTimeout(checkStatus, 2000); // Start monitoring after 2 seconds
  }

  // Cost estimation
  estimateCost(): void {
    if (!this.infraConfigForm.valid) {
      this.showError('Please complete infrastructure configuration first');
      return;
    }

    const config = this.buildDeploymentConfig();
    
    this.gcpService.estimateCost(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estimate) => {
          // Show cost estimate dialog or panel
          console.log('Cost estimate:', estimate);
          this.showSuccess(`Estimated monthly cost: $${estimate.monthly || 'N/A'}`);
        },
        error: (error) => {
          console.error('Error estimating cost:', error);
          this.showError('Failed to estimate cost');
        }
      });
  }

  // Utility methods
  getMachineTypeDetails(machineType: string): GcpMachineType | undefined {
    return this.machineTypes.find(mt => mt.name === machineType);
  }

  resetForm(): void {
    this.basicConfigForm.reset();
    this.infraConfigForm.reset();
    this.agentConfigForm.reset();
    this.initializeForms();
    this.deploymentResult = null;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'success-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 7000,
      panelClass: 'error-snackbar'
    });
  }

  // Template compatibility methods
  addPresetTargets(preset: string): void {
    const presetTargets: { [key: string]: string[] } = {
      'dns': ['8.8.8.8', '1.1.1.1', '208.67.222.222'],
      'cloud': ['googleapis.com', 'storage.googleapis.com', 'compute.googleapis.com'],
      'regional': ['google.com', 'facebook.com', 'amazon.com']
    };

    const targetsToAdd = presetTargets[preset] || [];
    targetsToAdd.forEach(target => {
      if (!this.targets.includes(target)) {
        this.targets.push(target);
      }
    });
  }

  addCustomTarget(target: string): void {
    if (target && target.trim() && !this.targets.includes(target.trim())) {
      this.targets.push(target.trim());
    }
  }

  onProjectChange(projectId: string): void {
    console.log('Project changed:', projectId);
  }

  getPlatformName(): string {
    const platform = this.platforms.find(p => p.value === this.platformForm?.get('platform')?.value);
    return platform ? platform.name : '';
  }

  startDeployment(): void {
    this.deploymentInProgress = true;
    this.deploymentProgress = 0;
    this.deploymentError = null;
    this.deploymentLogs = [];

    // Use existing deploy method
    this.deploy().then(() => {
      this.deploymentComplete = true;
      this.deploymentInProgress = false;
      this.deployedAgentId = `agent-${Date.now()}`;
    }).catch((error) => {
      this.deploymentError = error.message || 'Deployment failed';
      this.deploymentInProgress = false;
    });
  }

  resetDeployment(): void {
    this.deploymentInProgress = false;
    this.deploymentComplete = false;
    this.deploymentError = null;
    this.deployedAgentId = null;
    this.deploymentProgress = 0;
    this.deploymentLogs = [];
  }
} 