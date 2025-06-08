import { Component, Input, Output, EventEmitter, TemplateRef, ContentChildren, QueryList, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
  width?: string;
  type?: 'text' | 'link' | 'badge' | 'status' | 'date' | 'number' | 'custom';
  format?: (value: any) => string;
  link?: (row: any) => void;
  class?: string;
  tooltip?: string;
}

export interface TableAction {
  label: string;
  icon: string;
  action: (row: any) => void;
  visible?: (row: any) => boolean;
  disabled?: (row: any) => boolean;
}

export interface TableConfig {
  showFilter?: boolean;
  showColumnSelector?: boolean;
  showSelection?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  multiSelect?: boolean;
  stickyHeader?: boolean;
  emptyStateIcon?: string;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateAction?: {
    label: string;
    action: () => void;
  };
}

@Component({
  selector: 'app-gcp-data-table',
  templateUrl: './gcp-data-table.component.html',
  styleUrls: ['./gcp-data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GcpDataTableComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() config: TableConfig = {};
  @Input() loading = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() createButtonLabel?: string;
  @Input() createButtonIcon?: string;

  @Output() create = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() filterChange = new EventEmitter<string>();

  @ContentChildren('customCell') customCells?: QueryList<TemplateRef<any>>;

  dataSource = new MatTableDataSource<any>([]);
  selection = new SelectionModel<any>(true, []);
  displayedColumns: string[] = [];
  visibleColumns: TableColumn[] = [];
  filterValue = '';
  showColumnSelector = false;

  // Default configuration
  defaultConfig: TableConfig = {
    showFilter: true,
    showColumnSelector: true,
    showSelection: true,
    showPagination: false,
    pageSize: 25,
    multiSelect: true,
    stickyHeader: true,
    emptyStateIcon: 'inbox',
    emptyStateTitle: 'No data found',
    emptyStateMessage: 'There are no items to display.'
  };

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.dataSource.data = this.data;
      this.selection.clear();
      this.emitSelectionChange();
    }
    
    if (changes['columns']) {
      this.updateDisplayedColumns();
    }
  }

  private initializeComponent() {
    // Merge default config with provided config
    this.config = { ...this.defaultConfig, ...this.config };
    
    // Set up selection model
    this.selection = new SelectionModel<any>(this.config.multiSelect || true, []);
    
    // Initialize data source
    this.dataSource.data = this.data;
    this.setupCustomFilter();
    
    // Update displayed columns
    this.updateDisplayedColumns();
    
    // Listen to selection changes
    this.selection.changed.subscribe(() => {
      this.emitSelectionChange();
    });
  }

  private setupCustomFilter() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const searchStr = filter.toLowerCase();
      
      // Search across all visible columns
      return this.visibleColumns.some(column => {
        const value = this.getColumnValue(data, column);
        return value?.toString().toLowerCase().includes(searchStr);
      });
    };
  }

  private updateDisplayedColumns() {
    this.visibleColumns = this.columns.filter(col => col.visible !== false);
    
    this.displayedColumns = [];
    
    if (this.config.showSelection) {
      this.displayedColumns.push('select');
    }
    
    this.displayedColumns.push(...this.visibleColumns.map(col => col.key));
    
    if (this.actions.length > 0) {
      this.displayedColumns.push('actions');
    }
  }

  // Filter methods
  applyFilter(event: Event | string) {
    let filterValue: string;
    
    if (typeof event === 'string') {
      filterValue = event;
    } else {
      filterValue = (event.target as HTMLInputElement).value;
    }
    
    this.filterValue = filterValue;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.filterChange.emit(filterValue);
  }

  clearFilter() {
    this.filterValue = '';
    this.dataSource.filter = '';
    this.filterChange.emit('');
  }

  // Column visibility methods
  toggleColumnSelector() {
    this.showColumnSelector = !this.showColumnSelector;
  }

  toggleColumnVisibility(column: TableColumn) {
    column.visible = !column.visible;
    this.updateDisplayedColumns();
  }

  // Selection methods
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  isIndeterminate() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected > 0 && numSelected < numRows;
  }

  private emitSelectionChange() {
    this.selectionChange.emit(this.selection.selected);
  }

  // Data access methods
  getColumnValue(row: any, column: TableColumn): any {
    const keys = column.key.split('.');
    let value = row;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (column.format && value !== null && value !== undefined) {
      return column.format(value);
    }
    
    return value;
  }

  getColumnClass(column: TableColumn): string {
    const classes = ['mat-column-' + column.key];
    if (column.class) {
      classes.push(column.class);
    }
    return classes.join(' ');
  }

  // Event handlers
  onRowClick(row: any, event: Event) {
    // Prevent row click when clicking on checkboxes or actions
    const target = event.target as HTMLElement;
    if (target.closest('.mat-checkbox') || target.closest('.action-cell')) {
      return;
    }
    
    this.rowClick.emit(row);
  }

  onCreateClick() {
    this.create.emit();
  }

  onRefreshClick() {
    this.refresh.emit();
  }

  // Action methods
  executeAction(action: TableAction, row: any, event: Event) {
    event.stopPropagation();
    action.action(row);
  }

  isActionVisible(action: TableAction, row: any): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isActionDisabled(action: TableAction, row: any): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  // Utility methods
  formatDate(date: string | Date): string {
    if (!date) return '-';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatNumber(value: number): string {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
  }

  // Track by function for performance
  trackByColumn(index: number, column: TableColumn): string {
    return column.key;
  }

  trackByRow(index: number, row: any): any {
    return row.id || row.name || index;
  }
}
