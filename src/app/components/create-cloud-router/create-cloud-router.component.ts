import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CloudRouterService, NetworkOption, RegionOption, CreateRouterRequest } from '../../services/cloud-router.service';

@Component({
  selector: 'app-create-cloud-router',
  templateUrl: './create-cloud-router.component.html',
  styleUrls: ['./create-cloud-router.component.scss']
})
export class CreateCloudRouterComponent implements OnInit {
  routerForm: FormGroup;
  networks: NetworkOption[] = [];
  regions: RegionOption[] = [];
  loading = false;
  isSubmitting = false;
  showEquivalentCommand = false;
  showEquivalentRest = false;

  constructor(
    private fb: FormBuilder,
    private cloudRouterService: CloudRouterService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.routerForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.pattern(/^[a-z0-9-]+$/),
        Validators.minLength(1),
        Validators.maxLength(63)
      ]],
      description: [''],
      network: ['', Validators.required],
      region: ['', Validators.required],
      asn: [64512, [
        Validators.required,
        Validators.min(64512),
        Validators.max(65534)
      ]],
      bgpKeepaliveInterval: [20, [
        Validators.required,
        Validators.min(1),
        Validators.max(60)
      ]],
      bgpIdentifier: [''],
      advertiseMode: ['DEFAULT']
    });
  }

  ngOnInit(): void {
    this.loadNetworks();
    this.loadRegions();
    this.generateBgpIdentifier();
  }

  loadNetworks(): void {
    this.cloudRouterService.getNetworks().subscribe({
      next: (networks) => {
        this.networks = networks;
        // Auto-select default network if available
        const defaultNetwork = networks.find(n => n.name === 'default');
        if (defaultNetwork) {
          this.routerForm.patchValue({ network: defaultNetwork.name });
        }
      },
      error: (error) => {
        console.error('Error loading networks:', error);
        this.snackBar.open('Error loading networks', 'Close', { duration: 3000 });
      }
    });
  }

  loadRegions(): void {
    this.cloudRouterService.getRegions().subscribe({
      next: (regions) => {
        this.regions = regions.filter(r => r.status === 'UP');
        // Auto-select us-central1 if available
        const defaultRegion = regions.find(r => r.name === 'us-central1');
        if (defaultRegion) {
          this.routerForm.patchValue({ region: defaultRegion.name });
        }
      },
      error: (error) => {
        console.error('Error loading regions:', error);
        this.snackBar.open('Error loading regions', 'Close', { duration: 3000 });
      }
    });
  }

  generateBgpIdentifier(): void {
    // Generate a random BGP identifier in IPv4 format
    const randomOctet = () => Math.floor(Math.random() * 254) + 1;
    const bgpId = `169.254.${randomOctet()}.${randomOctet()}`;
    this.routerForm.patchValue({ bgpIdentifier: bgpId });
  }

  onSubmit(): void {
    if (this.routerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formValue = this.routerForm.value;
      const routerData: CreateRouterRequest = {
        name: formValue.name,
        description: formValue.description,
        network: formValue.network,
        region: formValue.region,
        asn: formValue.asn,
        bgpKeepaliveInterval: formValue.bgpKeepaliveInterval,
        advertiseMode: formValue.advertiseMode,
        advertisedGroups: formValue.advertiseMode === 'DEFAULT' ? ['ALL_SUBNETS'] : []
      };

      this.cloudRouterService.createCloudRouter(routerData).subscribe({
        next: (response) => {
          this.snackBar.open(`Router "${routerData.name}" created successfully`, 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/cloud-router']);
        },
        error: (error) => {
          console.error('Error creating router:', error);
          this.snackBar.open('Error creating router. Please try again.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isSubmitting = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.routerForm.controls).forEach(key => {
        this.routerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/cloud-router']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.routerForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} is required`;
    }
    if (control?.hasError('pattern')) {
      return 'Only lowercase letters, numbers, and hyphens are allowed';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldDisplayName(fieldName)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      return `${this.getFieldDisplayName(fieldName)} must not exceed ${control.errors?.['maxlength'].requiredLength} characters`;
    }
    if (control?.hasError('min')) {
      return `Value must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Value must not exceed ${control.errors?.['max'].max}`;
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      description: 'Description',
      network: 'Network',
      region: 'Region',
      asn: 'Cloud Router ASN',
      bgpKeepaliveInterval: 'BGP peer keepalive interval',
      bgpIdentifier: 'BGP identifier'
    };
    return displayNames[fieldName] || fieldName;
  }

  toggleEquivalentCommand(): void {
    this.showEquivalentCommand = !this.showEquivalentCommand;
    this.showEquivalentRest = false;
  }

  toggleEquivalentRest(): void {
    this.showEquivalentRest = !this.showEquivalentRest;
    this.showEquivalentCommand = false;
  }

  getEquivalentCommand(): string {
    const formValue = this.routerForm.value;
    return `gcloud compute routers create ${formValue.name} \\
  --network=${formValue.network} \\
  --region=${formValue.region} \\
  --asn=${formValue.asn} \\
  --bgp-keepalive-interval=${formValue.bgpKeepaliveInterval} \\
  --advertise-mode=${formValue.advertiseMode}${formValue.description ? ` \\
  --description="${formValue.description}"` : ''}`;
  }

  getEquivalentRest(): string {
    const formValue = this.routerForm.value;
    return `POST https://compute.googleapis.com/compute/v1/projects/PROJECT_ID/regions/${formValue.region}/routers

{
  "name": "${formValue.name}",
  "description": "${formValue.description}",
  "network": "projects/PROJECT_ID/global/networks/${formValue.network}",
  "asn": ${formValue.asn},
  "bgp": {
    "asn": ${formValue.asn},
    "keepaliveInterval": ${formValue.bgpKeepaliveInterval},
    "advertiseMode": "${formValue.advertiseMode}",
    "advertisedGroups": ["ALL_SUBNETS"]
  }
}`;
  }
}
