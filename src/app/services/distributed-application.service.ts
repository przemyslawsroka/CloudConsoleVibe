import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface DistributedAppConfig {
  projectId: string;
  applicationName: string;
  architecture: 'consolidated' | 'segmented';
  
  // On-premises connectivity
  onPremConnectivity: {
    enabled: boolean;
    type: 'dedicated' | 'partner' | 'vpn';
    redundancy: 'high' | 'low';
    regions: string[];
    capacity: string;
    macSecEnabled: boolean;
  };
  
  // Multi-cloud connectivity
  multiCloudConnectivity: {
    enabled: boolean;
    providers: Array<{
      name: 'aws' | 'azure' | 'oracle';
      regions: string[];
      redundancy: 'high' | 'low';
    }>;
  };
  
  // Network configuration
  networkConfig: {
    primaryRegion: string;
    secondaryRegions: string[];
    vpcCidr: string;
    subnetCidrs: { [region: string]: string };
    enablePrivateGoogleAccess: boolean;
    enableFlowLogs: boolean;
  };
  
  // Security configuration
  securityConfig: {
    enableCloudArmor: boolean;
    enableCloudNAT: boolean;
    enablePrivateServiceConnect: boolean;
    firewallRules: Array<{
      name: string;
      direction: 'INGRESS' | 'EGRESS';
      priority: number;
      sourceRanges: string[];
      targetTags: string[];
      allowed: Array<{ protocol: string; ports: string[] }>;
    }>;
  };
  
  // Application workloads
  workloads: Array<{
    name: string;
    type: 'compute-engine' | 'gke' | 'cloud-run';
    region: string;
    scaling: {
      min: number;
      max: number;
    };
    machineType?: string;
    diskSize?: number;
  }>;
}

export interface TerraformTemplate {
  name: string;
  description: string;
  content: string;
  variables: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class DistributedApplicationService {

  constructor() {}

  generateTerraformConfig(config: DistributedAppConfig): Observable<TerraformTemplate> {
    const terraformContent = this.buildTerraformContent(config);
    
    const template: TerraformTemplate = {
      name: `${config.applicationName}-distributed-app`,
      description: `Distributed Application infrastructure for ${config.applicationName}`,
      content: terraformContent,
      variables: this.extractVariables(config)
    };

    return of(template);
  }

  private buildTerraformContent(config: DistributedAppConfig): string {
    let terraform = `# Generated Terraform for ${config.applicationName} Distributed Application
# Architecture: ${config.architecture}
# Generated on: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.primary_region
}

provider "google-beta" {
  project = var.project_id
  region  = var.primary_region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "servicenetworking.googleapis.com",
    "networkconnectivity.googleapis.com",
    "dns.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_dependent_services = false
  disable_on_destroy = false
}

`;

    // Add network infrastructure
    terraform += this.generateNetworkInfrastructure(config);
    
    // Add on-premises connectivity if enabled
    if (config.onPremConnectivity.enabled) {
      terraform += this.generateOnPremConnectivity(config);
    }
    
    // Add multi-cloud connectivity if enabled
    if (config.multiCloudConnectivity.enabled) {
      terraform += this.generateMultiCloudConnectivity(config);
    }
    
    // Add security resources
    terraform += this.generateSecurityResources(config);
    
    // Add workload resources
    terraform += this.generateWorkloadResources(config);
    
    // Add outputs
    terraform += this.generateOutputs(config);

    return terraform;
  }

  private generateNetworkInfrastructure(config: DistributedAppConfig): string {
    const isConsolidated = config.architecture === 'consolidated';
    
    let terraform = `
# Network Infrastructure
# VPC Network
resource "google_compute_network" "main_vpc" {
  name                    = "\${var.application_name}-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460
  routing_mode           = "REGIONAL"
  
  depends_on = [google_project_service.required_apis]
}

# Primary region subnet
resource "google_compute_subnetwork" "primary_subnet" {
  name          = "\${var.application_name}-subnet-\${var.primary_region}"
  ip_cidr_range = var.primary_subnet_cidr
  region        = var.primary_region
  network       = google_compute_network.main_vpc.id
  
  private_ip_google_access = ${config.networkConfig.enablePrivateGoogleAccess}
  
  ${config.networkConfig.enableFlowLogs ? `
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
  ` : ''}
}

`;

    // Add secondary region subnets
    config.networkConfig.secondaryRegions.forEach((region, index) => {
      terraform += `
# Secondary region subnet - ${region}
resource "google_compute_subnetwork" "secondary_subnet_${index}" {
  name          = "\${var.application_name}-subnet-${region}"
  ip_cidr_range = var.secondary_subnet_cidrs["${region}"]
  region        = "${region}"
  network       = google_compute_network.main_vpc.id
  
  private_ip_google_access = ${config.networkConfig.enablePrivateGoogleAccess}
  
  ${config.networkConfig.enableFlowLogs ? `
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
  ` : ''}
}

`;
    });

    // Add Cloud Router for each region
    terraform += `
# Cloud Router for primary region
resource "google_compute_router" "primary_router" {
  name    = "\${var.application_name}-router-\${var.primary_region}"
  region  = var.primary_region
  network = google_compute_network.main_vpc.id
  
  bgp {
    asn = 64514
  }
}

`;

    config.networkConfig.secondaryRegions.forEach((region, index) => {
      terraform += `
# Cloud Router for ${region}
resource "google_compute_router" "secondary_router_${index}" {
  name    = "\${var.application_name}-router-${region}"
  region  = "${region}"
  network = google_compute_network.main_vpc.id
  
  bgp {
    asn = 64514
  }
}

`;
    });

    // Add Cloud NAT if enabled
    if (config.securityConfig.enableCloudNAT) {
      terraform += `
# Cloud NAT for primary region
resource "google_compute_router_nat" "primary_nat" {
  name                               = "\${var.application_name}-nat-\${var.primary_region}"
  router                             = google_compute_router.primary_router.name
  region                             = var.primary_region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

`;

      config.networkConfig.secondaryRegions.forEach((region, index) => {
        terraform += `
# Cloud NAT for ${region}
resource "google_compute_router_nat" "secondary_nat_${index}" {
  name                               = "\${var.application_name}-nat-${region}"
  router                             = google_compute_router.secondary_router_${index}.name
  region                             = "${region}"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

`;
      });
    }

    return terraform;
  }

  private generateOnPremConnectivity(config: DistributedAppConfig): string {
    const connectivity = config.onPremConnectivity;
    let terraform = `
# On-Premises Connectivity
`;

    if (connectivity.type === 'vpn') {
      terraform += `
# VPN Gateway
resource "google_compute_vpn_gateway" "on_prem_gateway" {
  name    = "\${var.application_name}-vpn-gateway"
  network = google_compute_network.main_vpc.id
  region  = var.primary_region
}

# External IP for VPN Gateway
resource "google_compute_address" "vpn_static_ip" {
  name   = "\${var.application_name}-vpn-ip"
  region = var.primary_region
}

# VPN Tunnel
resource "google_compute_vpn_tunnel" "on_prem_tunnel" {
  name          = "\${var.application_name}-vpn-tunnel"
  peer_ip       = var.on_prem_gateway_ip
  shared_secret = var.vpn_shared_secret
  
  target_vpn_gateway = google_compute_vpn_gateway.on_prem_gateway.id
  
  local_traffic_selector  = [var.vpc_cidr]
  remote_traffic_selector = [var.on_prem_cidr]
  
  depends_on = [
    google_compute_forwarding_rule.vpn_esp,
    google_compute_forwarding_rule.vpn_udp500,
    google_compute_forwarding_rule.vpn_udp4500,
  ]
}

# Forwarding rules for VPN
resource "google_compute_forwarding_rule" "vpn_esp" {
  name        = "\${var.application_name}-vpn-esp"
  ip_protocol = "ESP"
  ip_address  = google_compute_address.vpn_static_ip.address
  target      = google_compute_vpn_gateway.on_prem_gateway.id
  region      = var.primary_region
}

resource "google_compute_forwarding_rule" "vpn_udp500" {
  name        = "\${var.application_name}-vpn-udp500"
  ip_protocol = "UDP"
  port_range  = "500"
  ip_address  = google_compute_address.vpn_static_ip.address
  target      = google_compute_vpn_gateway.on_prem_gateway.id
  region      = var.primary_region
}

resource "google_compute_forwarding_rule" "vpn_udp4500" {
  name        = "\${var.application_name}-vpn-udp4500"
  ip_protocol = "UDP"
  port_range  = "4500"
  ip_address  = google_compute_address.vpn_static_ip.address
  target      = google_compute_vpn_gateway.on_prem_gateway.id
  region      = var.primary_region
}

# Route to on-premises
resource "google_compute_route" "on_prem_route" {
  name       = "\${var.application_name}-on-prem-route"
  dest_range = var.on_prem_cidr
  network    = google_compute_network.main_vpc.name
  next_hop_vpn_tunnel = google_compute_vpn_tunnel.on_prem_tunnel.id
  priority   = 1000
}

`;
    } else if (connectivity.type === 'dedicated' || connectivity.type === 'partner') {
      terraform += `
# Interconnect Attachment
resource "google_compute_interconnect_attachment" "on_prem_attachment" {
  name                     = "\${var.application_name}-interconnect"
  edge_availability_domain = "AVAILABILITY_DOMAIN_1"
  type                     = "${connectivity.type === 'dedicated' ? 'DEDICATED' : 'PARTNER'}"
  router                   = google_compute_router.primary_router.id
  region                   = var.primary_region
  
  ${connectivity.type === 'partner' ? 'admin_enabled = true' : ''}
  ${connectivity.macSecEnabled ? 'encryption = "IPSEC"' : ''}
}

# BGP Peer for Interconnect
resource "google_compute_router_peer" "on_prem_peer" {
  name                      = "\${var.application_name}-bgp-peer"
  router                    = google_compute_router.primary_router.name
  region                    = var.primary_region
  peer_ip_address          = var.on_prem_bgp_peer_ip
  peer_asn                 = var.on_prem_bgp_asn
  advertised_route_priority = 100
  interface                = google_compute_router_interface.on_prem_interface.name
}

# Router Interface for Interconnect
resource "google_compute_router_interface" "on_prem_interface" {
  name               = "\${var.application_name}-interface"
  router             = google_compute_router.primary_router.name
  region             = var.primary_region
  ip_range           = var.interconnect_ip_range
  vpn_tunnel         = google_compute_interconnect_attachment.on_prem_attachment.id
}

`;
    }

    return terraform;
  }

  private generateMultiCloudConnectivity(config: DistributedAppConfig): string {
    let terraform = `
# Multi-Cloud Connectivity
`;

    config.multiCloudConnectivity.providers.forEach((provider, index) => {
      terraform += `
# Network Connectivity Hub for ${provider.name.toUpperCase()}
resource "google_network_connectivity_hub" "${provider.name}_hub" {
  name        = "\${var.application_name}-${provider.name}-hub"
  description = "Hub for ${provider.name.toUpperCase()} connectivity"
  
  labels = {
    environment = "production"
    provider    = "${provider.name}"
  }
}

# Spoke for ${provider.name.toUpperCase()}
resource "google_network_connectivity_spoke" "${provider.name}_spoke" {
  name        = "\${var.application_name}-${provider.name}-spoke"
  location    = var.primary_region
  description = "Spoke for ${provider.name.toUpperCase()} connectivity"
  hub         = google_network_connectivity_hub.${provider.name}_hub.id
  
  linked_vpc_network {
    uri = google_compute_network.main_vpc.id
  }
  
  labels = {
    environment = "production"
    provider    = "${provider.name}"
  }
}

`;
    });

    return terraform;
  }

  private generateSecurityResources(config: DistributedAppConfig): string {
    let terraform = `
# Security Resources
`;

    // Generate firewall rules
    config.securityConfig.firewallRules.forEach((rule, index) => {
      terraform += `
# Firewall Rule: ${rule.name}
resource "google_compute_firewall" "rule_${index}" {
  name    = "\${var.application_name}-${rule.name}"
  network = google_compute_network.main_vpc.name
  
  direction = "${rule.direction}"
  priority  = ${rule.priority}
  
  ${rule.sourceRanges.length > 0 ? `source_ranges = ${JSON.stringify(rule.sourceRanges)}` : ''}
  ${rule.targetTags.length > 0 ? `target_tags = ${JSON.stringify(rule.targetTags)}` : ''}
  
  ${rule.allowed.map(allow => `
  allow {
    protocol = "${allow.protocol}"
    ${allow.ports.length > 0 ? `ports = ${JSON.stringify(allow.ports)}` : ''}
  }`).join('')}
}

`;
    });

    // Add Cloud Armor if enabled
    if (config.securityConfig.enableCloudArmor) {
      terraform += `
# Cloud Armor Security Policy
resource "google_compute_security_policy" "main_policy" {
  name        = "\${var.application_name}-security-policy"
  description = "Security policy for distributed application"
  
  rule {
    action   = "allow"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
  
  rule {
    action   = "deny(403)"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default deny rule"
  }
  
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }
}

`;
    }

    return terraform;
  }

  private generateWorkloadResources(config: DistributedAppConfig): string {
    let terraform = `
# Application Workloads
`;

    config.workloads.forEach((workload, index) => {
      if (workload.type === 'compute-engine') {
        terraform += `
# Instance Template for ${workload.name}
resource "google_compute_instance_template" "${workload.name}_template" {
  name_prefix  = "\${var.application_name}-${workload.name}-"
  machine_type = "${workload.machineType || 'e2-medium'}"
  region       = "${workload.region}"
  
  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = ${workload.diskSize || 20}
  }
  
  network_interface {
    subnetwork = ${workload.region === config.networkConfig.primaryRegion ? 
      'google_compute_subnetwork.primary_subnet.id' : 
      `google_compute_subnetwork.secondary_subnet_${config.networkConfig.secondaryRegions.indexOf(workload.region)}.id`}
  }
  
  tags = ["\${var.application_name}-${workload.name}"]
  
  metadata_startup_script = var.startup_script
  
  lifecycle {
    create_before_destroy = true
  }
}

# Managed Instance Group for ${workload.name}
resource "google_compute_region_instance_group_manager" "${workload.name}_mig" {
  name   = "\${var.application_name}-${workload.name}-mig"
  region = "${workload.region}"
  
  version {
    instance_template = google_compute_instance_template.${workload.name}_template.id
  }
  
  base_instance_name = "\${var.application_name}-${workload.name}"
  target_size        = ${workload.scaling.min}
  
  auto_healing_policies {
    health_check      = google_compute_health_check.${workload.name}_health_check.id
    initial_delay_sec = 300
  }
}

# Health Check for ${workload.name}
resource "google_compute_health_check" "${workload.name}_health_check" {
  name = "\${var.application_name}-${workload.name}-health-check"
  
  timeout_sec        = 5
  check_interval_sec = 10
  
  http_health_check {
    port         = "80"
    request_path = "/health"
  }
}

# Autoscaler for ${workload.name}
resource "google_compute_region_autoscaler" "${workload.name}_autoscaler" {
  name   = "\${var.application_name}-${workload.name}-autoscaler"
  region = "${workload.region}"
  target = google_compute_region_instance_group_manager.${workload.name}_mig.id
  
  autoscaling_policy {
    max_replicas    = ${workload.scaling.max}
    min_replicas    = ${workload.scaling.min}
    cooldown_period = 60
    
    cpu_utilization {
      target = 0.7
    }
  }
}

`;
      } else if (workload.type === 'gke') {
        terraform += `
# GKE Cluster for ${workload.name}
resource "google_container_cluster" "${workload.name}_cluster" {
  name     = "\${var.application_name}-${workload.name}-cluster"
  location = "${workload.region}"
  
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.main_vpc.name
  subnetwork = ${workload.region === config.networkConfig.primaryRegion ? 
    'google_compute_subnetwork.primary_subnet.name' : 
    `google_compute_subnetwork.secondary_subnet_${config.networkConfig.secondaryRegions.indexOf(workload.region)}.name`}
  
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "10.1.0.0/16"
    services_ipv4_cidr_block = "10.2.0.0/16"
  }
  
  workload_identity_config {
    workload_pool = "\${var.project_id}.svc.id.goog"
  }
}

# GKE Node Pool for ${workload.name}
resource "google_container_node_pool" "${workload.name}_nodes" {
  name       = "\${var.application_name}-${workload.name}-nodes"
  location   = "${workload.region}"
  cluster    = google_container_cluster.${workload.name}_cluster.name
  node_count = ${workload.scaling.min}
  
  autoscaling {
    min_node_count = ${workload.scaling.min}
    max_node_count = ${workload.scaling.max}
  }
  
  node_config {
    preemptible  = false
    machine_type = "${workload.machineType || 'e2-medium'}"
    disk_size_gb = ${workload.diskSize || 50}
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

`;
      } else if (workload.type === 'cloud-run') {
        terraform += `
# Cloud Run Service for ${workload.name}
resource "google_cloud_run_service" "${workload.name}_service" {
  name     = "\${var.application_name}-${workload.name}"
  location = "${workload.region}"
  
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
        "autoscaling.knative.dev/maxScale" = "${workload.scaling.max}"
        "autoscaling.knative.dev/minScale" = "${workload.scaling.min}"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM policy for Cloud Run
resource "google_cloud_run_service_iam_member" "${workload.name}_public" {
  service  = google_cloud_run_service.${workload.name}_service.name
  location = google_cloud_run_service.${workload.name}_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

`;
      }
    });

    return terraform;
  }

  private generateOutputs(config: DistributedAppConfig): string {
    return `
# Outputs
output "vpc_network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.main_vpc.id
}

output "vpc_network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.main_vpc.name
}

output "primary_subnet_id" {
  description = "The ID of the primary subnet"
  value       = google_compute_subnetwork.primary_subnet.id
}

${config.onPremConnectivity.enabled && config.onPremConnectivity.type === 'vpn' ? `
output "vpn_gateway_ip" {
  description = "The external IP address of the VPN gateway"
  value       = google_compute_address.vpn_static_ip.address
}
` : ''}

${config.multiCloudConnectivity.enabled ? `
output "connectivity_hubs" {
  description = "Network Connectivity Hub IDs"
  value = {
${config.multiCloudConnectivity.providers.map(p => `    ${p.name} = google_network_connectivity_hub.${p.name}_hub.id`).join('\n')}
  }
}
` : ''}

output "workload_endpoints" {
  description = "Endpoints for deployed workloads"
  value = {
${config.workloads.map(w => {
  if (w.type === 'cloud-run') {
    return `    ${w.name} = google_cloud_run_service.${w.name}_service.status[0].url`;
  } else if (w.type === 'gke') {
    return `    ${w.name} = google_container_cluster.${w.name}_cluster.endpoint`;
  } else {
    return `    ${w.name} = google_compute_region_instance_group_manager.${w.name}_mig.instance_group`;
  }
}).join('\n')}
  }
}
`;
  }

  private extractVariables(config: DistributedAppConfig): { [key: string]: any } {
    const variables: { [key: string]: any } = {
      project_id: config.projectId,
      application_name: config.applicationName,
      primary_region: config.networkConfig.primaryRegion,
      vpc_cidr: config.networkConfig.vpcCidr,
      primary_subnet_cidr: config.networkConfig.subnetCidrs[config.networkConfig.primaryRegion],
      secondary_subnet_cidrs: {},
      enable_private_google_access: config.networkConfig.enablePrivateGoogleAccess,
      enable_flow_logs: config.networkConfig.enableFlowLogs,
      enable_cloud_armor: config.securityConfig.enableCloudArmor,
      enable_cloud_nat: config.securityConfig.enableCloudNAT,
      startup_script: "#!/bin/bash\napt-get update\napt-get install -y nginx\nsystemctl start nginx\nsystemctl enable nginx"
    };

    // Add secondary subnet CIDRs
    config.networkConfig.secondaryRegions.forEach(region => {
      variables['secondary_subnet_cidrs'][region] = config.networkConfig.subnetCidrs[region];
    });

    // Add on-premises variables if enabled
    if (config.onPremConnectivity.enabled) {
      if (config.onPremConnectivity.type === 'vpn') {
        variables['on_prem_gateway_ip'] = "203.0.113.1";
        variables['vpn_shared_secret'] = "your-shared-secret";
        variables['on_prem_cidr'] = "192.168.0.0/16";
      } else {
        variables['on_prem_bgp_peer_ip'] = "169.254.1.1";
        variables['on_prem_bgp_asn'] = 65001;
        variables['interconnect_ip_range'] = "169.254.1.0/30";
      }
    }

    return variables;
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
    
    // Create README.md
    const readmeContent = this.generateReadmeFile(template);
    this.downloadFile(`${template.name}-README.md`, readmeContent);
  }

  private generateVariablesFile(variables: { [key: string]: any }): string {
    let content = '# Terraform Variables for Distributed Application\n\n';
    
    Object.entries(variables).forEach(([key, value]) => {
      const type = typeof value === 'object' ? 'map(string)' : 'string';
      const description = this.getVariableDescription(key);
      
      content += `variable "${key}" {\n`;
      content += `  description = "${description}"\n`;
      content += `  type        = ${type}\n`;
      if (typeof value !== 'object') {
        content += `  default     = "${value}"\n`;
      }
      content += `}\n\n`;
    });
    
    return content;
  }

  private generateTfvarsFile(variables: { [key: string]: any }): string {
    let content = '# Terraform variables file for Distributed Application\n\n';
    
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'object') {
        content += `${key} = ${JSON.stringify(value, null, 2)}\n\n`;
      } else {
        content += `${key} = "${value}"\n`;
      }
    });
    
    return content;
  }

  private generateReadmeFile(template: TerraformTemplate): string {
    return `# ${template.name}

${template.description}

## Prerequisites

- Terraform >= 1.0
- Google Cloud SDK
- Appropriate IAM permissions for the target project

## Usage

1. Update the variables in \`${template.name}.tfvars\` with your specific values
2. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`
3. Plan the deployment:
   \`\`\`bash
   terraform plan -var-file="${template.name}.tfvars"
   \`\`\`
4. Apply the configuration:
   \`\`\`bash
   terraform apply -var-file="${template.name}.tfvars"
   \`\`\`

## Architecture

This Terraform configuration creates a distributed application infrastructure with:

- VPC network with regional subnets
- Cross-cloud connectivity options
- Security policies and firewall rules
- Application workloads (Compute Engine, GKE, or Cloud Run)
- Network connectivity hubs for multi-cloud scenarios

## Customization

Edit the variables in \`${template.name}.tfvars\` to customize:
- Network CIDR ranges
- Workload configurations
- Security settings
- Multi-cloud connectivity options

## Cleanup

To destroy the infrastructure:
\`\`\`bash
terraform destroy -var-file="${template.name}.tfvars"
\`\`\`
`;
  }

  private getVariableDescription(key: string): string {
    const descriptions: { [key: string]: string } = {
      project_id: 'Google Cloud Project ID',
      application_name: 'Name of the distributed application',
      primary_region: 'Primary Google Cloud region',
      vpc_cidr: 'CIDR block for the VPC network',
      primary_subnet_cidr: 'CIDR block for the primary subnet',
      secondary_subnet_cidrs: 'CIDR blocks for secondary subnets',
      enable_private_google_access: 'Enable private Google access for subnets',
      enable_flow_logs: 'Enable VPC flow logs',
      enable_cloud_armor: 'Enable Cloud Armor security policies',
      enable_cloud_nat: 'Enable Cloud NAT for outbound internet access',
      startup_script: 'Startup script for Compute Engine instances',
      on_prem_gateway_ip: 'IP address of on-premises VPN gateway',
      vpn_shared_secret: 'Shared secret for VPN connection',
      on_prem_cidr: 'CIDR block of on-premises network',
      on_prem_bgp_peer_ip: 'BGP peer IP for interconnect',
      on_prem_bgp_asn: 'BGP ASN for on-premises network',
      interconnect_ip_range: 'IP range for interconnect interface'
    };
    
    return descriptions[key] || `Configuration for ${key}`;
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

  copyToClipboard(content: string): Promise<void> {
    return navigator.clipboard.writeText(content);
  }

  estimateCost(config: DistributedAppConfig): Observable<any> {
    // Mock cost estimation - in real implementation, this would call GCP pricing API
    const baseCost = 100; // Base infrastructure cost
    const workloadCost = config.workloads.length * 50; // Cost per workload
    const connectivityCost = config.onPremConnectivity.enabled ? 200 : 0;
    const multiCloudCost = config.multiCloudConnectivity.enabled ? 150 : 0;
    
    const totalMonthlyCost = baseCost + workloadCost + connectivityCost + multiCloudCost;
    
    return of({
      monthly: totalMonthlyCost,
      breakdown: {
        infrastructure: baseCost,
        workloads: workloadCost,
        connectivity: connectivityCost,
        multiCloud: multiCloudCost
      }
    });
  }
} 