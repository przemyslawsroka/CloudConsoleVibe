# Google Cloud Console Clone

This is a comprehensive clone of the Google Cloud Console built with Angular, focusing on VPC network management and cloud networking functionality.

## Features

### Core Infrastructure
- **Google OAuth 2.0 authentication** with real GCP integration
- **Project management** with automatic project selection
- **Dark mode support** with system preference detection and manual toggle
- **Modern Material Design UI** with responsive layouts
- **Real-time error handling** and loading states

### VPC & Network Management
- **VPC network listing and management**
- **Detailed VPC network view** with subnet visualization
- **IP addresses management**
  - List all IP addresses (static and ephemeral)
  - Filter by type (Internal/External, IPv4/IPv6)
  - Reserve external and internal static IP addresses
  - Release static IP addresses
  - View IP address usage and details

### Cloud Router Management
- **Cloud Router listing** with aggregated API calls across all regions
- **Real-time router data** from GCP Compute Engine API
- **Router creation wizard** with form validation and BGP configuration
- **Router details view** with tabbed interface showing:
  - Overview with network and regional information
  - BGP Sessions management
  - NAT Gateways integration
  - Advertised routes configuration
- **Optimized API performance** with single aggregated calls vs region fanout

### Load Balancing
- **Global and Regional Load Balancer management**
- **Load Balancer creation wizard** with step-by-step configuration:
  - Frontend configuration with SSL certificates
  - Backend services with health checks
  - URL maps and routing rules
  - Advanced features (CDN, Cloud Armor, IAP)
- **Load Balancer configuration page** with visual architecture diagrams
- **Real-time load balancer status** and monitoring integration

### Cloud NAT
- **Cloud NAT gateway management** with regional deployment
- **NAT creation wizard** with subnet and IP allocation options
- **NAT details view** with usage statistics and logging
- **Integration with Cloud Router** for advanced routing scenarios

### Cloud CDN
- **CDN cache management** with origin configuration
- **CDN policy configuration** with caching rules and TTL settings
- **Cache invalidation** and performance analytics
- **Integration with Load Balancers** for edge caching

### Routes & Routing
- **Custom route management** with next-hop configuration
- **Route creation wizard** with CIDR validation
- **Dynamic routing** with Cloud Router integration
- **Route prioritization** and tag-based routing

### Firewall Management (Enhanced)
- **Modern tabbed interface** separating Rules and Policies
- **Quick stats dashboard** showing firewall metrics
- **Real-time data** from GCP Compute Engine API
- **Enhanced firewall rules management:**
  - Create, edit, clone, and delete firewall rules via GCP API
  - Enable/disable rules with real-time updates
  - Bulk operations with selection
  - Advanced search and filtering
  - Visual status indicators and type badges
- **Firewall policies management:**
  - List and manage firewall policies via GCP API
  - View policy-rule relationships
  - Global and regional policy support
  - Association tracking
- **Improved UX over original GCP Console:**
  - Clear separation of concerns with tabbed interface
  - Improved visual hierarchy and organization
  - Step-by-step rule creation wizard
  - Responsive design for mobile devices
  - Intuitive action buttons and presets

### Network Observability & Analytics
- **Network topology visualization with traffic analysis**
  - **Interactive force-directed graph** showing VPC subnetworks
  - **Real-time traffic visualization** using GCP Monitoring API
  - **Traffic-based edge connections** from `vm_flow/egress_bytes_count` metrics
  - **Multiple visualization modes:**
    - Traffic connections only - Shows only subnetworks with actual traffic
    - Regional connections - Shows both traffic and regional connectivity
  - **Smart time range controls** (6h, 24h, 3d, 7d)
  - **Visual traffic indicators:**
    - Edge thickness scaled by traffic volume
    - Color-coded traffic levels (Green < Yellow < Orange < Red)
    - Directional arrows showing traffic flow
    - Traffic labels with data volume and protocols
  - **Subnetwork insights:**
    - Nodes colored by region
    - CIDR ranges and regional information
    - Click-to-focus navigation
  - **Traffic analysis panel** with top connections and protocol distribution

- **Flow Analyzer (VPC Flow Logs Analysis)**
  - **Real-time Log Analytics querying** using Google Cloud Logging API
  - **Advanced filtering interface** with Basic filters and SQL query modes
  - **Multiple metric types:**
    - Bytes sent - Traditional traffic volume analysis
    - Packets sent - Network packet analysis
    - Connections - Connection count tracking
    - **Latency (RTT)** - Round-trip time analysis with specialized visualization
  - **Interactive time-series charts** using Chart.js with:
    - Area charts for traffic metrics (bytes, packets, connections)
    - Line charts for latency analysis with min/max/avg visualization
    - Color-coded flow identification
    - Responsive design with time-based x-axis
  - **Comprehensive flow logs table** matching GCP console layout
  - **Smart SQL query generation** from basic filters
  - **Time range controls** with quick presets (1h, 6h, 1d)
  - **Real-time query execution** with performance metrics

### Security & Policy Management
- **Cloud Armor policies** with DDoS protection and WAF rules
- **TLS Inspection policies** for encrypted traffic analysis
- **Address Groups management** for centralized IP management
- **Connectivity Tests** for network troubleshooting

### DNS Management
- **Cloud DNS zone management** with record creation and modification
- **DNS policy configuration** with forwarding rules
- **Integration with private zones** and VPC resolution

### Network Solutions Integration
- **Packet Mirroring** for traffic analysis and security monitoring
- **Third-Party Provider Integration (TPPI)** for vendor appliances
- **Cloud Network Insights** for network optimization recommendations
- **Network Health Monitoring** with SLA tracking

## Real GCP API Integration

### Cloud Router Management
The Cloud Router service integrates with the official Google Cloud Compute Engine API:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Primary API Endpoints**:
  - `GET /compute/v1/projects/{project}/aggregated/routers` - List routers across all regions (optimized)
  - `GET /compute/v1/projects/{project}/regions/{region}/routers/{router}` - Get router details
  - `POST /compute/v1/projects/{project}/regions/{region}/routers` - Create new router
  - `DELETE /compute/v1/projects/{project}/regions/{region}/routers/{router}` - Delete router
  - `GET /compute/v1/projects/{project}/global/networks` - List VPC networks for router creation
  - `GET /compute/v1/projects/{project}/regions` - List available regions
- **Optimized Performance**: Uses single aggregated API call instead of region fanout
- **Error Handling**: Filters normal "no results" warnings from actual errors
- **BGP Configuration**: Supports ASN configuration, advertise modes, and route policies

### Load Balancer Management  
The Load Balancer service connects to multiple GCP APIs for comprehensive management:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Primary API Endpoints**:
  - `GET /compute/v1/projects/{project}/global/urlMaps` - List URL maps
  - `GET /compute/v1/projects/{project}/global/targetHttpProxies` - List HTTP proxies
  - `GET /compute/v1/projects/{project}/global/targetHttpsProxies` - List HTTPS proxies
  - `GET /compute/v1/projects/{project}/global/forwardingRules` - List global forwarding rules
  - `GET /compute/v1/projects/{project}/regions/{region}/forwardingRules` - List regional forwarding rules
  - `GET /compute/v1/projects/{project}/global/backendServices` - List backend services
  - `GET /compute/v1/projects/{project}/regions/{region}/backendServices` - List regional backend services
  - `POST /compute/v1/projects/{project}/global/urlMaps` - Create load balancer configuration
  - `GET /compute/v1/projects/{project}/global/sslCertificates` - List SSL certificates
  - `GET /compute/v1/projects/{project}/global/healthChecks` - List health checks
- **Advanced Features**: Cloud CDN integration, Cloud Armor policies, IAP configuration
- **Multi-regional Support**: Global and regional load balancer types

### Cloud NAT Management
The Cloud NAT service integrates with Compute Engine API for NAT gateway management:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service  
- **Primary API Endpoints**:
  - `GET /compute/v1/projects/{project}/regions/{region}/routers/{router}/getNatMappingInfo` - Get NAT mappings
  - `POST /compute/v1/projects/{project}/regions/{region}/routers/{router}` - Configure NAT on router
  - `GET /compute/v1/projects/{project}/regions/{region}/addresses` - List NAT IP addresses
  - `GET /compute/v1/projects/{project}/regions/{region}/subnetworks` - List subnets for NAT configuration
- **Integration**: Works with Cloud Router for advanced routing scenarios
- **Monitoring**: NAT usage statistics and connection tracking

### VPC Network Topology  
The enhanced topology view integrates with the **official Google Cloud Monitoring API** to visualize traffic flows:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Official API Implementation**: 
  - 📡 **Method**: `POST` request to official Google API
  - 🌐 **Endpoint**: `monitoring.googleapis.com/v3/projects/{project}/timeSeries:query`
  - 📋 **Query Language**: **PromQL** (Google's current recommendation)
  - 🔑 **Authentication**: OAuth 2.0 Bearer Token
  - 📚 **Documentation**: [Official API Reference](https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/query)
- **Traffic Metrics**: Uses `networking.googleapis.com/vm_flow/egress_bytes_count` with:
  - **PromQL Query**: `sum by (local_subnetwork, remote_subnetwork, local_network, remote_network, protocol) (rate(networking_googleapis_com:vm_flow_egress_bytes_count[1h]))`
  - **Aggregation**: Rate calculation over 1-hour windows
  - **Grouping**: By subnet, network, and protocol for comprehensive analysis
  - **Filtering**: Excludes external traffic and self-traffic
  - **Time Ranges**: Configurable from 6 hours to 7 days
- **Production Ready**: 
  - **Complete Implementation**: Ready for Google Cloud Platform deployment
  - **Error Handling**: Comprehensive debugging and fallback mechanisms
  - **CORS Awareness**: Clear guidance for browser vs. server deployment
- **Visual Processing**: 
  - Edge thickness proportional to traffic volume
  - Color coding by traffic levels (Green < Yellow < Orange < Red)
  - Protocol-based filtering and grouping
  - Network relationship mapping
  - **Enhanced Mock Data**: Realistic fallback when APIs are inaccessible from browser

### Flow Analyzer
The Flow Analyzer connects to real GCP Logging API for VPC Flow Logs analysis:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Primary API Endpoint**: 
  - `POST /logging/v2/projects/{project}/logs:query` - Query VPC Flow Logs
- **SQL Query Engine**: Generates optimized BigQuery SQL for different metric types:
  - **Bytes Analysis**: `SUM(CAST(jsonPayload.bytes_sent as INT64))`
  - **Packets Analysis**: `SUM(CAST(jsonPayload.packets as INT64))`
  - **Connections Analysis**: `COUNT(DISTINCT jsonPayload.connection_name)`
  - **Latency Analysis**: `AVG/MIN/MAX(CAST(jsonPayload.rtt_msec as FLOAT64))`
- **Flow Logs Schema**: Analyzes VPC Flow Logs with fields:
  - `jsonPayload.src_ip`, `jsonPayload.dest_ip`
  - `jsonPayload.src_vpc_project_id`, `jsonPayload.src_vpc_name`
  - `jsonPayload.protocol`, `jsonPayload.src_port`, `jsonPayload.dest_port`
  - `jsonPayload.bytes_sent`, `jsonPayload.packets`
  - `jsonPayload.rtt_msec` (for latency analysis)
  - `jsonPayload.reporter`, `jsonPayload.connection_name`

### Firewall Management
The firewall management feature now connects to real GCP Compute Engine APIs:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **API Endpoints**: 
  - `GET /compute/v1/projects/{project}/global/firewalls` - List firewall rules
  - `POST /compute/v1/projects/{project}/global/firewalls` - Create firewall rule
  - `DELETE /compute/v1/projects/{project}/global/firewalls/{rule}` - Delete firewall rule
  - `GET /compute/v1/projects/{project}/global/networkFirewallPolicies` - List global network policies
  - `GET /compute/v1/projects/{project}/regions/{region}/networkFirewallPolicies` - List regional policies
  - `GET /compute/v1/organizations/{org}/locations/global/firewallPolicies` - List hierarchical policies
  - `GET /cloudresourcemanager/v1/projects/{project}` - Get project organization info

### Cloud CDN Management
The Cloud CDN service integrates with Compute Engine API for content delivery:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Primary API Endpoints**:
  - `GET /compute/v1/projects/{project}/global/backendServices` - List CDN-enabled backends
  - `POST /compute/v1/projects/{project}/global/backendServices/{service}/invalidateCache` - Cache invalidation
  - `GET /compute/v1/projects/{project}/global/urlMaps` - List URL maps with CDN configuration
- **Cache Management**: Supports cache policies, TTL configuration, and origin settings

### DNS Management
The DNS service connects to Cloud DNS API for domain management:

- **Authentication**: Uses OAuth 2.0 tokens from the auth service
- **Primary API Endpoints**:
  - `GET /dns/v1/projects/{project}/managedZones` - List DNS zones
  - `GET /dns/v1/projects/{project}/managedZones/{zone}/rrsets` - List DNS records
  - `POST /dns/v1/projects/{project}/managedZones/{zone}/changes` - Create DNS changes
  - `GET /dns/v1/projects/{project}/policies` - List DNS policies

### Security & Policy APIs
Multiple security services integrate with various GCP APIs:

- **Cloud Armor**: 
  - `GET /compute/v1/projects/{project}/global/securityPolicies` - List security policies
  - `POST /compute/v1/projects/{project}/global/securityPolicies` - Create WAF rules
- **TLS Inspection**:
  - `GET /networksecurity/v1/projects/{project}/locations/{location}/tlsInspectionPolicies` - List TLS policies
- **Address Groups**:
  - `GET /networksecurity/v1/projects/{project}/locations/{location}/addressGroups` - List address groups
- **Connectivity Tests**:
  - `GET /networkmanagement/v1/projects/{project}/locations/global/connectivityTests` - List tests
  - `POST /networkmanagement/v1/projects/{project}/locations/global/connectivityTests` - Run connectivity test

### Firewall Policy Types
The application fetches multiple types of firewall policies:

1. **Network Firewall Policies (VPC-level)**
   - Global network firewall policies
   - Regional network firewall policies  
   - Applied at the VPC network level

2. **Hierarchical Firewall Policies (Organization-level)**
   - Organization-wide policies
   - Folder-level policies
   - Inherited by projects in the organization hierarchy

3. **Intelligent Fallback**
   - Gracefully handles missing or inaccessible policies
   - Provides informative messages when no policies are found
   - Explains the difference between firewall rules and policies

### Required Permissions
To use the application features, your GCP project and authenticated user need:

**Cloud Router Management:**
- `compute.routers.list` - List Cloud Routers across regions
- `compute.routers.get` - Get Cloud Router details  
- `compute.routers.create` - Create new Cloud Routers
- `compute.routers.delete` - Delete Cloud Routers
- `compute.networks.list` - List VPC networks for router creation
- `compute.regions.list` - List available regions

**Load Balancer Management:**
- `compute.urlMaps.list` - List URL maps and load balancer configurations
- `compute.targetHttpProxies.list` - List HTTP proxies
- `compute.targetHttpsProxies.list` - List HTTPS proxies  
- `compute.forwardingRules.list` - List forwarding rules
- `compute.backendServices.list` - List backend services
- `compute.urlMaps.create` - Create load balancer configurations
- `compute.sslCertificates.list` - List SSL certificates
- `compute.healthChecks.list` - List health checks

**Cloud NAT Management:**
- `compute.routers.get` - Get NAT configuration from routers
- `compute.routers.update` - Configure NAT on routers
- `compute.addresses.list` - List NAT IP addresses
- `compute.subnetworks.list` - List subnets for NAT configuration

**VPC Network Topology:**
- `monitoring.timeSeries.list` - Query traffic metrics from Monitoring API  
- `monitoring.metricDescriptors.list` - List available metrics
- `compute.subnetworks.list` - List VPC subnetworks for visualization
- `compute.networks.list` - List VPC networks

**Flow Analyzer:**
- `logging.logs.list` - Query VPC Flow Logs
- `logging.entries.list` - Read log entries from Cloud Logging

**Firewall Management:**
- `compute.firewalls.list` - List firewall rules
- `compute.firewalls.create` - Create firewall rules
- `compute.firewalls.delete` - Delete firewall rules
- `compute.firewalls.update` - Update firewall rules
- `compute.networkFirewallPolicies.list` - List network firewall policies
- `orgpolicy.policies.list` - List organization firewall policies

**DNS Management:**
- `dns.managedZones.list` - List DNS zones
- `dns.resourceRecordSets.list` - List DNS records
- `dns.changes.create` - Create DNS changes
- `dns.policies.list` - List DNS policies

**Security & Policy Management:**
- `compute.securityPolicies.list` - List Cloud Armor policies
- `networksecurity.tlsInspectionPolicies.list` - List TLS inspection policies
- `networksecurity.addressGroups.list` - List address groups
- `networkmanagement.connectivitytests.list` - List connectivity tests
- `networkmanagement.connectivitytests.create` - Run connectivity tests

## Recent Enhancements

### Dark Mode Support
- **System preference detection** with automatic theme switching
- **Manual toggle** in the top navigation bar
- **Comprehensive theming** across all components and pages
- **CSS custom properties** for consistent color management
- **Angular Material integration** with proper dark theme overrides
- **Accessibility compliance** with proper contrast ratios

### Performance Optimizations
- **Aggregated API calls** for Cloud Router (single call vs. region fanout)
- **Intelligent error filtering** removing normal "no results" warnings
- **Optimized bundle sizes** with updated Angular build budgets
- **Lazy loading** for large feature modules
- **Caching strategies** for frequently accessed data

### User Experience Improvements
- **Tabbed interfaces** for complex configuration pages
- **Step-by-step wizards** for resource creation
- **Visual architecture diagrams** for load balancer configuration
- **Real-time status updates** with WebSocket-like polling
- **Responsive design** for mobile and tablet devices
- **Improved navigation** with breadcrumbs and consistent layouts

### Production Deployment
- **Google Cloud Run** deployment with Docker containerization
- **Automatic scaling** from 0 to 10 instances based on demand
- **Health checks** and monitoring integration
- **Environment-specific configuration** with production optimizations
- **CI/CD ready** with Cloud Build integration

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[📖 Documentation Index](docs/README.md)** - Complete documentation overview
- **[🚀 Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[🔒 Security Setup](docs/security/SECURITY_SETUP.md)** - API keys and security configuration
- **[🛠️ Implementation Guides](docs/implementation/)** - Feature implementation details
- **[🔌 API Reference](docs/api/API_REFERENCE.md)** - Complete API documentation
- **[📊 Monitoring Setup](docs/monitoring/MONITORING_SYSTEM_README.md)** - Observability configuration

## 🔧 Scripts

Utility and deployment scripts are organized in the [`scripts/`](scripts/) directory:

- **[📋 Scripts Overview](scripts/README.md)** - Complete scripts documentation
- **Deployment**: `deploy.sh`, `deploy-full-stack.sh`, `deploy-cloudbuild.sh`
- **Setup**: `setup-dev-environment.sh`, `setup-iam.sh`
- **Verification**: `verify-setup.sh`, `verify-production-deployment.sh`