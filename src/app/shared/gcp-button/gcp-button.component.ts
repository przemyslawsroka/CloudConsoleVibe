import { Component, Input, Output, EventEmitter } from '@angular/core';

export type GcpButtonVariant = 'primary' | 'secondary' | 'text' | 'outlined' | 'danger' | 'success';
export type GcpButtonSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'gcp-button',
  template: `
    <button 
      [class]="getClasses()"
      [disabled]="disabled"
      [type]="type"
      (click)="handleClick($event)">
      <mat-icon *ngIf="icon && iconPosition === 'start'" class="button-icon icon-start">{{ icon }}</mat-icon>
      <span class="button-content" *ngIf="!iconOnly">
        <ng-content></ng-content>
      </span>
      <mat-icon *ngIf="icon && iconPosition === 'end'" class="button-icon icon-end">{{ icon }}</mat-icon>
      <mat-icon *ngIf="iconOnly && icon" class="button-icon">{{ icon }}</mat-icon>
    </button>
  `,
  styleUrls: ['./gcp-button.component.scss']
})
export class GcpButtonComponent {
  @Input() variant: GcpButtonVariant = 'primary';
  @Input() size: GcpButtonSize = 'medium';
  @Input() disabled = false;
  @Input() icon?: string;
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input() iconOnly = false;
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() loading = false;

  @Output() clicked = new EventEmitter<Event>();

  getClasses(): string {
    const classes = [
      'gcp-button',
      `variant-${this.variant}`,
      `size-${this.size}`
    ];

    if (this.iconOnly) classes.push('icon-only');
    if (this.fullWidth) classes.push('full-width');
    if (this.loading) classes.push('loading');

    return classes.join(' ');
  }

  handleClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
} 