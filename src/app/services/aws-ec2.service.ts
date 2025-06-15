import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { AWSAuthService } from './aws-auth.service';
import { AuthService } from './auth.service';
import { AWSInstance } from '../interfaces/multi-cloud.interface';

// Declare AWS SDK for TypeScript
declare const AWS: any;

@Injectable({
  providedIn: 'root'
})
export class AWSEC2Service {
  private instancesSubject = new BehaviorSubject<AWSInstance[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public instances$ = this.instancesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private sdkLoadPromise: Promise<void> | null = null;

  constructor(private awsAuth: AWSAuthService, private authService: AuthService) {
    console.log('AWSEC2Service constructor called');
    // Initialize with empty instances
    this.instancesSubject.next([]);
  }

  private loadAWSSDK(): Promise<void> {
    // Return existing promise if already loading
    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    this.sdkLoadPromise = new Promise((resolve, reject) => {
      // Check if AWS SDK is already available
      if (typeof AWS !== 'undefined' && AWS.EC2) {
        console.log('✅ AWS SDK already loaded');
        resolve();
        return;
      }

      console.log('🔄 Loading AWS SDK...');
      const script = document.createElement('script');
      script.src = '/assets/js/aws-sdk-2.1.50.min.js'; // Use local file instead of CDN
      script.onload = () => {
        // Add a small delay to ensure the SDK is fully initialized
        setTimeout(() => {
          console.log('🔍 Checking AWS SDK availability...');
          console.log('AWS object:', typeof AWS);
          if (typeof AWS !== 'undefined') {
            console.log('AWS.EC2:', typeof AWS.EC2);
            console.log('AWS.config:', typeof AWS.config);
            console.log('Available AWS services:', Object.keys(AWS).filter(key => typeof AWS[key] === 'function').slice(0, 10));
          }
          
          if (typeof AWS !== 'undefined' && AWS.EC2) {
            console.log('✅ AWS SDK loaded successfully with EC2 support');
            resolve();
          } else {
            console.error('❌ AWS SDK loaded but AWS.EC2 not available');
            console.error('Available AWS object keys:', typeof AWS !== 'undefined' ? Object.keys(AWS).slice(0, 20) : 'AWS not defined');
            reject(new Error('AWS SDK loaded but AWS.EC2 not available'));
          }
        }, 100); // Small delay to ensure SDK is fully loaded
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load AWS SDK:', error);
        reject(new Error('Failed to load AWS SDK'));
      };
      document.head.appendChild(script);
    });

    return this.sdkLoadPromise;
  }

  async loadInstances(): Promise<AWSInstance[]> {
    console.log('🔄 AWSEC2Service.loadInstances() called');
    
    // First check if we're in demo mode - if so, always show demo data
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using mock AWS instances (web-server-aws, database-server-aws)');
      const mockInstances = this.getMockInstances();
      this.instancesSubject.next(mockInstances);
      this.loadingSubject.next(false);
      this.errorSubject.next(null);
      return mockInstances;
    }
    
    try {
      // Ensure AWS SDK is loaded
      await this.loadAWSSDK();
      console.log('✅ AWS SDK confirmed loaded');

      const credentials = this.awsAuth.getCredentials();
      if (!credentials) {
        const errorMessage = 'No AWS credentials configured. Please configure your AWS credentials first.';
        console.log('ℹ️ ' + errorMessage);
        this.errorSubject.next(errorMessage);
        this.instancesSubject.next([]);
        throw new Error(errorMessage);
      }

      console.log('🔑 AWS credentials found, attempting real API call...');
      console.log('⚠️  Note: Direct AWS API calls from browsers may be restricted due to CORS policies.');
      
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region
      });

      console.log('🔧 AWS config updated, creating EC2 client');
      
      // Verify AWS.EC2 is available before using it
      if (!AWS.EC2) {
        throw new Error('AWS.EC2 constructor not available');
      }

      const ec2 = new AWS.EC2();
      console.log('✅ EC2 client created, calling describeInstances');
      
      // Use callback-style API and promisify it manually
      const result: any = await new Promise((resolve, reject) => {
        ec2.describeInstances({}, (err: any, data: any) => {
          if (err) {
            console.error('❌ AWS API Error:', err);
            reject(err);
          } else {
            console.log('✅ AWS API Response received:', data);
            resolve(data);
          }
        });
      });

      console.log('✅ AWS API call successful, processing results');
      
      // Flatten instances from all reservations
      const instances: AWSInstance[] = result.Reservations.flatMap((reservation: any) => 
        reservation.Instances.map((instance: any) => ({
          InstanceId: instance.InstanceId,
          ImageId: instance.ImageId,
          State: instance.State,
          PrivateDnsName: instance.PrivateDnsName,
          PublicDnsName: instance.PublicDnsName,
          StateTransitionReason: instance.StateTransitionReason,
          InstanceType: instance.InstanceType,
          Placement: instance.Placement,
          Hypervisor: instance.Hypervisor,
          Architecture: instance.Architecture,
          RootDeviceType: instance.RootDeviceType,
          RootDeviceName: instance.RootDeviceName,
          BlockDeviceMappings: instance.BlockDeviceMappings,
          VirtualizationType: instance.VirtualizationType,
          Tags: instance.Tags,
          SecurityGroups: instance.SecurityGroups,
          SourceDestCheck: instance.SourceDestCheck,
          NetworkInterfaces: instance.NetworkInterfaces,
          EbsOptimized: instance.EbsOptimized,
          SriovNetSupport: instance.SriovNetSupport,
          EnaSupport: instance.EnaSupport,
          LaunchTime: instance.LaunchTime,
          PrivateIpAddress: instance.PrivateIpAddress,
          PublicIpAddress: instance.PublicIpAddress,
          SubnetId: instance.SubnetId,
          VpcId: instance.VpcId
        }))
      );
      
      console.log(`✅ Successfully processed ${instances.length} AWS instances`);
      this.instancesSubject.next(instances);
      this.loadingSubject.next(false);
      return instances;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load AWS instances';
      console.error('❌ Error loading AWS instances:', error);
      
      // If there's a CORS error or network issue, fall back to demo mode with explanation
      if (error.message?.includes('CORS') || error.name === 'NetworkError' || error.status === 0) {
        console.log('🔄 CORS/Network error detected - providing demo data with explanation');
        const demoInstances = this.getMockInstances();
        this.instancesSubject.next(demoInstances);
        this.loadingSubject.next(false);
        this.errorSubject.next('Demo mode: Real AWS API calls from browsers are restricted due to CORS policies. For production use, implement AWS API calls through your backend service.');
        return demoInstances;
      }
      
      this.errorSubject.next(errorMessage);
      this.loadingSubject.next(false);
      this.instancesSubject.next([]);
      throw error;
    }
  }

  async startInstance(instanceId: string): Promise<boolean> {
    try {
      await this.loadAWSSDK();
    } catch (error) {
      console.error('Failed to load AWS SDK for startInstance:', error);
      return false;
    }

    const credentials = this.awsAuth.getCredentials();
    if (!credentials) return false;

    try {
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region
      });

      const ec2 = new AWS.EC2();
      await new Promise((resolve, reject) => {
        ec2.startInstances({ InstanceIds: [instanceId] }, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      // Refresh instances after a short delay
      setTimeout(() => this.loadInstances(), 2000);
      return true;
    } catch (error) {
      console.error('Failed to start AWS instance:', error);
      return false;
    }
  }

  async stopInstance(instanceId: string): Promise<boolean> {
    try {
      await this.loadAWSSDK();
    } catch (error) {
      console.error('Failed to load AWS SDK for stopInstance:', error);
      return false;
    }

    const credentials = this.awsAuth.getCredentials();
    if (!credentials) return false;

    try {
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region
      });

      const ec2 = new AWS.EC2();
      await new Promise((resolve, reject) => {
        ec2.stopInstances({ InstanceIds: [instanceId] }, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      // Refresh instances after a short delay
      setTimeout(() => this.loadInstances(), 2000);
      return true;
    } catch (error) {
      console.error('Failed to stop AWS instance:', error);
      return false;
    }
  }

  async rebootInstance(instanceId: string): Promise<boolean> {
    try {
      await this.loadAWSSDK();
    } catch (error) {
      console.error('Failed to load AWS SDK for rebootInstance:', error);
      return false;
    }

    const credentials = this.awsAuth.getCredentials();
    if (!credentials) return false;

    try {
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region
      });

      const ec2 = new AWS.EC2();
      await new Promise((resolve, reject) => {
        ec2.rebootInstances({ InstanceIds: [instanceId] }, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      // Refresh instances after a short delay
      setTimeout(() => this.loadInstances(), 2000);
      return true;
    } catch (error) {
      console.error('Failed to reboot AWS instance:', error);
      return false;
    }
  }

  async terminateInstance(instanceId: string): Promise<boolean> {
    try {
      await this.loadAWSSDK();
    } catch (error) {
      console.error('Failed to load AWS SDK for terminateInstance:', error);
      return false;
    }

    const credentials = this.awsAuth.getCredentials();
    if (!credentials) return false;

    try {
      AWS.config.update({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        region: credentials.region
      });

      const ec2 = new AWS.EC2();
      await new Promise((resolve, reject) => {
        ec2.terminateInstances({ InstanceIds: [instanceId] }, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      // Refresh instances after a short delay
      setTimeout(() => this.loadInstances(), 2000);
      return true;
    } catch (error) {
      console.error('Failed to terminate AWS instance:', error);
      return false;
    }
  }

  getCurrentInstances(): AWSInstance[] {
    return this.instancesSubject.value;
  }

  private getMockInstances(): AWSInstance[] {
    return [
      {
        InstanceId: 'i-1234567890abcdef0',
        ImageId: 'ami-0abcdef1234567890',
        State: { Code: 16, Name: 'running' },
        PrivateDnsName: 'ip-172-31-32-10.ec2.internal',
        PublicDnsName: 'ec2-54-123-45-67.compute-1.amazonaws.com',
        StateTransitionReason: '',
        InstanceType: 't3.medium',
        Placement: { AvailabilityZone: 'us-east-1a', GroupName: '', Tenancy: 'default' },
        Hypervisor: 'xen',
        Architecture: 'x86_64',
        RootDeviceType: 'ebs',
        RootDeviceName: '/dev/sda1',
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/sda1',
            Ebs: {
              VolumeId: 'vol-1234567890abcdef0',
              Status: 'attached',
              AttachTime: '2024-01-15T10:30:00.000Z',
              DeleteOnTermination: true,
              VolumeSize: 20
            }
          }
        ],
        VirtualizationType: 'hvm',
        Tags: [
          { Key: 'Name', Value: 'web-server-aws' },
          { Key: 'Environment', Value: 'production' },
          { Key: 'Project', Value: 'demo' }
        ],
        SecurityGroups: [
          { GroupName: 'default', GroupId: 'sg-12345678' }
        ],
        SourceDestCheck: true,
        NetworkInterfaces: [],
        EbsOptimized: false,
        SriovNetSupport: 'simple',
        EnaSupport: true,
        LaunchTime: '2024-01-15T10:30:00.000Z',
        PrivateIpAddress: '172.31.32.10',
        PublicIpAddress: '54.123.45.67',
        SubnetId: 'subnet-12345678',
        VpcId: 'vpc-12345678'
      },
      {
        InstanceId: 'i-0987654321fedcba0',
        ImageId: 'ami-0fedcba0987654321',
        State: { Code: 80, Name: 'stopped' },
        PrivateDnsName: '',
        PublicDnsName: '',
        StateTransitionReason: 'User initiated (2024-01-16 14:20:00 GMT)',
        InstanceType: 't3.small',
        Placement: { AvailabilityZone: 'us-east-1b', GroupName: '', Tenancy: 'default' },
        Hypervisor: 'xen',
        Architecture: 'x86_64',
        RootDeviceType: 'ebs',
        RootDeviceName: '/dev/sda1',
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/sda1',
            Ebs: {
              VolumeId: 'vol-0987654321fedcba0',
              Status: 'attached',
              AttachTime: '2024-01-10T08:15:00.000Z',
              DeleteOnTermination: true,
              VolumeSize: 10
            }
          }
        ],
        VirtualizationType: 'hvm',
        Tags: [
          { Key: 'Name', Value: 'database-server-aws' },
          { Key: 'Environment', Value: 'development' },
          { Key: 'Project', Value: 'demo' }
        ],
        SecurityGroups: [
          { GroupName: 'database-sg', GroupId: 'sg-87654321' }
        ],
        SourceDestCheck: true,
        NetworkInterfaces: [],
        EbsOptimized: true,
        SriovNetSupport: 'simple',
        EnaSupport: true,
        LaunchTime: '2024-01-10T08:15:00.000Z',
        PrivateIpAddress: '172.31.45.20',
        PublicIpAddress: undefined,
        SubnetId: 'subnet-87654321',
        VpcId: 'vpc-87654321'
      }
    ];
  }
} 