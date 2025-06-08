import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VpcListComponent } from './components/vpc-list/vpc-list.component';
import { VpcDetailsComponent } from './components/vpc-details/vpc-details.component';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { RoutesComponent } from './components/routes/routes.component';
import { AuthGuard } from './guards/auth.guard';
import { VpcFlowLogsComponent } from './components/vpc-flow-logs/vpc-flow-logs.component';
import { TopologyComponent } from './components/topology/topology.component';
import { IpAddressesComponent } from './components/ip-addresses/ip-addresses.component';
import { ReserveIpComponent } from './components/ip-addresses/reserve-ip.component';
import { FirewallManagementComponent } from './components/firewall-management/firewall-management.component';
import { FlowAnalyzerComponent } from './components/flow-analyzer/flow-analyzer.component';
import { NetworkSolutionsComponent } from './components/network-solutions/network-solutions.component';
import { DistributedApplicationComponent } from './components/distributed-application/distributed-application.component';
import { DnsManagementComponent } from './components/dns-management/dns-management.component';
import { ConnectivityTestsComponent } from './components/connectivity-tests/connectivity-tests.component';
import { CloudArmorPoliciesComponent } from './components/cloud-armor-policies/cloud-armor-policies.component';
import { AddressGroupsComponent } from './components/address-groups/address-groups.component';
import { TlsInspectionPoliciesComponent } from './components/tls-inspection-policies/tls-inspection-policies.component';
import { LoadBalancingComponent } from './components/load-balancing/load-balancing.component';
import { CreateLoadBalancerComponent } from './components/load-balancing/create-load-balancer.component';
import { LoadBalancerConfigureComponent } from './components/load-balancing/load-balancer-configure.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { CreateVpcNetworkComponent } from './components/create-vpc-network/create-vpc-network.component';
import { TPPIManagementComponent } from './components/tppi-management/tppi-management.component';
import { PacketMirroringManagementComponent } from './components/packet-mirroring-management/packet-mirroring-management.component';
import { NetworkHealthMonitorComponent } from './components/network-health-monitor/network-health-monitor.component';
import { NetworkHealthMonitorDetailsComponent } from './components/network-health-monitor-details/network-health-monitor-details.component';
import { CloudNetworkInsightsComponent } from './components/cloud-network-insights/cloud-network-insights.component';
import { CNRComponent } from './components/cnr/cnr.component';
import { CloudCdnComponent } from './components/cloud-cdn/cloud-cdn.component';
import { CloudCdnDetailsComponent } from './components/cloud-cdn-details/cloud-cdn-details.component';
import { CloudRouterComponent } from './components/cloud-router/cloud-router.component';
import { CreateCloudRouterComponent } from './components/create-cloud-router/create-cloud-router.component';
import { CloudRouterDetailsComponent } from './components/cloud-router-details/cloud-router-details.component';
import { CloudNatComponent } from './components/cloud-nat/cloud-nat.component';

const routes: Routes = [
  { path: '', redirectTo: '/vpc', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'documentation', component: DocumentationComponent },
  { 
    path: 'vpc', 
    component: VpcListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'vpc/create',
    component: CreateVpcNetworkComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'vpc/:name', 
    component: VpcDetailsComponent,
    canActivate: [AuthGuard]
  },
  { path: 'routes', component: RoutesComponent, canActivate: [AuthGuard] },
  {
    path: 'flow-logs',
    component: VpcFlowLogsComponent,
    canActivate: [AuthGuard]
  },
  { path: 'topology', component: TopologyComponent, canActivate: [AuthGuard] },
  { path: 'ip-addresses', component: IpAddressesComponent, canActivate: [AuthGuard] },
  { path: 'ip-addresses/reserve', component: ReserveIpComponent, canActivate: [AuthGuard] },
  { path: 'firewall', component: FirewallManagementComponent, canActivate: [AuthGuard] },
  { path: 'flow-analyzer', component: FlowAnalyzerComponent },
  { path: 'network-solutions', component: NetworkSolutionsComponent },
  { path: 'distributed-application', component: DistributedApplicationComponent },
  { path: 'dns-management', component: DnsManagementComponent, canActivate: [AuthGuard] },
  { path: 'connectivity-tests', component: ConnectivityTestsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-armor-policies', component: CloudArmorPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'tls-inspection-policies', component: TlsInspectionPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'address-groups', component: AddressGroupsComponent, canActivate: [AuthGuard] },
  { path: 'tppi', component: TPPIManagementComponent, canActivate: [AuthGuard] },
  { path: 'packet-mirroring', component: PacketMirroringManagementComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing', component: LoadBalancingComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing/create', component: CreateLoadBalancerComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing/configure', component: LoadBalancerConfigureComponent, canActivate: [AuthGuard] },
  { path: 'cloud-cdn', component: CloudCdnComponent, canActivate: [AuthGuard] },
  { path: 'cloud-cdn/:name', component: CloudCdnDetailsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-router', component: CloudRouterComponent, canActivate: [AuthGuard] },
  { path: 'cloud-router/create', component: CreateCloudRouterComponent, canActivate: [AuthGuard] },
  { path: 'cloud-router/:name', component: CloudRouterDetailsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-nat', component: CloudNatComponent, canActivate: [AuthGuard] },
  { path: 'cloud-network-insights', component: CloudNetworkInsightsComponent, canActivate: [AuthGuard] },
  { path: 'cnr', component: CNRComponent, canActivate: [AuthGuard] },
  {
    path: 'network-health-monitor',
    component: NetworkHealthMonitorComponent
  },
  {
    path: 'network-health-monitor/:name',
    component: NetworkHealthMonitorDetailsComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 