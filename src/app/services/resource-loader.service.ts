import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ComputeEngineService, VmInstance } from './compute-engine.service';
import { GkeClusterService, GkeCluster } from './gke-cluster.service';
import { CloudRunService, CloudRunServiceData } from './cloud-run.service';
import { CloudFunctionsService, CloudFunction } from './cloud-functions.service';
import { CloudSqlService, CloudSqlInstance } from './cloud-sql.service';
import { AlloyDbService, AlloyDbInstance } from './alloy-db.service';

export interface ResourceOption {
  value: string;
  displayName: string;
  description?: string;
  location?: string;
  status?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export type EndpointType = 
  | 'gceInstance'
  | 'gkeCluster'
  | 'gkeWorkload'
  | 'gkePod'
  | 'gkeService'
  | 'cloudRun'
  | 'cloudRunJobs'
  | 'cloudFunctionV1'
  | 'cloudRunFunction'
  | 'appEngine'
  | 'cloudBuild'
  | 'alloyDb'
  | 'cloudSqlInstance'
  | 'cloudSpanner'
  | 'cloudBigtable'
  | 'filestore'
  | 'redisInstance'
  | 'redisCluster'
  | 'loadBalancer'
  | 'subnetwork'
  | 'pscEndpoint'
  | 'appHubService'
  | 'iapResource';

@Injectable({
  providedIn: 'root'
})
export class ResourceLoaderService {

  constructor(
    private computeService: ComputeEngineService,
    private gkeService: GkeClusterService,
    private cloudRunService: CloudRunService,
    private cloudFunctionsService: CloudFunctionsService,
    private cloudSqlService: CloudSqlService,
    private alloyDbService: AlloyDbService
  ) {}

  /**
   * Load resources for a specific endpoint type
   */
  loadResources(endpointType: EndpointType): Observable<ResourceOption[]> {
    switch (endpointType) {
      case 'gceInstance':
        return this.loadVmInstances();
      
      case 'gkeCluster':
        return this.loadGkeClusters();
      
      case 'gkeWorkload':
      case 'gkePod':
        return this.loadGkeWorkloads();
      
      case 'gkeService':
        return this.loadGkeServices();
      
      case 'cloudRun':
        return this.loadCloudRunServices();
      
      case 'cloudRunJobs':
        return this.loadCloudRunJobs();
      
      case 'cloudFunctionV1':
      case 'cloudRunFunction':
        return this.loadCloudFunctions();
      
      case 'cloudSqlInstance':
        return this.loadCloudSqlInstances();
      
      case 'alloyDb':
        return this.loadAlloyDbInstances();
      
      case 'appEngine':
        return this.loadAppEngineServices();
      
      case 'cloudBuild':
        return this.loadCloudBuildWorkers();
      
      case 'cloudSpanner':
        return this.loadCloudSpannerInstances();
      
      case 'cloudBigtable':
        return this.loadCloudBigtableInstances();
      
      case 'filestore':
        return this.loadFilestoreInstances();
      
      case 'redisInstance':
        return this.loadRedisInstances();
      
      case 'redisCluster':
        return this.loadRedisClusters();
      
      case 'loadBalancer':
        return this.loadLoadBalancers();
      
      case 'subnetwork':
        return this.loadSubnetworks();
      
      case 'pscEndpoint':
        return this.loadPscEndpoints();
      
      case 'appHubService':
        return this.loadAppHubServices();
      
      case 'iapResource':
        return this.loadIapResources();
      
      default:
        return of([]);
    }
  }

  /**
   * Load VM instances from Compute Engine API
   */
  private loadVmInstances(): Observable<ResourceOption[]> {
    return this.computeService.loadInstances().pipe(
      map((instances: VmInstance[]) => 
        instances.map(instance => {
          const machineTypeName = this.extractMachineTypeName(instance.machineType);
          const zoneName = this.extractZoneName(instance.zone);
          
          return {
            value: this.buildInstanceResourcePath(instance),
            displayName: instance.name,
            description: `${machineTypeName} • ${zoneName}`,
            location: zoneName,
            status: instance.status
          };
        })
      ),
      catchError(error => {
        console.error('Error loading VM instances:', error);
        return of(this.getMockVmInstances());
      })
    );
  }

  /**
   * Load GKE clusters
   */
  private loadGkeClusters(): Observable<ResourceOption[]> {
    return this.gkeService.getClusters().pipe(
      map((clusters: GkeCluster[]) => 
        clusters.map(cluster => ({
          value: this.buildClusterResourcePath(cluster),
          displayName: cluster.name,
          description: `${cluster.mode} • ${cluster.location}`,
          location: cluster.location,
          status: cluster.status
        }))
      ),
      catchError(error => {
        console.error('Error loading GKE clusters:', error);
        return of(this.getMockGkeClusters());
      })
    );
  }

  /**
   * Load GKE workloads (deployments, pods, etc.)
   */
  private loadGkeWorkloads(): Observable<ResourceOption[]> {
    return this.gkeService.getClusters().pipe(
      map((clusters: GkeCluster[]) => {
        // For now, return mock workloads
        // In real implementation, we'd call the Kubernetes API for each cluster
        return this.getMockGkeWorkloads();
      }),
      catchError(error => {
        console.error('Error loading GKE workloads:', error);
        return of(this.getMockGkeWorkloads());
      })
    );
  }

  /**
   * Load GKE services
   */
  private loadGkeServices(): Observable<ResourceOption[]> {
    return this.gkeService.getClusters().pipe(
      map((clusters: GkeCluster[]) => {
        // For now, return mock services
        // In real implementation, we'd call the Kubernetes API for each cluster
        return this.getMockGkeServices();
      }),
      catchError(error => {
        console.error('Error loading GKE services:', error);
        return of(this.getMockGkeServices());
      })
    );
  }

  /**
   * Load Cloud Run services
   */
  private loadCloudRunServices(): Observable<ResourceOption[]> {
    return this.cloudRunService.getServices().pipe(
      map((services: CloudRunServiceData[]) => 
        services.map(service => ({
          value: this.buildCloudRunResourcePath(service),
          displayName: service.name,
          description: `${service.location} • ${service.status}`,
          location: service.location,
          status: service.status
        }))
      ),
      catchError(error => {
        console.error('Error loading Cloud Run services:', error);
        return of(this.getMockCloudRunServices());
      })
    );
  }

  /**
   * Load Cloud Run jobs
   */
  private loadCloudRunJobs(): Observable<ResourceOption[]> {
    return this.cloudRunService.getJobs().pipe(
      map((jobs: any[]) => 
        jobs.map(job => ({
          value: this.buildCloudRunJobResourcePath(job),
          displayName: job.name,
          description: `${job.location} • ${job.status}`,
          location: job.location,
          status: job.status
        }))
      ),
      catchError(error => {
        console.error('Error loading Cloud Run jobs:', error);
        return of(this.getMockCloudRunJobs());
      })
    );
  }

  /**
   * Load Cloud Functions
   */
  private loadCloudFunctions(): Observable<ResourceOption[]> {
    return this.cloudFunctionsService.getFunctions().pipe(
      map((functions: CloudFunction[]) => 
        functions.map(func => ({
          value: this.buildCloudFunctionResourcePath(func),
          displayName: func.name,
          description: `${func.runtime} • ${func.location}`,
          location: func.location,
          status: func.status
        }))
      ),
      catchError(error => {
        console.error('Error loading Cloud Functions:', error);
        return of(this.getMockCloudFunctions());
      })
    );
  }

  /**
   * Load Cloud SQL instances
   */
  private loadCloudSqlInstances(): Observable<ResourceOption[]> {
    return this.cloudSqlService.getInstances().pipe(
      map((instances: CloudSqlInstance[]) => 
        instances.map(instance => ({
          value: this.buildCloudSqlResourcePath(instance),
          displayName: instance.name,
          description: `${instance.databaseVersion} • ${instance.region}`,
          location: instance.region,
          status: instance.state
        }))
      ),
      catchError(error => {
        console.error('Error loading Cloud SQL instances:', error);
        return of(this.getMockCloudSqlInstances());
      })
    );
  }

  /**
   * Load AlloyDB instances
   */
  private loadAlloyDbInstances(): Observable<ResourceOption[]> {
    return this.alloyDbService.getInstances().pipe(
      map((instances: AlloyDbInstance[]) => 
        instances.map(instance => ({
          value: this.buildAlloyDbResourcePath(instance),
          displayName: instance.name,
          description: `${instance.instanceType} • ${instance.location}`,
          location: instance.location,
          status: instance.state
        }))
      ),
      catchError(error => {
        console.error('Error loading AlloyDB instances:', error);
        return of(this.getMockAlloyDbInstances());
      })
    );
  }

  // For services not yet implemented, return mock data
  private loadAppEngineServices(): Observable<ResourceOption[]> {
    return of(this.getMockAppEngineServices());
  }

  private loadCloudBuildWorkers(): Observable<ResourceOption[]> {
    return of(this.getMockCloudBuildWorkers());
  }

  private loadCloudSpannerInstances(): Observable<ResourceOption[]> {
    return of(this.getMockCloudSpannerInstances());
  }

  private loadCloudBigtableInstances(): Observable<ResourceOption[]> {
    return of(this.getMockCloudBigtableInstances());
  }

  private loadFilestoreInstances(): Observable<ResourceOption[]> {
    return of(this.getMockFilestoreInstances());
  }

  private loadRedisInstances(): Observable<ResourceOption[]> {
    return of(this.getMockRedisInstances());
  }

  private loadRedisClusters(): Observable<ResourceOption[]> {
    return of(this.getMockRedisClusters());
  }

  private loadLoadBalancers(): Observable<ResourceOption[]> {
    return of(this.getMockLoadBalancers());
  }

  private loadSubnetworks(): Observable<ResourceOption[]> {
    return of(this.getMockSubnetworks());
  }

  private loadPscEndpoints(): Observable<ResourceOption[]> {
    return of(this.getMockPscEndpoints());
  }

  private loadAppHubServices(): Observable<ResourceOption[]> {
    return of(this.getMockAppHubServices());
  }

  private loadIapResources(): Observable<ResourceOption[]> {
    return of(this.getMockIapResources());
  }

  // Helper methods to extract readable names from GCP API URLs
  private extractZoneName(zoneUrl: string): string {
    // Extract zone name from URL like: https://www.googleapis.com/compute/v1/projects/PROJECT/zones/us-central1-a
    const parts = zoneUrl.split('/');
    return parts[parts.length - 1];
  }

  private extractMachineTypeName(machineTypeUrl: string): string {
    // Extract machine type from URL like: https://www.googleapis.com/compute/v1/projects/PROJECT/zones/ZONE/machineTypes/e2-micro
    const parts = machineTypeUrl.split('/');
    return parts[parts.length - 1];
  }

  private extractProjectFromUrl(url: string): string {
    // Extract project ID from any GCP API URL
    const match = url.match(/\/projects\/([^\/]+)\//);
    return match ? match[1] : '*';
  }

  // Helper methods to build proper resource paths
  private buildInstanceResourcePath(instance: VmInstance): string {
    const zoneName = this.extractZoneName(instance.zone);
    const projectId = this.extractProjectFromUrl(instance.zone);
    return `projects/${projectId}/zones/${zoneName}/instances/${instance.name}`;
  }

  private buildClusterResourcePath(cluster: GkeCluster): string {
    return `projects/*/locations/${cluster.location}/clusters/${cluster.name}`;
  }

  private buildCloudRunResourcePath(service: CloudRunServiceData): string {
    return `projects/*/locations/${service.location}/services/${service.name}`;
  }

  private buildCloudRunJobResourcePath(job: any): string {
    return `projects/*/locations/${job.location}/jobs/${job.name}`;
  }

  private buildCloudFunctionResourcePath(func: CloudFunction): string {
    return `projects/*/locations/${func.location}/functions/${func.name}`;
  }

  private buildCloudSqlResourcePath(instance: CloudSqlInstance): string {
    return `projects/*/instances/${instance.name}`;
  }

  private buildAlloyDbResourcePath(instance: AlloyDbInstance): string {
    return `projects/*/locations/${instance.location}/clusters/*/instances/${instance.name}`;
  }

  // Mock data methods (fallback when APIs are not available)
  private getMockVmInstances(): ResourceOption[] {
    return [
      { value: 'batch-jobs-eu', displayName: 'batch-jobs-eu', description: 'e2-medium • europe-west1-b', status: 'RUNNING' },
      { value: 'batch-jobs-us', displayName: 'batch-jobs-us', description: 'e2-medium • us-central1-a', status: 'RUNNING' },
      { value: 'browse-group-eu-yzql', displayName: 'browse-group-eu-yzql', description: 'n1-standard-1 • europe-west1-c', status: 'RUNNING' }
    ];
  }

  private getMockGkeClusters(): ResourceOption[] {
    return [
      { value: 'gke-cluster-1', displayName: 'gke-cluster-1', description: 'Standard • us-central1', status: 'RUNNING' },
      { value: 'gke-cluster-2', displayName: 'gke-cluster-2', description: 'Autopilot • europe-west1', status: 'RUNNING' }
    ];
  }

  private getMockGkeWorkloads(): ResourceOption[] {
    return [
      { value: 'workload-1', displayName: 'frontend-deployment', description: 'Deployment • default namespace' },
      { value: 'workload-2', displayName: 'backend-deployment', description: 'Deployment • production namespace' },
      { value: 'workload-3', displayName: 'worker-daemonset', description: 'DaemonSet • kube-system namespace' }
    ];
  }

  private getMockGkeServices(): ResourceOption[] {
    return [
      { value: 'service-1', displayName: 'frontend-service', description: 'LoadBalancer • default namespace' },
      { value: 'service-2', displayName: 'backend-service', description: 'ClusterIP • production namespace' },
      { value: 'service-3', displayName: 'nginx-ingress', description: 'LoadBalancer • ingress-nginx namespace' }
    ];
  }

  private getMockCloudRunServices(): ResourceOption[] {
    return [
      { value: 'service-1', displayName: 'api-service', description: 'us-central1 • READY' },
      { value: 'service-2', displayName: 'web-frontend', description: 'europe-west1 • READY' }
    ];
  }

  private getMockCloudRunJobs(): ResourceOption[] {
    return [
      { value: 'job-1', displayName: 'data-processor', description: 'us-central1 • READY' },
      { value: 'job-2', displayName: 'batch-import', description: 'europe-west1 • READY' }
    ];
  }

  private getMockCloudFunctions(): ResourceOption[] {
    return [
      { value: 'function-1', displayName: 'process-webhook', description: 'python39 • us-central1' },
      { value: 'function-2', displayName: 'image-resizer', description: 'nodejs16 • europe-west1' }
    ];
  }

  private getMockCloudSqlInstances(): ResourceOption[] {
    return [
      { value: 'instance-1', displayName: 'main-database', description: 'POSTGRES_13 • us-central1' },
      { value: 'instance-2', displayName: 'analytics-db', description: 'MYSQL_8_0 • europe-west1' }
    ];
  }

  private getMockAlloyDbInstances(): ResourceOption[] {
    return [
      { value: 'alloydb-1', displayName: 'production-cluster-primary', description: 'PRIMARY • us-central1' },
      { value: 'alloydb-2', displayName: 'production-cluster-read', description: 'READ_POOL • us-central1' }
    ];
  }

  private getMockAppEngineServices(): ResourceOption[] {
    return [
      { value: 'default', displayName: 'default', description: 'Standard Environment' },
      { value: 'api', displayName: 'api', description: 'Standard Environment' }
    ];
  }

  private getMockCloudBuildWorkers(): ResourceOption[] {
    return [
      { value: 'worker-pool-1', displayName: 'main-worker-pool', description: 'us-central1' },
      { value: 'worker-pool-2', displayName: 'europe-worker-pool', description: 'europe-west1' }
    ];
  }

  private getMockCloudSpannerInstances(): ResourceOption[] {
    return [
      { value: 'spanner-1', displayName: 'production-instance', description: 'Regional • us-central1' },
      { value: 'spanner-2', displayName: 'development-instance', description: 'Regional • us-west1' }
    ];
  }

  private getMockCloudBigtableInstances(): ResourceOption[] {
    return [
      { value: 'bigtable-1', displayName: 'analytics-instance', description: 'Production • us-central1-c' },
      { value: 'bigtable-2', displayName: 'dev-instance', description: 'Development • us-central1-b' }
    ];
  }

  private getMockFilestoreInstances(): ResourceOption[] {
    return [
      { value: 'filestore-1', displayName: 'shared-storage', description: 'Basic HDD • us-central1-a' },
      { value: 'filestore-2', displayName: 'high-perf-storage', description: 'Basic SSD • europe-west1-b' }
    ];
  }

  private getMockRedisInstances(): ResourceOption[] {
    return [
      { value: 'redis-1', displayName: 'cache-instance', description: 'Standard Tier • us-central1-a' },
      { value: 'redis-2', displayName: 'session-store', description: 'Basic Tier • europe-west1-b' }
    ];
  }

  private getMockRedisClusters(): ResourceOption[] {
    return [
      { value: 'redis-cluster-1', displayName: 'production-cluster', description: '3 shards • us-central1' },
      { value: 'redis-cluster-2', displayName: 'dev-cluster', description: '1 shard • us-west1' }
    ];
  }

  private getMockLoadBalancers(): ResourceOption[] {
    return [
      { value: 'lb-1', displayName: 'web-load-balancer', description: 'HTTP(S) • Global' },
      { value: 'lb-2', displayName: 'api-load-balancer', description: 'Network • Regional' }
    ];
  }

  private getMockSubnetworks(): ResourceOption[] {
    return [
      { value: 'subnet-1', displayName: 'default', description: 'us-central1 • 10.128.0.0/20' },
      { value: 'subnet-2', displayName: 'private-subnet', description: 'europe-west1 • 10.132.0.0/20' }
    ];
  }

  private getMockPscEndpoints(): ResourceOption[] {
    return [
      { value: 'psc-endpoint-1', displayName: 'analytics-endpoint', description: 'us-central1' },
      { value: 'psc-endpoint-2', displayName: 'ml-endpoint', description: 'europe-west1' }
    ];
  }

  private getMockAppHubServices(): ResourceOption[] {
    return [
      { value: 'apphub-service-1', displayName: 'web-application', description: 'Multi-cloud application' },
      { value: 'apphub-service-2', displayName: 'data-pipeline', description: 'Analytics workload' }
    ];
  }

  private getMockIapResources(): ResourceOption[] {
    return [
      { value: 'iap-resource-1', displayName: 'admin-console', description: 'Internal web application' },
      { value: 'iap-resource-2', displayName: 'analytics-dashboard', description: 'Business intelligence tool' }
    ];
  }
}