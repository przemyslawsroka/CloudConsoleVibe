import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudRunServiceData {
  name: string;
  namespace: string;
  location: string;
  status: 'READY' | 'DEPLOYING' | 'FAILED' | 'UNKNOWN';
  url?: string;
  traffic: TrafficAllocation[];
  latestRevision: string;
  creationTimestamp: string;
  updateTimestamp: string;
  annotations: { [key: string]: string };
  labels: { [key: string]: string };
  spec: CloudRunServiceSpec;
  // Extra fields used for UI list (may be derived/estimated)
  deploymentType?: 'service' | 'function' | 'job' | 'unknown';
  requestsPerSecond?: number;
  authentication?: 'Public access' | 'Require authentication' | 'Unknown';
  ingress?: string;
  deployedBy?: string;
}

export interface CloudRunJob {
  name: string;
  namespace: string;
  location: string;
  status: 'READY' | 'RUNNING' | 'FAILED' | 'UNKNOWN';
  creationTimestamp: string;
  updateTimestamp: string;
  annotations: { [key: string]: string };
  labels: { [key: string]: string };
  spec: CloudRunJobSpec;
}

export interface TrafficAllocation {
  revisionName: string;
  percent: number;
  tag?: string;
}

export interface CloudRunServiceSpec {
  template: RevisionTemplate;
  traffic: TrafficAllocation[];
}

export interface CloudRunJobSpec {
  template: JobTemplate;
}

export interface RevisionTemplate {
  metadata: {
    name?: string;
    annotations: { [key: string]: string };
    labels: { [key: string]: string };
  };
  spec: RevisionSpec;
}

export interface JobTemplate {
  spec: {
    containers: Container[];
    restartPolicy: string;
  };
  parallelism?: number;
  completions?: number;
}

export interface RevisionSpec {
  containerConcurrency: number;
  timeoutSeconds: number;
  containers: Container[];
  volumes?: Volume[];
}

export interface JobSpec {
  template: {
    spec: {
      containers: Container[];
      restartPolicy: string;
    };
  };
  parallelism?: number;
  completions?: number;
}

export interface Container {
  name: string;
  image: string;
  ports?: Port[];
  env?: EnvironmentVariable[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
}

export interface Port {
  name?: string;
  containerPort: number;
  protocol?: string;
}

export interface EnvironmentVariable {
  name: string;
  value?: string;
  valueFrom?: EnvironmentVariableSource;
}

export interface EnvironmentVariableSource {
  secretKeyRef?: SecretKeySelector;
  configMapKeyRef?: ConfigMapKeySelector;
}

export interface SecretKeySelector {
  name: string;
  key: string;
}

export interface ConfigMapKeySelector {
  name: string;
  key: string;
}

export interface ResourceRequirements {
  limits?: { [key: string]: string };
  requests?: { [key: string]: string };
}

export interface Volume {
  name: string;
  secret?: SecretVolumeSource;
  configMap?: ConfigMapVolumeSource;
}

export interface SecretVolumeSource {
  secretName: string;
  items?: KeyToPath[];
}

export interface ConfigMapVolumeSource {
  name: string;
  items?: KeyToPath[];
}

export interface KeyToPath {
  key: string;
  path: string;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CloudRunService {
  // Prefer Admin API v2 which supports aggregated listing via locations/-
  private readonly baseUrlV2 = 'https://run.googleapis.com/v2';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  /**
   * Get all Cloud Run services
   */
  getServices(): Observable<CloudRunServiceData[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockServices());
    }

    const project = this.getCurrentProject();
    if (!project) {
      return of([]);
    }

    // Aggregated list across all locations using v2
    const url = `${this.baseUrlV2}/projects/${project}/locations/-/services`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        const items: any[] = response.services || response.items || [];
        return items.map((svc: any) => this.transformServiceV2(svc));
      }),
      catchError(error => {
        console.error('Error fetching Cloud Run services:', error);
        return of(this.getMockServices());
      })
    );
  }

  /**
   * Get all Cloud Run jobs
   */
  getJobs(): Observable<CloudRunJob[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockJobs());
    }

    const project = this.getCurrentProject();
    const locations = ['us-central1', 'us-east1', 'europe-west1', 'asia-east1']; // Common regions
    
    // Get jobs from all locations
    return of([]).pipe( // For now, return empty array and fall back to mock
      catchError(() => of(this.getMockJobs()))
    );
  }

  /**
   * Get services from a specific location
   */
  private getServicesFromLocation(projectId: string, location: string): Observable<CloudRunServiceData[]> {
    const url = `${this.baseUrlV2}/projects/${projectId}/locations/${location}/services`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        const items: any[] = response.services || response.items || [];
        return items.map((item: any) => this.transformServiceV2(item));
      }),
      catchError(error => {
        console.error(`Error fetching Cloud Run services from ${location}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Transform GCP API response to our CloudRunServiceData interface
   */
  private transformService(gcpService: any): CloudRunServiceData {
    // v1 fallback (rarely used now)
    return {
      name: gcpService.metadata?.name || '',
      namespace: gcpService.metadata?.namespace || '',
      location: this.extractLocationFromSelfLink(gcpService.metadata?.selfLink),
      status: gcpService.status?.conditions?.[0]?.status === 'True' ? 'READY' : 'UNKNOWN',
      url: gcpService.status?.url,
      traffic: gcpService.status?.traffic || [],
      latestRevision: gcpService.status?.latestCreatedRevisionName || '',
      creationTimestamp: gcpService.metadata?.creationTimestamp || '',
      updateTimestamp: gcpService.metadata?.updateTimestamp || '',
      annotations: gcpService.metadata?.annotations || {},
      labels: gcpService.metadata?.labels || {},
      spec: {
        template: gcpService.spec?.template || {},
        traffic: gcpService.spec?.traffic || []
      }
    };
  }

  private transformServiceV2(svc: any): CloudRunServiceData {
    const namePath: string = svc.name || '';
    const locationMatch = namePath.match(/projects\/[^/]+\/locations\/([^/]+)\/services\//);
    const location = locationMatch ? locationMatch[1] : 'unknown';
    const deploymentType = this.detectDeploymentType(svc);

    const traffic: TrafficAllocation[] = (svc.traffic || []).map((t: any) => ({
      revisionName: t.revision || t.revisionName || '',
      percent: t.percent || 0,
      tag: t.tag
    }));

    const transformed: CloudRunServiceData = {
      name: (namePath.split('/').pop()) || svc.displayName || '',
      namespace: this.getCurrentProject(),
      location,
      status: svc.uri ? 'READY' : 'UNKNOWN',
      url: svc.uri,
      traffic,
      latestRevision: svc.latestCreatedRevision || '',
      creationTimestamp: svc.createTime || '',
      updateTimestamp: svc.updateTime || '',
      annotations: svc.annotations || {},
      labels: { deploymentType, ...(svc.labels || {}) },
      spec: {
        template: svc.template || {},
        traffic
      },
      deploymentType: (deploymentType as any) || 'service',
      authentication: (svc.ingress && svc.ingress.toLowerCase() === 'ingress-all') ? 'Public access' : 'Unknown',
      ingress: svc.ingress || 'All',
      deployedBy: svc.creator || svc.annotations?.['run.googleapis.com/creator']
    };

    return transformed;
  }

  private detectDeploymentType(svc: any): string {
    const labels = svc.labels || {};
    const annotations = svc.annotations || {};
    if (labels["goog-managed-by"] === 'cloudfunctions' || labels["cloud.googleapis.com/location"] && labels["deployment"] === 'function') {
      return 'function';
    }
    if (annotations['run.googleapis.com/creator']) {
      return 'service';
    }
    return 'service';
  }

  /**
   * Transform GCP API response to our CloudRunJob interface
   */
  private transformJob(gcpJob: any): CloudRunJob {
    return {
      name: gcpJob.metadata?.name || '',
      namespace: gcpJob.metadata?.namespace || '',
      location: this.extractLocationFromSelfLink(gcpJob.metadata?.selfLink),
      status: gcpJob.status?.conditions?.[0]?.status === 'True' ? 'READY' : 'UNKNOWN',
      creationTimestamp: gcpJob.metadata?.creationTimestamp || '',
      updateTimestamp: gcpJob.metadata?.updateTimestamp || '',
      annotations: gcpJob.metadata?.annotations || {},
      labels: gcpJob.metadata?.labels || {},
      spec: gcpJob.spec || {}
    };
  }

  /**
   * Extract location from GCP resource self link
   */
  private extractLocationFromSelfLink(selfLink?: string): string {
    if (!selfLink) return 'unknown';
    const matches = selfLink.match(/\/locations\/([^\/]+)\//);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Get current project ID
   */
  private getCurrentProject(): string {
    const project = this.projectService.getCurrentProject();
    return project?.id || 'unknown-project';
  }

  /**
   * Get HTTP headers with authentication
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Mock Cloud Run services for development/demo
   */
  private getMockServices(): CloudRunServiceData[] {
    return [
      {
        name: 'api-service',
        namespace: 'default',
        location: 'us-central1',
        status: 'READY',
        url: 'https://api-service-123456-uc.a.run.app',
        traffic: [{ revisionName: 'api-service-00001-abc', percent: 100 }],
        latestRevision: 'api-service-00001-abc',
        creationTimestamp: '2024-01-15T10:30:00Z',
        updateTimestamp: '2024-01-15T10:30:00Z',
        annotations: {},
        labels: { 'environment': 'production' },
        spec: {
          template: {
            metadata: {
              annotations: {},
              labels: {}
            },
            spec: {
              containerConcurrency: 100,
              timeoutSeconds: 300,
              containers: [{
                name: 'api-service',
                image: 'gcr.io/project/api-service:latest',
                ports: [{ containerPort: 8080 }]
              }]
            }
          },
          traffic: [{ revisionName: 'api-service-00001-abc', percent: 100 }]
        }
      },
      {
        name: 'web-frontend',
        namespace: 'default',
        location: 'europe-west1',
        status: 'READY',
        url: 'https://web-frontend-789012-ew.a.run.app',
        traffic: [{ revisionName: 'web-frontend-00002-def', percent: 100 }],
        latestRevision: 'web-frontend-00002-def',
        creationTimestamp: '2024-01-16T14:20:00Z',
        updateTimestamp: '2024-01-16T14:20:00Z',
        annotations: {},
        labels: { 'environment': 'production' },
        spec: {
          template: {
            metadata: {
              annotations: {},
              labels: {}
            },
            spec: {
              containerConcurrency: 1000,
              timeoutSeconds: 300,
              containers: [{
                name: 'web-frontend',
                image: 'gcr.io/project/web-frontend:latest',
                ports: [{ containerPort: 3000 }]
              }]
            }
          },
          traffic: [{ revisionName: 'web-frontend-00002-def', percent: 100 }]
        }
      }
    ];
  }

  /**
   * Mock Cloud Run jobs for development/demo
   */
  private getMockJobs(): CloudRunJob[] {
    return [
      {
        name: 'data-processor',
        namespace: 'default',
        location: 'us-central1',
        status: 'READY',
        creationTimestamp: '2024-01-15T09:00:00Z',
        updateTimestamp: '2024-01-15T09:00:00Z',
        annotations: {},
        labels: { 'type': 'batch-processing' },
        spec: {
          template: {
            spec: {
              containers: [{
                name: 'processor',
                image: 'gcr.io/project/data-processor:latest'
              }],
              restartPolicy: 'Never'
            },
            parallelism: 5,
            completions: 10
          }
        }
      },
      {
        name: 'batch-import',
        namespace: 'default',
        location: 'europe-west1',
        status: 'READY',
        creationTimestamp: '2024-01-16T12:00:00Z',
        updateTimestamp: '2024-01-16T12:00:00Z',
        annotations: {},
        labels: { 'type': 'data-import' },
        spec: {
          template: {
            spec: {
              containers: [{
                name: 'importer',
                image: 'gcr.io/project/batch-import:latest'
              }],
              restartPolicy: 'OnFailure'
            },
            parallelism: 1,
            completions: 1
          }
        }
      }
    ];
  }
}