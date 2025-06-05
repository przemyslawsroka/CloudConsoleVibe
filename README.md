# Google Cloud Console Clone

This is a simplified clone of the Google Cloud Console built with Angular, focusing on VPC network management functionality.

## Features

- Google OAuth 2.0 authentication
- VPC network listing and management
- Detailed VPC network view
- IP addresses management
  - List all IP addresses (static and ephemeral)
  - Filter by type (Internal/External, IPv4/IPv6)
  - Reserve external and internal static IP addresses
  - Release static IP addresses
  - View IP address usage and details
- **Firewall Management (Real GCP API Integration)**
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
- Routes management
- Flow logs management
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
- Modern Material Design UI
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

## Real GCP API Integration

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

**VPC Network Topology:**
- `monitoring.timeSeries.list` - Query traffic metrics from Monitoring API  
- `monitoring.metricDescriptors.list` - List available metrics
- `compute.subnetworks.list` - List VPC subnetworks for visualization
- `compute.networks.list` - List VPC networks

**Flow Analyzer:**
- `logging.logs.list`