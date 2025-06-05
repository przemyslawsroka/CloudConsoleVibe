import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Project {
  name: string;
  id: string;
  type: string;
  starred: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private currentProjectSubject = new BehaviorSubject<Project | null>(this.loadInitialProject());
  currentProject$ = this.currentProjectSubject.asObservable();

  setCurrentProject(project: Project) {
    this.currentProjectSubject.next(project);
    localStorage.setItem('currentProject', JSON.stringify(project));
  }

  getCurrentProject(): Project | null {
    return this.currentProjectSubject.value;
  }

  private loadInitialProject(): Project | null {
    const saved = localStorage.getItem('currentProject');
    return saved ? JSON.parse(saved) : null;
  }
} 