import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

interface WizardStep {
  title: string;
  description: string;
  completed: boolean;
}

interface TerraformConfig {
  projectId: string;
  region: string;
  applicationName: string;
  hostingType: 'vm' | 'gke' | 'cloud-run' | 'app-engine';
  sslCertificate: 'managed' | 'self-managed' | 'none';
  cdnEnabled: boolean;
  wafEnabled: boolean;
  backendConfig: any;
  networkConfig: any;
}

@Component({
  selector: 'app-global-frontend-wizard',
  template: `
    <div class="wizard-container">
      <div class="wizard-header">
        <h1>Global Front End Solution Wizard</h1>
        <p>Configure a global application load balancer with worldwide availability</p>
      </div>

      <div class="wizard-content">
        <!-- Progress Stepper -->
        <mat-stepper [selectedIndex]="currentStep" orientation="horizontal" class="wizard-stepper">
          <mat-step *ngFor="let step of steps; let i = index" [completed]="step.completed">
            <ng-template matStepLabel>{{ step.title }}</ng-template>
          </mat-step>
        </mat-stepper>

        <!-- Step Content -->
        <div class="step-content">
          <!-- Step 1: Project Configuration -->
          <div *ngIf="currentStep === 0" class="step-panel">
            <h2>Project Configuration</h2>
            <p>Configure your GCP project and basic settings</p>
            
            <form [formGroup]="projectForm" class="step-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Project ID</mat-label>
                <input matInput formControlName="projectId" placeholder="my-gcp-project">
                <mat-hint>Your Google Cloud Project ID</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Application Name</mat-label>
                <input matInput formControlName="applicationName" placeholder="my-global-app">
                <mat-hint>Name for your application resources</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Primary Region</mat-label>
                <mat-select formControlName="region">
                  <mat-option value="us-central1">us-central1 (Iowa)</mat-option>
                  <mat-option value="us-east1">us-east1 (South Carolina)</mat-option>
                  <mat-option value="us-west1">us-west1 (Oregon)</mat-option>
                  <mat-option value="europe-west1">europe-west1 (Belgium)</mat-option>
                  <mat-option value="asia-east1">asia-east1 (Taiwan)</mat-option>
                </mat-select>
              </mat-form-field>
            </form>
          </div>

          <!-- Step 2: Hosting Configuration -->
          <div *ngIf="currentStep === 1" class="step-panel">
            <h2>Choose Your Hosting Platform</h2>
            <p>Select how you want to host your application backend</p>
            
            <div class="hosting-options">
              <mat-card class="hosting-option" 
                        [class.selected]="hostingType === 'vm'"
                        (click)="selectHostingType('vm')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>computer</mat-icon>
                  <mat-card-title>Compute Engine VMs</mat-card-title>
                  <mat-card-subtitle>Virtual machines with full control</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Legacy applications, custom configurations, full OS control</p>
                  <ul>
                    <li>Instance Templates & Managed Instance Groups</li>
                    <li>Auto-scaling and health checks</li>
                    <li>Custom machine types</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="hosting-option" 
                        [class.selected]="hostingType === 'gke'"
                        (click)="selectHostingType('gke')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>view_in_ar</mat-icon>
                  <mat-card-title>Google Kubernetes Engine</mat-card-title>
                  <mat-card-subtitle>Containerized applications</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Microservices, containerized apps, DevOps workflows</p>
                  <ul>
                    <li>Kubernetes clusters with auto-scaling</li>
                    <li>Container orchestration</li>
                    <li>Service mesh integration</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="hosting-option" 
                        [class.selected]="hostingType === 'cloud-run'"
                        (click)="selectHostingType('cloud-run')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>directions_run</mat-icon>
                  <mat-card-title>Cloud Run</mat-card-title>
                  <mat-card-subtitle>Serverless containers</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Stateless applications, event-driven workloads</p>
                  <ul>
                    <li>Fully managed serverless platform</li>
                    <li>Pay-per-request pricing</li>
                    <li>Automatic scaling to zero</li>
                  </ul>
                </mat-card-content>
              </mat-card>

              <mat-card class="hosting-option" 
                        [class.selected]="hostingType === 'app-engine'"
                        (click)="selectHostingType('app-engine')">
                <mat-card-header>
                  <mat-icon mat-card-avatar>web</mat-icon>
                  <mat-card-title>App Engine</mat-card-title>
                  <mat-card-subtitle>Platform as a Service</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Best for: Web applications, rapid development</p>
                  <ul>
                    <li>Zero server management</li>
                    <li>Built-in services integration</li>
                    <li>Multiple runtime support</li>
                  </ul>
                </mat-card-content>
              </mat-card>
            </div>
          </div>

          <!-- Step 3: Load Balancer Configuration -->
          <div *ngIf="currentStep === 2" class="step-panel">
            <h2>Load Balancer & Security Configuration</h2>
            <p>Configure SSL, CDN, and security features</p>
            
            <form [formGroup]="lbForm" class="step-form">
              <div class="config-section">
                <h3>SSL Certificate</h3>
                <mat-radio-group formControlName="sslCertificate" class="radio-group">
                  <mat-radio-button value="managed">
                    <div class="radio-content">
                      <strong>Google-managed SSL certificate</strong>
                      <p>Automatically provisioned and renewed</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="self-managed">
                    <div class="radio-content">
                      <strong>Self-managed certificate</strong>
                      <p>Upload your own SSL certificate</p>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="none">
                    <div class="radio-content">
                      <strong>No SSL (HTTP only)</strong>
                      <p>Not recommended for production</p>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="config-section">
                <h3>Performance & Security</h3>
                <div class="checkbox-group">
                  <mat-checkbox formControlName="cdnEnabled">
                    <div class="checkbox-content">
                      <strong>Enable Cloud CDN</strong>
                      <p>Cache content globally for faster delivery</p>
                    </div>
                  </mat-checkbox>
                  
                  <mat-checkbox formControlName="wafEnabled">
                    <div class="checkbox-content">
                      <strong>Enable Cloud Armor (WAF)</strong>
                      <p>Protect against DDoS and web attacks</p>
                    </div>
                  </mat-checkbox>
                </div>
              </div>

              <div class="config-section" *ngIf="hostingType === 'vm'">
                <h3>VM Configuration</h3>
                <mat-form-field appearance="outline">
                  <mat-label>Machine Type</mat-label>
                  <mat-select formControlName="machineType">
                    <mat-option value="e2-micro">e2-micro (1 vCPU, 1GB RAM)</mat-option>
                    <mat-option value="e2-small">e2-small (1 vCPU, 2GB RAM)</mat-option>
                    <mat-option value="e2-medium">e2-medium (1 vCPU, 4GB RAM)</mat-option>
                    <mat-option value="e2-standard-2">e2-standard-2 (2 vCPU, 8GB RAM)</mat-option>
                    <mat-option value="e2-standard-4">e2-standard-4 (4 vCPU, 16GB RAM)</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Min Instances</mat-label>
                  <input matInput type="number" formControlName="minInstances" min="1" max="10">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Max Instances</mat-label>
                  <input matInput type="number" formControlName="maxInstances" min="1" max="100">
                </mat-form-field>
              </div>
            </form>
          </div>

          <!-- Step 4: Review & Generate -->
          <div *ngIf="currentStep === 3" class="step-panel">
            <h2>Review Configuration</h2>
            <p>Review your settings and generate Terraform configuration</p>
            
            <div class="review-section">
              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Project Configuration</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Project ID:</strong> {{ projectForm.get('projectId')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Application Name:</strong> {{ projectForm.get('applicationName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Primary Region:</strong> {{ projectForm.get('region')?.value }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Hosting Platform</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>Platform:</strong> {{ getHostingDisplayName(hostingType) }}
                  </div>
                  <div class="review-item" *ngIf="hostingType === 'vm'">
                    <strong>Machine Type:</strong> {{ lbForm.get('machineType')?.value }}
                  </div>
                  <div class="review-item" *ngIf="hostingType === 'vm'">
                    <strong>Instance Range:</strong> {{ lbForm.get('minInstances')?.value }} - {{ lbForm.get('maxInstances')?.value }}
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="review-card">
                <mat-card-header>
                  <mat-card-title>Load Balancer & Security</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="review-item">
                    <strong>SSL Certificate:</strong> {{ getSslDisplayName(lbForm.get('sslCertificate')?.value) }}
                  </div>
                  <div class="review-item">
                    <strong>Cloud CDN:</strong> {{ lbForm.get('cdnEnabled')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                  <div class="review-item">
                    <strong>Cloud Armor:</strong> {{ lbForm.get('wafEnabled')?.value ? 'Enabled' : 'Disabled' }}
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <div class="terraform-section">
              <h3>Generated Terraform Configuration</h3>
              <mat-card class="terraform-card">
                <mat-card-content>
                  <pre class="terraform-code">{{ generatedTerraform }}</pre>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-raised-button color="primary" (click)="downloadTerraform()">
                    <mat-icon>download</mat-icon>
                    Download Terraform Files
                  </button>
                  <button mat-stroked-button (click)="copyTerraform()">
                    <mat-icon>content_copy</mat-icon>
                    Copy to Clipboard
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="wizard-navigation">
          <button mat-stroked-button 
                  [disabled]="currentStep === 0" 
                  (click)="previousStep()">
            <mat-icon>arrow_back</mat-icon>
            Previous
          </button>
          
          <div class="nav-spacer"></div>
          
          <button mat-raised-button 
                  color="primary"
                  *ngIf="currentStep < 3"
                  [disabled]="!isCurrentStepValid()"
                  (click)="nextStep()">
            Next
            <mat-icon>arrow_forward</mat-icon>
          </button>
          
          <button mat-raised-button 
                  color="primary"
                  *ngIf="currentStep === 3"
                  (click)="generateTerraform()">
            <mat-icon>build</mat-icon>
            Generate Terraform
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--background-color);
      color: var(--text-color);
      min-height: 100vh;
    }

    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .wizard-header h1 {
      color: var(--primary-color);
      font-size: 32px;
      margin-bottom: 8px;
    }

    .wizard-header p {
      color: var(--text-secondary);
      font-size: 16px;
    }

    .wizard-stepper {
      margin-bottom: 32px;
    }

    .step-content {
      min-height: 500px;
      margin-bottom: 32px;
    }

    .step-panel {
      background: var(--card-background);
      border-radius: 8px;
      padding: 24px;
      border: 1px solid var(--border-color);
    }

    .step-panel h2 {
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .step-panel p {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .step-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .hosting-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .hosting-option {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid var(--border-color);
    }

    .hosting-option:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
    }

    .hosting-option.selected {
      border-color: var(--primary-color);
      background: var(--primary-background);
    }

    .hosting-option ul {
      margin: 8px 0 0 0;
      padding-left: 16px;
    }

    .hosting-option li {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .config-section {
      margin-bottom: 24px;
    }

    .config-section h3 {
      color: var(--text-color);
      margin-bottom: 16px;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-content, .checkbox-content {
      margin-left: 8px;
    }

    .radio-content strong, .checkbox-content strong {
      display: block;
      color: var(--text-color);
    }

    .radio-content p, .checkbox-content p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .review-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .review-card {
      border: 1px solid var(--border-color);
    }

    .review-item {
      margin-bottom: 8px;
      padding: 4px 0;
    }

    .review-item strong {
      color: var(--text-color);
      margin-right: 8px;
    }

    .terraform-section {
      margin-top: 32px;
    }

    .terraform-card {
      border: 1px solid var(--border-color);
    }

    .terraform-code {
      background: var(--table-header-background);
      padding: 16px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 400px;
      overflow-y: auto;
    }

    .wizard-navigation {
      display: flex;
      align-items: center;
      padding: 16px 0;
      border-top: 1px solid var(--border-color);
    }

    .nav-spacer {
      flex: 1;
    }

    @media (max-width: 768px) {
      .wizard-container {
        padding: 16px;
      }

      .hosting-options {
        grid-template-columns: 1fr;
      }

      .review-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GlobalFrontendWizardComponent implements OnInit {
  currentStep = 0;
  hostingType: 'vm' | 'gke' | 'cloud-run' | 'app-engine' = 'vm';
  generatedTerraform = '';

  steps: WizardStep[] = [
    { title: 'Project Setup', description: 'Configure project and basic settings', completed: false },
    { title: 'Hosting Platform', description: 'Choose your backend hosting', completed: false },
    { title: 'Load Balancer', description: 'Configure SSL, CDN, and security', completed: false },
    { title: 'Review & Generate', description: 'Review and generate Terraform', completed: false }
  ];

  projectForm: FormGroup;
  lbForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      projectId: ['', Validators.required],
      applicationName: ['', Validators.required],
      region: ['us-central1', Validators.required]
    });

    this.lbForm = this.fb.group({
      sslCertificate: ['managed', Validators.required],
      cdnEnabled: [true],
      wafEnabled: [false],
      machineType: ['e2-medium'],
      minInstances: [2, [Validators.min(1), Validators.max(10)]],
      maxInstances: [10, [Validators.min(1), Validators.max(100)]]
    });
  }

  ngOnInit() {}

  nextStep() {
    if (this.isCurrentStepValid()) {
      this.steps[this.currentStep].completed = true;
      this.currentStep++;
      if (this.currentStep === 3) {
        this.generateTerraform();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.projectForm.valid;
      case 1:
        return !!this.hostingType;
      case 2:
        return this.lbForm.valid;
      default:
        return true;
    }
  }

  selectHostingType(type: 'vm' | 'gke' | 'cloud-run' | 'app-engine') {
    this.hostingType = type;
  }

  getHostingDisplayName(type: string): string {
    const names = {
      'vm': 'Compute Engine VMs',
      'gke': 'Google Kubernetes Engine',
      'cloud-run': 'Cloud Run',
      'app-engine': 'App Engine'
    };
    return names[type as keyof typeof names] || type;
  }

  getSslDisplayName(type: string): string {
    const names = {
      'managed': 'Google-managed SSL',
      'self-managed': 'Self-managed SSL',
      'none': 'No SSL (HTTP only)'
    };
    return names[type as keyof typeof names] || type;
  }

  generateTerraform() {
    const config = this.buildTerraformConfig();
    this.generatedTerraform = this.buildTerraformScript(config);
    this.snackBar.open('Terraform configuration generated successfully!', 'Close', {
      duration: 3000
    });
  }

  private buildTerraformConfig(): TerraformConfig {
    return {
      projectId: this.projectForm.get('projectId')?.value,
      region: this.projectForm.get('region')?.value,
      applicationName: this.projectForm.get('applicationName')?.value,
      hostingType: this.hostingType,
      sslCertificate: this.lbForm.get('sslCertificate')?.value,
      cdnEnabled: this.lbForm.get('cdnEnabled')?.value,
      wafEnabled: this.lbForm.get('wafEnabled')?.value,
      backendConfig: {
        machineType: this.lbForm.get('machineType')?.value,
        minInstances: this.lbForm.get('minInstances')?.value,
        maxInstances: this.lbForm.get('maxInstances')?.value
      },
      networkConfig: {}
    };
  }

  private buildTerraformScript(config: TerraformConfig): string {
    let terraform = `# Global Front End Solution - Generated Terraform Configuration
# Project: ${config.projectId}
# Application: ${config.applicationName}
# Generated: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "${config.projectId}"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "${config.region}"
}

variable "application_name" {
  description = "Name of the application"
  type        = string
  default     = "${config.applicationName}"
}

# VPC Network
resource "google_compute_network" "vpc_network" {
  name                    = "\${var.application_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "\${var.application_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# Firewall Rules
resource "google_compute_firewall" "allow_http" {
  name    = "\${var.application_name}-allow-http"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["\${var.application_name}-web"]
}

resource "google_compute_firewall" "allow_https" {
  name    = "\${var.application_name}-allow-https"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["\${var.application_name}-web"]
}

resource "google_compute_firewall" "allow_health_check" {
  name    = "\${var.application_name}-allow-health-check"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["\${var.application_name}-web"]
}

`;

    // Add hosting-specific resources
    if (config.hostingType === 'vm') {
      terraform += this.generateVMResources(config);
    } else if (config.hostingType === 'gke') {
      terraform += this.generateGKEResources(config);
    } else if (config.hostingType === 'cloud-run') {
      terraform += this.generateCloudRunResources(config);
    }

    // Add load balancer resources
    terraform += this.generateLoadBalancerResources(config);

    // Add SSL certificate if needed
    if (config.sslCertificate === 'managed') {
      terraform += this.generateManagedSSLResources(config);
    }

    // Add CDN if enabled
    if (config.cdnEnabled) {
      terraform += this.generateCDNResources(config);
    }

    // Add Cloud Armor if enabled
    if (config.wafEnabled) {
      terraform += this.generateCloudArmorResources(config);
    }

    terraform += `
# Outputs
output "load_balancer_ip" {
  description = "The IP address of the load balancer"
  value       = google_compute_global_address.default.address
}

output "application_url" {
  description = "The URL of the application"
  value       = "http\${var.ssl_enabled ? "s" : ""}://\${google_compute_global_address.default.address}"
}
`;

    return terraform;
  }

  private generateVMResources(config: TerraformConfig): string {
    return `
# Instance Template
resource "google_compute_instance_template" "web_template" {
  name_prefix  = "\${var.application_name}-template-"
  machine_type = "${config.backendConfig.machineType}"
  region       = var.region

  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
  }

  network_interface {
    network    = google_compute_network.vpc_network.id
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {
      # Ephemeral public IP
    }
  }

  tags = ["\${var.application_name}-web"]

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Simple health check endpoint
    echo "OK" > /var/www/html/health
    
    # Basic nginx config for load balancer
    cat > /etc/nginx/sites-available/default <<EOL
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        
        root /var/www/html;
        index index.html index.htm index.nginx-debian.html;
        
        server_name _;
        
        location / {
            try_files \\$uri \\$uri/ =404;
        }
        
        location /health {
            access_log off;
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
EOL
    systemctl reload nginx
  EOF

  lifecycle {
    create_before_destroy = true
  }
}

# Managed Instance Group
resource "google_compute_region_instance_group_manager" "web_igm" {
  name   = "\${var.application_name}-igm"
  region = var.region

  version {
    instance_template = google_compute_instance_template.web_template.id
  }

  base_instance_name = "\${var.application_name}-instance"
  target_size        = ${config.backendConfig.minInstances}

  named_port {
    name = "http"
    port = 80
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.web_health_check.id
    initial_delay_sec = 300
  }
}

# Auto Scaler
resource "google_compute_region_autoscaler" "web_autoscaler" {
  name   = "\${var.application_name}-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.web_igm.id

  autoscaling_policy {
    max_replicas    = ${config.backendConfig.maxInstances}
    min_replicas    = ${config.backendConfig.minInstances}
    cooldown_period = 60

    cpu_utilization {
      target = 0.7
    }
  }
}

# Health Check
resource "google_compute_health_check" "web_health_check" {
  name = "\${var.application_name}-health-check"

  timeout_sec        = 5
  check_interval_sec = 10

  http_health_check {
    port         = "80"
    request_path = "/health"
  }
}

# Backend Service
resource "google_compute_backend_service" "web_backend" {
  name        = "\${var.application_name}-backend"
  protocol    = "HTTP"
  timeout_sec = 10

  backend {
    group           = google_compute_region_instance_group_manager.web_igm.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  health_checks = [google_compute_health_check.web_health_check.id]
}
`;
  }

  private generateGKEResources(config: TerraformConfig): string {
    return `
# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "\${var.application_name}-gke-cluster"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc_network.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "10.1.0.0/16"
    services_ipv4_cidr_block = "10.2.0.0/16"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "\${var.application_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 2

  node_config {
    preemptible  = false
    machine_type = "e2-medium"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    tags = ["\${var.application_name}-gke-node"]
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }
}

# Backend Service for GKE
resource "google_compute_backend_service" "web_backend" {
  name        = "\${var.application_name}-backend"
  protocol    = "HTTP"
  timeout_sec = 10

  # Note: You'll need to create a NEG (Network Endpoint Group) after deploying your app to GKE
  # This is typically done via Kubernetes service annotations

  health_checks = [google_compute_health_check.web_health_check.id]
}

resource "google_compute_health_check" "web_health_check" {
  name = "\${var.application_name}-health-check"

  timeout_sec        = 5
  check_interval_sec = 10

  http_health_check {
    port         = "80"
    request_path = "/health"
  }
}
`;
  }

  private generateCloudRunResources(config: TerraformConfig): string {
    return `
# Cloud Run Service
resource "google_cloud_run_service" "default" {
  name     = "\${var.application_name}-service"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
        
        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "100"
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM policy to allow public access
resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.default.name
  location = google_cloud_run_service.default.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Backend Service for Cloud Run
resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  name                  = "\${var.application_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_service.default.name
  }
}

resource "google_compute_backend_service" "web_backend" {
  name        = "\${var.application_name}-backend"
  protocol    = "HTTPS"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg.id
  }
}
`;
  }

  private generateLoadBalancerResources(config: TerraformConfig): string {
    return `
# Global IP Address
resource "google_compute_global_address" "default" {
  name = "\${var.application_name}-ip"
}

# URL Map
resource "google_compute_url_map" "default" {
  name            = "\${var.application_name}-url-map"
  default_service = google_compute_backend_service.web_backend.id
}

# HTTP(S) Proxy
resource "google_compute_target_http_proxy" "default" {
  name    = "\${var.application_name}-http-proxy"
  url_map = google_compute_url_map.default.id
}

# Global Forwarding Rule
resource "google_compute_global_forwarding_rule" "default" {
  name       = "\${var.application_name}-forwarding-rule"
  target     = google_compute_target_http_proxy.default.id
  port_range = "80"
  ip_address = google_compute_global_address.default.address
}
`;
  }

  private generateManagedSSLResources(config: TerraformConfig): string {
    return `
# Managed SSL Certificate
resource "google_compute_managed_ssl_certificate" "default" {
  name = "\${var.application_name}-ssl-cert"

  managed {
    domains = ["\${var.application_name}.example.com"]
  }
}

# HTTPS Proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "\${var.application_name}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# HTTPS Forwarding Rule
resource "google_compute_global_forwarding_rule" "https" {
  name       = "\${var.application_name}-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}
`;
  }

  private generateCDNResources(config: TerraformConfig): string {
    return `
# Update backend service to enable CDN
resource "google_compute_backend_service" "web_backend_cdn" {
  name        = "\${var.application_name}-backend-cdn"
  protocol    = "HTTP"
  timeout_sec = 10

  backend {
    group           = google_compute_region_instance_group_manager.web_igm.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  health_checks = [google_compute_health_check.web_health_check.id]

  enable_cdn = true
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    serve_while_stale            = 86400
    
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }
  }
}
`;
  }

  private generateCloudArmorResources(config: TerraformConfig): string {
    return `
# Cloud Armor Security Policy
resource "google_compute_security_policy" "policy" {
  name = "\${var.application_name}-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["9.9.9.0/24"]
      }
    }
    description = "Deny access to IPs in 9.9.9.0/24"
  }

  rule {
    action   = "rate_based_ban"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
    description = "Rate limit rule"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "default rule"
  }
}

# Apply security policy to backend service
resource "google_compute_backend_service" "web_backend_secure" {
  name        = "\${var.application_name}-backend-secure"
  protocol    = "HTTP"
  timeout_sec = 10

  backend {
    group           = google_compute_region_instance_group_manager.web_igm.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  health_checks    = [google_compute_health_check.web_health_check.id]
  security_policy  = google_compute_security_policy.policy.id
}
`;
  }

  downloadTerraform() {
    const blob = new Blob([this.generatedTerraform], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.projectForm.get('applicationName')?.value}-terraform.tf`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Terraform file downloaded successfully!', 'Close', {
      duration: 3000
    });
  }

  copyTerraform() {
    navigator.clipboard.writeText(this.generatedTerraform).then(() => {
      this.snackBar.open('Terraform configuration copied to clipboard!', 'Close', {
        duration: 3000
      });
    });
  }
} 