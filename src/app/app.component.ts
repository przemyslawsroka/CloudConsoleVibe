import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { ProjectPickerComponent, Project } from './components/project-picker/project-picker.component';
import { ProjectService } from './services/project.service';

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
          Sign Out
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
        { name: 'Connectivity Tests', route: '/connectivity-tests', icon: 'network_check' },
        { name: 'Network topology', route: '/topology', icon: 'account_tree' }
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

  toggleCategory(category: NavCategory) {
    category.expanded = !category.expanded;
  }
} 