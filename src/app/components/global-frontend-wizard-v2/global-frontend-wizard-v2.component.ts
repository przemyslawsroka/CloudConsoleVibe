import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

interface WizardStep {
  id: number;
  title: string;
  completed: boolean;
}

interface GlobalFrontendConfig {
  // Basics & Origin Server
  domainName: string;
  globalFrontendName: string;
  originLocation: 'gcp' | 'internet' | 'cross-cloud';
  internetOriginType: 'new' | 'existing';
  internetOriginName: string;
  originDomain: string;
  originPort: number;
  
  // Traffic Management
  protocol: 'http' | 'https';
  certificateName: string;
  certificateType: 'google-managed' | 'self-managed';
  healthCheckName: string;
  healthCheckProtocol: 'http' | 'https';
  healthCheckPort: number;
  healthCheckPath: string;
  
  // Caching
  cachingEnabled: boolean;
  cachingPolicyName: string;
  cdnEnforcement: 'on' | 'off';
  cacheMode: 'cache-static' | 'cache-all';
  clientTtl: string;
  defaultTtl: string;
  maxTtl: string;
  
  // Security
  securityEnabled: boolean;
  securityPolicyName: string;
  cloudArmorTier: 'standard' | 'enterprise';
  rateLimitingEnabled: boolean;
  requestCount: number;
  interval: string;
}

@Component({
  selector: 'app-global-frontend-wizard-v2',
  template: `
    <div class="wizard-container">
      <!-- Wizard Header -->
      <div class="wizard-header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Create global front end</h1>
      </div>

      <div class="wizard-content">
        <!-- Left Sidebar with Steps -->
        <div class="wizard-sidebar">
          <div class="steps-section">
            <h3>BASICS</h3>
            <div class="step-item" [class.active]="currentStep === 1" [class.completed]="steps[0].completed" (click)="goToStep(1)">
              <div class="step-number">
                <span *ngIf="!steps[0].completed">1</span>
                <mat-icon *ngIf="steps[0].completed" class="check-icon">check</mat-icon>
              </div>
              <span class="step-title">Basics & origin server</span>
            </div>
          </div>

          <div class="steps-section">
            <h3>GFE FEATURES</h3>
            <div class="step-item" [class.active]="currentStep === 2" [class.completed]="steps[1].completed" (click)="goToStep(2)">
              <div class="step-number">
                <span *ngIf="!steps[1].completed">2</span>
                <mat-icon *ngIf="steps[1].completed" class="check-icon">check</mat-icon>
              </div>
              <span class="step-title">Traffic management</span>
            </div>
            
            <div class="step-item" [class.active]="currentStep === 3" [class.completed]="steps[2].completed" (click)="goToStep(3)">
              <div class="step-number">
                <span *ngIf="!steps[2].completed">3</span>
                <mat-icon *ngIf="steps[2].completed" class="check-icon">check</mat-icon>
              </div>
              <span class="step-title">Caching</span>
            </div>
            
            <div class="step-item" [class.active]="currentStep === 4" [class.completed]="steps[3].completed" (click)="goToStep(4)">
              <div class="step-number">
                <span *ngIf="!steps[3].completed">4</span>
                <mat-icon *ngIf="steps[3].completed" class="check-icon">check</mat-icon>
              </div>
              <span class="step-title">Security</span>
            </div>
            
            <div class="step-item" [class.active]="currentStep === 5" [class.completed]="steps[4].completed" (click)="goToStep(5)">
              <div class="step-number">
                <span *ngIf="!steps[4].completed">5</span>
                <mat-icon *ngIf="steps[4].completed" class="check-icon">check</mat-icon>
              </div>
              <span class="step-title">Review</span>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="wizard-main">
          <!-- Step 1: Basics & Origin Server -->
          <div *ngIf="currentStep === 1" class="step-content" [formGroup]="basicForm">
            <h2>Basics & origin server</h2>
            
            <!-- Domain Section -->
            <div class="form-section">
              <h3>Domain</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Domain name</mat-label>
                <input matInput formControlName="domainName" placeholder="demo.acme.com">
                <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Global front end name</mat-label>
                <input matInput formControlName="globalFrontendName" placeholder="demo-acme-com-gfe-01">
                <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
              </mat-form-field>
            </div>

            <!-- Origin Section -->
            <div class="form-section">
              <h3>Origin</h3>
              <div class="form-subsection">
                <h4>Origin location</h4>
                <mat-radio-group formControlName="originLocation" class="radio-group-vertical">
                  <mat-radio-button value="gcp">In GCP</mat-radio-button>
                  <mat-radio-button value="internet">Outside of GCP on the Internet</mat-radio-button>
                  <mat-radio-button value="cross-cloud">Via Cross-cloud Network</mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="form-subsection" *ngIf="basicForm.get('originLocation')?.value === 'internet'">
                <h4>Internet origin</h4>
                <mat-radio-group formControlName="internetOriginType" class="radio-group-vertical">
                  <mat-radio-button value="new">Create new one</mat-radio-button>
                  <mat-radio-button value="existing">Choose from existing ones</mat-radio-button>
                </mat-radio-group>

                <div *ngIf="basicForm.get('internetOriginType')?.value === 'new'" class="origin-config">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Internet origin name</mat-label>
                    <input matInput formControlName="internetOriginName" placeholder="demo-acme-com-internetorigin01">
                    <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
                  </mat-form-field>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-grow">
                      <mat-label>Fully qualified domain name or IP address</mat-label>
                      <input matInput formControlName="originDomain" placeholder="origin.demo.com">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="port-field">
                      <mat-label>Port</mat-label>
                      <input matInput type="number" formControlName="originPort" placeholder="443">
                    </mat-form-field>
                  </div>
                </div>

                <div *ngIf="basicForm.get('internetOriginType')?.value === 'existing'" class="origin-config">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Internet network endpoint group</mat-label>
                    <mat-select formControlName="existingOrigin">
                      <mat-option value="anilsss">anilsss</mat-option>
                      <!-- Add more options as needed -->
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Traffic Management -->
          <div *ngIf="currentStep === 2" class="step-content">
            <h2>Traffic management</h2>
            
            <div class="google-best-practice">
              <div class="toggle-container">
                <span>Use Google best practice</span>
                <mat-slide-toggle [checked]="useGoogleBestPractice" (change)="toggleGoogleBestPractice($event)"></mat-slide-toggle>
              </div>
            </div>

            <div *ngIf="useGoogleBestPractice" class="best-practice-content">
              <h3>Google best practice for traffic management</h3>
              
              <div class="form-section">
                <h4>Basics</h4>
                <div class="readonly-field">
                  <label>Traffic management policy name</label>
                  <span>demo-acme-com-lb-1</span>
                </div>
                <div class="readonly-field">
                  <label>Protocol</label>
                  <span>HTTPS</span>
                </div>
              </div>

              <div class="form-section">
                <h4>Certificate</h4>
                <div class="readonly-field">
                  <label>Certificate name</label>
                  <span>demo-acme-com-cert</span>
                </div>
                <div class="readonly-field">
                  <label>Certificate type</label>
                  <span>Google-managed certificate</span>
                </div>
                <div class="readonly-field">
                  <label>Certificate authority type</label>
                  <span>Public</span>
                </div>
                <div class="readonly-field">
                  <label>Authorization type</label>
                  <span>Load balancer authorization</span>
                </div>
              </div>

              <div class="form-section">
                <h4>Health check</h4>
                <div class="readonly-field">
                  <label>Name</label>
                  <span>demo-acme-com-default-health-check1</span>
                </div>
                <div class="readonly-field">
                  <label>Protocol</label>
                  <span>HTTPs</span>
                </div>
                <div class="readonly-field">
                  <label>Port</label>
                  <span>443</span>
                </div>
                <div class="readonly-field">
                  <label>Request path</label>
                  <span>/foo/bar</span>
                </div>
                <div class="health-criteria">
                  <h5>Health criteria</h5>
                  <div class="readonly-field">
                    <label>Check interval</label>
                    <span>5</span>
                  </div>
                  <div class="readonly-field">
                    <label>Timeout</label>
                    <span>5</span>
                  </div>
                  <div class="readonly-field">
                    <label>Healthy threshold</label>
                    <span>2</span>
                  </div>
                  <div class="readonly-field">
                    <label>Unhealthy threshold</label>
                    <span>2</span>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!useGoogleBestPractice" class="custom-config-content" [formGroup]="trafficForm">
              <div class="form-section">
                <h3>Basics</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Traffic management policy name</mat-label>
                  <input matInput formControlName="policyName">
                  <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Protocol</mat-label>
                  <mat-select formControlName="protocol">
                    <mat-option value="https">HTTPS (includes HTTP/2 and HTTP/3)</mat-option>
                    <mat-option value="http">HTTP</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-section">
                <h3>Add certificate</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Certificate name</mat-label>
                  <input matInput formControlName="certificateName">
                  <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
                </mat-form-field>

                <div class="form-subsection">
                  <h4>Certificate type <mat-icon class="info-icon">info</mat-icon></h4>
                  <div class="readonly-field">
                    <span>Google-managed certificate</span>
                  </div>
                </div>

                <div class="form-subsection">
                  <h4>Certificate authority type <mat-icon class="info-icon">info</mat-icon></h4>
                  <div class="readonly-field">
                    <span>Public</span>
                  </div>
                </div>

                <div class="form-subsection">
                  <h4>Authorization type <mat-icon class="info-icon">info</mat-icon></h4>
                  <div class="readonly-field">
                    <span>Load balancer authorization</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h3>Health checking</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="healthCheckName">
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Protocol</mat-label>
                    <mat-select formControlName="healthCheckProtocol">
                      <mat-option value="https">HTTPS</mat-option>
                      <mat-option value="http">HTTP</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="port-field">
                    <mat-label>Port</mat-label>
                    <input matInput type="number" formControlName="healthCheckPort">
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Request path</mat-label>
                  <input matInput formControlName="healthCheckPath">
                </mat-form-field>

                <div class="form-subsection">
                  <h4>Health criteria</h4>
                  <p class="health-description">Define how health is determined: how often to check, how long to wait for a response, and how many successful or failed attempts are decisive.</p>
                  
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-grow">
                      <mat-label>Check interval</mat-label>
                      <input matInput type="number" formControlName="checkInterval">
                      <span matSuffix>seconds</span>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-grow">
                      <mat-label>Timeout</mat-label>
                      <input matInput type="number" formControlName="timeout">
                      <span matSuffix>seconds</span>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="flex-grow">
                      <mat-label>Healthy threshold</mat-label>
                      <input matInput type="number" formControlName="healthyThreshold">
                      <span matSuffix>consecutive successes</span>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-grow">
                      <mat-label>Unhealthy threshold</mat-label>
                      <input matInput type="number" formControlName="unhealthyThreshold">
                      <span matSuffix>consecutive failures</span>
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h3>Loggings</h3>
                <div class="toggle-button" [class.active]="trafficForm.get('loggingEnabled')?.value" (click)="toggleLogging()">
                  ON
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Caching -->
          <div *ngIf="currentStep === 3" class="step-content">
            <h2>Caching</h2>
            
            <div class="google-best-practice">
              <div class="toggle-container">
                <span>Use Google best practice</span>
                <mat-slide-toggle [checked]="useCachingBestPractice" (change)="toggleCachingBestPractice($event)"></mat-slide-toggle>
              </div>
            </div>

            <div *ngIf="useCachingBestPractice" class="best-practice-content">
              <h3>Google best practice for caching</h3>
              
              <div class="readonly-field">
                <label>Caching policy name</label>
                <span>demo-acme-com-default-caching-001</span>
              </div>
              <div class="readonly-field">
                <label>CDN enforcement</label>
                <span>On</span>
              </div>
              <div class="readonly-field">
                <label>Cache mode</label>
                <span>Cache static content</span>
              </div>
              <div class="readonly-field indent">
                <label>Client TTL</label>
                <span>1 day</span>
              </div>
              <div class="readonly-field indent">
                <label>Default TTL</label>
                <span>30 days</span>
              </div>
              <div class="readonly-field indent">
                <label>MAX TTL</label>
                <span>1 year</span>
              </div>
              <div class="readonly-field indent">
                <label>Cache key</label>
                <span>Default</span>
              </div>
              <div class="readonly-field">
                <label>Bypass cache on request header</label>
                <span>None</span>
              </div>
            </div>

            <div *ngIf="!useCachingBestPractice" class="custom-config-content" [formGroup]="cachingForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Caching policy name</mat-label>
                <input matInput formControlName="cachingPolicyName">
                <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
              </mat-form-field>

              <div class="form-section">
                <h3>CDN enforcement <mat-icon class="info-icon">info</mat-icon></h3>
                <p class="cdn-description">Cloud CDN caches HTTPs content closer to your users so content delivery is faster while also reducing serving costs. For more CDN options, go to the Cloud CDN page. <a href="#" class="learn-more">Learn more</a></p>
                
                <div class="toggle-button" [class.active]="cachingForm.get('cdnEnforcement')?.value" (click)="toggleCDNEnforcement()">
                  ON
                </div>
              </div>

              <div class="form-section">
                <h3>Cache mode <mat-icon class="info-icon">info</mat-icon></h3>
                <p class="cache-mode-description">By default, Cloud CDN will cache static content - including web assets and video files - that are not explicitly marked as private for the configured default time to live (TTL), without requiring any changes at your origin.</p>
                
                <mat-radio-group formControlName="cacheMode" class="radio-group-vertical">
                  <mat-radio-button value="cache-static">Cache static content (recommended)</mat-radio-button>
                  <mat-radio-button value="cache-control">Use origin settings based on Cache-Control headers</mat-radio-button>
                  <mat-radio-button value="force-cache">Force cache all content</mat-radio-button>
                </mat-radio-group>

                <div class="form-row ttl-row">
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Client time to live</mat-label>
                    <mat-select formControlName="clientTtl">
                      <mat-option value="1-day">1 day</mat-option>
                      <mat-option value="1-hour">1 hour</mat-option>
                      <mat-option value="30-minutes">30 minutes</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Default time to live</mat-label>
                    <mat-select formControlName="defaultTtl">
                      <mat-option value="30-days">30 days</mat-option>
                      <mat-option value="7-days">7 days</mat-option>
                      <mat-option value="1-day">1 day</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Maximum time to live</mat-label>
                    <mat-select formControlName="maxTtl">
                      <mat-option value="1-year">1 year</mat-option>
                      <mat-option value="30-days">30 days</mat-option>
                      <mat-option value="7-days">7 days</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Cache key</mat-label>
                  <mat-select formControlName="cacheKey">
                    <mat-option value="default">Default (include all components of a request URL)</mat-option>
                    <mat-option value="custom">Custom</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-section">
                <h3>Bypass cache on request header <mat-icon class="info-icon">info</mat-icon></h3>
                <button mat-stroked-button class="add-header-button">
                  <mat-icon>add</mat-icon>
                  ADD HEADER
                </button>
              </div>
            </div>
          </div>

          <!-- Step 4: Security -->
          <div *ngIf="currentStep === 4" class="step-content">
            <h2>Security</h2>
            
            <div class="google-best-practice">
              <div class="toggle-container">
                <span>Use Google best practice</span>
                <mat-slide-toggle [checked]="useSecurityBestPractice" (change)="toggleSecurityBestPractice($event)"></mat-slide-toggle>
              </div>
            </div>

            <div *ngIf="useSecurityBestPractice" class="best-practice-content">
              <h3>Google best practice for security</h3>
              
              <div class="readonly-field">
                <label>Security policy name</label>
                <span>demo-acme-com-default-security-policy-001</span>
              </div>
              <div class="readonly-field">
                <label>Cloud Armor Service Tier</label>
                <span>Standard</span>
              </div>
              
              <div class="form-section">
                <h4>Rate limiting</h4>
                <div class="readonly-field">
                  <label>Request count</label>
                  <span>100</span>
                </div>
                <div class="readonly-field">
                  <label>Interval</label>
                  <span>1 minute</span>
                </div>
                <div class="readonly-field">
                  <label>Enforce on key</label>
                  <span>Source IP Address</span>
                </div>
                
                <div class="rate-limiting-config">
                  <h5>Rate limiting configuration</h5>
                  <div class="readonly-field">
                    <label>Request count</label>
                    <span>100</span>
                  </div>
                  <div class="readonly-field">
                    <label>Interval</label>
                    <span>1 minute</span>
                  </div>
                  <div class="readonly-field">
                    <label>Enforce on key</label>
                    <span>Source IP Address</span>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!useSecurityBestPractice" class="custom-config-content" [formGroup]="securityForm">
              <div class="form-section">
                <h3>Security policy</h3>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Security policy name</mat-label>
                  <input matInput formControlName="securityPolicyName">
                  <mat-hint>Lower case letters, numbers, hyphens allowed with no space.</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-section">
                <h3>Rate limiting <mat-icon class="info-icon">info</mat-icon></h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Request count</mat-label>
                    <mat-select formControlName="requestCount">
                      <mat-option value="100">100</mat-option>
                      <mat-option value="200">200</mat-option>
                      <mat-option value="500">500</mat-option>
                      <mat-option value="1000">1000</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Interval</mat-label>
                    <mat-select formControlName="interval">
                      <mat-option value="1-minute">1 minute</mat-option>
                      <mat-option value="5-minutes">5 minutes</mat-option>
                      <mat-option value="10-minutes">10 minutes</mat-option>
                      <mat-option value="1-hour">1 hour</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Enforce on key</mat-label>
                  <mat-select formControlName="enforceOnKey">
                    <mat-option value="source-ip">Source IP Address</mat-option>
                    <mat-option value="xff-ip">XFF IP</mat-option>
                    <mat-option value="all">All requests</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-section">
                <h3>Rate limiting configuration <mat-icon class="info-icon">info</mat-icon></h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Request count</mat-label>
                    <mat-select formControlName="requestCount">
                      <mat-option value="100">100</mat-option>
                      <mat-option value="200">200</mat-option>
                      <mat-option value="500">500</mat-option>
                      <mat-option value="1000">1000</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="flex-grow">
                    <mat-label>Interval</mat-label>
                    <mat-select formControlName="interval">
                      <mat-option value="1-minute">1 minute</mat-option>
                      <mat-option value="5-minutes">5 minutes</mat-option>
                      <mat-option value="10-minutes">10 minutes</mat-option>
                      <mat-option value="1-hour">1 hour</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Enforce on key</mat-label>
                  <mat-select formControlName="enforceOnKey">
                    <mat-option value="source-ip">Source IP Address</mat-option>
                    <mat-option value="xff-ip">XFF IP</mat-option>
                    <mat-option value="all">All requests</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
          </div>

          <!-- Step 5: Review -->
          <div *ngIf="currentStep === 5" class="step-content">
            <h2>Review configuration</h2>
            
            <div class="review-sections">
              <!-- Domain Section -->
              <div class="review-section">
                <h3>Domain</h3>
                <div class="review-item">
                  <label>Domain name</label>
                  <span>{{ basicForm.get('domainName')?.value || 'demo.acme.com' }}</span>
                </div>
              </div>

              <!-- Global front end Section -->
              <div class="review-section">
                <h3>Global front end</h3>
                <div class="review-item">
                  <label>Name</label>
                  <span>{{ basicForm.get('globalFrontendName')?.value || 'demo-acme-com-gfe-01' }}</span>
                </div>
              </div>

              <!-- Origin server Section -->
              <div class="review-section">
                <h3>Origin server</h3>
                <div class="review-item">
                  <label>Origin location</label>
                  <span>{{ getOriginLocationText() }}</span>
                </div>
                <div class="review-item" *ngIf="basicForm.get('internetOriginName')?.value">
                  <label>Internet origin name</label>
                  <span>{{ basicForm.get('internetOriginName')?.value }}</span>
                </div>
              </div>

              <!-- Traffic management basics Section -->
              <div class="review-section">
                <h3>Traffic management basics</h3>
                <div class="review-item">
                  <label>Traffic management policy name</label>
                  <span>demo-acme-com-lb-1</span>
                </div>
                <div class="review-item">
                  <label>Protocol</label>
                  <span>HTTPS</span>
                </div>
              </div>

              <!-- Certificate Section -->
              <div class="review-section">
                <h3>Certificate</h3>
                <div class="review-item">
                  <label>Certificate name</label>
                  <span>demo-acme-com-cert</span>
                </div>
                <div class="review-item">
                  <label>Certificate type</label>
                  <span>Google-managed certificate</span>
                </div>
                <div class="review-item">
                  <label>Certificate authority type</label>
                  <span>Public</span>
                </div>
                <div class="review-item">
                  <label>Authorization type</label>
                  <span>Load balancer authorization</span>
                </div>
              </div>

              <!-- Health check Section -->
              <div class="review-section">
                <h3>Health check</h3>
                <div class="review-item">
                  <label>Name</label>
                  <span>demo-acme-com-default-health-check1</span>
                </div>
                <div class="review-item">
                  <label>Protocol</label>
                  <span>HTTPs</span>
                </div>
                <div class="review-item">
                  <label>Port</label>
                  <span>443</span>
                </div>
                <div class="review-item">
                  <label>Request path</label>
                  <span>/foo/bar</span>
                </div>
                <div class="review-subsection">
                  <h4>Health criteria</h4>
                  <div class="review-item">
                    <label>Check interval</label>
                    <span>5</span>
                  </div>
                  <div class="review-item">
                    <label>Timeout</label>
                    <span>5</span>
                  </div>
                  <div class="review-item">
                    <label>Healthy threshold</label>
                    <span>2</span>
                  </div>
                  <div class="review-item">
                    <label>Unhealthy threshold</label>
                    <span>2</span>
                  </div>
                </div>
                <div class="review-item">
                  <label>Loggings</label>
                  <span>On</span>
                </div>
              </div>

              <!-- Caching Section -->
              <div class="review-section">
                <h3>Caching</h3>
                <div class="review-item">
                  <label>Caching policy name</label>
                  <span>demo-acme-com-default-caching-001</span>
                </div>
                <div class="review-item">
                  <label>CDN enforcement</label>
                  <span>On</span>
                </div>
                <div class="review-item">
                  <label>Cache mode</label>
                  <span>Cache static content</span>
                </div>
                <div class="review-item indent">
                  <label>Client TTL</label>
                  <span>1 day</span>
                </div>
                <div class="review-item indent">
                  <label>Default TTL</label>
                  <span>30 days</span>
                </div>
                <div class="review-item indent">
                  <label>MAX TTL</label>
                  <span>1 year</span>
                </div>
                <div class="review-item indent">
                  <label>Cache key</label>
                  <span>Default</span>
                </div>
                <div class="review-item">
                  <label>Bypass cache on request header</label>
                  <span>None</span>
                </div>
              </div>

              <!-- Security Section -->
              <div class="review-section">
                <h3>Security</h3>
                <div class="review-item">
                  <label>Security policy name</label>
                  <span>demo-acme-com-default-security-policy-001</span>
                </div>
                <div class="review-item">
                  <label>Cloud Armor Service Tier</label>
                  <span>Standard</span>
                </div>
                <div class="review-subsection">
                  <h4>Rate limiting</h4>
                  <div class="review-item">
                    <label>Request count</label>
                    <span>100</span>
                  </div>
                  <div class="review-item">
                    <label>Interval</label>
                    <span>1 minute</span>
                  </div>
                  <div class="review-item">
                    <label>Enforce on key</label>
                    <span>Source IP Address</span>
                  </div>
                  <div class="review-subsection">
                    <h5>Rate limiting configuration</h5>
                    <div class="review-item">
                      <label>Request count</label>
                      <span>100</span>
                    </div>
                    <div class="review-item">
                      <label>Interval</label>
                      <span>1 minute</span>
                    </div>
                    <div class="review-item">
                      <label>Enforce on key</label>
                      <span>Source IP Address</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Terraform Actions -->
            <div class="terraform-actions">
              <div class="action-buttons">
                <button mat-stroked-button (click)="downloadTerraform()">
                  Download Terraform
                </button>
                <button mat-stroked-button (click)="openTerraformModal()">
                  View Terraform
                </button>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="navigation-buttons">
            <button 
              mat-stroked-button 
              *ngIf="currentStep > 1" 
              (click)="previousStep()" 
              class="nav-button prev-button">
              Previous
            </button>
            
            <div class="button-spacer"></div>
            
            <button 
              mat-raised-button 
              color="primary" 
              *ngIf="currentStep < 5" 
              (click)="nextStep()" 
              [disabled]="!isCurrentStepValid()"
              class="nav-button next-button">
              {{ currentStep === 1 ? 'CONTINUE' : (currentStep === 4 ? 'REVIEW' : 'CONTINUE') }}
            </button>
            
            <button 
              mat-raised-button 
              color="primary" 
              *ngIf="currentStep === 5" 
              (click)="createConfiguration()" 
              class="nav-button create-button">
              CREATE
            </button>
            
            <button 
              mat-stroked-button 
              (click)="cancel()" 
              class="nav-button cancel-button">
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      background: var(--background-color, #ffffff);
      color: var(--text-color, #202124);
      min-height: 100vh;
      font-family: 'Roboto', sans-serif;
    }

    .wizard-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color, #dadce0);
      background: var(--card-background, #ffffff);
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    }

    .wizard-header h1 {
      margin: 0 0 0 16px;
      font-size: 20px;
      font-weight: 400;
      color: var(--text-color, #202124);
    }

    .back-button {
      color: var(--text-secondary, #5f6368);
    }

    .wizard-content {
      display: flex;
      min-height: calc(100vh - 73px);
    }

    .wizard-sidebar {
      width: 280px;
      background: var(--sidebar-background, #f8f9fa);
      border-right: 1px solid var(--border-color, #dadce0);
      padding: 24px 0;
      position: sticky;
      top: 73px;
      height: calc(100vh - 73px);
      overflow-y: auto;
    }

    .steps-section {
      margin-bottom: 32px;
      padding: 0 24px;
    }

    .steps-section h3 {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary, #5f6368);
      margin: 0 0 16px 0;
      letter-spacing: 0.8px;
    }

    .step-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      cursor: pointer;
      border-radius: 8px;
      margin-bottom: 4px;
      padding-left: 12px;
      padding-right: 12px;
      transition: background-color 0.2s ease;
    }

    .step-item:hover {
      background: var(--hover-color, rgba(60,64,67,.08));
    }

    .step-item.active {
      background: #1976d2;
      color: white;
    }

    .step-item.completed {
      color: var(--primary-color, #1976d2);
    }

    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid var(--border-color, #dadce0);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 12px;
      font-weight: 500;
      background: var(--background-color, #ffffff);
    }

    .step-item.active .step-number {
      background: white;
      color: #1976d2;
      border-color: white;
    }

    .step-item.completed .step-number {
      background: var(--primary-color, #1976d2);
      border-color: var(--primary-color, #1976d2);
      color: white;
    }

    .check-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .step-title {
      font-size: 14px;
      font-weight: 400;
    }

    .wizard-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .step-content {
      flex: 1;
      padding: 32px 48px;
      max-width: 800px;
    }

    .step-content h2 {
      font-size: 24px;
      font-weight: 400;
      margin: 0 0 32px 0;
      color: var(--text-color, #202124);
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: var(--text-color, #202124);
    }

    .form-subsection {
      margin-bottom: 24px;
    }

    .form-subsection h4 {
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 12px 0;
      color: var(--text-color, #202124);
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .flex-grow {
      flex: 1;
    }

    .port-field {
      width: 120px;
    }

    .radio-group-vertical {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .origin-config {
      margin-top: 16px;
      padding-left: 24px;
    }

    .google-best-practice {
      background: #f8f9fa;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .toggle-container span {
      font-weight: 500;
      color: var(--text-color);
    }

    .best-practice-content {
      margin-top: 16px;
    }

    .best-practice-content h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 24px 0;
      color: var(--text-color);
    }

    .best-practice-content h4 {
      font-size: 14px;
      font-weight: 500;
      margin: 24px 0 16px 0;
      color: var(--text-color);
    }

    .best-practice-content h5 {
      font-size: 13px;
      font-weight: 500;
      margin: 16px 0 12px 0;
      color: var(--text-color);
    }

    .readonly-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .readonly-field.indent {
      padding-left: 24px;
    }

    .readonly-field label {
      font-weight: 400;
      color: var(--text-secondary);
      flex: 1;
    }

    .readonly-field span {
      color: var(--text-color);
      font-weight: 400;
    }

    .health-criteria,
    .rate-limiting-config {
      margin-top: 16px;
      padding-left: 16px;
    }

    .review-sections {
      margin-bottom: 32px;
    }

    .review-section {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 16px;
    }

    .review-section h3 {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: var(--text-color);
    }

    .review-section h4 {
      font-size: 14px;
      font-weight: 500;
      margin: 16px 0 12px 0;
      color: var(--text-color);
    }

    .review-section h5 {
      font-size: 13px;
      font-weight: 500;
      margin: 12px 0 8px 0;
      color: var(--text-color);
    }

    .review-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .review-item.indent {
      padding-left: 24px;
    }

    .review-item label {
      font-weight: 400;
      color: var(--text-secondary);
      flex: 1;
    }

    .review-item span {
      color: var(--text-color);
      font-weight: 400;
    }

    .review-subsection {
      margin-top: 16px;
      padding-left: 16px;
    }

    .terraform-actions {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
    }

    .navigation-buttons {
      display: flex;
      align-items: center;
      padding: 24px 48px;
      border-top: 1px solid var(--border-color);
      background: var(--card-background);
      position: sticky;
      bottom: 0;
    }

    .button-spacer {
      flex: 1;
    }

    .nav-button {
      margin-left: 8px;
    }

    .prev-button {
      margin-right: auto;
      margin-left: 0;
    }

    /* Dark mode adjustments */
    [data-theme="dark"] .wizard-sidebar {
      background: #1e1e1e;
    }

    [data-theme="dark"] .google-best-practice {
      background: #2d2d2d;
    }

    [data-theme="dark"] .readonly-field {
      border-bottom-color: #404040;
    }

    [data-theme="dark"] .review-item {
      border-bottom-color: #404040;
    }

    /* Force Material Design form field styling */
    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-flex {
      background-color: transparent;
    }

    ::ng-deep .mat-mdc-form-field-appearance-outline .mat-mdc-form-field-outline {
      color: var(--border-color, #dadce0);
    }

    ::ng-deep .mat-mdc-form-field-appearance-outline.mat-focused .mat-mdc-form-field-outline-thick {
      color: var(--primary-color, #1976d2);
    }

    ::ng-deep .mat-mdc-form-field-label {
      color: var(--text-secondary, #5f6368);
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--primary-color, #1976d2);
    }

    ::ng-deep .mat-mdc-input-element {
      color: var(--text-color, #202124);
    }

    ::ng-deep .mat-mdc-form-field-hint {
      color: var(--text-secondary, #5f6368);
    }

    /* Responsive design */
    @media (max-width: 1024px) {
      .wizard-sidebar {
        width: 240px;
      }
      
      .step-content {
        padding: 24px 32px;
      }
      
      .navigation-buttons {
        padding: 16px 32px;
      }
    }

    @media (max-width: 768px) {
      .wizard-content {
        flex-direction: column;
      }
      
      .wizard-sidebar {
        width: 100%;
        height: auto;
        position: static;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
      }
      
      .steps-section {
        padding: 0 16px;
      }
      
      .step-content {
        padding: 16px 24px;
      }
      
      .navigation-buttons {
        padding: 16px 24px;
      }
      
      .form-row {
        flex-direction: column;
        gap: 8px;
      }
      
      .port-field {
        width: 100%;
      }
    }

    /* Custom form styles */
    .custom-config-content {
      margin-top: 24px;
    }

    .toggle-button {
      display: inline-block;
      padding: 6px 16px;
      background: #e8f0fe;
      color: #1a73e8;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .toggle-button.active {
      background: #1a73e8;
      color: white;
    }

    .toggle-button:hover {
      background: #d2e3fc;
    }

    .toggle-button.active:hover {
      background: #1557b0;
    }

    .info-icon {
      font-size: 16px;
      color: var(--text-secondary, #5f6368);
      margin-left: 4px;
      vertical-align: middle;
    }

    .health-description,
    .cdn-description,
    .cache-mode-description {
      font-size: 13px;
      color: var(--text-secondary, #5f6368);
      margin: 8px 0 16px 0;
      line-height: 1.4;
    }

    .learn-more {
      color: var(--primary-color, #1976d2);
      text-decoration: none;
    }

    .learn-more:hover {
      text-decoration: underline;
    }

    .ttl-row {
      margin-top: 16px;
    }

    .add-header-button {
      color: var(--primary-color, #1976d2);
      border-color: var(--primary-color, #1976d2);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .add-header-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Form field overrides for better styling */
    ::ng-deep .mat-mdc-form-field {
      font-family: 'Roboto', sans-serif;
    }

    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      margin-top: 4px;
    }

    ::ng-deep .mat-mdc-form-field-hint {
      font-size: 12px;
      color: var(--text-secondary, #5f6368);
    }

    ::ng-deep .mat-mdc-radio-button {
      margin-bottom: 8px;
    }

    ::ng-deep .mat-mdc-radio-button .mdc-radio {
      padding: 8px;
    }

    ::ng-deep .mat-mdc-radio-button .mdc-form-field {
      align-items: center;
    }
  `]
})
export class GlobalFrontendWizardV2Component implements OnInit {
  currentStep = 1;
  useGoogleBestPractice = true;
  useCachingBestPractice = true;
  useSecurityBestPractice = true;

  basicForm: FormGroup;
  trafficForm: FormGroup;
  cachingForm: FormGroup;
  securityForm: FormGroup;

  steps: WizardStep[] = [
    { id: 1, title: 'Basics & origin server', completed: false },
    { id: 2, title: 'Traffic management', completed: false },
    { id: 3, title: 'Caching', completed: false },
    { id: 4, title: 'Security', completed: false },
    { id: 5, title: 'Review', completed: false }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.basicForm = this.formBuilder.group({
      domainName: ['demo.acme.com', Validators.required],
      globalFrontendName: ['demo-acme-com-gfe-01', Validators.required],
      originLocation: ['internet', Validators.required],
      internetOriginType: ['new'],
      internetOriginName: ['demo-acme-com-internetorigin01'],
      originDomain: ['origin.demo.com'],
      originPort: [443],
      existingOrigin: ['']
    });

    this.trafficForm = this.formBuilder.group({
      policyName: ['demo-acme-com-lb-1', Validators.required],
      protocol: ['https', Validators.required],
      certificateName: ['demo-acme-com-cert', Validators.required],
      certificateType: ['google-managed'],
      certificateAuthorityType: ['public'],
      authorizationType: ['load-balancer'],
      healthCheckName: ['demo-acme-com-default-health-check1', Validators.required],
      healthCheckProtocol: ['https', Validators.required],
      healthCheckPort: [443, Validators.required],
      healthCheckPath: ['/foo/bar', Validators.required],
      checkInterval: [5, Validators.required],
      timeout: [5, Validators.required],
      healthyThreshold: [2, Validators.required],
      unhealthyThreshold: [2, Validators.required],
      loggingEnabled: [true]
    });

    this.cachingForm = this.formBuilder.group({
      cachingPolicyName: ['demo-acme-com-default-caching-001', Validators.required],
      cdnEnforcement: [true],
      cacheMode: ['cache-static', Validators.required],
      clientTtl: ['1-day', Validators.required],
      defaultTtl: ['30-days', Validators.required],
      maxTtl: ['1-year', Validators.required],
      cacheKey: ['default', Validators.required]
    });

    this.securityForm = this.formBuilder.group({
      securityPolicyName: ['demo-acme-com-default-security-policy-001', Validators.required],
      requestCount: [100, Validators.required],
      interval: ['1-minute', Validators.required],
      enforceOnKey: ['source-ip', Validators.required]
    });
  }

  ngOnInit(): void {
    // Initialize form values
  }

  goBack(): void {
    this.router.navigate(['/network-solutions']);
  }

  nextStep(): void {
    if (this.isCurrentStepValid()) {
      this.steps[this.currentStep - 1].completed = true;
      if (this.currentStep < 5) {
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(this.basicForm.get('domainName')?.valid && 
                  this.basicForm.get('globalFrontendName')?.valid &&
                  this.basicForm.get('originLocation')?.valid);
      case 2:
        return this.useGoogleBestPractice || this.trafficForm.valid;
      case 3:
        return this.useCachingBestPractice || this.cachingForm.valid;
      case 4:
        return this.useSecurityBestPractice || this.securityForm.valid;
      case 5:
        return true;
      default:
        return false;
    }
  }

  toggleGoogleBestPractice(event: any): void {
    this.useGoogleBestPractice = event.checked;
  }

  toggleCachingBestPractice(event: any): void {
    this.useCachingBestPractice = event.checked;
  }

  toggleSecurityBestPractice(event: any): void {
    this.useSecurityBestPractice = event.checked;
  }

  toggleLogging(): void {
    const currentValue = this.trafficForm.get('loggingEnabled')?.value;
    this.trafficForm.get('loggingEnabled')?.setValue(!currentValue);
  }

  toggleCDNEnforcement(): void {
    const currentValue = this.cachingForm.get('cdnEnforcement')?.value;
    this.cachingForm.get('cdnEnforcement')?.setValue(!currentValue);
  }

  getOriginLocationText(): string {
    const location = this.basicForm.get('originLocation')?.value;
    switch (location) {
      case 'gcp':
        return 'In GCP';
      case 'internet':
        return 'Outside of GCP on the Internet';
      case 'cross-cloud':
        return 'Via Cross-cloud Network';
      default:
        return 'Outside of GCP on the Internet';
    }
  }

  downloadTerraform(): void {
    this.snackBar.open('Terraform configuration download started', 'Close', { duration: 3000 });
    // Implement actual download logic
  }



  createConfiguration(): void {
    this.snackBar.open('Creating global frontend configuration...', 'Close', { duration: 3000 });
    // Implement actual creation logic
    setTimeout(() => {
      this.router.navigate(['/network-solutions']);
    }, 2000);
  }

  cancel(): void {
    this.router.navigate(['/network-solutions']);
  }

  goToStep(stepNumber: number): void {
    if (stepNumber >= 1 && stepNumber <= 5) {
      this.currentStep = stepNumber;
    }
  }

  openTerraformModal(): void {
    const terraformCode = this.generateTerraformCode();
    
    this.dialog.open(TerraformModalComponent, {
      width: '80vw',
      height: '80vh',
      maxWidth: '1200px',
      data: { terraformCode }
    });
  }

  private generateTerraformCode(): string {
    return `# Configure the Google Cloud provider
provider "google" {
  project = "fiasunwang"
}

provider "google-beta" {
  project = "fiasunwang"
}

# Create Internet NEG for external origin
resource "google_compute_global_network_endpoint_group" "external_neg" {
  name                  = "external-endpoint-group"
  description          = "Global NEG for external origin"
  network_endpoint_type = "INTERNET_IP_PORT"
  default_port         = "443"
}

# Create NEG endpoint
resource "google_compute_global_network_endpoint" "external_endpoint" {
  global_network_endpoint_group = google_compute_global_network_endpoint_group.external_neg.name
  port                         = "443"
  ip_address                   = "142.21.1.100"
}

# Create backend service for external origin
resource "google_compute_backend_service" "backend_service" {
  name        = "external-origin-backend-service"
  description = "Backend service for external origin"
  protocol    = "HTTPS"
  port_name   = "https"
  timeout_sec = 30
  enable_cdn  = true
  compression_mode = "DISABLED"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  custom_request_headers = [
    "True-Client-IP: {client_ip_address}"
  ]

  custom_response_headers = [
    "X-Cache-ID: {cdn_cache_id}",
    "X-Cache-Status: {cdn_cache_status}",
    "X-Client-Region: {client_region}",
    "Content-Security-Policy: default-src 'self'"
  ]

  backend {
    group = google_compute_global_network_endpoint_group.external_neg.id
  }

  cdn_policy {
    cache_mode = "CACHE_ALL_STATIC"
    default_ttl = 300 # 5 minutes
    client_ttl = 300 # 5 minutes
    max_ttl = 86400 # 24 hours
    negative_caching = true
    
    cache_key_policy {
      include_host = true
      include_protocol = true
      include_query_string = true
    }
  }
}

# Create error page bucket
resource "google_storage_bucket" "error_page" {
  name     = "www-example-com-error-page"
  location = "US"
}

# Make error page bucket publicly readable
resource "google_storage_bucket_iam_member" "error_page_public_read" {
  bucket = google_storage_bucket.error_page.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}`;
  }
}

@Component({
  selector: 'app-terraform-modal',
  template: `
    <div class="terraform-modal">
      <div class="modal-header">
        <h2 mat-dialog-title>Terraform Configuration</h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="modal-content" mat-dialog-content>
        <pre class="terraform-code">{{ data.terraformCode }}</pre>
      </div>
      
      <div class="modal-actions" mat-dialog-actions>
        <button mat-stroked-button (click)="copyCode()">
          Copy
        </button>
        <button mat-stroked-button (click)="downloadCode()">
          Download
        </button>
        <button mat-stroked-button (click)="openCloudShell()">
          Cloud Shell
        </button>
        <div class="spacer"></div>
        <button mat-raised-button color="primary" mat-dialog-close>
          CLOSE
        </button>
      </div>
    </div>
  `,
  styles: [`
    .terraform-modal {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: var(--text-color);
    }

    .close-button {
      color: var(--text-secondary);
    }

    .modal-content {
      flex: 1;
      padding: 0;
      overflow: auto;
      background: #f8f9fa;
    }

    .terraform-code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: #f8f9fa;
      margin: 0;
      padding: 24px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .modal-actions {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      gap: 12px;
    }

    .spacer {
      flex: 1;
    }

    /* Dark mode */
    [data-theme="dark"] .terraform-code {
      background: #2d2d2d;
      color: #f8f9fa;
    }

    [data-theme="dark"] .modal-content {
      background: #2d2d2d;
    }
  `]
})
export class TerraformModalComponent {
  constructor(
    public dialogRef: MatDialogRef<TerraformModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { terraformCode: string },
    private snackBar: MatSnackBar
  ) {}

  copyCode(): void {
    navigator.clipboard.writeText(this.data.terraformCode).then(() => {
      this.snackBar.open('Terraform code copied to clipboard', 'Close', { duration: 3000 });
    });
  }

  downloadCode(): void {
    const blob = new Blob([this.data.terraformCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'terraform-configuration.tf';
    link.click();
    window.URL.revokeObjectURL(url);
    this.snackBar.open('Terraform configuration downloaded', 'Close', { duration: 3000 });
  }

  openCloudShell(): void {
    this.snackBar.open('Opening Cloud Shell...', 'Close', { duration: 3000 });
    // Implement Cloud Shell integration
  }
} 