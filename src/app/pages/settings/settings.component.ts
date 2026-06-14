import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { GymProfileComponent } from './gym-profile/gym-profile.component';
import { BranchesComponent } from './branches/branches.component';
import { MembershipConfigComponent } from './membership-config/membership-config.component';
import { PaymentSettingsComponent } from './payment-settings/payment-settings.component';
import { InvoiceSettingsComponent } from './invoice-settings/invoice-settings.component';
import { NotificationSettingsComponent } from './notification-settings/notification-settings.component';
import { BrandingComponent } from './branding/branding.component';
import { IntegrationsComponent } from './integrations/integrations.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    GymProfileComponent,
    BranchesComponent,
    MembershipConfigComponent,
    PaymentSettingsComponent,
    InvoiceSettingsComponent,
    NotificationSettingsComponent,
    BrandingComponent,
    IntegrationsComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  activeTab = 'profile';

  tabs = [
    { id: 'profile', label: 'Gym Profile', icon: 'business' },
    { id: 'branches', label: 'Branches', icon: 'store' },
    { id: 'memberships', label: 'Membership Configuration', icon: 'card_membership' },
    { id: 'payments', label: 'Payment Settings', icon: 'account_balance' },
    { id: 'invoices', label: 'Invoice Settings', icon: 'receipt' },
    { id: 'notifications', label: 'Notification Settings', icon: 'notifications_active' },
    { id: 'branding', label: 'Branding', icon: 'palette' },
    { id: 'integrations', label: 'Integrations', icon: 'integration_instructions' }
  ];

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
        this.cdr.markForCheck();
      }
    });
  }

  setTab(tabId: string): void {
    this.activeTab = tabId;
    this.cdr.markForCheck();
  }
}
