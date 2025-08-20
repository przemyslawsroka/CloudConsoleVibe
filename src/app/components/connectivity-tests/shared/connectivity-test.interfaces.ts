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
  sourceEndpointType: string;
  sourceCategory: string;
  sourceIp: string;
  sourceInstance: string;
  sourceDomain: string;
  sourceService: string;
  sourceCluster: string;
  sourceWorkload: string;
  sourceNetworkProject: string;
  sourceNetworkVpc: string;
  sourceNetworkSubnet: string;
  destinationNetworkProject: string;
  destinationNetworkVpc: string;
  destinationNetworkSubnet: string;
  sourceIpType: string;
  sourceConnectionType: string;
  sourceConnectionResource: string;
  sourceProject: string;
  sourceVpcNetwork: string;
  destinationEndpointType: string;
  destinationCategory: string;
  destinationIp: string;
  destinationInstance: string;
  destinationDomain: string;
  destinationService: string;
  destinationCluster: string;
  destinationWorkload: string;
  destinationPort: number;
}
