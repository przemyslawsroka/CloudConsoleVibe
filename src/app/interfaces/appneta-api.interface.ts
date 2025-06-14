// AppNeta API v3 Response Interfaces
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