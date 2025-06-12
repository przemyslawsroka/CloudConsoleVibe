import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GoogleWANService, GoogleWANConfig } from '../../services/google-wan.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-google-wan-wizard',
  template: `
    <div class="wizard-container">
      <div class="wizard-header">
        <h1>Google Wide Area Network Wizard</h1>
        <p>Design and deploy enterprise-grade WAN infrastructure</p>
      </div>
      
      <div class="content">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Project Configuration</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="projectForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Project ID</mat-label>
                <input matInput formControlName="projectId" placeholder="my-gcp-project">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Application Name</mat-label>
                <input matInput formControlName="applicationName" placeholder="my-wan-network">
              </mat-form-field>
            </form>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="generateTerraform()">
              Generate Terraform
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .wizard-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
  `]
})
export class GoogleWANWizardComponent implements OnInit {
  projectForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private googleWANService: GoogleWANService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    // Component initialization
  }

  private initializeForms(): void {
    this.projectForm = this.fb.group({
      projectId: ['', Validators.required],
      applicationName: ['', Validators.required]
    });
  }

  generateTerraform(): void {
    const config: GoogleWANConfig = {
      projectId: this.projectForm.get('projectId')?.value || '',
      applicationName: this.projectForm.get('applicationName')?.value || '',
      primaryRegion: 'us-central1',
      wanArchitecture: 'enterprise-backbone',
      networkConfig: {
        hubRegion: 'us-central1',
        enableGlobalRouting: true,
        enableRouteExchange: true
      },
      connectivityConfig: {
        onPremConnectivity: {
          enabled: false,
          type: 'cloud-vpn'
        },
        multiCloudConnectivity: {
          enabled: false
        },
        siteToSiteConnectivity: {
          enabled: false,
          enableDataTransfer: false
        }
      },
      nccConfig: {
        enableNCC: true
      },
      securityConfig: {
        enableCloudArmor: false,
        enableFirewallRules: true,
        enablePrivateGoogleAccess: true,
        enableCloudNAT: true
      },
      operationsConfig: {
        enableNetworkIntelligence: true,
        enableFlowLogs: false,
        enableConnectivityTests: false
      }
    };
    
    this.googleWANService.generateTerraformConfig(config).subscribe({
      next: (template) => {
        this.snackBar.open('Terraform configuration generated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error generating Terraform:', error);
        this.snackBar.open('Error generating Terraform configuration', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
