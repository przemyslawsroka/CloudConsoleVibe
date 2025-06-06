import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface IPPool {
  id: string;
  name: string;
  cidr: string;
  description: string;
  status: 'Active' | 'Reserved' | 'Deprecated';
  region: string;
  vpc?: string;
  totalAddresses: number;
  allocatedAddresses: number;
  availableAddresses: number;
  utilizationPercentage: number;
  createdDate: Date;
  lastModified: Date;
  tags: string[];
}

export interface Subnet {
  id: string;
  name: string;
  cidr: string;
  parentPool: string;
  status: 'Active' | 'Reserved' | 'Deprecated';
  region: string;
  zone?: string;
  vpc: string;
  gatewayIp: string;
  dhcpEnabled: boolean;
  dnsServers: string[];
  totalAddresses: number;
  allocatedAddresses: number;
  availableAddresses: number;
  utilizationPercentage: number;
  createdDate: Date;
  lastModified: Date;
}

export interface IPAllocation {
  id: string;
  ipAddress: string;
  subnet: string;
  status: 'Allocated' | 'Reserved' | 'Available' | 'Conflict';
  assignedTo?: string;
  resourceType?: 'VM Instance' | 'Load Balancer' | 'VPN Gateway' | 'Database' | 'Container' | 'Other';
  resourceId?: string;
  hostName?: string;
  description?: string;
  macAddress?: string;
  leaseExpiry?: Date;
  allocationDate: Date;
  lastSeen?: Date;
}

export interface NetworkDiscovery {
  id: string;
  name: string;
  type: 'Scheduled' | 'On-Demand';
  status: 'Running' | 'Completed' | 'Failed' | 'Scheduled';
  targetNetworks: string[];
  discoveredDevices: number;
  newAllocations: number;
  conflicts: number;
  lastRun: Date;
  nextRun?: Date;
  duration?: number;
  progress?: number;
}

export interface IPConflict {
  id: string;
  ipAddress: string;
  conflictType: 'Duplicate Assignment' | 'Overlapping Subnet' | 'Invalid Range' | 'DNS Mismatch';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  affectedResources: string[];
  detectedDate: Date;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Ignored';
  assignedTo?: string;
}

export interface CNRSummary {
  totalPools: number;
  totalSubnets: number;
  totalAllocations: number;
  utilizationPercentage: number;
  availableAddresses: number;
  conflictsCount: number;
  activeDiscoveries: number;
  recentAllocations: number;
}

@Injectable({
  providedIn: 'root'
})
export class CNRService {
  private readonly API_BASE_URL = 'https://cnr.googleapis.com/v1';
  
  private ipPoolsSubject = new BehaviorSubject<IPPool[]>([]);
  private subnetsSubject = new BehaviorSubject<Subnet[]>([]);
  private ipAllocationsSubject = new BehaviorSubject<IPAllocation[]>([]);
  private networkDiscoveriesSubject = new BehaviorSubject<NetworkDiscovery[]>([]);
  private ipConflictsSubject = new BehaviorSubject<IPConflict[]>([]);

  public ipPools$ = this.ipPoolsSubject.asObservable();
  public subnets$ = this.subnetsSubject.asObservable();
  public ipAllocations$ = this.ipAllocationsSubject.asObservable();
  public networkDiscoveries$ = this.networkDiscoveriesSubject.asObservable();
  public ipConflicts$ = this.ipConflictsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeMockData();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  private initializeMockData(): void {
    const mockIPPools: IPPool[] = [
      {
        id: '1',
        name: 'Production Network Pool',
        cidr: '10.0.0.0/16',
        description: 'Primary production environment IP pool',
        status: 'Active',
        region: 'us-central1',
        vpc: 'production-vpc',
        totalAddresses: 65536,
        allocatedAddresses: 32450,
        availableAddresses: 33086,
        utilizationPercentage: 49.5,
        createdDate: new Date(Date.now() - 86400000 * 60),
        lastModified: new Date(Date.now() - 86400000 * 2),
        tags: ['production', 'primary', 'us-central']
      },
      {
        id: '2',
        name: 'Development Network Pool',
        cidr: '10.1.0.0/16',
        description: 'Development and testing environment pool',
        status: 'Active',
        region: 'us-west1',
        vpc: 'development-vpc',
        totalAddresses: 65536,
        allocatedAddresses: 8192,
        availableAddresses: 57344,
        utilizationPercentage: 12.5,
        createdDate: new Date(Date.now() - 86400000 * 45),
        lastModified: new Date(Date.now() - 86400000 * 1),
        tags: ['development', 'testing', 'us-west']
      },
      {
        id: '3',
        name: 'Staging Environment Pool',
        cidr: '10.2.0.0/20',
        description: 'Staging and pre-production environment',
        status: 'Active',
        region: 'us-east1',
        vpc: 'staging-vpc',
        totalAddresses: 4096,
        allocatedAddresses: 3584,
        availableAddresses: 512,
        utilizationPercentage: 87.5,
        createdDate: new Date(Date.now() - 86400000 * 30),
        lastModified: new Date(Date.now() - 86400000 * 3),
        tags: ['staging', 'pre-production', 'us-east']
      }
    ];

    const mockSubnets: Subnet[] = [
      {
        id: '1',
        name: 'prod-web-subnet',
        cidr: '10.0.1.0/24',
        parentPool: '1',
        status: 'Active',
        region: 'us-central1',
        zone: 'us-central1-a',
        vpc: 'production-vpc',
        gatewayIp: '10.0.1.1',
        dhcpEnabled: true,
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        totalAddresses: 256,
        allocatedAddresses: 128,
        availableAddresses: 128,
        utilizationPercentage: 50.0,
        createdDate: new Date(Date.now() - 86400000 * 45),
        lastModified: new Date(Date.now() - 86400000 * 2)
      },
      {
        id: '2',
        name: 'prod-app-subnet',
        cidr: '10.0.2.0/24',
        parentPool: '1',
        status: 'Active',
        region: 'us-central1',
        zone: 'us-central1-b',
        vpc: 'production-vpc',
        gatewayIp: '10.0.2.1',
        dhcpEnabled: true,
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        totalAddresses: 256,
        allocatedAddresses: 192,
        availableAddresses: 64,
        utilizationPercentage: 75.0,
        createdDate: new Date(Date.now() - 86400000 * 40),
        lastModified: new Date(Date.now() - 86400000 * 1)
      },
      {
        id: '3',
        name: 'dev-main-subnet',
        cidr: '10.1.1.0/24',
        parentPool: '2',
        status: 'Active',
        region: 'us-west1',
        zone: 'us-west1-a',
        vpc: 'development-vpc',
        gatewayIp: '10.1.1.1',
        dhcpEnabled: true,
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        totalAddresses: 256,
        allocatedAddresses: 45,
        availableAddresses: 211,
        utilizationPercentage: 17.6,
        createdDate: new Date(Date.now() - 86400000 * 30),
        lastModified: new Date(Date.now() - 86400000 * 5)
      }
    ];

    const mockIPAllocations: IPAllocation[] = [
      {
        id: '1',
        ipAddress: '10.0.1.10',
        subnet: '1',
        status: 'Allocated',
        assignedTo: 'web-server-01',
        resourceType: 'VM Instance',
        resourceId: 'i-1234567890abcdef0',
        hostName: 'web-server-01.production.internal',
        description: 'Primary web server',
        macAddress: '00:16:3e:5e:6c:00',
        allocationDate: new Date(Date.now() - 86400000 * 30),
        lastSeen: new Date(Date.now() - 3600000)
      },
      {
        id: '2',
        ipAddress: '10.0.1.15',
        subnet: '1',
        status: 'Allocated',
        assignedTo: 'load-balancer-prod',
        resourceType: 'Load Balancer',
        resourceId: 'lb-prod-web-001',
        hostName: 'lb-prod.production.internal',
        description: 'Production load balancer',
        allocationDate: new Date(Date.now() - 86400000 * 25),
        lastSeen: new Date(Date.now() - 1800000)
      },
      {
        id: '3',
        ipAddress: '10.0.2.20',
        subnet: '2',
        status: 'Conflict',
        assignedTo: 'app-server-01',
        resourceType: 'VM Instance',
        resourceId: 'i-abcdef1234567890',
        hostName: 'app-server-01.production.internal',
        description: 'Application server with IP conflict',
        macAddress: '00:16:3e:5e:6c:01',
        allocationDate: new Date(Date.now() - 86400000 * 20),
        lastSeen: new Date(Date.now() - 7200000)
      }
    ];

    const mockNetworkDiscoveries: NetworkDiscovery[] = [
      {
        id: '1',
        name: 'Daily Production Scan',
        type: 'Scheduled',
        status: 'Completed',
        targetNetworks: ['10.0.0.0/16'],
        discoveredDevices: 234,
        newAllocations: 12,
        conflicts: 2,
        lastRun: new Date(Date.now() - 3600000 * 2),
        nextRun: new Date(Date.now() + 86400000 - 3600000 * 2),
        duration: 145
      },
      {
        id: '2',
        name: 'Development Network Discovery',
        type: 'On-Demand',
        status: 'Running',
        targetNetworks: ['10.1.0.0/16'],
        discoveredDevices: 45,
        newAllocations: 3,
        conflicts: 0,
        lastRun: new Date(Date.now() - 1800000),
        duration: 30,
        progress: 65
      }
    ];

    const mockIPConflicts: IPConflict[] = [
      {
        id: '1',
        ipAddress: '10.0.2.20',
        conflictType: 'Duplicate Assignment',
        severity: 'High',
        description: 'IP address assigned to multiple resources',
        affectedResources: ['app-server-01', 'backup-server-02'],
        detectedDate: new Date(Date.now() - 86400000 * 2),
        status: 'Open',
        assignedTo: 'network-admin@company.com'
      },
      {
        id: '2',
        ipAddress: '10.0.1.100',
        conflictType: 'DNS Mismatch',
        severity: 'Medium',
        description: 'DNS record does not match allocated IP',
        affectedResources: ['web-api-service'],
        detectedDate: new Date(Date.now() - 86400000 * 5),
        status: 'Investigating'
      }
    ];

    this.ipPoolsSubject.next(mockIPPools);
    this.subnetsSubject.next(mockSubnets);
    this.ipAllocationsSubject.next(mockIPAllocations);
    this.networkDiscoveriesSubject.next(mockNetworkDiscoveries);
    this.ipConflictsSubject.next(mockIPConflicts);
  }

  // IP Pool methods
  getIPPools(): Observable<IPPool[]> {
    return this.ipPools$;
  }

  createIPPool(pool: Partial<IPPool>): Observable<IPPool> {
    const newPool: IPPool = {
      id: Date.now().toString(),
      name: pool.name || '',
      cidr: pool.cidr || '',
      description: pool.description || '',
      status: 'Active',
      region: pool.region || '',
      vpc: pool.vpc,
      totalAddresses: this.calculateTotalAddresses(pool.cidr || ''),
      allocatedAddresses: 0,
      availableAddresses: this.calculateTotalAddresses(pool.cidr || ''),
      utilizationPercentage: 0,
      createdDate: new Date(),
      lastModified: new Date(),
      tags: pool.tags || [],
      ...pool
    };

    const currentPools = this.ipPoolsSubject.value;
    this.ipPoolsSubject.next([...currentPools, newPool]);
    return of(newPool);
  }

  // Subnet methods
  getSubnets(): Observable<Subnet[]> {
    return this.subnets$;
  }

  createSubnet(subnet: Partial<Subnet>): Observable<Subnet> {
    const newSubnet: Subnet = {
      id: Date.now().toString(),
      name: subnet.name || '',
      cidr: subnet.cidr || '',
      parentPool: subnet.parentPool || '',
      status: 'Active',
      region: subnet.region || '',
      zone: subnet.zone,
      vpc: subnet.vpc || '',
      gatewayIp: subnet.gatewayIp || '',
      dhcpEnabled: subnet.dhcpEnabled || false,
      dnsServers: subnet.dnsServers || [],
      totalAddresses: this.calculateTotalAddresses(subnet.cidr || ''),
      allocatedAddresses: 0,
      availableAddresses: this.calculateTotalAddresses(subnet.cidr || ''),
      utilizationPercentage: 0,
      createdDate: new Date(),
      lastModified: new Date(),
      ...subnet
    };

    const currentSubnets = this.subnetsSubject.value;
    this.subnetsSubject.next([...currentSubnets, newSubnet]);
    return of(newSubnet);
  }

  // IP Allocation methods
  getIPAllocations(): Observable<IPAllocation[]> {
    return this.ipAllocations$;
  }

  allocateIP(allocation: Partial<IPAllocation>): Observable<IPAllocation> {
    const newAllocation: IPAllocation = {
      id: Date.now().toString(),
      ipAddress: allocation.ipAddress || '',
      subnet: allocation.subnet || '',
      status: 'Allocated',
      assignedTo: allocation.assignedTo,
      resourceType: allocation.resourceType,
      resourceId: allocation.resourceId,
      hostName: allocation.hostName,
      description: allocation.description,
      macAddress: allocation.macAddress,
      leaseExpiry: allocation.leaseExpiry,
      allocationDate: new Date(),
      lastSeen: new Date(),
      ...allocation
    };

    const currentAllocations = this.ipAllocationsSubject.value;
    this.ipAllocationsSubject.next([...currentAllocations, newAllocation]);
    return of(newAllocation);
  }

  // Network Discovery methods
  getNetworkDiscoveries(): Observable<NetworkDiscovery[]> {
    return this.networkDiscoveries$;
  }

  startDiscovery(discovery: Partial<NetworkDiscovery>): Observable<NetworkDiscovery> {
    const newDiscovery: NetworkDiscovery = {
      id: Date.now().toString(),
      name: discovery.name || '',
      type: discovery.type || 'On-Demand',
      status: 'Running',
      targetNetworks: discovery.targetNetworks || [],
      discoveredDevices: 0,
      newAllocations: 0,
      conflicts: 0,
      lastRun: new Date(),
      duration: 0,
      progress: 0,
      ...discovery
    };

    const currentDiscoveries = this.networkDiscoveriesSubject.value;
    this.networkDiscoveriesSubject.next([...currentDiscoveries, newDiscovery]);
    return of(newDiscovery);
  }

  // IP Conflicts methods
  getIPConflicts(): Observable<IPConflict[]> {
    return this.ipConflicts$;
  }

  resolveConflict(conflictId: string): Observable<boolean> {
    const currentConflicts = this.ipConflictsSubject.value;
    const updatedConflicts = currentConflicts.map(conflict =>
      conflict.id === conflictId ? { ...conflict, status: 'Resolved' as const } : conflict
    );
    this.ipConflictsSubject.next(updatedConflicts);
    return of(true);
  }

  // Summary and analytics
  getCNRSummary(): Observable<CNRSummary> {
    return this.ipPools$.pipe(
      map(pools => {
        const subnets = this.subnetsSubject.value;
        const allocations = this.ipAllocationsSubject.value;
        const conflicts = this.ipConflictsSubject.value;
        const discoveries = this.networkDiscoveriesSubject.value;

        const totalAddresses = pools.reduce((sum, pool) => sum + pool.totalAddresses, 0);
        const allocatedAddresses = pools.reduce((sum, pool) => sum + pool.allocatedAddresses, 0);
        const utilizationPercentage = totalAddresses > 0 ? (allocatedAddresses / totalAddresses) * 100 : 0;

        return {
          totalPools: pools.length,
          totalSubnets: subnets.length,
          totalAllocations: allocations.length,
          utilizationPercentage: utilizationPercentage,
          availableAddresses: totalAddresses - allocatedAddresses,
          conflictsCount: conflicts.filter(c => c.status === 'Open').length,
          activeDiscoveries: discoveries.filter(d => d.status === 'Running').length,
          recentAllocations: allocations.filter(a => 
            (new Date().getTime() - a.allocationDate.getTime()) < 86400000 * 7
          ).length
        };
      })
    );
  }

  private calculateTotalAddresses(cidr: string): number {
    if (!cidr || !cidr.includes('/')) return 0;
    const prefixLength = parseInt(cidr.split('/')[1]);
    return Math.pow(2, 32 - prefixLength);
  }

  // Utility methods
  refreshData(): void {
    this.initializeMockData();
  }
} 