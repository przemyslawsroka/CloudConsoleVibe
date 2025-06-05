import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProjectPickerComponent, Project } from './components/project-picker/project-picker.component';
import { ProjectService } from './services/project.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="toolbar">
        <button mat-icon-button (click)="sidenav.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        <span>Google Cloud Console</span>
        <span class="toolbar-spacer"></span>
        <button mat-stroked-button color="accent" class="project-picker-btn" (click)="openProjectPicker()">
          <mat-icon>folder_open</mat-icon>
          {{ (currentProject$ | async)?.name || 'Select project' }}
        </button>
        <button mat-button *ngIf="!(isAuthenticated$ | async)" (click)="login()">
          <mat-icon>login</mat-icon>
          Sign In
        </button>
        <button mat-button *ngIf="isAuthenticated$ | async" (click)="logout()">
          <mat-icon>logout</mat-icon>
          Sign Out
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #sidenav mode="side" opened class="sidenav">
          <mat-nav-list>
            <a mat-list-item 
               *ngFor="let item of navItems" 
               [routerLink]="item.route" 
               routerLinkActive="active">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.name }}</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [
    `.app-container { display: flex; flex-direction: column; height: 100vh; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 2; }
    .toolbar-spacer { flex: 1 1 auto; }
    .project-picker-btn { margin-right: 16px; }
    .sidenav-container { flex: 1; margin-top: 64px; }
    .sidenav { width: 250px; }
    .content { padding: 20px; }
    .active { background-color: rgba(0, 0, 0, 0.04); }
    `
  ]
})
export class AppComponent {
  isAuthenticated$: Observable<boolean>;
  currentProject$: Observable<Project | null>;

  navItems = [
    { name: 'VPC networks', route: '/vpc', icon: 'cloud' },
    { name: 'Load balancing', route: '/load-balancing', icon: 'balance' },
    { name: 'IP addresses', route: '/ip-addresses', icon: 'language' },
    { name: 'Cloud DNS', route: '/dns-management', icon: 'dns' },
    { name: 'Firewall', route: '/firewall', icon: 'security' },
    { name: 'Cloud Armor', route: '/cloud-armor-policies', icon: 'shield' },
    { name: 'TLS inspection policies', route: '/tls-inspection-policies', icon: 'security_scan' },
    { name: 'Address groups', route: '/address-groups', icon: 'group_work' },
    { name: 'Flow Analyzer', route: '/flow-analyzer', icon: 'analytics' },
    { name: 'Connectivity Tests', route: '/connectivity-tests', icon: 'network_check' },
    { name: 'Routes', route: '/routes', icon: 'route' },
    { name: 'Network topology', route: '/topology', icon: 'account_tree' },
    { name: 'Network Solutions', route: '/network-solutions', icon: 'hub' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private projectService: ProjectService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentProject$ = this.projectService.currentProject$;
  }

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openProjectPicker() {
    const dialogRef = this.dialog.open(ProjectPickerComponent, {
      data: { selectedProject: this.projectService.getCurrentProject() },
      width: '600px'
    });
    dialogRef.afterClosed().subscribe((result: Project) => {
      if (result) {
        this.projectService.setCurrentProject(result);
        // Optionally: trigger reload of data in the app
      }
    });
  }
} 