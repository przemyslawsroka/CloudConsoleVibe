import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';

interface DocumentationSection {
  id: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-documentation',
  template: `
    <div class="documentation-container" (scroll)="onScroll($event)">
      <div class="documentation-header">
        <div class="header-content">
          <button mat-icon-button (click)="goBack()" class="back-button" matTooltip="Back to Console">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-text">
            <h1>CloudConsoleVibe Documentation</h1>
            <p>Comprehensive guide for Google Cloud Platform networking management</p>
          </div>
        </div>
      </div>

      <nav class="doc-nav">
        <ul>
          <li *ngFor="let section of sections" [class.active]="activeSection === section.id">
            <a (click)="scrollToSection(section.id)">
              <mat-icon>{{ section.icon }}</mat-icon>
              {{ section.title }}
            </a>
          </li>
        </ul>
      </nav>

      <div class="doc-content">
        <section id="overview" class="doc-section">
          <h2>
            <mat-icon>info</mat-icon>
            Overview
          </h2>
          <div class="section-content">
            <p>
              CloudConsoleVibe is a <strong>demo application</strong> showcasing how to quickly build an equivalent of the real Google Cloud Console for networking management. 
              This application demonstrates modern web development practices using Angular and Material Design to create an intuitive interface for managing Google Cloud Platform networking resources.
            </p>
            
            <div class="modules-grid">
              <div class="module-card" *ngFor="let module of applicationModules">
                <mat-card>
                  <mat-card-header>
                    <mat-icon mat-card-avatar>{{ module.icon }}</mat-icon>
                    <mat-card-title>{{ module.title }}</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <p>{{ module.description }}</p>
                    <div class="module-features">
                      <mat-chip *ngFor="let feature of module.features">{{ feature }}</mat-chip>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>

            <div class="demo-notice">
              <mat-icon>info</mat-icon>
              <div>
                <h4>Demo Application Notice</h4>
                <p>This application is designed as a demonstration of rapid cloud console development. It showcases real Google Cloud API integration and modern UI/UX patterns that can be quickly implemented to create production-ready cloud management tools.</p>
              </div>
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
            <ol>
              <li><strong>Authentication:</strong> Sign in with your Google account that has access to Google Cloud Platform projects</li>
              <li><strong>Project Selection:</strong> Choose your GCP project from the dropdown in the top navigation</li>
              <li><strong>Navigation:</strong> Use the left sidebar to navigate between different modules</li>
              <li><strong>Documentation:</strong> Access comprehensive documentation via the top-right documentation button</li>
            </ol>

            <h3>Key Features</h3>
            <h4>VPC Management</h4>
            <ul>
              <li>View and manage Virtual Private Cloud networks</li>
              <li>Configure subnets and routing</li>
              <li>Monitor network topology with interactive visualizations</li>
              <li>Analyze traffic flows between subnets</li>
            </ul>

            <h4>Connectivity Testing</h4>
            <ul>
              <li>Create and run network connectivity tests</li>
              <li>Troubleshoot network connectivity issues</li>
              <li>View detailed test results and recommendations</li>
            </ul>

            <h4>Security Management</h4>
            <ul>
              <li>Manage firewall rules and policies</li>
              <li>Configure Cloud Armor security policies</li>
              <li>Monitor security events and alerts</li>
            </ul>

            <h4>Load Balancing</h4>
            <ul>
              <li>Set up and configure Google Cloud Load Balancers</li>
              <li>Monitor load balancer performance</li>
              <li>Manage backend services and health checks</li>
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
            <ul>
              <li><strong>Frontend Framework:</strong> Angular 15+ with TypeScript</li>
              <li><strong>UI Library:</strong> Angular Material Design</li>
              <li><strong>State Management:</strong> RxJS Observables and Angular Services</li>
              <li><strong>Authentication:</strong> Google OAuth 2.0</li>
              <li><strong>API Integration:</strong> Direct HTTP calls to Google Cloud APIs</li>
              <li><strong>Deployment:</strong> Google Cloud Run (containerized)</li>
            </ul>

            <h3>Application Structure</h3>
            <p>CloudConsoleVibe has evolved from a <strong>pure frontend architecture</strong> to a comprehensive <strong>full-stack architecture</strong> with monitoring capabilities. The application now includes both direct Google Cloud API integration and a backend monitoring system.</p>

            <div class="architecture-overview">
              <h4>Full-Stack Architecture Overview</h4>
              <div class="architecture-grid">
                <div class="arch-column">
                  <h5>Frontend Application</h5>
                  <ul>
                    <li>Angular 15+ with TypeScript</li>
                    <li>Material Design UI components</li>
                    <li>Direct Google Cloud API integration</li>
                    <li>Real-time monitoring dashboard</li>
                    <li>WebSocket communication</li>
                  </ul>
                </div>
                <div class="arch-column">
                  <h5>Backend API Server</h5>
                  <ul>
                    <li>Node.js/Express REST API</li>
                    <li>WebSocket server for real-time communication</li>
                    <li>SQLite database for metrics storage</li>
                    <li>Agent registration and management</li>
                    <li>Metrics aggregation and processing</li>
                  </ul>
                </div>
                <div class="arch-column">
                  <h5>Monitoring Agents</h5>
                  <ul>
                    <li>Go-based lightweight agents</li>
                    <li>Network metrics collection</li>
                    <li>Connectivity testing</li>
                    <li>Multi-platform deployment</li>
                    <li>Real-time data transmission</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="architecture-diagram">
              <div class="layer">
                <h4>Presentation Layer</h4>
                <p>Angular Components + Angular Material UI</p>
                <div class="layer-details">
                  <strong>Real Components:</strong>
                  <ul>
                    <li><code>VpcComponent</code> - VPC networks and topology visualization</li>
                    <li><code>ConnectivityComponent</code> - Network connectivity testing</li>
                    <li><code>SecurityComponent</code> - Firewall rules and security policies</li>
                    <li><code>LoadBalancingComponent</code> - Load balancer management</li>
                    <li><code>FlowAnalyzerComponent</code> - VPC Flow Logs analysis</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>Service Layer</h4>
                <p>Angular Services for Business Logic + State Management</p>
                <div class="layer-details">
                  <strong>Core Angular Services:</strong>
                  <ul>
                    <li><code>AuthService</code> - OAuth 2.0 authentication management</li>
                    <li><code>ProjectService</code> - GCP project selection and management</li>
                    <li><code>VpcService</code> - VPC networks and subnets data</li>
                    <li><code>ConnectivityService</code> - Network connectivity testing</li>
                    <li><code>SecurityService</code> - Firewall rules and policies</li>
                    <li><code>LoadBalancerService</code> - Load balancer configuration</li>
                    <li><code>MonitoringService</code> - Network monitoring and metrics</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>API Integration Layer</h4>
                <p>Direct HTTP Client Integration (No Backend Proxy)</p>
                <div class="layer-details">
                  <strong>Implementation Details:</strong>
                  <ul>
                    <li><strong>No Backend Server:</strong> Direct browser-to-GCP API communication</li>
                    <li><strong>Angular HttpClient:</strong> Used for all API requests</li>
                    <li><strong>CORS Handling:</strong> Relies on Google Cloud APIs CORS policies</li>
                    <li><strong>Authentication:</strong> OAuth 2.0 Bearer tokens in request headers</li>
                    <li><strong>Error Handling:</strong> Comprehensive error handling with fallback to mock data</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>Google Cloud Platform</h4>
                <p>Official Google Cloud REST APIs</p>
                <div class="layer-details">
                  <strong>API Endpoints:</strong> compute.googleapis.com, networkmanagement.googleapis.com, monitoring.googleapis.com, iam.googleapis.com, etc.
                </div>
              </div>
            </div>

            <h3>Data Flow</h3>
            <ol>
              <li><strong>User Authentication:</strong> OAuth 2.0 flow with Google</li>
              <li><strong>Project Selection:</strong> Fetch user's GCP projects via Cloud Resource Manager API</li>
              <li><strong>Component Initialization:</strong> Angular components request data via services</li>
              <li><strong>Service Layer:</strong> Angular services make HTTP requests to Google Cloud APIs</li>
              <li><strong>API Response:</strong> Process and cache API responses</li>
              <li><strong>UI Update:</strong> Update Angular components with received data</li>
            </ol>
          </div>
        </section>

        <section id="google-apis" class="doc-section">
          <h2>
            <mat-icon>api</mat-icon>
            Google Cloud APIs Integration
          </h2>
          <div class="section-content">
            <p>CloudConsoleVibe integrates with multiple Google Cloud APIs to provide comprehensive networking management capabilities. Each API is used for specific functionality within the application.</p>

            <div class="api-cards-full">
              <mat-card class="api-card-full" *ngFor="let api of googleApis">
                <mat-card-header>
                  <mat-icon mat-card-avatar [style.color]="api.color">{{ api.icon }}</mat-icon>
                  <mat-card-title>{{ api.name }}</mat-card-title>
                  <mat-card-subtitle>{{ api.baseUrl }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="api-content-grid">
                    <div class="api-description">
                      <p><strong>Purpose:</strong> {{ api.purpose }}</p>
                      <p><strong>Used For:</strong> {{ api.usedFor }}</p>
                      
                      <h4>Key Features in Application:</h4>
                      <ul>
                        <li *ngFor="let feature of api.features">{{ feature }}</li>
                      </ul>
                    </div>
                    
                    <div class="api-endpoints">
                      <h4>API Endpoints Used:</h4>
                      <div class="endpoints-list">
                        <div class="endpoint" *ngFor="let endpoint of api.endpoints">
                          <div class="endpoint-header">
                            <span class="http-method" [class]="endpoint.method.toLowerCase()">{{ endpoint.method }}</span>
                            <code class="endpoint-path">{{ endpoint.path }}</code>
                          </div>
                          <p class="endpoint-description">{{ endpoint.description }}</p>
                          <div class="endpoint-usage" *ngIf="endpoint.usage">
                            <strong>Usage in App:</strong> {{ endpoint.usage }}
                          </div>
                        </div>
                      </div>
                      
                      <div class="scopes-required" *ngIf="api.scopes">
                        <h4>OAuth Scopes Required:</h4>
                        <div class="scopes-list">
                          <mat-chip *ngFor="let scope of api.scopes">{{ scope }}</mat-chip>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </section>

        <section id="authentication" class="doc-section">
          <h2>
            <mat-icon>security</mat-icon>
            Authentication
          </h2>
          <div class="section-content">
            <div class="demo-notice">
              <mat-icon>info</mat-icon>
              <div>
                <h4>Development Mode Access</h4>
                <p>This application is currently running in <strong>development mode</strong> with OAuth consent screen restrictions. 
                To access the application with your Google account, please send your <strong>Gmail address</strong> to 
                <a href="mailto:przemeksroka&#64;google.com">przemeksroka&#64;google.com</a> to be added to the OAuth test users list.</p>
              </div>
            </div>

            <h3>OAuth 2.0 Flow</h3>
            <p>CloudConsoleVibe uses Google OAuth 2.0 for secure authentication and API access. The authentication process follows these steps:</p>
            <ol>
              <li><strong>User Login:</strong> User clicks "Sign in with Google" button</li>
              <li><strong>OAuth Redirect:</strong> Application redirects to Google OAuth 2.0 authorization server</li>
              <li><strong>User Consent:</strong> User grants permissions to access their Google Cloud resources</li>
              <li><strong>Authorization Code:</strong> Google returns authorization code to application</li>
              <li><strong>Token Exchange:</strong> Application exchanges code for access token and refresh token</li>
              <li><strong>API Access:</strong> Access token is used for all subsequent Google Cloud API requests</li>
            </ol>

            <h3>Required OAuth Scopes</h3>
            <p>The application requests the following OAuth scopes to access Google Cloud APIs:</p>
            <ul>
              <li><code>https://www.googleapis.com/auth/cloud-platform</code> - Full access to Google Cloud Platform resources</li>
              <li><code>https://www.googleapis.com/auth/compute</code> - Compute Engine API access</li>
              <li><code>https://www.googleapis.com/auth/monitoring</code> - Cloud Monitoring API access</li>
              <li><code>https://www.googleapis.com/auth/logging.read</code> - Cloud Logging API read access</li>
            </ul>

            <h3>Development Mode Restrictions</h3>
            <p>As referenced in the <a href="https://developers.google.com/workspace/guides/configure-oauth-consent" target="_blank">Google Workspace OAuth consent configuration guide</a>, 
            applications in development mode have specific limitations:</p>
            <ul>
              <li><strong>Test Users Only:</strong> Only users explicitly added to the OAuth test users list can access the application</li>
              <li><strong>Limited Access:</strong> Maximum of 100 test users during development phase</li>
              <li><strong>No Public Access:</strong> General public cannot use the application until it's published</li>
              <li><strong>Manual Approval:</strong> Each user must be manually added by the application administrator</li>
            </ul>

            <h3>Getting Access</h3>
            <p>To request access to this development application:</p>
            <ol>
              <li><strong>Contact Administrator:</strong> Send your Gmail address to <a href="mailto:przemeksroka&#64;google.com">przemeksroka&#64;google.com</a></li>
              <li><strong>Wait for Confirmation:</strong> You'll receive confirmation once added to the test users list</li>
              <li><strong>Sign In:</strong> Use the "Sign in with Google" button with your approved Gmail account</li>
              <li><strong>Grant Permissions:</strong> Accept the OAuth consent screen to access your Google Cloud resources</li>
            </ol>

            <h3>OAuth Configuration</h3>
            <p>To configure OAuth 2.0 for your deployment:</p>
            <ol>
              <li>Go to Google Cloud Console > APIs & Services > Credentials</li>
              <li>Create OAuth 2.0 Client ID for web application</li>
              <li>Add authorized JavaScript origins (e.g., https://your-domain.com)</li>
              <li>Add authorized redirect URIs (e.g., https://your-domain.com/auth/callback)</li>
              <li>Configure OAuth consent screen with appropriate scopes</li>
              <li>Update application configuration with client ID</li>
            </ol>
          </div>
        </section>

        <section id="deployment" class="doc-section">
          <h2>
            <mat-icon>cloud_upload</mat-icon>
            Deployment
          </h2>
          <div class="section-content">
            <h3>Deployment Architecture</h3>
            <p>CloudConsoleVibe is deployed as a full-stack application with both frontend and backend services on Google Cloud Run, providing scalable and cost-effective hosting for the complete monitoring solution.</p>

            <h3>Multi-Service Deployment</h3>
            <div class="deployment-services">
              <div class="service-card">
                <h4>Frontend Service</h4>
                <ul>
                  <li><strong>URL:</strong> cloudconsolevibe-frontend-931553324054.us-central1.run.app</li>
                  <li><strong>Technology:</strong> Angular + Nginx</li>
                  <li><strong>Purpose:</strong> User interface and Google Cloud API integration</li>
                  <li><strong>Configuration:</strong> 1GB memory, 1 CPU, standard timeout</li>
                </ul>
              </div>
              <div class="service-card">
                <h4>Backend Service</h4>
                <ul>
                  <li><strong>URL:</strong> cloudconsolevibe-backend-931553324054.us-central1.run.app</li>
                  <li><strong>Technology:</strong> Node.js/Express + SQLite</li>
                  <li><strong>Purpose:</strong> Monitoring API and WebSocket communication</li>
                  <li><strong>Configuration:</strong> 2GB memory, 2 CPU, 3600s timeout (WebSocket support)</li>
                </ul>
              </div>
            </div>

            <h3>Deployment Process</h3>
            <ol>
              <li><strong>Frontend Build:</strong> <code>ng build --configuration production</code> creates optimized Angular build</li>
              <li><strong>Backend Build:</strong> <code>npm install</code> and dependency setup for Node.js server</li>
              <li><strong>Containerization:</strong> Separate Docker containers for frontend (Nginx) and backend (Node.js)</li>
              <li><strong>Image Registry:</strong> Container images pushed to Google Container Registry</li>
              <li><strong>Cloud Run Deployment:</strong> Both services deployed to Google Cloud Run with different configurations</li>
              <li><strong>Service Communication:</strong> Frontend configured to communicate with backend via HTTPS and WSS</li>
            </ol>

            <h3>Infrastructure Components</h3>
            <ul>
              <li><strong>Google Cloud Run:</strong> Serverless container hosting for both frontend and backend</li>
              <li><strong>Google Container Registry:</strong> Container image storage and versioning</li>
              <li><strong>Nginx:</strong> Web server for serving Angular application</li>
              <li><strong>Node.js/Express:</strong> Backend API server with WebSocket support</li>
              <li><strong>SQLite:</strong> Embedded database for metrics and configuration storage</li>
              <li><strong>Cloud Build:</strong> CI/CD pipeline for automated multi-service deployments</li>
            </ul>

            <h3>Environment Configuration</h3>
            <p>Application configuration is managed through environment variables and runtime configuration:</p>
            <ul>
              <li><strong>OAuth Client ID:</strong> Configured via environment variables</li>
              <li><strong>API Endpoints:</strong> Uses official Google Cloud API endpoints</li>
              <li><strong>CORS Configuration:</strong> Relies on Google Cloud APIs' CORS policies</li>
            </ul>

            <h3>Required Google Cloud APIs</h3>
            <p>Enable the following APIs in your Google Cloud project:</p>
            <pre><code>gcloud services enable compute.googleapis.com
gcloud services enable networkmanagement.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable networksecurity.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com</code></pre>
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
              <li>Docker (for containerized deployment)</li>
            </ul>

            <h4>Local Development</h4>
            <ol>
              <li>Clone the repository: <code>git clone https://github.com/przemyslawsroka/CloudConsoleVibe.git</code></li>
              <li>Install dependencies: <code>npm install</code></li>
              <li>Configure OAuth client ID in environment files</li>
              <li>Start development server: <code>ng serve</code></li>
            </ol>

            <h3>IAM Permissions</h3>
            <p>Users need the following IAM roles or equivalent permissions:</p>
            <ul>
              <li><strong>Compute Network Viewer:</strong> View VPC networks and subnets</li>
              <li><strong>Compute Security Admin:</strong> Manage firewall rules and policies</li>
              <li><strong>Network Management Admin:</strong> Create and run connectivity tests</li>
              <li><strong>Load Balancer Admin:</strong> Configure load balancers and backend services</li>
              <li><strong>DNS Administrator:</strong> Manage DNS zones and records</li>
              <li><strong>Monitoring Viewer:</strong> View monitoring metrics and data</li>
              <li><strong>Logging Viewer:</strong> Read VPC Flow Logs and other logging data</li>
            </ul>

            <h3>OAuth 2.0 Configuration</h3>
            <p>Set up OAuth 2.0 credentials in Google Cloud Console:</p>
            <ol>
              <li>Navigate to APIs & Services > Credentials</li>
              <li>Create OAuth 2.0 Client ID for web application</li>
              <li>Configure authorized JavaScript origins and redirect URIs</li>
              <li>Set up OAuth consent screen with required scopes</li>
              <li>Download client configuration and update application</li>
            </ol>
          </div>
        </section>

        <section id="monitoring" class="doc-section">
          <h2>
            <mat-icon>monitoring</mat-icon>
            Monitoring System
          </h2>
          <div class="section-content">
            <p>CloudConsoleVibe includes a comprehensive monitoring system with real-time metrics collection, agent management, and dashboard visualization. The system consists of a backend API, WebSocket communication, and lightweight Go monitoring agents.</p>

            <div class="architecture-diagram">
              <h3>Monitoring Architecture</h3>
              <div class="layer">
                <h4>Frontend Dashboard</h4>
                <p>Angular monitoring module with real-time visualization</p>
                <div class="layer-details">
                  <strong>Components:</strong>
                  <ul>
                    <li><code>MetricsDashboardComponent</code> - Real-time charts and system overview</li>
                    <li><code>AgentListComponent</code> - Agent management and filtering</li>
                    <li><code>AgentDeployComponent</code> - Multi-platform deployment wizard</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>WebSocket Communication</h4>
                <p>Real-time bidirectional communication between frontend and backend</p>
                <div class="layer-details">
                  <strong>Features:</strong>
                  <ul>
                    <li>Live metric updates from agents</li>
                    <li>Agent connection/disconnection events</li>
                    <li>Alert notifications and system events</li>
                    <li>Configuration updates and commands</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>Backend API Server</h4>
                <p>Node.js/Express server with SQLite database</p>
                <div class="layer-details">
                  <strong>Responsibilities:</strong>
                  <ul>
                    <li>Agent registration and management</li>
                    <li>Metrics storage and aggregation</li>
                    <li>Alert rule processing</li>
                    <li>WebSocket connection management</li>
                    <li>API endpoints for CRUD operations</li>
                  </ul>
                </div>
              </div>
              
              <div class="layer">
                <h4>Monitoring Agents</h4>
                <p>Lightweight Go agents collecting network metrics</p>
                <div class="layer-details">
                  <strong>Agent Information:</strong>
                  <ul>
                    <li><strong>Language:</strong> {{ monitoringAgentInfo.language }}</li>
                    <li><strong>Version:</strong> {{ monitoringAgentInfo.version }}</li>
                    <li><strong>Description:</strong> {{ monitoringAgentInfo.description }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3>Agent Features</h3>
            <div class="feature-grid">
              <mat-card *ngFor="let feature of monitoringAgentInfo.features" class="feature-card">
                <mat-card-content>
                  <mat-icon>check_circle</mat-icon>
                  <p>{{ feature }}</p>
                </mat-card-content>
              </mat-card>
            </div>

            <h3>Collected Metrics</h3>
            <div class="metrics-grid">
              <div class="metric-category">
                <h4>Network Interface Metrics</h4>
                <ul>
                  <li *ngFor="let metric of monitoringAgentInfo.metrics.slice(0, 8)">
                    <code>{{ metric.split(':')[0] }}</code>: {{ metric.split(':')[1] }}
                  </li>
                </ul>
              </div>
              <div class="metric-category">
                <h4>Connectivity Metrics</h4>
                <ul>
                  <li *ngFor="let metric of monitoringAgentInfo.metrics.slice(8)">
                    <code>{{ metric.split(':')[0] }}</code>: {{ metric.split(':')[1] }}
                  </li>
                </ul>
              </div>
            </div>

            <h3>Deployment Options</h3>
            <div class="deployment-options">
              <mat-card *ngFor="let deployment of monitoringAgentInfo.deployment" class="deployment-card">
                <mat-card-content>
                  <h4>{{ deployment.split(':')[0] }}</h4>
                  <p>{{ deployment.split(':')[1] }}</p>
                </mat-card-content>
              </mat-card>
            </div>

            <h3>Getting Started with Monitoring</h3>
            <ol>
              <li><strong>Access Monitoring:</strong> Navigate to /monitoring in the application</li>
              <li><strong>Deploy Agents:</strong> Use the deployment wizard to install agents on your infrastructure</li>
              <li><strong>Configure Targets:</strong> Set up connectivity testing targets</li>
              <li><strong>Monitor Metrics:</strong> View real-time dashboards and set up alert rules</li>
            </ol>
          </div>
        </section>

        <section id="backend" class="doc-section">
          <h2>
            <mat-icon>api</mat-icon>
            Backend API
          </h2>
          <div class="section-content">
            <p>The CloudConsoleVibe backend provides API endpoints for monitoring agent management, metrics collection, and real-time communication via WebSockets.</p>

            <div class="api-cards-full">
              <mat-card class="api-card-full" *ngFor="let api of backendApis">
                <mat-card-header>
                  <mat-icon mat-card-avatar [style.color]="api.color">{{ api.icon }}</mat-icon>
                  <mat-card-title>{{ api.name }}</mat-card-title>
                  <mat-card-subtitle>{{ api.baseUrl }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="api-content-grid">
                    <div class="api-description">
                      <p><strong>Purpose:</strong> {{ api.purpose }}</p>
                      <p><strong>Used For:</strong> {{ api.usedFor }}</p>
                      
                      <h4>Key Features:</h4>
                      <ul>
                        <li *ngFor="let feature of api.features">{{ feature }}</li>
                      </ul>
                    </div>
                    
                    <div class="api-endpoints">
                      <h4>REST API Endpoints:</h4>
                      <div class="endpoints-list">
                        <div class="endpoint" *ngFor="let endpoint of api.endpoints">
                          <div class="endpoint-header">
                            <span class="http-method" [class]="endpoint.method.toLowerCase()">{{ endpoint.method }}</span>
                            <code class="endpoint-path">{{ endpoint.path }}</code>
                          </div>
                          <p class="endpoint-description">{{ endpoint.description }}</p>
                          <div class="endpoint-usage" *ngIf="endpoint.usage">
                            <strong>Usage:</strong> {{ endpoint.usage }}
                          </div>
                        </div>
                      </div>
                      
                      <h4>WebSocket Endpoints:</h4>
                      <div class="websocket-info" *ngFor="let ws of api.websockets">
                        <div class="websocket-header">
                          <span class="websocket-method">WS</span>
                          <code class="endpoint-path">{{ ws.path }}</code>
                        </div>
                        <p class="endpoint-description">{{ ws.description }}</p>
                        <div class="websocket-events">
                          <h5>Events:</h5>
                          <ul>
                            <li *ngFor="let event of ws.events">
                              <code>{{ event.split(':')[0] }}</code>: {{ event.split(':')[1] }}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>

            <h3>Database Schema</h3>
            <div class="database-schema">
              <h4>Tables</h4>
              <div class="table-info">
                <mat-card>
                  <mat-card-header>
                    <mat-card-title>agents</mat-card-title>
                    <mat-card-subtitle>Registered monitoring agents</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <ul>
                      <li><code>id</code> - Unique agent identifier</li>
                      <li><code>name</code> - Agent display name</li>
                      <li><code>hostname</code> - Agent hostname</li>
                      <li><code>ip_address</code> - Agent IP address</li>
                      <li><code>status</code> - Current status (online/offline)</li>
                      <li><code>last_seen</code> - Last activity timestamp</li>
                      <li><code>metadata</code> - Additional agent information</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card>
                  <mat-card-header>
                    <mat-card-title>metrics</mat-card-title>
                    <mat-card-subtitle>Individual metric records</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <ul>
                      <li><code>id</code> - Unique metric identifier</li>
                      <li><code>agent_id</code> - Associated agent ID</li>
                      <li><code>metric_name</code> - Metric name/type</li>
                      <li><code>value</code> - Metric value</li>
                      <li><code>timestamp</code> - Collection timestamp</li>
                      <li><code>labels</code> - Metric labels (JSON)</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card>
                  <mat-card-header>
                    <mat-card-title>metric_batches</mat-card-title>
                    <mat-card-subtitle>Batched metric submissions</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <ul>
                      <li><code>id</code> - Unique batch identifier</li>
                      <li><code>agent_id</code> - Source agent ID</li>
                      <li><code>batch_data</code> - Metrics batch (JSON)</li>
                      <li><code>timestamp</code> - Batch submission time</li>
                    </ul>
                  </mat-card-content>
                </mat-card>

                <mat-card>
                  <mat-card-header>
                    <mat-card-title>alert_rules</mat-card-title>
                    <mat-card-subtitle>Configured alert conditions</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <ul>
                      <li><code>id</code> - Unique rule identifier</li>
                      <li><code>name</code> - Rule display name</li>
                      <li><code>condition</code> - Alert condition</li>
                      <li><code>threshold</code> - Alert threshold value</li>
                      <li><code>enabled</code> - Rule activation status</li>
                    </ul>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>

            <h3>Deployment Information</h3>
            <div class="deployment-info">
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Production Deployment</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <ul>
                    <li><strong>Platform:</strong> Google Cloud Run</li>
                    <li><strong>URL:</strong> https://cloudconsolevibe-backend-931553324054.us-central1.run.app</li>
                    <li><strong>Runtime:</strong> Node.js 18</li>
                    <li><strong>Database:</strong> SQLite (file-based)</li>
                    <li><strong>Memory:</strong> 2GB</li>
                    <li><strong>CPU:</strong> 2 vCPU</li>
                    <li><strong>Timeout:</strong> 3600s (WebSocket support)</li>
                    <li><strong>Concurrency:</strong> 1000 concurrent requests</li>
                  </ul>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .documentation-container {
      width: 100vw;
      max-width: none;
      margin: 0;
      padding: 0;
      background: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    
    .documentation-header {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }
    
    /* Ensure title is white in light mode */
    .documentation-header h1 {
      color: white !important;
    }
    
    .documentation-header p {
      color: rgba(255, 255, 255, 0.9) !important;
    }
    
    .header-content {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }
    
    .back-button {
      position: absolute;
      left: 0;
      color: white !important;
      background: rgba(255, 255, 255, 0.1);
      transition: background-color 0.3s ease;
    }
    
    .back-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Ensure back button is white in both themes */
    :host-context(.dark-theme) .back-button {
      color: white !important;
    }
    
    .back-button mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .header-text {
      text-align: center;
    }
    
    .documentation-header h1 {
      font-size: 3rem;
      margin: 0 0 16px 0;
      font-weight: 300;
    }
    
    .documentation-header p {
      font-size: 1.2rem;
      opacity: 0.9;
      margin: 0;
    }
    
    .doc-nav {
      background: var(--surface-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .doc-nav ul {
      display: flex;
      list-style: none;
      padding: 0;
      margin: 0;
      justify-content: center;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .doc-nav li {
      margin: 0;
    }
    
    .doc-nav a {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      text-decoration: none;
      color: var(--primary-color);
      transition: all 0.3s ease;
      cursor: pointer;
      white-space: nowrap;
    }
    
    .doc-nav a:hover {
      background: var(--hover-color);
      color: var(--primary-color);
    }
    
    .doc-nav li.active a {
      background: var(--primary-color);
      color: white;
    }
    
    .doc-nav mat-icon {
      margin-right: 8px;
      font-size: 20px;
    }
    
    .doc-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
    }
    
    .doc-section {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 40px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    
    .doc-section h2 {
      background: var(--hover-color);
      margin: 0;
      padding: 24px 32px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      font-size: 1.5rem;
      color: var(--primary-color);
    }
    
    .doc-section h2 mat-icon {
      margin-right: 12px;
      font-size: 28px;
    }
    
    .section-content {
      padding: 32px;
    }
    
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin: 32px 0;
    }
    
    .module-card mat-card {
      height: 100%;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background: var(--surface-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }
    
    .module-card mat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .module-features {
      margin-top: 16px;
    }
    
    .module-features mat-chip {
      margin: 4px;
      background: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
    }
    
    .demo-notice {
      background: rgba(76, 175, 80, 0.12);
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 20px;
      margin: 32px 0;
      display: flex;
      align-items: flex-start;
    }
    
    .demo-notice mat-icon {
      color: #4caf50;
      margin-right: 12px;
      margin-top: 2px;
    }
    
    .demo-notice h4 {
      margin: 0 0 8px 0;
      color: #2e7d32;
    }
    
    .demo-notice p {
      margin: 0;
      color: #2e7d32;
    }
    
    .architecture-diagram {
      margin: 32px 0;
    }

    .architecture-overview {
      background: var(--hover-color);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }

    .architecture-overview h4 {
      margin: 0 0 20px 0;
      color: var(--primary-color);
      text-align: center;
    }

    .architecture-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .arch-column {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
    }

    .arch-column h5 {
      margin: 0 0 12px 0;
      color: var(--primary-color);
      text-align: center;
      font-size: 1.1rem;
    }

    .arch-column ul {
      margin: 0;
      padding-left: 16px;
    }

    .arch-column li {
      margin: 6px 0;
      font-size: 0.9rem;
    }
    
    .layer {
      background: var(--hover-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      margin: 16px 0;
      padding: 24px;
      position: relative;
    }
    
    .layer:not(:last-child)::after {
      content: '↓';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-color);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
    }
    
    .layer h4 {
      color: var(--primary-color);
      margin: 0 0 8px 0;
      font-size: 1.2rem;
    }
    
    .layer > p {
      margin: 0 0 16px 0;
      color: var(--text-secondary-color);
      font-style: italic;
    }
    
    .layer-details {
      background: var(--surface-color);
      padding: 16px;
      border-radius: 4px;
      border-left: 4px solid var(--primary-color);
    }
    
    .layer-details strong {
      color: var(--primary-color);
    }
    
    .layer-details ul {
      margin: 8px 0 0 0;
    }
    
    .layer-details code {
      background: var(--hover-color);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 0.9em;
      color: #d32f2f;
      border: 1px solid var(--border-color);
    }
    
    .api-cards-full {
      display: flex;
      flex-direction: column;
      gap: 32px;
      margin: 32px 0;
    }
    
    .api-card-full {
      width: 100%;
      background: var(--surface-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }
    
    .api-content-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 32px;
      margin-top: 16px;
    }
    
    .api-description h4,
    .api-endpoints h4 {
      color: var(--primary-color);
      margin: 16px 0 12px 0;
    }
    
    .endpoints-list {
      margin: 16px 0;
    }
    
    .endpoint {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
      margin: 12px 0;
    }
    
    .endpoint-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .http-method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-right: 12px;
      min-width: 50px;
      text-align: center;
    }
    
    .http-method.get { background: #4caf50; color: white; }
    .http-method.post { background: #2196f3; color: white; }
    .http-method.put { background: #ff9800; color: white; }
    .http-method.delete { background: #f44336; color: white; }
    
    .endpoint-path {
      background: #263238;
      color: #4fc3f7;
      padding: 6px 12px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 0.9em;
      word-break: break-all;
      flex: 1;
    }
    
    .endpoint-description {
      margin: 8px 0;
      color: var(--text-secondary-color);
    }
    
    .endpoint-usage {
      background: rgba(66, 133, 244, 0.12);
      padding: 8px 12px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 0.9em;
      border: 1px solid var(--border-color);
    }
    
    .scopes-required {
      margin-top: 24px;
    }
    
    .scopes-list {
      margin: 12px 0;
    }
    
    .scopes-list mat-chip {
      margin: 4px;
      background: rgba(255, 152, 0, 0.12);
      color: #e65100;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 12px;
      border: 1px solid var(--border-color);
    }
    
    pre {
      background: #263238;
      color: #4fc3f7;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    }
    
    code {
      background: var(--hover-color);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 0.9em;
      color: #d32f2f;
      border: 1px solid var(--border-color);
    }
    
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    a[href^="mailto:"] {
      background: rgba(66, 133, 244, 0.12);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      border: 1px solid var(--border-color);
    }
    
    a[href^="mailto:"]:hover {
      background: var(--hover-color);
      text-decoration: none;
    }
    
    a[target="_blank"]::after {
      content: ' ↗';
      font-size: 0.8em;
      opacity: 0.7;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .documentation-header {
        background: linear-gradient(135deg, #1f1f1f 0%, #2c2c2c 100%);
      }
      
      .documentation-header h1 {
        color: #e8eaed !important;
      }
      
      .documentation-header p {
        color: rgba(232, 234, 237, 0.8) !important;
      }
      
      .back-button {
        background: rgba(232, 234, 237, 0.1) !important;
        color: #e8eaed !important;
      }
      
      .back-button:hover {
        background: rgba(232, 234, 237, 0.2) !important;
      }
      
      .doc-section {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .module-card mat-card:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .doc-nav {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .doc-nav a:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e8eaed;
      }
      
      .demo-notice {
        background: rgba(76, 175, 80, 0.2);
        border-color: #4caf50;
      }
      
      .demo-notice h4 {
        color: #81c784;
      }
      
      .demo-notice p {
        color: #a5d6a7;
      }
      
      pre {
        background: #1e1e1e;
        color: #f0f0f0;
      }
      
      code {
        background: var(--hover-color);
        color: #ff7043;
      }
    }

    /* Dark theme navigation active state - high specificity */
    :host-context(.dark-theme) .doc-nav li.active a {
      background: #4285f4 !important;
      color: #ffffff !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3) !important;
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-title {
        color: var(--text-color) !important;
      }

      .mat-mdc-card-subtitle {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-card-content {
        color: var(--text-color) !important;
      }

      .mat-mdc-chip {
        background-color: rgba(66, 133, 244, 0.12) !important;
        color: var(--primary-color) !important;
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-icon-button {
        color: inherit !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-card {
      background-color: var(--surface-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    ::ng-deep .mat-mdc-card-title {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-card-subtitle {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-card-content {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-chip {
      background-color: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
    }
    
    @media (max-width: 768px) {
      .doc-nav ul {
        flex-direction: column;
      }
      
      .doc-nav a {
        justify-content: center;
        padding: 12px;
      }
      
      .doc-content {
        padding: 20px;
      }
      
      .api-content-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
      
      .documentation-header h1 {
        font-size: 2rem;
      }
      
      .back-button {
        position: relative;
        margin-bottom: 20px;
      }
      
      .header-content {
        flex-direction: column;
      }
    }

    /* New monitoring and backend specific styles */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .feature-card {
      border: 1px solid var(--border-color);
    }

    .feature-card mat-card-content {
      display: flex;
      align-items: center;
      padding: 16px !important;
    }

    .feature-card mat-icon {
      color: #4caf50;
      margin-right: 12px;
      font-size: 20px;
    }

    .feature-card p {
      margin: 0;
      font-size: 0.9rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin: 24px 0;
    }

    .metric-category {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
    }

    .metric-category h4 {
      margin: 0 0 16px 0;
      color: var(--primary-color);
    }

    .metric-category ul {
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .metric-category li {
      padding: 4px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .metric-category li:last-child {
      border-bottom: none;
    }

    .deployment-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .deployment-card {
      border: 1px solid var(--border-color);
    }

    .deployment-card h4 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
    }

    .deployment-card p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary-color);
    }

    .websocket-info {
      background: var(--hover-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }

    .websocket-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }

    .websocket-method {
      background: #673ab7;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      margin-right: 12px;
    }

    .websocket-events {
      margin-top: 12px;
    }

    .websocket-events h5 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
      font-size: 0.9rem;
    }

    .websocket-events ul {
      margin: 0;
      padding-left: 16px;
    }

    .websocket-events li {
      font-size: 0.9rem;
      margin: 4px 0;
    }

    .database-schema {
      margin: 24px 0;
    }

    .table-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 16px 0;
    }

    .table-info mat-card {
      border: 1px solid var(--border-color);
    }

    .table-info mat-card-title {
      font-family: 'Courier New', monospace;
      color: var(--primary-color) !important;
    }

    .table-info ul {
      margin: 0;
      padding-left: 0;
      list-style: none;
    }

    .table-info li {
      padding: 6px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .table-info li:last-child {
      border-bottom: none;
    }

    .deployment-info {
      margin: 24px 0;
    }

    .deployment-info mat-card {
      border: 1px solid var(--border-color);
    }

    .deployment-info ul {
      margin: 0;
      padding-left: 16px;
    }

    .deployment-info li {
      margin: 8px 0;
    }

    .deployment-services {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin: 24px 0;
    }

    .service-card {
      background: var(--hover-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
    }

    .service-card h4 {
      margin: 0 0 16px 0;
      color: var(--primary-color);
      text-align: center;
      font-size: 1.2rem;
    }

    .service-card ul {
      margin: 0;
      padding-left: 16px;
    }

    .service-card li {
      margin: 8px 0;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .feature-grid {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .deployment-options {
        grid-template-columns: 1fr;
      }

      .table-info {
        grid-template-columns: 1fr;
      }

      .architecture-grid {
        grid-template-columns: 1fr;
      }

      .deployment-services {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DocumentationComponent implements OnInit, OnDestroy {
  activeSection = 'overview';
  private fragmentSubscription: Subscription | undefined;
  
  sections = [
    { id: 'overview', title: 'Overview', icon: 'info' },
    { id: 'user-guide', title: 'User Guide', icon: 'person' },
    { id: 'architecture', title: 'Architecture', icon: 'architecture' },
    { id: 'monitoring', title: 'Monitoring System', icon: 'monitoring' },
    { id: 'backend', title: 'Backend API', icon: 'api' },
    { id: 'google-apis', title: 'Google Cloud APIs', icon: 'cloud' },
    { id: 'authentication', title: 'Authentication', icon: 'security' },
    { id: 'deployment', title: 'Deployment', icon: 'cloud_upload' },
    { id: 'configuration', title: 'Configuration', icon: 'settings' }
  ];

  applicationModules = [
    {
      title: 'VPC Management',
      icon: 'cloud',
      description: 'Manage Virtual Private Cloud networks, subnets, and routing with interactive topology visualization.',
      features: ['Network Topology', 'Traffic Analysis', 'Subnet Management', 'Route Configuration']
    },
    {
      title: 'Connectivity Testing',
      icon: 'network_check',
      description: 'Test and troubleshoot network connectivity between resources using Network Management API.',
      features: ['Connectivity Tests', 'Path Analysis', 'Reachability Testing', 'Network Diagnostics']
    },
    {
      title: 'Security Management',
      icon: 'security',
      description: 'Configure firewall rules, Cloud Armor policies, and network security settings.',
      features: ['Firewall Rules', 'Security Policies', 'Cloud Armor', 'Network Security']
    },
    {
      title: 'Load Balancing',
      icon: 'balance',
      description: 'Set up and manage Google Cloud Load Balancers with health checks and backend services.',
      features: ['Load Balancer Config', 'Health Checks', 'Backend Services', 'Traffic Distribution']
    },
    {
      title: 'Flow Analysis',
      icon: 'analytics',
      description: 'Analyze VPC Flow Logs for network traffic patterns, performance, and security insights.',
      features: ['Flow Logs Analysis', 'Traffic Metrics', 'Latency Analysis', 'Real-time Queries']
    },
    {
      title: 'Monitoring System',
      icon: 'monitoring',
      description: 'Real-time monitoring of network agents with metrics collection, alerting, and dashboard visualization.',
      features: ['Agent Management', 'Real-time Metrics', 'WebSocket Communication', 'Network Monitoring', 'Alert Rules', 'Dashboard Visualization']
    }
  ];

  googleApis = [
    {
      name: 'Network Management API',
      baseUrl: 'networkmanagement.googleapis.com',
      icon: 'network_check',
      color: '#1976d2',
      purpose: 'Connectivity testing and network reachability analysis',
      usedFor: 'Creating connectivity tests, analyzing network paths, VPC Flow Logs configuration',
      features: [
        'Create and manage connectivity tests between network endpoints',
        'Analyze network paths and trace packet flows',
        'Detect configuration issues and network bottlenecks',
        'Live data plane testing for real network validation',
        'VPC Flow Logs configuration and management'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/v1/projects/{project}/locations/global/connectivityTests',
          description: 'List all connectivity tests in the project',
          usage: 'Load existing connectivity tests in the Connectivity Testing module'
        },
        {
          method: 'POST',
          path: '/v1/projects/{project}/locations/global/connectivityTests',
          description: 'Create a new connectivity test',
          usage: 'Create connectivity tests from the UI wizard'
        },
        {
          method: 'POST',
          path: '/v1/projects/{project}/locations/global/connectivityTests/{testId}:rerun',
          description: 'Rerun an existing connectivity test',
          usage: 'Rerun tests to check current network state'
        },
        {
          method: 'DELETE',
          path: '/v1/projects/{project}/locations/global/connectivityTests/{testId}',
          description: 'Delete a connectivity test',
          usage: 'Clean up old or unnecessary connectivity tests'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    },
    {
      name: 'Compute Engine API',
      baseUrl: 'compute.googleapis.com',
      icon: 'computer',
      color: '#4285f4',
      purpose: 'Virtual machine and network resource management, including Cloud Armor security policies',
      usedFor: 'VPC networks, firewall rules, load balancers, IP addresses, Cloud Armor policies',
      features: [
        'VPC network and subnet management',
        'Firewall rules creation and management',
        'Load balancer configuration and monitoring',
        'IP address reservation and management',
        'Cloud Armor security policies (part of Compute Engine)',
        'Instance and network interface details'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/compute/v1/projects/{project}/global/networks',
          description: 'List VPC networks in the project',
          usage: 'Display VPC networks in topology view and network management'
        },
        {
          method: 'GET',
          path: '/compute/v1/projects/{project}/regions/{region}/subnetworks',
          description: 'List subnets in a specific region',
          usage: 'Show subnet details in topology visualization'
        },
        {
          method: 'GET',
          path: '/compute/v1/projects/{project}/global/firewalls',
          description: 'List firewall rules in the project',
          usage: 'Display and manage firewall rules in Security module'
        },
        {
          method: 'POST',
          path: '/compute/v1/projects/{project}/global/firewalls',
          description: 'Create a new firewall rule',
          usage: 'Create firewall rules through the security management interface'
        },
        {
          method: 'DELETE',
          path: '/compute/v1/projects/{project}/global/firewalls/{firewall}',
          description: 'Delete a firewall rule',
          usage: 'Remove firewall rules from the security interface'
        },
        {
          method: 'GET',
          path: '/compute/v1/projects/{project}/global/securityPolicies',
          description: 'List Cloud Armor security policies',
          usage: 'Display Cloud Armor policies in Security management module'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/compute']
    },
    {
      name: 'Identity and Access Management API',
      baseUrl: 'iam.googleapis.com',
      icon: 'account_circle',
      color: '#34a853',
      purpose: 'Authentication and authorization for Google Cloud resources',
      usedFor: 'OAuth 2.0 authentication, permission validation, access token management',
      features: [
        'OAuth 2.0 token validation and refresh',
        'Permission validation for API access',
        'Service account management',
        'Access token lifecycle management'
      ],
      endpoints: [
        {
          method: 'POST',
          path: '/oauth2/v2/tokeninfo',
          description: 'Validate OAuth 2.0 access tokens',
          usage: 'Verify user authentication tokens for API access'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    },
    {
      name: 'Cloud Resource Manager API',
      baseUrl: 'cloudresourcemanager.googleapis.com',
      icon: 'folder',
      color: '#fbbc04',
      purpose: 'Project and resource organization management',
      usedFor: 'Project listing, selection, and resource hierarchy management',
      features: [
        'List accessible projects for the authenticated user',
        'Project metadata and billing information',
        'Resource hierarchy management',
        'Organization policies and constraints'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/v1/projects',
          description: 'List all projects accessible to the user',
          usage: 'Populate project picker dropdown in the application header'
        },
        {
          method: 'GET',
          path: '/v1/projects/{projectId}',
          description: 'Get specific project details',
          usage: 'Fetch project information for selected project context'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    },
    {
      name: 'Cloud DNS API',
      baseUrl: 'dns.googleapis.com',
      icon: 'dns',
      color: '#9c27b0',
      purpose: 'DNS zone and record management for Google Cloud',
      usedFor: 'DNS zones, record sets, DNSSEC configuration, private DNS zones',
      features: [
        'DNS zone configuration and management',
        'Record set creation and modification',
        'DNSSEC support and validation',
        'Private DNS zones for VPC networks'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/dns/v1/projects/{project}/managedZones',
          description: 'List all managed DNS zones in the project',
          usage: 'Display DNS zones in network management interface'
        },
        {
          method: 'GET',
          path: '/dns/v1/projects/{project}/managedZones/{zone}/rrsets',
          description: 'List resource record sets in a DNS zone',
          usage: 'Show DNS records for zone management'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    },
    {
      name: 'Network Security API',
      baseUrl: 'networksecurity.googleapis.com',
      icon: 'security',
      color: '#f44336',
      purpose: 'Advanced network security features and policies',
      usedFor: 'TLS inspection policies, address groups, network security rule enforcement',
      features: [
        'TLS inspection policy management',
        'Address group configuration for firewall rules',
        'Network security rule enforcement',
        'Certificate management for TLS inspection'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/v1/projects/{project}/locations/global/tlsInspectionPolicies',
          description: 'List TLS inspection policies',
          usage: 'Display TLS inspection policies in security module'
        },
        {
          method: 'GET',
          path: '/v1/projects/{project}/locations/{location}/addressGroups',
          description: 'List address groups in a location',
          usage: 'Show address groups for firewall rule configuration'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    },
    {
      name: 'Cloud Logging API',
      baseUrl: 'logging.googleapis.com',
      icon: 'analytics',
      color: '#00bcd4',
      purpose: 'VPC Flow Logs analysis and network monitoring',
      usedFor: 'VPC Flow Logs querying, network traffic analysis, log-based metrics',
      features: [
        'VPC Flow Logs querying with advanced filters',
        'Network traffic analysis and visualization',
        'Log-based metrics for network monitoring',
        'Real-time log streaming and analysis'
      ],
      endpoints: [
        {
          method: 'POST',
          path: '/v2/entries:list',
          description: 'Query log entries with filters',
          usage: 'Fetch VPC Flow Logs for traffic analysis in Flow Analyzer'
        },
        {
          method: 'POST',
          path: '/v2/projects/{project}/logs:list',
          description: 'List available logs in the project',
          usage: 'Discover available VPC Flow Logs for analysis'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/logging.read']
    },
    {
      name: 'Cloud Monitoring API',
      baseUrl: 'monitoring.googleapis.com',
      icon: 'trending_up',
      color: '#ff9800',
      purpose: 'Network performance monitoring and metrics collection',
      usedFor: 'Network traffic metrics, performance monitoring, time series data analysis',
      features: [
        'Network performance metrics collection',
        'Custom dashboards and alerting',
        'Time series data analysis for traffic patterns',
        'PromQL queries for advanced metric analysis'
      ],
      endpoints: [
        {
          method: 'POST',
          path: '/v3/projects/{project}/timeSeries:query',
          description: 'Query time series data using PromQL',
          usage: 'Fetch network traffic metrics for topology visualization'
        },
        {
          method: 'GET',
          path: '/v3/projects/{project}/metricDescriptors',
          description: 'List available metric descriptors',
          usage: 'Discover available network metrics for monitoring'
        }
      ],
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/monitoring.read']
    }
  ];

  backendApis = [
    {
      name: 'CloudConsoleVibe Backend API',
      baseUrl: 'cloudconsolevibe-backend-931553324054.us-central1.run.app',
      icon: 'storage',
      color: '#4285f4',
      purpose: 'Backend API for monitoring agents, metrics collection, and real-time data processing',
      usedFor: 'Agent management, metrics collection, WebSocket communication, alert rules',
      features: [
        'Agent registration and management',
        'Real-time metrics collection and storage',
        'WebSocket communication for live updates',
        'Alert rules configuration and processing',
        'Metric batching and aggregation',
        'Authentication and authorization'
      ],
      endpoints: [
        {
          method: 'GET',
          path: '/api/health',
          description: 'Health check endpoint',
          usage: 'Verify backend service availability'
        },
        {
          method: 'GET',
          path: '/api/agents',
          description: 'List all registered monitoring agents',
          usage: 'Display agents in monitoring dashboard'
        },
        {
          method: 'POST',
          path: '/api/agents/register',
          description: 'Register a new monitoring agent',
          usage: 'Agent registration during deployment'
        },
        {
          method: 'GET',
          path: '/api/agents/:id/metrics',
          description: 'Get metrics for a specific agent',
          usage: 'Fetch agent metrics for dashboard visualization'
        },
        {
          method: 'POST',
          path: '/api/metrics/batch',
          description: 'Submit batch of metrics from agents',
          usage: 'Agent metric submission'
        },
        {
          method: 'GET',
          path: '/api/metrics/latest',
          description: 'Get latest metrics across all agents',
          usage: 'Real-time dashboard updates'
        },
        {
          method: 'GET',
          path: '/api/alert-rules',
          description: 'List all alert rules',
          usage: 'Display configured alert rules'
        },
        {
          method: 'POST',
          path: '/api/alert-rules',
          description: 'Create new alert rule',
          usage: 'Configure alerting conditions'
        },
        {
          method: 'GET',
          path: '/api/agent-configs/:id',
          description: 'Get configuration for specific agent',
          usage: 'Agent configuration management'
        }
      ],
      websockets: [
        {
          path: '/ws',
          description: 'WebSocket connection for real-time communication',
          events: [
            'agent_connected: New agent connection',
            'agent_disconnected: Agent disconnection',
            'metrics_update: Real-time metric updates',
            'alert_triggered: Alert notifications'
          ]
        }
      ]
    }
  ];

  monitoringAgentInfo = {
    name: 'CloudConsoleVibe Monitoring Agent',
    language: 'Go',
    version: '1.0.0',
    description: 'Lightweight monitoring agent for network metrics collection and connectivity testing',
    features: [
      'Network interface metrics collection (TX/RX bytes, packets, errors, drops)',
      'Connectivity testing with ping and traceroute',
      'WebSocket communication with backend',
      'Configurable collection intervals',
      'Command-line interface for management',
      'Cross-platform support (Linux, macOS, Windows)'
    ],
    metrics: [
      'network.tx_bytes: Transmitted bytes per interface',
      'network.rx_bytes: Received bytes per interface',
      'network.tx_packets: Transmitted packets per interface',
      'network.rx_packets: Received packets per interface',
      'network.tx_errors: Transmission errors per interface',
      'network.rx_errors: Reception errors per interface',
      'network.tx_drops: Transmission drops per interface',
      'network.rx_drops: Reception drops per interface',
      'connectivity.rtt_min: Minimum round-trip time',
      'connectivity.rtt_max: Maximum round-trip time',
      'connectivity.rtt_avg: Average round-trip time',
      'connectivity.packet_loss: Packet loss percentage',
      'connectivity.reachable: Target reachability status'
    ],
    deployment: [
      'Compute Engine: Direct installation on VM instances',
      'GKE: Kubernetes DaemonSet deployment',
      'Cloud Run Jobs: Scheduled monitoring tasks'
    ]
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit() {
    // Listen for URL fragment changes
    this.fragmentSubscription = this.activatedRoute.fragment.subscribe(fragment => {
      if (fragment) {
        this.activeSection = fragment;
        setTimeout(() => {
          this.scrollToElementById(fragment);
        }, 100);
      }
    });
  }

  ngOnDestroy() {
    if (this.fragmentSubscription) {
      this.fragmentSubscription.unsubscribe();
    }
  }

  scrollToSection(sectionId: string) {
    this.activeSection = sectionId;
    // Update URL with fragment
    this.location.go('/documentation#' + sectionId);
    this.scrollToElementById(sectionId);
  }

  private scrollToElementById(elementId: string) {
    const element = document.getElementById(elementId);
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
    
    if (this.activeSection !== currentSection) {
      this.activeSection = currentSection;
      // Update URL fragment without triggering navigation
      this.location.go('/documentation#' + currentSection);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
} 