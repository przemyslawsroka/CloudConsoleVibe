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
      console.log('Name generation failed: Source or destination identifier is missing.', { sourceId, destId });
      return ''; // Don't generate name until both source and destination are specified
    }
    
    const timestamp = this.generateTimestamp();
    const rawName = `${sourceId}--to--${destId}--${timestamp}`;
    
    return this.sanitizeName(rawName);
  }

  private generateSourceIdentifier(formData: ConnectivityTestFormData, userIpAddress?: string): string {
    switch (formData.source.endpointType) {
      case 'ipAddress':
        return formData.source.ip ? `ip-${formData.source.ip.replace(/\./g, '-')}` : '';
      
      case 'myIpAddress':
        return 'my-ip';
      
      case 'cloudShell':
        return 'cloud-shell';
      
      case 'cloudConsoleSsh':
        return 'console-ssh';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formData.source.instance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeWorkload':
        const workloadName = this.extractResourceName(formData.source.workload);
        return workloadName ? `gke-wl-${workloadName}` : '';
      
      case 'gkePod':
        const podName = this.extractResourceName(formData.source.workload);
        return podName ? `gke-pod-${podName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formData.source.cluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'cloudRun':
        const runServiceName = this.extractResourceName(formData.source.service);
        return runServiceName ? `cr-${runServiceName}` : '';
      
      case 'cloudFunction':
        const functionName = this.extractResourceName(formData.source.service);
        return functionName ? `cf-${functionName}` : '';
      
      case 'alloyDb':
        const alloyDbInstanceName = this.extractResourceName(formData.source.instance);
        return alloyDbInstanceName ? `alloydb-${alloyDbInstanceName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formData.source.instance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formData.source.networkSubnet);
        return subnetName ? `subnet-${subnetName}` : '';
      
      default:
        return '';
    }
  }

  private generateDestinationIdentifier(formData: ConnectivityTestFormData): string {
    switch (formData.destination.endpointType) {
      case 'ipAddress':
        return formData.destination.ip ? `ip-${formData.destination.ip.replace(/\./g, '-')}` : '';
      
      case 'domainName':
        return formData.destination.domain ? `domain-${formData.destination.domain.replace(/\./g, '-')}` : '';
      
      case 'googleApis':
        return formData.destination.service ? `google-apis-${this.extractResourceName(formData.destination.service)}` : 'google-apis';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formData.destination.instance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formData.destination.cluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'loadBalancer':
        const lbName = this.extractResourceName(formData.destination.instance);
        return lbName ? `lb-${lbName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formData.destination.networkSubnet);
        return subnetName ? `subnet-${subnetName}` : '';
      
      case 'pscEndpoint':
        const pscName = this.extractResourceName(formData.destination.instance);
        return pscName ? `psc-${pscName}` : '';
      
      case 'appHubService':
        const appHubName = this.extractResourceName(formData.destination.service);
        return appHubName ? `apphub-${appHubName}` : '';
      
      case 'iapResource':
        const iapResourceName = this.extractResourceName(formData.destination.instance);
        return iapResourceName ? `iap-${iapResourceName}` : '';
      
      case 'alloyDb':
        const alloyDbName = this.extractResourceName(formData.destination.instance);
        return alloyDbName ? `alloydb-${alloyDbName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formData.destination.instance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'cloudSpanner':
        const spannerName = this.extractResourceName(formData.destination.instance);
        return spannerName ? `spanner-${spannerName}` : '';
      
      case 'cloudBigtable':
        const bigtableName = this.extractResourceName(formData.destination.instance);
        return bigtableName ? `bigtable-${bigtableName}` : '';
      
      case 'filestore':
        const filestoreName = this.extractResourceName(formData.destination.instance);
        return filestoreName ? `filestore-${filestoreName}` : '';
      
      case 'redisInstance':
        const redisInstanceName = this.extractResourceName(formData.destination.instance);
        return redisInstanceName ? `redis-${redisInstanceName}` : '';
      
      case 'redisCluster':
        const redisClusterName = this.extractResourceName(formData.destination.instance);
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
