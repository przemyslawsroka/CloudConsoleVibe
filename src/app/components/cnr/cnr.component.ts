import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  CNRService, 
  IPPool, 
  Subnet, 
  IPAllocation, 
  NetworkDiscovery, 
  IPConflict, 
  CNRSummary 
} from '../../services/cnr.service';

@Component({
  selector: 'app-cnr',
  template: `
    <div class="cnr-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon>language</mat-icon>
          </div>
          <div class="header-text">
            <h1>Cloud Number Registry</h1>
            <p class="header-description">
              Comprehensive IP Address Management as a Service (IPAMaaS) for Google Cloud and hybrid environments.
              <a href="#" class="learn-more-link" (click)="showCNRInfo()">Learn more about CNR</a>
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createIPPool()">
            <mat-icon>add_circle</mat-icon>
            Create IP Pool
          </button>
          <button mat-raised-button color="accent" (click)="startNetworkDiscovery()">
            <mat-icon>search</mat-icon>
            Start Discovery
          </button>
          <button mat-icon-button [matMenuTriggerFor]="menu" class="more-actions">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="refreshData()">
              <mat-icon>refresh</mat-icon>
              Refresh Data
            </button>
            <button mat-menu-item (click)="exportReport()">
              <mat-icon>download</mat-icon>
              Export Report
            </button>
            <button mat-menu-item (click)="viewDocumentation()">
              <mat-icon>help</mat-icon>
              Documentation
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-section" *ngIf="summary">
        <div class="summary-grid">
          <mat-card class="summary-card ip-pools">
            <mat-card-header>
              <mat-card-title>IP Address Pools</mat-card-title>
              <mat-card-subtitle>Centralized IP address space management</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item primary">
                  <span class="stat-value">{{ summary.totalPools }}</span>
                  <span class="stat-label">Total Pools</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item secondary">
                  <span class="stat-value">{{ formatNumber(summary.availableAddresses) }}</span>
                  <span class="stat-label">Available IPs</span>
                </div>
                <div class="utilization-chart">
                  <div class="utilization-bar">
                    <div class="utilization-fill" [style.width.%]="summary.utilizationPercentage"></div>
                  </div>
                  <span class="utilization-text">{{ summary.utilizationPercentage.toFixed(1) }}% Utilized</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card subnets">
            <mat-card-header>
              <mat-card-title>Subnets</mat-card-title>
              <mat-card-subtitle>Network segmentation and organization</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item primary">
                  <span class="stat-value">{{ summary.totalSubnets }}</span>
                  <span class="stat-label">Total Subnets</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item secondary">
                  <span class="stat-value">{{ summary.totalAllocations }}</span>
                  <span class="stat-label">IP Allocations</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card conflicts">
            <mat-card-header>
              <mat-card-title>Network Health</mat-card-title>
              <mat-card-subtitle>Conflicts and discovery status</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item" [class.warning]="summary.conflictsCount > 0">
                  <mat-icon>{{ summary.conflictsCount > 0 ? 'warning' : 'check_circle' }}</mat-icon>
                  <span class="stat-value">{{ summary.conflictsCount }}</span>
                  <span class="stat-label">Active Conflicts</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <mat-icon>search</mat-icon>
                  <span class="stat-value">{{ summary.activeDiscoveries }}</span>
                  <span class="stat-label">Running Discoveries</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card recent-activity">
            <mat-card-header>
              <mat-card-title>Recent Activity</mat-card-title>
              <mat-card-subtitle>Latest IP allocations and changes</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item">
                  <mat-icon>schedule</mat-icon>
                  <span class="stat-value">{{ summary.recentAllocations }}</span>
                  <span class="stat-label">New Allocations (7 days)</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button mat-stroked-button (click)="allocateIP()">
          <mat-icon>add</mat-icon>
          Allocate IP Address
        </button>
        <button mat-stroked-button (click)="createSubnet()">
          <mat-icon>lan</mat-icon>
          Create Subnet
        </button>
        <button mat-stroked-button (click)="viewUtilizationReport()">
          <mat-icon>analytics</mat-icon>
          Utilization Report
        </button>
      </div>

      <!-- Main Content Tabs -->
      <mat-card class="main-content">
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          
          <!-- IP Pools Tab -->
          <mat-tab label="IP Pools">
            <div class="tab-content">
              <div class="tab-header">
                <div class="tab-info">
                  <h3>IP Address Pools</h3>
                  <p>Manage centralized IP address pools across your Google Cloud and hybrid infrastructure</p>
                </div>
                <button mat-raised-button color="primary" (click)="createIPPool()">
                  <mat-icon>add</mat-icon>
                  Create IP Pool
                </button>
              </div>

              <div class="filter-section">
                <mat-form-field appearance="outline">
                  <mat-label>Filter pools</mat-label>
                  <input matInput (keyup)="applyIPPoolFilter($event)" placeholder="Filter by name, CIDR, or region">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(value)]="selectedPoolStatus" (selectionChange)="filterPoolsByStatus()">
                    <mat-option value="">All Statuses</mat-option>
                    <mat-option value="Active">Active</mat-option>
                    <mat-option value="Reserved">Reserved</mat-option>
                    <mat-option value="Deprecated">Deprecated</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="filteredIPPools" class="ip-pools-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let pool">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(pool.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(pool.status) }}</mat-icon>
                          {{ pool.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let pool">
                      <div class="pool-info">
                        <a href="#" class="pool-link" (click)="viewPoolDetails(pool)">{{ pool.name }}</a>
                        <span class="pool-description">{{ pool.description }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cidr">
                    <th mat-header-cell *matHeaderCellDef>CIDR</th>
                    <td mat-cell *matCellDef="let pool">
                      <code class="cidr-code">{{ pool.cidr }}</code>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="utilization">
                    <th mat-header-cell *matHeaderCellDef>Utilization</th>
                    <td mat-cell *matCellDef="let pool">
                      <div class="utilization-display">
                        <div class="utilization-bar small">
                          <div class="utilization-fill" [style.width.%]="pool.utilizationPercentage"></div>
                        </div>
                        <span class="utilization-text">{{ pool.utilizationPercentage.toFixed(1) }}%</span>
                        <span class="addresses-text">{{ formatNumber(pool.allocatedAddresses) }} / {{ formatNumber(pool.totalAddresses) }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="region">
                    <th mat-header-cell *matHeaderCellDef>Region</th>
                    <td mat-cell *matCellDef="let pool">{{ pool.region }}</td>
                  </ng-container>

                  <ng-container matColumnDef="vpc">
                    <th mat-header-cell *matHeaderCellDef>VPC</th>
                    <td mat-cell *matCellDef="let pool">
                      <span *ngIf="pool.vpc" class="vpc-link">{{ pool.vpc }}</span>
                      <span *ngIf="!pool.vpc" class="no-vpc">No VPC</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let pool">
                      <button mat-icon-button [matMenuTriggerFor]="poolMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #poolMenu="matMenu">
                        <button mat-menu-item (click)="viewPoolDetails(pool)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editPool(pool)">
                          <mat-icon>edit</mat-icon>
                          Edit Pool
                        </button>
                        <button mat-menu-item (click)="createSubnetFromPool(pool)">
                          <mat-icon>lan</mat-icon>
                          Create Subnet
                        </button>
                        <button mat-menu-item (click)="deletePool(pool)">
                          <mat-icon>delete</mat-icon>
                          Delete Pool
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="ipPoolColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: ipPoolColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Subnets Tab -->
          <mat-tab label="Subnets">
            <div class="tab-content">
              <div class="tab-header">
                <div class="tab-info">
                  <h3>Subnets</h3>
                  <p>Manage subnet allocation and configuration within your IP pools</p>
                </div>
                <button mat-raised-button color="primary" (click)="createSubnet()">
                  <mat-icon>add</mat-icon>
                  Create Subnet
                </button>
              </div>

              <div class="filter-section">
                <mat-form-field appearance="outline">
                  <mat-label>Filter subnets</mat-label>
                  <input matInput (keyup)="applySubnetFilter($event)" placeholder="Filter by name, CIDR, or VPC">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="filteredSubnets" class="subnets-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let subnet">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(subnet.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(subnet.status) }}</mat-icon>
                          {{ subnet.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let subnet">
                      <a href="#" class="subnet-link" (click)="viewSubnetDetails(subnet)">{{ subnet.name }}</a>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cidr">
                    <th mat-header-cell *matHeaderCellDef>CIDR</th>
                    <td mat-cell *matCellDef="let subnet">
                      <code class="cidr-code">{{ subnet.cidr }}</code>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="utilization">
                    <th mat-header-cell *matHeaderCellDef>Utilization</th>
                    <td mat-cell *matCellDef="let subnet">
                      <div class="utilization-display">
                        <div class="utilization-bar small">
                          <div class="utilization-fill" [style.width.%]="subnet.utilizationPercentage"></div>
                        </div>
                        <span class="utilization-text">{{ subnet.utilizationPercentage.toFixed(1) }}%</span>
                        <span class="addresses-text">{{ subnet.allocatedAddresses }} / {{ subnet.totalAddresses }}</span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="vpc">
                    <th mat-header-cell *matHeaderCellDef>VPC</th>
                    <td mat-cell *matCellDef="let subnet">{{ subnet.vpc }}</td>
                  </ng-container>

                  <ng-container matColumnDef="region">
                    <th mat-header-cell *matHeaderCellDef>Region</th>
                    <td mat-cell *matCellDef="let subnet">{{ subnet.region }}</td>
                  </ng-container>

                  <ng-container matColumnDef="gateway">
                    <th mat-header-cell *matHeaderCellDef>Gateway</th>
                    <td mat-cell *matCellDef="let subnet">
                      <code class="ip-code">{{ subnet.gatewayIp }}</code>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="dhcp">
                    <th mat-header-cell *matHeaderCellDef>DHCP</th>
                    <td mat-cell *matCellDef="let subnet">
                      <mat-icon [class.enabled]="subnet.dhcpEnabled" [class.disabled]="!subnet.dhcpEnabled">
                        {{ subnet.dhcpEnabled ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let subnet">
                      <button mat-icon-button [matMenuTriggerFor]="subnetMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #subnetMenu="matMenu">
                        <button mat-menu-item (click)="viewSubnetDetails(subnet)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editSubnet(subnet)">
                          <mat-icon>edit</mat-icon>
                          Edit Subnet
                        </button>
                        <button mat-menu-item (click)="allocateIPInSubnet(subnet)">
                          <mat-icon>add</mat-icon>
                          Allocate IP
                        </button>
                        <button mat-menu-item (click)="deleteSubnet(subnet)">
                          <mat-icon>delete</mat-icon>
                          Delete Subnet
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="subnetColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: subnetColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- IP Allocations Tab -->
          <mat-tab label="IP Allocations">
            <div class="tab-content">
              <div class="tab-header">
                <div class="tab-info">
                  <h3>IP Allocations</h3>
                  <p>Track and manage individual IP address assignments across your infrastructure</p>
                </div>
                <button mat-raised-button color="primary" (click)="allocateIP()">
                  <mat-icon>add</mat-icon>
                  Allocate IP
                </button>
              </div>

              <div class="filter-section">
                <mat-form-field appearance="outline">
                  <mat-label>Filter allocations</mat-label>
                  <input matInput (keyup)="applyAllocationFilter($event)" placeholder="Filter by IP, hostname, or resource">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [(value)]="selectedAllocationStatus" (selectionChange)="filterAllocationsByStatus()">
                    <mat-option value="">All Statuses</mat-option>
                    <mat-option value="Allocated">Allocated</mat-option>
                    <mat-option value="Reserved">Reserved</mat-option>
                    <mat-option value="Available">Available</mat-option>
                    <mat-option value="Conflict">Conflict</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="filteredIPAllocations" class="allocations-table">
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let allocation">
                      <mat-chip-set>
                        <mat-chip [ngClass]="getStatusClass(allocation.status)" selected>
                          <mat-icon matChipAvatar>{{ getStatusIcon(allocation.status) }}</mat-icon>
                          {{ allocation.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="ipAddress">
                    <th mat-header-cell *matHeaderCellDef>IP Address</th>
                    <td mat-cell *matCellDef="let allocation">
                      <code class="ip-code">{{ allocation.ipAddress }}</code>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="assignedTo">
                    <th mat-header-cell *matHeaderCellDef>Assigned To</th>
                    <td mat-cell *matCellDef="let allocation">
                      <div class="assignment-info" *ngIf="allocation.assignedTo">
                        <span class="resource-name">{{ allocation.assignedTo }}</span>
                        <span class="resource-type" *ngIf="allocation.resourceType">{{ allocation.resourceType }}</span>
                      </div>
                      <span *ngIf="!allocation.assignedTo" class="unassigned">Unassigned</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="hostname">
                    <th mat-header-cell *matHeaderCellDef>Hostname</th>
                    <td mat-cell *matCellDef="let allocation">
                      <code *ngIf="allocation.hostName" class="hostname-code">{{ allocation.hostName }}</code>
                      <span *ngIf="!allocation.hostName" class="no-hostname">—</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="subnet">
                    <th mat-header-cell *matHeaderCellDef>Subnet</th>
                    <td mat-cell *matCellDef="let allocation">{{ getSubnetName(allocation.subnet) }}</td>
                  </ng-container>

                  <ng-container matColumnDef="lastSeen">
                    <th mat-header-cell *matHeaderCellDef>Last Seen</th>
                    <td mat-cell *matCellDef="let allocation">
                      <span *ngIf="allocation.lastSeen">{{ allocation.lastSeen | date:'short' }}</span>
                      <span *ngIf="!allocation.lastSeen" class="never-seen">Never</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let allocation">
                      <button mat-icon-button [matMenuTriggerFor]="allocationMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #allocationMenu="matMenu">
                        <button mat-menu-item (click)="viewAllocationDetails(allocation)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item (click)="editAllocation(allocation)">
                          <mat-icon>edit</mat-icon>
                          Edit Allocation
                        </button>
                        <button mat-menu-item (click)="releaseIP(allocation)" [disabled]="allocation.status === 'Available'">
                          <mat-icon>remove_circle</mat-icon>
                          Release IP
                        </button>
                        <button mat-menu-item (click)="pingIP(allocation)" [disabled]="allocation.status !== 'Allocated'">
                          <mat-icon>network_ping</mat-icon>
                          Ping Test
                        </button>
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="allocationColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: allocationColumns;"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Network Discovery Tab -->
          <mat-tab label="Network Discovery">
            <div class="tab-content">
              <div class="tab-header">
                <div class="tab-info">
                  <h3>Network Discovery</h3>
                  <p>Automated discovery of network devices and IP address assignments</p>
                </div>
                <button mat-raised-button color="primary" (click)="startNetworkDiscovery()">
                  <mat-icon>search</mat-icon>
                  Start Discovery
                </button>
              </div>

              <div class="discovery-grid">
                <mat-card *ngFor="let discovery of networkDiscoveries" class="discovery-card">
                  <mat-card-header>
                    <mat-card-title>{{ discovery.name }}</mat-card-title>
                    <mat-card-subtitle>
                      <mat-chip-set>
                        <mat-chip [ngClass]="getDiscoveryStatusClass(discovery.status)" selected>
                          <mat-icon matChipAvatar>{{ getDiscoveryStatusIcon(discovery.status) }}</mat-icon>
                          {{ discovery.status }}
                        </mat-chip>
                      </mat-chip-set>
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="discovery-stats">
                      <div class="stat-row">
                        <span class="label">Target Networks:</span>
                        <span class="value">{{ discovery.targetNetworks.join(', ') }}</span>
                      </div>
                      <div class="stat-row">
                        <span class="label">Discovered Devices:</span>
                        <span class="value">{{ discovery.discoveredDevices }}</span>
                      </div>
                      <div class="stat-row">
                        <span class="label">New Allocations:</span>
                        <span class="value">{{ discovery.newAllocations }}</span>
                      </div>
                      <div class="stat-row" *ngIf="discovery.conflicts > 0">
                        <span class="label">Conflicts Found:</span>
                        <span class="value warning">{{ discovery.conflicts }}</span>
                      </div>
                      <div class="stat-row">
                        <span class="label">Last Run:</span>
                        <span class="value">{{ discovery.lastRun | date:'short' }}</span>
                      </div>
                      <div class="stat-row" *ngIf="discovery.nextRun">
                        <span class="label">Next Run:</span>
                        <span class="value">{{ discovery.nextRun | date:'short' }}</span>
                      </div>
                    </div>
                    <div *ngIf="discovery.status === 'Running' && discovery.progress" class="progress-section">
                      <mat-progress-bar mode="determinate" [value]="discovery.progress"></mat-progress-bar>
                      <span class="progress-text">{{ discovery.progress }}% complete</span>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-button (click)="viewDiscoveryDetails(discovery)">
                      <mat-icon>visibility</mat-icon>
                      View Details
                    </button>
                    <button mat-button (click)="stopDiscovery(discovery)" [disabled]="discovery.status !== 'Running'">
                      <mat-icon>stop</mat-icon>
                      Stop
                    </button>
                    <button mat-icon-button [matMenuTriggerFor]="discoveryMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #discoveryMenu="matMenu">
                      <button mat-menu-item (click)="editDiscovery(discovery)">
                        <mat-icon>edit</mat-icon>
                        Edit Discovery
                      </button>
                      <button mat-menu-item (click)="cloneDiscovery(discovery)">
                        <mat-icon>content_copy</mat-icon>
                        Clone Discovery
                      </button>
                      <button mat-menu-item (click)="deleteDiscovery(discovery)">
                        <mat-icon>delete</mat-icon>
                        Delete Discovery
                      </button>
                    </mat-menu>
                  </mat-card-actions>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <!-- Conflicts Tab -->
          <mat-tab label="Conflicts" [disabled]="ipConflicts.length === 0">
            <div class="tab-content">
              <div class="tab-header">
                <div class="tab-info">
                  <h3>IP Conflicts</h3>
                  <p>Resolve IP address conflicts and network issues</p>
                </div>
              </div>

              <div class="conflicts-list" *ngIf="ipConflicts.length > 0">
                <mat-card *ngFor="let conflict of ipConflicts" class="conflict-card">
                  <mat-card-header>
                    <mat-card-title>
                      <code class="ip-code">{{ conflict.ipAddress }}</code>
                      <mat-chip-set>
                        <mat-chip [ngClass]="getSeverityClass(conflict.severity)" selected>
                          <mat-icon matChipAvatar>{{ getSeverityIcon(conflict.severity) }}</mat-icon>
                          {{ conflict.severity }}
                        </mat-chip>
                      </mat-chip-set>
                    </mat-card-title>
                    <mat-card-subtitle>{{ conflict.conflictType }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p class="conflict-description">{{ conflict.description }}</p>
                    <div class="affected-resources">
                      <h4>Affected Resources:</h4>
                      <mat-chip-set>
                        <mat-chip *ngFor="let resource of conflict.affectedResources">{{ resource }}</mat-chip>
                      </mat-chip-set>
                    </div>
                    <div class="conflict-details">
                      <div class="detail-row">
                        <span class="label">Detected:</span>
                        <span class="value">{{ conflict.detectedDate | date:'short' }}</span>
                      </div>
                      <div class="detail-row" *ngIf="conflict.assignedTo">
                        <span class="label">Assigned To:</span>
                        <span class="value">{{ conflict.assignedTo }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="value">
                          <mat-chip-set>
                            <mat-chip [ngClass]="getConflictStatusClass(conflict.status)" selected>
                              {{ conflict.status }}
                            </mat-chip>
                          </mat-chip-set>
                        </span>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-raised-button color="primary" (click)="resolveConflict(conflict)" [disabled]="conflict.status === 'Resolved'">
                      <mat-icon>check</mat-icon>
                      Resolve
                    </button>
                    <button mat-button (click)="assignConflict(conflict)">
                      <mat-icon>person_add</mat-icon>
                      Assign
                    </button>
                    <button mat-button (click)="viewConflictDetails(conflict)">
                      <mat-icon>visibility</mat-icon>
                      Details
                    </button>
                  </mat-card-actions>
                </mat-card>
              </div>

              <div *ngIf="ipConflicts.length === 0" class="no-conflicts">
                <mat-icon>check_circle</mat-icon>
                <h3>No Active Conflicts</h3>
                <p>Your network is healthy with no IP address conflicts detected.</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styleUrls: ['./cnr.component.scss']
})
export class CNRComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  ipPools: IPPool[] = [];
  subnets: Subnet[] = [];
  ipAllocations: IPAllocation[] = [];
  networkDiscoveries: NetworkDiscovery[] = [];
  ipConflicts: IPConflict[] = [];
  summary: CNRSummary | null = null;
  
  // Filtered data for tables
  filteredIPPools: IPPool[] = [];
  filteredSubnets: Subnet[] = [];
  filteredIPAllocations: IPAllocation[] = [];
  
  // UI state
  selectedTabIndex = 0;
  selectedPoolStatus = '';
  selectedAllocationStatus = '';
  
  // Table column definitions
  ipPoolColumns = ['status', 'name', 'cidr', 'utilization', 'region', 'vpc', 'actions'];
  subnetColumns = ['status', 'name', 'cidr', 'utilization', 'vpc', 'region', 'gateway', 'dhcp', 'actions'];
  allocationColumns = ['status', 'ipAddress', 'assignedTo', 'hostname', 'subnet', 'lastSeen', 'actions'];

  constructor(
    private cnrService: CNRService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    // Load IP pools
    this.cnrService.getIPPools()
      .pipe(takeUntil(this.destroy$))
      .subscribe(pools => {
        this.ipPools = pools;
        this.filteredIPPools = pools;
      });

    // Load subnets
    this.cnrService.getSubnets()
      .pipe(takeUntil(this.destroy$))
      .subscribe(subnets => {
        this.subnets = subnets;
        this.filteredSubnets = subnets;
      });

    // Load IP allocations
    this.cnrService.getIPAllocations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(allocations => {
        this.ipAllocations = allocations;
        this.filteredIPAllocations = allocations;
      });

    // Load network discoveries
    this.cnrService.getNetworkDiscoveries()
      .pipe(takeUntil(this.destroy$))
      .subscribe(discoveries => {
        this.networkDiscoveries = discoveries;
      });

    // Load IP conflicts
    this.cnrService.getIPConflicts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(conflicts => {
        this.ipConflicts = conflicts;
      });

    // Load summary
    this.cnrService.getCNRSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.summary = summary;
      });
  }

  // Utility methods for styling
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': case 'allocated': return 'status-success';
      case 'deprecated': case 'conflict': return 'status-error';
      case 'reserved': return 'status-warning';
      case 'available': return 'status-info';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': case 'allocated': return 'check_circle';
      case 'deprecated': case 'conflict': return 'error';
      case 'reserved': return 'schedule';
      case 'available': return 'radio_button_unchecked';
      default: return 'help';
    }
  }

  getDiscoveryStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-success';
      case 'running': return 'status-info';
      case 'failed': return 'status-error';
      case 'scheduled': return 'status-warning';
      default: return '';
    }
  }

  getDiscoveryStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'running': return 'autorenew';
      case 'failed': return 'error';
      case 'scheduled': return 'schedule';
      default: return 'help';
    }
  }

  getSeverityClass(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return 'report';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'help';
      default: return 'help';
    }
  }

  getConflictStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'resolved': return 'status-success';
      case 'open': return 'status-error';
      case 'investigating': return 'status-warning';
      case 'ignored': return 'status-disabled';
      default: return '';
    }
  }

  // Filter methods
  applyIPPoolFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredIPPools = this.ipPools.filter(pool =>
      pool.name.toLowerCase().includes(filterValue) ||
      pool.cidr.toLowerCase().includes(filterValue) ||
      pool.region.toLowerCase().includes(filterValue) ||
      pool.description.toLowerCase().includes(filterValue)
    );
  }

  applySubnetFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredSubnets = this.subnets.filter(subnet =>
      subnet.name.toLowerCase().includes(filterValue) ||
      subnet.cidr.toLowerCase().includes(filterValue) ||
      subnet.vpc.toLowerCase().includes(filterValue)
    );
  }

  applyAllocationFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredIPAllocations = this.ipAllocations.filter(allocation =>
      allocation.ipAddress.toLowerCase().includes(filterValue) ||
      (allocation.hostName && allocation.hostName.toLowerCase().includes(filterValue)) ||
      (allocation.assignedTo && allocation.assignedTo.toLowerCase().includes(filterValue))
    );
  }

  filterPoolsByStatus(): void {
    if (this.selectedPoolStatus) {
      this.filteredIPPools = this.ipPools.filter(pool => pool.status === this.selectedPoolStatus);
    } else {
      this.filteredIPPools = this.ipPools;
    }
  }

  filterAllocationsByStatus(): void {
    if (this.selectedAllocationStatus) {
      this.filteredIPAllocations = this.ipAllocations.filter(allocation => allocation.status === this.selectedAllocationStatus);
    } else {
      this.filteredIPAllocations = this.ipAllocations;
    }
  }

  // Helper methods
  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getSubnetName(subnetId: string): string {
    const subnet = this.subnets.find(s => s.id === subnetId);
    return subnet ? subnet.name : subnetId;
  }

  // Tab management
  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }

  // Action methods - these would open dialogs or navigate to detail views
  createIPPool(): void {
    console.log('Creating IP pool...');
  }

  createSubnet(): void {
    console.log('Creating subnet...');
  }

  allocateIP(): void {
    console.log('Allocating IP address...');
  }

  startNetworkDiscovery(): void {
    console.log('Starting network discovery...');
  }

  refreshData(): void {
    this.cnrService.refreshData();
    this.loadData();
  }

  exportReport(): void {
    console.log('Exporting report...');
  }

  viewDocumentation(): void {
    window.open('https://cloud.google.com/docs/cnr', '_blank');
  }

  showCNRInfo(): void {
    console.log('Showing CNR information...');
  }

  viewUtilizationReport(): void {
    console.log('Viewing utilization report...');
  }

  // Detail view methods
  viewPoolDetails(pool: IPPool): void {
    console.log('Viewing pool details:', pool);
  }

  viewSubnetDetails(subnet: Subnet): void {
    console.log('Viewing subnet details:', subnet);
  }

  viewAllocationDetails(allocation: IPAllocation): void {
    console.log('Viewing allocation details:', allocation);
  }

  viewDiscoveryDetails(discovery: NetworkDiscovery): void {
    console.log('Viewing discovery details:', discovery);
  }

  viewConflictDetails(conflict: IPConflict): void {
    console.log('Viewing conflict details:', conflict);
  }

  // Edit methods
  editPool(pool: IPPool): void {
    console.log('Editing pool:', pool);
  }

  editSubnet(subnet: Subnet): void {
    console.log('Editing subnet:', subnet);
  }

  editAllocation(allocation: IPAllocation): void {
    console.log('Editing allocation:', allocation);
  }

  editDiscovery(discovery: NetworkDiscovery): void {
    console.log('Editing discovery:', discovery);
  }

  // Delete methods
  deletePool(pool: IPPool): void {
    console.log('Deleting pool:', pool);
  }

  deleteSubnet(subnet: Subnet): void {
    console.log('Deleting subnet:', subnet);
  }

  deleteDiscovery(discovery: NetworkDiscovery): void {
    console.log('Deleting discovery:', discovery);
  }

  // Specific action methods
  createSubnetFromPool(pool: IPPool): void {
    console.log('Creating subnet from pool:', pool);
  }

  allocateIPInSubnet(subnet: Subnet): void {
    console.log('Allocating IP in subnet:', subnet);
  }

  releaseIP(allocation: IPAllocation): void {
    console.log('Releasing IP:', allocation);
  }

  pingIP(allocation: IPAllocation): void {
    console.log('Pinging IP:', allocation);
  }

  stopDiscovery(discovery: NetworkDiscovery): void {
    console.log('Stopping discovery:', discovery);
  }

  cloneDiscovery(discovery: NetworkDiscovery): void {
    console.log('Cloning discovery:', discovery);
  }

  resolveConflict(conflict: IPConflict): void {
    this.cnrService.resolveConflict(conflict.id).subscribe(() => {
      console.log('Conflict resolved:', conflict);
    });
  }

  assignConflict(conflict: IPConflict): void {
    console.log('Assigning conflict:', conflict);
  }
} 