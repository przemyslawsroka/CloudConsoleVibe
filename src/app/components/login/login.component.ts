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
    }
    .login-card {
      max-width: 400px;
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