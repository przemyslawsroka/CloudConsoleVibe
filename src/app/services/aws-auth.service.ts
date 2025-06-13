import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AWSCredentials } from '../interfaces/multi-cloud.interface';

@Injectable({
  providedIn: 'root'
})
export class AWSAuthService {
  private credentialsSubject = new BehaviorSubject<AWSCredentials | null>(null);
  public credentials$ = this.credentialsSubject.asObservable();

  constructor() {
    // Load saved credentials from localStorage
    this.loadSavedCredentials();
  }

  private loadSavedCredentials() {
    try {
      const saved = localStorage.getItem('aws-credentials');
      if (saved) {
        const credentials = JSON.parse(saved);
        this.credentialsSubject.next(credentials);
      }
    } catch (error) {
      console.error('Failed to load AWS credentials:', error);
      localStorage.removeItem('aws-credentials');
    }
  }

  setCredentials(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    const credentials: AWSCredentials = { accessKeyId, secretAccessKey, region };
    
    try {
      // Save to localStorage (in production, consider encryption)
      localStorage.setItem('aws-credentials', JSON.stringify(credentials));
      this.credentialsSubject.next(credentials);
      return true;
    } catch (error) {
      console.error('Failed to save AWS credentials:', error);
      return false;
    }
  }

  clearCredentials() {
    localStorage.removeItem('aws-credentials');
    this.credentialsSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.credentialsSubject.value !== null;
  }

  getCredentials(): AWSCredentials | null {
    return this.credentialsSubject.value;
  }

  updateRegion(region: string) {
    const current = this.credentialsSubject.value;
    if (current) {
      const updated = { ...current, region };
      localStorage.setItem('aws-credentials', JSON.stringify(updated));
      this.credentialsSubject.next(updated);
    }
  }
} 