import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { ConnectivityTestsService, ConnectivityTest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';
import { SelectionModel } from '@angular/cdk/collections';
import { CreateConnectivityTestDialogComponent, CreateConnectivityTestDialogData } from './create-connectivity-test-dialog.component';

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
            <!-- Test Overview -->
            <div class="result-section">
              <h3>Result</h3>
              <div class="result-status">
                <mat-icon class="status-icon success">check_circle</mat-icon>
                <span class="status-text">{{ selectedTest.overallConfigurationResult }}</span>
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
                  <mat-icon class="result-icon">trending_up</mat-icon>
                  <span class="result-text">{{ selectedTest.lastLiveDataPlaneResult }}</span>
                  <div class="latency-info" *ngIf="selectedTest.lastLiveDataPlaneResult.includes('delivered')">
                    <small>Latency (one-way): <strong>Median: 51.35 ms</strong></small><br>
                    <small>95th percentile: 51.41 ms</small>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <span class="label">Overall configuration analysis result</span>
                <div class="result-value">
                  <mat-icon class="result-icon success">check_circle</mat-icon>
                  <span class="result-text">{{ selectedTest.overallConfigurationResult }}</span>
                  <small>{{ selectedTest.lastTestTime }}</small>
                </div>
              </div>
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

            <!-- Configuration Analysis Trace -->
            <div class="trace-section">
              <h3>Configuration analysis trace selection</h3>
              <mat-form-field appearance="outline" class="trace-select">
                <mat-label>Select trace</mat-label>
                <mat-select value="trace0">
                  <mat-option value="trace0">trace0</mat-option>
                </mat-select>
              </mat-form-field>

              <h4>Analysis result for selected trace</h4>
              <div class="trace-result">
                <mat-icon class="trace-icon success">check_circle</mat-icon>
                <span>Packet could be delivered</span>
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
  `,
  styles: [`
    .connectivity-tests-container {
      padding: 20px;
      max-width: 100%;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
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
      color: #202124;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .description-text {
      margin: 16px 0;
      color: #5f6368;
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
      border-bottom: 1px solid #e0e0e0;
    }

    .filter-btn {
      margin-right: 16px;
    }

    .filter-text {
      color: #5f6368;
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
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
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
      background-color: #e8f0fe;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
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
      color: #5f6368;
    }

    /* Header styling */
    ::ng-deep .mat-header-cell {
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 16px;
    }

    ::ng-deep .mat-cell {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f3f4;
    }

    ::ng-deep .mat-row:hover {
      background-color: #f8f9fa;
    }

    /* Remove default table styling */
    ::ng-deep .mat-table {
      background: transparent;
    }

    ::ng-deep .mat-header-row {
      background-color: #f8f9fa;
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
      top: 64px; /* Account for toolbar height */
      right: 0;
      width: 500px;
      height: calc(100vh - 64px);
      background: white;
      box-shadow: -4px 0 8px rgba(0, 0, 0, 0.12);
      z-index: 100;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    }

    .side-panel-open .side-panel {
      transform: translateX(0);
    }

    .side-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e8eaed;
      background: #f8f9fa;
    }

    .side-panel-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
    }

    .close-btn {
      color: #5f6368;
    }

    .side-panel-content {
      padding: 24px;
    }

    .result-section {
      margin-bottom: 32px;
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
      gap: 8px;
    }

    .status-icon.success {
      color: #137333;
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: #137333;
    }

    .details-section, .config-section {
      margin-bottom: 32px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f3f4;
    }

    .label {
      font-weight: 500;
      font-size: 14px;
      color: #5f6368;
      flex: 1;
    }

    .value {
      font-size: 14px;
      color: #202124;
      flex: 1;
      text-align: right;
    }

    .value.link {
      color: #1976d2;
      cursor: pointer;
    }

    .value.link:hover {
      text-decoration: underline;
    }

    .result-value {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .result-icon.success {
      color: #137333;
    }

    .result-text {
      font-size: 14px;
      color: #202124;
    }

    .latency-info {
      font-size: 12px;
      color: #5f6368;
      text-align: right;
    }

    .trace-section {
      margin-bottom: 32px;
    }

    .trace-section h3, .trace-section h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #202124;
    }

    .trace-section h4 {
      font-size: 14px;
      margin-top: 24px;
    }

    .trace-select {
      width: 100%;
      margin-bottom: 16px;
    }

    .trace-result {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      padding: 12px;
      background: #e8f5e8;
      border-radius: 8px;
    }

    .trace-icon.success {
      color: #137333;
    }

    /* Expansion panels */
    ::ng-deep .mat-expansion-panel {
      margin-bottom: 8px;
      box-shadow: none;
      border: 1px solid #e8eaed;
    }

    ::ng-deep .mat-expansion-panel-header {
      padding: 16px;
    }

    ::ng-deep .mat-expansion-panel-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .trace-details {
      padding: 16px;
      font-size: 14px;
    }

    .trace-details p {
      margin: 8px 0;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e8eaed;
    }
  `]
})
export class ConnectivityTestsComponent implements OnInit {
  connectivityTests: ConnectivityTest[] = [];
  dataSource = new MatTableDataSource<ConnectivityTest>([]);
  displayedColumns: string[] = [
    'select', 'name', 'protocol', 'source', 'destination', 'destinationPort',
    'lastTestTime', 'lastLiveDataPlaneResult', 'overallConfigurationResult', 'resultDetails'
  ];
  selection = new SelectionModel<ConnectivityTest>(true, []);
  projectId: string | null = null;
  isLoading = true;
  selectedTest: ConnectivityTest | null = null;

  constructor(
    private connectivityTestsService: ConnectivityTestsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      console.log('Project changed:', project);
      this.loadConnectivityTests();
    });

    // Fallback: load data immediately for testing
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Fallback: loading connectivity tests without project');
        this.loadConnectivityTests();
      }
    }, 1000);
  }

  loadConnectivityTests() {
    this.isLoading = true;
    console.log('Loading connectivity tests for project:', this.projectId);
    
    this.connectivityTestsService.getConnectivityTests(this.projectId || 'mock-project').subscribe({
      next: (response) => {
        console.log('Connectivity tests loaded:', response);
        console.log('Number of tests:', response?.length || 0);
        this.connectivityTests = response || [];
        this.dataSource.data = [...this.connectivityTests];
        console.log('Filtered data set:', this.dataSource.data);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading connectivity tests:', error);
        this.connectivityTests = [];
        this.dataSource.data = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getResultClass(result: string): string {
    if (result.includes('Reachable')) return 'reachable';
    if (result.includes('Not eligible')) return 'not-eligible';
    if (result.includes('Undetermined')) return 'undetermined';
    if (result.includes('packets delivered')) return 'delivered';
    return '';
  }

  refresh() {
    this.loadConnectivityTests();
  }

  createConnectivityTest() {
    const dialogRef = this.dialog.open(CreateConnectivityTestDialogComponent, {
      data: {} as CreateConnectivityTestDialogData,
      width: '700px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.projectId) {
        this.connectivityTestsService.createConnectivityTest(this.projectId, result).subscribe({
          next: (newTest) => {
            this.loadConnectivityTests();
            this.snackBar.open(`Connectivity test "${newTest.name}" created successfully`, 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error creating connectivity test:', error);
            this.snackBar.open('Error creating connectivity test', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  rerun() {
    const selectedTests = this.selection.selected;
    if (selectedTests.length === 0) {
      this.snackBar.open('Please select tests to rerun', 'Close', { duration: 3000 });
      return;
    }

    console.log('Rerunning tests:', selectedTests);
    this.snackBar.open(`Rerunning ${selectedTests.length} connectivity test(s)`, 'Close', { duration: 3000 });
    // TODO: Implement actual rerun functionality
  }

  deleteSelected() {
    const selectedTests = this.selection.selected;
    if (selectedTests.length === 0) return;

    const confirmMessage = selectedTests.length === 1 
      ? `Are you sure you want to delete the connectivity test "${selectedTests[0].name}"?`
      : `Are you sure you want to delete ${selectedTests.length} connectivity tests?`;

    if (confirm(confirmMessage)) {
      console.log('Deleting tests:', selectedTests);
      this.snackBar.open(`Deleted ${selectedTests.length} connectivity test(s)`, 'Close', { duration: 3000 });
      // TODO: Implement actual delete functionality
      this.selection.clear();
    }
  }

  viewTestDetails(test: ConnectivityTest) {
    console.log('View test details:', test);
    this.selectedTest = test;
  }

  closeSidePanel() {
    this.selectedTest = null;
  }

  getSourceInstanceName(): string {
    if (!this.selectedTest) return '';
    
    // Extract instance name from source string
    const source = this.selectedTest.source;
    if (source.includes('(')) {
      return source.split('(')[0].trim();
    }
    return source;
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }
} 