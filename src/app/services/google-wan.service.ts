import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface GoogleWANConfig {
  projectId: string;
  applicationName: string;
  primaryRegion: string;
  wanArchitecture: 'enterprise-backbone' | 'hybrid-cloud' | 'multi-cloud' | 'site-to-site';
  
  networkConfig: {
    hubRegion: string;
    enableGlobalRouting: boolean;
    enableRouteExchange: boolean;
  };
  
  connectivityConfig: {
    onPremConnectivity: {
      enabled: boolean;
      type: string;
      redundancy?: string;
      bandwidth?: string;
      enableMacsec?: boolean;
    };
    multiCloudConnectivity: {
      enabled: boolean;
      providers?: {
        aws: {
          enabled: boolean;
          regions: string[];
        };
        azure: {
          enabled: boolean;
          regions: string[];
        };
        oracle: {
          enabled: boolean;
          regions: string[];
        };
      };
    };
    siteToSiteConnectivity: {
      enabled: boolean;
      enableDataTransfer: boolean;
      sites?: Array<{
        name: string;
        location: string;
        connectionType: string;
        bandwidth?: string;
        asn: number;
      }>;
    };
  };
  
  nccConfig: {
    enableNCC: boolean;
    enableNCCGateway?: boolean;
    enableSSE?: boolean;
    sseProvider?: string;
    enableCustomRoutes?: boolean;
  };
  
  securityConfig: {
    enableCloudArmor: boolean;
    enableFirewallRules: boolean;
    enablePrivateGoogleAccess: boolean;
    enableCloudNAT: boolean;
  };
  
  operationsConfig: {
    enableNetworkIntelligence: boolean;
    enableFlowLogs: boolean;
    enableConnectivityTests: boolean;
  };
}

export interface TerraformTemplate {
  name: string;
  description: string;
  content: string;
  variables: any;
  files?: {
    'main.tf': string;
    'variables.tf': string;
    'terraform.tfvars': string;
    'README.md': string;
  };
}

export interface WANCostEstimate {
  monthly: number;
  breakdown: {
    interconnect: number;
    vpn: number;
    ncc: number;
    dataTransfer: number;
    other: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleWANService {

  generateTerraformConfig(config: GoogleWANConfig): Observable<TerraformTemplate> {
    const terraformContent = this.buildTerraformContent(config);
    const variablesContent = this.buildVariablesContent(config);
    const tfvarsContent = this.buildTfvarsContent(config);
    const readmeContent = this.buildReadmeContent(config);

    return of({
      name: config.applicationName,
      description: `Google Wide Area Network infrastructure for ${config.applicationName}`,
      content: terraformContent,
      variables: {},
      files: {
        'main.tf': terraformContent,
        'variables.tf': variablesContent,
        'terraform.tfvars': tfvarsContent,
        'README.md': readmeContent
      }
    });
  }

  generateCostEstimate(config: GoogleWANConfig): Observable<WANCostEstimate> {
    let interconnectCost = 0;
    let vpnCost = 0;
    let nccCost = 0;
    let dataTransferCost = 0;
    let otherCost = 50; // Base infrastructure cost

    // Calculate interconnect costs
    if (config.connectivityConfig.onPremConnectivity.enabled) {
      if (config.connectivityConfig.onPremConnectivity.type === 'dedicated-interconnect') {
        interconnectCost = 1000; // Base dedicated interconnect cost
      } else if (config.connectivityConfig.onPremConnectivity.type === 'partner-interconnect') {
        interconnectCost = 500; // Base partner interconnect cost
      }
    }

    // Calculate VPN costs
    if (config.connectivityConfig.onPremConnectivity.enabled && 
        config.connectivityConfig.onPremConnectivity.type === 'cloud-vpn') {
      vpnCost = 100; // Base VPN cost
    }

    // Calculate NCC costs
    if (config.nccConfig.enableNCC) {
      nccCost = 200; // Base NCC cost
      if (config.nccConfig.enableNCCGateway) {
        nccCost += 150; // Additional gateway cost
      }
      if (config.nccConfig.enableSSE) {
        nccCost += 300; // Additional SSE cost
      }
    }

    // Calculate data transfer costs
    if (config.connectivityConfig.siteToSiteConnectivity.enabled && 
        config.connectivityConfig.siteToSiteConnectivity.enableDataTransfer) {
      dataTransferCost = 200; // Base data transfer cost
    }

    const totalMonthlyCost = interconnectCost + vpnCost + nccCost + dataTransferCost + otherCost;

    return of({
      monthly: totalMonthlyCost,
      breakdown: {
        interconnect: interconnectCost,
        vpn: vpnCost,
        ncc: nccCost,
        dataTransfer: dataTransferCost,
        other: otherCost
      }
    });
  }

  downloadTerraformFiles(config: GoogleWANConfig): void {
    this.generateTerraformConfig(config).subscribe(template => {
      if (template.files) {
        Object.entries(template.files).forEach(([fileName, content]) => {
          this.downloadFile(fileName, content);
        });
      }
    });
  }

  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private buildTerraformContent(config: GoogleWANConfig): string {
    return `# Google Wide Area Network Infrastructure
# Project: ${config.projectId}
# Application: ${config.applicationName}
# Architecture: ${config.wanArchitecture}

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.primary_region
}

# Network Connectivity Center Hub
${config.nccConfig.enableNCC ? `
resource "google_network_connectivity_hub" "main_hub" {
  name        = "${config.applicationName}-hub"
  description = "Main NCC hub for ${config.applicationName}"
  project     = var.project_id
}
` : ''}

# VPC Networks
resource "google_compute_network" "main_vpc" {
  name                    = "${config.applicationName}-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "main_subnet" {
  name          = "${config.applicationName}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.primary_region
  network       = google_compute_network.main_vpc.id
  project       = var.project_id
  
  ${config.securityConfig.enablePrivateGoogleAccess ? `
  private_ip_google_access = true
  ` : ''}
}

${config.connectivityConfig.onPremConnectivity.enabled ? this.buildInterconnectResources(config) : ''}

${config.securityConfig.enableFirewallRules ? this.buildFirewallRules(config) : ''}

${config.securityConfig.enableCloudNAT ? this.buildCloudNAT(config) : ''}

# Outputs
output "hub_id" {
  value = ${config.nccConfig.enableNCC ? 'google_network_connectivity_hub.main_hub.id' : 'null'}
}

output "vpc_network" {
  value = google_compute_network.main_vpc.self_link
}

output "primary_subnet" {
  value = google_compute_subnetwork.main_subnet.self_link
}
`;
  }

  private buildVariablesContent(config: GoogleWANConfig): string {
    return `variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
  default     = "${config.projectId}"
}

variable "primary_region" {
  description = "The primary region for resources"
  type        = string
  default     = "${config.primaryRegion}"
}

variable "application_name" {
  description = "Name of the application"
  type        = string
  default     = "${config.applicationName}"
}

variable "wan_architecture" {
  description = "WAN architecture type"
  type        = string
  default     = "${config.wanArchitecture}"
}
`;
  }

  private buildTfvarsContent(config: GoogleWANConfig): string {
    return `project_id = "${config.projectId}"
primary_region = "${config.primaryRegion}"
application_name = "${config.applicationName}"
wan_architecture = "${config.wanArchitecture}"
`;
  }

  private buildReadmeContent(config: GoogleWANConfig): string {
    return `# Google Wide Area Network - ${config.applicationName}

This Terraform configuration creates a Google Cloud Wide Area Network infrastructure with the following components:

## Architecture: ${config.wanArchitecture}

## Components Deployed:

${config.nccConfig.enableNCC ? '- Network Connectivity Center Hub' : ''}
- VPC Network with subnets
${config.connectivityConfig.onPremConnectivity.enabled ? `- ${config.connectivityConfig.onPremConnectivity.type} connectivity` : ''}
${config.securityConfig.enableFirewallRules ? '- Firewall rules' : ''}
${config.securityConfig.enableCloudNAT ? '- Cloud NAT' : ''}

## Deployment Instructions:

1. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`

2. Review the plan:
   \`\`\`bash
   terraform plan
   \`\`\`

3. Apply the configuration:
   \`\`\`bash
   terraform apply
   \`\`\`

## Configuration:

- **Project ID**: ${config.projectId}
- **Primary Region**: ${config.primaryRegion}
- **Application Name**: ${config.applicationName}

## Estimated Monthly Cost: 

See cost breakdown in the wizard for detailed pricing information.
`;
  }

  private buildInterconnectResources(config: GoogleWANConfig): string {
    if (config.connectivityConfig.onPremConnectivity.type === 'cloud-vpn') {
      return `
# Cloud VPN Gateway
resource "google_compute_vpn_gateway" "main_gateway" {
  name    = "${config.applicationName}-vpn-gateway"
  network = google_compute_network.main_vpc.id
  region  = var.primary_region
  project = var.project_id
}

# External IP for VPN Gateway
resource "google_compute_address" "vpn_static_ip" {
  name    = "${config.applicationName}-vpn-ip"
  region  = var.primary_region
  project = var.project_id
}
`;
    }
    
    return `
# Interconnect Attachment (placeholder - requires physical setup)
# resource "google_compute_interconnect_attachment" "main_attachment" {
#   name         = "${config.applicationName}-attachment"
#   type         = "DEDICATED"
#   region       = var.primary_region
#   project      = var.project_id
# }
`;
  }

  private buildFirewallRules(config: GoogleWANConfig): string {
    return `
# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${config.applicationName}-allow-internal"
  network = google_compute_network.main_vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/8"]
  target_tags   = ["internal"]
}
`;
  }

  private buildCloudNAT(config: GoogleWANConfig): string {
    return `
# Cloud Router for NAT
resource "google_compute_router" "nat_router" {
  name    = "${config.applicationName}-nat-router"
  region  = var.primary_region
  network = google_compute_network.main_vpc.id
  project = var.project_id
}

# Cloud NAT
resource "google_compute_router_nat" "nat_gateway" {
  name                               = "${config.applicationName}-nat-gateway"
  router                             = google_compute_router.nat_router.name
  region                             = var.primary_region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
`;
  }
} 