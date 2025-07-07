import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';

export interface CloudStorageBucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  created: string;
  updated: string;
  metageneration: string;
  publicAccess: string;
  accessControl: string;
  protection: string;
  hierarchicalNamespace: string;
  selfLink: string;
  projectNumber: string;
  labels?: { [key: string]: string };
  lifecycle?: {
    rule: any[];
  };
  versioning?: {
    enabled: boolean;
  };
  encryption?: {
    defaultKmsKeyName?: string;
  };
  iamConfiguration?: {
    uniformBucketLevelAccess?: {
      enabled: boolean;
      lockedTime?: string;
    };
    publicAccessPrevention?: string;
  };
}

export interface CloudStorageObject {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  storageClass: string;
  size: string;
  md5Hash: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  cacheControl?: string;
  metadata?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class CloudStorageService {
  private baseUrl = 'https://storage.googleapis.com/storage/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {}

  /**
   * Get all Cloud Storage buckets for a project
   */
  getBuckets(projectId?: string): Observable<CloudStorageBucket[]> {
    console.log('CloudStorageService.getBuckets called');
    
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      console.log('Using mock data for Cloud Storage buckets');
      return this.getMockBuckets();
    }

    const project = projectId || this.projectService.getCurrentProject()?.id;
    if (!project) {
      console.log('No project available, using mock data');
      return this.getMockBuckets();
    }

    const url = `${this.baseUrl}/b?project=${project}`;
    console.log('Making API call to:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('API response received:', response);
        
        // Handle different possible response structures
        let buckets: any[] = [];
        if (response.items) {
          buckets = response.items;
        } else if (Array.isArray(response)) {
          buckets = response;
        } else {
          console.log('Unexpected response structure, using empty array');
          console.log('Response keys:', Object.keys(response));
        }
        
        console.log('Raw buckets from API:', buckets);
        const convertedBuckets = buckets.map(bucket => this.convertGcpBucket(bucket));
        console.log('Converted buckets:', convertedBuckets);
        return convertedBuckets;
      }),
      catchError(error => {
        console.warn('Google Cloud Storage API call failed, falling back to mock data:', error);
        if (error.status === 400) {
          console.warn('Cloud Storage API might not be enabled for this project or requires additional permissions');
        } else if (error.status === 403) {
          console.warn('Insufficient permissions for Cloud Storage API. Required scopes: https://www.googleapis.com/auth/cloud-platform');
        }
        return this.getMockBuckets();
      })
    );
  }

  /**
   * Get objects in a specific bucket
   */
  getBucketObjects(bucketName: string, prefix?: string): Observable<CloudStorageObject[]> {
    console.log('CloudStorageService.getBucketObjects called for bucket:', bucketName);
    
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      return this.getMockBucketObjects(bucketName);
    }

    let url = `${this.baseUrl}/b/${bucketName}/o`;
    if (prefix) {
      url += `?prefix=${encodeURIComponent(prefix)}`;
    }
    
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const objects = response.items || [];
        return objects.map((obj: any) => this.convertGcpObject(obj));
      }),
      catchError(error => {
        console.warn('Failed to load bucket objects, falling back to mock data:', error);
        return this.getMockBucketObjects(bucketName);
      })
    );
  }

  /**
   * Create a new bucket
   */
  createBucket(bucketConfig: Partial<CloudStorageBucket>): Observable<any> {
    console.log('CloudStorageService.createBucket called:', bucketConfig);
    
    // Return mock response in demo mode
    if (this.authService.isDemoMode()) {
      return of({
        kind: 'storage#bucket',
        id: bucketConfig.name,
        name: bucketConfig.name,
        projectNumber: '123456789',
        metageneration: '1',
        location: bucketConfig.location || 'US',
        storageClass: bucketConfig.storageClass || 'STANDARD',
        etag: 'CAE=',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        selfLink: `https://www.googleapis.com/storage/v1/b/${bucketConfig.name}`
      });
    }

    const project = this.projectService.getCurrentProject()?.id;
    if (!project) {
      throw new Error('No project selected');
    }

    const url = `${this.baseUrl}/b?project=${project}`;
    
    return this.http.post<any>(url, bucketConfig, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error creating bucket:', error);
        throw error;
      })
    );
  }

  /**
   * Delete a bucket
   */
  deleteBucket(bucketName: string): Observable<any> {
    console.log('CloudStorageService.deleteBucket called for bucket:', bucketName);
    
    // Return mock response in demo mode
    if (this.authService.isDemoMode()) {
      return of({ success: true });
    }

    const url = `${this.baseUrl}/b/${bucketName}`;
    
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting bucket:', error);
        throw error;
      })
    );
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private convertGcpBucket(gcpBucket: any): CloudStorageBucket {
    return {
      id: gcpBucket.id,
      name: gcpBucket.name,
      location: gcpBucket.location || 'Unknown',
      storageClass: gcpBucket.storageClass || 'STANDARD',
      created: gcpBucket.timeCreated || new Date().toISOString(),
      updated: gcpBucket.updated || new Date().toISOString(),
      metageneration: gcpBucket.metageneration || '1',
      publicAccess: this.getPublicAccessStatus(gcpBucket),
      accessControl: this.getAccessControlStatus(gcpBucket),
      protection: this.getProtectionStatus(gcpBucket),
      hierarchicalNamespace: gcpBucket.hierarchicalNamespace?.enabled ? 'Enabled' : 'Not enabled',
      selfLink: gcpBucket.selfLink,
      projectNumber: gcpBucket.projectNumber,
      labels: gcpBucket.labels,
      lifecycle: gcpBucket.lifecycle,
      versioning: gcpBucket.versioning,
      encryption: gcpBucket.encryption,
      iamConfiguration: gcpBucket.iamConfiguration
    };
  }

  private convertGcpObject(gcpObject: any): CloudStorageObject {
    return {
      name: gcpObject.name,
      bucket: gcpObject.bucket,
      generation: gcpObject.generation,
      metageneration: gcpObject.metageneration,
      contentType: gcpObject.contentType || 'application/octet-stream',
      timeCreated: gcpObject.timeCreated,
      updated: gcpObject.updated,
      storageClass: gcpObject.storageClass,
      size: gcpObject.size,
      md5Hash: gcpObject.md5Hash,
      contentDisposition: gcpObject.contentDisposition,
      contentEncoding: gcpObject.contentEncoding,
      contentLanguage: gcpObject.contentLanguage,
      cacheControl: gcpObject.cacheControl,
      metadata: gcpObject.metadata
    };
  }

  private getPublicAccessStatus(bucket: any): string {
    if (bucket.iamConfiguration?.publicAccessPrevention === 'enforced') {
      return 'Subject to object ACLs';
    }
    if (bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled) {
      return 'Not public';
    }
    return 'Subject to object ACLs';
  }

  private getAccessControlStatus(bucket: any): string {
    return bucket.iamConfiguration?.uniformBucketLevelAccess?.enabled ? 'Uniform' : 'Fine-grained';
  }

  private getProtectionStatus(bucket: any): string {
    const protections = [];
    if (bucket.versioning?.enabled) {
      protections.push('Versioning');
    }
    if (bucket.lifecycle?.rule && bucket.lifecycle.rule.length > 0) {
      protections.push('Soft Delete');
    }
    return protections.length > 0 ? protections.join(', ') : 'None';
  }

  private getMockBuckets(): Observable<CloudStorageBucket[]> {
    const mockBuckets: CloudStorageBucket[] = [
      {
        id: 'artifacts.przemeksroka-joonix-log-test',
        name: 'artifacts.przemeksroka-joonix-log-test',
        location: 'US',
        storageClass: 'STANDARD',
        created: 'Feb 22, 2024, 12:07:35 AM',
        updated: 'Feb 22, 2024, 12:07:35 AM',
        metageneration: '1',
        publicAccess: 'Subject to object ACLs',
        accessControl: 'Fine-grained',
        protection: 'Soft Delete',
        hierarchicalNamespace: 'Not enabled',
        selfLink: 'https://www.googleapis.com/storage/v1/b/artifacts.przemeksroka-joonix-log-test',
        projectNumber: '123456789',
        labels: {},
        versioning: { enabled: false },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: false },
          publicAccessPrevention: 'inherited'
        }
      },
      {
        id: 'gcf-v2-sources-931553240540-us-central1',
        name: 'gcf-v2-sources-931553240540-us-central1',
        location: 'us-central1',
        storageClass: 'STANDARD',
        created: 'Dec 13, 2024, 4:51:31 PM',
        updated: 'Dec 13, 2024, 4:51:31 PM',
        metageneration: '1',
        publicAccess: 'Not public',
        accessControl: 'Uniform',
        protection: 'Soft Delete, Versioning',
        hierarchicalNamespace: 'Not enabled',
        selfLink: 'https://www.googleapis.com/storage/v1/b/gcf-v2-sources-931553240540-us-central1',
        projectNumber: '931553240540',
        labels: {},
        versioning: { enabled: true },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: true },
          publicAccessPrevention: 'inherited'
        }
      },
      {
        id: 'gcf-v2-uploads-931553240540-us-central1',
        name: 'gcf-v2-uploads-931553240540-us-central1',
        location: 'us-central1',
        storageClass: 'STANDARD',
        created: 'Dec 13, 2024, 4:51:29 PM',
        updated: 'Dec 13, 2024, 4:51:29 PM',
        metageneration: '1',
        publicAccess: 'Not public',
        accessControl: 'Uniform',
        protection: 'Soft Delete',
        hierarchicalNamespace: 'Not enabled',
        selfLink: 'https://www.googleapis.com/storage/v1/b/gcf-v2-uploads-931553240540-us-central1',
        projectNumber: '931553240540',
        labels: {},
        versioning: { enabled: false },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: true },
          publicAccessPrevention: 'inherited'
        }
      },
      {
        id: 'przemeksroka-joonix-log-test-cloudbuild',
        name: 'przemeksroka-joonix-log-test-cloudbuild',
        location: 'US',
        storageClass: 'STANDARD',
        created: 'Jun 9, 2025, 5:16:51 PM',
        updated: 'Jun 9, 2025, 5:16:51 PM',
        metageneration: '1',
        publicAccess: 'Subject to object ACLs',
        accessControl: 'Fine-grained',
        protection: 'Soft Delete',
        hierarchicalNamespace: 'Not enabled',
        selfLink: 'https://www.googleapis.com/storage/v1/b/przemeksroka-joonix-log-test-cloudbuild',
        projectNumber: '123456789',
        labels: {},
        versioning: { enabled: false },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: false },
          publicAccessPrevention: 'inherited'
        }
      },
      {
        id: 'run-sources-przemeksroka-joonix-log-test',
        name: 'run-sources-przemeksroka-joonix-log-test',
        location: 'us-central1',
        storageClass: 'STANDARD',
        created: 'Mar 26, 2025, 3:39:59 PM',
        updated: 'Mar 26, 2025, 3:39:59 PM',
        metageneration: '1',
        publicAccess: 'Not public',
        accessControl: 'Uniform',
        protection: 'Soft Delete',
        hierarchicalNamespace: 'Not enabled',
        selfLink: 'https://www.googleapis.com/storage/v1/b/run-sources-przemeksroka-joonix-log-test',
        projectNumber: '123456789',
        labels: {},
        versioning: { enabled: false },
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: true },
          publicAccessPrevention: 'inherited'
        }
      }
    ];

    console.log('🎭 Serving mock Cloud Storage buckets for demo');
    return of(mockBuckets);
  }

  private getMockBucketObjects(bucketName: string): Observable<CloudStorageObject[]> {
    const mockObjects: CloudStorageObject[] = [
      {
        name: 'containers/',
        bucket: bucketName,
        generation: '1234567890123456',
        metageneration: '1',
        contentType: 'application/x-directory',
        timeCreated: '2024-01-15T10:30:00.000Z',
        updated: '2024-01-15T10:30:00.000Z',
        storageClass: 'STANDARD',
        size: '0',
        md5Hash: ''
      },
      {
        name: 'images/',
        bucket: bucketName,
        generation: '1234567890123457',
        metageneration: '1',
        contentType: 'application/x-directory',
        timeCreated: '2024-01-10T08:15:00.000Z',
        updated: '2024-01-10T08:15:00.000Z',
        storageClass: 'STANDARD',
        size: '0',
        md5Hash: ''
      },
      {
        name: 'config.json',
        bucket: bucketName,
        generation: '1234567890123458',
        metageneration: '1',
        contentType: 'application/json',
        timeCreated: '2024-02-01T14:20:00.000Z',
        updated: '2024-02-01T14:20:00.000Z',
        storageClass: 'STANDARD',
        size: '2048',
        md5Hash: 'Q2h1Y2sgSW50ZWdyaXR5IQ=='
      },
      {
        name: 'deployment.yaml',
        bucket: bucketName,
        generation: '1234567890123459',
        metageneration: '1',
        contentType: 'text/yaml',
        timeCreated: '2024-01-28T16:45:00.000Z',
        updated: '2024-01-28T16:45:00.000Z',
        storageClass: 'STANDARD',
        size: '4096',
        md5Hash: 'Q2h1Y2sgSW50ZWdyaXR5IQ=='
      },
      {
        name: 'logs/app.log',
        bucket: bucketName,
        generation: '1234567890123460',
        metageneration: '1',
        contentType: 'text/plain',
        timeCreated: '2024-02-05T09:30:00.000Z',
        updated: '2024-02-05T09:30:00.000Z',
        storageClass: 'STANDARD',
        size: '1048576',
        md5Hash: 'Q2h1Y2sgSW50ZWdyaXR5IQ=='
      },
      {
        name: 'backup.tar.gz',
        bucket: bucketName,
        generation: '1234567890123461',
        metageneration: '1',
        contentType: 'application/gzip',
        timeCreated: '2024-01-20T12:00:00.000Z',
        updated: '2024-01-20T12:00:00.000Z',
        storageClass: 'COLDLINE',
        size: '536870912',
        md5Hash: 'Q2h1Y2sgSW50ZWdyaXR5IQ=='
      }
    ];

    console.log('🎭 Serving mock bucket objects for demo');
    return of(mockObjects);
  }
} 