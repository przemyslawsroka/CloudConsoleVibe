import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ConnectivityTestsService, ConnectivityTestRequest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';
import { ResourceLoaderService, ResourceOption, EndpointType } from '../../services/resource-loader.service';

interface ProjectOption {
  value: string;
  displayName: string;
}

interface VpcNetworkOption {
  value: string;
  displayName: string;
}

interface EndpointOption {
  value: string;
  label: string;
  isCategory?: boolean;
  children?: EndpointOption[];
  requiresDetails?: boolean;
  detailsType?: 'ip' | 'instance' | 'domain' | 'project' | 'cluster' | 'workload' | 'service' | 'custom';
}

interface EndpointHierarchy {
  topLevel: EndpointOption[];
  categories: { [key: string]: EndpointOption[] };
}

@Component({
  selector: 'app-create-connectivity-test',
  template: `
    <gcp-page-layout>
      <div class="page-header">
        <div class="header-content">
          <button mat-icon-button (click)="onCancel()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1>Create Connectivity Test</h1>
            <p class="subtitle">Configure a new connectivity test to check network connectivity between endpoints</p>
          </div>
        </div>
      </div>

      <div class="page-content">
        <form [formGroup]="testForm" class="test-form">

          <!-- Source section -->
          <div class="form-section">
            <h3>Source</h3>
            
            <!-- Source endpoint type selector -->
            <div class="endpoint-selector">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Source endpoint</mat-label>
                <mat-select (selectionChange)="onSourceEndpointTypeChange($event.value)" 
                           [value]="selectedSourceCategory || testForm.get('sourceEndpointType')?.value">
                  <mat-option *ngFor="let option of sourceEndpointHierarchy.topLevel" 
                             [value]="option.value"
                             [disabled]="option.label === '---'">
                    <span [class.category-option]="option.isCategory">{{option.label}}</span>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <!-- Category sub-menu -->
              <mat-form-field *ngIf="selectedSourceCategory" appearance="outline" class="full-width category-submenu">
                <mat-label>Select {{getSourceCategoryLabel()}}</mat-label>
                <mat-select (selectionChange)="onSourceCategorySelection($event.value)"
                           [value]="testForm.get('sourceEndpointType')?.value">
                  <mat-option *ngFor="let option of getSourceCategoryOptions()" 
                             [value]="option.value">
                    {{option.label}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Source endpoint details -->
            <div class="endpoint-details" *ngIf="getCurrentSourceEndpointType()">
              
              <!-- IP Address -->
              <div *ngIf="isSourceEndpointType('ipAddress')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Source IP address *</mat-label>
                  <input matInput formControlName="sourceIp" placeholder="Example: 192.0.2.1">
                  <mat-error *ngIf="testForm.get('sourceIp')?.hasError('required')">
                    Source IP address is required
                  </mat-error>
                  <mat-error *ngIf="testForm.get('sourceIp')?.hasError('pattern')">
                    Please enter a valid IP address
                  </mat-error>
                </mat-form-field>

                <!-- IP address type selection -->
                <div class="ip-type-section">
                  <label class="ip-type-label">IP address type *</label>
                  <p class="ip-type-hint">Please provide a hint about this IP's location to get a faster, more accurate analysis.</p>
                  
                  <mat-radio-group formControlName="sourceIpType" class="ip-type-radio-group">
                    <mat-radio-button value="gcp-vpc" class="ip-type-option">
                      <div class="radio-content">
                        <div class="radio-title">Google Cloud VPC IP</div>
                        <div class="radio-description">An IP address within this project, a peered VPC, or a Shared VPC.</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="private-non-gcp" class="ip-type-option">
                      <div class="radio-content">
                        <div class="radio-title">Non-Google Cloud Private IP</div>
                        <div class="radio-description">An IP in your on-premises network or another cloud, connected via VPN or Interconnect.</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="public" class="ip-type-option">
                      <div class="radio-content">
                        <div class="radio-title">Public IP</div>
                        <div class="radio-description">An IP address reachable over the public internet.</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="auto-detect" class="ip-type-option">
                      <div class="radio-content">
                        <div class="radio-title">Let the test determine</div>
                        <div class="radio-description">The test will analyze all possible paths. This may take longer.</div>
                      </div>
                    </mat-radio-button>
                  </mat-radio-group>
                </div>

                <!-- Project and VPC selectors - only for GCP VPC -->
                <div *ngIf="testForm.get('sourceIpType')?.value === 'gcp-vpc'">
                  <mat-form-field appearance="outline" class="full-width" style="margin-top: 16px;">
                    <mat-label>VPC Network Project</mat-label>
                    <mat-select formControlName="sourceProject">
                      <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                        {{project.displayName}}
                      </mat-option>
                    </mat-select>
                    <button mat-button type="button" matSuffix color="primary" (click)="selectSourceProject()">
                      Select
                    </button>
                  </mat-form-field>

                  <!-- VPC Network selector - only for GCP VPC -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>VPC Network *</mat-label>
                    <mat-select formControlName="sourceVpcNetwork">
                      <mat-option *ngFor="let network of availableVpcNetworks" [value]="network.value">
                        {{network.displayName}}
                      </mat-option>
                    </mat-select>
                    <button mat-button type="button" matSuffix color="primary" (click)="selectSourceVpcNetwork()">
                      Select
                    </button>
                  </mat-form-field>
                </div>

                <!-- Private IP connection configuration -->
                <div *ngIf="testForm.get('sourceIpType')?.value === 'private-non-gcp'" class="connection-type-section">
                  <!-- Connection type selection -->
                  <label class="connection-type-label">Connection type *</label>
                  
                  <mat-radio-group formControlName="sourceConnectionType" class="connection-type-radio-group">
                    <mat-radio-button value="vpn-tunnel" class="connection-type-option">
                      <div class="radio-content">
                        <div class="radio-title">VPN Tunnel</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="interconnect" class="connection-type-option">
                      <div class="radio-content">
                        <div class="radio-title">Interconnect Attachment</div>
                      </div>
                    </mat-radio-button>
                    
                    <mat-radio-button value="ncc-router" class="connection-type-option">
                      <div class="radio-content">
                        <div class="radio-title">NCC Router Appliance</div>
                      </div>
                    </mat-radio-button>
                  </mat-radio-group>

                  <!-- Project selector for private non-GCP IPs -->
                  <mat-form-field *ngIf="testForm.get('sourceConnectionType')?.value" appearance="outline" class="full-width" style="margin-top: 16px;">
                    <mat-label>{{getSourceProjectLabel()}}</mat-label>
                    <mat-select formControlName="sourceProject">
                      <mat-option *ngFor="let project of availableProjects" [value]="project.value">
                        {{project.displayName}}
                      </mat-option>
                    </mat-select>
                    <button mat-button type="button" matSuffix color="primary" (click)="selectSourceProject()">
                      Select
                    </button>
                  </mat-form-field>
                  
                  <!-- Resource selection dropdown -->
                  <mat-form-field *ngIf="testForm.get('sourceProject')?.value && testForm.get('sourceConnectionType')?.value" appearance="outline" class="full-width" style="margin-top: 16px;">
                    <mat-label>{{connectionResourceLabel}}</mat-label>
                    <mat-select formControlName="sourceConnectionResource">
                      <mat-option *ngFor="let resource of connectionResourceOptions" [value]="resource.value">
                        {{resource.displayName}}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <!-- My IP Address -->
              <div *ngIf="isSourceEndpointType('myIpAddress')" class="info-message">
                <mat-icon>info</mat-icon>
                <div class="ip-address-content">
                  <div *ngIf="isLoadingUserIp" class="loading-ip">
                    <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                    Loading your IP address...
                  </div>
                  <div *ngIf="!isLoadingUserIp && userIpAddress" class="ip-address-display">
                    The test will use <strong>{{userIpAddress}}</strong> (your current public IP) as the source.
                  </div>
                  <div *ngIf="!isLoadingUserIp && !userIpAddress" class="ip-address-error">
                    The test will use your current public IP address as the source.
                    <button mat-button color="primary" (click)="loadUserIpAddress()" style="margin-left: 8px;">
                      <mat-icon>refresh</mat-icon>
                      Retry
                    </button>
                  </div>
                </div>
              </div>

              <!-- Cloud Shell -->
              <div *ngIf="isSourceEndpointType('cloudShell')" class="info-message">
                <mat-icon>info</mat-icon>
                <span>The test will use <b>34.135.171.161</b> (your current public IP of Cloud Shell) as the source.</span>
              </div>

              <!-- Cloud Console SSH-in-browser -->
              <div *ngIf="isSourceEndpointType('cloudConsoleSsh')" class="info-message">
                <mat-icon>info</mat-icon>
                <span>We will analyze connectivity from your IP address via <b>Identity Aware Proxy</b> to particular VM of choice.</span>
              </div>

              <!-- VM Instance -->
              <div *ngIf="isSourceEndpointType('gceInstance')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Source instance *</mat-label>
                  <mat-select formControlName="sourceInstance">
                    <mat-option *ngIf="isLoadingSourceResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading instances...
                    </mat-option>
                    <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                      {{sourceResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let instance of sourceResourceOptions" [value]="instance.value">
                      <div class="resource-item">
                        <div class="resource-name">{{instance.displayName}}</div>
                        <div *ngIf="instance.description" class="resource-description">{{instance.description}}</div>
                      </div>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceInstance')?.hasError('required')">
                    Source instance is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- GKE Workload/Pod -->
              <div *ngIf="isSourceEndpointTypeOneOf(['gkeWorkload', 'gkePod'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cluster *</mat-label>
                  <mat-select formControlName="sourceCluster">
                    <mat-option *ngIf="isLoadingSourceResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading clusters...
                    </mat-option>
                    <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                      {{sourceResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let cluster of sourceResourceOptions" [value]="cluster.value">
                      <span>{{cluster.displayName}}</span>
                      <span *ngIf="cluster.description" class="resource-description">{{cluster.description}}</span>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceCluster')?.hasError('required')">
                    Cluster is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getWorkloadLabel()}} *</mat-label>
                  <mat-select formControlName="sourceWorkload">
                    <mat-option value="workload-1">workload-1</mat-option>
                    <mat-option value="workload-2">workload-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceWorkload')?.hasError('required')">
                    {{getWorkloadLabel()}} is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- GKE Cluster Control Plane -->
              <div *ngIf="isSourceEndpointType('gkeCluster')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cluster *</mat-label>
                  <mat-select formControlName="sourceCluster">
                    <mat-option *ngIf="isLoadingSourceResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading clusters...
                    </mat-option>
                    <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                      {{sourceResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let cluster of sourceResourceOptions" [value]="cluster.value">
                      <span>{{cluster.displayName}}</span>
                      <span *ngIf="cluster.description" class="resource-description">{{cluster.description}}</span>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceCluster')?.hasError('required')">
                    Cluster is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Cloud Services (Run, Functions, App Engine, etc.) -->
              <div *ngIf="isSourceEndpointTypeOneOf(['cloudRun', 'cloudRunJobs', 'cloudFunctionV1', 'cloudRunFunction', 'appEngine', 'cloudBuild'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Service/Function *</mat-label>
                  <mat-select formControlName="sourceService">
                    <mat-option *ngIf="isLoadingSourceResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading services...
                    </mat-option>
                    <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                      {{sourceResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let service of sourceResourceOptions" [value]="service.value">
                      <span>{{service.displayName}}</span>
                      <span *ngIf="service.description" class="resource-description">{{service.description}}</span>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceService')?.hasError('required')">
                    Service/Function is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Data Services (Alloy DB, Cloud SQL, etc.) -->
              <div *ngIf="isSourceEndpointTypeOneOf(['alloyDb', 'cloudSqlInstance'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getSourceDataServiceLabel()}} *</mat-label>
                  <mat-select formControlName="sourceInstance">
                    <mat-option *ngIf="isLoadingSourceResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading instances...
                    </mat-option>
                    <mat-option *ngIf="sourceResourceError && !isLoadingSourceResources" disabled>
                      {{sourceResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let instance of sourceResourceOptions" [value]="instance.value">
                      <span>{{instance.displayName}}</span>
                      <span *ngIf="instance.description" class="resource-description">{{instance.description}}</span>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceInstance')?.hasError('required')">
                    {{getSourceDataServiceLabel()}} is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Subnetwork -->
              <div *ngIf="isSourceEndpointType('subnetwork')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Subnetwork *</mat-label>
                  <mat-select formControlName="sourceInstance">
                    <mat-option value="subnet-1">subnet-1</mat-option>
                    <mat-option value="subnet-2">subnet-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('sourceInstance')?.hasError('required')">
                    Subnetwork is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div>
          </div>

          <!-- Destination section -->
          <div class="form-section">
            <h3>Destination</h3>
            
            <!-- Destination endpoint type selector -->
            <div class="endpoint-selector">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Destination endpoint</mat-label>
                <mat-select (selectionChange)="onDestinationEndpointTypeChange($event.value)" 
                           [value]="selectedDestinationCategory || testForm.get('destinationEndpointType')?.value">
                  <mat-option *ngFor="let option of destinationEndpointHierarchy.topLevel" 
                             [value]="option.value"
                             [disabled]="option.label === '---'">
                    <span [class.category-option]="option.isCategory">{{option.label}}</span>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <!-- Category sub-menu -->
              <mat-form-field *ngIf="selectedDestinationCategory" appearance="outline" class="full-width category-submenu">
                <mat-label>Select {{getDestinationCategoryLabel()}}</mat-label>
                <mat-select (selectionChange)="onDestinationCategorySelection($event.value)"
                           [value]="testForm.get('destinationEndpointType')?.value">
                  <mat-option *ngFor="let option of getDestinationCategoryOptions()" 
                             [value]="option.value">
                    {{option.label}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Destination endpoint details -->
            <div class="endpoint-details" *ngIf="getCurrentDestinationEndpointType()">
              
              <!-- IP Address -->
              <div *ngIf="isDestinationEndpointType('ipAddress')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Destination IP address *</mat-label>
                  <input matInput formControlName="destinationIp" placeholder="Example: 192.0.2.1">
                  <mat-error *ngIf="testForm.get('destinationIp')?.hasError('required')">
                    Destination IP address is required
                  </mat-error>
                  <mat-error *ngIf="testForm.get('destinationIp')?.hasError('pattern')">
                    Please enter a valid IP address
                  </mat-error>
                </mat-form-field>


              </div>

              <!-- Domain Name -->
              <div *ngIf="isDestinationEndpointType('domainName')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Domain Name *</mat-label>
                  <input matInput formControlName="destinationDomain" placeholder="Example: example.com">
                  <mat-hint>System will perform DNS lookup and test against resolved IP</mat-hint>
                  <mat-error *ngIf="testForm.get('destinationDomain')?.hasError('required')">
                    Domain name is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Google APIs -->
              <div *ngIf="isDestinationEndpointType('googleApis')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Google API *</mat-label>
                  <mat-select formControlName="destinationService">
                    <mat-option value="storage.googleapis.com">Cloud Storage (storage.googleapis.com)</mat-option>
                    <mat-option value="compute.googleapis.com">Compute Engine (compute.googleapis.com)</mat-option>
                    <mat-option value="bigquery.googleapis.com">BigQuery (bigquery.googleapis.com)</mat-option>
                    <mat-option value="monitoring.googleapis.com">Cloud Monitoring (monitoring.googleapis.com)</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationService')?.hasError('required')">
                    Google API is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- VM Instance -->
              <div *ngIf="isDestinationEndpointType('gceInstance')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Destination instance *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option *ngIf="isLoadingDestinationResources" disabled>
                      <mat-spinner diameter="16" style="display: inline-block; margin-right: 8px;"></mat-spinner>
                      Loading instances...
                    </mat-option>
                    <mat-option *ngIf="destinationResourceError && !isLoadingDestinationResources" disabled>
                      {{destinationResourceError}}
                    </mat-option>
                    <mat-option *ngFor="let instance of destinationResourceOptions" [value]="instance.value">
                      <div class="resource-item">
                        <div class="resource-name">{{instance.displayName}}</div>
                        <div *ngIf="instance.description" class="resource-description">{{instance.description}}</div>
                      </div>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    Destination instance is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- GKE Cluster Control Plane -->
              <div *ngIf="isDestinationEndpointType('gkeCluster')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cluster *</mat-label>
                  <mat-select formControlName="destinationCluster">
                    <mat-option value="gke-cluster-1">gke-cluster-1</mat-option>
                    <mat-option value="gke-cluster-2">gke-cluster-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationCluster')?.hasError('required')">
                    Cluster is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- GKE Workload/Pod -->
              <div *ngIf="isDestinationEndpointTypeOneOf(['gkeWorkload', 'gkePod'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cluster *</mat-label>
                  <mat-select formControlName="destinationCluster">
                    <mat-option value="gke-cluster-1">gke-cluster-1</mat-option>
                    <mat-option value="gke-cluster-2">gke-cluster-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationCluster')?.hasError('required')">
                    Cluster is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getDestinationWorkloadLabel()}} *</mat-label>
                  <mat-select formControlName="destinationWorkload">
                    <mat-option value="workload-1">workload-1</mat-option>
                    <mat-option value="workload-2">workload-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationWorkload')?.hasError('required')">
                    {{getDestinationWorkloadLabel()}} is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- GKE Service -->
              <div *ngIf="isDestinationEndpointType('gkeService')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cluster *</mat-label>
                  <mat-select formControlName="destinationCluster">
                    <mat-option value="gke-cluster-1">gke-cluster-1</mat-option>
                    <mat-option value="gke-cluster-2">gke-cluster-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationCluster')?.hasError('required')">
                    Cluster is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Service *</mat-label>
                  <mat-select formControlName="destinationService">
                    <mat-option value="service-1">service-1</mat-option>
                    <mat-option value="service-2">service-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationService')?.hasError('required')">
                    Service is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Serverless Services (Cloud Run, Functions, App Engine, etc.) -->
              <div *ngIf="isDestinationEndpointTypeOneOf(['cloudRun', 'cloudRunJobs', 'cloudFunctionV1', 'cloudRunFunction', 'appEngine', 'cloudBuild'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Service/Function *</mat-label>
                  <mat-select formControlName="destinationService">
                    <mat-option value="service-1">service-1</mat-option>
                    <mat-option value="service-2">service-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationService')?.hasError('required')">
                    Service/Function is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Load Balancer -->
              <div *ngIf="isDestinationEndpointType('loadBalancer')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Load Balancer *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option value="lb-1">lb-1</mat-option>
                    <mat-option value="lb-2">lb-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    Load Balancer is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Subnetwork -->
              <div *ngIf="isDestinationEndpointType('subnetwork')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Subnetwork *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option value="subnet-1">subnet-1</mat-option>
                    <mat-option value="subnet-2">subnet-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    Subnetwork is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- PSC Endpoint -->
              <div *ngIf="isDestinationEndpointType('pscEndpoint')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>PSC Endpoint *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option value="psc-endpoint-1">psc-endpoint-1</mat-option>
                    <mat-option value="psc-endpoint-2">psc-endpoint-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    PSC Endpoint is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- AppHub Service -->
              <div *ngIf="isDestinationEndpointType('appHubService')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>AppHub Service *</mat-label>
                  <mat-select formControlName="destinationService">
                    <mat-option value="apphub-service-1">apphub-service-1</mat-option>
                    <mat-option value="apphub-service-2">apphub-service-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationService')?.hasError('required')">
                    AppHub Service is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- IAP-protected resource -->
              <div *ngIf="isDestinationEndpointType('iapResource')">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>IAP-protected resource *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option value="iap-resource-1">iap-resource-1</mat-option>
                    <mat-option value="iap-resource-2">iap-resource-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    IAP-protected resource is required
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- Data Services (Alloy DB, SQL, Spanner, Bigtable, etc.) -->
              <div *ngIf="isDestinationEndpointTypeOneOf(['alloyDb', 'cloudSqlInstance', 'cloudSpanner', 'cloudBigtable', 'filestore', 'redisInstance', 'redisCluster'])">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{getDestinationServiceLabel()}} *</mat-label>
                  <mat-select formControlName="destinationInstance">
                    <mat-option value="instance-1">instance-1</mat-option>
                    <mat-option value="instance-2">instance-2</mat-option>
                  </mat-select>
                  <mat-error *ngIf="testForm.get('destinationInstance')?.hasError('required')">
                    {{getDestinationServiceLabel()}} is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Destination port -->
            <mat-form-field appearance="outline" class="full-width" 
                            *ngIf="getProtocol() === 'tcp' || getProtocol() === 'udp'">
              <mat-label>Destination port *</mat-label>
              <input matInput type="number" formControlName="destinationPort" placeholder="80">
              <mat-error *ngIf="testForm.get('destinationPort')?.hasError('required')">
                Destination port is required for TCP/UDP protocols
              </mat-error>
              <mat-error *ngIf="testForm.get('destinationPort')?.hasError('min') || testForm.get('destinationPort')?.hasError('max')">
                Port must be between 1 and 65535
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Protocol -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Protocol</mat-label>
            <mat-select formControlName="protocol">
              <mat-option value="tcp">tcp</mat-option>
              <mat-option value="udp">udp</mat-option>
              <mat-option value="icmp">icmp</mat-option>
              <mat-option value="icmpv6">icmpv6</mat-option>
              <mat-option value="esp">esp</mat-option>
              <mat-option value="ah">ah</mat-option>
              <mat-option value="sctp">sctp</mat-option>
              <mat-option value="ipip">ipip</mat-option>
            </mat-select>
            <mat-error *ngIf="testForm.get('protocol')?.hasError('required')">
              Protocol is required
            </mat-error>
          </mat-form-field>

          <!-- Test name -->
          <div class="test-name-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Test name *</mat-label>
              <input matInput formControlName="displayName" 
                     placeholder="Auto-generated based on source and destination"
                     (input)="onTestNameManualEdit()">
              <mat-hint *ngIf="!userHasEditedName">Automatically generated from source and destination selection</mat-hint>
              <mat-hint *ngIf="userHasEditedName">Custom name - lowercase letters, numbers, hyphens allowed</mat-hint>
              <mat-error *ngIf="testForm.get('displayName')?.hasError('required')">
                Test name is required
              </mat-error>
              <mat-error *ngIf="testForm.get('displayName')?.hasError('pattern')">
                Only lowercase letters, numbers, and hyphens are allowed
              </mat-error>
            </mat-form-field>
          </div>

        </form>

        <!-- Bottom action buttons -->
        <div class="bottom-actions">
          <button mat-button (click)="onCancel()">CANCEL</button>
          <button mat-raised-button color="primary" 
                  [disabled]="!testForm.valid || isCreating" 
                  (click)="onCreate()">
            {{ isCreating ? 'CREATING...' : 'CREATE' }}
          </button>
        </div>
      </div>
    </gcp-page-layout>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      color: #5f6368;
    }

    .title-section h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .subtitle {
      margin: 4px 0 0 0;
      color: #5f6368;
      font-size: 14px;
    }

    .bottom-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .page-content {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .test-form {
      width: 100%;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .test-name-container {
      position: relative;
    }



    .form-section {
      margin-bottom: 24px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      color: #202124;
      font-size: 18px;
      font-weight: 500;
    }

    .ip-type-section {
      margin-bottom: 16px;
      padding: 12px 0;
    }

    .ip-type-label {
      display: block;
      color: #202124;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .ip-type-hint {
      color: #5f6368;
      font-size: 12px;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .ip-type-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ip-type-option {
      margin-bottom: 8px !important;
    }

    .radio-content {
      margin-left: 8px;
    }

    .radio-title {
      color: #202124;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .radio-description {
      color: #5f6368;
      font-size: 12px;
      line-height: 1.4;
    }

    .connection-type-section {
      margin-top: 12px;
      padding: 12px 0;
      border-top: 1px solid #e8eaed;
    }

    .connection-type-label {
      display: block;
      color: #202124;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .connection-type-radio-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .connection-type-option {
      margin-bottom: 4px !important;
    }



    ::ng-deep .mat-checkbox-label {
      color: #202124;
    }

    ::ng-deep .mat-form-field-hint,
    ::ng-deep .mat-hint {
      color: #5f6368;
      font-size: 12px;
    }

    ::ng-deep .mat-form-field-appearance-outline .mat-form-field-outline {
      color: #dadce0;
    }

    ::ng-deep .mat-form-field-appearance-outline.mat-focused .mat-form-field-outline-thick {
      color: #1a73e8;
    }

    ::ng-deep .mat-primary .mat-button-toggle-checked {
      background-color: #e8f0fe;
      color: #1a73e8;
    }

    .endpoint-selector {
      margin-bottom: 12px;
    }

    .category-submenu {
      margin-top: 8px;
      margin-left: 12px;
    }

    .category-option {
      font-weight: 500;
      color: #1a73e8;
    }

    .category-option::after {
      content: ' ▶';
      font-size: 12px;
      margin-left: 4px;
      opacity: 0.7;
    }

    .endpoint-details {
      margin-top: 12px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e8eaed;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #e8f0fe;
      border-radius: 8px;
      color: #1558d6;
      margin-bottom: 12px;
    }

    .info-message mat-icon {
      color: #1a73e8;
    }

    .ip-address-content {
      flex: 1;
    }

    .loading-ip {
      display: flex;
      align-items: center;
      color: #5f6368;
    }

    .ip-address-display strong {
      color: #1a73e8;
      font-weight: 600;
    }

    .ip-address-error {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }

    .resource-description {
      color: #5f6368;
      font-size: 11px;
      font-weight: 400;
      margin-left: 8px;
      display: block;
      margin-top: 2px;
    }

    .mat-option {
      line-height: 1.4 !important;
      min-height: 48px !important;
      padding: 8px 16px !important;
    }

    .mat-option .resource-description {
      display: block;
      margin-left: 0;
      margin-top: 4px;
      font-style: italic;
    }

    .resource-item {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .resource-name {
      font-weight: 500;
      font-size: 14px;
      color: #202124;
      line-height: 1.3;
    }

    ::ng-deep .mat-option.mat-option-disabled {
      color: #5f6368 !important;
      background-color: transparent !important;
      pointer-events: none;
      border-bottom: 1px solid #e0e0e0;
      margin: 4px 0;
    }

    ::ng-deep .mat-option.mat-option-disabled .mat-option-text {
      text-align: center;
      font-size: 12px;
      color: #5f6368;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-content {
        width: 100%;
      }

      .bottom-actions {
        width: 100%;
        justify-content: center;
        gap: 12px;
      }

      .page-content {
        padding: 16px;
      }

      .form-section {
        padding: 16px;
      }

      .category-submenu {
        margin-left: 0;
        margin-top: 8px;
      }
    }
  `]
})
export class CreateConnectivityTestComponent implements OnInit {
  testForm: FormGroup;
  availableProjects: ProjectOption[] = [];
  availableVpcNetworks: VpcNetworkOption[] = [];
  isCreating = false;

  // Source endpoint hierarchy
  sourceEndpointHierarchy: EndpointHierarchy = {
    topLevel: [
      { value: 'ipAddress', label: 'IP address', requiresDetails: true, detailsType: 'ip' },
      { value: 'myIpAddress', label: 'My IP address', requiresDetails: false },
      { value: 'cloudShell', label: 'Cloud Shell', requiresDetails: false },
      { value: 'cloudConsoleSsh', label: 'Cloud Console SSH-in-browser', requiresDetails: false },
      { value: 'gceInstance', label: 'VM instance', requiresDetails: true, detailsType: 'instance' },
      { value: 'gke', label: 'GKE...', isCategory: true },
      { value: 'serverless', label: 'Serverless...', isCategory: true },
      { value: 'data-services', label: 'Managed Data Services...', isCategory: true },
      { value: 'cicd', label: 'CI/CD...', isCategory: true },
      { value: 'network', label: 'Network...', isCategory: true }
    ],
    categories: {
      'gke': [
        { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
        { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
        { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' }
      ],
      'serverless': [
        { value: 'cloudRun', label: 'Cloud Run Service', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudRunJobs', label: 'Cloud Run Jobs', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudFunctionV1', label: 'Cloud Function v1', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudRunFunction', label: 'Cloud Run Function', requiresDetails: true, detailsType: 'service' },
        { value: 'appEngine', label: 'App Engine', requiresDetails: true, detailsType: 'service' }
      ],
      'data-services': [
        { value: 'alloyDb', label: 'Alloy DB instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'cloudSqlInstance', label: 'Cloud SQL instance', requiresDetails: true, detailsType: 'instance' }
      ],
      'cicd': [
        { value: 'cloudBuild', label: 'Cloud Build private worker', requiresDetails: true, detailsType: 'service' }
      ],
      'network': [
        { value: 'subnetwork', label: 'Subnetwork', requiresDetails: true, detailsType: 'custom' }
      ]
    }
  };

  // Destination endpoint hierarchy  
  destinationEndpointHierarchy: EndpointHierarchy = {
    topLevel: [
      { value: 'ipAddress', label: 'IP address', requiresDetails: true, detailsType: 'ip' },
      { value: 'domainName', label: 'Domain Name', requiresDetails: true, detailsType: 'domain' },
      { value: 'googleApis', label: 'Google APIs (via Private Access)', requiresDetails: true, detailsType: 'service' },
      { value: 'application', label: 'Application Endpoints...', isCategory: true },
      { value: 'cicd', label: 'CI/CD...', isCategory: true },
      { value: 'gceInstance', label: 'VM instance', requiresDetails: true, detailsType: 'instance' },
      { value: 'gke', label: 'GKE...', isCategory: true },
      { value: 'data-services', label: 'Managed Data Services...', isCategory: true },
      { value: 'network', label: 'Network...', isCategory: true },
      { value: 'serverless', label: 'Serverless...', isCategory: true }
    ],
    categories: {
      'gke': [
        { value: 'gkeCluster', label: 'GKE cluster control plane', requiresDetails: true, detailsType: 'cluster' },
        { value: 'gkeWorkload', label: 'GKE workload', requiresDetails: true, detailsType: 'workload' },
        { value: 'gkePod', label: 'GKE pod', requiresDetails: true, detailsType: 'workload' },
        { value: 'gkeService', label: 'GKE service', requiresDetails: true, detailsType: 'service' }
      ],
      'serverless': [
        { value: 'cloudRun', label: 'Cloud Run Service', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudRunJobs', label: 'Cloud Run Jobs', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudFunctionV1', label: 'Cloud Function v1', requiresDetails: true, detailsType: 'service' },
        { value: 'cloudRunFunction', label: 'Cloud Run Function', requiresDetails: true, detailsType: 'service' },
        { value: 'appEngine', label: 'App Engine', requiresDetails: true, detailsType: 'service' }
      ],
      'application': [
        { value: 'appHubService', label: 'AppHub Service', requiresDetails: true, detailsType: 'service' },
        { value: 'iapResource', label: 'IAP-protected resource', requiresDetails: true, detailsType: 'instance' },
        { value: 'loadBalancer', label: 'Load Balancer', requiresDetails: true, detailsType: 'instance' },
        { value: 'pscEndpoint', label: 'PSC endpoint', requiresDetails: true, detailsType: 'instance' }
      ],
      'cicd': [
        { value: 'cloudBuild', label: 'Cloud Build private worker', requiresDetails: true, detailsType: 'service' }
      ],
      'network': [
        { value: 'subnetwork', label: 'Subnetwork', requiresDetails: true, detailsType: 'custom' }
      ],
      'data-services': [
        { value: 'alloyDb', label: 'Alloy DB instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'cloudSqlInstance', label: 'Cloud SQL instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'cloudSpanner', label: 'Cloud Spanner instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'cloudBigtable', label: 'Cloud Bigtable instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'filestore', label: 'Filestore instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'redisInstance', label: 'Redis Instance', requiresDetails: true, detailsType: 'instance' },
        { value: 'redisCluster', label: 'Redis Cluster', requiresDetails: true, detailsType: 'instance' }
      ]
    }
  };

  // Current selections
  selectedSourceCategory: string | null = null;
  selectedDestinationCategory: string | null = null;

  // Name generation tracking
  userHasEditedName: boolean = false;

  // Cached values to prevent template method calls
  connectionResourceLabel: string = 'Resource *';
  connectionResourceOptions: { value: string; displayName: string }[] = [];

  // User's IP address
  userIpAddress: string | null = null;
  isLoadingUserIp: boolean = false;

  // Resource loading
  sourceResourceOptions: ResourceOption[] = [];
  destinationResourceOptions: ResourceOption[] = [];
  isLoadingSourceResources: boolean = false;
  isLoadingDestinationResources: boolean = false;
  sourceResourceError: string | null = null;
  destinationResourceError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private connectivityTestsService: ConnectivityTestsService,
    private projectService: ProjectService,
    private resourceLoaderService: ResourceLoaderService
  ) {
    this.testForm = this.fb.group({
      displayName: ['', [
        Validators.required, 
        Validators.pattern(/^[a-z0-9\-]+$/)
      ]],
      protocol: ['tcp', Validators.required],
      sourceEndpointType: ['', Validators.required],
      sourceCategory: [''],
      sourceIp: [''],
      sourceInstance: [''],
      sourceDomain: [''],
      sourceService: [''],
      sourceCluster: [''],
      sourceWorkload: [''],
      sourceIpType: ['gcp-vpc', Validators.required],
      sourceConnectionType: ['vpn-tunnel'],
      sourceConnectionResource: [''],
      sourceProject: [''],
      sourceVpcNetwork: [''],
      destinationEndpointType: ['', Validators.required],
      destinationCategory: [''],
      destinationIp: [''],
      destinationInstance: [''],
      destinationDomain: [''],
      destinationService: [''],
      destinationCluster: [''],
      destinationWorkload: [''],
      destinationPort: [80, [Validators.min(1), Validators.max(65535)]]
    });
  }

  ngOnInit() {
    this.loadAvailableProjects();
    this.loadAvailableVpcNetworks();
    this.setupFormValidation();
    
    // Initialize cached connection resource data
    this.updateConnectionResourceData();
    
    // Load user's IP address when component initializes
    this.loadUserIpAddress();
  }

  private loadAvailableProjects() {
    // First, explicitly load projects like the project picker does
    this.projectService.loadProjects().subscribe({
      next: (projects: Project[]) => {
        this.availableProjects = projects.map((project: Project) => ({
          value: project.id,
          displayName: `${project.name} (${project.id})`
        }));
        
        // Prefill with current project
        const currentProject = this.projectService.getCurrentProject();
        if (currentProject) {
          this.testForm.patchValue({
            sourceProject: currentProject.id
          }, { emitEvent: false });
        }
        
        console.log(`📋 Loaded ${projects.length} projects for connectivity test`);
      },
      error: (error: any) => {
        console.error('❌ Error loading projects for connectivity test:', error);
      }
    });
    
    // Also subscribe to future project updates
    this.projectService.projects$.subscribe({
      next: (projects: Project[]) => {
        // Only update if we actually have projects (avoid clearing the list)
        if (projects.length > 0) {
          this.availableProjects = projects.map((project: Project) => ({
            value: project.id,
            displayName: `${project.name} (${project.id})`
          }));
          
          // Update current project selection if form is empty or project changed
          const currentProject = this.projectService.getCurrentProject();
          const currentSourceProject = this.testForm.get('sourceProject')?.value;
          
          if (currentProject && (!currentSourceProject || currentSourceProject !== currentProject.id)) {
            this.testForm.patchValue({
              sourceProject: currentProject.id
            }, { emitEvent: false });
          }
        }
      },
      error: (error: any) => {
        console.error('❌ Error in projects subscription for connectivity test:', error);
      }
    });
  }

  private loadAvailableVpcNetworks() {
    // Mock VPC networks for now - in a real implementation, this would call a service
    this.availableVpcNetworks = [
      { value: 'default', displayName: 'default' },
      { value: 'vpc-network-1', displayName: 'vpc-network-1' },
      { value: 'vpc-network-2', displayName: 'vpc-network-2' },
      { value: 'shared-vpc-1', displayName: 'shared-vpc-1' }
    ];
  }

  loadUserIpAddress() {
    this.isLoadingUserIp = true;
    this.userIpAddress = null;
    
    // Use ipify.org service to get user's public IP address
    this.http.get('https://api.ipify.org?format=json').subscribe({
      next: (response: any) => {
        this.userIpAddress = response.ip;
        this.isLoadingUserIp = false;
      },
      error: (error) => {
        console.error('Error loading user IP address:', error);
        this.userIpAddress = null;
        this.isLoadingUserIp = false;
      }
    });
  }

  private setupFormValidation() {
    // Add conditional validation for source endpoints
    this.testForm.get('sourceEndpointType')?.valueChanges.subscribe(value => {
      this.clearSourceValidators();
      this.setSourceValidators(value);
    });

    // Add conditional validation for destination endpoints
    this.testForm.get('destinationEndpointType')?.valueChanges.subscribe(value => {
      this.clearDestinationValidators();
      this.setDestinationValidators(value);
    });

    // Add conditional validation for destination port
    this.testForm.get('protocol')?.valueChanges.subscribe(protocol => {
      const portControl = this.testForm.get('destinationPort');
      
      if (protocol === 'tcp' || protocol === 'udp') {
        portControl?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(65535)
        ]);
      } else {
        portControl?.clearValidators();
      }
      
      portControl?.updateValueAndValidity({ emitEvent: false });
    });

    // Add conditional validation for source IP type
    this.testForm.get('sourceIpType')?.valueChanges.subscribe(ipType => {
      // Don't apply IP type validation for endpoint types that don't use IP types
      const sourceEndpointType = this.testForm.get('sourceEndpointType')?.value;
      if (sourceEndpointType !== 'ipAddress') {
        return; // IP type validation is only for 'ipAddress' endpoint type
      }

      // Clear previous validators
      this.testForm.get('sourceConnectionType')?.clearValidators();
      this.testForm.get('sourceConnectionResource')?.clearValidators();
      this.testForm.get('sourceProject')?.clearValidators();
      this.testForm.get('sourceVpcNetwork')?.clearValidators();

      const currentProject = this.projectService.getCurrentProject();
      
      if (ipType === 'private-non-gcp') {
        this.testForm.get('sourceConnectionType')?.setValidators([Validators.required]);
        // Set defaults when switching to private-non-gcp
        this.testForm.patchValue({
          sourceConnectionType: '',
          sourceConnectionResource: '',
          sourceProject: '',
          sourceVpcNetwork: ''
        }, { emitEvent: false });
      } else if (ipType === 'gcp-vpc') {
        this.testForm.get('sourceProject')?.setValidators([Validators.required]);
        this.testForm.get('sourceVpcNetwork')?.setValidators([Validators.required]);
        // Set defaults when switching to gcp-vpc
        this.testForm.patchValue({
          sourceConnectionType: 'vpn-tunnel',
          sourceConnectionResource: '',
          sourceProject: currentProject ? currentProject.id : ''
        }, { emitEvent: false });
      } else {
        // For 'public' and 'auto-detect', clear all values
        this.testForm.patchValue({
          sourceConnectionType: 'vpn-tunnel',
          sourceConnectionResource: '',
          sourceProject: '',
          sourceVpcNetwork: ''
        }, { emitEvent: false });
      }
      
      this.testForm.get('sourceConnectionType')?.updateValueAndValidity({ emitEvent: false });
      this.testForm.get('sourceConnectionResource')?.updateValueAndValidity({ emitEvent: false });
      this.testForm.get('sourceProject')?.updateValueAndValidity({ emitEvent: false });
      this.testForm.get('sourceVpcNetwork')?.updateValueAndValidity({ emitEvent: false });
      
      // Update cached values when IP type changes
      this.updateConnectionResourceData();
    });

    // Add conditional validation for source connection type
    this.testForm.get('sourceConnectionType')?.valueChanges.subscribe(connectionType => {
      if (connectionType && this.testForm.get('sourceIpType')?.value === 'private-non-gcp') {
        this.testForm.get('sourceProject')?.setValidators([Validators.required]);
        // Clear project and resource when connection type changes
        this.testForm.patchValue({
          sourceProject: '',
          sourceConnectionResource: ''
        }, { emitEvent: false });
      } else if (this.testForm.get('sourceIpType')?.value === 'private-non-gcp') {
        this.testForm.get('sourceProject')?.clearValidators();
        this.testForm.patchValue({
          sourceProject: '',
          sourceConnectionResource: ''
        }, { emitEvent: false });
      }
      this.testForm.get('sourceProject')?.updateValueAndValidity({ emitEvent: false });
      
      // Update cached values to prevent template method calls
      this.updateConnectionResourceData();
    });

    // Add conditional validation for source project
    this.testForm.get('sourceProject')?.valueChanges.subscribe(project => {
      if (project && this.testForm.get('sourceIpType')?.value === 'private-non-gcp' && this.testForm.get('sourceConnectionType')?.value) {
        this.testForm.get('sourceConnectionResource')?.setValidators([Validators.required]);
        // Clear resource when project changes
        this.testForm.patchValue({
          sourceConnectionResource: ''
        }, { emitEvent: false });
      } else {
        this.testForm.get('sourceConnectionResource')?.clearValidators();
        this.testForm.patchValue({
          sourceConnectionResource: ''
        }, { emitEvent: false });
      }
      this.testForm.get('sourceConnectionResource')?.updateValueAndValidity({ emitEvent: false });
    });



    // Trigger initial validation
    this.testForm.get('sourceEndpointType')?.updateValueAndValidity();
    this.testForm.get('destinationEndpointType')?.updateValueAndValidity();
    this.testForm.get('protocol')?.updateValueAndValidity();

    // Set up name generation
    this.setupNameGeneration();
  }

  private setupNameGeneration() {
    // Watch for changes that should trigger name generation
    const fieldsToWatch = [
      'sourceEndpointType', 'sourceIp', 'sourceIpType', 'sourceConnectionType', 'sourceConnectionResource', 'sourceInstance', 'sourceDomain', 'sourceService', 'sourceCluster', 'sourceWorkload',
      'destinationEndpointType', 'destinationIp', 'destinationInstance', 'destinationDomain', 'destinationService', 'destinationCluster', 'destinationWorkload'
    ];

    fieldsToWatch.forEach(fieldName => {
      this.testForm.get(fieldName)?.valueChanges.subscribe(() => {
        this.updateTestName();
      });
    });

    // Special handling for destination instance changes to ensure SSH-in-browser scenarios work
    this.testForm.get('destinationInstance')?.valueChanges.subscribe((value) => {
      if (this.testForm.get('sourceEndpointType')?.value === 'cloudConsoleSsh') {
        // Always regenerate name for SSH-in-browser when destination changes
        setTimeout(() => {
          this.userHasEditedName = false; // Ensure we can auto-generate
          this.updateTestName();
        }, 50);
      }
    });

    // Initial name generation
    this.updateTestName();
  }

  private clearSourceValidators() {
    const controls = ['sourceIp', 'sourceIpType', 'sourceConnectionType', 'sourceConnectionResource', 'sourceProject', 'sourceVpcNetwork', 'sourceInstance', 'sourceDomain', 'sourceService', 'sourceCluster', 'sourceWorkload'];
    controls.forEach(controlName => {
      const control = this.testForm.get(controlName);
      control?.clearValidators();
      control?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private clearDestinationValidators() {
    const controls = ['destinationIp', 'destinationInstance', 'destinationDomain', 'destinationService', 'destinationCluster', 'destinationWorkload'];
    controls.forEach(controlName => {
      const control = this.testForm.get(controlName);
      control?.clearValidators();
      control?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setSourceValidators(endpointType: string) {
    switch (endpointType) {
      case 'ipAddress':
        this.testForm.get('sourceIp')?.setValidators([
          Validators.required,
          Validators.pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
        ]);
        this.testForm.get('sourceIpType')?.setValidators([Validators.required]);
        break;
      case 'gceInstance':
      case 'alloyDb':
      case 'cloudSqlInstance':
      case 'subnetwork':
        this.testForm.get('sourceInstance')?.setValidators([Validators.required]);
        break;
      case 'gkeCluster':
        this.testForm.get('sourceCluster')?.setValidators([Validators.required]);
        break;
      case 'gkeWorkload':
      case 'gkePod':
        this.testForm.get('sourceCluster')?.setValidators([Validators.required]);
        this.testForm.get('sourceWorkload')?.setValidators([Validators.required]);
        break;
      case 'cloudRun':
      case 'cloudFunction':
      case 'appEngine':
      case 'cloudBuild':
        this.testForm.get('sourceService')?.setValidators([Validators.required]);
        break;
      case 'myIpAddress':
      case 'cloudShell':
      case 'cloudConsoleSsh':
        // These don't require additional validation - they use automatic IP detection or predefined sources
        // Explicitly clear all VPC-related validators
        this.testForm.get('sourceIpType')?.clearValidators();
        this.testForm.get('sourceProject')?.clearValidators();
        this.testForm.get('sourceVpcNetwork')?.clearValidators();
        this.testForm.get('sourceConnectionType')?.clearValidators();
        this.testForm.get('sourceConnectionResource')?.clearValidators();
        
        // Clear all VPC-related values
        this.testForm.patchValue({
          sourceIpType: '',
          sourceProject: '',
          sourceVpcNetwork: '',
          sourceConnectionType: '',
          sourceConnectionResource: ''
        }, { emitEvent: false });
        break;
    }

    // Update validity for all source controls
    ['sourceIp', 'sourceIpType', 'sourceConnectionType', 'sourceConnectionResource', 'sourceProject', 'sourceVpcNetwork', 'sourceInstance', 'sourceDomain', 'sourceService', 'sourceCluster', 'sourceWorkload'].forEach(controlName => {
      this.testForm.get(controlName)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setDestinationValidators(endpointType: string) {
    switch (endpointType) {
      case 'ipAddress':
        this.testForm.get('destinationIp')?.setValidators([
          Validators.required,
          Validators.pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
        ]);
        break;
      case 'domainName':
        this.testForm.get('destinationDomain')?.setValidators([
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
        ]);
        break;
      case 'gceInstance':
      case 'alloyDb':
      case 'cloudSqlInstance':
      case 'cloudSpanner':
      case 'cloudBigtable':
      case 'filestore':
      case 'redisInstance':
      case 'redisCluster':
      case 'loadBalancer':
      case 'pscEndpoint':
      case 'iapResource':
      case 'subnetwork':
        this.testForm.get('destinationInstance')?.setValidators([Validators.required]);
        break;
      case 'gkeCluster':
        this.testForm.get('destinationCluster')?.setValidators([Validators.required]);
        break;
      case 'gkeWorkload':
      case 'gkePod':
        this.testForm.get('destinationCluster')?.setValidators([Validators.required]);
        this.testForm.get('destinationWorkload')?.setValidators([Validators.required]);
        break;
      case 'gkeService':
        this.testForm.get('destinationCluster')?.setValidators([Validators.required]);
        this.testForm.get('destinationService')?.setValidators([Validators.required]);
        break;
      case 'googleApis':
      case 'appHubService':
      case 'cloudRun':
      case 'cloudRunJobs':
      case 'cloudFunctionV1':
      case 'cloudRunFunction':
      case 'appEngine':
      case 'cloudBuild':
        this.testForm.get('destinationService')?.setValidators([Validators.required]);
        break;
    }

    // Update validity for all destination controls
    ['destinationIp', 'destinationInstance', 'destinationDomain', 'destinationService', 'destinationCluster', 'destinationWorkload'].forEach(controlName => {
      this.testForm.get(controlName)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  selectSourceProject() {
    // This would typically open a project picker dialog
    console.log('Select source project clicked');
  }

  selectSourceVpcNetwork() {
    // This would typically open a VPC network picker dialog
    console.log('Select source VPC network clicked');
  }

  // Source endpoint selection methods
  onSourceEndpointTypeChange(value: string) {
    const option = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === value);
    
    if (option?.isCategory) {
      this.selectedSourceCategory = value;
      this.testForm.patchValue({ 
        sourceCategory: value,
        sourceEndpointType: ''
      });
    } else {
      this.selectedSourceCategory = null;
      this.testForm.patchValue({ 
        sourceCategory: '',
        sourceEndpointType: value
      });
      this.resetSourceDetails();
      
      // Load resources for the selected endpoint type
      this.loadSourceResources(value as EndpointType);
      
      // Auto-set destination for Cloud Console SSH-in-browser
      if (value === 'cloudConsoleSsh') {
        // Reset destination details first, then set new values
        this.resetDestinationDetails();
        this.testForm.patchValue({
          destinationEndpointType: 'gceInstance',
          destinationPort: 22
        }, { emitEvent: false }); // Don't emit events during auto-setup
        // Set up validation for the auto-selected destination
        this.clearDestinationValidators();
        this.setDestinationValidators('gceInstance');
        // Update validity to trigger any necessary subscriptions
        this.testForm.get('destinationEndpointType')?.updateValueAndValidity();
        // Reset userHasEditedName flag to ensure auto-generation works
        this.userHasEditedName = false;
        // Clear the test name initially for SSH scenarios
        this.testForm.patchValue({ displayName: '' }, { emitEvent: false });
      }
    }
  }

  onSourceCategorySelection(endpointType: string) {
    this.testForm.patchValue({ 
      sourceEndpointType: endpointType,
      sourceCategory: this.selectedSourceCategory
    });
    // Keep selectedSourceCategory so sub-dropdown stays visible
    this.resetSourceDetails();
    
    // Load resources for the selected endpoint type
    this.loadSourceResources(endpointType as EndpointType);
  }

  // Destination endpoint selection methods
  onDestinationEndpointTypeChange(value: string) {
    const option = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === value);
    
    if (option?.isCategory) {
      this.selectedDestinationCategory = value;
      this.testForm.patchValue({ 
        destinationCategory: value,
        destinationEndpointType: ''
      });
    } else {
      this.selectedDestinationCategory = null;
      this.testForm.patchValue({ 
        destinationCategory: '',
        destinationEndpointType: value
      });
      this.resetDestinationDetails();
      
      // Load resources for the selected endpoint type
      this.loadDestinationResources(value as EndpointType);
    }
  }

  onDestinationCategorySelection(endpointType: string) {
    this.testForm.patchValue({ 
      destinationEndpointType: endpointType,
      destinationCategory: this.selectedDestinationCategory
    });
    // Keep selectedDestinationCategory so sub-dropdown stays visible
    this.resetDestinationDetails();
    
    // Load resources for the selected endpoint type
    this.loadDestinationResources(endpointType as EndpointType);
  }

  // Helper methods to reset form details
  resetSourceDetails() {
    const currentProject = this.projectService.getCurrentProject();
    this.testForm.patchValue({
      sourceIp: '',
      sourceInstance: '',
      sourceDomain: '',
      sourceService: '',
      sourceCluster: '',
      sourceWorkload: '',
      sourceIpType: 'gcp-vpc',
      sourceConnectionType: '',
      sourceConnectionResource: '',
      sourceProject: currentProject ? currentProject.id : '',
      sourceVpcNetwork: ''
    });
  }

  resetDestinationDetails() {
    this.testForm.patchValue({
      destinationIp: '',
      destinationInstance: '',
      destinationDomain: '',
      destinationService: '',
      destinationCluster: '',
      destinationWorkload: ''
    });
  }

  // Helper methods to get current endpoint details
  getSourceEndpointDetails() {
    const endpointType = this.testForm.get('sourceEndpointType')?.value;
    const topLevelOption = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === endpointType);
    if (topLevelOption) return topLevelOption;

    // Check categories
    for (const [categoryKey, options] of Object.entries(this.sourceEndpointHierarchy.categories)) {
      const option = options.find(opt => opt.value === endpointType);
      if (option) return option;
    }
    return null;
  }

  getDestinationEndpointDetails() {
    const endpointType = this.testForm.get('destinationEndpointType')?.value;
    const topLevelOption = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === endpointType);
    if (topLevelOption) return topLevelOption;

    // Check categories
    for (const [categoryKey, options] of Object.entries(this.destinationEndpointHierarchy.categories)) {
      const option = options.find(opt => opt.value === endpointType);
      if (option) return option;
    }
    return null;
  }

  getDestinationServiceLabel(): string {
    const endpointType = this.testForm.get('destinationEndpointType')?.value;
    switch (endpointType) {
      case 'alloyDb': return 'Alloy DB instance';
      case 'cloudSqlInstance': return 'Cloud SQL instance';
      case 'cloudSpanner': return 'Cloud Spanner instance';
      case 'cloudBigtable': return 'Cloud Bigtable instance';
      case 'filestore': return 'Filestore instance';
      case 'redisInstance': return 'Redis Instance';
      case 'redisCluster': return 'Redis Cluster';
      default: return 'Service';
    }
  }

  getSourceDataServiceLabel(): string {
    const endpointType = this.testForm.get('sourceEndpointType')?.value;
    switch (endpointType) {
      case 'alloyDb': return 'Alloy DB instance';
      case 'cloudSqlInstance': return 'Cloud SQL instance';
      default: return 'Data service';
    }
  }

  // Helper methods for template expressions
  getSourceCategoryLabel(): string {
    if (!this.selectedSourceCategory) return '';
    const option = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === this.selectedSourceCategory);
    return option?.label?.replace('...', '') || '';
  }

  getDestinationCategoryLabel(): string {
    if (!this.selectedDestinationCategory) return '';
    const option = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === this.selectedDestinationCategory);
    return option?.label?.replace('...', '') || '';
  }

  getCurrentSourceEndpointType(): string {
    return this.testForm.get('sourceEndpointType')?.value || '';
  }

  getCurrentDestinationEndpointType(): string {
    return this.testForm.get('destinationEndpointType')?.value || '';
  }

  getSourceCategoryOptions(): EndpointOption[] {
    return this.selectedSourceCategory ? this.sourceEndpointHierarchy.categories[this.selectedSourceCategory] || [] : [];
  }

  getDestinationCategoryOptions(): EndpointOption[] {
    return this.selectedDestinationCategory ? this.destinationEndpointHierarchy.categories[this.selectedDestinationCategory] || [] : [];
  }

  isSourceEndpointType(type: string): boolean {
    return this.getCurrentSourceEndpointType() === type;
  }

  isDestinationEndpointType(type: string): boolean {
    return this.getCurrentDestinationEndpointType() === type;
  }

  isSourceEndpointTypeOneOf(types: string[]): boolean {
    return types.includes(this.getCurrentSourceEndpointType());
  }

  isDestinationEndpointTypeOneOf(types: string[]): boolean {
    return types.includes(this.getCurrentDestinationEndpointType());
  }

  getWorkloadLabel(): string {
    return this.getCurrentSourceEndpointType() === 'gkeWorkload' ? 'Workload' : 'Pod';
  }

  getDestinationWorkloadLabel(): string {
    return this.getCurrentDestinationEndpointType() === 'gkeWorkload' ? 'Workload' : 'Pod';
  }

  getProtocol(): string {
    return this.testForm.get('protocol')?.value || '';
  }

  getSourceProjectLabel(): string {
    const connectionType = this.testForm.get('sourceConnectionType')?.value;
    switch (connectionType) {
      case 'vpn-tunnel':
        return 'VPN Tunnel Project';
      case 'interconnect':
        return 'Interconnect Attachment Project';
      case 'ncc-router':
        return 'NCC Router Appliance Project';
      default:
        return 'VPC Network Project';
    }
  }

  // Update cached connection resource data to prevent template method calls
  updateConnectionResourceData(): void {
    const connectionType = this.testForm.get('sourceConnectionType')?.value;
    
    // Update label
    switch (connectionType) {
      case 'vpn-tunnel':
        this.connectionResourceLabel = 'VPN Tunnel *';
        break;
      case 'interconnect':
        this.connectionResourceLabel = 'Interconnect Attachment *';
        break;
      case 'ncc-router':
        this.connectionResourceLabel = 'Router Appliance VM Instance *';
        break;
      default:
        this.connectionResourceLabel = 'Resource *';
        break;
    }
    
    // Update options
    switch (connectionType) {
      case 'vpn-tunnel':
        this.connectionResourceOptions = [
          { value: 'vpn-tunnel-1', displayName: 'vpn-tunnel-1' },
          { value: 'vpn-tunnel-2', displayName: 'vpn-tunnel-2' },
          { value: 'vpn-tunnel-3', displayName: 'vpn-tunnel-3' }
        ];
        break;
      case 'interconnect':
        this.connectionResourceOptions = [
          { value: 'interconnect-attach-1', displayName: 'interconnect-attach-1' },
          { value: 'interconnect-attach-2', displayName: 'interconnect-attach-2' },
          { value: 'interconnect-attach-3', displayName: 'interconnect-attach-3' }
        ];
        break;
      case 'ncc-router':
        this.connectionResourceOptions = [
          { value: 'router-vm-1', displayName: 'router-vm-1' },
          { value: 'router-vm-2', displayName: 'router-vm-2' },
          { value: 'router-vm-3', displayName: 'router-vm-3' }
        ];
        break;
      default:
        this.connectionResourceOptions = [];
        break;
    }
  }





  // Get display text for source endpoint selection
  getSourceEndpointDisplayText(): string {
    const endpointType = this.getCurrentSourceEndpointType();
    const category = this.testForm.get('sourceCategory')?.value;
    
    if (!endpointType) return '';
    
    // Find the endpoint option
    let endpointOption = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === endpointType);
    
    if (!endpointOption && category) {
      // Look in categories
      for (const [categoryKey, options] of Object.entries(this.sourceEndpointHierarchy.categories)) {
        const option = options.find(opt => opt.value === endpointType);
        if (option) {
          endpointOption = option;
          const categoryOption = this.sourceEndpointHierarchy.topLevel.find(opt => opt.value === category);
          if (categoryOption) {
            return `${categoryOption.label.replace('...', '')} > ${option.label}`;
          }
          break;
        }
      }
    }
    
    return endpointOption?.label || endpointType;
  }

  // Get display text for destination endpoint selection
  getDestinationEndpointDisplayText(): string {
    const endpointType = this.getCurrentDestinationEndpointType();
    const category = this.testForm.get('destinationCategory')?.value;
    
    if (!endpointType) return '';
    
    // Find the endpoint option
    let endpointOption = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === endpointType);
    
    if (!endpointOption && category) {
      // Look in categories
      for (const [categoryKey, options] of Object.entries(this.destinationEndpointHierarchy.categories)) {
        const option = options.find(opt => opt.value === endpointType);
        if (option) {
          endpointOption = option;
          const categoryOption = this.destinationEndpointHierarchy.topLevel.find(opt => opt.value === category);
          if (categoryOption) {
            return `${categoryOption.label.replace('...', '')} > ${option.label}`;
          }
          break;
        }
      }
    }
    
    return endpointOption?.label || endpointType;
  }

  // Name generation methods
  generateSourceIdentifier(): string {
    const endpointType = this.testForm.get('sourceEndpointType')?.value;
    const formValue = this.testForm.value;

    switch (endpointType) {
      case 'ipAddress':
        const sourceIp = formValue.sourceIp;
        return sourceIp ? `ip-${sourceIp.replace(/\./g, '-')}` : '';
      
      case 'myIpAddress':
        return 'my-ip';
      
      case 'cloudShell':
        return 'cloud-shell';
      
      case 'cloudConsoleSsh':
        return 'console-ssh';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.sourceInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeWorkload':
        const workloadName = this.extractResourceName(formValue.sourceWorkload);
        return workloadName ? `gke-wl-${workloadName}` : '';
      
      case 'gkePod':
        const podName = this.extractResourceName(formValue.sourceWorkload);
        return podName ? `gke-pod-${podName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.sourceCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'cloudRun':
        const runServiceName = this.extractResourceName(formValue.sourceService);
        return runServiceName ? `cr-${runServiceName}` : '';
      
      case 'cloudFunction':
        const functionName = this.extractResourceName(formValue.sourceService);
        return functionName ? `cf-${functionName}` : '';
      
      case 'alloyDb':
        const alloyDbInstanceName = this.extractResourceName(formValue.sourceInstance);
        return alloyDbInstanceName ? `alloydb-${alloyDbInstanceName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formValue.sourceInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formValue.sourceInstance);
        return subnetName ? `subnet-${subnetName}` : '';
      
      default:
        return '';
    }
  }

  generateDestinationIdentifier(): string {
    const endpointType = this.testForm.get('destinationEndpointType')?.value;
    const formValue = this.testForm.value;

    switch (endpointType) {
      case 'ipAddress':
        const destIp = formValue.destinationIp;
        return destIp ? `ip-${destIp.replace(/\./g, '-')}` : '';
      
      case 'domainName':
        const domain = formValue.destinationDomain;
        return domain ? `domain-${domain.replace(/\./g, '-')}` : '';
      
      case 'googleApis':
        const apiService = formValue.destinationService;
        return apiService ? `google-apis-${this.extractResourceName(apiService)}` : 'google-apis';
      
      case 'gceInstance':
        const instanceName = this.extractResourceName(formValue.destinationInstance);
        return instanceName ? `vm-${instanceName}` : '';
      
      case 'gkeCluster':
        const clusterName = this.extractResourceName(formValue.destinationCluster);
        return clusterName ? `gke-cluster-${clusterName}` : '';
      
      case 'loadBalancer':
        const lbName = this.extractResourceName(formValue.destinationInstance);
        return lbName ? `lb-${lbName}` : '';
      
      case 'subnetwork':
        const subnetName = this.extractResourceName(formValue.destinationInstance);
        return subnetName ? `subnet-${subnetName}` : '';
      
      case 'pscEndpoint':
        const pscName = this.extractResourceName(formValue.destinationInstance);
        return pscName ? `psc-${pscName}` : '';
      
      case 'appHubService':
        const appHubName = this.extractResourceName(formValue.destinationService);
        return appHubName ? `apphub-${appHubName}` : '';
      
      case 'iapResource':
        const iapResourceName = this.extractResourceName(formValue.destinationInstance);
        return iapResourceName ? `iap-${iapResourceName}` : '';
      
      case 'alloyDb':
        const alloyDbName = this.extractResourceName(formValue.destinationInstance);
        return alloyDbName ? `alloydb-${alloyDbName}` : '';
      
      case 'cloudSqlInstance':
        const sqlInstanceName = this.extractResourceName(formValue.destinationInstance);
        return sqlInstanceName ? `sql-${sqlInstanceName}` : '';
      
      case 'cloudSpanner':
        const spannerName = this.extractResourceName(formValue.destinationInstance);
        return spannerName ? `spanner-${spannerName}` : '';
      
      case 'cloudBigtable':
        const bigtableName = this.extractResourceName(formValue.destinationInstance);
        return bigtableName ? `bigtable-${bigtableName}` : '';
      
      case 'filestore':
        const filestoreName = this.extractResourceName(formValue.destinationInstance);
        return filestoreName ? `filestore-${filestoreName}` : '';
      
      case 'redisInstance':
        const redisInstanceName = this.extractResourceName(formValue.destinationInstance);
        return redisInstanceName ? `redis-${redisInstanceName}` : '';
      
      case 'redisCluster':
        const redisClusterName = this.extractResourceName(formValue.destinationInstance);
        return redisClusterName ? `redis-cluster-${redisClusterName}` : '';
      
      default:
        return '';
    }
  }

  extractResourceName(resourcePath: string): string {
    if (!resourcePath) return '';
    
    // Extract name from GCP resource paths like "projects/X/zones/Y/instances/name"
    const parts = resourcePath.split('/');
    return parts[parts.length - 1] || resourcePath;
  }

  sanitizeName(name: string): string {
    return name
      .toLowerCase()                           // Convert to lowercase
      .replace(/[^a-z0-9-]/g, '-')            // Replace invalid chars with hyphens
      .replace(/-+/g, '-')                    // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')                // Remove leading/trailing hyphens
      .substring(0, 62)                       // Truncate to 62 chars
      .replace(/-+$/, '');                    // Remove trailing hyphens after truncation
  }

  generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  generateConnectivityTestName(): string {
    const sourceId = this.generateSourceIdentifier();
    const destId = this.generateDestinationIdentifier();
    
    if (!sourceId || !destId) {
      return ''; // Don't generate name until both source and destination are specified
    }
    
    const timestamp = this.generateTimestamp();
    const rawName = `${sourceId}--to--${destId}--${timestamp}`;
    
    return this.sanitizeName(rawName);
  }

  updateTestName(): void {
    if (this.userHasEditedName) {
      return; // Don't auto-generate if user has manually edited the name
    }
    
    const generatedName = this.generateConnectivityTestName();
    if (generatedName) {
      this.testForm.patchValue({ displayName: generatedName }, { emitEvent: false });
    }
  }

  onTestNameManualEdit(): void {
    // Check if the current value differs from what would be auto-generated
    setTimeout(() => {
      const currentValue = this.testForm.get('displayName')?.value || '';
      const generatedValue = this.generateConnectivityTestName();
      
      // If user typed something different from auto-generated name, mark as manually edited
      if (currentValue.trim() !== '' && currentValue !== generatedValue) {
        this.userHasEditedName = true;
      } else if (currentValue.trim() === '' || currentValue === generatedValue) {
        // If user cleared the field or made it match generated name, allow auto-generation again
        this.userHasEditedName = false;
        if (currentValue.trim() === '' && generatedValue) {
          // Auto-fill if field is empty and we have a generated name
          this.updateTestName();
        }
      }
    }, 10);
  }

  // Resource loading methods
  private loadSourceResources(endpointType: EndpointType): void {
    // Only load resources for endpoint types that require selection
    if (!this.requiresResourceSelection(endpointType)) {
      this.sourceResourceOptions = [];
      return;
    }

    this.isLoadingSourceResources = true;
    this.sourceResourceError = null;
    this.sourceResourceOptions = [];

    this.resourceLoaderService.loadResources(endpointType).subscribe({
      next: (resources: ResourceOption[]) => {
        this.sourceResourceOptions = resources;
        this.isLoadingSourceResources = false;
        console.log(`Loaded ${resources.length} source resources for ${endpointType}`, resources);
      },
      error: (error) => {
        console.error(`Error loading source resources for ${endpointType}:`, error);
        this.sourceResourceError = `Failed to load ${endpointType} resources`;
        this.isLoadingSourceResources = false;
      }
    });
  }

  private loadDestinationResources(endpointType: EndpointType): void {
    // Only load resources for endpoint types that require selection
    if (!this.requiresResourceSelection(endpointType)) {
      this.destinationResourceOptions = [];
      return;
    }

    this.isLoadingDestinationResources = true;
    this.destinationResourceError = null;
    this.destinationResourceOptions = [];

    this.resourceLoaderService.loadResources(endpointType).subscribe({
      next: (resources: ResourceOption[]) => {
        this.destinationResourceOptions = resources;
        this.isLoadingDestinationResources = false;
        console.log(`Loaded ${resources.length} destination resources for ${endpointType}`, resources);
      },
      error: (error) => {
        console.error(`Error loading destination resources for ${endpointType}:`, error);
        this.destinationResourceError = `Failed to load ${endpointType} resources`;
        this.isLoadingDestinationResources = false;
      }
    });
  }

  private requiresResourceSelection(endpointType: EndpointType): boolean {
    // Endpoint types that require resource selection from APIs
    const resourceTypes: EndpointType[] = [
      'gceInstance',
      'gkeCluster',
      'gkeWorkload',
      'gkePod',
      'gkeService',
      'cloudRun',
      'cloudRunJobs',
      'cloudFunctionV1',
      'cloudRunFunction',
      'cloudSqlInstance',
      'alloyDb',
      'appEngine',
      'cloudBuild',
      'cloudSpanner',
      'cloudBigtable',
      'filestore',
      'redisInstance',
      'redisCluster',
      'loadBalancer',
      'subnetwork',
      'pscEndpoint',
      'appHubService',
      'iapResource'
    ];
    
    return resourceTypes.includes(endpointType);
  }

  onCancel() {
    this.router.navigate(['/connectivity-tests']);
  }

  onCreate() {
    if (this.testForm.valid && !this.isCreating) {
      this.isCreating = true;
      const formValue = this.testForm.value;
      
      // Build source endpoint
      const source: any = {};
      switch (formValue.sourceEndpointType) {
        case 'ipAddress':
          source.ipAddress = formValue.sourceIp;
          if (formValue.sourceProject) {
            source.projectId = formValue.sourceProject;
          }
          break;
        case 'myIpAddress':
          source.ipAddress = this.userIpAddress;
          source.type = 'my-ip-address';
          break;
        case 'cloudShell':
          source.type = 'cloud-shell';
          break;
        case 'cloudConsoleSsh':
          source.type = 'cloud-console-ssh';
          break;
        case 'gceInstance':
          source.instance = formValue.sourceInstance;
          break;
        case 'gkeCluster':
          source.gkeCluster = formValue.sourceCluster;
          break;
        case 'gkeWorkload':
        case 'gkePod':
          source.gkeCluster = formValue.sourceCluster;
          source.workload = formValue.sourceWorkload;
          source.workloadType = formValue.sourceEndpointType;
          break;
        case 'cloudRun':
        case 'cloudFunction':
        case 'appEngine':
        case 'cloudBuild':
          source.service = formValue.sourceService;
          source.serviceType = formValue.sourceEndpointType;
          break;
        case 'alloyDb':
          source.alloyDb = formValue.sourceInstance;
          break;
        case 'cloudSqlInstance':
          source.cloudSqlInstance = formValue.sourceInstance;
          break;
        case 'subnetwork':
          source.subnetwork = formValue.sourceInstance;
          break;
      }

      // Build destination endpoint
      const destination: any = {};
      switch (formValue.destinationEndpointType) {
        case 'ipAddress':
          destination.ipAddress = formValue.destinationIp;
          break;
        case 'domainName':
          destination.domainName = formValue.destinationDomain;
          break;
        case 'googleApis':
          destination.googleApi = formValue.destinationService;
          break;
        case 'gceInstance':
          destination.instance = formValue.destinationInstance;
          break;
        case 'gkeCluster':
          destination.gkeCluster = formValue.destinationCluster;
          break;
        case 'loadBalancer':
          destination.loadBalancer = formValue.destinationInstance;
          break;
        case 'subnetwork':
          destination.subnetwork = formValue.destinationInstance;
          break;
        case 'pscEndpoint':
          destination.pscEndpoint = formValue.destinationInstance;
          break;
        case 'appHubService':
          destination.appHubService = formValue.destinationService;
          break;
        case 'iapResource':
          destination.iapResource = formValue.destinationInstance;
          break;
        case 'gkeWorkload':
        case 'gkePod':
          destination.gkeCluster = formValue.destinationCluster;
          destination.gkeWorkload = formValue.destinationWorkload;
          destination.workloadType = formValue.destinationEndpointType;
          break;
        case 'gkeService':
          destination.gkeCluster = formValue.destinationCluster;
          destination.gkeService = formValue.destinationService;
          break;
        case 'cloudRun':
        case 'cloudRunJobs':
        case 'cloudFunctionV1':
        case 'cloudRunFunction':
        case 'appEngine':
        case 'cloudBuild':
          destination.service = formValue.destinationService;
          destination.serviceType = formValue.destinationEndpointType;
          break;
        case 'alloyDb':
        case 'cloudSqlInstance':
        case 'cloudSpanner':
        case 'cloudBigtable':
        case 'filestore':
        case 'redisInstance':
        case 'redisCluster':
          destination.dataService = formValue.destinationInstance;
          destination.serviceType = formValue.destinationEndpointType;
          break;
      }
      
      // Add port for TCP/UDP
      if ((formValue.protocol === 'tcp' || formValue.protocol === 'udp') && formValue.destinationPort) {
        destination.port = formValue.destinationPort;
      }

      const testData: ConnectivityTestRequest = {
        displayName: formValue.displayName,
        protocol: formValue.protocol,
        source: source,
        destination: destination,
        roundTrip: true,
        labels: {
          'created-by': 'cloud-console-vibe',
          'environment': 'development'
        }
      };

      // Get current project ID
      const project = this.projectService.getCurrentProject();
      if (project) {
        this.connectivityTestsService.createConnectivityTest(project.id, testData).subscribe({
          next: (newTest) => {
            this.snackBar.open('Connectivity test created successfully', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/connectivity-tests']);
          },
          error: (error: any) => {
            this.isCreating = false;
            console.error('Error creating connectivity test:', error);
            
            let errorMessage = 'Error creating connectivity test';
            
            if (error.status === 400) {
              if (error.error?.error?.message) {
                errorMessage = `Invalid request: ${error.error.error.message}`;
              } else {
                errorMessage = 'Invalid request format. Please check your input parameters.';
              }
            } else if (error.status === 403) {
              errorMessage = 'Permission denied. Please check your Network Management API permissions.';
            } else if (error.status === 409) {
              errorMessage = 'A connectivity test with this name already exists.';
            }
            
            this.snackBar.open(errorMessage, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      } else {
        this.isCreating = false;
        this.snackBar.open('No project selected. Please select a project first.', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
} 