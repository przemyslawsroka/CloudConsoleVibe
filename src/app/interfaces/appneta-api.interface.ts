// AppNeta API v3 Response Interfaces

export interface AppNetaMonitoringPolicy {
  id: string;
  name: string;
  enabled: boolean;
  type: 'Network' | 'Web' | 'Infrastructure';
  policyGroup: string;
  targets: string[];
  createdDate: Date;
  networkMonitoring: {
    enabled: boolean;
    frequency: number;
    targets: Array<{
      id: string;
      address: string;
      type: string;
    }>;
    protocols: {
      icmp: boolean;
      tcp: boolean;
      udp: boolean;
    };
    thresholds: {
      latency: number;
      packetLoss: number;
      jitter: number;
    };
  };
  browserMonitoring: {
    enabled: boolean;
    frequency: number;
    targets: Array<{
      id: string;
      url: string;
      name: string;
      steps: Array<{
        action: string;
        selector: string;
        value?: string;
      }>;
    }>;
    browserType: string;
    location: string;
    thresholds: {
      responseTime: number;
      availability: number;
      errorRate: number;
    };
  };
  httpMonitoring: {
    enabled: boolean;
    frequency: number;
    targets: Array<{
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    }>;
    thresholds: {
      responseTime: number;
      availability: number;
      statusCodes: number[];
    };
  };
  targetLocation: {
    id: number;
    formattedAddress: string;
    locality: string;
    adminAreaLevelOne: string;
    adminAreaLevelTwo: string;
    country: string;
    lat: number;
    lng: number;
    postalCode: string;
    streetNumber: string;
    route: string;
    countryShortName: string;
    region: string;
  };
  monitoringPointRules: Array<{
    id: string;
    name: string;
    criteria: {
      location?: string;
      type?: string;
      tags?: string[];
    };
    priority: number;
    enabled: boolean;
  }>;
  alertingRules: Array<{
    id: string;
    name: string;
    condition: string;
    threshold: number;
    duration: number;
    severity: 'Critical' | 'Warning' | 'Info';
    enabled: boolean;
    notifications: Array<{
      type: 'email' | 'webhook' | 'sms';
      target: string;
      enabled: boolean;
    }>;
  }>;
  schedules: Array<{
    id: string;
    name: string;
    timeZone: string;
    periods: Array<{
      start: string;
      end: string;
      days: string[];
    }>;
    enabled: boolean;
  }>;
  tags: Array<{
    category: string;
    value: string;
    resourceType: string;
    orgId: number;
  }>;
  metadata: {
    createdBy: string;
    lastModifiedBy: string;
    lastModifiedDate: Date;
    version: number;
  };
}

export interface AppNetaNetworkPath {
  sourceAppliance: string;
  target: string;
  orgId: number;
  id: number;
  applianceInterface: string;
  groupName: string;
  importance: number;
  alertProfileId: number;
  asymmetric: boolean;
  pathName: string;
  description: string;
  inboundName: string;
  outboundName: string;
  networkType: 'WAN' | 'LAN';
  disabled: boolean;
  reenableTime: number;
  qosName: string;
  tcpTracertTargetPort: number;
  udpTracertTargetPort: number;
  udpSourcePort: number;
  udpTargetPort: number;
  targetTypeName: string;
  contextType: 'VOICE_AND_DATA';
  targetLocation: {
    id: number;
    formattedAddress: string;
    locality: string;
    adminAreaLevelOne: string;
    adminAreaLevelTwo: string;
    country: string;
    lat: number;
    lng: number;
    postalCode: string;
    streetNumber: string;
    route: string;
    countryShortName: string;
    region: string;
  };
  ispName: string;
  timeRangeAlertProfilePairs: Array<{
    timeRangeId: number;
    alertProfileId: number;
  }>;
  connectionType: string;
  vpn: string;
  networkProtocol: 'AUTO';
  tags: Array<{
    category: string;
    value: string;
    resourceType: 'NETWORK_PATH';
    orgId: number;
  }>;
  monitoringPolicyId: number;
  monitoringPolicyGlobalId: number;
  monitoringPolicyName: string;
  monitoringPolicyGroupId: number;
  monitoringPolicyGroupGlobalId: number;
  monitoringPolicyGroupName: string;
}

export interface AppNetaApiResponse<T> {
  data?: T[];
  error?: string;
  message?: string;
}

// Mapping functions to convert AppNeta API responses to our internal interfaces
export function mapAppNetaPathToNetworkPath(apiPath: AppNetaNetworkPath): import('../services/appneta.service').NetworkPath {
  // Determine status based on disabled flag and other indicators
  let status: 'OK' | 'Failed' | 'Connectivity Loss' | 'Disabled' = 'OK';
  if (apiPath.disabled) {
    status = 'Disabled';
  } else if (apiPath.connectionType === 'Unknown' && apiPath.vpn === 'Unknown') {
    status = 'Connectivity Loss';
  }

  return {
    id: apiPath.id.toString(),
    name: apiPath.pathName,
    status: status,
    source: apiPath.sourceAppliance,
    destination: apiPath.target,
    monitoringPoint: apiPath.sourceAppliance,
    target: apiPath.target,
    lastUpdate: new Date(), // We'll need to get this from metrics API
    // These will need to come from separate metrics API calls
    latency: undefined,
    packetLoss: undefined,
    jitter: undefined
  };
}

export function mapAppNetaMonitoringPolicyToMonitoringPolicy(apiPolicy: AppNetaMonitoringPolicy): import('../services/appneta.service').MonitoringPolicy {
  return {
    id: apiPolicy.id,
    name: apiPolicy.name,
    type: apiPolicy.type,
    enabled: apiPolicy.enabled,
    targets: apiPolicy.targets,
    thresholds: {
      latency: apiPolicy.networkMonitoring?.thresholds?.latency,
      packetLoss: apiPolicy.networkMonitoring?.thresholds?.packetLoss,
      availability: apiPolicy.httpMonitoring?.thresholds?.availability || apiPolicy.browserMonitoring?.thresholds?.availability
    },
    alertingEnabled: apiPolicy.alertingRules?.some(rule => rule.enabled) || false,
    createdDate: apiPolicy.createdDate
  };
} 