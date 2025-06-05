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

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { VpcListComponent } from './components/vpc-list/vpc-list.component';
import { VpcDetailsComponent } from './components/vpc-details/vpc-details.component';
import { LoginComponent } from './components/login/login.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { RoutesComponent } from './components/routes/routes.component';
import { CreateRouteDialogComponent } from './components/create-route-dialog/create-route-dialog.component';
import { AuthService } from './services/auth.service';
import { VpcService } from './services/vpc.service';
import { VpcFlowLogsComponent } from './components/vpc-flow-logs/vpc-flow-logs.component';
import { CreateFlowLogDialogComponent } from './components/create-flow-log-dialog/create-flow-log-dialog.component';
import { ProjectPickerComponent } from './components/project-picker/project-picker.component';
import { TopologyComponent } from './components/topology/topology.component';
import { IpAddressesComponent } from './components/ip-addresses/ip-addresses.component';
import { ReserveIpDialogComponent } from './components/ip-addresses/reserve-ip-dialog.component';
import { FirewallManagementComponent } from './components/firewall-management/firewall-management.component';
import { CreateFirewallRuleDialogComponent } from './components/firewall-management/create-firewall-rule-dialog.component';
import { FlowAnalyzerComponent } from './components/flow-analyzer/flow-analyzer.component';
import { DataSourceSelectionDialogComponent } from './components/flow-analyzer/data-source-selection-dialog.component';
import { NetworkSolutionsComponent } from './components/network-solutions/network-solutions.component';
import { DistributedApplicationComponent } from './components/distributed-application/distributed-application.component';
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
import { DocumentationComponent } from './components/documentation/documentation.component';

@NgModule({
  declarations: [
    AppComponent,
    VpcListComponent,
    VpcDetailsComponent,
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
    FirewallManagementComponent,
    CreateFirewallRuleDialogComponent,
    FlowAnalyzerComponent,
    DataSourceSelectionDialogComponent,
    NetworkSolutionsComponent,
    DistributedApplicationComponent,
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
    DocumentationComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatSnackBarModule,
    MatChipsModule,
    MatRadioModule,
    FormsModule,
    MatTabsModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatStepperModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    TextFieldModule,
    MatSortModule
  ],
  providers: [AuthService, VpcService],
  bootstrap: [AppComponent]
})
export class AppModule { } 