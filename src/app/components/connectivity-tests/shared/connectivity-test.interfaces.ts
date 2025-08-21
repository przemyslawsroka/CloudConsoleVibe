export interface ProjectOption {
  value: string;
  displayName: string;
}

export interface VpcNetworkOption {
  value: string;
  displayName: string;
}

export interface EndpointOption {
  value: string;
  label: string;
  isCategory?: boolean;
  children?: EndpointOption[];
  requiresDetails?: boolean;
  detailsType?: 'ip' | 'instance' | 'domain' | 'project' | 'cluster' | 'workload' | 'service' | 'custom';
}

export interface EndpointHierarchy {
  topLevel: EndpointOption[];
  categories: { [key: string]: EndpointOption[] };
}

export interface ConnectivityTestFormData {
  displayName: string;
  protocol: string;
  source: {
    endpointType: string;
    category: string;
    ip: string;
    instance: string;
    domain: string;
    service: string;
    cluster: string;
    workload: string;
    networkProject: string;
    networkVpc: string;
    networkSubnet: string;
    ipType: string;
    connectionType: string;
    connectionResource: string;
    project: string;
    vpcNetwork: string;
  };
  destination: {
    endpointType: string;
    category: string;
    ip: string;
    instance: string;
    domain: string;
    service: string;
    cluster: string;
    workload: string;
    networkProject: string;
    networkVpc: string;
    networkSubnet: string;
    port: number;
  };
}
