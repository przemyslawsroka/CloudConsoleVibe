import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';

// Chart.js imports will be added later

// Components
import { AgentListComponent } from './agent-list/agent-list.component';
import { AgentDeployComponent } from './agent-deploy/agent-deploy.component';
import { MetricsDashboardComponent } from './metrics-dashboard/metrics-dashboard.component';

// Services
import { MonitoringService } from './services/monitoring.service';
import { AgentWebSocketService } from './services/agent-websocket.service';
import { GcpDeploymentService } from './services/gcp-deployment.service';

const routes = [
  {
    path: '',
    component: MetricsDashboardComponent
  },
  {
    path: 'agents',
    component: AgentListComponent
  },
  {
    path: 'deploy',
    component: AgentDeployComponent
  }
];

@NgModule({
  declarations: [
    AgentListComponent,
    AgentDeployComponent,
    MetricsDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    
    // Angular Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTabsModule,
    MatToolbarModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatRadioModule
  ],
  providers: [
    MonitoringService,
    AgentWebSocketService,
    GcpDeploymentService
  ]
})
export class MonitoringModule { } 