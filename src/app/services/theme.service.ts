import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'gcp-console-theme';
  private themeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());

  public theme$: Observable<Theme> = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  private getInitialTheme(): Theme {
    // Check localStorage first
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // Default to light
    return 'light';
  }

  public getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  public toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  public setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    
    // Add new theme class
    body.classList.add(`${theme}-theme`);
    
    // Update CSS custom properties for Material components
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--background-color', '#121212');
      document.documentElement.style.setProperty('--surface-color', '#1e1e1e');
      document.documentElement.style.setProperty('--text-color', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary-color', '#b3b3b3');
      document.documentElement.style.setProperty('--primary-color', '#4285f4');
      document.documentElement.style.setProperty('--accent-color', '#34a853');
      document.documentElement.style.setProperty('--warn-color', '#ea4335');
      document.documentElement.style.setProperty('--border-color', '#3c3c3c');
      document.documentElement.style.setProperty('--hover-color', 'rgba(255, 255, 255, 0.08)');
      document.documentElement.style.setProperty('--selected-color', 'rgba(66, 133, 244, 0.12)');
      document.documentElement.style.setProperty('--disabled-color', 'rgba(255, 255, 255, 0.38)');
      document.documentElement.style.setProperty('--divider-color', 'rgba(255, 255, 255, 0.12)');
    } else {
      document.documentElement.style.setProperty('--background-color', '#ffffff');
      document.documentElement.style.setProperty('--surface-color', '#f8f9fa');
      document.documentElement.style.setProperty('--text-color', '#202124');
      document.documentElement.style.setProperty('--text-secondary-color', '#5f6368');
      document.documentElement.style.setProperty('--primary-color', '#1a73e8');
      document.documentElement.style.setProperty('--accent-color', '#34a853');
      document.documentElement.style.setProperty('--warn-color', '#ea4335');
      document.documentElement.style.setProperty('--border-color', '#dadce0');
      document.documentElement.style.setProperty('--hover-color', 'rgba(26, 115, 232, 0.04)');
      document.documentElement.style.setProperty('--selected-color', 'rgba(26, 115, 232, 0.12)');
      document.documentElement.style.setProperty('--disabled-color', 'rgba(32, 33, 36, 0.38)');
      document.documentElement.style.setProperty('--divider-color', 'rgba(32, 33, 36, 0.12)');
    }
  }

  public isDarkMode(): boolean {
    return this.themeSubject.value === 'dark';
  }

  public isLightMode(): boolean {
    return this.themeSubject.value === 'light';
  }
} 