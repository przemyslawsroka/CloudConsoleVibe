import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isDemoModeSubject = new BehaviorSubject<boolean>(false);
  
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  isDemoMode$ = this.isDemoModeSubject.asObservable();
  
  private accessToken: string | null = null;

  constructor(private http: HttpClient) {
    // Check if user is already authenticated
    const token = localStorage.getItem('access_token');
    const demoMode = localStorage.getItem('demo_mode') === 'true';
    
    if (token || demoMode) {
      this.accessToken = token;
      this.isAuthenticatedSubject.next(true);
      this.isDemoModeSubject.next(demoMode);
    }
  }

  getEnvironmentInfo() {
    return {
      production: environment.production,
      googleClientId: environment.googleClientId,
      apiBaseUrl: environment.apiBaseUrl,
      authDomain: environment.authDomain,
      currentUrl: window.location.origin,
      expectedRedirectUri: window.location.origin + '/auth/callback'
    };
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

  loginDemo() {
    console.log('🎭 Starting demo mode login...');
    
    // Set demo mode and authenticate with mock data
    this.accessToken = 'demo-mode-token';
    localStorage.setItem('demo_mode', 'true');
    localStorage.removeItem('access_token'); // Remove any real token
    this.isAuthenticatedSubject.next(true);
    this.isDemoModeSubject.next(true);
    
    console.log('✅ Demo mode activated with mock data');
  }

  handleAuthCallback(token: string) {
    this.accessToken = token;
    localStorage.setItem('access_token', token);
    localStorage.removeItem('demo_mode'); // Remove demo mode when using real auth
    this.isAuthenticatedSubject.next(true);
    this.isDemoModeSubject.next(false);
    
    console.log('🔑 Authentication successful, projects will be loaded by app component');
  }

  logout() {
    console.log('🚪 Logging out user...');
    
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('starredProjects');
    
    this.isAuthenticatedSubject.next(false);
    this.isDemoModeSubject.next(false);
    
    console.log('✅ Logout complete - all user data cleared');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isDemoMode(): boolean {
    return this.isDemoModeSubject.value;
  }
} 