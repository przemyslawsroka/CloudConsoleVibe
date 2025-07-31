import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ConnectivityTestsService, ConnectivityTest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-connectivity-tests',
  template: `
    <div class="connectivity-tests-container">
      <!-- Header with title and action buttons -->
      <div class="header">
        <h1>Connectivity Tests</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createConnectivityTest()">
            <mat-icon>add</mat-icon>
            Create connectivity test
          </button>
          <button mat-icon-button (click)="rerun()" matTooltip="Rerun">
            <mat-icon>play_arrow</mat-icon>
          </button>
          <button mat-icon-button (click)="deleteSelected()" [disabled]="selection.isEmpty()" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Description text -->
      <div class="description-text">
        <p>This test lets you check connectivity between network endpoints. It analyzes your 
        configuration and, if the configuration is eligible, sends packets through the live 
        data plane. <a href="#" class="learn-more">Learn more</a></p>
      </div>

      <!-- Filter section -->
      <div class="filter-section">
        <button mat-stroked-button class="filter-btn">
          <mat-icon>filter_list</mat-icon>
          Filter
        </button>
        <span class="filter-text">Filter by test name or protocol</span>
        <div class="spacer"></div>
        <button mat-icon-button matTooltip="Show filter options">
          <mat-icon>help_outline</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Column display options">
          <mat-icon>view_column</mat-icon>
        </button>
      </div>

      <!-- Main content area with table and side panel -->
      <div class="main-content" [class.side-panel-open]="selectedTest">
        <!-- Loading spinner -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
        </div>

        <!-- Data table -->
        <div *ngIf="!isLoading" class="table-wrapper">
          <table mat-table [dataSource]="dataSource" class="connectivity-table">
            
            <!-- Checkbox column -->
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef>
                <mat-checkbox (change)="$event ? masterToggle() : null"
                              [checked]="selection.hasValue() && isAllSelected()"
                              [indeterminate]="selection.hasValue() && !isAllSelected()">
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox (click)="$event.stopPropagation()"
                              (change)="$event ? selection.toggle(row) : null"
                              [checked]="selection.isSelected(row)">
                </mat-checkbox>
              </td>
            </ng-container>

            <!-- Name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let element">
                <a class="test-link" (click)="viewTestDetails(element)">{{ element.name }}</a>
              </td>
            </ng-container>

            <!-- Protocol column -->
            <ng-container matColumnDef="protocol">
              <th mat-header-cell *matHeaderCellDef>Protocol</th>
              <td mat-cell *matCellDef="let element">
                <span class="protocol-badge">{{ element.protocol }}</span>
              </td>
            </ng-container>

            <!-- Source column -->
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let element">{{ element.source }}</td>
            </ng-container>

            <!-- Destination column -->
            <ng-container matColumnDef="destination">
              <th mat-header-cell *matHeaderCellDef>Destination</th>
              <td mat-cell *matCellDef="let element">{{ element.destination }}</td>
            </ng-container>

            <!-- Destination port column -->
            <ng-container matColumnDef="destinationPort">
              <th mat-header-cell *matHeaderCellDef>Destination port</th>
              <td mat-cell *matCellDef="let element">{{ element.destinationPort || '—' }}</td>
            </ng-container>

            <!-- Last test time column -->
            <ng-container matColumnDef="lastTestTime">
              <th mat-header-cell *matHeaderCellDef>Last test time</th>
              <td mat-cell *matCellDef="let element">{{ element.lastTestTime }}</td>
            </ng-container>

            <!-- Last live data plane analysis result column -->
            <ng-container matColumnDef="lastLiveDataPlaneResult">
              <th mat-header-cell *matHeaderCellDef>Last live data plane analysis result</th>
              <td mat-cell *matCellDef="let element">
                <span class="result-text" [class]="getResultClass(element.lastLiveDataPlaneResult)">
                  {{ element.lastLiveDataPlaneResult }}
                </span>
              </td>
            </ng-container>

            <!-- Overall configuration analysis result column -->
            <ng-container matColumnDef="overallConfigurationResult">
              <th mat-header-cell *matHeaderCellDef>Overall configuration analysis result</th>
              <td mat-cell *matCellDef="let element">
                <span class="result-text" [class]="getResultClass(element.overallConfigurationResult)">
                  {{ element.overallConfigurationResult }}
                </span>
              </td>
            </ng-container>

            <!-- Result details column -->
            <ng-container matColumnDef="resultDetails">
              <th mat-header-cell *matHeaderCellDef>Result details</th>
              <td mat-cell *matCellDef="let element">
                <a class="view-link" (click)="viewTestDetails(element)">{{ element.resultDetails }}</a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="dataSource.data.length === 0 && !isLoading" class="no-data">
            <p>No connectivity tests found</p>
          </div>
        </div>

        <!-- Side panel for test details -->
        <div *ngIf="selectedTest" class="side-panel">
          <div class="side-panel-header">
            <h2>Connectivity test result</h2>
            <button mat-icon-button (click)="closeSidePanel()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="side-panel-content">
            <!-- Loading state for test details -->
            <div *ngIf="isLoadingTestDetails" class="loading-details">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading test details...</p>
            </div>

            <!-- Test details content (hidden while loading) -->
            <div *ngIf="!isLoadingTestDetails">
              <!-- Test Overview -->
              <div class="result-section">
                <h3>Result</h3>
                <div class="result-status">
                  <mat-icon class="status-icon" [class.success]="selectedTest.overallConfigurationResult.includes('Reachable')"
                           [class.error]="selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable')"
                           [class.warning]="selectedTest.overallConfigurationResult.includes('Undetermined')">
                    {{ selectedTest.overallConfigurationResult.includes('Reachable') ? 'check_circle' : 
                       selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable') ? 'error' : 'warning' }}
                  </mat-icon>
                  <span class="status-text">{{ selectedTest.overallConfigurationResult.replace('→', '').replace('▲', '').replace('✕', '').trim() }}</span>
                  <a href="#" class="feedback-link" *ngIf="selectedTest.overallConfigurationResult.includes('Reachable')">
                    <mat-icon>feedback</mat-icon>
                    Send feedback
                  </a>
                </div>
              </div>

              <!-- Error Message -->
              <div *ngIf="selectedTest.errorMessage" class="error-section">
                <mat-icon class="error-icon">error_outline</mat-icon>
                <p>{{ selectedTest.errorMessage }}</p>
              </div>

              <!-- Forward Trace Result (for round trip tests) -->
              <div *ngIf="selectedTest.roundTrip && selectedTest.forwardTrace" class="trace-result-section">
                <h3>Forward trace result</h3>
                <div class="result-status">
                  <mat-icon class="status-icon" [class.success]="selectedTest.forwardTrace.result === 'DELIVERED'"
                           [class.error]="selectedTest.forwardTrace.result === 'DROPPED' || selectedTest.forwardTrace.result === 'UNREACHABLE'">
                    {{ selectedTest.forwardTrace.result === 'DELIVERED' ? 'check_circle' : 'error' }}
                  </mat-icon>
                  <span class="status-text">{{ selectedTest.forwardTrace.details }}</span>
                </div>
              </div>

              <!-- Test Details -->
              <div class="details-section">
                <div class="detail-row">
                  <span class="label">Test name</span>
                  <span class="value">{{ selectedTest.name }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Last test time</span>
                  <span class="value">{{ selectedTest.lastTestTime }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Last live data plane analysis result</span>
                  <div class="result-value">
                    <mat-icon class="result-icon" [class.success]="selectedTest.lastLiveDataPlaneResult.includes('delivered')"
                             [class.warning]="selectedTest.lastLiveDataPlaneResult.includes('Not eligible')"
                             [class.error]="selectedTest.lastLiveDataPlaneResult.includes('dropped') || selectedTest.lastLiveDataPlaneResult.includes('Unreachable')">
                      {{ selectedTest.lastLiveDataPlaneResult.includes('delivered') ? 'trending_up' : 
                         selectedTest.lastLiveDataPlaneResult.includes('Not eligible') ? 'help_outline' : 'trending_down' }}
                    </mat-icon>
                    <span class="result-text">{{ selectedTest.lastLiveDataPlaneResult.replace('→', '').trim() }}</span>
                    <div class="latency-info" *ngIf="selectedTest.latencyInfo && selectedTest.lastLiveDataPlaneResult.includes('delivered')">
                      <small>Latency (one-way): <strong>Median: {{ selectedTest.latencyInfo.median }} {{ selectedTest.latencyInfo.unit }}</strong></small><br>
                      <small>95th percentile: {{ selectedTest.latencyInfo.percentile95 }} {{ selectedTest.latencyInfo.unit }}</small>
                    </div>
                  </div>
                </div>
                <div class="detail-row">
                  <span class="label">Overall configuration analysis result</span>
                  <div class="result-value">
                    <mat-icon class="result-icon" [class.success]="selectedTest.overallConfigurationResult.includes('Reachable')"
                             [class.error]="selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable')"
                             [class.warning]="selectedTest.overallConfigurationResult.includes('Undetermined')">
                      {{ selectedTest.overallConfigurationResult.includes('Reachable') ? 'check_circle' : 
                         selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable') ? 'error' : 'warning' }}
                    </mat-icon>
                    <span class="result-text">{{ selectedTest.overallConfigurationResult.replace('→', '').replace('▲', '').replace('✕', '').trim() }}</span>
                    <small>{{ selectedTest.lastTestTime }}</small>
                  </div>
                </div>
              </div>

              <!-- Packet Drop Reason -->
              <div *ngIf="selectedTest.packetDropReason" class="drop-reason-section">
                <h4>Analysis result for selected trace</h4>
                <div class="trace-result error">
                  <mat-icon class="trace-icon error">error</mat-icon>
                  <span>Packet could be dropped</span>
                </div>
                <p class="drop-reason">{{ selectedTest.packetDropReason }}</p>
                <a href="#" class="learn-more">Learn how to fix the issue</a>
              </div>

              <!-- Test Configuration -->
              <div class="config-section">
                <div class="detail-row">
                  <span class="label">Protocol</span>
                  <span class="value">{{ selectedTest.protocol }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Source</span>
                  <span class="value link">{{ selectedTest.source }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Source project</span>
                  <span class="value">{{ projectId }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Destination</span>
                  <span class="value link">{{ selectedTest.destination }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Destination project</span>
                  <span class="value">{{ projectId }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedTest.destinationPort">
                  <span class="label">Destination port</span>
                  <span class="value">{{ selectedTest.destinationPort }}</span>
                </div>
              </div>

              <!-- Configuration Analysis Trace for detailed tests -->
              <div *ngIf="selectedTest.forwardTrace || selectedTest.returnTrace" class="trace-section">
                <h3>Configuration analysis trace selection</h3>
                <mat-form-field appearance="outline" class="trace-select">
                  <mat-label>Select trace</mat-label>
                  <mat-select [value]="selectedTrace" (selectionChange)="onTraceSelectionChange($event.value)">
                    <mat-option value="forward" *ngIf="selectedTest.forwardTrace">Forward trace</mat-option>
                    <mat-option value="return" *ngIf="selectedTest.returnTrace">Return trace</mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Forward Trace Details -->
                <div *ngIf="selectedTrace === 'forward' && selectedTest.forwardTrace">
                  <h4>Analysis result for selected trace</h4>
                  <div class="trace-result" [class.success]="selectedTest.forwardTrace.result === 'DELIVERED'"
                       [class.error]="selectedTest.forwardTrace.result === 'DROPPED' || selectedTest.forwardTrace.result === 'UNREACHABLE'">
                    <mat-icon class="trace-icon">
                      {{ selectedTest.forwardTrace.result === 'DELIVERED' ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span>{{ selectedTest.forwardTrace.details }}</span>
                  </div>

                  <h4>Configuration analysis trace path</h4>
                  
                  <mat-expansion-panel *ngFor="let step of selectedTest.forwardTrace.steps; let first = first" [expanded]="first">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>{{ getStepIcon(step.type) }}</mat-icon>
                        {{ step.description }}
                      </mat-panel-title>
                    </mat-expansion-panel-header>
                    <div class="trace-details">
                      <div *ngIf="step.type === 'VM_INSTANCE' && step.details">
                        <p><strong>Network interface:</strong> {{ step.details.networkInterface }}</p>
                        <p><strong>Network:</strong> {{ step.details.network }}</p>
                        <p><strong>Internal IP:</strong> {{ step.details.internalIp }}</p>
                        <p><strong>External IP:</strong> {{ step.details.externalIp }}</p>
                        <p *ngIf="!step.details.isRunning" class="warning-text">
                          This instance is not running. The trace shows the behavior in case the instance was running.
                        </p>
                        <a href="#" class="view-link">View network interface details</a>
                      </div>
                      <div *ngIf="step.type === 'FIREWALL_RULE' && step.details">
                        <p><strong>Action:</strong> {{ step.action }}</p>
                        <p><strong>Priority:</strong> {{ step.details.priority }}</p>
                        <p><strong>Network:</strong> {{ step.details.network }}</p>
                        <p *ngIf="step.details.reason"><strong>Reason:</strong> {{ step.details.reason }}</p>
                      </div>
                      <div *ngIf="step.type === 'SUBNET_ROUTE' && step.details">
                        <p><strong>Destination range:</strong> {{ step.details.destinationRange }}</p>
                        <p><strong>Next hop:</strong> {{ step.details.nextHop }}</p>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </div>

                <!-- Return Trace Details -->
                <div *ngIf="selectedTrace === 'return' && selectedTest.returnTrace">
                  <h4>Analysis result for selected trace</h4>
                  <div class="trace-result" [class.success]="selectedTest.returnTrace.result === 'DELIVERED'"
                       [class.error]="selectedTest.returnTrace.result === 'DROPPED' || selectedTest.returnTrace.result === 'UNREACHABLE'">
                    <mat-icon class="trace-icon">
                      {{ selectedTest.returnTrace.result === 'DELIVERED' ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span>{{ selectedTest.returnTrace.details }}</span>
                  </div>

                  <h4>Configuration analysis trace path</h4>
                  
                  <mat-expansion-panel *ngFor="let step of selectedTest.returnTrace.steps; let first = first" [expanded]="first">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>{{ getStepIcon(step.type) }}</mat-icon>
                        {{ step.description }}
                      </mat-panel-title>
                    </mat-expansion-panel-header>
                    <div class="trace-details">
                      <div *ngIf="step.type === 'VM_INSTANCE' && step.details">
                        <p><strong>Network interface:</strong> {{ step.details.networkInterface }}</p>
                        <p><strong>Network:</strong> {{ step.details.network }}</p>
                        <p><strong>Internal IP:</strong> {{ step.details.internalIp }}</p>
                        <p><strong>External IP:</strong> {{ step.details.externalIp }}</p>
                        <p *ngIf="!step.details.isRunning" class="warning-text">
                          This instance is not running. The trace shows the behavior in case the instance was running.
                        </p>
                        <a href="#" class="view-link">View network interface details</a>
                      </div>
                      <div *ngIf="step.type === 'FIREWALL_RULE' && step.details">
                        <p><strong>Action:</strong> {{ step.action }}</p>
                        <p><strong>Priority:</strong> {{ step.details.priority }}</p>
                        <p><strong>Network:</strong> {{ step.details.network }}</p>
                        <p *ngIf="step.details.reason"><strong>Reason:</strong> {{ step.details.reason }}</p>
                      </div>
                      <div *ngIf="step.type === 'SUBNET_ROUTE' && step.details">
                        <p><strong>Destination range:</strong> {{ step.details.destinationRange }}</p>
                        <p><strong>Next hop:</strong> {{ step.details.nextHop }}</p>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </div>
              </div>

              <!-- Simple Configuration Analysis Trace for tests without detailed traces -->
              <div *ngIf="!selectedTest.forwardTrace && !selectedTest.returnTrace" class="trace-section">
                <h3>Configuration analysis trace selection</h3>
                <mat-form-field appearance="outline" class="trace-select">
                  <mat-label>Select trace</mat-label>
                  <mat-select value="trace0">
                    <mat-option value="trace0">trace0</mat-option>
                  </mat-select>
                </mat-form-field>

                <h4>Analysis result for selected trace</h4>
                <div class="trace-result" [class.success]="selectedTest.overallConfigurationResult.includes('Reachable')"
                     [class.error]="selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable')"
                     [class.warning]="selectedTest.overallConfigurationResult.includes('Undetermined')">
                  <mat-icon class="trace-icon">
                    {{ selectedTest.overallConfigurationResult.includes('Reachable') ? 'check_circle' : 
                       selectedTest.overallConfigurationResult.includes('dropped') || selectedTest.overallConfigurationResult.includes('Unreachable') ? 'error' : 'warning' }}
                  </mat-icon>
                  <span>{{ selectedTest.overallConfigurationResult.includes('Reachable') ? 'Packet could be delivered' : 
                           selectedTest.overallConfigurationResult.includes('dropped') ? 'Packet could be dropped' : 'Configuration analysis incomplete' }}</span>
                </div>

                <h4>Configuration analysis trace path</h4>
                
                <!-- VM Instance -->
                <mat-expansion-panel expanded>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>computer</mat-icon>
                      VM instance ({{ getSourceInstanceName() }})
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <div class="trace-details">
                    <p><strong>Network interface:</strong> nic0</p>
                    <p><strong>Network:</strong> default</p>
                    <p><strong>Internal IP:</strong> 10.132.0.51</p>
                    <p><strong>External IP:</strong> 34.77.90.238</p>
                    <p>This instance is not running. The trace shows the behavior in case the instance was running.</p>
                    <a href="#" class="view-link">View network interface details</a>
                  </div>
                </mat-expansion-panel>

                <!-- Default Egress Firewall Rule -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>security</mat-icon>
                      Default egress firewall rule
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <div class="trace-details">
                    <p><strong>Action:</strong> Allow</p>
                    <p><strong>Priority:</strong> 65535</p>
                    <p><strong>Network:</strong> default</p>
                  </div>
                </mat-expansion-panel>

                <!-- Subnet Route -->
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>route</mat-icon>
                      Subnet route
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <div class="trace-details">
                    <p>Subnet route configuration details...</p>
                  </div>
                </mat-expansion-panel>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button mat-button (click)="closeSidePanel()">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connectivity-tests-container {
      padding: 20px;
      max-width: 100%;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: var(--text-color);
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .description-text {
      margin: 16px 0;
      color: var(--text-secondary-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .filter-section {
      display: flex;
      align-items: center;
      margin: 16px 0;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .filter-btn {
      margin-right: 16px;
    }

    .filter-text {
      color: var(--text-secondary-color);
      font-size: 14px;
    }

    .spacer {
      flex: 1;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .table-wrapper {
      background: var(--surface-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      border: 1px solid var(--border-color);
    }

    .connectivity-table {
      width: 100%;
      min-width: 1400px;
    }

    .mat-column-select {
      width: 48px;
    }

    .mat-column-name {
      width: 140px;
    }

    .mat-column-protocol {
      width: 80px;
    }

    .mat-column-source {
      width: 180px;
    }

    .mat-column-destination {
      width: 180px;
    }

    .mat-column-destinationPort {
      width: 120px;
    }

    .mat-column-lastTestTime {
      width: 140px;
    }

    .mat-column-lastLiveDataPlaneResult {
      width: 200px;
    }

    .mat-column-overallConfigurationResult {
      width: 200px;
    }

    .mat-column-resultDetails {
      width: 100px;
    }

    .test-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .test-link:hover {
      text-decoration: underline;
    }

    .protocol-badge {
      background-color: rgba(25, 118, 210, 0.1);
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      border: 1px solid rgba(25, 118, 210, 0.2);
      transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    .result-text {
      font-size: 13px;
    }

    .result-text.reachable {
      color: #137333;
    }

    .result-text.reachable::before {
      content: '→ ';
      color: #137333;
    }

    .result-text.not-eligible {
      color: #ea4335;
    }

    .result-text.not-eligible::before {
      content: '→ ';
      color: #ea4335;
    }

    .result-text.undetermined {
      color: #ea4335;
    }

    .result-text.undetermined::before {
      content: '▲ ';
      color: #ea4335;
    }

    .result-text.delivered {
      color: #137333;
    }

    .result-text.delivered::before {
      content: '→ ';
      color: #137333;
    }

    .view-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
    }

    .view-link:hover {
      text-decoration: underline;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary-color);
    }

    /* Header styling */
    ::ng-deep .mat-header-cell {
      color: var(--text-secondary-color);
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
      padding: 12px 16px;
      background-color: var(--hover-color);
    }

    ::ng-deep .mat-cell {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-row:hover {
      background-color: var(--hover-color);
    }

    /* Remove default table styling */
    ::ng-deep .mat-table {
      background: var(--surface-color);
    }

    ::ng-deep .mat-header-row {
      background-color: var(--hover-color);
    }

    /* Main content layout */
    .main-content {
      position: relative;
      transition: margin-right 0.3s ease-in-out;
    }

    .main-content.side-panel-open {
      margin-right: 500px;
    }

    /* Side panel styling */
    .side-panel {
      position: fixed;
      top: 64px;
      right: 0;
      width: 480px;
      height: calc(100vh - 64px);
      background: var(--surface-color);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      z-index: 10;
      overflow-y: auto;
      border-left: 1px solid var(--border-color);
    }

    .side-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
      background: var(--hover-color);
    }

    .side-panel-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color);
    }

    .close-btn {
      color: var(--text-secondary-color);
    }

    .side-panel-content {
      padding: 20px;
    }

    .result-section {
      margin-bottom: 24px;
    }

    .result-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .result-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .status-icon {
      font-size: 20px;
    }

    .status-icon.success {
      color: #137333;
    }

    .status-icon.error {
      color: #d93025;
    }

    .status-icon.warning {
      color: #f9ab00;
    }

    .status-text {
      font-weight: 500;
      color: #202124;
      flex: 1;
    }

    .feedback-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
    }

    .feedback-link:hover {
      text-decoration: underline;
    }

    .error-section {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #fce8e6;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .error-icon {
      color: #d93025;
      font-size: 20px;
      margin-top: 2px;
    }

    .error-section p {
      margin: 0;
      color: #d93025;
      font-size: 14px;
    }

    .trace-result-section {
      margin-bottom: 24px;
    }

    .trace-result-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .details-section {
      margin-bottom: 24px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 16px;
    }

    .detail-row .label {
      min-width: 140px;
      font-size: 14px;
      color: #5f6368;
      font-weight: 500;
    }

    .detail-row .value {
      font-size: 14px;
      color: #202124;
      flex: 1;
    }

    .detail-row .value.link {
      color: #1976d2;
      cursor: pointer;
    }

    .detail-row .value.link:hover {
      text-decoration: underline;
    }

    .result-value {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .result-value .result-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #202124;
    }

    .result-icon {
      font-size: 18px;
    }

    .result-icon.success {
      color: #137333;
    }

    .result-icon.error {
      color: #d93025;
    }

    .result-icon.warning {
      color: #f9ab00;
    }

    .latency-info {
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
      color: #5f6368;
    }

    .latency-info strong {
      color: #202124;
    }

    .drop-reason-section {
      margin-bottom: 24px;
    }

    .drop-reason-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }

    .trace-result {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .trace-result.success {
      background: #e6f4ea;
    }

    .trace-result.error {
      background: #fce8e6;
    }

    .trace-result.warning {
      background: #fef7e0;
    }

    .trace-icon {
      font-size: 20px;
    }

    .trace-icon.success {
      color: #137333;
    }

    .trace-icon.error {
      color: #d93025;
    }

    .trace-icon.warning {
      color: #f9ab00;
    }

    .drop-reason {
      font-size: 14px;
      color: #d93025;
      margin: 12px 0;
      line-height: 1.4;
    }

    .learn-more {
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .config-section {
      margin-bottom: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .trace-section {
      margin-bottom: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .trace-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .trace-section h4 {
      margin: 16px 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }

    .trace-select {
      width: 100%;
      margin-bottom: 16px;
    }

    .trace-details {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .trace-details p {
      margin: 8px 0;
      font-size: 14px;
      color: #202124;
    }

    .trace-details strong {
      color: #5f6368;
      font-weight: 500;
    }

    .warning-text {
      color: #f9ab00 !important;
      font-style: italic;
    }

    .view-link {
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
    }

    .view-link:hover {
      text-decoration: underline;
    }

    .action-buttons {
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Loading state for test details */
    .loading-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-details p {
      margin: 16px 0 0 0;
      color: #5f6368;
      font-size: 14px;
    }

    /* Enhanced table styles */
    .result-text.success {
      color: #137333;
    }

    .result-text.error {
      color: #d93025;
    }

    .result-text.warning {
      color: #f9ab00;
    }

    .protocol-badge {
      background: #e8f0fe;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .test-link {
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
    }

    .test-link:hover {
      text-decoration: underline;
    }

    /* Material expansion panel customization */
    ::ng-deep .mat-expansion-panel {
      margin-bottom: 8px !important;
      border-radius: 4px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    }

    ::ng-deep .mat-expansion-panel-header {
      padding: 12px 16px !important;
    }

    ::ng-deep .mat-expansion-panel-header-title {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
    }

    ::ng-deep .mat-expansion-panel-content {
      font-size: 14px !important;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .protocol-badge {
        background-color: rgba(25, 118, 210, 0.15);
        border: 1px solid rgba(25, 118, 210, 0.3);
        color: #4fc3f7;
      }

      .table-wrapper,
      .side-panel {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-button {
        color: var(--text-color) !important;
      }

      .mat-mdc-raised-button {
        background-color: var(--primary-color) !important;
        color: white !important;
      }

      .mat-mdc-stroked-button {
        color: var(--text-color) !important;
        border-color: var(--border-color) !important;
      }

      .mat-mdc-icon-button {
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-checkbox {
        .mat-mdc-checkbox-frame {
          border-color: var(--border-color) !important;
        }
      }

      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: var(--surface-color) !important;
        }

        .mat-mdc-form-field-input-control {
          color: var(--text-color) !important;
        }

        .mat-mdc-form-field-label {
          color: var(--text-secondary-color) !important;
        }

        .mat-mdc-form-field-outline {
          color: var(--border-color) !important;
        }
      }

      .mat-mdc-select {
        color: var(--text-color) !important;
      }

      .mat-mdc-select-panel {
        background-color: var(--surface-color) !important;
      }

      .mat-mdc-option {
        color: var(--text-color) !important;
      }

      .mat-mdc-option:hover {
        background-color: var(--hover-color) !important;
      }

      .mat-expansion-panel {
        background-color: var(--surface-color) !important;
        color: var(--text-color) !important;
      }

      .mat-expansion-panel-header {
        color: var(--text-color) !important;
      }

      .mat-expansion-panel-body {
        background-color: var(--surface-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-button {
      color: var(--text-color);
    }

    ::ng-deep .mat-mdc-stroked-button {
      color: var(--text-color);
      border-color: var(--border-color);
    }

    ::ng-deep .mat-mdc-icon-button {
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-expansion-panel {
      background-color: var(--surface-color);
      color: var(--text-color);
    }

    ::ng-deep .mat-expansion-panel-header {
      color: var(--text-color);
    }
  `]
})
export class ConnectivityTestsComponent implements OnInit, AfterViewInit {
  connectivityTests: ConnectivityTest[] = [];
  dataSource = new MatTableDataSource<ConnectivityTest>([]);
  displayedColumns: string[] = [
    'select', 'name', 'protocol', 'source', 'destination', 'destinationPort', 
    'lastTestTime', 'lastLiveDataPlaneResult', 'resultDetails'
  ];
  selection = new SelectionModel<ConnectivityTest>(true, []);
  projectId: string | null = null;
  isLoading = true;
  selectedTest: ConnectivityTest | null = null;
  selectedTrace: string = 'forward'; // Default to forward trace
  isLoadingTestDetails = false; // Loading state for test details

  constructor(
    private connectivityTestsService: ConnectivityTestsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe(project => {
      this.projectId = project?.id || null;
      if (this.projectId) {
        this.loadConnectivityTests();
      }
    });

    // Listen for navigation events to refresh data when returning from create page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEnd = event as NavigationEnd;
      if (navEnd.url === '/connectivity-tests' && this.projectId) {
        this.loadConnectivityTests();
      }
    });
  }

  ngAfterViewInit() {
    // This will help refresh the list when returning from the create page
  }

  loadConnectivityTests() {
    if (!this.projectId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.connectivityTestsService.getConnectivityTests(this.projectId).subscribe({
      next: (tests) => {
        console.log('Loaded connectivity tests:', tests);
        this.connectivityTests = tests;
        this.dataSource.data = tests;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading connectivity tests:', error);
        this.isLoading = false;
        this.snackBar.open('Error loading connectivity tests', 'Close', { duration: 3000 });
      }
    });
  }

  getResultClass(result: string): string {
    if (result.includes('delivered') || result.includes('Reachable')) return 'success';
    if (result.includes('dropped') || result.includes('Unreachable')) return 'error';
    if (result.includes('Undetermined') || result.includes('Not eligible')) return 'warning';
    return '';
  }

  refresh() {
    this.loadConnectivityTests();
  }

  createConnectivityTest() {
    this.router.navigate(['/connectivity-tests/create']);
  }

  rerun() {
    const selectedTests = this.selection.selected;
    if (selectedTests.length === 0) {
      this.snackBar.open('Please select connectivity tests to rerun', 'Close', { duration: 3000 });
      return;
    }

    // Mock rerun implementation
    this.snackBar.open(`Rerunning ${selectedTests.length} connectivity test(s)`, 'Close', { duration: 3000 });
  }

  deleteSelected() {
    const selectedTests = this.selection.selected;
    if (selectedTests.length === 0) return;

    // Mock delete implementation
    selectedTests.forEach(test => {
      const index = this.connectivityTests.indexOf(test);
      if (index > -1) {
        this.connectivityTests.splice(index, 1);
      }
    });
    
    this.dataSource.data = [...this.connectivityTests];
    this.selection.clear();
    this.snackBar.open(`Deleted ${selectedTests.length} connectivity test(s)`, 'Close', { duration: 3000 });
  }

  viewTestDetails(test: ConnectivityTest) {
    console.log('Fetching details for test:', test.name);
    
    if (!this.projectId) {
      this.snackBar.open('No project selected', 'Close', { duration: 3000 });
      return;
    }

    // Set loading state and show side panel immediately
    this.isLoadingTestDetails = true;
    this.selectedTest = test; // Show basic info while loading
    
    // Set default trace selection
    this.selectedTrace = 'forward';
    
    // Fetch detailed test information from API
    this.connectivityTestsService.getConnectivityTest(this.projectId, test.name).subscribe({
      next: (detailedTest) => {
        console.log('Received detailed test data:', detailedTest);
        this.selectedTest = detailedTest;
        this.isLoadingTestDetails = false;
        
        // Set default trace selection based on available traces
        if (detailedTest.forwardTrace) {
          this.selectedTrace = 'forward';
        } else if (detailedTest.returnTrace) {
          this.selectedTrace = 'return';
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching test details:', error);
        this.isLoadingTestDetails = false;
        this.snackBar.open('Error loading test details', 'Close', { duration: 3000 });
        
        // Keep the side panel open with basic info on error
        // this.selectedTest will remain as the basic test data
      }
    });
  }

  closeSidePanel() {
    this.selectedTest = null;
    this.selectedTrace = 'forward';
    this.isLoadingTestDetails = false;
  }

  onTraceSelectionChange(traceType: string) {
    this.selectedTrace = traceType;
  }

  getStepIcon(stepType: string): string {
    switch (stepType) {
      case 'VM_INSTANCE': return 'computer';
      case 'FIREWALL_RULE': return 'security';
      case 'SUBNET_ROUTE': return 'route';
      case 'LOAD_BALANCER': return 'balance';
      case 'VPN_GATEWAY': return 'vpn_key';
      case 'NAT_GATEWAY': return 'router';
      case 'EXTERNAL_IP': return 'public';
      default: return 'settings';
    }
  }

  getSourceInstanceName(): string {
    if (!this.selectedTest) return 'unknown';
    
    // Extract instance name from source string
    const source = this.selectedTest.source;
    if (source.includes('(')) {
      return source.split('(')[0].trim();
    }
    return source;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.data.forEach(row => this.selection.select(row));
  }
} 