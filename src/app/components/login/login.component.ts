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
          <p class="welcome-text">Welcome to Google Cloud Console Vibe</p>
          
          <!-- Authentication Options -->
          <div class="auth-options">
            <!-- Google Sign In -->
            <div class="auth-option">
              <button mat-raised-button color="primary" (click)="login()" class="auth-button">
                <mat-icon>login</mat-icon>
                Sign in with Google
              </button>
              <p class="auth-description">
                Access your real Google Cloud projects and live data
              </p>
            </div>

            <div class="divider-container">
              <mat-divider></mat-divider>
              <span class="divider-text">OR</span>
              <mat-divider></mat-divider>
            </div>

            <!-- Demo Mode -->
            <div class="auth-option">
              <button mat-raised-button color="accent" (click)="loginDemo()" class="auth-button demo-button">
                <mat-icon>visibility</mat-icon>
                Try Demo Mode
              </button>
              <p class="auth-description">
                Explore the interface with mock data (no authentication required)
              </p>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-content class="info-section">
          <mat-divider></mat-divider>
          <div class="info-message">
            <mat-icon class="info-icon">info</mat-icon>
            <div class="info-text">
              <h4>Google Authentication Requirements:</h4>
              <ul>
                <li>
                  <strong>Use a private Gmail account</strong> - Access to corporate data for third-party products is restricted for security purposes. 
                  See <code>go/blocked-android-gsuite-access</code> for more information.
                </li>
                <li>
                  <strong>GCP Project Access Required</strong> - Your account needs to have access to at least one Google Cloud Platform project.
                </li>
                <li>
                  <strong>OAuth Test Users Only</strong> - This app is in development mode. Your Gmail address must be added to "Test Users" 
                  by contacting <strong>przemeksroka&#64;google.com</strong> before you can sign in.
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
      max-width: 550px;
      width: 100%;
      text-align: center;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .welcome-text {
      font-size: 18px;
      color: #5f6368;
      margin-bottom: 32px;
    }
    
    .auth-options {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .auth-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .auth-button {
      width: 280px;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    }
    
    .auth-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .demo-button {
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      border: none;
    }
    
    .demo-button:hover {
      background: linear-gradient(135deg, #ee5a24, #ff6b6b);
    }
    
    .auth-description {
      font-size: 14px;
      color: #5f6368;
      margin: 0;
      text-align: center;
      max-width: 300px;
      line-height: 1.4;
    }
    
    .divider-container {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 8px 0;
    }
    
    .divider-text {
      font-size: 12px;
      color: #9aa0a6;
      font-weight: 500;
      white-space: nowrap;
    }
    
    mat-divider {
      flex: 1;
    }
    
    .info-section {
      text-align: left;
      margin-top: 24px;
      padding-top: 24px;
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
    
    @media (max-width: 600px) {
      .login-card {
        padding: 24px;
        margin: 16px;
      }
      
      .auth-button {
        width: 100%;
        max-width: 280px;
      }
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

  loginDemo() {
    this.authService.loginDemo();
    this.router.navigate(['/vpc']);
  }
} 