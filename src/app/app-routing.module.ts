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

const routes: Routes = [
  { path: '', redirectTo: '/vpc', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { 
    path: 'vpc', 
    component: VpcListComponent,
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
  { path: 'firewall', component: FirewallManagementComponent, canActivate: [AuthGuard] },
  { path: 'flow-analyzer', component: FlowAnalyzerComponent },
  { path: 'network-solutions', component: NetworkSolutionsComponent },
  { path: 'distributed-application', component: DistributedApplicationComponent },
  { path: 'dns-management', component: DnsManagementComponent, canActivate: [AuthGuard] },
  { path: 'connectivity-tests', component: ConnectivityTestsComponent, canActivate: [AuthGuard] },
  { path: 'cloud-armor-policies', component: CloudArmorPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'tls-inspection-policies', component: TlsInspectionPoliciesComponent, canActivate: [AuthGuard] },
  { path: 'address-groups', component: AddressGroupsComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing', component: LoadBalancingComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing/create', component: CreateLoadBalancerComponent, canActivate: [AuthGuard] },
  { path: 'load-balancing/configure', component: LoadBalancerConfigureComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 