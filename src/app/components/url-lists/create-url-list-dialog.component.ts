import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-url-list-dialog',
  template: `
    <h2 mat-dialog-title>Create URL List</h2>
    <mat-dialog-content>
      <p>Create URL list dialog placeholder</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onCreate()">Create</button>
    </mat-dialog-actions>
  `
})
export class CreateUrlListDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CreateUrlListDialogComponent>
  ) {}

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    // Return mock data for now
    this.dialogRef.close({
      name: 'new-url-list',
      description: 'New URL list',
      values: ['example.com']
    });
  }
} 