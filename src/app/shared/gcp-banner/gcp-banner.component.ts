import { Component, Input, Output, EventEmitter } from '@angular/core';

export type GcpBannerType = 'info' | 'warning' | 'error' | 'success';

@Component({
  selector: 'gcp-banner',
  template: `
    <div class="gcp-banner" [class]="'banner-' + type" *ngIf="!dismissed">
      <div class="banner-content">
        <div class="banner-icon" *ngIf="showIcon">
          <mat-icon>{{ getIcon() }}</mat-icon>
        </div>
        <div class="banner-text">
          <div class="banner-title" *ngIf="title">{{ title }}</div>
          <div class="banner-message">
            <ng-content></ng-content>
          </div>
        </div>
        <div class="banner-actions" *ngIf="hasActions">
          <ng-content select="[slot=actions]"></ng-content>
        </div>
        <button 
          mat-icon-button 
          class="banner-dismiss"
          *ngIf="dismissible"
          (click)="dismiss()"
          [attr.aria-label]="'Dismiss ' + type + ' banner'">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./gcp-banner.component.scss']
})
export class GcpBannerComponent {
  @Input() type: GcpBannerType = 'info';
  @Input() title?: string;
  @Input() dismissible = true;
  @Input() showIcon = true;
  @Input() hasActions = false;

  @Output() onDismissed = new EventEmitter<void>();

  private _dismissed = false;

  get dismissed(): boolean {
    return this._dismissed;
  }

  getIcon(): string {
    switch (this.type) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'success': return 'check_circle';
      default: return 'info';
    }
  }

  dismiss(): void {
    this._dismissed = true;
    this.onDismissed.emit();
  }
} 