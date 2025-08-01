import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Resource interfaces
export interface GceInstance {
  name: string;
  zone: string;
  status: string;
  machineType: string;
  networkInterfaces: any[];
}

export interface CloudSqlInstance {
  name: string;
  databaseVersion: string;
  region: string;
  state: string;
  connectionName: string;
}

export interface AlloyDbInstance {
  name: string;
  cluster: string;
  instanceType: string;
  state: string;
  ipAddress: string;
}

export interface GkeCluster {
  name: string;
  location: string;
  status: string;
  endpoint: string;
  nodeCount: number;
}

export interface GkeWorkload {
  name: string;
  namespace: string;
  kind: string;
  cluster: string;
}

export interface CloudRunService {
  name: string;
  region: string;
  url: string;
  status: string;
}

export interface CloudFunction {
  name: string;
  region: string;
  runtime: string;
  status: string;
  trigger: string;
}

export interface LoadBalancer {
  name: string;
  type: string;
  region: string;
  ipAddress: string;
}

export interface Subnetwork {
  name: string;
  region: string;
  network: string;
  ipCidrRange: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceApiService {
  private baseUrl = 'https://cloudresourcemanager.googleapis.com/v1';
  private computeBaseUrl = 'https://compute.googleapis.com/compute/v1';
  private sqlBaseUrl = 'https://sqladmin.googleapis.com/v1';
  private containerBaseUrl = 'https://container.googleapis.com/v1';
  private runBaseUrl = 'https://run.googleapis.com/v1';
  private functionsBaseUrl = 'https://cloudfunctions.googleapis.com/v1';

  constructor(private http: HttpClient) {}

  // ====================
  // GCE INSTANCES
  // ====================

  getGceInstances(projectId: string, zone?: string): Observable<GceInstance[]> {
    console.log(`Fetching GCE instances for project: ${projectId}, zone: ${zone || 'all zones'}`);
    
    if (zone) {
      return this.getGceInstancesInZone(projectId, zone);
    } else {
      return this.getGceInstancesAllZones(projectId);
    }
  }

  private getGceInstancesInZone(projectId: string, zone: string): Observable<GceInstance[]> {
    const url = `${this.computeBaseUrl}/projects/${projectId}/zones/${zone}/instances`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.items || []),
      map(instances => instances.map((instance: any) => ({
        name: instance.name,
        zone: this.extractZoneName(instance.zone),
        status: instance.status,
        machineType: this.extractMachineTypeName(instance.machineType),
        networkInterfaces: instance.networkInterfaces || []
      }))),
      catchError(error => {
        console.error('Error fetching GCE instances:', error);
        return of(this.getMockGceInstances());
      })
    );
  }

  private getGceInstancesAllZones(projectId: string): Observable<GceInstance[]> {
    const url = `${this.computeBaseUrl}/projects/${projectId}/aggregated/instances`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        const allInstances: GceInstance[] = [];
        
        if (response.items) {
          Object.keys(response.items).forEach(zone => {
            const zoneData = response.items[zone];
            if (zoneData.instances) {
              const zoneInstances = zoneData.instances.map((instance: any) => ({
                name: instance.name,
                zone: this.extractZoneName(instance.zone),
                status: instance.status,
                machineType: this.extractMachineTypeName(instance.machineType),
                networkInterfaces: instance.networkInterfaces || []
              }));
              allInstances.push(...zoneInstances);
            }
          });
        }
        
        return allInstances;
      }),
      catchError(error => {
        console.error('Error fetching GCE instances (aggregated):', error);
        return of(this.getMockGceInstances());
      })
    );
  }

  // ====================
  // CLOUD SQL INSTANCES
  // ====================

  getCloudSqlInstances(projectId: string): Observable<CloudSqlInstance[]> {
    console.log(`Fetching Cloud SQL instances for project: ${projectId}`);
    
    const url = `${this.sqlBaseUrl}/projects/${projectId}/instances`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.items || []),
      map(instances => instances.map((instance: any) => ({
        name: instance.name,
        databaseVersion: instance.databaseVersion,
        region: instance.region,
        state: instance.state,
        connectionName: instance.connectionName
      }))),
      catchError(error => {
        console.error('Error fetching Cloud SQL instances:', error);
        return of(this.getMockCloudSqlInstances());
      })
    );
  }

  // ====================
  // ALLOY DB INSTANCES
  // ====================

  getAlloyDbInstances(projectId: string, region?: string): Observable<AlloyDbInstance[]> {
    console.log(`Fetching Alloy DB instances for project: ${projectId}, region: ${region || 'all regions'}`);
    
    // Note: Alloy DB API might require different endpoints
    // This is a placeholder implementation
    const url = `${this.sqlBaseUrl}/projects/${projectId}/locations/${region || '-'}/clusters`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        const instances: AlloyDbInstance[] = [];
        if (response.clusters) {
          response.clusters.forEach((cluster: any) => {
            if (cluster.instances) {
              cluster.instances.forEach((instance: any) => {
                instances.push({
                  name: instance.name,
                  cluster: cluster.name,
                  instanceType: instance.instanceType,
                  state: instance.state,
                  ipAddress: instance.ipAddress
                });
              });
            }
          });
        }
        return instances;
      }),
      catchError(error => {
        console.error('Error fetching Alloy DB instances:', error);
        return of(this.getMockAlloyDbInstances());
      })
    );
  }

  // ====================
  // GKE CLUSTERS
  // ====================

  getGkeClusters(projectId: string, location?: string): Observable<GkeCluster[]> {
    console.log(`Fetching GKE clusters for project: ${projectId}, location: ${location || 'all locations'}`);
    
    const url = location 
      ? `${this.containerBaseUrl}/projects/${projectId}/locations/${location}/clusters`
      : `${this.containerBaseUrl}/projects/${projectId}/locations/-/clusters`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.clusters || []),
      map(clusters => clusters.map((cluster: any) => ({
        name: cluster.name,
        location: cluster.location,
        status: cluster.status,
        endpoint: cluster.endpoint,
        nodeCount: cluster.currentNodeCount || 0
      }))),
      catchError(error => {
        console.error('Error fetching GKE clusters:', error);
        return of(this.getMockGkeClusters());
      })
    );
  }

  // ====================
  // GKE WORKLOADS
  // ====================

  getGkeWorkloads(projectId: string, clusterName: string, location: string): Observable<GkeWorkload[]> {
    console.log(`Fetching GKE workloads for cluster: ${clusterName} in ${location}`);
    
    // Note: This would typically require Kubernetes API calls through GKE
    // For now, return mock data
    return of(this.getMockGkeWorkloads(clusterName));
  }

  // ====================
  // CLOUD RUN SERVICES
  // ====================

  getCloudRunServices(projectId: string, region?: string): Observable<CloudRunService[]> {
    console.log(`Fetching Cloud Run services for project: ${projectId}, region: ${region || 'all regions'}`);
    
    const url = region
      ? `${this.runBaseUrl}/projects/${projectId}/locations/${region}/services`
      : `${this.runBaseUrl}/projects/${projectId}/locations/-/services`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.items || []),
      map(services => services.map((service: any) => ({
        name: service.metadata.name,
        region: this.extractRegionFromLocation(service.metadata.labels?.['cloud.googleapis.com/location']),
        url: service.status?.url,
        status: service.status?.conditions?.[0]?.type || 'Unknown'
      }))),
      catchError(error => {
        console.error('Error fetching Cloud Run services:', error);
        return of(this.getMockCloudRunServices());
      })
    );
  }

  // ====================
  // CLOUD FUNCTIONS
  // ====================

  getCloudFunctions(projectId: string, region?: string): Observable<CloudFunction[]> {
    console.log(`Fetching Cloud Functions for project: ${projectId}, region: ${region || 'all regions'}`);
    
    const url = region
      ? `${this.functionsBaseUrl}/projects/${projectId}/locations/${region}/functions`
      : `${this.functionsBaseUrl}/projects/${projectId}/locations/-/functions`;
    
    return this.http.get<any>(url).pipe(
      map(response => response.functions || []),
      map(functions => functions.map((func: any) => ({
        name: this.extractFunctionName(func.name),
        region: this.extractRegionFromLocation(func.name),
        runtime: func.runtime,
        status: func.status,
        trigger: func.httpsTrigger ? 'HTTP' : func.eventTrigger ? 'Event' : 'Unknown'
      }))),
      catchError(error => {
        console.error('Error fetching Cloud Functions:', error);
        return of(this.getMockCloudFunctions());
      })
    );
  }

  // ====================
  // NETWORK RESOURCES
  // ====================

  getLoadBalancers(projectId: string, region?: string): Observable<LoadBalancer[]> {
    console.log(`Fetching Load Balancers for project: ${projectId}, region: ${region || 'all regions'}`);
    
    // This would involve multiple API calls for different LB types
    return of(this.getMockLoadBalancers());
  }

  getSubnetworks(projectId: string, region?: string, network?: string): Observable<Subnetwork[]> {
    console.log(`Fetching Subnetworks for project: ${projectId}, region: ${region || 'all regions'}`);
    
    const url = region
      ? `${this.computeBaseUrl}/projects/${projectId}/regions/${region}/subnetworks`
      : `${this.computeBaseUrl}/projects/${projectId}/aggregated/subnetworks`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (region) {
          return response.items || [];
        } else {
          // Aggregated response
          const allSubnets: any[] = [];
          if (response.items) {
            Object.keys(response.items).forEach(regionKey => {
              const regionData = response.items[regionKey];
              if (regionData.subnetworks) {
                allSubnets.push(...regionData.subnetworks);
              }
            });
          }
          return allSubnets;
        }
      }),
      map(subnets => subnets.map((subnet: any) => ({
        name: subnet.name,
        region: this.extractRegionFromSelfLink(subnet.region),
        network: this.extractNetworkName(subnet.network),
        ipCidrRange: subnet.ipCidrRange
      }))),
      catchError(error => {
        console.error('Error fetching Subnetworks:', error);
        return of(this.getMockSubnetworks());
      })
    );
  }

  // ====================
  // UTILITY METHODS
  // ====================

  private extractZoneName(zoneUrl: string): string {
    return zoneUrl.split('/').pop() || '';
  }

  private extractMachineTypeName(machineTypeUrl: string): string {
    return machineTypeUrl.split('/').pop() || '';
  }

  private extractRegionFromLocation(location: string): string {
    return location?.split('/').pop() || '';
  }

  private extractRegionFromSelfLink(selfLink: string): string {
    const parts = selfLink.split('/');
    const regionIndex = parts.indexOf('regions');
    return regionIndex >= 0 ? parts[regionIndex + 1] : '';
  }

  private extractNetworkName(networkUrl: string): string {
    return networkUrl.split('/').pop() || '';
  }

  private extractFunctionName(functionPath: string): string {
    return functionPath.split('/').pop() || '';
  }

  // ====================
  // MOCK DATA FOR DEVELOPMENT
  // ====================

  private getMockGceInstances(): GceInstance[] {
    return [
      {
        name: 'web-server-1',
        zone: 'us-central1-a',
        status: 'RUNNING',
        machineType: 'e2-micro',
        networkInterfaces: []
      },
      {
        name: 'database-server',
        zone: 'us-central1-b',
        status: 'RUNNING',
        machineType: 'n1-standard-2',
        networkInterfaces: []
      },
      {
        name: 'app-server-prod',
        zone: 'us-east1-a',
        status: 'RUNNING',
        machineType: 'e2-standard-4',
        networkInterfaces: []
      }
    ];
  }

  private getMockCloudSqlInstances(): CloudSqlInstance[] {
    return [
      {
        name: 'main-database',
        databaseVersion: 'POSTGRES_13',
        region: 'us-central1',
        state: 'RUNNABLE',
        connectionName: 'project:us-central1:main-database'
      },
      {
        name: 'analytics-db',
        databaseVersion: 'MYSQL_8_0',
        region: 'us-east1',
        state: 'RUNNABLE',
        connectionName: 'project:us-east1:analytics-db'
      }
    ];
  }

  private getMockAlloyDbInstances(): AlloyDbInstance[] {
    return [
      {
        name: 'alloydb-primary',
        cluster: 'production-cluster',
        instanceType: 'PRIMARY',
        state: 'READY',
        ipAddress: '10.0.0.10'
      },
      {
        name: 'alloydb-read-replica',
        cluster: 'production-cluster',
        instanceType: 'READ_REPLICA',
        state: 'READY',
        ipAddress: '10.0.0.11'
      }
    ];
  }

  private getMockGkeClusters(): GkeCluster[] {
    return [
      {
        name: 'production-cluster',
        location: 'us-central1-a',
        status: 'RUNNING',
        endpoint: '34.123.456.789',
        nodeCount: 3
      },
      {
        name: 'staging-cluster',
        location: 'us-east1-b',
        status: 'RUNNING',
        endpoint: '35.123.456.789',
        nodeCount: 2
      }
    ];
  }

  private getMockGkeWorkloads(clusterName: string): GkeWorkload[] {
    return [
      {
        name: 'frontend-deployment',
        namespace: 'default',
        kind: 'Deployment',
        cluster: clusterName
      },
      {
        name: 'backend-service',
        namespace: 'default',
        kind: 'Service',
        cluster: clusterName
      },
      {
        name: 'nginx-pod',
        namespace: 'kube-system',
        kind: 'Pod',
        cluster: clusterName
      }
    ];
  }

  private getMockCloudRunServices(): CloudRunService[] {
    return [
      {
        name: 'api-service',
        region: 'us-central1',
        url: 'https://api-service-hash-uc.a.run.app',
        status: 'Ready'
      },
      {
        name: 'web-frontend',
        region: 'us-east1',
        url: 'https://web-frontend-hash-ue.a.run.app',
        status: 'Ready'
      }
    ];
  }

  private getMockCloudFunctions(): CloudFunction[] {
    return [
      {
        name: 'process-data',
        region: 'us-central1',
        runtime: 'python39',
        status: 'ACTIVE',
        trigger: 'HTTP'
      },
      {
        name: 'send-notifications',
        region: 'us-east1',
        runtime: 'nodejs16',
        status: 'ACTIVE',
        trigger: 'Event'
      }
    ];
  }

  private getMockLoadBalancers(): LoadBalancer[] {
    return [
      {
        name: 'main-lb',
        type: 'HTTP(S)',
        region: 'us-central1',
        ipAddress: '34.102.136.180'
      },
      {
        name: 'internal-lb',
        type: 'Internal TCP/UDP',
        region: 'us-east1',
        ipAddress: '10.128.0.100'
      }
    ];
  }

  private getMockSubnetworks(): Subnetwork[] {
    return [
      {
        name: 'default-subnet',
        region: 'us-central1',
        network: 'default',
        ipCidrRange: '10.128.0.0/20'
      },
      {
        name: 'custom-subnet',
        region: 'us-east1',
        network: 'custom-vpc',
        ipCidrRange: '192.168.1.0/24'
      }
    ];
  }
}