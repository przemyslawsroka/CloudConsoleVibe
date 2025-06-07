import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { delay, map, switchMap, tap, catchError } from 'rxjs/operators';
import { CreationStep } from '../components/load-balancing/load-balancer-creation-progress.component';

export interface LoadBalancerCreationConfig {
  name: string;
  description?: string;
  type: 'APPLICATION' | 'NETWORK';
  facing: 'EXTERNAL' | 'INTERNAL';
  deployment: 'GLOBAL' | 'REGIONAL';
  generation?: 'GLOBAL_EXTERNAL' | 'CLASSIC';
  frontendConfig: any;
  backendServices: any[];
  routingRules: any[];
}

@Injectable({
  providedIn: 'root'
})
export class LoadBalancerCreationService {
  private stepsSubject = new BehaviorSubject<CreationStep[]>([]);
  private cancellationSubject = new Subject<void>();

  public steps$ = this.stepsSubject.asObservable();

  constructor() {}

  createLoadBalancer(config: LoadBalancerCreationConfig): Observable<CreationStep[]> {
    // Initialize creation steps based on configuration
    const steps = this.initializeSteps(config);
    this.stepsSubject.next(steps);

    // Start the creation process
    return this.executeCreationSteps(config, steps);
  }

  cancelCreation(): void {
    this.cancellationSubject.next();
  }

  private initializeSteps(config: LoadBalancerCreationConfig): CreationStep[] {
    const steps: CreationStep[] = [
      {
        id: 'load-balancer',
        name: config.name,
        status: 'pending'
      },
      {
        id: 'health-checks',
        name: 'Health checks',
        status: 'pending'
      },
      {
        id: 'backend-services',
        name: 'Backend services',
        status: 'pending'
      },
      {
        id: 'url-map',
        name: 'URL map and routing',
        status: 'pending'
      }
    ];

    // Add conditional steps based on configuration
    if (config.facing === 'EXTERNAL') {
      steps.push({
        id: 'static-ip',
        name: 'Static IP address',
        status: 'pending'
      });
    }

    if (config.type === 'APPLICATION') {
      steps.push({
        id: 'ssl-certificates',
        name: 'SSL certificates',
        status: 'pending'
      });
      
      steps.push({
        id: 'target-proxy',
        name: 'Target HTTP/HTTPS proxy',
        status: 'pending'
      });
    } else {
      steps.push({
        id: 'target-pool',
        name: 'Target pool',
        status: 'pending'
      });
    }

    steps.push({
      id: 'forwarding-rules',
      name: 'Forwarding rules',
      status: 'pending'
    });

    steps.push({
      id: 'cloud-armor',
      name: 'Cloud Armor policies',
      status: 'pending'
    });

    // Add virtual machines step (for demo purposes)
    steps.splice(1, 0, {
      id: 'virtual-machines',
      name: 'Virtual machines',
      status: 'pending'
    });

    // Add ports step
    steps.splice(2, 0, {
      id: 'ports',
      name: 'Ports',
      status: 'pending'
    });

    return steps;
  }

  private executeCreationSteps(config: LoadBalancerCreationConfig, steps: CreationStep[]): Observable<CreationStep[]> {
    return new Observable(observer => {
      let currentStepIndex = 0;

      const processNextStep = () => {
        if (currentStepIndex >= steps.length) {
          observer.next(steps);
          observer.complete();
          return;
        }

        const currentStep = steps[currentStepIndex];
        
        // Skip the main load balancer step (it's just a header)
        if (currentStep.id === 'load-balancer') {
          currentStep.status = 'completed';
          this.stepsSubject.next([...steps]);
          currentStepIndex++;
          setTimeout(processNextStep, 500);
          return;
        }

        // Update step to creating status
        currentStep.status = 'creating';
        this.stepsSubject.next([...steps]);

        // Simulate step execution
        this.executeStep(currentStep, config).subscribe({
          next: (result) => {
            currentStep.status = 'completed';
            if (result.resourceId) {
              currentStep.resourceId = result.resourceId;
            }
            this.stepsSubject.next([...steps]);
            currentStepIndex++;
            setTimeout(processNextStep, 800); // Delay between steps
          },
          error: (error) => {
            currentStep.status = 'error';
            currentStep.errorMessage = error.message || 'Creation failed';
            this.stepsSubject.next([...steps]);
            
            // Continue with next step even if one fails (for demo purposes)
            currentStepIndex++;
            setTimeout(processNextStep, 1000);
          }
        });
      };

      // Start processing
      processNextStep();

      // Handle cancellation
      const cancellationSub = this.cancellationSubject.subscribe(() => {
        observer.error(new Error('Creation cancelled by user'));
      });

      return () => {
        cancellationSub.unsubscribe();
      };
    });
  }

  private executeStep(step: CreationStep, config: LoadBalancerCreationConfig): Observable<any> {
    // Simulate different execution times and potential failures
    const executionTime = this.getExecutionTime(step.id);
    const failureRate = this.getFailureRate(step.id);

    return of(null).pipe(
      delay(executionTime),
      switchMap(() => {
        // Simulate random failures
        if (Math.random() < failureRate) {
          return throwError(new Error(this.getErrorMessage(step.id)));
        }

        // Return success result with resource ID
        return of({
          success: true,
          resourceId: this.generateResourceId(step.id, config.name)
        });
      })
    );
  }

  private getExecutionTime(stepId: string): number {
    const times: { [key: string]: number } = {
      'virtual-machines': 3000,
      'ports': 1500,
      'health-checks': 2000,
      'backend-services': 2500,
      'url-map': 1800,
      'static-ip': 1200,
      'ssl-certificates': 2200,
      'target-proxy': 1800,
      'target-pool': 1600,
      'forwarding-rules': 1400,
      'cloud-armor': 1000
    };
    return times[stepId] || 2000;
  }

  private getFailureRate(stepId: string): number {
    // Simulate occasional failures for demo purposes
    const failureRates: { [key: string]: number } = {
      'virtual-machines': 0.1, // 10% chance of failure
      'ports': 0.05,
      'health-checks': 0.08,
      'backend-services': 0.12,
      'url-map': 0.05,
      'static-ip': 0.15,
      'ssl-certificates': 0.2, // Higher failure rate for SSL
      'target-proxy': 0.08,
      'target-pool': 0.06,
      'forwarding-rules': 0.1,
      'cloud-armor': 0.05
    };
    return failureRates[stepId] || 0.05;
  }

  private getErrorMessage(stepId: string): string {
    const errorMessages: { [key: string]: string } = {
      'virtual-machines': 'Failed to create virtual machine instances. Insufficient quota in region.',
      'ports': 'Port configuration failed. Port 80 already in use.',
      'health-checks': 'Health check creation failed. Invalid health check path.',
      'backend-services': 'Backend service creation failed. No available instances in target group.',
      'url-map': 'URL map creation failed. Invalid routing configuration.',
      'static-ip': 'Static IP allocation failed. No available IP addresses in region.',
      'ssl-certificates': 'SSL certificate provisioning failed. Domain validation required.',
      'target-proxy': 'Target proxy creation failed. Invalid certificate configuration.',
      'target-pool': 'Target pool creation failed. Instance group not found.',
      'forwarding-rules': 'Forwarding rule creation failed. IP address already in use.',
      'cloud-armor': 'Cloud Armor policy creation failed. Invalid security rule configuration.'
    };
    return errorMessages[stepId] || 'Unknown error occurred during resource creation.';
  }

  private generateResourceId(stepId: string, loadBalancerName: string): string {
    const resourceIds: { [key: string]: string } = {
      'virtual-machines': `instances-${loadBalancerName}-${Math.random().toString(36).substr(2, 4)}`,
      'ports': 'Port 80, 443',
      'health-checks': `hc-${loadBalancerName}`,
      'backend-services': `be-${loadBalancerName}`,
      'url-map': `um-${loadBalancerName}`,
      'static-ip': this.generateIPAddress(),
      'ssl-certificates': `ssl-${loadBalancerName}`,
      'target-proxy': `tp-${loadBalancerName}`,
      'target-pool': `pool-${loadBalancerName}`,
      'forwarding-rules': `fr-${loadBalancerName}`,
      'cloud-armor': `armor-${loadBalancerName}`
    };
    return resourceIds[stepId] || `resource-${loadBalancerName}-${stepId}`;
  }

  private generateIPAddress(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
} 