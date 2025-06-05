import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface Project {
  name: string;
  id: string;
  type: string;
  starred: boolean;
}

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
                <input matInput [(ngModel)]="searchText" (ngModelChange)="filterProjects()">
              </mat-form-field>
            </div>
            <table class="project-table">
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
                  <td>{{project.name}}</td>
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
          </ng-template>
        </mat-tab>
        <mat-tab label="Starred">
          <ng-template matTabContent>
            <table class="project-table">
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
                  <td>{{project.name}}</td>
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
          </ng-template>
        </mat-tab>
        <mat-tab label="All">
          <ng-template matTabContent>
            <table class="project-table">
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
                  <td>{{project.name}}</td>
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
    .search-bar { margin-bottom: 16px; }
    .full-width { width: 100%; }
    .project-table { width: 100%; border-collapse: collapse; }
    .project-table th, .project-table td { padding: 8px 12px; }
    .project-table tr.selected { background: #e3f2fd; }
    .actions { display: flex; align-items: center; margin-top: 16px; }
    .spacer { flex: 1 1 auto; }
  `]
})
export class ProjectPickerComponent {
  selectedTab = 0;
  searchText = '';
  selectedProject: Project | null = null;

  recentProjects: Project[] = [
    { name: 'net-top-viz-demo-208511', id: 'net-top-viz-demo-208511', type: 'Project', starred: true },
    { name: 'przemeksroka-joonix-service', id: 'przemeksroka-joonix-service', type: 'Project', starred: false },
    { name: 'online-boutique', id: 'online-boutique-308414', type: 'Project', starred: false },
    { name: 'przemek-sroka-private', id: 'aerial-reef-282520', type: 'Project', starred: false },
    { name: 'Gemini API', id: 'gen-lang-client-0296497231', type: 'Project', starred: false },
    { name: 'przemeksroka-joonix-log-test', id: 'przemeksroka-joonix-log-test', type: 'Project', starred: false }
  ];
  starredProjects: Project[] = this.recentProjects.filter(p => p.starred);
  allProjects: Project[] = this.recentProjects;
  filteredRecent: Project[] = this.recentProjects;

  constructor(
    public dialogRef: MatDialogRef<ProjectPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedProject = data?.selectedProject || this.recentProjects[0];
  }

  filterProjects() {
    const text = this.searchText.toLowerCase();
    this.filteredRecent = this.recentProjects.filter(p => p.name.toLowerCase().includes(text) || p.id.toLowerCase().includes(text));
  }

  selectProject(project: Project) {
    this.selectedProject = project;
  }

  toggleStar(project: Project) {
    project.starred = !project.starred;
    this.starredProjects = this.recentProjects.filter(p => p.starred);
  }

  newProject() {
    // TODO: Implement new project creation
    alert('New project creation not implemented.');
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSelect() {
    this.dialogRef.close(this.selectedProject);
  }
} 