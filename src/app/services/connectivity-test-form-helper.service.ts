import { Injectable } from '@angular/core';
import { FormGroup, Validators, AbstractControl } from '@angular/forms';
import { EndpointConfigurationService, ValidationRule } from './endpoint-configuration.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityTestFormHelperService {

  constructor(private endpointConfig: EndpointConfigurationService) {}

  // ====================
  // VALIDATION HELPERS
  // ====================

  applySourceValidation(form: FormGroup, endpointType: string): void {
    this.clearSourceValidators(form);
    
    const rules = this.endpointConfig.getSourceValidationRules(endpointType);
    
    rules.required.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        const validators = [Validators.required];
        
        // Add pattern validators if specified
        if (rules.patterns && rules.patterns[fieldName]) {
          validators.push(Validators.pattern(rules.patterns[fieldName]));
        }
        
        control.setValidators(validators);
        control.updateValueAndValidity();
      }
    });
  }

  applyDestinationValidation(form: FormGroup, endpointType: string): void {
    this.clearDestinationValidators(form);
    
    const rules = this.endpointConfig.getDestinationValidationRules(endpointType);
    
    rules.required.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        const validators = [Validators.required];
        
        // Add pattern validators if specified
        if (rules.patterns && rules.patterns[fieldName]) {
          validators.push(Validators.pattern(rules.patterns[fieldName]));
        }
        
        control.setValidators(validators);
        control.updateValueAndValidity();
      }
    });
  }

  private clearSourceValidators(form: FormGroup): void {
    const sourceFields = [
      'sourceIpAddress', 'sourceIpType', 'sourceInstance', 'sourceCluster',
      'sourceWorkload', 'sourceService', 'sourceProject', 'sourceConnectionType',
      'sourceVpnTunnel', 'sourceInterconnectAttachment', 'sourceNccRouterAppliance'
    ];

    sourceFields.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });
  }

  private clearDestinationValidators(form: FormGroup): void {
    const destinationFields = [
      'destinationIpAddress', 'destinationDomain', 'destinationInstance',
      'destinationCluster', 'destinationWorkload', 'destinationService'
    ];

    destinationFields.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });
  }

  // ====================
  // FORM RESET HELPERS
  // ====================

  resetSourceDetails(form: FormGroup): void {
    const sourceDetailFields = [
      'sourceIpAddress', 'sourceIpType', 'sourceInstance', 'sourceCluster',
      'sourceWorkload', 'sourceService', 'sourceProject', 'sourceConnectionType',
      'sourceVpnTunnel', 'sourceInterconnectAttachment', 'sourceNccRouterAppliance'
    ];

    sourceDetailFields.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        control.setValue('');
        control.markAsUntouched();
      }
    });
  }

  resetDestinationDetails(form: FormGroup): void {
    const destinationDetailFields = [
      'destinationIpAddress', 'destinationDomain', 'destinationInstance',
      'destinationCluster', 'destinationWorkload', 'destinationService'
    ];

    destinationDetailFields.forEach(fieldName => {
      const control = form.get(fieldName);
      if (control) {
        control.setValue('');
        control.markAsUntouched();
      }
    });
  }

  // ====================
  // NAME GENERATION HELPERS
  // ====================

  generateTestName(form: FormGroup): string {
    const sourceIdentifier = this.generateSourceIdentifier(form);
    const destinationIdentifier = this.generateDestinationIdentifier(form);
    const timestamp = this.generateTimestamp();

    if (sourceIdentifier && destinationIdentifier) {
      return `${sourceIdentifier}-to-${destinationIdentifier}-${timestamp}`;
    } else if (sourceIdentifier) {
      return `${sourceIdentifier}-connectivity-${timestamp}`;
    } else if (destinationIdentifier) {
      return `connectivity-to-${destinationIdentifier}-${timestamp}`;
    } else {
      return `connectivity-test-${timestamp}`;
    }
  }

  private generateSourceIdentifier(form: FormGroup): string {
    const formValue = form.value;
    const endpointType = formValue.sourceEndpointType;

    switch (endpointType) {
      case 'myIp':
        return 'my-ip';
      
      case 'customIp':
        const customIp = formValue.sourceIpAddress;
        return customIp ? `ip-${customIp.replace(/\./g, '-')}` : '';
      
      case 'nonGcpPrivateIp':
        const privateIp = formValue.sourceIpAddress;
        return privateIp ? `private-ip-${privateIp.replace(/\./g, '-')}` : '';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.sourceInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.sourceCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'gkeWorkload':
        const workloadName = this.extractResourceName(formValue.sourceWorkload);
        return workloadName ? `gke-workload-${workloadName}` : '';
      
      case 'gkePod':
        const podName = this.extractResourceName(formValue.sourceWorkload);
        return podName ? `gke-pod-${podName}` : '';
      
      case 'cloudRun':
        const runServiceName = this.extractResourceName(formValue.sourceService);
        return runServiceName ? `cr-${runServiceName}` : '';
      
      case 'cloudRunJobs':
        const runJobName = this.extractResourceName(formValue.sourceService);
        return runJobName ? `crjob-${runJobName}` : '';
      
      case 'cloudFunction':
      case 'cloudFunctionV1':
        const functionName = this.extractResourceName(formValue.sourceService);
        return functionName ? `cf-${functionName}` : '';
      
      case 'cloudRunFunction':
        const runFunctionName = this.extractResourceName(formValue.sourceService);
        return runFunctionName ? `crf-${runFunctionName}` : '';
      
      case 'appEngine':
        return 'appengine';
      
      case 'alloyDb':
        const alloyDbInstanceName = this.extractResourceName(formValue.sourceInstance);
        return alloyDbInstanceName ? `alloydb-${alloyDbInstanceName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formValue.sourceInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formValue.sourceInstance);
        return subnetName ? `subnet-${subnetName}` : '';
      
      case 'cloudShell':
        return 'cloud-shell';
      
      case 'cloudConsoleSsh':
        return 'console-ssh';
      
      default:
        return '';
    }
  }

  private generateDestinationIdentifier(form: FormGroup): string {
    const formValue = form.value;
    const endpointType = formValue.destinationEndpointType;

    switch (endpointType) {
      case 'customIp':
        const customIp = formValue.destinationIpAddress;
        return customIp ? `ip-${customIp.replace(/\./g, '-')}` : '';
      
      case 'domain':
        const domain = formValue.destinationDomain;
        return domain ? `domain-${domain.replace(/\./g, '-')}` : '';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.destinationInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.destinationCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'gkeWorkload':
        const workloadName = this.extractResourceName(formValue.destinationWorkload);
        return workloadName ? `gke-workload-${workloadName}` : '';
      
      case 'gkePod':
        const podName = this.extractResourceName(formValue.destinationWorkload);
        return podName ? `gke-pod-${podName}` : '';
      
      case 'gkeService':
        const serviceName = this.extractResourceName(formValue.destinationService);
        return serviceName ? `gke-service-${serviceName}` : '';
      
      case 'loadBalancer':
        const lbName = this.extractResourceName(formValue.destinationInstance);
        return lbName ? `lb-${lbName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formValue.destinationInstance);
        return subnetName ? `subnet-${subnetName}` : '';
      
      case 'pscEndpoint':
        const pscName = this.extractResourceName(formValue.destinationInstance);
        return pscName ? `psc-${pscName}` : '';
      
      case 'appHubService':
        const appHubName = this.extractResourceName(formValue.destinationService);
        return appHubName ? `apphub-${appHubName}` : '';
      
      case 'iapResource':
        const iapResourceName = this.extractResourceName(formValue.destinationInstance);
        return iapResourceName ? `iap-${iapResourceName}` : '';
      
      case 'alloyDb':
        const alloyDbName = this.extractResourceName(formValue.destinationInstance);
        return alloyDbName ? `alloydb-${alloyDbName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formValue.destinationInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'cloudSpanner':
        const spannerName = this.extractResourceName(formValue.destinationInstance);
        return spannerName ? `spanner-${spannerName}` : '';
      
      case 'cloudBigtable':
        const bigtableName = this.extractResourceName(formValue.destinationInstance);
        return bigtableName ? `bigtable-${bigtableName}` : '';
      
      case 'filestore':
        const filestoreName = this.extractResourceName(formValue.destinationInstance);
        return filestoreName ? `filestore-${filestoreName}` : '';
      
      case 'redisInstance':
        const redisInstanceName = this.extractResourceName(formValue.destinationInstance);
        return redisInstanceName ? `redis-${redisInstanceName}` : '';
      
      case 'redisCluster':
        const redisClusterName = this.extractResourceName(formValue.destinationInstance);
        return redisClusterName ? `redis-cluster-${redisClusterName}` : '';
      
      case 'cloudRun':
        const runServiceName = this.extractResourceName(formValue.destinationService);
        return runServiceName ? `cr-${runServiceName}` : '';
      
      case 'cloudRunJobs':
        const runJobName = this.extractResourceName(formValue.destinationService);
        return runJobName ? `crjob-${runJobName}` : '';
      
      case 'cloudFunction':
      case 'cloudFunctionV1':
        const functionName = this.extractResourceName(formValue.destinationService);
        return functionName ? `cf-${functionName}` : '';
      
      case 'cloudRunFunction':
        const runFunctionName = this.extractResourceName(formValue.destinationService);
        return runFunctionName ? `crf-${runFunctionName}` : '';
      
      case 'appEngine':
        return 'appengine';
      
      case 'cloudBuild':
        const buildServiceName = this.extractResourceName(formValue.destinationService);
        return buildServiceName ? `build-${buildServiceName}` : '';
      
      default:
        return '';
    }
  }

  private extractResourceName(resourcePath: string): string {
    if (!resourcePath) return '';
    
    // Extract name from resource paths like "projects/project/zones/zone/instances/name"
    const parts = resourcePath.split('/');
    return parts[parts.length - 1] || '';
  }

  private sanitizeName(name: string): string {
    // Convert to lowercase and replace invalid characters
    return name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50); // Limit length
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    
    return `${year}${month}${day}-${hour}${minute}`;
  }

  // ====================
  // LABEL HELPERS
  // ====================

  getSourceDataServiceLabel(endpointType: string): string {
    switch (endpointType) {
      case 'alloyDb': return 'Alloy DB instance';
      case 'cloudSqlInstance': return 'Cloud SQL instance';
      default: return 'Data service';
    }
  }

  getDestinationServiceLabel(endpointType: string): string {
    switch (endpointType) {
      case 'alloyDb': return 'Alloy DB instance';
      case 'cloudSqlInstance': return 'Cloud SQL instance';
      case 'cloudSpanner': return 'Cloud Spanner instance';
      case 'cloudBigtable': return 'Cloud Bigtable instance';
      case 'filestore': return 'Filestore instance';
      case 'redisInstance': return 'Redis Instance';
      case 'redisCluster': return 'Redis Cluster';
      default: return 'Service';
    }
  }

  getWorkloadLabel(endpointType: string): string {
    return endpointType === 'gkePod' ? 'Pod' : 'Workload';
  }

  getSourceProjectLabel(connectionType: string): string {
    switch (connectionType) {
      case 'vpnTunnel': return 'VPN Tunnel Project';
      case 'interconnectAttachment': return 'Interconnect Attachment Project';
      case 'nccRouterAppliance': return 'NCC Router Appliance Project';
      default: return 'Source IP address or service project';
    }
  }

  // ====================
  // CONDITION HELPERS
  // ====================

  isEndpointType(form: FormGroup, fieldName: string, type: string): boolean {
    return form.get(fieldName)?.value === type;
  }

  isEndpointTypeOneOf(form: FormGroup, fieldName: string, types: string[]): boolean {
    return types.includes(form.get(fieldName)?.value);
  }

  // ====================
  // API PAYLOAD HELPERS
  // ====================

  buildSourceEndpoint(formValue: any): any {
    const source: any = {};
    const endpointType = formValue.sourceEndpointType;

    switch (endpointType) {
      case 'myIp':
        source.type = 'my-ip';
        break;
      case 'customIp':
        source.ipAddress = formValue.sourceIpAddress;
        source.type = formValue.sourceIpType;
        break;
      case 'nonGcpPrivateIp':
        source.ipAddress = formValue.sourceIpAddress;
        source.type = 'private-non-gcp';
        source.project = formValue.sourceProject;
        source.connectionType = formValue.sourceConnectionType;
        if (formValue.sourceVpnTunnel) source.vpnTunnel = formValue.sourceVpnTunnel;
        if (formValue.sourceInterconnectAttachment) source.interconnectAttachment = formValue.sourceInterconnectAttachment;
        if (formValue.sourceNccRouterAppliance) source.nccRouterAppliance = formValue.sourceNccRouterAppliance;
        break;
      case 'cloudShell':
        source.type = 'cloud-shell';
        break;
      case 'cloudConsoleSsh':
        source.type = 'cloud-console-ssh';
        break;
      case 'gceInstance':
        source.instance = formValue.sourceInstance;
        break;
      case 'gkeCluster':
        source.gkeCluster = formValue.sourceCluster;
        break;
      case 'gkeWorkload':
      case 'gkePod':
        source.gkeCluster = formValue.sourceCluster;
        source.workload = formValue.sourceWorkload;
        source.workloadType = endpointType;
        break;
      case 'cloudRun':
      case 'cloudRunJobs':
      case 'cloudFunctionV1':
      case 'cloudRunFunction':
      case 'appEngine':
        source.service = formValue.sourceService;
        source.serviceType = formValue.sourceEndpointType;
        break;
      case 'alloyDb':
        source.alloyDb = formValue.sourceInstance;
        break;
      case 'cloudSqlInstance':
        source.cloudSqlInstance = formValue.sourceInstance;
        break;
      case 'subnetwork':
        source.subnetwork = formValue.sourceInstance;
        break;
    }

    return source;
  }

  buildDestinationEndpoint(formValue: any): any {
    const destination: any = {};
    const endpointType = formValue.destinationEndpointType;

    switch (endpointType) {
      case 'customIp':
        destination.ipAddress = formValue.destinationIpAddress;
        break;
      case 'domain':
        destination.domain = formValue.destinationDomain;
        break;
      case 'gceInstance':
        destination.instance = formValue.destinationInstance;
        break;
      case 'gkeCluster':
        destination.gkeCluster = formValue.destinationCluster;
        break;
      case 'gkeWorkload':
      case 'gkePod':
        destination.gkeCluster = formValue.destinationCluster;
        destination.workload = formValue.destinationWorkload;
        destination.workloadType = endpointType;
        break;
      case 'gkeService':
        destination.gkeCluster = formValue.destinationCluster;
        destination.service = formValue.destinationService;
        break;
      case 'loadBalancer':
      case 'pscEndpoint':
      case 'iapResource':
      case 'subnetwork':
        destination.instance = formValue.destinationInstance;
        destination.type = endpointType;
        break;
      case 'cloudRun':
      case 'cloudRunJobs':
      case 'cloudFunctionV1':
      case 'cloudRunFunction':
      case 'appEngine':
      case 'cloudBuild':
        destination.service = formValue.destinationService;
        destination.serviceType = formValue.destinationEndpointType;
        break;
      case 'appHubService':
        destination.service = formValue.destinationService;
        destination.type = 'app-hub';
        break;
      case 'alloyDb':
      case 'cloudSqlInstance':
      case 'cloudSpanner':
      case 'cloudBigtable':
      case 'filestore':
      case 'redisInstance':
      case 'redisCluster':
        destination.dataService = formValue.destinationInstance;
        destination.serviceType = formValue.destinationEndpointType;
        break;
    }

    return destination;
  }
}