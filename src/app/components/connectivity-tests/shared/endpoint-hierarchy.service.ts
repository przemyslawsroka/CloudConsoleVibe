import { Injectable } from '@angular/core';
import { EndpointHierarchy } from './connectivity-test.interfaces';

@Injectable({
  providedIn: 'root'
})
export class EndpointHierarchyService {

  getSourceEndpointHierarchy(): EndpointHierarchy {
    return {
      topLevel: [
        { value: 'ipAddress', label: 'IP address', requiresDetails: true, detailsType: 'ip' },
        { value: 'myIpAddress', label: 'My IP address', requiresDetails: false },
        { value: 'cloudShell', label: 'Cloud Shell', requiresDetails: false },
        { value: 'cloudConsoleSsh', label: 'Cloud Console SSH-in-browser', requiresDetails: false },
        { value: 'gceInstance', label: 'VM instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'gke', label: 'GKE...', isCategory: true },
        { value: 'serverless', label: 'Serverless...', isCategory: true },
        { value: 'data-services', label: 'Managed Data Services...', isCategory: true },
        { value: 'cicd', label: 'CI/CD...', isCategory: true },
        { value: 'subnetwork', label: 'Subnetwork', requiresDetails: true, detailsType: 'custom' }
      ],
      categories: {
        'gke': [
          { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' }
        ],
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
        ],
        'cicd': [
          { value: 'cloudBuild', label: 'Cloud Build private worker', requiresDetails: true, detailsType: 'service' }
        ]
      }
    };
  }

  getDestinationEndpointHierarchy(): EndpointHierarchy {
    return {
      topLevel: [
        { value: 'ipAddress', label: 'IP address', requiresDetails: true, detailsType: 'ip' },
        { value: 'domainName', label: 'Domain Name', requiresDetails: true, detailsType: 'domain' },
        { value: 'googleApis', label: 'Google APIs (via Private Access)', requiresDetails: true, detailsType: 'service' },
        { value: 'gceInstance', label: 'VM instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'gke', label: 'GKE...', isCategory: true },
        { value: 'serverless', label: 'Serverless...', isCategory: true },
        { value: 'data-services', label: 'Managed Data Services...', isCategory: true },
        { value: 'application', label: 'Application Endpoints...', isCategory: true },
        { value: 'cicd', label: 'CI/CD...', isCategory: true },
        { value: 'subnetwork', label: 'Subnetwork', requiresDetails: true, detailsType: 'custom' }
      ],
      categories: {
        'gke': [
          { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' },
          { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
          { value: 'gkeService', label: 'GKE service', requiresDetails: true, detailsType: 'service' }
        ],
        'serverless': [
          { value: 'cloudRun', label: 'Cloud Run Service', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunJobs', label: 'Cloud Run Jobs', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudFunctionV1', label: 'Cloud Function v1', requiresDetails: true, detailsType: 'service' },
          { value: 'cloudRunFunction', label: 'Cloud Run Function', requiresDetails: true, detailsType: 'service' },
          { value: 'appEngine', label: 'App Engine', requiresDetails: true, detailsType: 'service' }
        ],
        'application': [
          { value: 'appHubService', label: 'AppHub Service', requiresDetails: true, detailsType: 'service' },
          { value: 'iapResource', label: 'IAP-protected resource', requiresDetails: true, detailsType: 'instance' },
          { value: 'loadBalancer', label: 'Load Balancer', requiresDetails: true, detailsType: 'instance' },
          { value: 'pscEndpoint', label: 'PSC endpoint', requiresDetails: true, detailsType: 'instance' }
        ],
        'cicd': [
          { value: 'cloudBuild', label: 'Cloud Build private worker', requiresDetails: true, detailsType: 'service' }
        ],
        'data-services': [
          { value: 'alloyDb', label: 'Alloy DB instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudSqlInstance', label: 'Cloud SQL instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudSpanner', label: 'Cloud Spanner instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'cloudBigtable', label: 'Cloud Bigtable instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'filestore', label: 'Filestore instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'redisInstance', label: 'Redis Instance', requiresDetails: true, detailsType: 'instance' },
          { value: 'redisCluster', label: 'Redis Cluster', requiresDetails: true, detailsType: 'instance' }
        ]
      }
    };
  }
}
