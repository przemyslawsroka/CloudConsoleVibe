import { Component, Input } from '@angular/core';

@Component({
  selector: 'gcp-card',
  template: `
    <div class="gcp-card" [class.elevated]="elevated" [class.outlined]="outlined">
      <div class="gcp-card-header" *ngIf="title || subtitle">
        <div class="gcp-card-title-section">
          <h2 class="gcp-card-title" *ngIf="title">{{ title }}</h2>
          <p class="gcp-card-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="gcp-card-actions" *ngIf="headerActions">
          <ng-content select="[slot=header-actions]"></ng-content>
        </div>
      </div>
      <div class="gcp-card-content">
        <ng-content></ng-content>
      </div>
      <div class="gcp-card-footer" *ngIf="hasFooter">
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./gcp-card.component.scss']
})
export class GcpCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() elevated = false;
  @Input() outlined = true;
  @Input() headerActions = false;
  @Input() hasFooter = false;
} 