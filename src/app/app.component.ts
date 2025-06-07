import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { ProjectPickerComponent } from './components/project-picker/project-picker.component';
import { ProjectService, Project } from './services/project.service';

interface NavCategory {
  name: string;
  icon: string;
  items: NavItem[];
  expanded?: boolean;
}

interface NavItem {
  name: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="toolbar">
        <button mat-icon-button (click)="sidenav.toggle()" *ngIf="!isDocumentationRoute">
          <mat-icon>menu</mat-icon>
        </button>
        <span>Google Cloud Console</span>
        
        <!-- Demo Mode Indicator -->
        <div *ngIf="isDemoMode$ | async" class="demo-indicator">
          <mat-icon>visibility</mat-icon>
          <span>Demo Mode</span>
        </div>
        
        <button mat-stroked-button color="accent" class="project-picker-btn" (click)="openProjectPicker()" *ngIf="!isDocumentationRoute">
          <mat-icon>folder_open</mat-icon>
          {{ (currentProject$ | async)?.name || 'Select project' }}
        </button>
        <span class="toolbar-spacer"></span>
        <button mat-icon-button 
                routerLink="/documentation" 
                matTooltip="Documentation"
                class="doc-button">
          <mat-icon>description</mat-icon>
        </button>
        <button mat-button *ngIf="!(isAuthenticated$ | async)" (click)="login()">
          <mat-icon>login</mat-icon>
          Sign In
        </button>
        <button mat-button *ngIf="isAuthenticated$ | async" (click)="logout()">
          <mat-icon>logout</mat-icon>
          {{ (isDemoMode$ | async) ? 'Exit Demo' : 'Sign Out' }}
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #sidenav [mode]="isDocumentationRoute ? 'over' : 'side'" [opened]="!isDocumentationRoute" class="sidenav">
          <div class="nav-header">
            <h3>Networking</h3>
            <p>Manage, connect, secure, and scale your networks</p>
          </div>
          
          <div class="nav-content">
            <div *ngFor="let category of navCategories" class="nav-category">
              <div class="category-header" (click)="toggleCategory(category)">
                <div class="category-info">
                  <mat-icon class="category-icon">{{ category.icon }}</mat-icon>
                  <span class="category-name">{{ category.name }}</span>
                </div>
                <mat-icon class="expand-icon" [class.expanded]="category.expanded">
                  {{ category.expanded ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </div>
              
              <div class="category-items" [class.expanded]="category.expanded">
                <a mat-list-item 
                   *ngFor="let item of category.items" 
                   [routerLink]="item.route" 
                   routerLinkActive="active"
                   class="nav-item">
                  <mat-icon class="item-icon">{{ item.icon }}</mat-icon>
                  <span>{{ item.name }}</span>
                </a>
              </div>
            </div>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="content" [class.full-width]="isDocumentationRoute">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [
    `.app-container { 
      display: flex; 
      flex-direction: column; 
      height: 100vh; 
    }
    
    .toolbar { 
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      z-index: 2; 
    }
    
    .toolbar-spacer { 
      flex: 1 1 auto; 
    }
    
    .project-picker-btn { 
      margin-left: 16px; 
    }
    
    .demo-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
      margin-left: 16px;
    }
    
    .demo-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .doc-button {
      margin-right: 8px;
      color: white;
    }
    
    .doc-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .sidenav-container { 
      flex: 1; 
      margin-top: 64px; 
    }
    
    .sidenav { 
      width: 300px; 
      background-color: #fafafa;
    }
    
    .content { 
      padding: 20px; 
    }

    .content.full-width {
      padding: 0;
      margin: 0;
      width: 100%;
    }
    
    .nav-header {
      padding: 24px 20px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
    }
    
    .nav-header h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 400;
      color: #202124;
    }
    
    .nav-header p {
      margin: 0;
      font-size: 14px;
      color: #5f6368;
    }
    
    .nav-content {
      padding: 8px 0;
    }
    
    .nav-category {
      margin-bottom: 4px;
    }
    
    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      cursor: pointer;
      background: white;
      border-bottom: 1px solid #e8eaed;
      transition: background-color 0.2s;
    }
    
    .category-header:hover {
      background-color: #f8f9fa;
    }
    
    .category-info {
      display: flex;
      align-items: center;
      flex: 1;
    }
    
    .category-icon {
      color: #1a73e8;
      margin-right: 12px;
      font-size: 20px;
    }
    
    .category-name {
      font-weight: 500;
      color: #1a73e8;
      font-size: 14px;
    }
    
    .expand-icon {
      color: #5f6368;
      font-size: 18px;
      transition: transform 0.2s;
    }
    
    .expand-icon.expanded {
      transform: rotate(180deg);
    }
    
    .category-items {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
      background: #f8f9fa;
    }
    
    .category-items.expanded {
      max-height: 1000px;
    }
    
    .nav-item {
      display: flex !important;
      align-items: center !important;
      padding: 8px 20px 8px 52px !important;
      text-decoration: none;
      color: #5f6368;
      font-size: 14px;
      min-height: 36px !important;
      transition: background-color 0.2s;
    }
    
    .nav-item:hover {
      background-color: #e8f0fe !important;
      color: #1a73e8;
    }
    
    .nav-item.active {
      background-color: #e8f0fe !important;
      color: #1a73e8;
      font-weight: 500;
    }
    
    .item-icon {
      margin-right: 12px;
      font-size: 18px;
      color: inherit;
    }
    `
  ]
})
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isAuthenticated$: Observable<boolean>;
  isDemoMode$: Observable<boolean>;
  currentProject$: Observable<Project | null>;
  isDocumentationRoute = false;

  navCategories: NavCategory[] = [
    {
      name: 'VPC Network',
      icon: 'cloud',
      expanded: true,
      items: [
        { name: 'VPC networks', route: '/vpc', icon: 'cloud' },
        { name: 'IP addresses', route: '/ip-addresses', icon: 'language' },
        { name: 'Cloud Number Registry', route: '/cnr', icon: 'public' },
        { name: 'Routes', route: '/routes', icon: 'route' }
      ]
    },
    {
      name: 'Network Services',
      icon: 'settings_applications',
      expanded: true,
      items: [
        { name: 'Load balancing', route: '/load-balancing', icon: 'balance' },
        { name: 'Cloud DNS', route: '/dns-management', icon: 'dns' }
      ]
    },
    {
      name: 'Network Connectivity',
      icon: 'hub',
      expanded: false,
      items: [
        { name: 'Network Solutions', route: '/network-solutions', icon: 'hub' }
      ]
    },
    {
      name: 'Network Security',
      icon: 'shield',
      expanded: false,
      items: [
        { name: 'Firewall', route: '/firewall', icon: 'security' },
        { name: 'Third Party Packet Intercept', route: '/tppi', icon: 'swap_horiz' },
        { name: 'Packet Mirroring', route: '/packet-mirroring', icon: 'visibility' },
        { name: 'Cloud Armor', route: '/cloud-armor-policies', icon: 'shield' },
        { name: 'TLS inspection policies', route: '/tls-inspection-policies', icon: 'security_scan' },
        { name: 'Address groups', route: '/address-groups', icon: 'group_work' }
      ]
    },
    {
      name: 'Network Observability',
      icon: 'analytics',
      expanded: false,
      items: [
        { name: 'Flow Analyzer', route: '/flow-analyzer', icon: 'analytics' },
        { name: 'Network Topology', route: '/topology', icon: 'hub' },
        { name: 'Network Health Monitor', route: '/network-health-monitor', icon: 'health_and_safety' },
        { name: 'Cloud Network Insights', route: '/cloud-network-insights', icon: 'insights' },
        { name: 'Connectivity Tests', route: '/connectivity-tests', icon: 'lan' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private projectService: ProjectService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.isDemoMode$ = this.authService.isDemoMode$;
    this.currentProject$ = this.projectService.currentProject$;
  }

  ngOnInit() {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event as NavigationEnd)
    ).subscribe((event) => {
      this.isDocumentationRoute = event.url === '/documentation';
      
      if (this.sidenav) {
        if (this.isDocumentationRoute) {
          this.sidenav.close();
        } else {
          this.sidenav.open();
        }
      }
    });

    // Load projects immediately if authenticated (but not in demo mode)
    if (this.authService.isAuthenticated() && !this.authService.isDemoMode()) {
      this.loadProjectsOnInit();
    }

    // Listen for authentication changes
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated && !this.authService.isDemoMode()) {
        this.loadProjectsOnInit();
      }
    });
  }

  private loadProjectsOnInit() {
    // Check if we already have a current project
    const currentProject = this.projectService.getCurrentProject();
    
    if (!currentProject) {
      console.log('🔄 No project selected, loading projects and auto-selecting first one...');
      this.projectService.loadProjects().subscribe({
        next: (projects) => {
          if (projects.length > 0 && !this.projectService.getCurrentProject()) {
            console.log('🎯 Auto-selecting first project:', projects[0].name);
            this.projectService.setCurrentProject(projects[0]);
          }
        },
        error: (error) => {
          console.error('❌ Error loading projects on init:', error);
        }
      });
    } else {
      console.log('✅ Project already selected:', currentProject.name);
    }
  }

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openProjectPicker() {
    // Don't load real projects in demo mode
    if (this.authService.isDemoMode()) {
      const dialogRef = this.dialog.open(ProjectPickerComponent, {
        data: { selectedProject: this.projectService.getCurrentProject() },
        width: '600px'
      });
      
      dialogRef.afterClosed().subscribe((result: Project) => {
        if (result) {
          this.projectService.setCurrentProject(result);
        }
      });
      return;
    }

    // Load projects before opening picker (for real authentication)
    this.projectService.loadProjects().subscribe({
      next: (projects) => {
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
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        // Still open picker with potentially mock data
        const dialogRef = this.dialog.open(ProjectPickerComponent, {
          data: { selectedProject: this.projectService.getCurrentProject() },
          width: '600px'
        });
        
        dialogRef.afterClosed().subscribe((result: Project) => {
          if (result) {
            this.projectService.setCurrentProject(result);
          }
        });
      }
    });
  }

  toggleCategory(category: NavCategory) {
    category.expanded = !category.expanded;
  }
} 