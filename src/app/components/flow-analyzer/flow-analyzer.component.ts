import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FlowAnalyzerService, FlowLogEntry, FlowMetrics, FilterOptions, MetricType, AggregationPeriod, FlowAnalysisResult } from '../../services/flow-analyzer.service';
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
      <mat-card class="query-section">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>tune</mat-icon>
            Query
          </mat-card-title>
          <mat-card-subtitle>Configure filters and SQL query for VPC Flow Logs analysis</mat-card-subtitle>
          <div class="card-header-actions">
            <!-- Data Source Selection Button -->
            <button mat-stroked-button (click)="openDataSourceDialog()" class="data-source-button">
              <mat-icon>storage</mat-icon>
              <span>Source bucket: {{ getDataSourceDisplayName() }}</span>
              <mat-icon>expand_more</mat-icon>
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <!-- Toggle between Basic and SQL Filters -->
          <div class="filter-mode-toggle">
            <mat-button-toggle-group [(value)]="filterMode" (change)="onFilterModeChange()">
              <mat-button-toggle value="basic">
                <mat-icon>filter_list</mat-icon>
                Basic filters
              </mat-button-toggle>
              <mat-button-toggle value="sql">
                <mat-icon>code</mat-icon>
                SQL filters
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <!-- Basic Filters -->
          <div *ngIf="filterMode === 'basic'" class="basic-filters">
            <form [formGroup]="filtersForm" class="filters-form">
              <!-- Source Filters -->
              <div class="filter-row">
                <mat-card class="filter-card">
                  <mat-card-content>
                    <h4>
                      <mat-icon>source</mat-icon>
                      Source
                    </h4>
                    <div class="filter-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Source IP</mat-label>
                        <input matInput formControlName="sourceIp" placeholder="e.g., 10.128.0.3">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>VPC network project</mat-label>
                        <mat-select formControlName="vpcNetworkProject">
                          <mat-option value="">All projects</mat-option>
                          <mat-option *ngFor="let project of availableProjects" [value]="project">
                            {{ project }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>VPC network</mat-label>
                        <mat-select formControlName="vpcNetwork">
                          <mat-option value="">All networks</mat-option>
                          <mat-option *ngFor="let network of availableNetworks" [value]="network">
                            {{ network }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Destination Filters -->
              <div class="filter-row">
                <mat-card class="filter-card">
                  <mat-card-content>
                    <h4>
                      <mat-icon>my_location</mat-icon>
                      Destination
                    </h4>
                    <div class="filter-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Destination IP</mat-label>
                        <input matInput formControlName="destinationIp" placeholder="e.g., 104.209.224.181">
                      </mat-form-field>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Flow Parameters -->
              <div class="filter-row">
                <mat-card class="filter-card">
                  <mat-card-content>
                    <h4>
                      <mat-icon>settings_ethernet</mat-icon>
                      Flow Parameters
                    </h4>
                    <div class="filter-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Protocol</mat-label>
                        <mat-select formControlName="protocol">
                          <mat-option value="">All protocols</mat-option>
                          <mat-option *ngFor="let protocol of availableProtocols" [value]="protocol">
                            {{ protocol }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Port</mat-label>
                        <input matInput formControlName="port" placeholder="e.g., 443, 80">
                      </mat-form-field>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Time Range -->
              <div class="filter-row">
                <mat-card class="filter-card">
                  <mat-card-content>
                    <h4>
                      <mat-icon>schedule</mat-icon>
                      Time Range
                    </h4>
                    <div class="time-range-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Start time</mat-label>
                        <input matInput type="datetime-local" formControlName="startTime">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>End time</mat-label>
                        <input matInput type="datetime-local" formControlName="endTime">
                      </mat-form-field>
                      <div class="quick-time-buttons">
                        <button mat-button type="button" (click)="setQuickTimeRange('1h')">Last 1 hour</button>
                        <button mat-button type="button" (click)="setQuickTimeRange('6h')">Last 6 hours</button>
                        <button mat-button type="button" (click)="setQuickTimeRange('1d')">Last 1 day</button>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </form>
          </div>

          <!-- SQL Filters -->
          <div *ngIf="filterMode === 'sql'" class="sql-filters">
            <div class="sql-query-section">
              <div class="sql-header">
                <h4>WHERE</h4>
                <div class="sql-info">
                  <span>SQL filter query in BigQuery SQL Syntax</span>
                  <button mat-icon-button matTooltip="Expression syntax and examples">
                    <mat-icon>help_outline</mat-icon>
                  </button>
                </div>
              </div>
              <mat-form-field appearance="outline" class="sql-field">
                <textarea
                  matInput
                  [(ngModel)]="customSqlQuery"
                  placeholder="Example: src_ip = '10.0.0.1' OR dest_ip = '10.0.0.2'"
                  rows="6"
                  cdkTextareaAutosize
                  cdkAutosizeMinRows="3"
                  cdkAutosizeMaxRows="10">
                </textarea>
              </mat-form-field>
              <div class="sql-organize">
                <p><strong>Organize flows by:</strong> Source IP, Source VPC network project, Source VPC network, and Destination IP</p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="query-actions">
            <button mat-raised-button color="primary" (click)="runQuery()" [disabled]="isLoading">
              <mat-icon>play_arrow</mat-icon>
              {{ isLoading ? 'Running...' : 'Run new query' }}
            </button>
            <button mat-stroked-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Clear filters
            </button>
          </div>
        </mat-card-content>
      </mat-card>

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
        <mat-card class="chart-section">
          <mat-card-header>
            <div class="chart-header">
              <div class="chart-title">
                <h3>{{ getChartTitle() }}</h3>
                <p class="time-range-display">{{ getTimeRangeDisplay() }}</p>
              </div>
              <div class="chart-controls">
                <!-- Display Options Panel -->
                <div class="display-options">
                  <h4>Display options</h4>
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
                    <mat-form-field appearance="outline">
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
                </div>
              </div>
            </div>
          </mat-card-header>
          <mat-card-content>
            <!-- Chart Canvas -->
            <div class="chart-container">
              <canvas #chartCanvas></canvas>
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
      background-color: #f8f9fa;
      min-height: 100vh;
    }

    .header {
      margin-bottom: 24px;
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 400;
      color: #202124;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      color: #1976d2;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .header-description {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    .query-section {
      margin-bottom: 24px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .card-header-actions {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    .data-source-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px solid #dadce0;
      background: white;
      color: #202124;
      font-size: 14px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .data-source-button:hover {
      background: #f8f9fa;
      border-color: #5f6368;
    }

    .data-source-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .data-source-button span {
      font-weight: 500;
    }

    .filter-mode-toggle {
      margin-bottom: 24px;
    }

    .filter-mode-toggle mat-button-toggle-group {
      border: 1px solid #dadce0;
      border-radius: 4px;
    }

    .basic-filters {
      margin-bottom: 24px;
    }

    .filter-row {
      margin-bottom: 16px;
    }

    .filter-card {
      border: 1px solid #e0e0e0;
      box-shadow: none;
    }

    .filter-card h4 {
      margin: 0 0 16px 0;
      color: #202124;
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .time-range-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }

    .quick-time-buttons {
      grid-column: 1 / -1;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .sql-filters {
      margin-bottom: 24px;
    }

    .sql-query-section {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
    }

    .sql-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .sql-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .sql-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #5f6368;
      font-size: 14px;
    }

    .sql-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .sql-organize {
      color: #5f6368;
      font-size: 14px;
    }

    .query-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .chart-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
      color: #202124;
    }

    .time-range-display {
      margin: 4px 0 0 0;
      color: #5f6368;
      font-size: 14px;
    }

    .display-options {
      min-width: 300px;
      border-left: 1px solid #e0e0e0;
      padding-left: 24px;
    }

    .display-options h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .metric-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metric-controls mat-form-field {
      width: 100%;
    }

    .chart-container {
      height: 400px;
      margin: 24px 0;
      position: relative;
    }

    .query-stats {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px 0;
      border-top: 1px solid #e0e0e0;
      flex-wrap: wrap;
    }

    .stat-item {
      color: #5f6368;
      font-size: 14px;
    }

    .table-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
      color: #202124;
    }

    .project-link, .network-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
    }

    .project-link:hover, .network-link:hover {
      text-decoration: underline;
    }

    .traffic-value {
      font-weight: 500;
      color: #202124;
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
      color: #202124;
      font-size: 16px;
    }

    .loading-detail {
      color: #5f6368;
      font-size: 14px;
    }

    @media (max-width: 1024px) {
      .chart-header {
        flex-direction: column;
        gap: 24px;
      }

      .display-options {
        border-left: none;
        border-top: 1px solid #e0e0e0;
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
      color: #5f6368;
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
      color: #202124;
      font-size: 13px;
    }

    .instance-zone {
      font-size: 11px;
      color: #5f6368;
      font-family: 'Roboto Mono', monospace;
    }

    .error-section {
      margin-top: 24px;
    }

    .error-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
      color: #202124;
    }

    .error-message p {
      margin: 0;
      color: #5f6368;
      font-size: 14px;
    }

    .error-help {
      margin-top: 16px;
    }

    .error-help h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .error-help ol {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }

    .error-help li {
      margin-bottom: 8px;
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
      background: #e3f2fd;
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
  `]
})
export class FlowAnalyzerComponent implements OnInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  // Form and Filters
  filtersForm: FormGroup;
  filterMode: 'basic' | 'sql' = 'basic';
  customSqlQuery = '';

  // Data and State
  analysisResult: FlowAnalysisResult | null = null;
  isLoading = false;
  projectId: string | null = null;

  // Chart
  chart: Chart | null = null;

  // Display Configuration
  selectedMetricType: MetricType = 'bytes';
  selectedAggregationPeriod: AggregationPeriod = '5m';

  // Data Source Configuration
  selectedLogBucket = '_Default';
  selectedLogView = '_AllLogs';
  selectedLocation = 'global';
  enableVpcFlowLogsFilter = true;

  // Available Options
  availableProjects: string[] = [];
  availableNetworks: string[] = [];
  availableProtocols: string[] = [];

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

  onFilterModeChange() {
    if (this.filterMode === 'sql') {
      this.customSqlQuery = this.generateSqlFromFilters();
    }
  }

  private generateSqlFromFilters(): string {
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

    const filters = this.buildFilterOptions();
    const customQuery = this.filterMode === 'sql' ? this.customSqlQuery : undefined;

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
        this.cdr.detectChanges();
        
        // Only create chart if we have data and no errors
        if (result.timeSeriesData.length > 0 && !result.error) {
          setTimeout(() => {
            this.createChart();
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
    this.customSqlQuery = '';
    this.initializeDefaultTimeRange();
  }

  onMetricTypeChange() {
    if (this.analysisResult) {
      this.runQuery();
    }
  }

  onAggregationPeriodChange() {
    if (this.analysisResult) {
      this.runQuery();
    }
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
    if (!this.analysisResult) return [];

    // Group data by source-destination pairs
    const dataGroups = new Map<string, FlowMetrics[]>();
    
    this.analysisResult.timeSeriesData.forEach(metric => {
      const key = `${metric.sourceIp} → ${metric.destinationIp}`;
      if (!dataGroups.has(key)) {
        dataGroups.set(key, []);
      }
      dataGroups.get(key)!.push(metric);
    });

    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
      '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
    ];

    const datasets: any[] = [];
    let colorIndex = 0;

    dataGroups.forEach((metrics, label) => {
      const color = colors[colorIndex % colors.length];
      
      const data = metrics.map(metric => ({
        x: metric.timestamp,
        y: metric.value
      }));

      datasets.push({
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        fill: this.selectedMetricType !== 'latency',
        tension: 0.1
      });

      colorIndex++;
    });

    return datasets;
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
} 