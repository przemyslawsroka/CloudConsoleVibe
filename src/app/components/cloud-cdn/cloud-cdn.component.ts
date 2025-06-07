import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';

export interface CdnOrigin {
  id: string;
  name: string;
  cacheMode: string;
  associatedLoadBalancers: string[];
  cacheHitRatio: string;
  description?: string;
  bucketName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

@Component({
  selector: 'app-cloud-cdn',
  template: `
    <div class="cloud-cdn-container">
      <div class="header">
        <h1 class="page-title">Cloud CDN</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" class="add-origin-btn" (click)="addOrigin()">
            <mat-icon>add</mat-icon>
            Add origin
          </button>
          <button mat-icon-button (click)="refresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-button class="remove-btn" [disabled]="selection.selected.length === 0" (click)="removeSelected()">
            <mat-icon>delete</mat-icon>
            Remove
          </button>
          <button mat-icon-button class="learn-btn" matTooltip="Learn">
            <mat-icon>school</mat-icon>
            Learn
          </button>
        </div>
      </div>

      <div class="filters-section">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filter</mat-label>
          <input matInput 
                 placeholder="Enter property name or value" 
                 [(ngModel)]="filterValue"
                 (input)="applyFilter()">
          <mat-icon matPrefix>filter_list</mat-icon>
        </mat-form-field>
        <div class="filter-info" *ngIf="filteredOrigins.length !== origins.length">
          Showing {{ filteredOrigins.length }} of {{ origins.length }} origins
        </div>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="filteredOrigins" class="origins-table" multiTemplateDataRows>
          
          <!-- Checkbox Column -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox (change)="$event ? masterToggle() : null"
                           [checked]="selection.hasValue() && isAllSelected()"
                           [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-checkbox (click)="$event.stopPropagation()"
                           (change)="$event ? selection.toggle(row) : null"
                           [checked]="selection.isSelected(row)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Origin Name Column -->
          <ng-container matColumnDef="originName">
            <th mat-header-cell *matHeaderCellDef>
              <div class="header-cell">
                Origin name
                <mat-icon class="sort-icon">arrow_upward</mat-icon>
              </div>
            </th>
            <td mat-cell *matCellDef="let origin">
              <a class="origin-link" (click)="viewOriginDetails(origin)">{{ origin.name }}</a>
            </td>
          </ng-container>

          <!-- Cache Mode Column -->
          <ng-container matColumnDef="cacheMode">
            <th mat-header-cell *matHeaderCellDef>Cache mode</th>
            <td mat-cell *matCellDef="let origin">
              <span class="cache-mode">{{ origin.cacheMode }}</span>
            </td>
          </ng-container>

          <!-- Associated Load Balancers Column -->
          <ng-container matColumnDef="loadBalancers">
            <th mat-header-cell *matHeaderCellDef>Associated load balancers</th>
            <td mat-cell *matCellDef="let origin">
              <div class="load-balancers">
                <a *ngFor="let lb of origin.associatedLoadBalancers; let last = last" 
                   class="load-balancer-link" 
                   (click)="viewLoadBalancer(lb)">
                  {{ lb }}
                  <span *ngIf="!last">, </span>
                </a>
              </div>
            </td>
          </ng-container>

          <!-- Cache Hit Ratio Column -->
          <ng-container matColumnDef="cacheHitRatio">
            <th mat-header-cell *matHeaderCellDef>Cache hit ratio</th>
            <td mat-cell *matCellDef="let origin">
              <span class="cache-hit-ratio" 
                    [class.no-data]="origin.cacheHitRatio === 'No data'">
                {{ origin.cacheHitRatio }}
              </span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let origin">
              <button mat-icon-button [matMenuTriggerFor]="actionMenu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #actionMenu="matMenu">
                <button mat-menu-item (click)="editOrigin(origin)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="deleteOrigin(origin)">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
                <button mat-menu-item (click)="viewOriginDetails(origin)">
                  <mat-icon>info</mat-icon>
                  <span>View details</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"
              [class.selected]="selection.isSelected(row)"
              (click)="selection.toggle(row)">
          </tr>
        </table>

        <div class="no-data" *ngIf="filteredOrigins.length === 0">
          <mat-icon class="no-data-icon">cloud_off</mat-icon>
          <h3>No CDN origins found</h3>
          <p>Get started by adding your first CDN origin.</p>
          <button mat-raised-button color="primary" (click)="addOrigin()">
            <mat-icon>add</mat-icon>
            Add origin
          </button>
        </div>
      </div>

      <div class="table-footer" *ngIf="filteredOrigins.length > 0">
        <div class="selection-info">
          {{ selection.selected.length }} of {{ filteredOrigins.length }} selected
        </div>
        <mat-paginator [pageSizeOptions]="[5, 10, 20, 50]" 
                       [pageSize]="10"
                       [showFirstLastButtons]="true">
        </mat-paginator>
      </div>
    </div>

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
    .cloud-cdn-container {
      padding: 24px;
      background: #f8f9fa;
      min-height: calc(100vh - 64px);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .add-origin-btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .remove-btn {
      color: #ea4335;
    }

    .remove-btn:disabled {
      color: #ccc;
    }

    .learn-btn {
      color: #1976d2;
    }

    .filters-section {
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .filter-field {
      flex: 1;
      max-width: 400px;
    }

    .filter-info {
      color: #5f6368;
      font-size: 14px;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .origins-table {
      width: 100%;
    }

    .mat-header-cell {
      background: #f8f9fa;
      color: #5f6368;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px;
    }

    .mat-cell {
      padding: 16px;
      border-bottom: 1px solid #f1f3f4;
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #1976d2;
    }

    .origin-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;
    }

    .origin-link:hover {
      text-decoration: underline;
    }

    .cache-mode {
      color: #202124;
      font-size: 14px;
    }

    .load-balancers {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .load-balancer-link {
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
    }

    .load-balancer-link:hover {
      text-decoration: underline;
    }

    .cache-hit-ratio {
      color: #202124;
      font-size: 14px;
    }

    .cache-hit-ratio.no-data {
      color: #5f6368;
      font-style: italic;
    }

    .mat-row {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .mat-row:hover {
      background-color: #f8f9fa;
    }

    .mat-row.selected {
      background-color: #e8f0fe;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .no-data-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #5f6368;
      margin-bottom: 16px;
    }

    .no-data h3 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 20px;
      font-weight: 400;
    }

    .no-data p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 14px;
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #f1f3f4;
    }

    .selection-info {
      color: #5f6368;
      font-size: 14px;
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
      .cloud-cdn-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .header-actions {
        justify-content: space-between;
      }

      .filters-section {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .filter-info {
        text-align: center;
      }

      .table-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .add-origin-dialog {
        width: 95%;
        margin: 16px;
      }
    }

    /* Material Design Overrides */
    .mat-form-field-appearance-outline .mat-form-field-outline-thick {
      color: #1976d2;
    }

    .mat-focused .mat-form-field-label {
      color: #1976d2;
    }

    .mat-checkbox-checked .mat-checkbox-background {
      background-color: #1976d2;
    }

    .mat-paginator {
      background: transparent;
    }
  `]
})
export class CloudCdnComponent implements OnInit {
  displayedColumns: string[] = ['select', 'originName', 'cacheMode', 'loadBalancers', 'cacheHitRatio', 'actions'];
  
  origins: CdnOrigin[] = [
    {
      id: '1',
      name: 'browse-backends',
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: ['shopping-site-lb'],
      cacheHitRatio: 'No data',
      status: 'ACTIVE'
    },
    {
      id: '2',
      name: 'cart-backends',
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: ['shopping-site-lb'],
      cacheHitRatio: 'No data',
      status: 'ACTIVE'
    },
    {
      id: '3',
      name: 'checkout-backends',
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: ['shopping-site-lb'],
      cacheHitRatio: 'No data',
      status: 'ACTIVE'
    },
    {
      id: '4',
      name: 'feeds-backends',
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: ['shopping-site-lb'],
      cacheHitRatio: 'No data',
      status: 'ACTIVE'
    },
    {
      id: '5',
      name: 'test-https',
      cacheMode: 'Use origin headers',
      associatedLoadBalancers: ['shopping-site-lb'],
      cacheHitRatio: 'No data',
      status: 'ACTIVE'
    }
  ];

  filteredOrigins: CdnOrigin[] = [];
  selection = new SelectionModel<CdnOrigin>(true, []);
  filterValue = '';
  showAddOriginDialog = false;
  originForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.filteredOrigins = [...this.origins];
    this.originForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      cacheMode: ['Use origin headers', Validators.required],
      loadBalancer: [[], Validators.required]
    });
  }

  ngOnInit() {
    // Component initialization
  }

  applyFilter() {
    if (!this.filterValue) {
      this.filteredOrigins = [...this.origins];
    } else {
      this.filteredOrigins = this.origins.filter(origin =>
        origin.name.toLowerCase().includes(this.filterValue.toLowerCase()) ||
        origin.cacheMode.toLowerCase().includes(this.filterValue.toLowerCase()) ||
        origin.associatedLoadBalancers.some(lb => 
          lb.toLowerCase().includes(this.filterValue.toLowerCase())
        )
      );
    }
  }

  addOrigin() {
    this.showAddOriginDialog = true;
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
      this.applyFilter();
      this.closeAddOriginDialog();
    }
  }

  refresh() {
    console.log('Refreshing CDN origins...');
  }

  removeSelected() {
    const selectedOrigins = this.selection.selected;
    this.origins = this.origins.filter(origin => !selectedOrigins.includes(origin));
    this.selection.clear();
    this.applyFilter();
  }

  viewOriginDetails(origin: CdnOrigin) {
    console.log('Viewing origin details:', origin);
  }

  viewLoadBalancer(loadBalancer: string) {
    console.log('Viewing load balancer:', loadBalancer);
  }

  editOrigin(origin: CdnOrigin) {
    console.log('Editing origin:', origin);
  }

  deleteOrigin(origin: CdnOrigin) {
    this.origins = this.origins.filter(o => o.id !== origin.id);
    this.applyFilter();
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredOrigins.forEach(row => this.selection.select(row));
    }
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredOrigins.length;
    return numSelected === numRows;
  }
}
