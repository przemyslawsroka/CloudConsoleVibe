import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ComputeEngineService, VmInstance } from './compute-engine.service';
import { AWSEC2Service } from './aws-ec2.service';
import { AWSAuthService } from './aws-auth.service';
import { AWSInstance, MultiCloudVmInstance } from '../interfaces/multi-cloud.interface';

@Injectable({
  providedIn: 'root'
})
export class MultiCloudInstancesService {
  private instancesSubject = new BehaviorSubject<MultiCloudVmInstance[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public instances$ = this.instancesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private computeEngineService: ComputeEngineService,
    private awsEc2Service: AWSEC2Service,
    private awsAuthService: AWSAuthService
  ) {
    this.initializeService();
  }

  private initializeService() {
    // Combine instances from both providers
    combineLatest([
      this.computeEngineService.instances$,
      this.awsEc2Service.instances$
    ]).pipe(
      map(([gcpInstances, awsInstances]) => {
        console.log('🔄 Multi-cloud service - Raw instances received:');
        console.log('📊 GCP instances count:', gcpInstances.length);
        console.log('📊 GCP instances data:', gcpInstances.map(i => ({ id: i.id, name: i.name, status: i.status })));
        console.log('📊 AWS instances count:', awsInstances.length);
        console.log('📊 AWS instances data:', awsInstances.map(i => ({ id: i.InstanceId, name: i.Tags?.find(t => t.Key === 'Name')?.Value || i.InstanceId })));
        
        const unified: MultiCloudVmInstance[] = [];

        // Transform GCP instances with detailed logging
        if (gcpInstances && gcpInstances.length > 0) {
          console.log('🔄 Processing GCP instances...');
          gcpInstances.forEach((instance, index) => {
            console.log(`🔄 Processing GCP instance ${index + 1}/${gcpInstances.length}:`, instance.name);
            const transformed = this.transformGcpInstance(instance);
            unified.push(transformed);
          });
          console.log('✅ GCP transformation complete. Transformed instances:', unified.length);
        } else {
          console.log('ℹ️ No GCP instances to transform');
        }

        // Transform AWS instances
        try {
          awsInstances.forEach(instance => {
            unified.push(this.transformAwsInstance(instance));
          });
          console.log('✅ AWS transformation complete');
        } catch (error) {
          console.error('❌ Error transforming AWS instances:', error);
        }
        
        console.log('🎯 Multi-cloud service - Final unified instances:', unified);
        console.log('🎯 Unified instances summary:', unified.map(i => ({ 
          id: i.id, 
          name: i.name, 
          provider: i.provider, 
          status: i.status 
        })));
        return unified;
      })
    ).subscribe({
      next: (instances) => {
        console.log('📡 Publishing instances to subject:', instances.length);
        this.instancesSubject.next(instances);
        console.log('📡 Subject value after update:', this.instancesSubject.value.length);
      },
      error: (error) => {
        console.error('❌ Error in instances stream:', error);
        this.errorSubject.next(error.message);
      }
    });

    // Combine loading states
    combineLatest([
      this.computeEngineService.loading$,
      this.awsEc2Service.loading$
    ]).pipe(
      map(([gcpLoading, awsLoading]) => gcpLoading || awsLoading)
    ).subscribe(loading => this.loadingSubject.next(loading));
  }

  private transformGcpInstance(instance: VmInstance): MultiCloudVmInstance {
    try {
      console.log('🔍 Transforming GCP instance:', {
        id: instance.id,
        name: instance.name,
        zone: instance.zone,
        machineType: instance.machineType,
        status: instance.status,
        internalIp: instance.internalIp,
        externalIp: instance.externalIp,
        fullInstance: instance
      });
      
      const zoneName = this.computeEngineService.extractZoneName(instance.zone || '');
      const machineType = this.computeEngineService.extractMachineTypeName(instance.machineType || '');
      
      console.log('🔍 Extracted values:', { zoneName, machineType });
      
      const transformed: MultiCloudVmInstance = {
        id: instance.id || 'unknown',
        name: instance.name || 'Unnamed Instance',
        provider: 'gcp',
        region: zoneName,
        instanceType: machineType,
        status: this.mapGcpStatus(instance.status || 'UNKNOWN'),
        internalIp: instance.internalIp || '',
        externalIp: instance.externalIp || undefined,
        createdAt: instance.creationTimestamp || new Date().toISOString(),
        providerData: {
          gcp: instance
        },
        statusColor: this.computeEngineService.getStatusColor(instance.status || 'UNKNOWN'),
        displayRegion: zoneName,
        displayInstanceType: machineType
      };
      
      console.log('✅ Successfully transformed GCP instance:', transformed);
      return transformed;
    } catch (error) {
      console.error('❌ Error in transformGcpInstance:', error, instance);
      // Return a fallback instance
      const fallback = {
        id: instance.id || 'error-' + Math.random(),
        name: instance.name || 'Error Instance',
        provider: 'gcp',
        region: 'unknown',
        instanceType: 'unknown',
        status: 'stopped',
        internalIp: '',
        externalIp: undefined,
        createdAt: new Date().toISOString(),
        providerData: { gcp: instance },
        statusColor: '#ea4335',
        displayRegion: 'unknown',
        displayInstanceType: 'unknown'
      } as MultiCloudVmInstance;
      
      console.log('🔄 Using fallback instance:', fallback);
      return fallback;
    }
  }

  private transformAwsInstance(instance: AWSInstance): MultiCloudVmInstance {
    const name = this.getAwsInstanceName(instance);
    
    return {
      id: instance.InstanceId,
      name: name,
      provider: 'aws',
      region: instance.Placement.AvailabilityZone,
      instanceType: instance.InstanceType,
      status: this.mapAwsStatus(instance.State.Name),
      internalIp: instance.PrivateIpAddress || '',
      externalIp: instance.PublicIpAddress,
      createdAt: instance.LaunchTime,
      providerData: {
        aws: instance
      },
      statusColor: this.getAwsStatusColor(instance.State.Name),
      displayRegion: instance.Placement.AvailabilityZone,
      displayInstanceType: instance.InstanceType
    };
  }

  private getAwsInstanceName(instance: AWSInstance): string {
    // Look for Name tag
    const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
    return nameTag?.Value || instance.InstanceId;
  }

  private mapGcpStatus(status: string): 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated' {
    switch (status?.toUpperCase()) {
      case 'RUNNING': return 'running';
      case 'STOPPED': return 'stopped';
      case 'PROVISIONING':
      case 'STAGING': return 'pending';
      case 'STOPPING': return 'stopping';
      case 'TERMINATED': return 'terminated';
      case 'SUSPENDED': 
      case 'SUSPENDING': return 'stopped';
      default: 
        console.warn('Unknown GCP status:', status);
        return 'stopped';
    }
  }

  private mapAwsStatus(status: string): 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated' {
    switch (status.toLowerCase()) {
      case 'running': return 'running';
      case 'stopped': return 'stopped';
      case 'pending': return 'pending';
      case 'stopping': return 'stopping';
      case 'terminated': return 'terminated';
      default: return 'stopped';
    }
  }

  private getAwsStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'running': return '#34a853';
      case 'stopped': return '#ea4335';
      case 'pending': return '#fbbc04';
      case 'stopping': return '#ff9800';
      case 'terminated': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  }

  async loadAllInstances(): Promise<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      // Load GCP instances
      await this.computeEngineService.loadInstances().toPromise();
      
      // Load AWS instances if authenticated
      if (this.awsAuthService.isAuthenticated()) {
        await this.awsEc2Service.loadInstances();
      }
    } catch (error: any) {
      this.errorSubject.next(error.message || 'Failed to load instances');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // Instance action methods
  async startInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      const gcpInstance = instance.providerData.gcp;
      return this.computeEngineService.startInstance(gcpInstance.zone, gcpInstance.name).toPromise()
        .then(() => true)
        .catch(() => false);
    } else if (instance.provider === 'aws') {
      return this.awsEc2Service.startInstance(instance.id);
    }
    return false;
  }

  async stopInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      const gcpInstance = instance.providerData.gcp;
      return this.computeEngineService.stopInstance(gcpInstance.zone, gcpInstance.name).toPromise()
        .then(() => true)
        .catch(() => false);
    } else if (instance.provider === 'aws') {
      return this.awsEc2Service.stopInstance(instance.id);
    }
    return false;
  }

  async restartInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      const gcpInstance = instance.providerData.gcp;
      return this.computeEngineService.restartInstance(gcpInstance.zone, gcpInstance.name).toPromise()
        .then(() => true)
        .catch(() => false);
    } else if (instance.provider === 'aws') {
      return this.awsEc2Service.rebootInstance(instance.id);
    }
    return false;
  }

  async deleteInstance(instance: MultiCloudVmInstance): Promise<boolean> {
    if (instance.provider === 'gcp' && instance.providerData.gcp) {
      const gcpInstance = instance.providerData.gcp;
      return this.computeEngineService.deleteInstance(gcpInstance.zone, gcpInstance.name).toPromise()
        .then(() => true)
        .catch(() => false);
    } else if (instance.provider === 'aws') {
      return this.awsEc2Service.terminateInstance(instance.id);
    }
    return false;
  }

  getCurrentInstances(): MultiCloudVmInstance[] {
    return this.instancesSubject.value;
  }
} 