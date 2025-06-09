import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { filter } from 'rxjs/operators';

declare let gtag: Function;

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: { [key: string]: any };
}

export interface UserProperties {
  user_type?: 'authenticated' | 'demo' | 'anonymous';
  project_id?: string;
  session_id?: string;
  page_category?: string;
}

/**
 * Google Analytics 4 (GA4) Service for CloudConsoleVibe
 * 
 * This service provides comprehensive analytics tracking including:
 * - Page views and navigation tracking
 * - Custom events for serverless functions interactions
 * - User authentication state tracking
 * - Service usage analytics
 * - Error and performance tracking
 * - Cost optimization insights
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {
  private trackingId = 'G-TCLR1BZ0N7';
  private isInitialized = false;
  private enableAnalytics = true;
  private sessionId: string;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.sessionId = this.generateSessionId();
    this.initializeGoogleAnalytics();
    this.setupRouteTracking();
  }

  /**
   * Initialize Google Analytics with the tracking code
   */
  private initializeGoogleAnalytics(): void {
    try {
      // Check if analytics is enabled in environment
      if (typeof window !== 'undefined' && (window as any)._env_) {
        this.enableAnalytics = (window as any)._env_.ENABLE_ANALYTICS === 'true';
      }

      if (!this.enableAnalytics) {
        console.log('📊 Google Analytics disabled by configuration');
        return;
      }

      // Load gtag.js script if not already loaded
      if (!document.getElementById('google-analytics-script')) {
        const script = document.createElement('script');
        script.id = 'google-analytics-script';
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
        document.head.appendChild(script);

        script.onload = () => {
          this.initializeGtag();
        };
      } else {
        this.initializeGtag();
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Analytics:', error);
    }
  }

  /**
   * Initialize gtag configuration
   */
  private initializeGtag(): void {
    try {
      // Initialize dataLayer
      (window as any).dataLayer = (window as any).dataLayer || [];
      
      // Define gtag function
      (window as any).gtag = function() {
        (window as any).dataLayer.push(arguments);
      };

      // Configure gtag
      gtag('js', new Date());
      gtag('config', this.trackingId, {
        page_title: 'CloudConsoleVibe',
        page_location: window.location.href,
        send_page_view: false, // We'll handle page views manually
        anonymize_ip: true,
        allow_google_signals: false,
        custom_map: {
          custom_user_type: 'user_type',
          custom_project_id: 'project_id',
          custom_page_category: 'page_category'
        }
      });

      this.isInitialized = true;
      console.log('✅ Google Analytics initialized successfully');

      // Set initial user properties
      this.setUserProperties({
        user_type: this.authService.isDemoMode() ? 'demo' : 
                   this.authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        session_id: this.sessionId
      });

    } catch (error) {
      console.error('❌ Failed to initialize gtag:', error);
    }
  }

  /**
   * Setup automatic route tracking
   */
  private setupRouteTracking(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEnd = event as NavigationEnd;
      if (this.isInitialized) {
        this.trackPageView(navigationEnd.url, this.getPageTitle(navigationEnd.url));
      }
    });
  }

  /**
   * Track page views
   */
  trackPageView(page_path: string, page_title?: string): void {
    if (!this.isInitialized || !this.enableAnalytics) return;

    try {
      const pageCategory = this.getPageCategory(page_path);
      
      gtag('event', 'page_view', {
        page_title: page_title || this.getPageTitle(page_path),
        page_location: window.location.origin + page_path,
        page_path: page_path,
        custom_page_category: pageCategory,
        custom_user_type: this.authService.isDemoMode() ? 'demo' : 
                         this.authService.isAuthenticated() ? 'authenticated' : 'anonymous'
      });

      console.log('📊 Page view tracked:', page_path);
    } catch (error) {
      console.error('❌ Failed to track page view:', error);
    }
  }

  /**
   * Track custom events
   */
  trackEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized || !this.enableAnalytics) return;

    try {
      gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_user_type: this.authService.isDemoMode() ? 'demo' : 
                         this.authService.isAuthenticated() ? 'authenticated' : 'anonymous',
        ...event.custom_parameters
      });

      console.log('📊 Event tracked:', event);
    } catch (error) {
      console.error('❌ Failed to track event:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.isInitialized || !this.enableAnalytics) return;

    try {
      gtag('config', this.trackingId, {
        custom_map: {
          custom_user_type: 'user_type',
          custom_project_id: 'project_id',
          custom_page_category: 'page_category'
        },
        user_properties: properties
      });

      console.log('📊 User properties set:', properties);
    } catch (error) {
      console.error('❌ Failed to set user properties:', error);
    }
  }

  /**
   * Track serverless functions specific events
   */
  trackServerlessFunctionEvent(action: string, functionName?: string, additional?: any): void {
    this.trackEvent({
      action: action,
      category: 'serverless_functions',
      label: functionName,
      custom_parameters: {
        function_name: functionName,
        timestamp: new Date().toISOString(),
        ...additional
      }
    });
  }

  /**
   * Track function invocation
   */
  trackFunctionInvocation(functionName: string, runtime: string, success: boolean, duration?: number): void {
    this.trackEvent({
      action: 'function_invoked',
      category: 'serverless_functions',
      label: functionName,
      value: duration,
      custom_parameters: {
        function_name: functionName,
        runtime: runtime,
        success: success,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track function creation
   */
  trackFunctionCreation(functionName: string, runtime: string, triggerType: string): void {
    this.trackEvent({
      action: 'function_created',
      category: 'serverless_functions',
      label: functionName,
      custom_parameters: {
        function_name: functionName,
        runtime: runtime,
        trigger_type: triggerType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track function deletion
   */
  trackFunctionDeletion(functionName: string, runtime: string): void {
    this.trackEvent({
      action: 'function_deleted',
      category: 'serverless_functions',
      label: functionName,
      custom_parameters: {
        function_name: functionName,
        runtime: runtime,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track metrics dashboard views
   */
  trackMetricsDashboardView(pageType: string, metricsData?: any): void {
    this.trackEvent({
      action: 'metrics_dashboard_viewed',
      category: 'analytics',
      label: pageType,
      custom_parameters: {
        page_type: pageType,
        metrics_data: metricsData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track filter usage
   */
  trackFilterUsage(filterType: string, filterValue: string, pageType: string): void {
    this.trackEvent({
      action: 'filter_applied',
      category: 'user_interaction',
      label: `${filterType}:${filterValue}`,
      custom_parameters: {
        filter_type: filterType,
        filter_value: filterValue,
        page_type: pageType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track search usage
   */
  trackSearch(searchTerm: string, resultsCount: number, pageType: string): void {
    this.trackEvent({
      action: 'search_performed',
      category: 'user_interaction',
      label: searchTerm,
      value: resultsCount,
      custom_parameters: {
        search_term: searchTerm,
        results_count: resultsCount,
        page_type: pageType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track authentication events
   */
  trackAuthEvent(action: 'login' | 'logout' | 'demo_mode_entered' | 'demo_mode_exited'): void {
    this.trackEvent({
      action: action,
      category: 'authentication',
      custom_parameters: {
        timestamp: new Date().toISOString()
      }
    });

    // Update user properties after auth state change
    this.setUserProperties({
      user_type: this.authService.isDemoMode() ? 'demo' : 
                 this.authService.isAuthenticated() ? 'authenticated' : 'anonymous',
      session_id: this.sessionId
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: string): void {
    this.trackEvent({
      action: 'error_occurred',
      category: 'errors',
      label: error.name,
      custom_parameters: {
        error_message: error.message,
        error_stack: error.stack,
        context: context,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, context?: string): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metric,
      value: value,
      custom_parameters: {
        metric_name: metric,
        metric_value: value,
        context: context,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track cost optimization events
   */
  trackCostOptimization(action: string, savings?: number, context?: string): void {
    this.trackEvent({
      action: action,
      category: 'cost_optimization',
      label: context,
      value: savings,
      custom_parameters: {
        potential_savings: savings,
        context: context,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get page category from URL
   */
  private getPageCategory(url: string): string {
    if (url.includes('/serverless')) return 'serverless';
    if (url.includes('/kubernetes')) return 'kubernetes';
    if (url.includes('/vpc')) return 'networking';
    if (url.includes('/load-balancing')) return 'networking';
    if (url.includes('/dns')) return 'networking';
    if (url.includes('/firewall')) return 'security';
    if (url.includes('/monitoring')) return 'observability';
    return 'general';
  }

  /**
   * Get page title from URL
   */
  private getPageTitle(url: string): string {
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/vpc': 'VPC Networks',
      '/serverless/functions': 'Serverless Functions',
      '/kubernetes/clusters': 'Kubernetes Clusters',
      '/load-balancing': 'Load Balancing',
      '/dns-management': 'DNS Management',
      '/firewall': 'Firewall',
      '/topology': 'Network Topology',
      '/ip-addresses': 'IP Addresses',
      '/cloud-cdn': 'Cloud CDN',
      '/cloud-router': 'Cloud Router',
      '/cloud-nat': 'Cloud NAT'
    };

    return titles[url] || 'CloudConsoleVibe';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enableAnalytics && this.isInitialized;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
} 