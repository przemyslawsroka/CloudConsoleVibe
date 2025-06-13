import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VpcService, VpcNetwork } from '../../services/vpc.service';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-edit-vpc',
  templateUrl: './edit-vpc.component.html',
  styles: [`
    .edit-vpc-container {
      min-height: 100vh;
      background-color: #f8f9fa;
      font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
    }

    /* Header Styles */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      color: #5f6368;
    }

    .header-title h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
      line-height: 1.2;
    }

    .header-title .subtitle {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #5f6368;
      font-weight: 400;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .header-actions button {
      min-width: 80px;
    }

    /* Content Styles */
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .vpc-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Card Styles */
    .form-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    /* Form Field Styles */
    .full-width {
      width: 100%;
    }

    .form-field-container,
    .readonly-field-container {
      margin-bottom: 24px;
    }

    .field-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #5f6368;
      margin-bottom: 8px;
    }

    .readonly-field input {
      color: #5f6368 !important;
      background-color: #f8f9fa !important;
    }

    /* Summary Card Styles */
    .summary-card {
      background: #f8f9fa;
      border: 1px solid #e8f0fe;
    }

    .summary-grid {
      display: grid;
      gap: 12px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .summary-item .label {
      font-weight: 500;
      color: #5f6368;
      min-width: 200px;
      flex-shrink: 0;
    }

    .summary-item .value {
      color: #202124;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }

    .changes-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      color: #856404;
    }

    .changes-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      text-align: center;
    }

    .loading-container p {
      margin-top: 16px;
      color: #5f6368;
      font-size: 16px;
    }

    /* Error State */
    .error-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 20px;
      text-align: center;
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ea4335;
      margin-bottom: 16px;
    }

    .error-container h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 400;
      color: #202124;
    }

    .error-container p {
      margin: 0 0 24px 0;
      color: #5f6368;
      font-size: 16px;
    }

         /* Radio Button Styles */
     .radio-group {
       display: flex;
       flex-direction: column;
       gap: 16px;
       margin-top: 8px;
     }

     .radio-group-horizontal {
       display: flex;
       flex-direction: row;
       gap: 24px;
       margin-top: 8px;
     }

     .radio-option {
       margin-bottom: 0;
     }

     .radio-option-horizontal {
       margin-bottom: 0;
       margin-right: 0;
     }

     .radio-content {
       margin-left: 8px;
     }

     .radio-title {
       font-weight: 500;
       color: #202124;
       font-size: 14px;
     }

     .radio-description {
       font-size: 12px;
       color: #5f6368;
       margin-top: 4px;
       line-height: 1.4;
     }

     /* Form Field Enhancements */
     .mtu-field {
       width: 200px;
       margin-bottom: 8px;
     }

     .field-hint {
       font-size: 12px;
       color: #5f6368;
       line-height: 1.4;
       margin-top: 4px;
     }

     .learn-more-link {
       color: #1a73e8;
       text-decoration: none;
     }

     .learn-more-link:hover {
       text-decoration: underline;
     }

     /* Warning Box */
     .warning-box {
       display: flex;
       align-items: flex-start;
       gap: 8px;
       margin-top: 12px;
       padding: 12px;
       background: #fef7e0;
       border: 1px solid #fbbc04;
       border-radius: 4px;
       color: #b06000;
       font-size: 14px;
       line-height: 1.4;
     }

     .warning-icon {
       font-size: 18px;
       width: 18px;
       height: 18px;
       color: #fbbc04;
       flex-shrink: 0;
       margin-top: 2px;
     }

     /* Tags Styles */
     .tags-container {
       display: flex;
       flex-wrap: wrap;
       gap: 8px;
       margin-top: 8px;
     }

     .tag-item {
       display: flex;
       align-items: center;
       gap: 6px;
       padding: 6px 12px;
       background: #f1f3f4;
       border: 1px solid #dadce0;
       border-radius: 16px;
       font-size: 14px;
     }

     .tag-icon {
       font-size: 16px;
       width: 16px;
       height: 16px;
       color: #5f6368;
     }

     .tag-text {
       color: #202124;
     }

     .tag-edit-button {
       width: 24px;
       height: 24px;
       margin-left: 4px;
     }

     .tag-edit-button mat-icon {
       font-size: 16px;
       width: 16px;
       height: 16px;
     }

     .no-tags-text {
       color: #5f6368;
       font-style: italic;
     }

     /* Responsive Design */
     @media (max-width: 768px) {
       .header {
         padding: 12px 16px;
       }
       
       .header-title h1 {
         font-size: 20px;
       }
       
       .header-actions {
         gap: 8px;
       }
       
       .content {
         padding: 16px;
       }
       
       .summary-item {
         flex-direction: column;
         align-items: flex-start;
         gap: 4px;
       }
       
       .summary-item .label {
         min-width: auto;
       }
       
       .summary-item .value {
         text-align: left;
       }

       .radio-group {
         gap: 12px;
       }

       .tags-container {
         gap: 6px;
       }
     }
  `]
})
export class EditVpcComponent implements OnInit {
  vpcForm: FormGroup;
  vpcNetwork: VpcNetwork | null = null;
  projectId: string | null = null;
  isLoading = true;
  isSaving = false;
  private originalValues: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private vpcService: VpcService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.vpcForm = this.fb.group({
      description: [''],
      mtu: [1460],
      enableUlaInternalIpv6: [false],
      autoCreateSubnetworks: [false],
      routingMode: ['GLOBAL'],
      bestPathSelectionMode: ['LEGACY'],
      networkFirewallPolicyEnforcementOrder: ['AFTER_CLASSIC_FIREWALL'],
      tags: [[]]
    });
  }

  ngOnInit() {
    this.projectService.currentProject$.subscribe((project: Project | null) => {
      this.projectId = project?.id || null;
      const networkName = this.route.snapshot.paramMap.get('name');
      if (networkName && this.projectId) {
        this.loadVpcNetwork(networkName);
      }
    });
  }

  loadVpcNetwork(networkName: string) {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.vpcService.getVpcNetwork(this.projectId, networkName).subscribe({
      next: (vpc) => {
        this.vpcNetwork = vpc;
        this.initializeForm();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading VPC network:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initializeForm() {
    if (!this.vpcNetwork) return;

    this.vpcForm.patchValue({
      description: this.vpcNetwork.description || '',
      mtu: (this.vpcNetwork as any).mtu || 1460,
      enableUlaInternalIpv6: (this.vpcNetwork as any).enableUlaInternalIpv6 !== undefined ? (this.vpcNetwork as any).enableUlaInternalIpv6 : false,
      autoCreateSubnetworks: this.vpcNetwork.autoCreateSubnetworks,
      routingMode: this.vpcNetwork.routingConfig?.routingMode || 'GLOBAL',
      bestPathSelectionMode: (this.vpcNetwork as any).bestPathSelectionMode || 'LEGACY',
      networkFirewallPolicyEnforcementOrder: this.vpcNetwork.networkFirewallPolicyEnforcementOrder || 'AFTER_CLASSIC_FIREWALL',
      tags: (this.vpcNetwork as any).tags || []
    });

    // Store original values to detect changes
    this.originalValues = {
      description: this.vpcNetwork.description || '',
      mtu: (this.vpcNetwork as any).mtu || 1460,
      enableUlaInternalIpv6: (this.vpcNetwork as any).enableUlaInternalIpv6 || false,
      autoCreateSubnetworks: this.vpcNetwork.autoCreateSubnetworks || false,
      routingMode: this.vpcNetwork.routingConfig?.routingMode || 'GLOBAL',
      bestPathSelectionMode: (this.vpcNetwork as any).bestPathSelectionMode || 'LEGACY',
      networkFirewallPolicyEnforcementOrder: this.vpcNetwork.networkFirewallPolicyEnforcementOrder || 'AFTER_CLASSIC_FIREWALL',
      tags: (this.vpcNetwork as any).tags || []
    };
  }

  hasChanges(): boolean {
    if (!this.originalValues || !this.vpcForm) {
      return false;
    }
    const currentValues = this.vpcForm.value;
    return JSON.stringify(currentValues) !== JSON.stringify(this.originalValues);
  }

  getRoutingModeDisplay(mode: string | null | undefined): string {
    if (!mode) return 'Global';
    return mode === 'GLOBAL' ? 'Global' : 'Regional';
  }

  getFirewallPolicyDisplay(order: string | null | undefined): string {
    if (!order) return 'After Classic Firewall';
    switch (order) {
      case 'AFTER_CLASSIC_FIREWALL':
        return 'After Classic Firewall';
      case 'BEFORE_CLASSIC_FIREWALL':
        return 'Before Classic Firewall';
      default:
        return order;
    }
  }

  getBestPathSelectionDisplay(mode: string | null | undefined): string {
    if (!mode) return 'Legacy (default)';
    return mode === 'LEGACY' ? 'Legacy (default)' : 'Standard';
  }

  getSubnetModeDisplay(autoCreate: boolean): string {
    return autoCreate ? 'Auto' : 'Custom';
  }

  getUlaIpv6Display(enabled: boolean): string {
    return enabled ? 'Enabled' : 'Disabled';
  }

  onSave() {
    if (!this.vpcForm.valid || !this.hasChanges() || !this.projectId || !this.vpcNetwork) {
      return;
    }

    const updates = this.vpcForm.value;
    
    // Prepare the updates object with proper structure
    const vpcUpdates: Partial<VpcNetwork> = {};
    
    if (updates.mtu !== undefined) {
      (vpcUpdates as any).mtu = updates.mtu;
    }
    
    if (updates.enableUlaInternalIpv6 !== undefined) {
      (vpcUpdates as any).enableUlaInternalIpv6 = updates.enableUlaInternalIpv6;
    }
    
    if (updates.autoCreateSubnetworks !== undefined) {
      vpcUpdates.autoCreateSubnetworks = updates.autoCreateSubnetworks;
    }
    
    if (updates.routingMode) {
      vpcUpdates.routingConfig = {
        routingMode: updates.routingMode
      };
    }
    
    if (updates.bestPathSelectionMode) {
      (vpcUpdates as any).bestPathSelectionMode = updates.bestPathSelectionMode;
    }
    
    if (updates.networkFirewallPolicyEnforcementOrder) {
      vpcUpdates.networkFirewallPolicyEnforcementOrder = updates.networkFirewallPolicyEnforcementOrder;
    }
    
    if (updates.tags !== undefined) {
      (vpcUpdates as any).tags = updates.tags;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    this.vpcService.updateVpcNetwork(this.projectId, this.vpcNetwork.name, vpcUpdates).subscribe({
      next: (response) => {
        console.log('✅ VPC network updated successfully:', response);
        this.isSaving = false;
        // Navigate back to VPC details page
        this.router.navigate(['/vpc', this.vpcNetwork!.name]);
      },
      error: (error) => {
        console.error('Error updating VPC network:', error);
        this.isSaving = false;
        this.cdr.detectChanges();
        
        // Show user-friendly error message
        let errorMessage = 'Failed to update VPC network. ';
        if (error.error && error.error.error && error.error.error.message) {
          errorMessage += error.error.error.message;
        } else if (error.message) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Please try again.';
        }
        
        alert(errorMessage);
      }
    });
  }

  onCancel() {
    if (this.hasChanges()) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) {
        return;
      }
    }
    
    if (this.vpcNetwork) {
      this.router.navigate(['/vpc', this.vpcNetwork.name]);
    } else {
      this.router.navigate(['/vpc']);
    }
  }

  editTag(tag: string) {
    // TODO: Implement tag editing functionality
    console.log('Edit tag:', tag);
  }

  goBack() {
    this.onCancel();
  }
} 