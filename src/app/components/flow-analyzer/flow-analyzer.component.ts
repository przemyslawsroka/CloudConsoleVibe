import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { FlowAnalyzerService, FlowLogEntry, FlowMetrics, FilterOptions, MetricType, AggregationPeriod, FlowAnalysisResult, FilterAttribute, OrganizeAttribute } from '../../services/flow-analyzer.service';
import { ProjectService, Project } from '../../services/project.service';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { MatDialog } from '@angular/material/dialog';
import { DataSourceSelectionDialogComponent, DataSourceSelectionDialogData, DataSourceSelectionResult } from './data-source-selection-dialog.component';

Chart.register(...registerables);

@Component({
  selector: 'app-flow-analyzer',
  template: `
    <div class="flow-analyzer-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>
            <mat-icon class="header-icon">analytics</mat-icon>
            Flow Analyzer
          </h1>
          <p class="header-description">
            Visualize and analyze VPC Flow Logs to understand network traffic patterns and performance
          </p>
        </div>
      </div>

      <!-- Query Section -->
      <div class="query-section">
        <!-- Header with Query Title and Traffic Aggregation -->
        <div class="query-header">
          <div class="query-title">
            <mat-icon>tune</mat-icon>
            <span>Query</span>
            <button mat-button color="primary" class="compose-button">
              <mat-icon>edit</mat-icon>
              Compose a Cloud Assist Query
            </button>
            <button mat-stroked-button class="toggle-filters-button" (click)="toggleFilters()">
              <mat-icon>{{ filtersVisible ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}</mat-icon>
              {{ filtersVisible ? 'Hide Filters' : 'Show Filters' }}
            </button>
          </div>
          <div class="query-header-actions">
            <!-- Data Source Selection -->
            <button mat-stroked-button (click)="openDataSourceDialog()" class="source-bucket-button">
              <mat-icon class="warning-icon">warning</mat-icon>
              <span>Source bucket: {{ getDataSourceDisplayName() }}</span>
              <mat-icon>arrow_drop_down</mat-icon>
            </button>
            <!-- Toggle between Basic and SQL Filters -->
            <div class="filter-mode-toggle">
              <mat-button-toggle-group [(value)]="filterMode" (change)="onFilterModeChange()">
                <mat-button-toggle value="basic">Basic filters</mat-button-toggle>
                <mat-button-toggle value="sql">SQL filters</mat-button-toggle>
              </mat-button-toggle-group>
            </div>
            <!-- Traffic Aggregation -->
            <div class="traffic-aggregation">
              <span class="aggregation-label">Traffic aggregation</span>
              <mat-select [(value)]="selectedTrafficAggregation" class="aggregation-select">
                <mat-option value="source-destination">Source → destination (directional)</mat-option>
                <mat-option value="client-server">Client ⇄ server (bidirectional)</mat-option>
              </mat-select>
              <button mat-icon-button matTooltip="Traffic aggregation help">
                <mat-icon>help_outline</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Compact Filter Sections -->
        <div *ngIf="filterMode === 'basic' && filtersVisible" class="compact-filters">
          <form [formGroup]="filtersForm" class="filters-form">
            <!-- Source Section -->
            <div class="filter-section">
              <div class="section-header">
                <span class="section-title">Source</span>
                <span class="section-subtitle">Filter</span>
                <mat-form-field class="multiselect-field" appearance="outline">
                  <mat-label>Add filter</mat-label>
                  <mat-select multiple [(value)]="selectedSourceFilters">
                    <mat-optgroup *ngFor="let category of sourceFilterCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <span class="organize-label">Organize flows by</span>
                <mat-form-field class="multiselect-field organize-field" appearance="outline">
                  <mat-label>Select attributes</mat-label>
                  <mat-select multiple [(value)]="selectedSourceOrganize" (selectionChange)="onOrganizeSettingsChange()">
                    <mat-optgroup *ngFor="let category of sourceOrganizeCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button matTooltip="Organize flows help">
                  <mat-icon>help_outline</mat-icon>
                </button>
                <button mat-icon-button>
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Destination Section -->
            <div class="filter-section">
              <div class="section-header">
                <span class="section-title">Destination</span>
                <span class="section-subtitle">Filter</span>
                <mat-form-field class="multiselect-field" appearance="outline">
                  <mat-label>Add filter</mat-label>
                  <mat-select multiple [(value)]="selectedDestinationFilters">
                    <mat-optgroup *ngFor="let category of destinationFilterCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <span class="organize-label">Organize flows by</span>
                <mat-form-field class="multiselect-field organize-field" appearance="outline">
                  <mat-label>Select attributes</mat-label>
                  <mat-select multiple [(value)]="selectedDestinationOrganize" (selectionChange)="onOrganizeSettingsChange()">
                    <mat-optgroup *ngFor="let category of destinationOrganizeCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button matTooltip="Organize flows help">
                  <mat-icon>help_outline</mat-icon>
                </button>
                <button mat-icon-button>
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Flow Parameters Section -->
            <div class="filter-section">
              <div class="section-header">
                <span class="section-title">Flow Parameters</span>
                <span class="section-subtitle">Filter</span>
                <mat-form-field class="multiselect-field" appearance="outline">
                  <mat-label>Add filter</mat-label>
                  <mat-select multiple [(value)]="selectedFlowParameterFilters">
                    <mat-optgroup *ngFor="let category of flowParameterFilterCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <span class="organize-label">Organize flows by</span>
                <mat-form-field class="multiselect-field organize-field" appearance="outline">
                  <mat-label>Select attributes</mat-label>
                  <mat-select multiple [(value)]="selectedFlowParameterOrganize" (selectionChange)="onOrganizeSettingsChange()">
                    <mat-optgroup *ngFor="let category of flowParameterOrganizeCategories" [label]="category.label">
                      <mat-option *ngFor="let attr of category.attributes" [value]="attr.value" [matTooltip]="attr.description">
                        {{ attr.displayName }}
                      </mat-option>
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button matTooltip="Organize flows help">
                  <mat-icon>help_outline</mat-icon>
                </button>
                <button mat-icon-button>
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </form>

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button mat-stroked-button class="hide-filters-button" (click)="toggleFilters()">
              <mat-icon>{{ filtersVisible ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}</mat-icon>
              {{ filtersVisible ? 'Hide Filters' : 'Show Filters' }}
            </button>
            <button mat-raised-button color="primary" (click)="runQuery()" [disabled]="isLoading" class="run-query-button">
              <mat-icon>refresh</mat-icon>
              {{ isLoading ? 'Running...' : 'Run new query' }}
            </button>
          </div>
        </div>

        <!-- SQL Filters -->
        <div *ngIf="filterMode === 'sql' && filtersVisible" class="sql-filters">
          <div class="sql-section">
            <div class="sql-where-section">
              <div class="sql-where-header">
                <span class="where-label">WHERE</span>
                <span class="where-description">e.g. src_gcp_zone <> dest_gcp_zone</span>
              </div>
              <div class="sql-ready-indicator">
                <mat-icon class="ready-icon">check_circle</mat-icon>
                <span>Ready to run</span>
              </div>
            </div>
            <div class="sql-organize-section">
              <span class="organize-title">Organize flows by</span>
              <mat-select class="sql-organize-select" value="source-ip-vpc">
                <mat-option value="source-ip-vpc">Source IP, Source VPC network project, Source VPC network, and Destination IP</mat-option>
              </mat-select>
              <button mat-icon-button matTooltip="Organize flows help">
                <mat-icon>help_outline</mat-icon>
              </button>
              <button mat-icon-button>
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button mat-stroked-button class="hide-filters-button" (click)="toggleFilters()">
              <mat-icon>{{ filtersVisible ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}</mat-icon>
              {{ filtersVisible ? 'Hide Filters' : 'Show Filters' }}
            </button>
            <button mat-raised-button color="primary" (click)="runQuery()" [disabled]="isLoading" class="run-query-button">
              <mat-icon>play_circle</mat-icon>
              {{ isLoading ? 'Running...' : 'Run new query' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error Section -->
      <div *ngIf="analysisResult?.error" class="error-section">
        <mat-card class="error-card">
          <mat-card-content>
            <div class="error-content">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <div class="error-message">
                <h3>Unable to load VPC Flow Logs</h3>
                <p>{{ analysisResult?.error }}</p>
                
                <div class="error-help">
                  <h4>Troubleshooting Steps:</h4>
                  <ol *ngIf="!isDevelopment">
                    <li><strong>Authentication:</strong> Make sure you're signed in to Google Cloud</li>
                    <li><strong>Project Access:</strong> Verify you have access to project "{{ projectId }}"</li>
                    <li><strong>VPC Flow Logs:</strong> Enable VPC Flow Logs in your VPC networks</li>
                    <li><strong>Permissions:</strong> Ensure you have "Logging Viewer" role</li>
                    <li><strong>Log Analytics:</strong> Upgrade your log bucket to support Log Analytics</li>
                  </ol>
                  
                  <ol *ngIf="isDevelopment">
                    <li><strong>Development Environment:</strong> API calls may fail due to CORS/auth restrictions</li>
                    <li><strong>Authentication:</strong> Sign in to Google Cloud in your browser first</li>
                    <li><strong>Project Setup:</strong> Verify project "{{ projectId }}" exists and you have access</li>
                    <li><strong>VPC Flow Logs:</strong> Enable VPC Flow Logs in your GCP project</li>
                    <li><strong>Proxy Issues:</strong> Check browser network tab for proxy configuration issues</li>
                    <li><strong>Expected Behavior:</strong> Some API failures are normal in local development</li>
                  </ol>
                  
                  <div class="dev-note" *ngIf="isDevelopment">
                    <mat-icon>info</mat-icon>
                    <p><strong>Development Note:</strong> Google Cloud APIs require proper authentication and CORS configuration. In production, ensure your app is properly authenticated with service account credentials.</p>
                  </div>
                  
                  <div class="error-actions">
                    <button mat-raised-button color="primary" (click)="runQuery()">
                      <mat-icon>refresh</mat-icon>
                      Try Again
                    </button>
                    <button mat-stroked-button (click)="openDataSourceDialog()">
                      <mat-icon>settings</mat-icon>
                      Change Data Source
                    </button>
                    <a mat-button href="https://cloud.google.com/vpc/docs/using-flow-logs" target="_blank">
                      <mat-icon>help</mat-icon>
                      VPC Flow Logs Setup Guide
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Results Section -->
      <div *ngIf="analysisResult && !analysisResult.error" class="results-section">
        <!-- Chart Section -->
        <div class="results-layout">
          <mat-card class="chart-section">
            <mat-card-header>
              <div class="chart-header">
                <div class="chart-title">
                  <h3>{{ getChartTitle() }}</h3>
                  <p class="time-range-display">{{ getTimeRangeDisplay() }}</p>
                </div>
                <div class="chart-controls">
                  <!-- Visualization Mode Toggle -->
                  <div class="visualization-mode">
                    <mat-button-toggle-group [(value)]="visualizationMode" (change)="onVisualizationModeChange()">
                      <mat-button-toggle value="chart">
                        <mat-icon>show_chart</mat-icon>
                        Chart
                      </mat-button-toggle>
                      <mat-button-toggle value="sankey">
                        <mat-icon>account_tree</mat-icon>
                        Sankey Diagram
                      </mat-button-toggle>
                    </mat-button-toggle-group>
                  </div>
                </div>
              </div>
            </mat-card-header>
            <mat-card-content>
              <!-- Chart Canvas -->
              <div *ngIf="visualizationMode === 'chart'" class="chart-container">
                <canvas #chartCanvas></canvas>
              </div>
              
              <!-- Sankey Diagram -->
              <div *ngIf="visualizationMode === 'sankey'" class="sankey-container">
                <div #sankeyContainer class="sankey-diagram"></div>
              </div>
            
                          <!-- Query Stats -->
              <div class="query-stats">
              <span class="stat-item">
                <strong>{{ analysisResult.totalRows }}</strong> data flows
              </span>
              <span class="stat-item">
                Query execution time: <strong>{{ analysisResult.queryExecutionTime }}ms</strong>
              </span>
              <button mat-button color="primary" (click)="viewInLogAnalytics()">
                <mat-icon>open_in_new</mat-icon>
                View the query in Log Analytics
              </button>
            </div>
            </mat-card-content>
          </mat-card>

          <!-- Display Options Panel -->
          <mat-card class="display-options-panel">
            <mat-card-header>
              <mat-card-title>Display options</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric-controls">
                <mat-form-field appearance="outline">
                  <mat-label>Metric type (chart and table)</mat-label>
                  <mat-select [(value)]="selectedMetricType" (selectionChange)="onMetricTypeChange()">
                    <mat-option value="bytes">Bytes sent</mat-option>
                    <mat-option value="packets">Packets sent</mat-option>
                    <mat-option value="connections">Connections</mat-option>
                    <mat-option value="latency">Latency (RTT)</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" *ngIf="visualizationMode === 'chart'">
                  <mat-label>Aggregation period (chart)</mat-label>
                  <mat-select [(value)]="selectedAggregationPeriod" (selectionChange)="onAggregationPeriodChange()">
                    <mat-option value="1m">Automatic (1 min)</mat-option>
                    <mat-option value="5m">Automatic (5 min)</mat-option>
                    <mat-option value="15m">Automatic (15 min)</mat-option>
                    <mat-option value="1h">Automatic (1 hour)</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sampling points (chart and table)</mat-label>
                  <mat-select>
                    <mat-option value="source">Source endpoint</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Flow Logs Table -->
        <mat-card class="table-section">
          <mat-card-header>
            <mat-card-title>All data flows ({{ analysisResult.flowLogs.length }})</mat-card-title>
            <div class="table-actions">
              <button mat-button color="primary" (click)="viewInLogAnalytics()">
                <mat-icon>open_in_new</mat-icon>
                View the query in Log Analytics
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="table-container">
              <table mat-table [dataSource]="analysisResult.flowLogs" class="flow-logs-table">

                <!-- Legend Column -->
                <ng-container matColumnDef="legend">
                  <th mat-header-cell *matHeaderCellDef>Legend</th>
                  <td mat-cell *matCellDef="let flow; let i = index">
                    <div [class]="'legend-color legend-' + (i % 8)"></div>
                  </td>
                </ng-container>

                <!-- Source IP Column -->
                <ng-container matColumnDef="sourceIp">
                  <th mat-header-cell *matHeaderCellDef>Source IP</th>
                  <td mat-cell *matCellDef="let flow">
                    <span class="ip-address">{{ flow.sourceIp }}</span>
                  </td>
                </ng-container>

                <!-- Source Instance Column -->
                <ng-container matColumnDef="sourceInstance">
                  <th mat-header-cell *matHeaderCellDef>Source instance</th>
                  <td mat-cell *matCellDef="let flow">
                    <div class="instance-info" *ngIf="flow.sourceInstanceName; else noInstance">
                      <div class="instance-name">{{ flow.sourceInstanceName }}</div>
                      <div class="instance-zone" *ngIf="flow.sourceGcpZone">{{ flow.sourceGcpZone }}</div>
                    </div>
                    <ng-template #noInstance>
                      <span class="no-instance">External</span>
                    </ng-template>
                  </td>
                </ng-container>

                <!-- Source VPC Network Project Column -->
                <ng-container matColumnDef="sourceVpcNetworkProject">
                  <th mat-header-cell *matHeaderCellDef>Source VPC network project</th>
                  <td mat-cell *matCellDef="let flow">
                    <a class="project-link">{{ flow.sourceVpcNetworkProject }}</a>
                  </td>
                </ng-container>

                <!-- Source VPC Network Column -->
                <ng-container matColumnDef="sourceVpcNetwork">
                  <th mat-header-cell *matHeaderCellDef>Source VPC network</th>
                  <td mat-cell *matCellDef="let flow">
                    <a class="network-link">{{ flow.sourceVpcNetwork }}</a>
                  </td>
                </ng-container>

                <!-- Destination IP Column -->
                <ng-container matColumnDef="destinationIp">
                  <th mat-header-cell *matHeaderCellDef>Destination IP</th>
                  <td mat-cell *matCellDef="let flow">
                    <span class="ip-address">{{ flow.destinationIp }}</span>
                  </td>
                </ng-container>

                <!-- Destination Instance Column -->
                <ng-container matColumnDef="destinationInstance">
                  <th mat-header-cell *matHeaderCellDef>Destination instance</th>
                  <td mat-cell *matCellDef="let flow">
                    <div class="instance-info" *ngIf="flow.destinationInstanceName; else noDestInstance">
                      <div class="instance-name">{{ flow.destinationInstanceName }}</div>
                      <div class="instance-zone" *ngIf="flow.destinationGcpZone">{{ flow.destinationGcpZone }}</div>
                    </div>
                    <ng-template #noDestInstance>
                      <span class="no-instance">External</span>
                    </ng-template>
                  </td>
                </ng-container>

                <!-- Traffic Column -->
                <ng-container matColumnDef="traffic">
                  <th mat-header-cell *matHeaderCellDef>{{ getTrafficColumnHeader() }}</th>
                  <td mat-cell *matCellDef="let flow">
                    <span class="traffic-value">{{ formatTrafficValue(flow) }}</span>
                  </td>
                </ng-container>

                <!-- Details Column -->
                <ng-container matColumnDef="details">
                  <th mat-header-cell *matHeaderCellDef>Details</th>
                  <td mat-cell *matCellDef="let flow">
                    <button mat-button color="primary" (click)="showFlowDetails(flow)">
                      Details
                    </button>
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let flow">
                    <button mat-button (click)="runFlowQuery(flow)">
                      <mat-icon>play_arrow</mat-icon>
                      Run
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-card>
          <mat-card-content>
            <div class="loading-content">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Analyzing VPC Flow Logs...</p>
              <p class="loading-detail">This may take a few moments depending on the time range and filters.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .flow-analyzer-container {
      padding: 24px;
      max-width: 100%;
      background-color: var(--background-color);
      min-height: 100vh;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      margin-bottom: 24px;
      background: var(--surface-color);
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 400;
      color: var(--text-color);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      color: var(--primary-color);
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .header-description {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .query-section {
      margin-bottom: 24px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
      border: 1px solid #dadce0;
      padding: 0;
    }

    .query-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e8eaed;
      background: white;
    }

    .query-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .query-title mat-icon {
      color: var(--primary-color);
    }

    .compose-button {
      margin-left: 16px;
      font-size: 14px;
    }

    .query-header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .source-bucket-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid #fdd663;
      background: #fef7e0;
      color: #3c4043;
      font-size: 14px;
      border-radius: 4px;
      min-width: 250px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .source-bucket-button:hover {
      background: #fef0c7;
    }

    .warning-icon {
      color: #f9ab00;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .filter-mode-toggle mat-button-toggle-group {
      border: 1px solid #dadce0;
      border-radius: 4px;
      height: 36px;
      background: white;
    }

    .filter-mode-toggle .mat-button-toggle {
      border: none;
      color: #5f6368;
      font-size: 14px;
      font-weight: 500;
    }

    .filter-mode-toggle .mat-button-toggle-checked {
      background: #e8f0fe;
      color: #1976d2;
    }

    .traffic-aggregation {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .aggregation-label {
      font-size: 14px;
      color: var(--text-color);
      font-weight: 500;
    }

    .aggregation-select {
      min-width: 200px;
      font-size: 14px;
    }

    .compact-filters {
      padding: 0;
    }

    .filter-section {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface-color);
      min-height: 64px;
    }

    .filter-section:last-child {
      border-bottom: none;
    }

    .section-header {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 16px;
      flex-wrap: wrap;
    }

    @media (min-width: 1200px) {
      .section-header {
        flex-wrap: nowrap;
      }
      
      .multiselect-field {
        min-width: 250px;
        max-width: 400px;
      }
      
      .organize-field {
        min-width: 300px;
        max-width: 450px;
      }
    }

    .section-title {
      background: #f8f9fa;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
      font-size: 14px;
      min-width: 140px;
      text-align: center;
      color: #3c4043;
      border: 1px solid #e8eaed;
    }

    .section-subtitle {
      color: #5f6368;
      font-size: 14px;
      font-weight: 500;
      margin-left: 8px;
    }

    .multiselect-field {
      min-width: 200px;
      max-width: 300px;
      flex: 1;
    }

    .organize-field {
      min-width: 250px;
      max-width: 350px;
      flex: 1;
    }

    .multiselect-field .mat-form-field-wrapper {
      padding-bottom: 8px;
    }

    .multiselect-field .mat-form-field-outline {
      color: #dadce0;
    }

    .multiselect-field .mat-form-field-outline-thick {
      color: #1976d2;
    }

    .organize-label {
      color: #5f6368;
      font-size: 14px;
      font-weight: 500;
      margin-left: auto;
      margin-right: 8px;
      white-space: nowrap;
    }

    .add-filter-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-size: 14px;
      color: #1976d2;
      border: none;
      background: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .add-filter-button:hover {
      background-color: #f1f3f4;
    }

    .add-filter-button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .section-header button[mat-icon-button] {
      width: 32px;
      height: 32px;
      margin-left: 8px;
    }

    .section-header button[mat-icon-button] mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #5f6368;
    }

    .section-header button[mat-icon-button]:hover {
      background-color: #f1f3f4;
    }

    .sql-filters {
      padding: 16px 20px;
    }

    .sql-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sql-where-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--hover-color);
      border-radius: 4px;
      border: 1px solid var(--border-color);
    }

    .sql-where-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .where-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-color);
    }

    .where-description {
      color: var(--text-secondary-color);
      font-size: 14px;
      font-style: italic;
    }

    .sql-ready-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4caf50;
      font-size: 14px;
    }

    .ready-icon {
      color: #4caf50;
      font-size: 18px;
    }

    .sql-organize-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .organize-title {
      font-weight: 500;
      font-size: 14px;
      color: var(--text-color);
    }

    .sql-organize-select {
      font-size: 14px;
      min-width: 400px;
    }

    .filter-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #f8f9fa;
      border-top: 1px solid #e8eaed;
    }

    .hide-filters-button {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #1976d2;
      font-size: 14px;
      font-weight: 500;
      border: none;
      background: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .hide-filters-button:hover {
      background-color: #e3f2fd;
    }

    .hide-filters-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .run-query-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 500;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .run-query-button:hover:not(:disabled) {
      background: #1565c0;
    }

    .run-query-button:disabled {
      background: #e0e0e0;
      color: #9e9e9e;
      cursor: not-allowed;
    }

    .run-query-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .toggle-filters-button {
      margin-left: 16px;
      font-size: 14px;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .results-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .chart-section {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
      flex: 1;
      min-width: 0;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .chart-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
    }

    .time-range-display {
      margin: 4px 0 0 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .visualization-mode {
      margin-right: 24px;
      margin-bottom: 16px;
    }

    .visualization-mode mat-button-toggle-group {
      border: 1px solid #dadce0;
      border-radius: 4px;
      background: white;
    }

    .visualization-mode .mat-button-toggle {
      border: none;
      color: #5f6368;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 16px;
    }

    .visualization-mode .mat-button-toggle-checked {
      background: #e8f0fe;
      color: #1976d2;
    }

    .visualization-mode .mat-button-toggle mat-icon {
      margin-right: 8px;
      font-size: 18px;
    }

    .display-options-panel {
      flex: 0 0 320px;
      position: sticky;
      top: 24px;
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .display-options-panel mat-card-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .metric-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metric-controls mat-form-field {
      width: 100%;
    }

    @media (max-width: 1199px) {
      .results-layout {
        flex-direction: column;
      }
      
      .display-options-panel {
        flex: 1;
        position: static;
        order: -1;
      }
    }

    .chart-container {
      height: 400px;
      margin: 24px 0;
      position: relative;
    }

    .sankey-container {
      width: 100%;
      min-height: 600px;
      margin: 24px 0;
    }

    .sankey-diagram {
      width: 100%;
      height: 100%;
    }

    .query-stats {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px 0;
      border-top: 1px solid var(--border-color);
      flex-wrap: wrap;
    }

    .stat-item {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .table-section {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .table-actions {
      display: flex;
      gap: 12px;
    }

    .table-container {
      overflow: auto;
      max-height: 600px;
    }

    .flow-logs-table {
      width: 100%;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 2px;
      display: inline-block;
    }

    .legend-0 { background-color: #1f77b4; }
    .legend-1 { background-color: #ff7f0e; }
    .legend-2 { background-color: #2ca02c; }
    .legend-3 { background-color: #d62728; }
    .legend-4 { background-color: #9467bd; }
    .legend-5 { background-color: #8c564b; }
    .legend-6 { background-color: #e377c2; }
    .legend-7 { background-color: #7f7f7f; }

    .ip-address {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      color: var(--text-color);
    }

    .project-link, .network-link {
      color: var(--primary-color);
      text-decoration: none;
      cursor: pointer;
    }

    .project-link:hover, .network-link:hover {
      text-decoration: underline;
    }

    .traffic-value {
      font-weight: 500;
      color: var(--text-color);
    }

    .loading-container {
      display: flex;
      justify-content: center;
      margin-top: 48px;
    }

    .loading-content {
      text-align: center;
      padding: 48px;
    }

    .loading-content p {
      margin: 16px 0 4px 0;
      color: var(--text-color);
      font-size: 16px;
    }

    .loading-detail {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    @media (max-width: 1024px) {
      .chart-header {
        flex-direction: column;
        gap: 24px;
      }

      .display-options {
        border-left: none;
        border-top: 1px solid var(--border-color);
        padding-left: 0;
        padding-top: 24px;
        min-width: unset;
        width: 100%;
      }

      .filter-fields {
        grid-template-columns: 1fr;
      }

      .time-range-fields {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .flow-analyzer-container {
        padding: 16px;
      }

      .query-stats {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }

    .no-instance {
      color: var(--text-secondary-color);
      font-style: italic;
      font-size: 13px;
    }

    .instance-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .instance-name {
      font-weight: 500;
      color: var(--text-color);
      font-size: 13px;
    }

    .instance-zone {
      font-size: 11px;
      color: var(--text-secondary-color);
      font-family: 'Roboto Mono', monospace;
    }

    .error-section {
      margin-top: 24px;
    }

    .error-card {
      background: var(--surface-color);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    .error-content {
      display: flex;
      align-items: center;
      padding: 24px;
    }

    .error-icon {
      margin-right: 16px;
      color: #d32f2f;
      font-size: 24px;
    }

    .error-message {
      flex: 1;
    }

    .error-message h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
    }

    .error-message p {
      margin: 0;
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .error-help {
      margin-top: 16px;
    }

    .error-help h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color);
    }

    .error-help ol {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }

    .error-help li {
      margin-bottom: 8px;
      color: var(--text-color);
    }

    .error-actions {
      display: flex;
      gap: 12px;
    }

    .dev-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 16px 0;
      padding: 12px;
      background: rgba(33, 150, 243, 0.12);
      border: 1px solid #2196f3;
      border-radius: 4px;
      color: #1565c0;
    }

    .dev-note mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .dev-note p {
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .header {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .query-section,
      .chart-section,
      .table-section,
      .error-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .loading-container mat-card {
        background-color: var(--surface-color);
        color: var(--text-color);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-card {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-card-header {
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

      .mat-mdc-form-field {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-form-field .mat-mdc-text-field-wrapper {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-form-field .mat-mdc-floating-label {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
        color: var(--primary-color) !important;
      }

      .mat-mdc-form-field .mat-mdc-outline {
        color: var(--border-color) !important;
      }

      .mat-mdc-form-field.mat-focused .mat-mdc-outline {
        color: var(--primary-color) !important;
      }

      .mat-mdc-input-element {
        color: var(--text-color) !important;
        caret-color: var(--primary-color) !important;
      }

      .mat-mdc-input-element::placeholder {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-select {
        color: var(--text-color) !important;
      }

      .mat-mdc-select-arrow {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-option {
        color: var(--text-color) !important;
      }

      .mat-mdc-option:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-option.mdc-list-item--selected {
        background-color: rgba(var(--primary-rgb), 0.12) !important;
      }

      .mat-mdc-button-toggle-group {
        background-color: var(--surface-color) !important;
        border-color: var(--border-color) !important;
      }

      .mat-mdc-button-toggle {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
      }

      .mat-mdc-button-toggle.mat-mdc-button-toggle-checked {
        background-color: var(--primary-color) !important;
        color: white !important;
      }

      .mat-mdc-table {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-header-row {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-header-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-cell {
        color: var(--text-color) !important;
        border-bottom-color: var(--border-color) !important;
      }

      .mat-mdc-row:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-progress-spinner circle {
        stroke: var(--primary-color) !important;
      }

      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button {
        border-color: var(--border-color) !important;
        color: var(--text-color) !important;
      }

      .mat-mdc-stroked-button:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-mdc-dialog-container {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
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

    ::ng-deep .mat-mdc-form-field {
      background-color: var(--surface-color);
    }

    ::ng-deep .mat-mdc-input-element {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-select {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-button-toggle {
      background-color: var(--surface-color);
      color: var(--text-color);
      border-color: var(--border-color);
    }

    ::ng-deep .mat-mdc-table {
      background-color: var(--surface-color);
      color: var(--text-color);
    }
  `]
})
export class FlowAnalyzerComponent implements OnInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sankeyContainer', { static: false }) sankeyContainer!: ElementRef<HTMLDivElement>;

  // Form controls
  filtersForm: FormGroup;
  filterMode: 'basic' | 'sql' = 'basic';
  customSqlQueryControl = new FormControl('');

  // Data and State
  analysisResult: FlowAnalysisResult | null = null;
  processedFlowData: ProcessedFlowData | null = null;
  isLoading = false;
  projectId: string | null = null;
  selectedTrafficAggregation = 'source-destination';

  // Chart
  chart: Chart | null = null;

  // Display Configuration
  selectedMetricType: MetricType = 'bytes';
  selectedAggregationPeriod: AggregationPeriod = '5m';
  visualizationMode: 'chart' | 'sankey' = 'chart';

  // Data Source Configuration
  selectedLogBucket = '_Default';
  selectedLogView = '_AllLogs';
  selectedLocation = 'global';
  enableVpcFlowLogsFilter = true;
  filtersVisible = true;

  // Available Options
  availableProjects: string[] = [];
  availableNetworks: string[] = [];
  availableProtocols: string[] = [];
  
  // Filter and Organize attributes
    sourceFilterAttributes: FilterAttribute[] = [];
  destinationFilterAttributes: FilterAttribute[] = [];
  flowParameterAttributes: FilterAttribute[] = [];

  sourceOrganizeAttributes: OrganizeAttribute[] = [];
  destinationOrganizeAttributes: OrganizeAttribute[] = [];
  flowParameterOrganizeAttributes: OrganizeAttribute[] = [];

  // Pre-calculated categories to avoid infinite loops
  sourceFilterCategories: { label: string; attributes: FilterAttribute[] }[] = [];
  destinationFilterCategories: { label: string; attributes: FilterAttribute[] }[] = [];
  flowParameterFilterCategories: { label: string; attributes: FilterAttribute[] }[] = [];

  sourceOrganizeCategories: { label: string; attributes: OrganizeAttribute[] }[] = [];
  destinationOrganizeCategories: { label: string; attributes: OrganizeAttribute[] }[] = [];
  flowParameterOrganizeCategories: { label: string; attributes: OrganizeAttribute[] }[] = [];

  // Selected filters and organize options
  selectedSourceFilters: string[] = [];
  selectedDestinationFilters: string[] = [];
  selectedFlowParameterFilters: string[] = [];

  selectedSourceOrganize: string[] = [];
  selectedDestinationOrganize: string[] = [];
  selectedFlowParameterOrganize: string[] = [];

  // Environment
  isDevelopment = window.location.hostname === 'localhost';

  // Table Configuration
  displayedColumns: string[] = [
    'legend', 'sourceIp', 'sourceInstance', 'sourceVpcNetworkProject', 'sourceVpcNetwork', 
    'destinationIp', 'destinationInstance', 'traffic', 'details', 'actions'
  ];

  constructor(
    private fb: FormBuilder,
    private flowAnalyzerService: FlowAnalyzerService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    this.filtersForm = this.createFiltersForm();
  }

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      this.loadAvailableOptions();
    });

    this.initializeDefaultTimeRange();
    this.loadAvailableOptions();
    this.initializeFilterAttributes();
  }

  private createFiltersForm(): FormGroup {
    return this.fb.group({
      sourceIp: [''],
      destinationIp: [''],
      vpcNetworkProject: [''],
      vpcNetwork: [''],
      protocol: [''],
      port: [''],
      startTime: [''],
      endTime: ['']
    });
  }

  private initializeDefaultTimeRange() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    this.filtersForm.patchValue({
      startTime: this.formatDateTimeLocal(oneHourAgo),
      endTime: this.formatDateTimeLocal(now)
    });
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private loadAvailableOptions() {
    if (!this.projectId) return;

    // Load available VPC networks
    this.flowAnalyzerService.getAvailableVpcNetworks(this.projectId).subscribe(networks => {
      this.availableNetworks = networks;
    });

    // Load available protocols
    this.availableProtocols = this.flowAnalyzerService.getCommonProtocols();

    // Mock available projects (in real implementation, this would come from the API)
    this.availableProjects = ['przemekroka-joomla-service', 'other-project-1', 'other-project-2'];
  }

  private initializeFilterAttributes() {
    // Initialize source filter attributes
    this.sourceFilterAttributes = [
      // Basic Network
      { value: 'src_ip', displayName: 'Source IP', description: 'Source IP address', category: 'basic' },
      { value: 'src_port', displayName: 'Source Port', description: 'Source port that can be used to identify known services', category: 'basic' },
      
      // VPC Network
      { value: 'src_vpc_name', displayName: 'Source VPC Network', description: 'VPC network details', category: 'network' },
      { value: 'src_vpc_project_id', displayName: 'Source VPC Project', description: 'VPC project details', category: 'network' },
      { value: 'src_subnetwork_name', displayName: 'Source Subnetwork', description: 'VPC subnetwork details', category: 'network' },
      
      // Compute Instance
      { value: 'src_instance_name', displayName: 'Source Instance', description: 'Instance name of the source VM', category: 'instance' },
      { value: 'src_instance_project_id', displayName: 'Source Instance Project', description: 'ID of the project containing the source VM', category: 'instance' },
      { value: 'src_instance_mig_name', displayName: 'Source MIG Name', description: 'The managed instance group name that the source VM belongs to', category: 'instance' },
      { value: 'src_instance_mig_region', displayName: 'Source MIG Region', description: 'The managed instance group region that the source VM belongs to', category: 'instance' },
      { value: 'src_instance_mig_zone', displayName: 'Source MIG Zone', description: 'The managed instance group zone that the source VM belongs to', category: 'instance' },
      
      // Geographic
      { value: 'src_gcp_zone', displayName: 'Source Zone', description: 'Zone of the source VM', category: 'geographic' },
      { value: 'src_gcp_region', displayName: 'Source Region', description: 'Region of the source VM', category: 'geographic' },
      { value: 'src_city', displayName: 'Source City', description: 'If the source was external to the VPC, populated with source city', category: 'geographic' },
      { value: 'src_continent', displayName: 'Source Continent', description: 'If the source was external to the VPC, populated with source continent', category: 'geographic' },
      { value: 'src_country', displayName: 'Source Country', description: 'If the source was external to the VPC, populated with source country', category: 'geographic' },
      { value: 'src_geo_region', displayName: 'Source Geo Region', description: 'If the source was external to the VPC, populated with source region', category: 'geographic' },
      
      // ASN
      { value: 'src_asn', displayName: 'Source ASN', description: 'If the source was external to the VPC, populated with source ASN', category: 'asn' },
      
      // Gateway
      { value: 'src_gateway_name', displayName: 'Source Gateway Name', description: 'If the source is on-prem via gateway, populated with gateway resource name', category: 'gateway' },
      { value: 'src_gateway_type', displayName: 'Source Gateway Type', description: 'Type of gateway (IC_ATTACHMENT, VPN_TUNNEL, SD_WAN)', category: 'gateway' },
      { value: 'src_gateway_project_id', displayName: 'Source Gateway Project', description: 'ID of the project containing the gateway', category: 'gateway' },
      { value: 'src_gateway_location', displayName: 'Source Gateway Location', description: 'Location of the gateway', category: 'gateway' },
      { value: 'src_gateway_interconnect_name', displayName: 'Source Gateway Interconnect Name', description: 'Interconnect name of the gateway', category: 'gateway' },
      { value: 'src_gateway_interconnect_project_number', displayName: 'Source Gateway Interconnect Project', description: 'Interconnect project number of the gateway', category: 'gateway' },
      { value: 'src_gateway_vpc_name', displayName: 'Source Gateway VPC Name', description: 'Name of the VPC network containing the gateway', category: 'gateway' },
      { value: 'src_gateway_vpc_project_id', displayName: 'Source Gateway VPC Project', description: 'VPC project ID of the network containing the gateway', category: 'gateway' },
      
      // GKE
      { value: 'src_gke_cluster_name', displayName: 'Source GKE Cluster Name', description: 'GKE cluster name', category: 'gke' },
      { value: 'src_gke_cluster_location', displayName: 'Source GKE Cluster Location', description: 'Location of the GKE cluster', category: 'gke' },
      { value: 'src_gke_pod_name', displayName: 'Source GKE Pod Name', description: 'Name of the Pod', category: 'gke' },
      { value: 'src_gke_pod_namespace', displayName: 'Source GKE Pod Namespace', description: 'Namespace of the Pod', category: 'gke' },
      { value: 'src_gke_service_name', displayName: 'Source GKE Service Name', description: 'Name of the Service', category: 'gke' },
      { value: 'src_gke_service_namespace', displayName: 'Source GKE Service Namespace', description: 'Name of the Service Namespace', category: 'gke' },
      { value: 'src_gke_workload_name', displayName: 'Source GKE Workload Name', description: 'Name of the workload', category: 'gke' },
      { value: 'src_gke_workload_type', displayName: 'Source GKE Workload Type', description: 'Type of the workload', category: 'gke' },
      
      // Google Services
      { value: 'src_google_service_type', displayName: 'Source Google Service Type', description: 'If source was a Google API, type of the service', category: 'google' }
    ];

    // Initialize destination filter attributes  
    this.destinationFilterAttributes = [
      // Basic Network
      { value: 'dest_ip', displayName: 'Destination IP', description: 'Destination IP address', category: 'basic' },
      { value: 'dest_port', displayName: 'Destination Port', description: 'Destination port that can be used to identify known services', category: 'basic' },
      
      // VPC Network
      { value: 'dest_vpc_name', displayName: 'Destination VPC Network', description: 'VPC network details', category: 'network' },
      { value: 'dest_vpc_project_id', displayName: 'Destination VPC Project', description: 'VPC project details', category: 'network' },
      { value: 'dest_subnetwork_name', displayName: 'Destination Subnetwork', description: 'VPC subnetwork details', category: 'network' },
      
      // Compute Instance
      { value: 'dest_instance_name', displayName: 'Destination Instance', description: 'Instance name of the destination VM', category: 'instance' },
      { value: 'dest_instance_project_id', displayName: 'Destination Instance Project', description: 'ID of the project containing the destination VM', category: 'instance' },
      { value: 'dest_instance_mig_name', displayName: 'Destination MIG Name', description: 'The managed instance group name that the destination VM belongs to', category: 'instance' },
      { value: 'dest_instance_mig_region', displayName: 'Destination MIG Region', description: 'The managed instance group region that the destination VM belongs to', category: 'instance' },
      { value: 'dest_instance_mig_zone', displayName: 'Destination MIG Zone', description: 'The managed instance group zone that the destination VM belongs to', category: 'instance' },
      
      // Geographic
      { value: 'dest_gcp_zone', displayName: 'Destination Zone', description: 'Zone of the destination VM', category: 'geographic' },
      { value: 'dest_gcp_region', displayName: 'Destination Region', description: 'Region of the destination VM', category: 'geographic' },
      { value: 'dest_city', displayName: 'Destination City', description: 'If the destination was external to the VPC, populated with destination city', category: 'geographic' },
      { value: 'dest_continent', displayName: 'Destination Continent', description: 'If the destination was external to the VPC, populated with destination continent', category: 'geographic' },
      { value: 'dest_country', displayName: 'Destination Country', description: 'If the destination was external to the VPC, populated with destination country', category: 'geographic' },
      { value: 'dest_geo_region', displayName: 'Destination Geo Region', description: 'If the destination was external to the VPC, populated with destination region', category: 'geographic' },
      
      // ASN
      { value: 'dest_asn', displayName: 'Destination ASN', description: 'If the destination was external to the VPC, populated with destination ASN', category: 'asn' },
      
      // Gateway
      { value: 'dest_gateway_name', displayName: 'Destination Gateway Name', description: 'If the destination is on-prem via gateway, populated with gateway resource name', category: 'gateway' },
      { value: 'dest_gateway_type', displayName: 'Destination Gateway Type', description: 'Type of gateway (IC_ATTACHMENT, VPN_TUNNEL, SD_WAN)', category: 'gateway' },
      { value: 'dest_gateway_project_id', displayName: 'Destination Gateway Project', description: 'ID of the project containing the gateway', category: 'gateway' },
      { value: 'dest_gateway_location', displayName: 'Destination Gateway Location', description: 'Location of the gateway', category: 'gateway' },
      { value: 'dest_gateway_interconnect_name', displayName: 'Destination Gateway Interconnect Name', description: 'Interconnect name of the gateway', category: 'gateway' },
      { value: 'dest_gateway_interconnect_project_number', displayName: 'Destination Gateway Interconnect Project', description: 'Interconnect project number of the gateway', category: 'gateway' },
      { value: 'dest_gateway_vpc_name', displayName: 'Destination Gateway VPC Name', description: 'Name of the VPC network containing the gateway', category: 'gateway' },
      { value: 'dest_gateway_vpc_project_id', displayName: 'Destination Gateway VPC Project', description: 'VPC project ID of the network containing the gateway', category: 'gateway' },
      
      // GKE
      { value: 'dest_gke_cluster_name', displayName: 'Destination GKE Cluster Name', description: 'GKE cluster name', category: 'gke' },
      { value: 'dest_gke_cluster_location', displayName: 'Destination GKE Cluster Location', description: 'Location of the GKE cluster', category: 'gke' },
      { value: 'dest_gke_pod_name', displayName: 'Destination GKE Pod Name', description: 'Name of the Pod', category: 'gke' },
      { value: 'dest_gke_pod_namespace', displayName: 'Destination GKE Pod Namespace', description: 'Namespace of the Pod', category: 'gke' },
      { value: 'dest_gke_service_name', displayName: 'Destination GKE Service Name', description: 'Name of the Service', category: 'gke' },
      { value: 'dest_gke_service_namespace', displayName: 'Destination GKE Service Namespace', description: 'Name of the Service Namespace', category: 'gke' },
      { value: 'dest_gke_workload_name', displayName: 'Destination GKE Workload Name', description: 'Name of the workload', category: 'gke' },
      { value: 'dest_gke_workload_type', displayName: 'Destination GKE Workload Type', description: 'Type of the workload', category: 'gke' },
      
      // Google Services
      { value: 'dest_google_service_type', displayName: 'Destination Google Service Type', description: 'If destination was a Google API, type of the service', category: 'google' }
    ];

    // Initialize flow parameter filter attributes
    this.flowParameterAttributes = [
      // Basic Flow
      { value: 'protocol', displayName: 'Protocol', description: 'The IANA protocol number according to RFC791', category: 'basic' },
      { value: 'bytes_sent', displayName: 'Bytes Sent', description: 'Amount of bytes sent from the source to the destination', category: 'basic' },
      { value: 'packets_sent', displayName: 'Packets Sent', description: 'Number of packets sent from the source to the destination', category: 'basic' },
      { value: 'reporter', displayName: 'Reporter', description: 'The side which reported the flow. Can be either SRC or DEST', category: 'basic' },
      { value: 'start_time', displayName: 'Start Time', description: 'Timestamp of the first observed packet during the aggregated time interval', category: 'timing' },
      { value: 'end_time', displayName: 'End Time', description: 'Timestamp of the last observed packet during the aggregated time interval', category: 'timing' },
      { value: 'dscp', displayName: 'DSCP', description: 'Differentiated Services Code Points (DSCP) value', category: 'qos' },
      
      // AS Paths
      { value: 'as_paths', displayName: 'AS Paths', description: 'List of egress AS paths', category: 'asn' },
      
      // Load Balancer
      { value: 'lb_forwarding_rule_name', displayName: 'LB Forwarding Rule Name', description: 'Name of the forwarding rule', category: 'load_balancer' },
      { value: 'lb_forwarding_rule_project_id', displayName: 'LB Forwarding Rule Project', description: 'Project id of the forwarding rule', category: 'load_balancer' },
      { value: 'lb_reporter', displayName: 'LB Reporter', description: 'Reporter of the flow. Can be either CLIENT or BACKEND', category: 'load_balancer' },
      { value: 'lb_scheme', displayName: 'LB Scheme', description: 'Load Balancer scheme type', category: 'load_balancer' },
      { value: 'lb_type', displayName: 'LB Type', description: 'Load balancer type', category: 'load_balancer' },
      { value: 'lb_url_map_name', displayName: 'LB URL Map Name', description: 'Name of the URL map', category: 'load_balancer' },
      { value: 'lb_vpc_name', displayName: 'LB VPC Name', description: 'Name of the LB VPC network', category: 'load_balancer' },
      { value: 'lb_vpc_project_id', displayName: 'LB VPC Project', description: 'Name of the LB VPC network project ID', category: 'load_balancer' },
      { value: 'lb_vpc_subnetwork_name', displayName: 'LB VPC Subnetwork Name', description: 'Name of the LB VPC subnetwork', category: 'load_balancer' },
      { value: 'lb_vpc_subnetwork_region', displayName: 'LB VPC Subnetwork Region', description: 'Name of the LB VPC subnetwork region', category: 'load_balancer' },
      { value: 'lb_backend_group_location', displayName: 'LB Backend Group Location', description: 'Name of the backend group location', category: 'load_balancer' },
      { value: 'lb_backend_group_name', displayName: 'LB Backend Group Name', description: 'Name of the backend group name', category: 'load_balancer' },
      { value: 'lb_backend_group_type', displayName: 'LB Backend Group Type', description: 'Name of the backend group type', category: 'load_balancer' },
      { value: 'lb_backend_service_name', displayName: 'LB Backend Service Name', description: 'Name of the backend service', category: 'load_balancer' },
      
      // Private Service Connect
      { value: 'psc_attachment_project_id', displayName: 'PSC Attachment Project', description: 'PSC attachment project id', category: 'psc' },
      { value: 'psc_attachment_region', displayName: 'PSC Attachment Region', description: 'PSC attachment region', category: 'psc' },
      { value: 'psc_attachment_vpc_name', displayName: 'PSC Attachment VPC Name', description: 'PSC attachment VPC network name', category: 'psc' },
      { value: 'psc_attachment_vpc_subnetwork_name', displayName: 'PSC Attachment VPC Subnetwork', description: 'PSC attachment VPC subnetwork name', category: 'psc' },
      { value: 'psc_endpoint_connection_id', displayName: 'PSC Endpoint Connection ID', description: 'PSC endpoint connection id', category: 'psc' },
      { value: 'psc_endpoint_project_id', displayName: 'PSC Endpoint Project', description: 'PSC endpoint project id', category: 'psc' },
      { value: 'psc_endpoint_region', displayName: 'PSC Endpoint Region', description: 'PSC endpoint region', category: 'psc' },
      { value: 'psc_endpoint_target_service_type', displayName: 'PSC Endpoint Target Service Type', description: 'PSC endpoint target service type', category: 'psc' },
      { value: 'psc_endpoint_vpc_name', displayName: 'PSC Endpoint VPC Name', description: 'PSC endpoint VPC network name', category: 'psc' },
      { value: 'psc_endpoint_vpc_subnetwork_name', displayName: 'PSC Endpoint VPC Subnetwork', description: 'PSC endpoint VPC subnetwork name', category: 'psc' },
      { value: 'psc_reporter', displayName: 'PSC Reporter', description: 'Reporter of the flow. Can be either CONSUMER or PRODUCER', category: 'psc' }
    ];

    // Initialize organize attributes (same as filter attributes)
    this.sourceOrganizeAttributes = [...this.sourceFilterAttributes];
    this.destinationOrganizeAttributes = [...this.destinationFilterAttributes];
    this.flowParameterOrganizeAttributes = [...this.flowParameterAttributes];

    // Set default organize selections
    this.selectedSourceOrganize = ['src_vpc_project_id', 'src_vpc_name', 'src_ip'];
    this.selectedDestinationOrganize = ['dest_ip'];
    this.selectedFlowParameterOrganize = [];

    // Pre-calculate categories to avoid infinite loops in template
    this.sourceFilterCategories = this.getFilterCategories(this.sourceFilterAttributes);
    this.destinationFilterCategories = this.getFilterCategories(this.destinationFilterAttributes);
    this.flowParameterFilterCategories = this.getFilterCategories(this.flowParameterAttributes);

    this.sourceOrganizeCategories = this.getOrganizeCategories(this.sourceOrganizeAttributes);
    this.destinationOrganizeCategories = this.getOrganizeCategories(this.destinationOrganizeAttributes);
    this.flowParameterOrganizeCategories = this.getOrganizeCategories(this.flowParameterOrganizeAttributes);
  }

  onFilterModeChange() {
    if (this.filterMode === 'sql') {
      this.customSqlQueryControl.setValue(this.generateSqlFromFilters());
    }
  }

  private generateSqlFromFilters(): string {
    const customQuery = this.customSqlQueryControl.value || '';
    if (this.filterMode === 'sql' && customQuery.trim()) {
      return customQuery;
    }

    const formValue = this.filtersForm.value;
    const conditions: string[] = [];

    if (formValue.sourceIp) {
      conditions.push(`src_ip = "${formValue.sourceIp}"`);
    }
    if (formValue.destinationIp) {
      conditions.push(`dest_ip = "${formValue.destinationIp}"`);
    }
    if (formValue.vpcNetworkProject) {
      conditions.push(`src_vpc_project_id = "${formValue.vpcNetworkProject}"`);
    }
    if (formValue.vpcNetwork) {
      conditions.push(`src_vpc_name = "${formValue.vpcNetwork}"`);
    }
    if (formValue.protocol) {
      conditions.push(`protocol = "${formValue.protocol}"`);
    }
    if (formValue.port) {
      conditions.push(`(src_port = "${formValue.port}" OR dest_port = "${formValue.port}")`);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : 'src_ip IS NOT NULL';
  }

  setQuickTimeRange(range: string) {
    const now = new Date();
    let startTime: Date;

    switch (range) {
      case '1h':
        startTime = new Date(now.getTime() - (60 * 60 * 1000));
        break;
      case '6h':
        startTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        break;
      case '1d':
        startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      default:
        startTime = new Date(now.getTime() - (60 * 60 * 1000));
    }

    this.filtersForm.patchValue({
      startTime: this.formatDateTimeLocal(startTime),
      endTime: this.formatDateTimeLocal(now)
    });
  }

  runQuery() {
    if (!this.projectId) {
      console.error('No project ID available');
      return;
    }

    this.isLoading = true;
    this.analysisResult = null; // Clear previous results
    this.processedFlowData = null; // Clear processed data

    // Clear demo cache to generate fresh data
    this.flowAnalyzerService.clearDemoCache();

    const filters = this.buildFilterOptions();
    const customQuery = this.filterMode === 'sql' ? this.generateSqlFromFilters() : undefined;

    this.flowAnalyzerService.queryFlowLogs(
      this.projectId,
      filters,
      this.selectedMetricType,
      this.selectedAggregationPeriod,
      customQuery,
      this.selectedLogBucket,
      this.selectedLocation,
      this.selectedLogView
    ).subscribe({
      next: (result) => {
        this.analysisResult = result;
        this.isLoading = false;
        
        // Process data according to "Organize flows by" settings
        if (result.flowLogs.length > 0 && !result.error) {
          this.processedFlowData = this.processFlowData(result);
        }
        
        this.cdr.detectChanges();
        
        // Only create visualization if we have data and no errors
        if (result.timeSeriesData.length > 0 && !result.error) {
          setTimeout(() => {
            if (this.visualizationMode === 'chart') {
              this.createChart();
            } else {
              this.createSankeyDiagram();
            }
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error running query:', error);
        this.isLoading = false;
        // Create an error result
        this.analysisResult = {
          timeSeriesData: [],
          flowLogs: [],
          totalRows: 0,
          queryExecutionTime: 0,
          error: `Query failed: ${error.message || 'Unknown error'}`
        };
        this.cdr.detectChanges();
      }
    });
  }

  private buildFilterOptions(): FilterOptions {
    const formValue = this.filtersForm.value;
    
    return {
      sourceIp: formValue.sourceIp || undefined,
      destinationIp: formValue.destinationIp || undefined,
      vpcNetworkProject: formValue.vpcNetworkProject || undefined,
      vpcNetwork: formValue.vpcNetwork || undefined,
      protocol: formValue.protocol || undefined,
      port: formValue.port || undefined,
      timeRange: {
        start: new Date(formValue.startTime),
        end: new Date(formValue.endTime)
      }
    };
  }

  clearFilters() {
    this.filtersForm.reset();
    this.customSqlQueryControl.setValue('');
    this.runQuery();
  }

  onMetricTypeChange() {
    if (this.analysisResult) {
      // Reprocess data with new metric type
      this.reprocessData();
    }
  }

  onAggregationPeriodChange() {
    if (this.analysisResult) {
      // Reprocess data with new aggregation period
      this.reprocessData();
    }
  }

  onOrganizeSettingsChange() {
    if (this.analysisResult) {
      // Reprocess data when organize settings change
      this.reprocessData();
    }
  }

  private reprocessData() {
    if (this.analysisResult && this.analysisResult.flowLogs.length > 0 && !this.analysisResult.error) {
      this.processedFlowData = this.processFlowData(this.analysisResult);
      
      // Recreate visualizations
      setTimeout(() => {
        if (this.visualizationMode === 'chart') {
          this.createChart();
        } else {
          this.createSankeyDiagram();
        }
      }, 100);
    }
  }

  onVisualizationModeChange() {
    if (this.analysisResult && this.analysisResult.timeSeriesData.length > 0 && !this.analysisResult.error) {
      setTimeout(() => {
        if (this.visualizationMode === 'chart') {
          this.createChart();
        } else {
          this.createSankeyDiagram();
        }
      }, 100);
    }
  }

  toggleFilters() {
    this.filtersVisible = !this.filtersVisible;
  }

  private processFlowData(result: FlowAnalysisResult): ProcessedFlowData {
    const organizeSettings: OrganizeSettings = {
      source: this.selectedSourceOrganize,
      destination: this.selectedDestinationOrganize,
      flowParameters: this.selectedFlowParameterOrganize
    };

    // Group flows by the organize settings
    const flowGroups = this.groupFlowsByOrganizeSettings(result.flowLogs, organizeSettings);
    
    // Aggregate flows and get top 10
    const aggregatedFlows = this.aggregateFlowGroups(flowGroups);
    const topFlows = aggregatedFlows
      .sort((a, b) => {
        switch (this.selectedMetricType) {
          case 'bytes': return b.totalBytes - a.totalBytes;
          case 'packets': return b.totalPackets - a.totalPackets;
          case 'connections': return b.totalConnections - a.totalConnections;
          case 'latency': return b.avgLatency - a.avgLatency;
          default: return b.totalBytes - a.totalBytes;
        }
      })
      .slice(0, 10);

    // Generate time series data from top flows
    const timeSeriesData = this.generateTimeSeriesFromTopFlows(topFlows, result.timeSeriesData);

    return {
      topFlows,
      timeSeriesData,
      organizedBy: organizeSettings
    };
  }

  private groupFlowsByOrganizeSettings(flowLogs: FlowLogEntry[], organizeSettings: OrganizeSettings): Map<string, FlowLogEntry[]> {
    const groups = new Map<string, FlowLogEntry[]>();

    flowLogs.forEach(flow => {
      const sourceLabel = this.buildOrganizedLabel(flow, 'source', organizeSettings.source);
      const destinationLabel = this.buildOrganizedLabel(flow, 'destination', organizeSettings.destination);
      const key = `${sourceLabel} → ${destinationLabel}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(flow);
    });

    return groups;
  }

  private buildOrganizedLabel(flow: FlowLogEntry, type: 'source' | 'destination', organizeBy: string[]): string {
    if (organizeBy.length === 0) {
      // Default to IP if no organize settings
      return type === 'source' ? flow.sourceIp : flow.destinationIp;
    }

    const parts: string[] = [];
    
    organizeBy.forEach(attribute => {
      let value = '';
      
      if (type === 'source') {
        switch (attribute) {
          case 'source_ip': value = flow.sourceIp; break;
          case 'source_vpc_network': value = flow.sourceVpcNetwork || ''; break;
          case 'source_vpc_project': value = flow.sourceVpcNetworkProject || ''; break;
          case 'source_instance_name': value = flow.sourceInstanceName || ''; break;
          case 'source_zone': value = flow.sourceGcpZone || ''; break;
        }
      } else {
        switch (attribute) {
          case 'destination_ip': value = flow.destinationIp; break;
          case 'destination_vpc_network': value = flow.destinationVpcNetwork || ''; break;
          case 'destination_vpc_project': value = flow.destinationVpcNetworkProject || ''; break;
          case 'destination_instance_name': value = flow.destinationInstanceName || ''; break;
          case 'destination_zone': value = flow.destinationGcpZone || ''; break;
        }
      }
      
      if (value) {
        parts.push(value);
      }
    });

    return parts.length > 0 ? parts.join('/') : (type === 'source' ? flow.sourceIp : flow.destinationIp);
  }

  private aggregateFlowGroups(flowGroups: Map<string, FlowLogEntry[]>): AggregatedFlow[] {
    const aggregatedFlows: AggregatedFlow[] = [];

    flowGroups.forEach((flows, key) => {
      const [sourceLabel, destinationLabel] = key.split(' → ');
      
      let totalBytes = 0;
      let totalPackets = 0;
      let totalConnections = flows.length;
      let totalLatency = 0;
      let latencyCount = 0;
      const protocols = new Set<string>();

      flows.forEach(flow => {
        totalBytes += flow.bytes;
        totalPackets += flow.packets;
        protocols.add(flow.protocol);
        
        if (flow.rttMsec) {
          totalLatency += flow.rttMsec;
          latencyCount++;
        }
      });

      const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

      aggregatedFlows.push({
        sourceLabel,
        destinationLabel,
        totalBytes,
        totalPackets,
        totalConnections,
        avgLatency,
        protocol: Array.from(protocols).join(', '),
        flowLogs: flows
      });
    });

    return aggregatedFlows;
  }

  private generateTimeSeriesFromTopFlows(topFlows: AggregatedFlow[], originalTimeSeriesData: FlowMetrics[]): FlowMetrics[] {
    // For now, return the original time series data
    // In a more sophisticated implementation, we could filter and aggregate
    // the time series data based on the top flows
    return originalTimeSeriesData.slice(0, 50); // Limit for performance
  }

  private createChart() {
    if (!this.chartCanvas || !this.analysisResult) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const datasets = this.createChartDatasets();

    this.chart = new Chart(ctx, {
      type: this.selectedMetricType === 'latency' ? 'line' : 'line',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm'
              }
            },
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: this.getYAxisLabel()
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  private createChartDatasets(): any[] {
    if (!this.processedFlowData || !this.analysisResult) return [];

    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
      '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
      '#bcbd22', '#17becf'
    ];

    const datasets: any[] = [];

    // Use the top 10 flows from processed data
    this.processedFlowData.topFlows.forEach((flow, index) => {
      const color = colors[index % colors.length];
      const label = `${flow.sourceLabel} → ${flow.destinationLabel}`;
      
      // Create time series data for this specific flow
      const data = this.generateTimeSeriesForFlow(flow);

      if (data.length > 0) {
        datasets.push({
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          fill: this.selectedMetricType !== 'latency',
          tension: 0.1
        });
      }
    });

    return datasets;
  }

  private generateTimeSeriesForFlow(flow: AggregatedFlow): { x: Date; y: number }[] {
    if (!this.analysisResult) return [];

    // Group flow logs by time buckets and aggregate values
    const timeBuckets = new Map<number, number>();
    const intervalMs = this.getAggregationIntervalMs();
    
    flow.flowLogs.forEach(flowLog => {
      const bucketTime = Math.floor(flowLog.timestamp.getTime() / intervalMs) * intervalMs;
      const currentValue = timeBuckets.get(bucketTime) || 0;
      
      let valueToAdd = 0;
      switch (this.selectedMetricType) {
        case 'bytes': valueToAdd = flowLog.bytes; break;
        case 'packets': valueToAdd = flowLog.packets; break;
        case 'connections': valueToAdd = 1; break;
        case 'latency': valueToAdd = flowLog.rttMsec || 0; break;
      }
      
      timeBuckets.set(bucketTime, currentValue + valueToAdd);
    });

    // Convert to chart data format
    return Array.from(timeBuckets.entries())
      .map(([timestamp, value]) => ({
        x: new Date(timestamp),
        y: value
      }))
      .sort((a, b) => a.x.getTime() - b.x.getTime());
  }

  private getAggregationIntervalMs(): number {
    switch (this.selectedAggregationPeriod) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  private getYAxisLabel(): string {
    switch (this.selectedMetricType) {
      case 'bytes':
        return 'Bytes';
      case 'packets':
        return 'Packets';
      case 'connections':
        return 'Connections';
      case 'latency':
        return 'Latency (ms)';
      default:
        return 'Value';
    }
  }

  getChartTitle(): string {
    const timeRange = this.getTimeRangeDisplay();
    switch (this.selectedMetricType) {
      case 'bytes':
        return `Highest data flows (${timeRange})`;
      case 'packets':
        return `Highest packet flows (${timeRange})`;
      case 'connections':
        return `Most active connections (${timeRange})`;
      case 'latency':
        return `Network latency analysis (${timeRange})`;
      default:
        return `Flow Analysis (${timeRange})`;
    }
  }

  getTimeRangeDisplay(): string {
    const formValue = this.filtersForm.value;
    if (!formValue.startTime || !formValue.endTime) return '';
    
    const start = new Date(formValue.startTime);
    const end = new Date(formValue.endTime);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  }

  getTrafficColumnHeader(): string {
    switch (this.selectedMetricType) {
      case 'bytes':
        return 'Total traffic';
      case 'packets':
        return 'Total packets';
      case 'connections':
        return 'Connections';
      case 'latency':
        return 'Avg latency (ms)';
      default:
        return 'Value';
    }
  }

  formatTrafficValue(flow: FlowLogEntry): string {
    // Use metricValueSum from sophisticated query if available
    const value = flow.metricValueSum !== undefined ? flow.metricValueSum : this.getFallbackValue(flow);
    
    switch (this.selectedMetricType) {
      case 'bytes':
        return this.formatBytes(value);
      case 'packets':
        return Math.round(value).toLocaleString();
      case 'connections':
        return Math.round(value).toLocaleString(); // Connection count
      case 'latency':
        return value > 0 ? `${value.toFixed(1)} ms` : 'N/A';
      default:
        return 'N/A';
    }
  }

  private getFallbackValue(flow: FlowLogEntry): number {
    // Fallback to individual flow fields if metricValueSum is not available
    switch (this.selectedMetricType) {
      case 'bytes':
        return flow.bytes;
      case 'packets':
        return flow.packets;
      case 'connections':
        return 1; // Each flow represents one connection
      case 'latency':
        return flow.rttMsec || 0;
      default:
        return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showFlowDetails(flow: FlowLogEntry) {
    console.log('Show flow details:', flow);
    // TODO: Implement details dialog
  }

  runFlowQuery(flow: FlowLogEntry) {
    // Auto-fill filters with this flow's data
    this.filtersForm.patchValue({
      sourceIp: flow.sourceIp,
      destinationIp: flow.destinationIp,
      vpcNetworkProject: flow.sourceVpcNetworkProject,
      vpcNetwork: flow.sourceVpcNetwork,
      protocol: flow.protocol
    });
    
    this.runQuery();
  }

  viewInLogAnalytics() {
    console.log('View in Log Analytics');
    // TODO: Open Log Analytics with the current query
  }

  openDataSourceDialog() {
    if (!this.projectId) {
      console.error('No project ID available');
      return;
    }

    const dialogData: DataSourceSelectionDialogData = {
      projectId: this.projectId,
      currentBucket: this.selectedLogBucket,
      currentView: this.selectedLogView,
      currentLocation: this.selectedLocation
    };

    const dialogRef = this.dialog.open(DataSourceSelectionDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: DataSourceSelectionResult | undefined) => {
      if (result) {
        this.selectedLogBucket = result.bucket;
        this.selectedLogView = result.view;
        this.selectedLocation = result.location;
        this.enableVpcFlowLogsFilter = result.enableVpcFlowLogsFilter;
        
        console.log('Data source updated:', {
          bucket: this.selectedLogBucket,
          view: this.selectedLogView,
          location: this.selectedLocation,
          vpcFilter: this.enableVpcFlowLogsFilter
        });

        // Re-run query if we have existing results
        if (this.analysisResult) {
          this.runQuery();
        }
      }
    });
  }

  getDataSourceDisplayName(): string {
    if (this.selectedLogBucket === '_Default') {
      return '_Default (all configs)';
    }
    return this.selectedLogBucket;
  }

  private createSankeyDiagram() {
    if (!this.sankeyContainer || !this.processedFlowData) {
      return;
    }

    const sankeyData = this.generateSankeyDataFromProcessed(this.processedFlowData);
    this.renderSankey(sankeyData);
  }

  private generateSankeyDataFromProcessed(processedData: ProcessedFlowData): SankeyData {
    const nodes = new Map<string, SankeyNode>();
    const links: SankeyLink[] = [];
    
    // Use the top 10 flows from processed data
    processedData.topFlows.forEach(flow => {
      const sourceLabel = flow.sourceLabel;
      const destLabel = flow.destinationLabel;
      
      // Add source node
      if (!nodes.has(sourceLabel)) {
        nodes.set(sourceLabel, {
          id: sourceLabel,
          name: sourceLabel,
          category: 'source'
        });
      }
      
      // Add destination node
      if (!nodes.has(destLabel)) {
        nodes.set(destLabel, {
          id: destLabel,
          name: destLabel,
          category: 'destination'
        });
      }
      
      // Create link with aggregated values
      let value = 0;
      switch (this.selectedMetricType) {
        case 'bytes': value = flow.totalBytes; break;
        case 'packets': value = flow.totalPackets; break;
        case 'connections': value = flow.totalConnections; break;
        case 'latency': value = flow.avgLatency; break;
        default: value = flow.totalBytes;
      }
      
      links.push({
        source: sourceLabel,
        target: destLabel,
        value: value,
        flowCount: flow.totalConnections,
        protocol: flow.protocol
      });
    });
    
    return {
      nodes: Array.from(nodes.values()),
      links: links
    };
  }

  private getNodeLabel(flow: FlowLogEntry, type: 'source' | 'destination'): string {
    if (type === 'source') {
      if (flow.sourceInstanceName) {
        return `${flow.sourceInstanceName} (${flow.sourceIp})`;
      }
      return flow.sourceVpcNetwork ? 
        `${flow.sourceVpcNetwork}/${flow.sourceIp}` : 
        flow.sourceIp;
    } else {
      if (flow.destinationInstanceName) {
        return `${flow.destinationInstanceName} (${flow.destinationIp})`;
      }
      return flow.destinationVpcNetwork ? 
        `${flow.destinationVpcNetwork}/${flow.destinationIp}` : 
        flow.destinationIp;
    }
  }

  private getSankeyValue(flow: FlowLogEntry): number {
    switch (this.selectedMetricType) {
      case 'bytes':
        return flow.bytes;
      case 'packets':
        return flow.packets;
      case 'connections':
        return 1;
      case 'latency':
        return flow.rttMsec || 0;
      default:
        return flow.bytes;
    }
  }

  private renderSankey(data: SankeyData) {
    const container = this.sankeyContainer.nativeElement;
    container.innerHTML = ''; // Clear previous content
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    
    if (data.links.length === 0) {
      const noDataDiv = document.createElement('div');
      noDataDiv.style.textAlign = 'center';
      noDataDiv.style.padding = '40px';
      noDataDiv.style.color = '#666';
      noDataDiv.textContent = 'No traffic flows to display';
      container.appendChild(noDataDiv);
      return;
    }

    // Import D3 and create the Sankey diagram
    import('d3').then(d3 => {
      import('d3-sankey').then(d3Sankey => {
        // Create SVG
        const svg = d3.select(container)
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create Sankey generator
        const sankey = d3Sankey.sankey()
          .nodeWidth(15)
          .nodePadding(10)
          .extent([[1, 1], [width - 1, height - 6]]);

        // Use all links since we already have top 10 from processed data
        const topLinks = data.links;

        // Build nodes and links for D3 Sankey
        const nodeMap = new Map();
        const sankeyNodes: any[] = [];
        const sankeyLinks: any[] = [];

        // Create unique nodes
        topLinks.forEach(link => {
          if (!nodeMap.has(link.source)) {
            nodeMap.set(link.source, { 
              id: link.source, 
              name: this.truncateText(link.source, 25),
              fullName: link.source,
              category: 'source'
            });
            sankeyNodes.push(nodeMap.get(link.source));
          }
          if (!nodeMap.has(link.target)) {
            nodeMap.set(link.target, { 
              id: link.target, 
              name: this.truncateText(link.target, 25),
              fullName: link.target,
              category: 'target'
            });
            sankeyNodes.push(nodeMap.get(link.target));
          }
        });

        // Create links
        topLinks.forEach(link => {
          sankeyLinks.push({
            source: nodeMap.get(link.source),
            target: nodeMap.get(link.target),
            value: link.value,
            flowCount: link.flowCount,
            protocol: link.protocol,
            formattedValue: this.formatSankeyValue(link.value)
          });
        });

        const sankeyGraph = {
          nodes: sankeyNodes,
          links: sankeyLinks
        };

        // Generate the Sankey layout
        sankey(sankeyGraph);

        // Color scale
        const colorScale = d3.scaleOrdinal<string>()
          .domain(['source', 'target'])
          .range(['#1976d2', '#43a047']);

        // Draw links (flows)
        const link = g.append('g')
          .selectAll('.link')
          .data(sankeyGraph.links)
          .enter().append('path')
          .attr('class', 'link')
          .attr('d', (d3Sankey as any).sankeyLinkHorizontal())
          .style('stroke', (d: any) => {
            // Create gradient colors based on value
            const intensity = Math.min(d.value / Math.max(...sankeyLinks.map(l => l.value)), 1);
            return d3.interpolateBlues(0.3 + intensity * 0.6);
          })
          .style('stroke-opacity', 0.6)
          .style('stroke-width', (d: any) => Math.max(1, d.width))
          .style('fill', 'none');

        // Add tooltips to links
        link.append('title')
          .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.formattedValue}\nProtocol: ${d.protocol}\nFlows: ${d.flowCount}`);

        // Draw nodes
        const node = g.append('g')
          .selectAll('.node')
          .data(sankeyGraph.nodes)
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

        // Node rectangles
        node.append('rect')
          .attr('height', (d: any) => d.y1 - d.y0)
          .attr('width', sankey.nodeWidth())
          .style('fill', (d: any) => colorScale(d.category) as string)
          .style('stroke', '#000')
          .style('stroke-width', 1)
          .style('opacity', 0.8);

        // Node labels
        node.append('text')
          .attr('x', (d: any) => d.x0 < width / 2 ? sankey.nodeWidth() + 6 : -6)
          .attr('y', (d: any) => (d.y1 + d.y0) / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
          .style('font-family', 'Arial, sans-serif')
          .style('font-size', '12px')
          .style('fill', '#333')
          .text((d: any) => d.name);

        // Add node tooltips
        node.append('title')
          .text((d: any) => d.fullName);

        // Add title
        svg.append('text')
          .attr('x', (width + margin.left + margin.right) / 2)
          .attr('y', margin.top / 2)
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .style('font-weight', 'bold')
          .style('fill', '#333')
          .text(`Traffic Flow Diagram - Top ${topLinks.length} flows by ${this.selectedMetricType}`);

        // Add hover effects
        link
          .on('mouseover', function(event: any, d: any) {
            d3.select(this)
              .style('stroke-opacity', 0.8)
              .style('stroke-width', Math.max(2, d.width + 1));
          })
          .on('mouseout', function(event: any, d: any) {
            d3.select(this)
              .style('stroke-opacity', 0.6)
              .style('stroke-width', Math.max(1, d.width));
          });

        node.select('rect')
          .on('mouseover', function() {
            d3.select(this).style('opacity', 1);
          })
          .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8);
          });

      }).catch(error => {
        console.error('Error loading d3-sankey:', error);
        this.showFallbackSankey(container, data);
      });
    }).catch(error => {
      console.error('Error loading d3:', error);
      this.showFallbackSankey(container, data);
    });
  }

  private showFallbackSankey(container: HTMLElement, data: SankeyData) {
    container.innerHTML = '';
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.textAlign = 'center';
    fallbackDiv.style.padding = '40px';
    fallbackDiv.style.color = '#666';
    fallbackDiv.innerHTML = `
      <h3>Sankey Diagram</h3>
      <p>D3.js library not available. Showing ${data.links.length} traffic flows.</p>
      <p>Please ensure D3.js is properly installed for full Sankey visualization.</p>
    `;
    container.appendChild(fallbackDiv);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private formatSankeyValue(value: number): string {
    switch (this.selectedMetricType) {
      case 'bytes':
        return this.formatBytes(value);
      case 'packets':
        return value.toLocaleString() + ' packets';
      case 'connections':
        return value.toLocaleString() + ' connections';
      case 'latency':
        return value.toFixed(1) + ' ms';
      default:
        return value.toLocaleString();
    }
  }

  getFilterCategories(attributes: FilterAttribute[]): { label: string; attributes: FilterAttribute[] }[] {
    if (!attributes || attributes.length === 0) {
      return [];
    }
    
    const categories = attributes.reduce((acc, attr) => {
      if (!acc[attr.category]) {
        acc[attr.category] = [];
      }
      acc[attr.category].push(attr);
      return acc;
    }, {} as Record<string, FilterAttribute[]>);

    return Object.entries(categories).map(([category, attrs]) => ({
      label: this.getCategoryDisplayName(category),
      attributes: attrs
    }));
  }

  getOrganizeCategories(attributes: OrganizeAttribute[]): { label: string; attributes: OrganizeAttribute[] }[] {
    if (!attributes || attributes.length === 0) {
      return [];
    }
    
    const categories = attributes.reduce((acc, attr) => {
      if (!acc[attr.category]) {
        acc[attr.category] = [];
      }
      acc[attr.category].push(attr);
      return acc;
    }, {} as Record<string, OrganizeAttribute[]>);

    return Object.entries(categories).map(([category, attrs]) => ({
      label: this.getCategoryDisplayName(category),
      attributes: attrs
    }));
  }

  private getCategoryDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      'basic': 'Basic',
      'network': 'VPC Network',
      'instance': 'Compute Instance',
      'gke': 'Google Kubernetes Engine',
      'load_balancer': 'Load Balancer',
      'gateway': 'Gateway',
      'geographic': 'Geographic',
      'psc': 'Private Service Connect',
      'asn': 'ASN',
      'google': 'Google Services',
      'timing': 'Timing',
      'qos': 'Quality of Service'
    };
    return categoryMap[category] || category;
  }
}

// Interfaces for Sankey diagram
interface SankeyNode {
  id: string;
  name: string;
  category: 'source' | 'destination';
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  flowCount: number;
  protocol: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface ProcessedFlowData {
  topFlows: AggregatedFlow[];
  timeSeriesData: FlowMetrics[];
  organizedBy: OrganizeSettings;
}

interface AggregatedFlow {
  sourceLabel: string;
  destinationLabel: string;
  totalBytes: number;
  totalPackets: number;
  totalConnections: number;
  avgLatency: number;
  protocol: string;
  flowLogs: FlowLogEntry[];
}

interface OrganizeSettings {
  source: string[];
  destination: string[];
  flowParameters: string[];
} 