import { Component } from '@angular/core';

interface DocumentationSection {
  id: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-documentation',
  template: `
    <div class="documentation-container">
      <div class="doc-header">
        <h1>
          <mat-icon>description</mat-icon>
          CloudConsoleVibe Documentation
        </h1>
        <p>Comprehensive guide for Google Cloud networking management</p>
      </div>

      <div class="doc-content">
        <div class="doc-nav">
          <mat-nav-list>
            <h3 matSubheader>Navigation</h3>
            <a mat-list-item 
               *ngFor="let section of sections" 
               (click)="scrollToSection(section.id)"
               [class.active]="activeSection === section.id">
              <mat-icon matListIcon>{{ section.icon }}</mat-icon>
              <span matLine>{{ section.title }}</span>
            </a>
          </mat-nav-list>
        </div>

        <div class="doc-main" #docMain (scroll)="onScroll($event)">
          <section id="overview" class="doc-section">
            <h2>
              <mat-icon>info</mat-icon>
              Overview
            </h2>
            <div class="section-content">
              <p>CloudConsoleVibe is a modern web application that provides an intuitive interface for managing Google Cloud Platform networking resources. Built with Angular and Material Design, it offers comprehensive tools for VPC management, connectivity testing, load balancing, and network security.</p>
              
              <div class="feature-grid">
                <mat-card class="feature-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar>cloud</mat-icon>
                    <mat-card-title>VPC Management</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    Manage Virtual Private Cloud networks, subnets, and routing
                  </mat-card-content>
                </mat-card>

                <mat-card class="feature-card">
                  <mat-icon mat-card-avatar>network_check</mat-icon>
                  <mat-card-title>Connectivity Testing</mat-card-title>
                  <mat-card-content>
                    Test and troubleshoot network connectivity between resources
                  </mat-card-content>
                </mat-card>

                <mat-card class="feature-card">
                  <mat-icon mat-card-avatar>security</mat-icon>
                  <mat-card-title>Security Management</mat-card-title>
                  <mat-card-content>
                    Configure firewall rules, Cloud Armor policies, and security settings
                  </mat-card-content>
                </mat-card>

                <mat-card class="feature-card">
                  <mat-icon mat-card-avatar>balance</mat-icon>
                  <mat-card-title>Load Balancing</mat-card-title>
                  <mat-card-content>
                    Set up and manage Google Cloud Load Balancers
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </section>

          <section id="user-guide" class="doc-section">
            <h2>
              <mat-icon>person</mat-icon>
              User Guide
            </h2>
            <div class="section-content">
              <h3>Getting Started</h3>
              <ol class="guide-steps">
                <li>
                  <strong>Authentication</strong>
                  <p>Click "Sign In" in the top-right corner to authenticate with Google Cloud. You'll need appropriate IAM permissions for the resources you want to manage.</p>
                </li>
                <li>
                  <strong>Project Selection</strong>
                  <p>After authentication, select your Google Cloud project using the project picker in the toolbar.</p>
                </li>
                <li>
                  <strong>Navigation</strong>
                  <p>Use the left sidebar to navigate between different networking services and features.</p>
                </li>
              </ol>

              <h3>Key Features</h3>
              
              <h4>VPC Networks</h4>
              <ul>
                <li>View all VPC networks in your project</li>
                <li>Examine network details, subnets, and firewall rules</li>
                <li>Monitor network topology and connections</li>
              </ul>

              <h4>Connectivity Tests</h4>
              <ul>
                <li>Create new connectivity tests between network endpoints</li>
                <li>View test results with detailed trace information</li>
                <li>Analyze packet flow and identify connectivity issues</li>
                <li>Support for various protocols (TCP, UDP, ICMP, ESP)</li>
              </ul>

              <h4>Load Balancing</h4>
              <ul>
                <li>Configure different types of load balancers</li>
                <li>Manage backend services and health checks</li>
                <li>Monitor load balancer performance</li>
              </ul>

              <h4>Security Management</h4>
              <ul>
                <li>Configure VPC firewall rules</li>
                <li>Manage Cloud Armor security policies</li>
                <li>Set up TLS inspection policies</li>
                <li>Create and manage address groups</li>
              </ul>
            </div>
          </section>

          <section id="architecture" class="doc-section">
            <h2>
              <mat-icon>architecture</mat-icon>
              Architecture
            </h2>
            <div class="section-content">
              <h3>Technology Stack</h3>
              <div class="tech-stack">
                <mat-chip-set>
                  <mat-chip>Angular 15+</mat-chip>
                  <mat-chip>TypeScript</mat-chip>
                  <mat-chip>Angular Material</mat-chip>
                  <mat-chip>RxJS</mat-chip>
                  <mat-chip>Google Cloud APIs</mat-chip>
                </mat-chip-set>
              </div>

              <h3>Application Structure</h3>
              <div class="architecture-diagram">
                <mat-card>
                  <mat-card-content>
                    <div class="layer">
                      <h4>Presentation Layer</h4>
                      <p>Angular Components + Material Design UI</p>
                    </div>
                    <div class="arrow">↓</div>
                    <div class="layer">
                      <h4>Service Layer</h4>
                      <p>Business Logic + State Management</p>
                    </div>
                    <div class="arrow">↓</div>
                    <div class="layer">
                      <h4>API Layer</h4>
                      <p>HTTP Client + Google Cloud API Integration</p>
                    </div>
                    <div class="arrow">↓</div>
                    <div class="layer">
                      <h4>Google Cloud Platform</h4>
                      <p>Compute, Networking, Security APIs</p>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <h3>Key Components</h3>
              <ul>
                <li><strong>AuthService:</strong> Handles Google OAuth 2.0 authentication</li>
                <li><strong>ProjectService:</strong> Manages project selection and context</li>
                <li><strong>VpcService:</strong> Interfaces with Compute Engine API for VPC resources</li>
                <li><strong>ConnectivityTestsService:</strong> Manages Network Management API interactions</li>
                <li><strong>LoadBalancingService:</strong> Handles Load Balancer configuration</li>
                <li><strong>FirewallService:</strong> Manages firewall rules and security policies</li>
              </ul>

              <h3>Data Flow</h3>
              <ol>
                <li>User authentication via Google OAuth 2.0</li>
                <li>Project selection and permission validation</li>
                <li>Component initialization and API calls</li>
                <li>Data transformation and state management</li>
                <li>UI rendering with Material Design components</li>
              </ol>
            </div>
          </section>

          <section id="google-apis" class="doc-section">
            <h2>
              <mat-icon>api</mat-icon>
              Google Cloud APIs
            </h2>
            <div class="section-content">
              <p>CloudConsoleVibe integrates with multiple Google Cloud APIs to provide comprehensive networking management capabilities.</p>

              <div class="api-cards">
                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">network_check</mat-icon>
                    <mat-card-title>Network Management API</mat-card-title>
                    <mat-card-subtitle>networkmanagement.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Connectivity testing and network reachability analysis</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>Create and manage connectivity tests</li>
                      <li>Analyze network paths and trace packets</li>
                      <li>Detect configuration issues</li>
                      <li>Live data plane testing</li>
                      <li>VPC Flow Logs configuration</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>GET /v1/projects/{{ '{project}' }}/locations/global/connectivityTests</code>
                      <code>GET /v1/projects/{{ '{project}' }}/locations/global/connectivityTests/{{ '{testId}' }}</code>
                      <code>POST /v1/projects/{{ '{project}' }}/locations/global/connectivityTests</code>
                      <code>DELETE /v1/projects/{{ '{project}' }}/locations/global/connectivityTests/{{ '{testId}' }}</code>
                      <code>POST /v1/projects/{{ '{project}' }}/locations/global/connectivityTests/{{ '{testId}' }}:rerun</code>
                      <code>GET /v1/projects/{{ '{project}' }}/locations/{{ '{location}' }}/vpcFlowLogsConfigs</code>
                      <code>POST /v1/projects/{{ '{project}' }}/locations/{{ '{location}' }}/vpcFlowLogsConfigs</code>
                      <code>DELETE /v1/{{ '{configName}' }}</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">computer</mat-icon>
                    <mat-card-title>Compute Engine API</mat-card-title>
                    <mat-card-subtitle>compute.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Virtual machine and network resource management, including Cloud Armor security policies</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>VPC network management</li>
                      <li>Subnet and route configuration</li>
                      <li>Firewall rule management</li>
                      <li>Instance and network interface details</li>
                      <li>Load balancer configuration</li>
                      <li>IP address reservation</li>
                      <li>Cloud Armor security policies</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/networks</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/subnetworks</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/routes</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/firewalls</code>
                      <code>POST /compute/v1/projects/{{ '{project}' }}/global/firewalls</code>
                      <code>DELETE /compute/v1/projects/{{ '{project}' }}/global/firewalls/{{ '{firewall}' }}</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/forwardingRules</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/forwardingRules</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/backendServices</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/backendServices</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/urlMaps</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/targetPools</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/addresses</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/addresses</code>
                      <code>POST /compute/v1/projects/{{ '{project}' }}/regions/{{ '{region}' }}/addresses</code>
                      <code>GET /compute/v1/projects/{{ '{project}' }}/global/securityPolicies</code>
                      <code>POST /compute/v1/projects/{{ '{project}' }}/global/securityPolicies</code>
                      <code>DELETE /compute/v1/projects/{{ '{project}' }}/global/securityPolicies/{{ '{policy}' }}</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                      <mat-chip>https://www.googleapis.com/auth/compute</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">account_circle</mat-icon>
                    <mat-card-title>Identity and Access Management API</mat-card-title>
                    <mat-card-subtitle>iam.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Authentication and authorization</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>OAuth 2.0 authentication</li>
                      <li>Permission validation</li>
                      <li>Service account management</li>
                      <li>Access token management</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>Used for OAuth 2.0 token validation and refresh</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">folder</mat-icon>
                    <mat-card-title>Cloud Resource Manager API</mat-card-title>
                    <mat-card-subtitle>cloudresourcemanager.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Project and resource organization</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>Project listing and selection</li>
                      <li>Resource hierarchy management</li>
                      <li>Project metadata and billing info</li>
                      <li>Organization policies</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>GET /v1/projects/{{ '{projectId}' }}</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">dns</mat-icon>
                    <mat-card-title>Cloud DNS API</mat-card-title>
                    <mat-card-subtitle>dns.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> DNS zone and record management</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>DNS zone configuration</li>
                      <li>Record set management</li>
                      <li>DNSSEC support</li>
                      <li>Private DNS zones</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>GET /dns/v1/projects/{{ '{project}' }}/managedZones</code>
                      <code>GET /dns/v1/projects/{{ '{project}' }}/managedZones/{{ '{zone}' }}</code>
                      <code>POST /dns/v1/projects/{{ '{project}' }}/managedZones</code>
                      <code>DELETE /dns/v1/projects/{{ '{project}' }}/managedZones/{{ '{zone}' }}</code>
                      <code>GET /dns/v1/projects/{{ '{project}' }}/managedZones/{{ '{zone}' }}/rrsets</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">security</mat-icon>
                    <mat-card-title>Network Security API</mat-card-title>
                    <mat-card-subtitle>networksecurity.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Advanced network security features</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>TLS inspection policy management</li>
                      <li>Address group configuration</li>
                      <li>Network security rule enforcement</li>
                      <li>Certificate management</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>GET /v1/projects/{{ '{project}' }}/locations/global/tlsInspectionPolicies</code>
                      <code>POST /v1/projects/{{ '{project}' }}/locations/global/tlsInspectionPolicies</code>
                      <code>DELETE /v1/projects/{{ '{project}' }}/locations/global/tlsInspectionPolicies/{{ '{policy}' }}</code>
                      <code>GET /v1/projects/{{ '{project}' }}/locations/{{ '{location}' }}/addressGroups</code>
                      <code>POST /v1/projects/{{ '{project}' }}/locations/{{ '{location}' }}/addressGroups</code>
                      <code>DELETE /v1/projects/{{ '{project}' }}/locations/{{ '{location}' }}/addressGroups/{{ '{group}' }}</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">analytics</mat-icon>
                    <mat-card-title>Cloud Logging API</mat-card-title>
                    <mat-card-subtitle>logging.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> VPC Flow Logs analysis and network monitoring</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>VPC Flow Logs querying</li>
                      <li>Network traffic analysis</li>
                      <li>Log-based metrics</li>
                      <li>Real-time log streaming</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>POST /v2/entries:list</code>
                      <code>POST /v2/projects/{{ '{project}' }}/logs:list</code>
                      <code>Log queries for VPC Flow Logs analysis</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                      <mat-chip>https://www.googleapis.com/auth/logging.read</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>

                <mat-card class="api-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar color="primary">trending_up</mat-icon>
                    <mat-card-title>Cloud Monitoring API</mat-card-title>
                    <mat-card-subtitle>monitoring.googleapis.com</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p><strong>Purpose:</strong> Network performance monitoring and metrics</p>
                    <p><strong>Key Features:</strong></p>
                    <ul>
                      <li>Network performance metrics</li>
                      <li>Custom dashboards</li>
                      <li>Alerting and notifications</li>
                      <li>Time series data analysis</li>
                    </ul>
                    <p><strong>Endpoints Used:</strong></p>
                    <div class="endpoint-list">
                      <code>POST /v3/projects/{{ '{project}' }}/timeSeries:query</code>
                      <code>GET /v3/projects/{{ '{project}' }}/metricDescriptors</code>
                      <code>GET /v3/projects/{{ '{project}' }}/timeSeries</code>
                    </div>
                    <p><strong>Scopes Required:</strong></p>
                    <mat-chip-set>
                      <mat-chip>https://www.googleapis.com/auth/cloud-platform</mat-chip>
                      <mat-chip>https://www.googleapis.com/auth/monitoring.read</mat-chip>
                    </mat-chip-set>
                  </mat-card-content>
                </mat-card>
              </div>

              <h3>API Usage Patterns</h3>
              <h4>Authentication Flow</h4>
              <pre><code>1. User initiates login
2. Redirect to Google OAuth 2.0 endpoint
3. User grants permissions
4. Receive authorization code
5. Exchange code for access token
6. Use token for API requests</code></pre>

              <h4>Error Handling</h4>
              <ul>
                <li><strong>401 Unauthorized:</strong> Token expired, trigger re-authentication</li>
                <li><strong>403 Forbidden:</strong> Insufficient permissions, show appropriate message</li>
                <li><strong>404 Not Found:</strong> Resource doesn't exist, handle gracefully</li>
                <li><strong>429 Rate Limited:</strong> Implement exponential backoff</li>
                <li><strong>500+ Server Error:</strong> Fallback to cached data or mock responses</li>
              </ul>

              <h4>Rate Limiting</h4>
              <p>The application implements the following strategies to handle API rate limits:</p>
              <ul>
                <li>Exponential backoff for retries</li>
                <li>Request queuing and batching</li>
                <li>Caching of frequently accessed data</li>
                <li>Graceful fallback to mock data when needed</li>
              </ul>
            </div>
          </section>

          <section id="configuration" class="doc-section">
            <h2>
              <mat-icon>settings</mat-icon>
              Configuration
            </h2>
            <div class="section-content">
              <h3>Environment Setup</h3>
              <h4>Prerequisites</h4>
              <ul>
                <li>Node.js 16+ and npm</li>
                <li>Angular CLI 15+</li>
                <li>Google Cloud Project with billing enabled</li>
                <li>Appropriate IAM permissions</li>
              </ul>

              <h4>Required APIs</h4>
              <p>Enable the following APIs in your Google Cloud project:</p>
              <pre><code>gcloud services enable compute.googleapis.com
gcloud services enable networkmanagement.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable dns.googleapis.com</code></pre>

              <h3>IAM Permissions</h3>
              <p>Users need the following IAM roles or equivalent permissions:</p>
              <ul>
                <li><strong>Compute Network Viewer:</strong> View VPC networks and subnets</li>
                <li><strong>Compute Security Admin:</strong> Manage firewall rules</li>
                <li><strong>Network Management Admin:</strong> Create and run connectivity tests</li>
                <li><strong>Load Balancer Admin:</strong> Configure load balancers</li>
                <li><strong>DNS Administrator:</strong> Manage DNS zones and records</li>
              </ul>

              <h3>OAuth Configuration</h3>
              <p>Configure OAuth 2.0 credentials in Google Cloud Console:</p>
              <ol>
                <li>Go to APIs & Services > Credentials</li>
                <li>Create OAuth 2.0 Client ID</li>
                <li>Add authorized origins and redirect URIs</li>
                <li>Configure consent screen</li>
              </ol>
            </div>
          </section>

          <section id="troubleshooting" class="doc-section">
            <h2>
              <mat-icon>build</mat-icon>
              Troubleshooting
            </h2>
            <div class="section-content">
              <h3>Common Issues</h3>
              
              <div class="troubleshoot-item">
                <h4>Authentication Issues</h4>
                <p><strong>Problem:</strong> Unable to sign in or authentication fails</p>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Check OAuth 2.0 configuration in Google Cloud Console</li>
                  <li>Verify authorized domains and redirect URIs</li>
                  <li>Clear browser cookies and cache</li>
                  <li>Ensure user has appropriate IAM permissions</li>
                </ul>
              </div>

              <div class="troubleshoot-item">
                <h4>API Permission Errors</h4>
                <p><strong>Problem:</strong> 403 Forbidden or insufficient permissions</p>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Verify required APIs are enabled</li>
                  <li>Check IAM roles and permissions</li>
                  <li>Ensure service account has correct scopes</li>
                  <li>Validate project billing is enabled</li>
                </ul>
              </div>

              <div class="troubleshoot-item">
                <h4>Connectivity Test Creation Fails</h4>
                <p><strong>Problem:</strong> 400 Bad Request when creating tests</p>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Verify source and destination endpoints exist</li>
                  <li>Check network connectivity between regions</li>
                  <li>Ensure Network Management API is enabled</li>
                  <li>Validate test parameters and protocols</li>
                </ul>
              </div>

              <h3>Debug Information</h3>
              <p>Enable browser developer tools to see detailed API requests and responses. The application logs important events to the console for debugging purposes.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .documentation-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0;
    }

    .doc-header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 40px 24px;
      text-align: center;
    }

    .doc-header h1 {
      margin: 0 0 16px 0;
      font-size: 32px;
      font-weight: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .doc-header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .doc-content {
      display: flex;
      min-height: calc(100vh - 200px);
    }

    .doc-nav {
      width: 280px;
      background: #f5f5f5;
      border-right: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
      height: fit-content;
    }

    .doc-nav mat-list-item {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .doc-nav mat-list-item:hover {
      background-color: #e3f2fd;
    }

    .doc-nav mat-list-item.active {
      background-color: #bbdefb;
      border-right: 3px solid #1976d2;
    }

    .doc-main {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      max-height: calc(100vh - 200px);
    }

    .doc-section {
      margin-bottom: 48px;
    }

    .doc-section h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #1976d2;
      font-size: 28px;
      font-weight: 400;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e0e0e0;
    }

    .doc-section h3 {
      color: #333;
      font-size: 20px;
      margin: 24px 0 16px 0;
    }

    .doc-section h4 {
      color: #555;
      font-size: 16px;
      margin: 16px 0 8px 0;
    }

    .section-content {
      line-height: 1.6;
      color: #424242;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .feature-card {
      height: 100%;
    }

    .guide-steps {
      counter-reset: step-counter;
    }

    .guide-steps li {
      counter-increment: step-counter;
      margin-bottom: 24px;
    }

    .guide-steps li::marker {
      content: counter(step-counter) ". ";
      font-weight: bold;
      color: #1976d2;
    }

    .tech-stack {
      margin: 16px 0;
    }

    .architecture-diagram {
      margin: 24px 0;
    }

    .layer {
      text-align: center;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 8px 0;
    }

    .layer h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .arrow {
      text-align: center;
      font-size: 24px;
      color: #666;
      margin: 8px 0;
    }

    .api-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin: 24px 0;
    }

    .api-card {
      height: 100%;
    }

    .api-card mat-chip-set {
      margin-top: 12px;
    }

    .troubleshoot-item {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid #ff9800;
    }

    .troubleshoot-item h4 {
      color: #ff9800;
      margin-top: 0;
    }

    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      border-left: 4px solid #1976d2;
      overflow-x: auto;
    }

    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }

    ul, ol {
      padding-left: 24px;
    }

    li {
      margin-bottom: 8px;
    }

    .endpoint-list {
      margin-top: 8px;
      margin-left: 24px;
    }
    
    .endpoint-list code {
      display: block;
      margin: 4px 0;
      padding: 6px 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 12px;
      border-left: 3px solid #1976d2;
    }
  `]
})
export class DocumentationComponent {
  activeSection = 'overview';
  
  sections: DocumentationSection[] = [
    { id: 'overview', title: 'Overview', icon: 'info' },
    { id: 'user-guide', title: 'User Guide', icon: 'person' },
    { id: 'architecture', title: 'Architecture', icon: 'architecture' },
    { id: 'google-apis', title: 'Google APIs', icon: 'api' },
    { id: 'configuration', title: 'Configuration', icon: 'settings' },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: 'build' }
  ];

  scrollToSection(sectionId: string) {
    this.activeSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onScroll(event: Event) {
    const scrollElement = event.target as HTMLElement;
    const sections = scrollElement.querySelectorAll('.doc-section');
    
    let currentSection = 'overview';
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100) {
        currentSection = section.id;
      }
    });
    
    this.activeSection = currentSection;
  }
} 