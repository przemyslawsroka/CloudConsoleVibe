export interface CloudProvider {
  id: 'gcp' | 'aws' | 'azure';
  name: string;
  isAuthenticated: boolean;
  regions?: string[];
}

export interface MultiCloudVmInstance {
  // Common fields across all providers
  id: string;
  name: string;
  provider: CloudProvider['id'];
  region: string; // AWS region or GCP zone
  instanceType: string; // AWS instance type or GCP machine type
  status: 'running' | 'stopped' | 'pending' | 'stopping' | 'terminated';
  internalIp: string;
  externalIp?: string;
  createdAt: string;
  
  // Provider-specific data
  providerData: {
    gcp?: any;
    aws?: AWSInstance;
  };
  
  // UI helpers
  statusColor: string;
  displayRegion: string;
  displayInstanceType: string;
}

export interface AWSInstance {
  InstanceId: string;
  ImageId: string;
  State: {
    Code: number;
    Name: string;
  };
  PrivateDnsName: string;
  PublicDnsName?: string;
  StateTransitionReason: string;
  InstanceType: string;
  Placement: {
    AvailabilityZone: string;
    GroupName: string;
    Tenancy: string;
  };
  Hypervisor: string;
  Architecture: string;
  RootDeviceType: string;
  RootDeviceName: string;
  BlockDeviceMappings: any[];
  VirtualizationType: string;
  Tags?: Array<{
    Key: string;
    Value: string;
  }>;
  SecurityGroups: Array<{
    GroupName: string;
    GroupId: string;
  }>;
  SourceDestCheck: boolean;
  NetworkInterfaces: any[];
  EbsOptimized: boolean;
  SriovNetSupport?: string;
  EnaSupport: boolean;
  LaunchTime: string;
  PrivateIpAddress: string;
  PublicIpAddress?: string;
  SubnetId: string;
  VpcId: string;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
} 