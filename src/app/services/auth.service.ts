import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private accessToken: string | null = null;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    // Check if user is already authenticated
    const token = localStorage.getItem('access_token');
    if (token) {
      this.accessToken = token;
      this.isAuthenticatedSubject.next(true);
      // Load projects after restoring authentication state
      this.loadProjectsAfterAuth();
    }
  }

  login() {
    const clientId = environment.googleClientId;
    const redirectUri = window.location.origin + '/auth/callback';
    const scope = 'https://www.googleapis.com/auth/cloud-platform';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=token&` +
      `scope=${scope}&` +
      `prompt=consent`;

    window.location.href = authUrl;
  }

  handleAuthCallback(token: string) {
    this.accessToken = token;
    localStorage.setItem('access_token', token);
    this.isAuthenticatedSubject.next(true);
    
    console.log('🔑 Authentication successful, loading projects...');
    // Load projects after successful authentication
    this.loadProjectsAfterAuth();
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('starredProjects');
    this.isAuthenticatedSubject.next(false);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private loadProjectsAfterAuth() {
    // Use setTimeout to avoid circular dependency issues
    setTimeout(() => {
      try {
        // Get ProjectService using injector to avoid circular dependency
        const ProjectService = this.injector.get<any>('ProjectService' as any);
        if (ProjectService) {
          ProjectService.loadProjects().subscribe({
            next: (projects: any[]) => {
              console.log(`✅ Auto-loaded ${projects.length} projects after authentication`);
            },
            error: (error: any) => {
              console.warn('⚠️  Failed to auto-load projects after authentication:', error);
            }
          });
        }
      } catch (error) {
        // Handle case where ProjectService might not be available yet
        console.warn('⚠️  ProjectService not available yet, projects will be loaded on first access');
      }
    }, 100);
  }
} 