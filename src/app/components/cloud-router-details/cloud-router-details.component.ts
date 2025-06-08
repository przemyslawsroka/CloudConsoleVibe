import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { CloudRouterService, CloudRouterDetails, BgpPeer, NatGateway } from '../../services/cloud-router.service';

interface BgpSession {
  name: string;
  peerAsn: number;
  type: string;
  multiprotocolBgp: string;
  bgpRoutePolicies: string;
  cloudRouterBgpIp: string;
  bgpPeerIp: string;
  vpnGateway: string;
  vpnTunnel: string;
  advertisedRoutePriority: string;
  advertisementMode: string;
  md5Authentication: string;
}

interface BgpRoutePolicy {
  name: string;
  type: string;
  termCount: number;
  bgpSessions: string;
}

@Component({
  selector: 'app-cloud-router-details',
  templateUrl: './cloud-router-details.component.html',
  styleUrls: ['./cloud-router-details.component.scss']
})
export class CloudRouterDetailsComponent implements OnInit {
  routerName: string = '';
  region: string = '';
  routerDetails: CloudRouterDetails | null = null;
  loading = false;
  selectedTabIndex = 0;

  // BGP Sessions Table
  bgpSessionsDisplayedColumns: string[] = [
    'name',
    'peerAsn', 
    'type',
    'multiprotocolBgp',
    'bgpRoutePolicies',
    'cloudRouterBgpIp',
    'bgpPeerIp',
    'vpnGateway',
    'vpnTunnel',
    'advertisedRoutePriority',
    'advertisementMode',
    'md5Authentication'
  ];
  bgpSessionsDataSource = new MatTableDataSource<BgpSession>();

  // BGP Route Policies Table
  bgpPoliciesDisplayedColumns: string[] = ['name', 'type', 'termCount', 'bgpSessions'];
  bgpPoliciesDataSource = new MatTableDataSource<BgpRoutePolicy>();

  // Cloud NAT Gateways Table
  natGatewaysDisplayedColumns: string[] = ['gatewayName', 'status'];
  natGatewaysDataSource = new MatTableDataSource<NatGateway>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cloudRouterService: CloudRouterService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.routerName = params['name'];
      this.route.queryParams.subscribe(queryParams => {
        this.region = queryParams['region'];
        if (this.routerName && this.region) {
          this.loadRouterDetails();
        }
      });
    });
  }

  loadRouterDetails(): void {
    this.loading = true;
    this.cloudRouterService.getCloudRouterDetails(this.routerName, this.region).subscribe({
      next: (router) => {
        this.routerDetails = router;
        this.setupTableData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading router details:', error);
        this.snackBar.open('Error loading router details', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupTableData(): void {
    if (!this.routerDetails) return;

    // Setup BGP Sessions data
    const bgpSessions: BgpSession[] = this.routerDetails.bgpPeers?.map(peer => ({
      name: peer.name,
      peerAsn: peer.peerAsn,
      type: 'IPv4',
      multiprotocolBgp: 'Disabled IPv6',
      bgpRoutePolicies: 'Default',
      cloudRouterBgpIp: peer.ipAddress,
      bgpPeerIp: peer.peerIpAddress,
      vpnGateway: this.extractGatewayName(peer.interfaceName),
      vpnTunnel: this.extractTunnelName(peer.interfaceName),
      advertisedRoutePriority: 'Default',
      advertisementMode: peer.advertiseMode,
      md5Authentication: 'Disabled'
    })) || [];

    this.bgpSessionsDataSource.data = bgpSessions;

    // Setup BGP Route Policies data (mock for now)
    this.bgpPoliciesDataSource.data = [];

    // Setup NAT Gateways data
    this.natGatewaysDataSource.data = this.routerDetails.natGateways || [];
  }

  extractGatewayName(interfaceName: string): string {
    // Extract gateway name from interface name
    return interfaceName.replace('if-', '').replace('-tunnel', '-vpn') + '-1';
  }

  extractTunnelName(interfaceName: string): string {
    // Extract tunnel name from interface name
    return interfaceName.replace('if-', '') + '-tunnel';
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  goBack(): void {
    this.router.navigate(['/cloud-router']);
  }

  editRouter(): void {
    this.snackBar.open('Edit router functionality would be implemented here', 'Close', {
      duration: 3000
    });
  }

  deleteRouter(): void {
    this.snackBar.open('Delete router functionality would be implemented here', 'Close', {
      duration: 3000
    });
  }

  addCloudNatGateway(): void {
    this.snackBar.open('Add Cloud NAT gateway functionality would be implemented here', 'Close', {
      duration: 3000
    });
  }

  viewEquivalentRest(): void {
    this.snackBar.open('Equivalent REST display would be implemented here', 'Close', {
      duration: 3000
    });
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
        return '#34a853';
      case 'stopped':
      case 'inactive':
        return '#ea4335';
      case 'pending':
        return '#fbbc04';
      default:
        return '#9aa0a6';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
        return 'check_circle';
      case 'stopped':
      case 'inactive':
        return 'cancel';
      case 'pending':
        return 'schedule';
      default:
        return 'help';
    }
  }

  formatTags(tags: any): string {
    if (!tags || Object.keys(tags).length === 0) {
      return '';
    }
    return Object.entries(tags).map(([key, value]) => `${key}: ${value}`).join(', ');
  }
}
