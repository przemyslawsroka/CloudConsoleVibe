import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudFunction {
  name: string;
  location: string;
  status: 'ACTIVE' | 'DEPLOYING' | 'FAILED' | 'UNKNOWN';
  runtime: string;
  trigger: FunctionTrigger;
  sourceArchiveUrl?: string;
  sourceRepository?: SourceRepository;
  httpsTrigger?: HttpsTrigger;
  eventTrigger?: EventTrigger;
  entryPoint: string;
  timeout: string;
  availableMemoryMb: number;
  serviceAccountEmail?: string;
  updateTime: string;
  versionId: string;
  labels: { [key: string]: string };
  environmentVariables: { [key: string]: string };
  maxInstances?: number;
  minInstances?: number;
  vpcConnector?: string;
  ingressSettings?: 'ALLOW_ALL' | 'ALLOW_INTERNAL_ONLY' | 'ALLOW_INTERNAL_AND_GCLB';
  buildWorkerPool?: string;
  dockerRegistry?: 'CONTAINER_REGISTRY' | 'ARTIFACT_REGISTRY';
  dockerRepository?: string;
}

export interface FunctionTrigger {
  type: 'HTTP' | 'EVENT';
  httpsTrigger?: HttpsTrigger;
  eventTrigger?: EventTrigger;
}

export interface HttpsTrigger {
  url: string;
  securityLevel?: 'SECURE_ALWAYS' | 'SECURE_OPTIONAL';
}

export interface EventTrigger {
  eventType: string;
  resource: string;
  service?: string;
  failurePolicy?: FailurePolicy;
}

export interface FailurePolicy {
  retry: boolean;
}

export interface SourceRepository {
  url: string;
  deployedUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudFunctionsService {
  private readonly baseUrlV1 = 'https://cloudfunctions.googleapis.com/v1';
  private readonly baseUrlV2 = 'https://cloudfunctions.googleapis.com/v2';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  /**
   * Get all Cloud Functions (both v1 and v2)
   */
  getFunctions(): Observable<CloudFunction[]> {
    // In demo mode, return mock data
    if (this.authService.isDemoMode()) {
      return of(this.getMockFunctions());
    }

    const project = this.getCurrentProject();
    
    // For now, return mock data as the real API implementation would require proper authentication setup
    return of(this.getMockFunctions()).pipe(
      catchError(error => {
        console.error('Error loading Cloud Functions:', error);
        return of(this.getMockFunctions());
      })
    );
  }

  /**
   * Get Cloud Functions v1 from a specific location
   */
  private getFunctionsV1FromLocation(projectId: string, location: string): Observable<CloudFunction[]> {
    const url = `${this.baseUrlV1}/projects/${projectId}/locations/${location}/functions`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        if (response.functions) {
          return response.functions.map((func: any) => this.transformFunctionV1(func));
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error fetching Cloud Functions v1 from ${location}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get Cloud Functions v2 from a specific location
   */
  private getFunctionsV2FromLocation(projectId: string, location: string): Observable<CloudFunction[]> {
    const url = `${this.baseUrlV2}/projects/${projectId}/locations/${location}/functions`;
    const headers = this.getHeaders();

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        if (response.functions) {
          return response.functions.map((func: any) => this.transformFunctionV2(func));
        }
        return [];
      }),
      catchError(error => {
        console.error(`Error fetching Cloud Functions v2 from ${location}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Transform Cloud Functions v1 API response to our CloudFunction interface
   */
  private transformFunctionV1(gcpFunction: any): CloudFunction {
    const name = this.extractNameFromResourcePath(gcpFunction.name);
    const location = this.extractLocationFromResourcePath(gcpFunction.name);
    
    return {
      name,
      location,
      status: this.mapGcpStatusToOurStatus(gcpFunction.status),
      runtime: gcpFunction.runtime || 'unknown',
      trigger: this.extractTrigger(gcpFunction),
      sourceArchiveUrl: gcpFunction.sourceArchiveUrl,
      sourceRepository: gcpFunction.sourceRepository,
      httpsTrigger: gcpFunction.httpsTrigger,
      eventTrigger: gcpFunction.eventTrigger,
      entryPoint: gcpFunction.entryPoint || 'main',
      timeout: gcpFunction.timeout || '60s',
      availableMemoryMb: gcpFunction.availableMemoryMb || 256,
      serviceAccountEmail: gcpFunction.serviceAccountEmail,
      updateTime: gcpFunction.updateTime || '',
      versionId: gcpFunction.versionId?.toString() || '1',
      labels: gcpFunction.labels || {},
      environmentVariables: gcpFunction.environmentVariables || {},
      maxInstances: gcpFunction.maxInstances,
      minInstances: gcpFunction.minInstances,
      vpcConnector: gcpFunction.vpcConnector,
      ingressSettings: gcpFunction.ingressSettings,
      buildWorkerPool: gcpFunction.buildWorkerPool,
      dockerRegistry: gcpFunction.dockerRegistry,
      dockerRepository: gcpFunction.dockerRepository
    };
  }

  /**
   * Transform Cloud Functions v2 API response to our CloudFunction interface
   */
  private transformFunctionV2(gcpFunction: any): CloudFunction {
    const name = this.extractNameFromResourcePath(gcpFunction.name);
    const location = this.extractLocationFromResourcePath(gcpFunction.name);
    
    return {
      name,
      location,
      status: this.mapGcpStatusToOurStatus(gcpFunction.state),
      runtime: gcpFunction.buildConfig?.runtime || 'unknown',
      trigger: this.extractTriggerV2(gcpFunction),
      entryPoint: gcpFunction.buildConfig?.entryPoint || 'main',
      timeout: gcpFunction.serviceConfig?.timeoutSeconds ? `${gcpFunction.serviceConfig.timeoutSeconds}s` : '60s',
      availableMemoryMb: this.parseMemoryString(gcpFunction.serviceConfig?.availableMemory) || 256,
      serviceAccountEmail: gcpFunction.serviceConfig?.serviceAccountEmail,
      updateTime: gcpFunction.updateTime || '',
      versionId: '2', // v2 functions
      labels: gcpFunction.labels || {},
      environmentVariables: gcpFunction.serviceConfig?.environmentVariables || {},
      maxInstances: gcpFunction.serviceConfig?.maxInstanceCount,
      minInstances: gcpFunction.serviceConfig?.minInstanceCount,
      vpcConnector: gcpFunction.serviceConfig?.vpcConnector,
      ingressSettings: gcpFunction.serviceConfig?.ingressSettings
    };
  }

  /**
   * Extract trigger information from v1 function
   */
  private extractTrigger(gcpFunction: any): FunctionTrigger {
    if (gcpFunction.httpsTrigger) {
      return {
        type: 'HTTP',
        httpsTrigger: gcpFunction.httpsTrigger
      };
    } else if (gcpFunction.eventTrigger) {
      return {
        type: 'EVENT',
        eventTrigger: gcpFunction.eventTrigger
      };
    }
    return { type: 'HTTP' };
  }

  /**
   * Extract trigger information from v2 function
   */
  private extractTriggerV2(gcpFunction: any): FunctionTrigger {
    if (gcpFunction.serviceConfig?.uri) {
      return {
        type: 'HTTP',
        httpsTrigger: {
          url: gcpFunction.serviceConfig.uri,
          securityLevel: gcpFunction.serviceConfig.securityLevel
        }
      };
    } else if (gcpFunction.eventTrigger) {
      return {
        type: 'EVENT',
        eventTrigger: {
          eventType: gcpFunction.eventTrigger.eventType,
          resource: gcpFunction.eventTrigger.eventFilters?.[0]?.value || '',
          service: gcpFunction.eventTrigger.service,
          failurePolicy: gcpFunction.eventTrigger.retryPolicy ? { retry: true } : { retry: false }
        }
      };
    }
    return { type: 'HTTP' };
  }

  /**
   * Map GCP function status to our status enum
   */
  private mapGcpStatusToOurStatus(status: string): 'ACTIVE' | 'DEPLOYING' | 'FAILED' | 'UNKNOWN' {
    switch (status) {
      case 'ACTIVE':
      case 'READY':
        return 'ACTIVE';
      case 'DEPLOYING':
      case 'BUILDING':
        return 'DEPLOYING';
      case 'FAILED':
      case 'ERROR':
        return 'FAILED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Extract function name from resource path
   */
  private extractNameFromResourcePath(resourcePath: string): string {
    const parts = resourcePath.split('/');
    return parts[parts.length - 1] || resourcePath;
  }

  /**
   * Extract location from resource path
   */
  private extractLocationFromResourcePath(resourcePath: string): string {
    const matches = resourcePath.match(/\/locations\/([^\/]+)\//);
    return matches ? matches[1] : 'unknown';
  }

  /**
   * Parse memory string (e.g., "256Mi", "1Gi") to MB
   */
  private parseMemoryString(memoryString?: string): number {
    if (!memoryString) return 256;
    
    const match = memoryString.match(/^(\d+)(\w+)?$/);
    if (!match) return 256;
    
    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase();
    
    switch (unit) {
      case 'gi':
      case 'g':
        return value * 1024;
      case 'mi':
      case 'm':
      default:
        return value;
    }
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
   * Mock Cloud Functions for development/demo
   */
  private getMockFunctions(): CloudFunction[] {
    return [
      {
        name: 'process-webhook',
        location: 'us-central1',
        status: 'ACTIVE',
        runtime: 'python39',
        trigger: {
          type: 'HTTP',
          httpsTrigger: {
            url: 'https://us-central1-project.cloudfunctions.net/process-webhook',
            securityLevel: 'SECURE_ALWAYS'
          }
        },
        entryPoint: 'main',
        timeout: '60s',
        availableMemoryMb: 256,
        serviceAccountEmail: 'project@appspot.gserviceaccount.com',
        updateTime: '2024-01-15T10:30:00Z',
        versionId: '1',
        labels: {
          'environment': 'production',
          'team': 'backend'
        },
        environmentVariables: {
          'LOG_LEVEL': 'INFO'
        },
        maxInstances: 10,
        ingressSettings: 'ALLOW_ALL'
      },
      {
        name: 'image-resizer',
        location: 'europe-west1',
        status: 'ACTIVE',
        runtime: 'nodejs16',
        trigger: {
          type: 'EVENT',
          eventTrigger: {
            eventType: 'google.storage.object.finalize',
            resource: 'projects/project/buckets/upload-bucket',
            service: 'storage.googleapis.com'
          }
        },
        entryPoint: 'resize',
        timeout: '120s',
        availableMemoryMb: 512,
        serviceAccountEmail: 'project@appspot.gserviceaccount.com',
        updateTime: '2024-01-16T14:20:00Z',
        versionId: '2',
        labels: {
          'environment': 'production',
          'team': 'media'
        },
        environmentVariables: {
          'MAX_WIDTH': '1920',
          'MAX_HEIGHT': '1080'
        },
        maxInstances: 5,
        ingressSettings: 'ALLOW_INTERNAL_ONLY'
      },
      {
        name: 'data-processor',
        location: 'us-east1',
        status: 'ACTIVE',
        runtime: 'go116',
        trigger: {
          type: 'HTTP',
          httpsTrigger: {
            url: 'https://us-east1-project.cloudfunctions.net/data-processor',
            securityLevel: 'SECURE_ALWAYS'
          }
        },
        entryPoint: 'ProcessData',
        timeout: '300s',
        availableMemoryMb: 1024,
        serviceAccountEmail: 'data-processor@project.iam.gserviceaccount.com',
        updateTime: '2024-01-17T09:15:00Z',
        versionId: '3',
        labels: {
          'environment': 'production',
          'team': 'data'
        },
        environmentVariables: {
          'DATABASE_URL': 'postgresql://...',
          'BATCH_SIZE': '1000'
        },
        maxInstances: 20,
        minInstances: 2,
        ingressSettings: 'ALLOW_INTERNAL_AND_GCLB'
      }
    ];
  }
}