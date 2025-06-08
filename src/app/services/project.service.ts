import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { map, catchError, tap } from 'rxjs/operators';

export interface Project {
  name: string;
  id: string;
  type: string;
  starred: boolean;
  displayName?: string;
  projectNumber?: string;
  lifecycleState?: string;
  createTime?: string;
  parent?: {
    type: string;
    id: string;
  };
}

interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime: string;
  parent?: {
    type: string;
    id: string;
  };
}

interface GcpProjectsResponse {
  projects: GcpProject[];
  nextPageToken?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private baseUrl = 'https://cloudresourcemanager.googleapis.com/v1';
  private currentProjectSubject = new BehaviorSubject<Project | null>(this.loadInitialProject());
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  
  currentProject$ = this.currentProjectSubject.asObservable();
  projects$ = this.projectsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Initialize demo projects if in demo mode
    if (this.authService.isDemoMode()) {
      this.initializeDemoProjects();
    }
  }

  private initializeDemoProjects() {
    console.log('🎭 Initializing demo projects...');
    this.getMockProjects().subscribe();
  }

  setCurrentProject(project: Project) {
    try {
      if (!project || !project.id) {
        console.error('❌ Invalid project data provided to setCurrentProject');
        return;
      }

      this.currentProjectSubject.next(project);
      localStorage.setItem('currentProject', JSON.stringify(project));
      console.log('💾 Current project saved to localStorage:', project.name, `(${project.id})`);
    } catch (error) {
      console.error('❌ Error saving project to localStorage:', error);
      // Still update the subject even if localStorage fails
      this.currentProjectSubject.next(project);
    }
  }

  getCurrentProject(): Project | null {
    return this.currentProjectSubject.value;
  }

  clearCurrentProject() {
    this.currentProjectSubject.next(null);
    localStorage.removeItem('currentProject');
    console.log('🗑️  Current project cleared from memory and localStorage');
  }

  loadProjects(): Observable<Project[]> {
    // Always use mock projects in demo mode
    if (this.authService.isDemoMode()) {
      console.log('🎭 Demo mode: Using mock projects');
      return this.getMockProjects();
    }

    console.log('🔄 Loading projects from Google Cloud Resource Manager API...');
    
    // Check authentication first
    if (!this.authService.isAuthenticated()) {
      console.warn('⚠️  User is not authenticated. Returning mock projects.');
      return this.getMockProjects();
    }

    const url = `${this.baseUrl}/projects`;
    
    return this.http.get<GcpProjectsResponse>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        const projects = response.projects || [];
        console.log(`✅ Found ${projects.length} projects from Google Cloud`);
        
        const convertedProjects = projects
          .filter(p => p.lifecycleState === 'ACTIVE') // Only active projects
          .map(gcpProject => this.convertGcpProject(gcpProject));
        
        // Load starred projects from localStorage
        const starredProjectIds = this.getStarredProjects();
        convertedProjects.forEach(project => {
          project.starred = starredProjectIds.includes(project.id);
        });
        
        this.projectsSubject.next(convertedProjects);
        
        // Auto-select first project if none selected
        this.autoSelectFirstProject(convertedProjects);
        
        return convertedProjects;
      }),
      catchError(error => {
        console.error('❌ Error fetching projects from Google Cloud Resource Manager API:', error);
        if (error.status === 403) {
          console.warn('🔐 Insufficient permissions for Resource Manager API. Required scopes: https://www.googleapis.com/auth/cloud-platform');
        } else if (error.status === 401) {
          console.warn('🔑 Authentication token may be expired or invalid');
        }
        console.log('🔄 Falling back to mock projects...');
        return this.getMockProjects();
      })
    );
  }

  private autoSelectFirstProject(projects: Project[]) {
    const currentProject = this.getCurrentProject();
    
    // If we have a saved project from localStorage, try to find it in the loaded projects
    if (currentProject) {
      const savedProjectExists = projects.find(p => p.id === currentProject.id);
      if (savedProjectExists) {
        console.log('✅ Previously selected project found in loaded projects:', currentProject.name);
        // Update the current project with fresh data from the server
        this.setCurrentProject(savedProjectExists);
        return;
      } else {
        console.log('⚠️  Previously selected project no longer exists or is not accessible:', currentProject.name);
        // Clear the invalid saved project
        localStorage.removeItem('currentProject');
      }
    }
    
    // Only auto-select first project if no project was previously saved or the saved project is invalid
    if (projects.length > 0) {
      console.log('🎯 Auto-selecting first project:', projects[0].name);
      this.setCurrentProject(projects[0]);
    } else {
      console.log('⚠️  No projects available for selection');
      // Clear any invalid saved project
      this.currentProjectSubject.next(null);
      localStorage.removeItem('currentProject');
    }
  }

  toggleProjectStar(project: Project) {
    project.starred = !project.starred;
    
    // Update in current projects list
    const currentProjects = this.projectsSubject.value;
    const updatedProjects = currentProjects.map(p => 
      p.id === project.id ? { ...p, starred: project.starred } : p
    );
    this.projectsSubject.next(updatedProjects);
    
    // Save to localStorage
    this.saveStarredProjects(updatedProjects.filter(p => p.starred).map(p => p.id));
  }

  getStarredProjects(): string[] {
    const starred = localStorage.getItem('starredProjects');
    return starred ? JSON.parse(starred) : [];
  }

  private saveStarredProjects(projectIds: string[]) {
    localStorage.setItem('starredProjects', JSON.stringify(projectIds));
  }

  private convertGcpProject(gcpProject: GcpProject): Project {
    return {
      name: gcpProject.name || gcpProject.projectId,
      id: gcpProject.projectId,
      type: 'Project',
      starred: false, // Will be set later from localStorage
      displayName: gcpProject.name,
      projectNumber: gcpProject.projectNumber,
      lifecycleState: gcpProject.lifecycleState,
      createTime: gcpProject.createTime,
      parent: gcpProject.parent
    };
  }

  private getMockProjects(): Observable<Project[]> {
    const mockProjects: Project[] = [
      { 
        name: 'Cloud Console Vibe Demo', 
        id: 'cloud-console-vibe-demo', 
        type: 'Project', 
        starred: true,
        displayName: 'Cloud Console Vibe Demo',
        projectNumber: '123456789012',
        lifecycleState: 'ACTIVE'
      },
      { 
        name: 'Network Topology Demo', 
        id: 'net-top-viz-demo-208511', 
        type: 'Project', 
        starred: false,
        displayName: 'Network Topology Demo',
        projectNumber: '234567890123',
        lifecycleState: 'ACTIVE'
      },
      { 
        name: 'Production Environment', 
        id: 'production-env-demo', 
        type: 'Project', 
        starred: true,
        displayName: 'Production Environment',
        projectNumber: '345678901234',
        lifecycleState: 'ACTIVE'
      },
      { 
        name: 'Development Playground', 
        id: 'dev-playground-demo', 
        type: 'Project', 
        starred: false,
        displayName: 'Development Playground',
        projectNumber: '456789012345',
        lifecycleState: 'ACTIVE'
      },
      { 
        name: 'Staging Environment', 
        id: 'staging-env-demo', 
        type: 'Project', 
        starred: false,
        displayName: 'Staging Environment',
        projectNumber: '567890123456',
        lifecycleState: 'ACTIVE'
      }
    ];
    
    if (this.authService.isDemoMode()) {
      console.log('🎭 Using demo projects for demonstration');
    } else {
      console.log('🔄 Using mock projects');
    }
    
    this.projectsSubject.next(mockProjects);
    
    // Always auto-select first project if none selected
    if (!this.getCurrentProject() && mockProjects.length > 0) {
      console.log('🎯 Auto-selecting first project:', mockProjects[0].name);
      this.setCurrentProject(mockProjects[0]);
    }
    
    return of(mockProjects);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private loadInitialProject(): Project | null {
    try {
      const saved = localStorage.getItem('currentProject');
      if (saved) {
        const project = JSON.parse(saved);
        console.log('📂 Loaded saved project from localStorage:', project.name);
        return project;
      } else {
        console.log('📂 No saved project found in localStorage');
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading saved project from localStorage:', error);
      // Clean up corrupted data
      localStorage.removeItem('currentProject');
      return null;
    }
  }
} 