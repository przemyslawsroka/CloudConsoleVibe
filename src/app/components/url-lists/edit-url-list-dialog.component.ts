import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UrlList } from '../../services/url-lists.service';

@Component({
  selector: 'app-edit-url-list-dialog',
  template: `
    <h2 mat-dialog-title>Edit URL List</h2>
    <mat-dialog-content>
      <p>Edit URL list dialog placeholder for: {{ data.urlList?.name }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `
})
export class EditUrlListDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<EditUrlListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { urlList: UrlList }
  ) {}

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    // Return mock updated data for now
    this.dialogRef.close({
      name: this.data.urlList.name,
      description: this.data.urlList.description + ' (updated)',
      values: this.data.urlList.values
    });
  }
} 