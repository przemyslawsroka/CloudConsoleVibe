import { Component, Input } from '@angular/core';

@Component({
  selector: 'gcp-page-layout',
  template: `
    <div class="gcp-page-layout">
      <!-- Page Header -->
      <div class="page-header" *ngIf="title || subtitle || hasHeaderActions">
        <div class="header-content" [class.full-width]="noPadding">
          <div class="header-text">
            <h1 class="page-title" *ngIf="title">{{ title }}</h1>
            <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <div class="header-actions" *ngIf="hasHeaderActions">
            <ng-content select="[slot=header-actions]"></ng-content>
          </div>
        </div>
      </div>

      <!-- Breadcrumbs -->
      <div class="breadcrumbs" *ngIf="hasBreadcrumbs">
        <ng-content select="[slot=breadcrumbs]"></ng-content>
      </div>

      <!-- Info Banner -->
      <div class="info-banner" *ngIf="hasInfoBanner">
        <ng-content select="[slot=info-banner]"></ng-content>
      </div>

      <!-- Page Content -->
      <div class="page-content" [class.no-padding]="noPadding">
        <ng-content></ng-content>
      </div>

      <!-- Page Footer -->
      <div class="page-footer" *ngIf="hasFooter">
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./gcp-page-layout.component.scss']
})
export class GcpPageLayoutComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() hasHeaderActions = false;
  @Input() hasBreadcrumbs = false;
  @Input() hasInfoBanner = false;
  @Input() hasFooter = false;
  @Input() noPadding = false;
} 