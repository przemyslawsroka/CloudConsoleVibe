import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface TerraformTemplate {
  name: string;
  description: string;
  content: string;
  variables: { [key: string]: any };
}

export interface DeploymentConfig {
  projectId: string;
  region: string;
  applicationName: string;
  hostingType: 'vm' | 'gke' | 'cloud-run' | 'app-engine';
  sslCertificate: 'managed' | 'self-managed' | 'none';
  cdnEnabled: boolean;
  wafEnabled: boolean;
  backendConfig: any;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalFrontendService {

  constructor() { }

  generateTerraformConfig(config: DeploymentConfig): Observable<TerraformTemplate> {
    const terraformContent = this.buildTerraformContent(config);
    
    const template: TerraformTemplate = {
      name: `${config.applicationName}-global-frontend`,
      description: `Global Frontend solution for ${config.applicationName}`,
      content: terraformContent,
      variables: this.extractVariables(config)
    };

    return of(template);
  }

  validateConfiguration(config: DeploymentConfig): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.projectId) {
      errors.push('Project ID is required');
    }

    if (!config.applicationName) {
      errors.push('Application name is required');
    }

    if (!config.region) {
      errors.push('Region is required');
    }

    if (config.hostingType === 'vm' && !config.backendConfig?.machineType) {
      errors.push('Machine type is required for VM hosting');
    }

    return of({
      valid: errors.length === 0,
      errors
    });
  }

  getEstimatedCost(config: DeploymentConfig): Observable<{ monthlyCost: number; breakdown: any }> {
    // Mock cost estimation - in real implementation, this would call GCP pricing API
    let monthlyCost = 0;
    const breakdown: any = {};

    // Load balancer cost
    monthlyCost += 18; // Global Load Balancer base cost
    breakdown.loadBalancer = 18;

    // Hosting costs
    if (config.hostingType === 'vm') {
      const vmCost = this.calculateVMCost(config.backendConfig);
      monthlyCost += vmCost;
      breakdown.compute = vmCost;
    } else if (config.hostingType === 'gke') {
      monthlyCost += 74; // GKE cluster management fee
      monthlyCost += 50; // Estimated node costs
      breakdown.gke = 124;
    } else if (config.hostingType === 'cloud-run') {
      monthlyCost += 25; // Estimated Cloud Run costs
      breakdown.cloudRun = 25;
    }

    // CDN costs
    if (config.cdnEnabled) {
      monthlyCost += 10; // Estimated CDN costs
      breakdown.cdn = 10;
    }

    // Cloud Armor costs
    if (config.wafEnabled) {
      monthlyCost += 5; // Cloud Armor policy cost
      breakdown.cloudArmor = 5;
    }

    return of({
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      breakdown
    });
  }

  private calculateVMCost(backendConfig: any): number {
    const machineTypeCosts: { [key: string]: number } = {
      'e2-micro': 5.11,
      'e2-small': 10.22,
      'e2-medium': 20.44,
      'e2-standard-2': 40.88,
      'e2-standard-4': 81.76
    };

    const baseCost = machineTypeCosts[backendConfig.machineType] || 20.44;
    const avgInstances = (backendConfig.minInstances + backendConfig.maxInstances) / 2;
    
    return baseCost * avgInstances;
  }

  private buildTerraformContent(config: DeploymentConfig): string {
    // This would be the main Terraform generation logic
    // For brevity, returning a simplified version
    return `# Generated Terraform for ${config.applicationName}
# This is a simplified version - full implementation in the component
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = "${config.projectId}"
  region  = "${config.region}"
}

# Add your resources here...
`;
  }

  private extractVariables(config: DeploymentConfig): { [key: string]: any } {
    return {
      project_id: config.projectId,
      region: config.region,
      application_name: config.applicationName,
      hosting_type: config.hostingType,
      ssl_enabled: config.sslCertificate !== 'none',
      cdn_enabled: config.cdnEnabled,
      waf_enabled: config.wafEnabled
    };
  }

  downloadTerraformFiles(template: TerraformTemplate): void {
    // Create main.tf
    this.downloadFile(`${template.name}-main.tf`, template.content);
    
    // Create variables.tf
    const variablesContent = this.generateVariablesFile(template.variables);
    this.downloadFile(`${template.name}-variables.tf`, variablesContent);
    
    // Create terraform.tfvars
    const tfvarsContent = this.generateTfvarsFile(template.variables);
    this.downloadFile(`${template.name}.tfvars`, tfvarsContent);
  }

  private generateVariablesFile(variables: { [key: string]: any }): string {
    let content = '# Variables for Global Frontend solution\n\n';
    
    Object.entries(variables).forEach(([key, value]) => {
      content += `variable "${key}" {
  description = "The ${key.replace(/_/g, ' ')}"
  type        = string
  default     = "${value}"
}

`;
    });
    
    return content;
  }

  private generateTfvarsFile(variables: { [key: string]: any }): string {
    let content = '# Terraform variables file\n\n';
    
    Object.entries(variables).forEach(([key, value]) => {
      content += `${key} = "${value}"\n`;
    });
    
    return content;
  }

  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
} 