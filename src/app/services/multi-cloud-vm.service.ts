import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ComputeEngineService, VmInstance } from './compute-engine.service';
import { AWSEC2Service } from './aws-ec2.service';
import { AWSAuthService } from './aws-auth.service';
import { AuthService } from './auth.service';
import { MultiCloudVmInstance, AWSInstance, CloudProvider } from '../interfaces/multi-cloud.interface';

@Injectable({
  providedIn: 'root'
})
export class MultiCloudVmService {
  private instancesSubject = new BehaviorSubject<MultiCloudVmInstance[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private providersSubject = new BehaviorSubject<CloudProvider[]>([
    { id: 'gcp', name: 'Google Cloud Platform', isAuthenticated: false },
    { id: 'aws', name: 'Amazon Web Services', isAuthenticated: false }
  ]);

  public instances$ = this.instancesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public providers$ = this.providersSubject.asObservable();

  constructor(
    private computeEngineService: ComputeEngineService,
    private awsEC2Service: AWSEC2Service,
    private awsAuth: AWSAuthService,
    private authService: AuthService
  ) {
    // Monitor authentication status for both providers
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.updateProviderAuth('gcp', isAuth);
    });

    this.awsAuth.credentials$.subscribe(credentials => {
      this.updateProviderAuth('aws', !!credentials);
    });
  }

  private updateProviderAuth(providerId: CloudProvider['id'], isAuthenticated: boolean) {
    const providers = this.providersSubject.value.map(p => 
      p.id === providerId ? { ...p, isAuthenticated } : p
    );
    this.providersSubject.next(providers);
  }

  loadAllInstances(): Observable<MultiCloudVmInstance[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const authenticatedProviders = this.getAuthenticatedProviders();
    
    if (authenticatedProviders.length === 0) {
      this.loadingSubject.next(false);
      this.errorSubject.next('No cloud providers authenticated');
      return of([]);
    }

    // Create observables for each authenticated provider
    const providerObservables = authenticatedProviders.map(provider => {
      switch (provider.id) {
        case 'gcp':
          return this.loadGCPInstances();
        case 'aws':
          return this.loadAWSInstances();
        default:
          return of([]);
      }
    });

    return forkJoin(providerObservables).pipe(
      map(results => {
        // Flatten and combine all instances
        const allInstances = results.flat();
        this.instancesSubject.next(allInstances);
        this.loadingSubject.next(false);
        return allInstances;
      }),
      catchError(error => {
        this.errorSubject.next(`Failed to load instances: ${error.message}`);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  private loadGCPInstances(): Observable<MultiCloudVmInstance[]> {
    return this.computeEngineService.loadInstances().pipe(
      map(gcpInstances => gcpInstances.map(instance => this.transformGCPInstance(instance))),
      catchError(error => {
        console.error('Failed to load GCP instances:', error);
        return of([]);
      })
    );
  }

  private loadAWSInstances(): Observable<MultiCloudVmInstance[]> {
    return new Observable(observer => {
      this.awsEC2Service.loadInstances()
        .then(awsInstances => {
          const transformed = awsInstances.map(instance => this.transformAWSInstance(instance));
          observer.next(transformed);
          observer.complete();
        })
        .catch(error => {
          console.error('Failed to load AWS instances:', error);
          observer.next([]);
          observer.complete();
        });
    });
  }

  private transformGCPInstance(gcpInstance: VmInstance): MultiCloudVmInstance {
    return {
      id: gcpInstance.id || 'unknown',
      name: gcpInstance.name,
      provider: 'gcp',
      region: this.extractZoneName(gcpInstance.zone),
      instanceType: this.extractMachineTypeName(gcpInstance.machineType),
      status: this.normalizeGCPStatus(gcpInstance.status),
      internalIp: gcpInstance.internalIp || '',
      externalIp: gcpInstance.externalIp || undefined,
      createdAt: gcpInstance.creationTimestamp || new Date().toISOString(),
      providerData: { gcp: gcpInstance },
      statusColor: this.getGCPStatusColor(gcpInstance.status),
      displayRegion: this.extractZoneName(gcpInstance.zone),
      displayInstanceType: this.extractMachineTypeName(gcpInstance.machineType)
    };
  }

  private transformAWSInstance(awsInstance: AWSInstance): MultiCloudVmInstance {
    return {
      id: awsInstance.InstanceId,
      name: this.getAWSInstanceName(awsInstance),
      provider: 'aws',
      region: awsInstance.Placement.AvailabilityZone,
      instanceType: awsInstance.InstanceType,
      status: this.normalizeAWSStatus(awsInstance.State.Name),
      internalIp: awsInstance.PrivateIpAddress || '',
      externalIp: awsInstance.PublicIpAddress,
      createdAt: awsInstance.LaunchTime,
      providerData: { aws: awsInstance },
      statusColor: this.getAWSStatusColor(awsInstance.State.Name),
      displayRegion: awsInstance.Placement.AvailabilityZone,
      displayInstanceType: awsInstance.InstanceType
    };
  }

  private getAWSInstanceName(instance: AWSInstance): string {
    const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
    return nameTag?.Value || instance.InstanceId;
  }

  private normalizeGCPStatus(gcpStatus: string): MultiCloudVmInstance['status'] {
    switch (gcpStatus) {
      case 'RUNNING': return 'running';
      case 'STOPPED': return 'stopped';
      case 'STOPPING': return 'stopping';
      case 'PROVISIONING':
      case 'STAGING': return 'pending';
      case 'TERMINATED': return 'terminated';
      default: return 'stopped';
    }
  }

  private normalizeAWSStatus(awsStatus: string): MultiCloudVmInstance['status'] {
    switch (awsStatus.toLowerCase()) {
      case 'running': return 'running';
      case 'stopped': return 'stopped';
      case 'stopping': return 'stopping';
      case 'pending': return 'pending';
      case 'terminated': return 'terminated';
      default: return 'stopped';
    }
  }

  // Instance control methods
  async startInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    switch (instance.provider) {
      case 'gcp':
        return this.startGCPInstance(instance);
      case 'aws':
        return this.startAWSInstance(instance);
      default:
        return false;
    }
  }

  async stopInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    switch (instance.provider) {
      case 'gcp':
        return this.stopGCPInstance(instance);
      case 'aws':
        return this.stopAWSInstance(instance);
      default:
        return false;
    }
  }

  async restartInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    switch (instance.provider) {
      case 'gcp':
        return this.restartGCPInstance(instance);
      case 'aws':
        return this.restartAWSInstance(instance);
      default:
        return false;
    }
  }

  async deleteInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    switch (instance.provider) {
      case 'gcp':
        return this.deleteGCPInstance(instance);
      case 'aws':
        return this.deleteAWSInstance(instance);
      default:
        return false;
    }
  }

  private async startGCPInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    try {
      const gcpInstance = instance.providerData.gcp!;
      await this.computeEngineService.startInstance(
        this.extractZoneName(gcpInstance.zone), 
        gcpInstance.name
      ).toPromise();
      return true;
    } catch (error) {
      console.error('Failed to start GCP instance:', error);
      return false;
    }
  }

  private async startAWSInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    return await this.awsEC2Service.startInstance(instance.id);
  }

  private async stopGCPInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    try {
      const gcpInstance = instance.providerData.gcp!;
      await this.computeEngineService.stopInstance(
        this.extractZoneName(gcpInstance.zone), 
        gcpInstance.name
      ).toPromise();
      return true;
    } catch (error) {
      console.error('Failed to stop GCP instance:', error);
      return false;
    }
  }

  private async stopAWSInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    return await this.awsEC2Service.stopInstance(instance.id);
  }

  private async restartGCPInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    try {
      const gcpInstance = instance.providerData.gcp!;
      await this.computeEngineService.restartInstance(
        this.extractZoneName(gcpInstance.zone), 
        gcpInstance.name
      ).toPromise();
      return true;
    } catch (error) {
      console.error('Failed to restart GCP instance:', error);
      return false;
    }
  }

  private async restartAWSInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    return await this.awsEC2Service.rebootInstance(instance.id);
  }

  private async deleteGCPInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    try {
      const gcpInstance = instance.providerData.gcp!;
      await this.computeEngineService.deleteInstance(
        this.extractZoneName(gcpInstance.zone), 
        gcpInstance.name
      ).toPromise();
      return true;
    } catch (error) {
      console.error('Failed to delete GCP instance:', error);
      return false;
    }
  }

  private async deleteAWSInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    return await this.awsEC2Service.terminateInstance(instance.id);
  }

  // Helper methods
  private extractZoneName(zone: string): string {
    return zone.split('/').pop() || zone;
  }

  private extractMachineTypeName(machineType: string): string {
    return machineType.split('/').pop() || machineType;
  }

  private getGCPStatusColor(status: string): string {
    switch (status) {
      case 'RUNNING': return '#34a853';
      case 'STOPPED': return '#ea4335';
      case 'STOPPING': return '#fbbc04';
      case 'PROVISIONING':
      case 'STAGING': return '#4285f4';
      default: return '#9aa0a6';
    }
  }

  private getAWSStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'running': return '#34a853';
      case 'stopped': return '#ea4335';
      case 'stopping': return '#fbbc04';
      case 'pending': return '#4285f4';
      default: return '#9aa0a6';
    }
  }

  getAuthenticatedProviders(): CloudProvider[] {
    return this.providersSubject.value.filter(p => p.isAuthenticated);
  }

  isProviderAuthenticated(providerId: CloudProvider['id']): boolean {
    return this.providersSubject.value.find(p => p.id === providerId)?.isAuthenticated || false;
  }

  getCurrentInstances(): MultiCloudVmInstance[] {
    return this.instancesSubject.value;
  }
} 