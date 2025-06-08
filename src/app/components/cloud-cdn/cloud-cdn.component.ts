import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { CloudCdnService, CdnOrigin } from '../../services/cloud-cdn.service';
import { TableColumn, TableAction, TableConfig } from '../../shared/gcp-data-table/gcp-data-table.component';

@Component({
  selector: 'app-cloud-cdn',
  template: `
    <app-gcp-data-table
      [data]="origins"
      [columns]="columns"
      [actions]="actions"
      [config]="tableConfig"
      [loading]="loading"
      [title]="'Cloud CDN'"
      [subtitle]="'Accelerate content delivery for websites and applications served from Google Cloud'"
      [createButtonLabel]="'Add origin'"
      [createButtonIcon]="'add'"
      (create)="addOrigin()"
      (refresh)="refresh()"
      (rowClick)="viewOriginDetails($event)">
    </app-gcp-data-table>

    <!-- Add Origin Dialog -->
    <div class="modal-overlay" *ngIf="showAddOriginDialog" (click)="closeAddOriginDialog()">
      <div class="add-origin-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>Add CDN Origin</h3>
          <button mat-icon-button (click)="closeAddOriginDialog()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form [formGroup]="originForm" class="origin-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Origin name *</mat-label>
            <input matInput formControlName="name" placeholder="my-origin">
            <mat-hint>Lowercase letters, numbers, and hyphens only</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Cache mode</mat-label>
            <mat-select formControlName="cacheMode">
              <mat-option value="Use origin headers">Use origin headers</mat-option>
              <mat-option value="Cache static content">Cache static content</mat-option>
              <mat-option value="Force cache all">Force cache all</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Load balancer</mat-label>
            <mat-select formControlName="loadBalancer" multiple>
              <mat-option value="shopping-site-lb">shopping-site-lb</mat-option>
              <mat-option value="api-load-balancer">api-load-balancer</mat-option>
              <mat-option value="web-frontend-lb">web-frontend-lb</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="dialog-actions">
            <button mat-button (click)="closeAddOriginDialog()">Cancel</button>
            <button mat-raised-button color="primary" (click)="saveOrigin()" [disabled]="!originForm.valid">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }

    /* Add Origin Dialog */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .add-origin-dialog {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 24px;
    }

    .dialog-header h3 {
      margin: 0;
      color: #202124;
      font-size: 20px;
      font-weight: 500;
    }

    .origin-form {
      padding: 0 24px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-field {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      margin-top: 24px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .add-origin-dialog {
        width: 95%;
        margin: 16px;
      }
    }
  `]
})
export class CloudCdnComponent implements OnInit {
  origins: CdnOrigin[] = [];
  loading = true;
  showAddOriginDialog = false;
  originForm: FormGroup;

  columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Origin name',
      type: 'link',
      sortable: true
    },
    {
      key: 'cacheMode',
      label: 'Cache mode',
      type: 'text',
      sortable: false
    },
    {
      key: 'associatedLoadBalancers',
      label: 'Associated load balancers',
      type: 'custom',
      sortable: false,
      format: (value: string[]) => {
        if (!value || value.length === 0) return '-';
        return value.join(', ');
      }
    },
    {
      key: 'cacheHitRatio',
      label: 'Cache hit ratio',
      type: 'text',
      sortable: false,
      format: (value: string) => value === 'No data' ? 'No data' : value
    }
  ];

  actions: TableAction[] = [
    {
      label: 'View details',
      icon: 'info',
      action: (row: CdnOrigin) => this.viewOriginDetails(row)
    },
    {
      label: 'Edit',
      icon: 'edit',
      action: (row: CdnOrigin) => this.editOrigin(row)
    },
    {
      label: 'Delete',
      icon: 'delete',
      action: (row: CdnOrigin) => this.deleteOrigin(row)
    }
  ];

  tableConfig: TableConfig = {
    showColumnSelector: true,
    emptyStateIcon: 'cloud_off',
    emptyStateTitle: 'No CDN origins found',
    emptyStateMessage: 'Get started by adding your first CDN origin.',
    emptyStateAction: {
      label: 'Add origin',
      action: () => this.addOrigin()
    }
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cdnService: CloudCdnService
  ) {
    this.originForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      cacheMode: ['Use origin headers', Validators.required],
      loadBalancer: [[], Validators.required]
    });
  }

  ngOnInit() {
    this.loadOrigins();
  }

  loadOrigins() {
    this.loading = true;
    this.cdnService.getCdnOrigins().subscribe({
      next: (origins) => {
        this.origins = origins;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading CDN origins:', error);
        this.loading = false;
      }
    });
  }

  refresh() {
    this.loadOrigins();
  }

  addOrigin() {
    this.showAddOriginDialog = true;
  }

  viewOriginDetails(origin: CdnOrigin) {
    this.router.navigate(['/cloud-cdn', origin.name]);
  }

  editOrigin(origin: CdnOrigin) {
    console.log('Edit origin:', origin);
  }

  deleteOrigin(origin: CdnOrigin) {
    this.origins = this.origins.filter(o => o.id !== origin.id);
  }

  closeAddOriginDialog() {
    this.showAddOriginDialog = false;
    this.originForm.reset({
      name: '',
      description: '',
      cacheMode: 'Use origin headers',
      loadBalancer: []
    });
  }

  saveOrigin() {
    if (this.originForm.valid) {
      const formValue = this.originForm.value;
      const newOrigin: CdnOrigin = {
        id: Date.now().toString(),
        name: formValue.name,
        cacheMode: formValue.cacheMode,
        associatedLoadBalancers: formValue.loadBalancer,
        cacheHitRatio: 'No data',
        description: formValue.description,
        status: 'ACTIVE'
      };
      
      this.origins.push(newOrigin);
      this.closeAddOriginDialog();
    }
  }
}
