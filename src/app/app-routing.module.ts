import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VpcListComponent } from './components/vpc-list/vpc-list.component';
import { VpcDetailsComponent } from './components/vpc-details/vpc-details.component';
import { EditVpcComponent } from './components/vpc-details/edit-vpc.component';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { RoutesComponent } from './components/routes/routes.component';
import { AuthGuard } from './guards/auth.guard';
import { VpcFlowLogsComponent } from './components/vpc-flow-logs/vpc-flow-logs.component';
import { TopologyComponent } from './components/topology/topology.component';
import { IpAddressesComponent } from './components/ip-addresses/ip-addresses.component';
import { ReserveIpComponent } from './components/ip-addresses/reserve-ip.component';
import { InternalRangesComponent } from './components/internal-ranges/internal-ranges.component';
import { FirewallManagementComponent } from './components/firewall-management/firewall-management.component';
import { FlowAnalyzerComponent } from './components/flow-analyzer/flow-analyzer.component';
import { NetworkSolutionsComponent } from './components/network-solutions/network-solutions.component';
import { DistributedApplicationComponent } from './components/distributed-application/distributed-application.component';
import { DistributedApplicationWizardComponent } from './components/distributed-application-wizard/distributed-application-wizard.component';
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
import { TPPISetupWizardComponent } from './components/tppi-setup-wizard/tppi-setup-wizard.component';
import { PacketMirroringManagementComponent } from './components/packet-mirroring-management/packet-mirroring-management.component';
import { NetworkHealthMonitorComponent } from './components/network-health-monitor/network-health-monitor.component';
import { NetworkHealthMonitorDetailsComponent } from './components/network-health-monitor-details/network-health-monitor-details.component';
import { CloudNetworkInsightsComponent } from './components/cloud-network-insights/cloud-network-insights.component';
import { NetworkPathDetailsComponent } from './components/cloud-network-insights/network-path-details.component';
import { CNRComponent } from './components/cnr/cnr.component';
import { CloudCdnComponent } from './components/cloud-cdn/cloud-cdn.component';
import { CloudCdnDetailsComponent } from './components/cloud-cdn-details/cloud-cdn-details.component';
import { CloudRouterComponent } from './components/cloud-router/cloud-router.component';
import { CreateCloudRouterComponent } from './components/create-cloud-router/create-cloud-router.component';
import { CloudRouterDetailsComponent } from './components/cloud-router-details/cloud-router-details.component';
import { CloudNatComponent } from './components/cloud-nat/cloud-nat.component';
import { CloudNatDetailsComponent } from './components/cloud-nat-details/cloud-nat-details.component';
import { CreateCloudNatComponent } from './components/create-cloud-nat/create-cloud-nat.component';
import { CreateRouteComponent } from './components/create-route/create-route.component';
import { GkeClustersComponent } from './components/gke-clusters/gke-clusters.component';
import { NetworkConnectivityComponent } from './components/network-connectivity/network-connectivity.component';
import { GlobalFrontendWizardComponent } from './components/global-frontend-wizard/global-frontend-wizard.component';
import { GlobalFrontendWizardV2Component } from './components/global-frontend-wizard-v2/global-frontend-wizard-v2.component';
import { GoogleWANWizardComponent } from './components/google-wan-wizard/google-wan-wizard.component';
import { SecureWebProxyComponent } from './components/secure-web-proxy/secure-web-proxy.component';
import { UrlListsComponent } from './components/url-lists/url-lists.component';
import { VmInstancesComponent } from './components/vm-instances/vm-instances.component';
import { CreateVmInstanceComponent } from './components/vm-instances/create-vm-instance.component';
import { AwsConfigComponent } from './components/aws-config/aws-config.component';
import { InstanceTemplatesComponent } from './components/instance-templates/instance-templates.component';
import { InstanceGroupsComponent } from './components/instance-groups/instance-groups.component';
import { CreateInstanceGroupComponent } from './components/instance-groups/create-instance-group.component';
import { CloudStorageBucketsComponent } from './components/cloud-storage-buckets/cloud-storage-buckets.component';
import { CloudStorageBucketDetailsComponent } from './components/cloud-storage-bucket-details/cloud-storage-bucket-details.component';
import { CreateConnectivityTestComponent } from './components/connectivity-tests/create-connectivity-test.component';

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
  {
    path: 'vpc/:name/edit',
    component: EditVpcComponent,
    canActivate: [AuthGuard]
  },
  { path: 'routes', component: RoutesComponent, canActivate: [AuthGuard] },
  { path: 'routes/create', component: CreateRouteComponent, canActivate: [AuthGuard] },
  {
    path: 'flow-logs',
    component: VpcFlowLogsComponent,
    canActivate: [AuthGuard]
  },
  { path: 'topology', component: TopologyComponent, canActivate: [AuthGuard] },
  { path: 'ip-addresses', component: IpAddressesComponent, canActivate: [AuthGuard] },
  { path: 'ip-addresses/reserve', component: ReserveIpComponent, canActivate: [AuthGuard] },
  { path: 'internal-ranges', component: InternalRangesComponent, canActivate: [AuthGuard] },
  { path: 'firewall', component: FirewallManagementComponent, canActivate: [AuthGuard] },
  { path: 'flow-analyzer', component: FlowAnalyzerComponent },
  { path: 'network-solutions', component: NetworkSolutionsComponent },
  { path: 'distributed-application', component: DistributedApplicationComponent },
  { path: 'distributed-application/wizard', component: DistributedApplicationWizardComponent },
  { path: 'dns-management', component: DnsManagementComponent, canActivate: [AuthGuard] },
  { path: 'connectivity-tests', component: ConnectivityTestsComponent, canActivate: [AuthGuard] },
  { path: 'connectivity-tests/create', component: CreateConnectivityTestComponent, canActivate: [AuthGuard] },
  { path: 'cloud-armor-policies', component: CloudArmorPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'tls-inspection-policies', component: TlsInspectionPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'address-groups', component: AddressGroupsComponent, canActivate: [AuthGuard] },
  { path: 'url-lists', component: UrlListsComponent, canActivate: [AuthGuard] },
  { path: 'tppi', component: TPPIManagementComponent, canActivate: [AuthGuard] },
  { path: 'tppi/setup', component: TPPISetupWizardComponent, canActivate: [AuthGuard] },
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
  { path: 'cloud-nat/create', component: CreateCloudNatComponent, canActivate: [AuthGuard] },
  { path: 'cloud-nat/:name', component: CloudNatDetailsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-network-insights', component: CloudNetworkInsightsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-network-insights/path/:pathId', component: NetworkPathDetailsComponent, canActivate: [AuthGuard] },
  { path: 'cnr', component: CNRComponent, canActivate: [AuthGuard] },
  {
    path: 'network-health-monitor',
    component: NetworkHealthMonitorComponent
  },
  {
    path: 'network-health-monitor/:name',
    component: NetworkHealthMonitorDetailsComponent
  },
  { path: 'kubernetes/clusters', component: GkeClustersComponent, canActivate: [AuthGuard] },
  { path: 'network-connectivity', component: NetworkConnectivityComponent, canActivate: [AuthGuard] },
  { path: 'network-connectivity/hubs/create', component: NetworkConnectivityComponent, canActivate: [AuthGuard] },
  { path: 'network-connectivity/hubs/:hubId', component: NetworkConnectivityComponent, canActivate: [AuthGuard] },
  { path: 'network-connectivity/spokes/create', component: NetworkConnectivityComponent, canActivate: [AuthGuard] },
  { path: 'network-connectivity/spokes/:spokeId', component: NetworkConnectivityComponent, canActivate: [AuthGuard] },
  { path: 'global-frontend-wizard', component: GlobalFrontendWizardComponent, canActivate: [AuthGuard] },
  { path: 'global-frontend-wizard-v2', component: GlobalFrontendWizardV2Component, canActivate: [AuthGuard] },
  { path: 'google-wan-wizard', component: GoogleWANWizardComponent, canActivate: [AuthGuard] },
  { path: 'secure-web-proxy', component: SecureWebProxyComponent, canActivate: [AuthGuard] },
  { path: 'vm-instances', component: VmInstancesComponent, canActivate: [AuthGuard] },
  { path: 'vm-instances/create', component: CreateVmInstanceComponent },
  { path: 'instance-templates', component: InstanceTemplatesComponent, canActivate: [AuthGuard] },
  { path: 'instance-groups', component: InstanceGroupsComponent, canActivate: [AuthGuard] },
  { path: 'instance-groups/create', component: CreateInstanceGroupComponent, canActivate: [AuthGuard] },
  { path: 'cloud-storage/buckets', component: CloudStorageBucketsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-storage/buckets/:bucketName', component: CloudStorageBucketDetailsComponent, canActivate: [AuthGuard] },
  {
    path: 'monitoring',
    loadChildren: () => import('./components/monitoring/monitoring.module').then(m => m.MonitoringModule),
    canActivate: [AuthGuard]
  },
  { path: 'aws-config', component: AwsConfigComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 