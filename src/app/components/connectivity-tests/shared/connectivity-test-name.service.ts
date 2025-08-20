import { Injectable } from '@angular/core';
import { ConnectivityTestFormData } from './connectivity-test.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityTestNameService {

  generateConnectivityTestName(formData: ConnectivityTestFormData, userIpAddress?: string): string {
    const sourceId = this.generateSourceIdentifier(formData, userIpAddress);
    const destId = this.generateDestinationIdentifier(formData);
    
    if (!sourceId || !destId) {
      return ''; // Don't generate name until both source and destination are specified
    }
    
    const timestamp = this.generateTimestamp();
    const rawName = `${sourceId}--to--${destId}--${timestamp}`;
    
    return this.sanitizeName(rawName);
  }

  private generateSourceIdentifier(formData: ConnectivityTestFormData, userIpAddress?: string): string {
    switch (formData.sourceEndpointType) {
      case 'ipAddress':
        return formData.sourceIp ? `ip-${formData.sourceIp.replace(/\./g, '-')}` : '';
      
      case 'myIpAddress':
        return 'my-ip';
      
      case 'cloudShell':
        return 'cloud-shell';
      
      case 'cloudConsoleSsh':
        return 'console-ssh';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formData.sourceInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeWorkload':
        const workloadName = this.extractResourceName(formData.sourceWorkload);
        return workloadName ? `gke-wl-${workloadName}` : '';
      
      case 'gkePod':
        const podName = this.extractResourceName(formData.sourceWorkload);
        return podName ? `gke-pod-${podName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formData.sourceCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'cloudRun':
        const runServiceName = this.extractResourceName(formData.sourceService);
        return runServiceName ? `cr-${runServiceName}` : '';
      
      case 'cloudFunction':
        const functionName = this.extractResourceName(formData.sourceService);
        return functionName ? `cf-${functionName}` : '';
      
      case 'alloyDb':
        const alloyDbInstanceName = this.extractResourceName(formData.sourceInstance);
        return alloyDbInstanceName ? `alloydb-${alloyDbInstanceName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formData.sourceInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formData.sourceNetworkSubnet);
        return subnetName ? `subnet-${subnetName}` : '';
      
      default:
        return '';
    }
  }

  private generateDestinationIdentifier(formData: ConnectivityTestFormData): string {
    switch (formData.destinationEndpointType) {
      case 'ipAddress':
        return formData.destinationIp ? `ip-${formData.destinationIp.replace(/\./g, '-')}` : '';
      
      case 'domainName':
        return formData.destinationDomain ? `domain-${formData.destinationDomain.replace(/\./g, '-')}` : '';
      
      case 'googleApis':
        return formData.destinationService ? `google-apis-${this.extractResourceName(formData.destinationService)}` : 'google-apis';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formData.destinationInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formData.destinationCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'loadBalancer':
        const lbName = this.extractResourceName(formData.destinationInstance);
        return lbName ? `lb-${lbName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formData.destinationNetworkSubnet);
        return subnetName ? `subnet-${subnetName}` : '';
      
      case 'pscEndpoint':
        const pscName = this.extractResourceName(formData.destinationInstance);
        return pscName ? `psc-${pscName}` : '';
      
      case 'appHubService':
        const appHubName = this.extractResourceName(formData.destinationService);
        return appHubName ? `apphub-${appHubName}` : '';
      
      case 'iapResource':
        const iapResourceName = this.extractResourceName(formData.destinationInstance);
        return iapResourceName ? `iap-${iapResourceName}` : '';
      
      case 'alloyDb':
        const alloyDbName = this.extractResourceName(formData.destinationInstance);
        return alloyDbName ? `alloydb-${alloyDbName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formData.destinationInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'cloudSpanner':
        const spannerName = this.extractResourceName(formData.destinationInstance);
        return spannerName ? `spanner-${spannerName}` : '';
      
      case 'cloudBigtable':
        const bigtableName = this.extractResourceName(formData.destinationInstance);
        return bigtableName ? `bigtable-${bigtableName}` : '';
      
      case 'filestore':
        const filestoreName = this.extractResourceName(formData.destinationInstance);
        return filestoreName ? `filestore-${filestoreName}` : '';
      
      case 'redisInstance':
        const redisInstanceName = this.extractResourceName(formData.destinationInstance);
        return redisInstanceName ? `redis-${redisInstanceName}` : '';
      
      case 'redisCluster':
        const redisClusterName = this.extractResourceName(formData.destinationInstance);
        return redisClusterName ? `redis-cluster-${redisClusterName}` : '';
      
      default:
        return '';
    }
  }

  private extractResourceName(resourcePath: string): string {
    if (!resourcePath) return '';
    
    // Handles full GCP resource paths and simple names
    if (resourcePath.includes('/')) {
      const parts = resourcePath.split('/');
      return parts[parts.length - 1];
    }
    return resourcePath;
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()                           // Convert to lowercase
      .replace(/[^a-z0-9-]/g, '-')            // Replace invalid chars with hyphens
      .replace(/-+/g, '-')                    // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')                // Remove leading/trailing hyphens
      .substring(0, 62)                       // Truncate to 62 chars
      .replace(/-+$/, '');                    // Remove trailing hyphens after truncation
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }
}
