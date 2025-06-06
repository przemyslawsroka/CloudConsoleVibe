import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Google Cloud Console</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Please sign in to access the Google Cloud Console</p>
          <button mat-raised-button color="primary" (click)="login()">
            <mat-icon>login</mat-icon>
            Sign in with Google
          </button>
        </mat-card-content>
        
        <mat-card-content class="info-section">
          <mat-divider></mat-divider>
          <div class="info-message">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <h4>Important Requirements:</h4>
              <ul>
                <li>
                  <strong>Use a private Gmail account</strong> - Access to corporate data for third-party products is restricted for security purposes. 
                  See <code>go/blocked-android-gsuite-access</code> for more information.
                </li>
                <li>
                  <strong>GCP Project Access Required</strong> - Your account needs to have access to at least one Google Cloud Platform project.
                </li>
              </ul>
              <p class="contact-info">
                <mat-icon class="contact-icon">email</mat-icon>
                Need assistance? Reach out to <strong>przemeksroka&#64;google.com</strong>
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .login-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
      padding: 20px;
    }
    mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    button {
      width: 200px;
    }
    .info-section {
      text-align: left;
      margin-top: 20px;
      padding-top: 20px;
    }
    .info-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 16px;
    }
    .info-icon {
      color: #1976d2;
      font-size: 24px;
      width: 24px;
      height: 24px;
      margin-top: 4px;
      flex-shrink: 0;
    }
    .info-text {
      flex: 1;
    }
    .info-text h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
    }
    .info-text ul {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }
    .info-text li {
      margin-bottom: 8px;
      line-height: 1.5;
      color: #555;
    }
    .info-text code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .contact-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 8px;
      color: #1976d2;
    }
    .contact-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    mat-divider {
      width: 100%;
      margin-bottom: 8px;
    }
  `]
})
export class LoginComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/vpc']);
    }
  }

  login() {
    this.authService.login();
  }
} 