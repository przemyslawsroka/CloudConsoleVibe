import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-project-picker',
  template: `
    <h2 mat-dialog-title>Select a project</h2>
    <mat-dialog-content>
      <mat-tab-group [(selectedIndex)]="selectedTab">
        <mat-tab label="Recent">
          <ng-template matTabContent>
            <div class="search-bar">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Search projects and folders</mat-label>
                <input matInput [formControl]="searchControl">
              </mat-form-field>
            </div>
            <div class="loading" *ngIf="loading">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Loading projects...</span>
            </div>
            <table class="project-table" *ngIf="!loading">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let project of filteredRecent" [class.selected]="project.id === selectedProject?.id" (click)="selectProject(project)">
                  <td><mat-icon *ngIf="project.id === selectedProject?.id">check</mat-icon></td>
                  <td>{{project.displayName || project.name}}</td>
                  <td>{{project.type}}</td>
                  <td>{{project.id}}</td>
                  <td>
                    <button mat-icon-button (click)="toggleStar(project); $event.stopPropagation()">
                      <mat-icon>{{project.starred ? 'star' : 'star_border'}}</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="no-projects" *ngIf="!loading && filteredRecent.length === 0">
              <mat-icon>folder_open</mat-icon>
              <p>No projects found</p>
              <p class="hint">Try adjusting your search or check your project permissions</p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="Starred">
          <ng-template matTabContent>
            <div class="loading" *ngIf="loading">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Loading projects...</span>
            </div>
            <table class="project-table" *ngIf="!loading && starredProjects.length > 0">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let project of starredProjects" [class.selected]="project.id === selectedProject?.id" (click)="selectProject(project)">
                  <td><mat-icon *ngIf="project.id === selectedProject?.id">check</mat-icon></td>
                  <td>{{project.displayName || project.name}}</td>
                  <td>{{project.type}}</td>
                  <td>{{project.id}}</td>
                  <td>
                    <button mat-icon-button (click)="toggleStar(project); $event.stopPropagation()">
                      <mat-icon>{{project.starred ? 'star' : 'star_border'}}</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="no-projects" *ngIf="!loading && starredProjects.length === 0">
              <mat-icon>star_border</mat-icon>
              <p>No starred projects</p>
              <p class="hint">Star projects to quickly access them here</p>
            </div>
          </ng-template>
        </mat-tab>
        <mat-tab label="All">
          <ng-template matTabContent>
            <div class="loading" *ngIf="loading">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Loading projects...</span>
            </div>
            <table class="project-table" *ngIf="!loading">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let project of allProjects" [class.selected]="project.id === selectedProject?.id" (click)="selectProject(project)">
                  <td><mat-icon *ngIf="project.id === selectedProject?.id">check</mat-icon></td>
                  <td>{{project.displayName || project.name}}</td>
                  <td>{{project.type}}</td>
                  <td>{{project.id}}</td>
                  <td>
                    <button mat-icon-button (click)="toggleStar(project); $event.stopPropagation()">
                      <mat-icon>{{project.starred ? 'star' : 'star_border'}}</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="no-projects" *ngIf="!loading && allProjects.length === 0">
              <mat-icon>folder_open</mat-icon>
              <p>No projects found</p>
              <p class="hint">Check your Google Cloud account permissions</p>
            </div>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
      <div class="actions">
        <button mat-stroked-button color="primary" (click)="newProject()">New project</button>
        <span class="spacer"></span>
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="!selectedProject" (click)="onSelect()">Select</button>
      </div>
    </mat-dialog-content>
  `,
  styles: [`
    .search-bar { 
      margin-bottom: 16px; 
    }
    
    .full-width { 
      width: 100%; 
    }
    
    .project-table { 
      width: 100%; 
      border-collapse: collapse; 
      color: var(--text-color);
    }
    
    .project-table th, .project-table td { 
      padding: 8px 12px; 
      border-bottom: 1px solid var(--divider-color);
    }
    
    .project-table th {
      background-color: var(--surface-color);
      color: var(--text-secondary-color);
      font-weight: 500;
      text-align: left;
    }
    
    .project-table tr.selected { 
      background-color: var(--selected-color) !important;
      color: var(--text-color);
    }
    
    .project-table tr:hover { 
      background-color: var(--hover-color); 
      cursor: pointer; 
    }
    
    .actions { 
      display: flex; 
      align-items: center; 
      margin-top: 16px; 
    }
    
    .spacer { 
      flex: 1 1 auto; 
    }
    
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: var(--text-secondary-color);
    }
    
    .loading span {
      margin-top: 16px;
    }
    
    .no-projects {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: var(--text-secondary-color);
      text-align: center;
    }
    
    .no-projects mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--disabled-color);
      margin-bottom: 16px;
    }
    
    .no-projects p {
      margin: 4px 0;
      color: var(--text-color);
    }
    
    .no-projects .hint {
      font-size: 14px;
      color: var(--text-secondary-color);
    }
  `]
})
export class ProjectPickerComponent implements OnInit {
  selectedTab = 0;
  searchControl = new FormControl('');
  selectedProject: Project | null = null;
  loading = true;

  allProjects: Project[] = [];
  filteredRecent: Project[] = [];
  starredProjects: Project[] = [];

  constructor(
    public dialogRef: MatDialogRef<ProjectPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private projectService: ProjectService
  ) {
    this.selectedProject = data?.selectedProject || null;
  }

  ngOnInit() {
    this.loadProjects();
    
    // Subscribe to search control changes
    this.searchControl.valueChanges.subscribe(() => {
      this.filterProjects();
    });
  }

  loadProjects() {
    this.loading = true;
    this.projectService.loadProjects().subscribe({
      next: (projects) => {
        this.allProjects = projects;
        this.filteredRecent = [...projects];
        this.starredProjects = projects.filter(p => p.starred);
        this.loading = false;
        
        // If no project was previously selected, use the auto-selected one
        if (!this.selectedProject) {
          this.selectedProject = this.projectService.getCurrentProject();
        }
        
        console.log(`📋 Loaded ${projects.length} projects in picker`);
      },
      error: (error) => {
        console.error('❌ Error loading projects in picker:', error);
        this.loading = false;
      }
    });
  }

  filterProjects() {
    const text = (this.searchControl.value || '').toLowerCase();
    this.filteredRecent = this.allProjects.filter(p => 
      (p.name?.toLowerCase().includes(text)) || 
      (p.displayName?.toLowerCase().includes(text)) ||
      (p.id?.toLowerCase().includes(text))
    );
  }

  selectProject(project: Project) {
    this.selectedProject = project;
  }

  toggleStar(project: Project) {
    this.projectService.toggleProjectStar(project);
    
    // Update local lists
    this.starredProjects = this.allProjects.filter(p => p.starred);
  }

  newProject() {
    // Open Google Cloud Console for new project creation
    window.open('https://console.cloud.google.com/projectcreate', '_blank');
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSelect() {
    this.dialogRef.close(this.selectedProject);
  }
} 