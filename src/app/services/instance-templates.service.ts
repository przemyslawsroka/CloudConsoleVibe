import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectService, Project } from './project.service';

// Instance Template interfaces based on GCP Compute Engine API
export interface InstanceTemplate {
  id: string;
  name: string;
  description?: string;
  properties: InstanceProperties;
  creationTimestamp: string;
  selfLink: string;
  kind: string;
}

export interface InstanceProperties {
  machineType: string;
  disks: TemplateDisk[];
  networkInterfaces: TemplateNetworkInterface[];
  serviceAccounts?: TemplateServiceAccount[];
  metadata?: TemplateMetadata;
  tags?: TemplateTags;
  labels?: { [key: string]: string };
  scheduling?: TemplateScheduling;
  canIpForward?: boolean;
  shieldedInstanceConfig?: TemplateShieldedInstanceConfig;
  confidentialInstanceConfig?: TemplateConfidentialInstanceConfig;
  reservationAffinity?: TemplateReservationAffinity;
  displayDevice?: TemplateDisplayDevice;
}

export interface TemplateDisk {
  boot: boolean;
  autoDelete: boolean;
  type: 'PERSISTENT' | 'SCRATCH';
  mode: 'READ_WRITE' | 'READ_ONLY';
  deviceName: string;
  initializeParams?: {
    sourceImage?: string;
    diskSizeGb?: string;
    diskType?: string;
    labels?: { [key: string]: string };
  };
  interface?: 'SCSI' | 'NVME';
  guestOsFeatures?: Array<{ type: string }>;
}

export interface TemplateNetworkInterface {
  network?: string;
  subnetwork?: string;
  accessConfigs?: TemplateAccessConfig[];
  aliasIpRanges?: Array<{
    ipCidrRange: string;
    subnetworkRangeName?: string;
  }>;
}

export interface TemplateAccessConfig {
  type: string;
  name: string;
  networkTier?: string;
}

export interface TemplateServiceAccount {
  email: string;
  scopes: string[];
}

export interface TemplateMetadata {
  items: Array<{
    key: string;
    value: string;
  }>;
}

export interface TemplateTags {
  items: string[];
}

export interface TemplateScheduling {
  automaticRestart?: boolean;
  onHostMaintenance?: 'MIGRATE' | 'TERMINATE';
  preemptible?: boolean;
}

export interface TemplateShieldedInstanceConfig {
  enableSecureBoot?: boolean;
  enableVtpm?: boolean;
  enableIntegrityMonitoring?: boolean;
}

export interface TemplateConfidentialInstanceConfig {
  enableConfidentialCompute?: boolean;
}

export interface TemplateReservationAffinity {
  consumeReservationType: 'ANY_RESERVATION' | 'SPECIFIC_RESERVATION' | 'NO_RESERVATION';
  key?: string;
  values?: string[];
}

export interface TemplateDisplayDevice {
  enableDisplay?: boolean;
}

export interface InstanceTemplatesListResponse {
  kind: string;
  id: string;
  items: InstanceTemplate[];
  selfLink: string;
  nextPageToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstanceTemplatesService {
  private readonly baseUrl = 'https://compute.googleapis.com/compute/v1';
  private templatesSubject = new BehaviorSubject<InstanceTemplate[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public templates$ = this.templatesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // Mock data for demo mode
  private mockTemplates: InstanceTemplate[] = [
    {
      id: '1234567890123456789',
      name: 'instance-group-1',
      description: 'Template for web servers',
      creationTimestamp: '2024-05-22T15:55:09.000-07:00',
      selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/instanceTemplates/instance-group-1',
      kind: 'compute#instanceTemplate',
      properties: {
        machineType: 'e2-medium',
        disks: [
          {
            boot: true,
            autoDelete: true,
            type: 'PERSISTENT',
            mode: 'READ_WRITE',
            deviceName: 'persistent-disk-0',
            initializeParams: {
              sourceImage: 'projects/debian-cloud/global/images/family/debian-11',
              diskSizeGb: '10',
              diskType: 'pd-standard'
            },
            interface: 'SCSI'
          }
        ],
        networkInterfaces: [
          {
            network: 'projects/demo-project/global/networks/default',
            accessConfigs: [
              {
                type: 'ONE_TO_ONE_NAT',
                name: 'External NAT',
                networkTier: 'PREMIUM'
              }
            ]
          }
        ],
        serviceAccounts: [
          {
            email: 'default',
            scopes: [
              'https://www.googleapis.com/auth/devstorage.read_only',
              'https://www.googleapis.com/auth/logging.write',
              'https://www.googleapis.com/auth/monitoring.write',
              'https://www.googleapis.com/auth/servicecontrol',
              'https://www.googleapis.com/auth/service.management.readonly',
              'https://www.googleapis.com/auth/trace.append'
            ]
          }
        ],
        metadata: {
          items: [
            {
              key: 'startup-script',
              value: '#!/bin/bash\napt-get update\napt-get install -y nginx\nsystemctl start nginx'
            }
          ]
        },
        tags: {
          items: ['http-server', 'https-server']
        },
        scheduling: {
          automaticRestart: true,
          onHostMaintenance: 'MIGRATE',
          preemptible: false
        },
        shieldedInstanceConfig: {
          enableSecureBoot: false,
          enableVtpm: true,
          enableIntegrityMonitoring: true
        }
      }
    },
    {
      id: '2345678901234567890',
      name: 'database-template',
      description: 'Template for database servers',
      creationTimestamp: '2024-05-20T10:30:15.000-07:00',
      selfLink: 'https://www.googleapis.com/compute/v1/projects/demo-project/global/instanceTemplates/database-template',
      kind: 'compute#instanceTemplate',
      properties: {
        machineType: 'n2-standard-4',
        disks: [
          {
            boot: true,
            autoDelete: true,
            type: 'PERSISTENT',
            mode: 'READ_WRITE',
            deviceName: 'persistent-disk-0',
            initializeParams: {
              sourceImage: 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts',
              diskSizeGb: '20',
              diskType: 'pd-ssd'
            },
            interface: 'SCSI'
          }
        ],
        networkInterfaces: [
          {
            network: 'projects/demo-project/global/networks/production-vpc',
            subnetwork: 'projects/demo-project/regions/us-central1/subnetworks/prod-us-central1'
          }
        ],
        serviceAccounts: [
          {
            email: 'database-service@demo-project.iam.gserviceaccount.com',
            scopes: [
              'https://www.googleapis.com/auth/cloud-platform'
            ]
          }
        ],
        metadata: {
          items: [
            {
              key: 'enable-oslogin',
              value: 'TRUE'
            }
          ]
        },
        tags: {
          items: ['database', 'internal']
        },
        scheduling: {
          automaticRestart: true,
          onHostMaintenance: 'MIGRATE',
          preemptible: false
        },
        shieldedInstanceConfig: {
          enableSecureBoot: true,
          enableVtpm: true,
          enableIntegrityMonitoring: true
        }
      }
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private projectService: ProjectService
  ) {
    this.loadTemplates();
  }

  loadTemplates(): Observable<InstanceTemplate[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      this.templatesSubject.next(this.mockTemplates);
      this.loadingSubject.next(false);
      return of(this.mockTemplates);
    }

    return this.projectService.currentProject$.pipe(
      switchMap((project: Project | null) => {
        if (!project?.id) {
          this.loadingSubject.next(false);
          this.errorSubject.next('No project selected');
          return of([]);
        }

        const headers = this.getAuthHeaders();
        const url = `${this.baseUrl}/projects/${project.id}/global/instanceTemplates`;

        return this.http.get<InstanceTemplatesListResponse>(url, { headers }).pipe(
          map(response => response.items || []),
          tap(templates => {
            this.templatesSubject.next(templates);
            this.loadingSubject.next(false);
          }),
          catchError(error => {
            console.error('Failed to load instance templates:', error);
            this.errorSubject.next('Failed to load instance templates');
            this.loadingSubject.next(false);
            // Don't fall back to mock data when authenticated with real Google account
            return of([]);
          })
        );
      })
    );
  }

  getInstanceTemplate(templateName: string): Observable<InstanceTemplate | null> {
    // Return mock data in demo mode
    if (this.authService.isDemoMode()) {
      const template = this.mockTemplates.find(t => t.name === templateName);
      return of(template || null);
    }

    return this.projectService.currentProject$.pipe(
      switchMap((project: Project | null) => {
        if (!project?.id) {
          return of(null);
        }

        const headers = this.getAuthHeaders();
        const url = `${this.baseUrl}/projects/${project.id}/global/instanceTemplates/${templateName}`;

        return this.http.get<InstanceTemplate>(url, { headers }).pipe(
          catchError(error => {
            console.error('Failed to load instance template:', error);
            return of(null);
          })
        );
      })
    );
  }

  createInstanceTemplate(template: Partial<InstanceTemplate>): Observable<any> {
    // Mock response in demo mode
    if (this.authService.isDemoMode()) {
      console.log('Demo mode: Would create instance template:', template);
      return of({ status: 'success', message: 'Instance template created successfully (demo mode)' });
    }

    return this.projectService.currentProject$.pipe(
      switchMap((project: Project | null) => {
        if (!project?.id) {
          throw new Error('No project selected');
        }

        const headers = this.getAuthHeaders();
        const url = `${this.baseUrl}/projects/${project.id}/global/instanceTemplates`;

        return this.http.post(url, template, { headers }).pipe(
          tap(() => {
            // Reload templates after creation
            this.loadTemplates().subscribe();
          }),
          catchError(error => {
            console.error('Failed to create instance template:', error);
            throw error;
          })
        );
      })
    );
  }

  deleteInstanceTemplate(templateName: string): Observable<any> {
    // Mock response in demo mode
    if (this.authService.isDemoMode()) {
      console.log('Demo mode: Would delete instance template:', templateName);
      // Remove from mock data
      this.mockTemplates = this.mockTemplates.filter(t => t.name !== templateName);
      this.templatesSubject.next(this.mockTemplates);
      return of({ status: 'success', message: 'Instance template deleted successfully (demo mode)' });
    }

    return this.projectService.currentProject$.pipe(
      switchMap((project: Project | null) => {
        if (!project?.id) {
          throw new Error('No project selected');
        }

        const headers = this.getAuthHeaders();
        const url = `${this.baseUrl}/projects/${project.id}/global/instanceTemplates/${templateName}`;

        return this.http.delete(url, { headers }).pipe(
          tap(() => {
            // Reload templates after deletion
            this.loadTemplates().subscribe();
          }),
          catchError(error => {
            console.error('Failed to delete instance template:', error);
            throw error;
          })
        );
      })
    );
  }

  getCurrentTemplates(): InstanceTemplate[] {
    return this.templatesSubject.value;
  }

  searchTemplates(query: string): InstanceTemplate[] {
    const templates = this.getCurrentTemplates();
    if (!query.trim()) {
      return templates;
    }

    const searchTerm = query.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.description?.toLowerCase().includes(searchTerm) ||
      template.properties.machineType.toLowerCase().includes(searchTerm)
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private logApiError(error: any): void {
    console.error('Instance Templates API Error:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error
    });
  }
} 