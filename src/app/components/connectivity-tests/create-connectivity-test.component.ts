import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ControlContainer, FormGroupDirective } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConnectivityTestsService, ConnectivityTestRequest } from '../../services/connectivity-tests.service';
import { ProjectService, Project } from '../../services/project.service';
import { ConnectivityTestNameService } from './shared/connectivity-test-name.service';
import { ConnectivityTestFormData } from './shared/connectivity-test.interfaces';

@Component({
  selector: 'app-create-connectivity-test',
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
  template: `
    <gcp-page-layout>
      <div class="page-header">
        <div class="header-content">
          <button mat-icon-button (click)="onCancel()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1>Create Connectivity Test</h1>
            <p class="subtitle">Configure a new connectivity test to check network connectivity between endpoints</p>
          </div>
        </div>
      </div>

      <div class="page-content">
        <form [formGroup]="testForm" class="test-form">

          <!-- Source section -->
          <app-source-endpoint 
            formGroupName="source"
            (endpointChange)="onEndpointChange()">
          </app-source-endpoint>

          <!-- Destination section -->
          <app-destination-endpoint 
            formGroupName="destination"
            (endpointChange)="onEndpointChange()">
          </app-destination-endpoint>

          <!-- Protocol -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Protocol</mat-label>
            <mat-select formControlName="protocol">
              <mat-option value="tcp">tcp</mat-option>
              <mat-option value="udp">udp</mat-option>
              <mat-option value="icmp">icmp</mat-option>
              <mat-option value="icmpv6">icmpv6</mat-option>
              <mat-option value="esp">esp</mat-option>
              <mat-option value="ah">ah</mat-option>
              <mat-option value="sctp">sctp</mat-option>
              <mat-option value="ipip">ipip</mat-option>
            </mat-select>
            <mat-error *ngIf="testForm.get('protocol')?.hasError('required')">
              Protocol is required
            </mat-error>
          </mat-form-field>

          <!-- Test name -->
          <div class="test-name-container">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Test name *</mat-label>
              <input matInput formControlName="displayName" 
                     placeholder="Auto-generated based on source and destination"
                     (input)="onTestNameManualEdit()">
              <button mat-icon-button matSuffix type="button" 
                      (click)="refreshTestName()" 
                      matTooltip="Refresh auto-generated name">
                <mat-icon>refresh</mat-icon>
              </button>
              <mat-hint *ngIf="!userHasEditedName">Automatically generated from source and destination selection</mat-hint>
              <mat-hint *ngIf="userHasEditedName">Custom name - lowercase letters, numbers, hyphens allowed</mat-hint>
              <mat-error *ngIf="testForm.get('displayName')?.hasError('required')">
                Test name is required
              </mat-error>
              <mat-error *ngIf="testForm.get('displayName')?.hasError('pattern')">
                Only lowercase letters, numbers, and hyphens are allowed
              </mat-error>
            </mat-form-field>
          </div>

        </form>

        <!-- Bottom action buttons -->
        <div class="bottom-actions">
          <button mat-button (click)="onCancel()">CANCEL</button>
          <button mat-raised-button color="primary" 
                  [disabled]="!testForm.valid || isCreating" 
                  (click)="onCreate()">
            {{ isCreating ? 'CREATING...' : 'CREATE' }}
          </button>
        </div>
      </div>
    </gcp-page-layout>
  `,
  styleUrls: ['./create-connectivity-test.component.scss']
})
export class CreateConnectivityTestComponent implements OnInit, OnDestroy {
  testForm: FormGroup;
  isCreating = false;
  userHasEditedName = false;
  userIpAddress: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private connectivityTestsService: ConnectivityTestsService,
    private projectService: ProjectService,
    private nameService: ConnectivityTestNameService
  ) {
    this.testForm = this.createForm();
  }

  ngOnInit() {
    this.setupFormValidation();
    this.loadUserIpAddress();
    this.prefillCurrentProject();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      displayName: ['', [
        Validators.required, 
        Validators.pattern(/^[a-z0-9\-]+$/)
      ]],
      protocol: ['tcp', Validators.required],
      source: this.fb.group({
        endpointType: ['', Validators.required],
        category: [''],
        ip: [''],
        instance: [''],
        domain: [''],
        service: [''],
        cluster: [''],
        workload: [''],
        networkProject: [''],
        networkVpc: [''],
        networkSubnet: [''],
        ipType: ['gcp-vpc', Validators.required],
        connectionType: ['vpn-tunnel'],
        connectionResource: [''],
        project: [''],
        vpcNetwork: [''],
      }),
      destination: this.fb.group({
        endpointType: ['', Validators.required],
        category: [''],
        ip: [''],
        instance: [''],
        domain: [''],
        service: [''],
        cluster: [''],
        workload: [''],
        port: [80, [Validators.min(1), Validators.max(65535)]]
      }),
      roundTrip: [true]
    });
  }

  private setupFormValidation() {
    // Protocol validation for port requirement
    this.testForm.get('protocol')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(protocol => {
        const portControl = this.testForm.get('destination.port');
        
        if (protocol === 'tcp' || protocol === 'udp') {
          portControl?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(65535)
          ]);
        } else {
          portControl?.clearValidators();
        }
        
        portControl?.updateValueAndValidity({ emitEvent: false });
      });
  }

  private loadUserIpAddress() {
    this.http.get('/api/ipify')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.userIpAddress = response.ip;
        },
        error: (error: any) => {
          console.error('Error loading user IP address:', error);
        }
      });
  }

  private prefillCurrentProject() {
    const currentProject = this.projectService.getCurrentProject();
    if (currentProject) {
      this.testForm.patchValue({ 
        'source.networkProject': currentProject.id,
        'destination.networkProject': currentProject.id 
      });
    }
  }

  onEndpointChange() {
    this.updateTestName();
  }

  private updateTestName(): void {
    if (this.userHasEditedName) {
      return; // Don't auto-generate if user has manually edited the name
    }
    
    const formData = this.testForm.value as ConnectivityTestFormData;
    const generatedName = this.nameService.generateConnectivityTestName(formData, this.userIpAddress || undefined);
    
    if (!generatedName) {
      this.testForm.patchValue({ displayName: '' }, { emitEvent: false });
      return;
    }
    
    this.testForm.patchValue({ displayName: generatedName }, { emitEvent: false });
  }

  onTestNameManualEdit(): void {
    // Check if the current value differs from what would be auto-generated
    setTimeout(() => {
      const currentValue = this.testForm.get('displayName')?.value || '';
      const formData = this.testForm.value as ConnectivityTestFormData;
      const generatedValue = this.nameService.generateConnectivityTestName(formData, this.userIpAddress || undefined);
      
      // If user typed something different from auto-generated name, mark as manually edited
      if (currentValue.trim() !== '' && currentValue !== generatedValue) {
        this.userHasEditedName = true;
      } else if (currentValue.trim() === '' || currentValue === generatedValue) {
        // If user cleared the field or made it match generated name, allow auto-generation again
        this.userHasEditedName = false;
        if (currentValue.trim() === '' && generatedValue) {
          // Auto-fill if field is empty and we have a generated name
          this.updateTestName();
        }
      }
    }, 10);
  }

  refreshTestName(): void {
    // Force refresh the test name by temporarily resetting the manual edit flag
    this.userHasEditedName = false;
    this.updateTestName();
  }

  onCancel() {
    this.router.navigate(['/connectivity-tests']);
  }

  onCreate() {
    if (this.testForm.valid && !this.isCreating) {
      this.isCreating = true;
      const formValue = this.testForm.value;
      
      // Build test data from form
      const testData = this.buildTestDataFromForm(formValue);

      // Get current project ID
      const project = this.projectService.getCurrentProject();
      if (project) {
        this.connectivityTestsService.createConnectivityTest(project.id, testData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (newTest) => {
              this.snackBar.open('Connectivity test created successfully', 'Close', { 
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.router.navigate(['/connectivity-tests']);
            },
            error: (error: any) => {
              this.isCreating = false;
              this.handleCreateError(error);
            }
          });
      } else {
        this.isCreating = false;
        this.snackBar.open('No project selected. Please select a project first.', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  private buildTestDataFromForm(formValue: any): ConnectivityTestRequest {
    // Build source endpoint
    const source: any = {};
    switch (formValue.source.endpointType) {
      case 'ipAddress':
        source.ipAddress = formValue.source.ip;
        if (formValue.source.project) {
          source.projectId = formValue.source.project;
        }
        break;
      case 'myIpAddress':
        source.ipAddress = this.userIpAddress;
        source.type = 'my-ip-address';
        break;
      case 'cloudShell':
        source.type = 'cloud-shell';
        break;
      case 'cloudConsoleSsh':
        source.type = 'cloud-console-ssh';
        break;
      case 'gceInstance':
        source.instance = formValue.source.instance;
        break;
      // Add other source types as needed
    }

    // Build destination endpoint
    const destination: any = {};
    switch (formValue.destination.endpointType) {
      case 'ipAddress':
        destination.ipAddress = formValue.destination.ip;
        break;
      case 'domainName':
        destination.domainName = formValue.destination.domain;
        break;
      case 'googleApis':
        destination.googleApi = formValue.destination.service;
        break;
      case 'gceInstance':
        destination.instance = formValue.destination.instance;
        break;
      // Add other destination types as needed
    }
    
    // Add port for TCP/UDP
    if ((formValue.protocol === 'tcp' || formValue.protocol === 'udp') && formValue.destination.port) {
      destination.port = formValue.destination.port;
    }

    return {
      displayName: formValue.displayName,
      protocol: formValue.protocol,
      source: source,
      destination: destination,
      roundTrip: true,
      labels: {
        'created-by': 'cloud-console-vibe',
        'environment': 'development'
      }
    };
  }

  private handleCreateError(error: any) {
    console.error('Error creating connectivity test:', error);
    
    let errorMessage = 'Error creating connectivity test';
    
    if (error.status === 400) {
      if (error.error?.error?.message) {
        errorMessage = `Invalid request: ${error.error.error.message}`;
      } else {
        errorMessage = 'Invalid request format. Please check your input parameters.';
      }
    } else if (error.status === 403) {
      errorMessage = 'Permission denied. Please check your Network Management API permissions.';
    } else if (error.status === 409) {
      errorMessage = 'A connectivity test with this name already exists.';
    }
    
    this.snackBar.open(errorMessage, 'Close', { 
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
