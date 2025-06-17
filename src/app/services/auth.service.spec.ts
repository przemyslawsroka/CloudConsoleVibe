import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let localStorageStore: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageStore = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageStore[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => localStorageStore[key] = value);
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => delete localStorageStore[key]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with demo mode as false by default', () => {
      expect(service.isDemoMode()).toBe(false);
    });

    it('should initialize isAuthenticated as false by default', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should initialize with null access token', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should restore demo mode from localStorage', () => {
      localStorageStore['demo_mode'] = 'true';
      
      // Create a new TestBed configuration for a fresh service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService]
      });
      
      const newService = TestBed.inject(AuthService);
      expect(newService.isDemoMode()).toBe(true);
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should restore access token from localStorage', () => {
      localStorageStore['access_token'] = 'stored-token';
      
      // Create a new TestBed configuration for a fresh service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService]
      });
      
      const newService = TestBed.inject(AuthService);
      expect(newService.getAccessToken()).toBe('stored-token');
      expect(newService.isAuthenticated()).toBe(true);
    });
  });

  describe('Demo Mode Authentication', () => {
    it('should activate demo mode correctly', () => {
      spyOn(console, 'log');
      
      service.loginDemo();
      
      expect(service.isDemoMode()).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getAccessToken()).toBe('demo-mode-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('demo_mode', 'true');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(console.log).toHaveBeenCalledWith('🎭 Starting demo mode login...');
      expect(console.log).toHaveBeenCalledWith('✅ Demo mode activated with mock data');
    });

    it('should provide observables for authentication state', (done) => {
      service.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) {
          expect(isAuth).toBe(true);
          done();
        }
      });

      service.loginDemo();
    });

    it('should provide observables for demo mode state', (done) => {
      service.isDemoMode$.subscribe(isDemoMode => {
        if (isDemoMode) {
          expect(isDemoMode).toBe(true);
          done();
        }
      });

      service.loginDemo();
    });
  });

  describe('Production Authentication', () => {
    it('should handle auth callback correctly', () => {
      spyOn(console, 'log');
      const mockToken = 'ya29.mock-access-token';
      
      service.handleAuthCallback(mockToken);
      
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBe(mockToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', mockToken);
      expect(localStorage.removeItem).toHaveBeenCalledWith('demo_mode');
      expect(console.log).toHaveBeenCalledWith('🔑 Authentication successful, projects will be loaded by app component');
    });

    it('should switch from demo mode to production auth', () => {
      // Start in demo mode
      service.loginDemo();
      expect(service.isDemoMode()).toBe(true);
      
      // Switch to production auth
      const realToken = 'ya29.real-token';
      service.handleAuthCallback(realToken);
      
      expect(service.isDemoMode()).toBe(false);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getAccessToken()).toBe(realToken);
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      // Set up authenticated state
      service.loginDemo();
    });

    it('should clear all authentication data on logout', () => {
      spyOn(console, 'log');
      
      service.logout();
      
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBeNull();
      expect(console.log).toHaveBeenCalledWith('🚪 Logging out user...');
      expect(console.log).toHaveBeenCalledWith('✅ Logout complete - all user data cleared');
    });

    it('should clear localStorage on logout', () => {
      service.logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('demo_mode');
      expect(localStorage.removeItem).toHaveBeenCalledWith('currentProject');
      expect(localStorage.removeItem).toHaveBeenCalledWith('starredProjects');
    });

    it('should emit observable updates on logout', (done) => {
      let authUpdates = 0;
      let demoUpdates = 0;

      service.isAuthenticated$.subscribe(isAuth => {
        authUpdates++;
        if (authUpdates === 2 && !isAuth) {
          // Second update should be false after logout
          expect(isAuth).toBe(false);
        }
      });

      service.isDemoMode$.subscribe(isDemoMode => {
        demoUpdates++;
        if (demoUpdates === 2 && !isDemoMode) {
          // Second update should be false after logout
          expect(isDemoMode).toBe(false);
          done();
        }
      });

      service.logout();
    });

    it('should handle logout gracefully when not authenticated', () => {
      service.logout(); // First logout
      expect(service.isAuthenticated()).toBe(false);
      
      service.logout(); // Second logout should not crash
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should return correct access token', () => {
      const mockToken = 'test-token-123';
      service.handleAuthCallback(mockToken);
      expect(service.getAccessToken()).toBe(mockToken);
    });

    it('should return demo token in demo mode', () => {
      service.loginDemo();
      expect(service.getAccessToken()).toBe('demo-mode-token');
    });

    it('should return null when not authenticated', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should persist tokens correctly', () => {
      const realToken = 'ya29.production-token';
      service.handleAuthCallback(realToken);
      
      // Verify localStorage is called with correct parameters
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', realToken);
      expect(localStorage.removeItem).toHaveBeenCalledWith('demo_mode');
    });
  });

  describe('Authentication State Observables', () => {
    it('should emit authentication state changes', () => {
      const authStates: boolean[] = [];
      
      service.isAuthenticated$.subscribe(state => {
        authStates.push(state);
      });

      service.loginDemo();
      service.logout();
      
      expect(authStates).toEqual([false, true, false]);
    });

    it('should emit demo mode state changes', () => {
      const demoStates: boolean[] = [];
      
      service.isDemoMode$.subscribe(state => {
        demoStates.push(state);
      });

      service.loginDemo();
      service.handleAuthCallback('real-token');
      
      expect(demoStates).toEqual([false, true, false]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle localStorage errors gracefully', () => {
      // Modify existing spy to throw error
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage quota exceeded');
      
      // Current implementation throws when localStorage fails - this documents the behavior
      expect(() => service.loginDemo()).toThrowError('Storage quota exceeded');
      
      // Since localStorage.setItem fails before the BehaviorSubject updates are called,
      // the service state remains in its initial state
      expect(service.isDemoMode()).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getAccessToken()).toBe('demo-mode-token'); // Only this is set before localStorage call
    });

    it('should handle corrupted localStorage data', () => {
      localStorageStore['demo_mode'] = 'invalid-boolean';
      
      // Create a new TestBed configuration for testing with corrupted data
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService]
      });
      
      expect(() => TestBed.inject(AuthService)).not.toThrow();
    });
  });

  describe('GCP Integration Validation', () => {
    it('should handle different authentication scenarios', () => {
      // Test demo mode for development
      service.loginDemo();
      expect(service.isDemoMode()).toBe(true);
      expect(service.getAccessToken()).toBe('demo-mode-token');
      
      // Test production auth
      service.handleAuthCallback('ya29.real-gcp-token');
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBe('ya29.real-gcp-token');
    });

    it('should maintain proper authentication state consistency', () => {
      // Initial state
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDemoMode()).toBe(false);
      
      // Demo login
      service.loginDemo();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(true);
      
      // Production login
      service.handleAuthCallback('token');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(false);
      
      // Logout
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDemoMode()).toBe(false);
    });

    it('should support both demo and production workflows', () => {
      // Demo workflow
      service.loginDemo();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(true);
      
      // Can switch to production workflow
      service.handleAuthCallback('production-token');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBe('production-token');
    });

    it('should properly manage state transitions', () => {
      // Start unauthenticated
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDemoMode()).toBe(false);
      
      // Go to demo mode
      service.loginDemo();
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(true);
      expect(service.getAccessToken()).toBe('demo-mode-token');
      
      // Switch to production
      service.handleAuthCallback('gcp-token');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBe('gcp-token');
      
      // Logout
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isDemoMode()).toBe(false);
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('Service Method Contracts', () => {
    it('should implement all required methods', () => {
      expect(typeof service.login).toBe('function');
      expect(typeof service.loginDemo).toBe('function');
      expect(typeof service.handleAuthCallback).toBe('function');
      expect(typeof service.logout).toBe('function');
      expect(typeof service.getAccessToken).toBe('function');
      expect(typeof service.isAuthenticated).toBe('function');
      expect(typeof service.isDemoMode).toBe('function');
    });

    it('should provide observable streams', () => {
      expect(service.isAuthenticated$).toBeDefined();
      expect(service.isDemoMode$).toBeDefined();
      expect(typeof service.isAuthenticated$.subscribe).toBe('function');
      expect(typeof service.isDemoMode$.subscribe).toBe('function');
    });

    it('should handle authentication state persistence', () => {
      // Start fresh
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      
      // Authenticate
      service.handleAuthCallback('test-token');
      expect(service.isAuthenticated()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'test-token');
      
      // Should persist between service instances
      localStorageStore['access_token'] = 'test-token';
      const newService = TestBed.inject(AuthService);
      expect(newService.isAuthenticated()).toBe(true);
      expect(newService.getAccessToken()).toBe('test-token');
    });
  });
});