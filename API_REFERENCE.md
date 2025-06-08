# API Reference

This document provides a comprehensive reference for all Google Cloud APIs integrated in the Cloud Console Vibe application.

## Authentication

All API endpoints require OAuth 2.0 authentication with appropriate Google Cloud IAM permissions.

```typescript
// Authentication header format
Authorization: Bearer {access_token}
Content-Type: application/json
```

## Cloud Router API

### List Cloud Routers (Aggregated)
**Endpoint**: `GET /compute/v1/projects/{project}/aggregated/routers`
**Method**: Optimized aggregated call across all regions
**Response**: Returns routers from all regions in a single API call

```json
{
  "items": {
    "regions/us-central1": {
      "routers": [
        {
          "id": "string",
          "name": "string", 
          "network": "string",
          "region": "string",
          "bgp": {
            "asn": 64512,
            "keepaliveInterval": 20
          }
        }
      ]
    }
  }
}
```

### Get Router Details
**Endpoint**: `GET /compute/v1/projects/{project}/regions/{region}/routers/{router}`
**Description**: Get detailed information about a specific Cloud Router

### Create Cloud Router
**Endpoint**: `POST /compute/v1/projects/{project}/regions/{region}/routers`
**Request Body**:
```json
{
  "name": "string",
  "network": "string",
  "bgp": {
    "asn": 64512,
    "keepaliveInterval": 20,
    "advertiseMode": "DEFAULT"
  },
  "description": "string"
}
```

### Delete Cloud Router
**Endpoint**: `DELETE /compute/v1/projects/{project}/regions/{region}/routers/{router}`

## Load Balancer API

### List URL Maps
**Endpoint**: `GET /compute/v1/projects/{project}/global/urlMaps`
**Description**: List all URL maps (load balancer configurations)

### List Target Proxies
**Endpoint**: `GET /compute/v1/projects/{project}/global/targetHttpProxies`
**Endpoint**: `GET /compute/v1/projects/{project}/global/targetHttpsProxies`

### List Forwarding Rules
**Endpoint**: `GET /compute/v1/projects/{project}/global/forwardingRules`
**Endpoint**: `GET /compute/v1/projects/{project}/regions/{region}/forwardingRules`

### List Backend Services
**Endpoint**: `GET /compute/v1/projects/{project}/global/backendServices`
**Endpoint**: `GET /compute/v1/projects/{project}/regions/{region}/backendServices`

### Create Load Balancer
**Endpoint**: `POST /compute/v1/projects/{project}/global/urlMaps`
**Request Body**:
```json
{
  "name": "string",
  "defaultService": "string",
  "hostRules": [
    {
      "hosts": ["example.com"],
      "pathMatcher": "string"
    }
  ],
  "pathMatchers": [
    {
      "name": "string",
      "defaultService": "string",
      "pathRules": [
        {
          "paths": ["/api/*"],
          "service": "string"
        }
      ]
    }
  ]
}
```

## Cloud NAT API

### Get NAT Mappings
**Endpoint**: `GET /compute/v1/projects/{project}/regions/{region}/routers/{router}/getNatMappingInfo`

### Configure NAT on Router
**Endpoint**: `POST /compute/v1/projects/{project}/regions/{region}/routers/{router}`
**Request Body** (NAT configuration):
```json
{
  "nats": [
    {
      "name": "string",
      "natIpAllocateOption": "MANUAL_ONLY",
      "sourceSubnetworkIpRangesToNat": "ALL_SUBNETWORKS_ALL_IP_RANGES",
      "natIps": ["projects/{project}/regions/{region}/addresses/{address}"]
    }
  ]
}
```

## VPC Network Topology API

### Query Traffic Metrics
**Endpoint**: `POST monitoring.googleapis.com/v3/projects/{project}/timeSeries:query`
**Query Language**: PromQL
**Request Body**:
```json
{
  "query": "sum by (local_subnetwork, remote_subnetwork, protocol) (rate(networking_googleapis_com:vm_flow_egress_bytes_count[1h]))",
  "unitOverride": "By"
}
```

### List Subnetworks
**Endpoint**: `GET /compute/v1/projects/{project}/aggregated/subnetworks`

## Flow Analyzer API

### Query VPC Flow Logs
**Endpoint**: `POST /logging/v2/projects/{project}/logs:query`
**Request Body**:
```json
{
  "resourceNames": ["projects/{project}"],
  "filter": "resource.type=\"gce_subnetwork\" AND logName=\"projects/{project}/logs/compute.googleapis.com%2Fvpc_flows\"",
  "pageSize": 1000,
  "orderBy": "timestamp desc"
}
```

### SQL Query Examples
**Bytes Analysis**:
```sql
SELECT 
  jsonPayload.src_ip, 
  jsonPayload.dest_ip,
  SUM(CAST(jsonPayload.bytes_sent as INT64)) as total_bytes
FROM `{project}.{dataset}.vpc_flows`
WHERE timestamp >= @start_time AND timestamp <= @end_time
GROUP BY jsonPayload.src_ip, jsonPayload.dest_ip
ORDER BY total_bytes DESC
```

**Latency Analysis**:
```sql
SELECT
  jsonPayload.src_ip,
  jsonPayload.dest_ip, 
  AVG(CAST(jsonPayload.rtt_msec as FLOAT64)) as avg_latency,
  MIN(CAST(jsonPayload.rtt_msec as FLOAT64)) as min_latency,
  MAX(CAST(jsonPayload.rtt_msec as FLOAT64)) as max_latency
FROM `{project}.{dataset}.vpc_flows`
WHERE timestamp >= @start_time AND timestamp <= @end_time
  AND jsonPayload.rtt_msec IS NOT NULL
GROUP BY jsonPayload.src_ip, jsonPayload.dest_ip
```

## Firewall API

### List Firewall Rules
**Endpoint**: `GET /compute/v1/projects/{project}/global/firewalls`

### Create Firewall Rule
**Endpoint**: `POST /compute/v1/projects/{project}/global/firewalls`
**Request Body**:
```json
{
  "name": "string",
  "direction": "INGRESS",
  "priority": 1000,
  "sourceRanges": ["0.0.0.0/0"],
  "allowed": [
    {
      "IPProtocol": "tcp",
      "ports": ["80", "443"]
    }
  ],
  "targetTags": ["web-server"]
}
```

### List Network Firewall Policies
**Endpoint**: `GET /compute/v1/projects/{project}/global/networkFirewallPolicies`
**Endpoint**: `GET /compute/v1/projects/{project}/regions/{region}/networkFirewallPolicies`

### List Hierarchical Firewall Policies
**Endpoint**: `GET /compute/v1/organizations/{org}/locations/global/firewallPolicies`

## DNS API

### List DNS Zones
**Endpoint**: `GET /dns/v1/projects/{project}/managedZones`

### List DNS Records
**Endpoint**: `GET /dns/v1/projects/{project}/managedZones/{zone}/rrsets`

### Create DNS Change
**Endpoint**: `POST /dns/v1/projects/{project}/managedZones/{zone}/changes`
**Request Body**:
```json
{
  "additions": [
    {
      "name": "example.com.",
      "type": "A",
      "ttl": 300,
      "rrdatas": ["1.2.3.4"]
    }
  ]
}
```

## Security APIs

### Cloud Armor
**List Security Policies**: `GET /compute/v1/projects/{project}/global/securityPolicies`
**Create Security Policy**: `POST /compute/v1/projects/{project}/global/securityPolicies`

### TLS Inspection
**List TLS Policies**: `GET /networksecurity/v1/projects/{project}/locations/{location}/tlsInspectionPolicies`

### Address Groups
**List Address Groups**: `GET /networksecurity/v1/projects/{project}/locations/{location}/addressGroups`

### Connectivity Tests
**List Tests**: `GET /networkmanagement/v1/projects/{project}/locations/global/connectivityTests`
**Run Test**: `POST /networkmanagement/v1/projects/{project}/locations/global/connectivityTests`

## Error Handling

### Common Error Responses
```json
{
  "error": {
    "code": 403,
    "message": "Insufficient permissions",
    "status": "PERMISSION_DENIED"
  }
}
```

### Partial Success Handling
For aggregated APIs, the application filters normal "no results" warnings:
```typescript
// Filter out normal "no results" warnings
if (warning.message && !warning.message.includes('No results for the scope')) {
  console.warn(`Warning: ${warning.message}`);
}
```

## Rate Limits

- **Standard Compute API**: 2000 requests per 100 seconds per user
- **Monitoring API**: 1000 requests per 100 seconds per user  
- **Logging API**: 3000 requests per 100 seconds per user

## Best Practices

1. **Use Aggregated APIs** when available (e.g., Cloud Router aggregated list)
2. **Implement exponential backoff** for rate limit handling
3. **Cache responses** for frequently accessed static data
4. **Filter unnecessary warnings** to reduce noise
5. **Use appropriate page sizes** for large result sets
6. **Implement proper error boundaries** for graceful degradation 