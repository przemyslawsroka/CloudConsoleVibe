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
  ) {}

  setCurrentProject(project: Project) {
    this.currentProjectSubject.next(project);
    localStorage.setItem('currentProject', JSON.stringify(project));
    console.log('🎯 Current project set to:', project.id);
  }

  getCurrentProject(): Project | null {
    return this.currentProjectSubject.value;
  }

  loadProjects(): Observable<Project[]> {
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
    
    // Only auto-select if no project is currently selected and we have projects
    if (!currentProject && projects.length > 0) {
      console.log('🎯 Auto-selecting first project on initial login...');
      this.setCurrentProject(projects[0]);
    } else if (currentProject && projects.length > 0) {
      // Verify current project still exists in the list
      const projectExists = projects.find(p => p.id === currentProject.id);
      if (!projectExists) {
        console.log('⚠️  Previously selected project no longer exists, selecting first available...');
        this.setCurrentProject(projects[0]);
      }
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
      { name: 'net-top-viz-demo-208511', id: 'net-top-viz-demo-208511', type: 'Project', starred: true },
      { name: 'przemeksroka-joonix-service', id: 'przemeksroka-joonix-service', type: 'Project', starred: false },
      { name: 'online-boutique', id: 'online-boutique-308414', type: 'Project', starred: false },
      { name: 'przemek-sroka-private', id: 'aerial-reef-282520', type: 'Project', starred: false },
      { name: 'Gemini API', id: 'gen-lang-client-0296497231', type: 'Project', starred: false },
      { name: 'przemeksroka-joonix-log-test', id: 'przemeksroka-joonix-log-test', type: 'Project', starred: false }
    ];
    
    this.projectsSubject.next(mockProjects);
    this.autoSelectFirstProject(mockProjects);
    
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
    const saved = localStorage.getItem('currentProject');
    return saved ? JSON.parse(saved) : null;
  }
} 