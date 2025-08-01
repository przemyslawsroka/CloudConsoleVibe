import { Injectable } from '@angular/core';

export interface EndpointOption {
  value: string;
  label: string;
  isCategory?: boolean;
  children?: EndpointOption[];
  requiresDetails?: boolean;
  detailsType?: 'ip' | 'instance' | 'domain' | 'project' | 'cluster' | 'workload' | 'service' | 'custom';
}

export interface EndpointHierarchy {
  topLevel: EndpointOption[];
  categories: { [key: string]: EndpointOption[] };
}

export interface ValidationRule {
  required: string[];
  patterns?: { [key: string]: RegExp };
}

@Injectable({
  providedIn: 'root'
})
export class EndpointConfigurationService {

  // ====================
  // SOURCE ENDPOINT HIERARCHY
  // ====================

  getSourceEndpointHierarchy(): EndpointHierarchy {
    return {
      topLevel: [
        { value: 'myIp', label: 'My IP address', requiresDetails: false },
        { value: 'customIp', label: 'Custom IP address', requiresDetails: true, detailsType: 'ip' },
        { value: 'nonGcpPrivateIp', label: 'Non-Google Cloud Private IP', requiresDetails: true, detailsType: 'project' },
        { value: 'gceInstance', label: 'VM instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' },
        { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
        { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
        { value: 'cloudShell', label: 'Cloud Shell', requiresDetails: false },
        { value: 'cloudConsoleSsh', label: 'Cloud Console SSH-in-browser', requiresDetails: false },
        { value: 'serverless', label: 'Serverless...', isCategory: true },
        { value: 'data-services', label: 'Managed Data Services...', isCategory: true }
      ],
      categories: {
        'serverless': [
          { value: 'cloudRun', label: 'Cloud Run Service', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunJobs', label: 'Cloud Run Jobs', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudFunctionV1', label: 'Cloud Function v1', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunFunction', label: 'Cloud Run Function', requiresDetails: true, detailsType: 'service' },
          { value: 'appEngine', label: 'App Engine', requiresDetails: true, detailsType: 'service' }
        ],
        'data-services': [
          { value: 'alloyDb', label: 'Alloy DB instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudSqlInstance', label: 'Cloud SQL instance', requiresDetails: true, detailsType: 'instance' }
        ]
      }
    };
  }

  // ====================
  // DESTINATION ENDPOINT HIERARCHY
  // ====================

  getDestinationEndpointHierarchy(): EndpointHierarchy {
    return {
      topLevel: [
        { value: 'customIp', label: 'Custom IP address', requiresDetails: true, detailsType: 'ip' },
        { value: 'domain', label: 'Custom domain', requiresDetails: true, detailsType: 'domain' },
        { value: 'application', label: 'Application Endpoints...', isCategory: true },
        { value: 'cicd', label: 'CI/CD...', isCategory: true },
        { value: 'compute-gke', label: 'Compute & GKE...', isCategory: true },
        { value: 'data-services', label: 'Managed Data Services...', isCategory: true },
        { value: 'network', label: 'Network...', isCategory: true },
        { value: 'serverless', label: 'Serverless...', isCategory: true }
      ],
      categories: {
        'application': [
          { value: 'appHubService', label: 'App Hub service', requiresDetails: true, detailsType: 'service' },
          { value: 'iapResource', label: 'IAP-protected resource', requiresDetails: true, detailsType: 'instance' }
        ],
        'cicd': [
          { value: 'cloudBuild', label: 'Cloud Build private worker', requiresDetails: true, detailsType: 'service' }
        ],
        'compute-gke': [
          { value: 'gceInstance', label: 'VM Instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' },
          { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkeService', label: 'GKE service', requiresDetails: true, detailsType: 'service' }
        ],
        'data-services': [
          { value: 'alloyDb', label: 'Alloy DB instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudSqlInstance', label: 'Cloud SQL instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudSpanner', label: 'Cloud Spanner instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudBigtable', label: 'Cloud Bigtable instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'filestore', label: 'Filestore instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'redisInstance', label: 'Redis Instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'redisCluster', label: 'Redis Cluster', requiresDetails: true, detailsType: 'instance' }
        ],
        'network': [
          { value: 'loadBalancer', label: 'Load Balancer', requiresDetails: true, detailsType: 'instance' },
          { value: 'subnetwork', label: 'Subnetwork', requiresDetails: true, detailsType: 'custom' },
          { value: 'pscEndpoint', label: 'PSC endpoint', requiresDetails: true, detailsType: 'instance' }
        ],
        'serverless': [
          { value: 'cloudRun', label: 'Cloud Run Service', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunJobs', label: 'Cloud Run Jobs', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudFunctionV1', label: 'Cloud Function v1', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunFunction', label: 'Cloud Run Function', requiresDetails: true, detailsType: 'service' },
          { value: 'appEngine', label: 'App Engine', requiresDetails: true, detailsType: 'service' }
        ]
      }
    };
  }

  // ====================
  // VALIDATION RULES
  // ====================

  getSourceValidationRules(endpointType: string): ValidationRule {
    const rules: { [key: string]: ValidationRule } = {
      'customIp': {
        required: ['sourceIpAddress', 'sourceIpType'],
        patterns: {
          sourceIpAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        }
      },
      'nonGcpPrivateIp': {
        required: ['sourceIpAddress', 'sourceIpType'],
        patterns: {
          sourceIpAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        }
      },
      'gceInstance': {
        required: ['sourceInstance']
      },
      'alloyDb': {
        required: ['sourceInstance']
      },
      'cloudSqlInstance': {
        required: ['sourceInstance']
      },
      'subnetwork': {
        required: ['sourceInstance']
      },
      'gkeCluster': {
        required: ['sourceCluster']
      },
      'gkeWorkload': {
        required: ['sourceCluster', 'sourceWorkload']
      },
      'gkePod': {
        required: ['sourceCluster', 'sourceWorkload']
      },
      'cloudRun': {
        required: ['sourceService']
      },
      'cloudRunJobs': {
        required: ['sourceService']
      },
      'cloudFunctionV1': {
        required: ['sourceService']
      },
      'cloudRunFunction': {
        required: ['sourceService']
      },
      'appEngine': {
        required: ['sourceService']
      }
    };

    return rules[endpointType] || { required: [] };
  }

  getDestinationValidationRules(endpointType: string): ValidationRule {
    const rules: { [key: string]: ValidationRule } = {
      'customIp': {
        required: ['destinationIpAddress'],
        patterns: {
          destinationIpAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        }
      },
      'domain': {
        required: ['destinationDomain'],
        patterns: {
          destinationDomain: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/
        }
      },
      'gceInstance': {
        required: ['destinationInstance']
      },
      'alloyDb': {
        required: ['destinationInstance']
      },
      'cloudSqlInstance': {
        required: ['destinationInstance']
      },
      'cloudSpanner': {
        required: ['destinationInstance']
      },
      'cloudBigtable': {
        required: ['destinationInstance']
      },
      'filestore': {
        required: ['destinationInstance']
      },
      'redisInstance': {
        required: ['destinationInstance']
      },
      'redisCluster': {
        required: ['destinationInstance']
      },
      'loadBalancer': {
        required: ['destinationInstance']
      },
      'pscEndpoint': {
        required: ['destinationInstance']
      },
      'iapResource': {
        required: ['destinationInstance']
      },
      'subnetwork': {
        required: ['destinationInstance']
      },
      'gkeCluster': {
        required: ['destinationCluster']
      },
      'gkeWorkload': {
        required: ['destinationCluster', 'destinationWorkload']
      },
      'gkePod': {
        required: ['destinationCluster', 'destinationWorkload']
      },
      'gkeService': {
        required: ['destinationCluster', 'destinationService']
      },
      'cloudRun': {
        required: ['destinationService']
      },
      'cloudRunJobs': {
        required: ['destinationService']
      },
      'cloudFunctionV1': {
        required: ['destinationService']
      },
      'cloudRunFunction': {
        required: ['destinationService']
      },
      'appEngine': {
        required: ['destinationService']
      },
      'cloudBuild': {
        required: ['destinationService']
      },
      'appHubService': {
        required: ['destinationService']
      }
    };

    return rules[endpointType] || { required: [] };
  }

  // ====================
  // PROTOCOL OPTIONS
  // ====================

  getProtocolOptions(): EndpointOption[] {
    return [
      { value: 'tcp', label: 'tcp' },
      { value: 'udp', label: 'udp' },
      { value: 'icmp', label: 'icmp' },
      { value: 'icmpv6', label: 'icmpv6' },
      { value: 'esp', label: 'esp' },
      { value: 'ah', label: 'ah' },
      { value: 'sctp', label: 'sctp' },
      { value: 'ipip', label: 'ipip' }
    ];
  }

  // ====================
  // CONNECTION TYPE OPTIONS (for Non-GCP Private IP)
  // ====================

  getConnectionTypeOptions(): EndpointOption[] {
    return [
      { value: 'vpnTunnel', label: 'VPN Tunnel' },
      { value: 'interconnectAttachment', label: 'Interconnect Attachment' },
      { value: 'nccRouterAppliance', label: 'NCC Router Appliance' }
    ];
  }

  // ====================
  // IP TYPE OPTIONS
  // ====================

  getIpTypeOptions(): EndpointOption[] {
    return [
      { value: 'external', label: 'External' },
      { value: 'internal', label: 'Internal' }
    ];
  }

  // ====================
  // HELPER METHODS
  // ====================

  isEndpointTypeInCategory(endpointType: string, category: string, hierarchy: EndpointHierarchy): boolean {
    return hierarchy.categories[category]?.some(option => option.value === endpointType) || false;
  }

  getEndpointOptionByValue(value: string, hierarchy: EndpointHierarchy): EndpointOption | null {
    // Check top level
    let option = hierarchy.topLevel.find(opt => opt.value === value);
    if (option) return option;

    // Check categories
    for (const categoryOptions of Object.values(hierarchy.categories)) {
      option = categoryOptions.find(opt => opt.value === value);
      if (option) return option;
    }

    return null;
  }

  requiresResourceSelection(endpointType: string): boolean {
    const resourceTypes = [
      'gceInstance', 'alloyDb', 'cloudSqlInstance', 'cloudSpanner', 'cloudBigtable',
      'filestore', 'redisInstance', 'redisCluster', 'loadBalancer', 'pscEndpoint',
      'subnetwork', 'gkeCluster', 'gkeWorkload', 'gkePod', 'gkeService',
      'cloudRun', 'cloudRunJobs', 'cloudFunctionV1', 'cloudRunFunction',
      'appEngine', 'cloudBuild', 'appHubService', 'iapResource'
    ];
    
    return resourceTypes.includes(endpointType);
  }

  getResourceApiType(endpointType: string): string {
    const typeMapping: { [key: string]: string } = {
      'gceInstance': 'gce',
      'alloyDb': 'alloydb',
      'cloudSqlInstance': 'cloudsql',
      'cloudSpanner': 'cloudsql',
      'cloudBigtable': 'bigtable',
      'filestore': 'filestore',
      'redisInstance': 'redis',
      'redisCluster': 'redis',
      'gkeCluster': 'gke-cluster',
      'gkeWorkload': 'gke-workload',
      'gkePod': 'gke-workload',
      'gkeService': 'gke-workload',
      'cloudRun': 'cloudrun',
      'cloudRunJobs': 'cloudrun',
      'cloudFunctionV1': 'cloudfunctions',
      'cloudRunFunction': 'cloudfunctions',
      'appEngine': 'appengine',
      'loadBalancer': 'loadbalancer',
      'subnetwork': 'subnetwork'
    };

    return typeMapping[endpointType] || 'unknown';
  }

  getDisplayLabel(endpointType: string, hierarchy: EndpointHierarchy): string {
    const option = this.getEndpointOptionByValue(endpointType, hierarchy);
    return option?.label || endpointType;
  }
}