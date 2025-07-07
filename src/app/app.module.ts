import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule } from '@angular/material/paginator';

import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module';
import { AppComponent } from './app.component';
import { VpcListComponent } from './components/vpc-list/vpc-list.component';
import { VpcDetailsComponent } from './components/vpc-details/vpc-details.component';
import { EditVpcComponent } from './components/vpc-details/edit-vpc.component';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { RoutesComponent } from './components/routes/routes.component';
import { CreateRouteDialogComponent } from './components/create-route-dialog/create-route-dialog.component';
import { AuthService } from './services/auth.service';
import { GoogleAnalyticsService } from './services/google-analytics.service';
import { VpcService } from './services/vpc.service';
import { TPPIService } from './services/tppi.service';
import { PacketMirroringService } from './services/packet-mirroring.service';
import { VpcFlowLogsComponent } from './components/vpc-flow-logs/vpc-flow-logs.component';
import { CreateFlowLogDialogComponent } from './components/create-flow-log-dialog/create-flow-log-dialog.component';
import { ProjectPickerComponent } from './components/project-picker/project-picker.component';
import { TopologyComponent } from './components/topology/topology.component';
import { IpAddressesComponent } from './components/ip-addresses/ip-addresses.component';
import { ReserveIpDialogComponent } from './components/ip-addresses/reserve-ip-dialog.component';
import { ReserveIpComponent } from './components/ip-addresses/reserve-ip.component';
import { FirewallManagementComponent } from './components/firewall-management/firewall-management.component';
import { CreateFirewallRuleDialogComponent } from './components/firewall-management/create-firewall-rule-dialog.component';
import { FlowAnalyzerComponent } from './components/flow-analyzer/flow-analyzer.component';
import { DataSourceSelectionDialogComponent } from './components/flow-analyzer/data-source-selection-dialog.component';
import { NetworkSolutionsComponent } from './components/network-solutions/network-solutions.component';
import { DistributedApplicationComponent } from './components/distributed-application/distributed-application.component';
import { DistributedApplicationWizardComponent } from './components/distributed-application-wizard/distributed-application-wizard.component';
import { DnsManagementComponent } from './components/dns-management/dns-management.component';
import { CreateZoneDialogComponent } from './components/dns-management/create-zone-dialog.component';
import { ConnectivityTestsComponent } from './components/connectivity-tests/connectivity-tests.component';
import { CreateConnectivityTestDialogComponent } from './components/connectivity-tests/create-connectivity-test-dialog.component';
import { CloudArmorPoliciesComponent } from './components/cloud-armor-policies/cloud-armor-policies.component';
import { CreateCloudArmorPolicyDialogComponent } from './components/cloud-armor-policies/create-cloud-armor-policy-dialog.component';
import { AddressGroupsComponent } from './components/address-groups/address-groups.component';
import { CreateAddressGroupDialogComponent } from './components/address-groups/create-address-group-dialog.component';
import { EditAddressGroupDialogComponent } from './components/address-groups/edit-address-group-dialog.component';
import { TlsInspectionPoliciesComponent } from './components/tls-inspection-policies/tls-inspection-policies.component';
import { CreateTlsInspectionPolicyDialogComponent } from './components/tls-inspection-policies/create-tls-inspection-policy-dialog.component';
import { LoadBalancingComponent } from './components/load-balancing/load-balancing.component';
import { CreateLoadBalancerComponent } from './components/load-balancing/create-load-balancer.component';
import { LoadBalancerConfigureComponent } from './components/load-balancing/load-balancer-configure.component';
import { LoadBalancerCreationProgressComponent } from './components/load-balancing/load-balancer-creation-progress.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { CreateVpcNetworkComponent } from './components/create-vpc-network/create-vpc-network.component';
import { TPPIManagementComponent } from './components/tppi-management/tppi-management.component';
import { TPPISetupWizardComponent } from './components/tppi-setup-wizard/tppi-setup-wizard.component';
import { PacketMirroringManagementComponent } from './components/packet-mirroring-management/packet-mirroring-management.component';
import { PacketMirroringSetupWizardComponent } from './components/packet-mirroring-setup-wizard/packet-mirroring-setup-wizard.component';
import { NetworkHealthMonitorComponent } from './components/network-health-monitor/network-health-monitor.component';
import { NetworkHealthMonitorDetailsComponent } from './components/network-health-monitor-details/network-health-monitor-details.component';
import { CreateHealthMonitorDialogComponent } from './components/network-health-monitor/create-health-monitor-dialog.component';
import { NetworkHealthMonitorService } from './services/network-health-monitor.service';
import { CloudNetworkInsightsComponent } from './components/cloud-network-insights/cloud-network-insights.component';
import { CreateNetworkPathDialogComponent } from './components/cloud-network-insights/create-network-path-dialog.component';
import { CreateWebPathDialogComponent } from './components/cloud-network-insights/create-web-path-dialog.component';
import { CreateMonitoringPolicyDialogComponent } from './components/cloud-network-insights/create-monitoring-policy-dialog.component';
import { NetworkPathDetailsComponent } from './components/cloud-network-insights/network-path-details.component';
import { AppNetaService } from './services/appneta.service';
import { CNRComponent } from './components/cnr/cnr.component';
import { CloudCdnComponent } from './components/cloud-cdn/cloud-cdn.component';
import { CloudCdnDetailsComponent } from './components/cloud-cdn-details/cloud-cdn-details.component';
import { CloudRouterComponent } from './components/cloud-router/cloud-router.component';
import { CloudRouterDetailsComponent } from './components/cloud-router-details/cloud-router-details.component';
import { CreateCloudRouterComponent } from './components/create-cloud-router/create-cloud-router.component';
import { CloudNatComponent } from './components/cloud-nat/cloud-nat.component';
import { CloudNatDetailsComponent } from './components/cloud-nat-details/cloud-nat-details.component';
import { CreateCloudNatComponent } from './components/create-cloud-nat/create-cloud-nat.component';
import { CreateRouteComponent } from './components/create-route/create-route.component';
import { GkeClustersComponent } from './components/gke-clusters/gke-clusters.component';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { NetworkConnectivityComponent } from './components/network-connectivity/network-connectivity.component';
import { GlobalFrontendWizardComponent } from './components/global-frontend-wizard/global-frontend-wizard.component';
import { GlobalFrontendWizardV2Component, TerraformModalComponent } from './components/global-frontend-wizard-v2/global-frontend-wizard-v2.component';
import { GoogleWANWizardComponent } from './components/google-wan-wizard/google-wan-wizard.component';
import { CloudNatService } from './services/cloud-nat.service';
import { GkeClusterService } from './services/gke-cluster.service';
import { GeminiAiService } from './services/gemini-ai.service';
import { GlobalFrontendService } from './services/global-frontend.service';
// import { GoogleWANService } from './services/google-wan.service';
import { SecureWebProxyComponent } from './components/secure-web-proxy/secure-web-proxy.component';
import { SecureWebProxyService } from './services/secure-web-proxy.service';
import { UrlListsComponent } from './components/url-lists/url-lists.component';
import { UrlListsService } from './services/url-lists.service';
import { VmInstancesComponent } from './components/vm-instances/vm-instances.component';
import { CreateVmInstanceComponent } from './components/vm-instances/create-vm-instance.component';
import { AwsConfigComponent } from './components/aws-config/aws-config.component';
import { InstanceTemplatesComponent } from './components/instance-templates/instance-templates.component';
import { InstanceGroupsComponent } from './components/instance-groups/instance-groups.component';
import { CloudStorageBucketsComponent } from './components/cloud-storage-buckets/cloud-storage-buckets.component';
import { CloudStorageBucketDetailsComponent } from './components/cloud-storage-bucket-details/cloud-storage-bucket-details.component';
import { ComputeEngineService } from './services/compute-engine.service';
import { InstanceTemplatesService } from './services/instance-templates.service';
import { InstanceGroupsService } from './services/instance-groups.service';
import { CloudStorageService } from './services/cloud-storage.service';

@NgModule({
  declarations: [
    AppComponent,
    VpcListComponent,
    VpcDetailsComponent,
    EditVpcComponent,
    LoginComponent,
    AuthCallbackComponent,
    RoutesComponent,
    CreateRouteDialogComponent,
    VpcFlowLogsComponent,
    CreateFlowLogDialogComponent,
    ProjectPickerComponent,
    TopologyComponent,
    IpAddressesComponent,
    ReserveIpDialogComponent,
    ReserveIpComponent,
    FirewallManagementComponent,
    CreateFirewallRuleDialogComponent,
    FlowAnalyzerComponent,
    DataSourceSelectionDialogComponent,
    NetworkSolutionsComponent,
    DistributedApplicationComponent,
    DistributedApplicationWizardComponent,
    DnsManagementComponent,
    CreateZoneDialogComponent,
    ConnectivityTestsComponent,
    CreateConnectivityTestDialogComponent,
    CloudArmorPoliciesComponent,
    CreateCloudArmorPolicyDialogComponent,
    AddressGroupsComponent,
    CreateAddressGroupDialogComponent,
    EditAddressGroupDialogComponent,
    TlsInspectionPoliciesComponent,
    CreateTlsInspectionPolicyDialogComponent,
    LoadBalancingComponent,
    CreateLoadBalancerComponent,
    LoadBalancerConfigureComponent,
    LoadBalancerCreationProgressComponent,
    DocumentationComponent,
    CreateVpcNetworkComponent,
    TPPIManagementComponent,
    TPPISetupWizardComponent,
    PacketMirroringManagementComponent,
    PacketMirroringSetupWizardComponent,
    NetworkHealthMonitorComponent,
    NetworkHealthMonitorDetailsComponent,
    CreateHealthMonitorDialogComponent,
    CloudNetworkInsightsComponent,
    CreateNetworkPathDialogComponent,
    CreateWebPathDialogComponent,
    CreateMonitoringPolicyDialogComponent,
    NetworkPathDetailsComponent,
    CNRComponent,
    CloudCdnComponent,
    CloudCdnDetailsComponent,
    CloudRouterComponent,
    CloudRouterDetailsComponent,
    CreateCloudRouterComponent,
    CloudNatComponent,
    CloudNatDetailsComponent,
    CreateCloudNatComponent,
    CreateRouteComponent,
    GkeClustersComponent,
    AiAssistantComponent,
    NetworkConnectivityComponent,
    GlobalFrontendWizardComponent,
    GlobalFrontendWizardV2Component,
    TerraformModalComponent,
    GoogleWANWizardComponent,
    SecureWebProxyComponent,
    UrlListsComponent,
    VmInstancesComponent,
    CreateVmInstanceComponent,
    AwsConfigComponent,
    InstanceTemplatesComponent,
    InstanceGroupsComponent,
    CloudStorageBucketsComponent,
    CloudStorageBucketDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    // App-specific Material modules not in SharedModule
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatRadioModule,
    MatTabsModule,
    MatStepperModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatDividerModule,
    TextFieldModule,
    MatStepperModule
  ],
  providers: [AuthService, GoogleAnalyticsService, VpcService, TPPIService, PacketMirroringService, NetworkHealthMonitorService, AppNetaService, CloudNatService, GkeClusterService, GeminiAiService, GlobalFrontendService, SecureWebProxyService, UrlListsService, ComputeEngineService, InstanceTemplatesService, InstanceGroupsService, CloudStorageService],
  bootstrap: [AppComponent]
})
export class AppModule { } 