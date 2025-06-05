import { Injectable } from '@angular/core';
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

  constructor(private http: HttpClient) {
    // Check if user is already authenticated
    const token = localStorage.getItem('access_token');
    if (token) {
      this.accessToken = token;
      this.isAuthenticatedSubject.next(true);
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
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    this.isAuthenticatedSubject.next(false);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
} 