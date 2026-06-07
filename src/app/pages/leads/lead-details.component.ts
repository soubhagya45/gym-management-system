import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GymService } from '../../services/gym.service';
import { Lead, Member } from '../../interfaces/gym.model';
import { LeadDialogComponent } from './lead-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { ConvertDialogComponent } from './convert-dialog.component';

@Component({
  selector: 'app-lead-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './lead-details.component.html',
  styleUrls: ['./lead-details.component.scss']
})
export class LeadDetailsComponent implements OnInit {
  leadId: string = '';
  lead: Lead | undefined;
  convertedMember: Member | undefined;

  constructor(
    private route: ActivatedRoute,
    private gymService: GymService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.leadId = id;
        this.loadLeadData();
      }
    });
  }

  loadLeadData(): void {
    this.gymService.leads$.subscribe(leads => {
      this.lead = leads.find(l => l.id === this.leadId);
      if (this.lead && this.lead.status === 'Converted') {
        this.findConvertedMember();
      }
    });
  }

  findConvertedMember(): void {
    this.gymService.members$.subscribe(members => {
      // Find a member with matching name/email/phone
      this.convertedMember = members.find(m => 
        m.name.toLowerCase() === this.lead?.name.toLowerCase() ||
        m.email.toLowerCase() === this.lead?.email.toLowerCase() ||
        m.phone === this.lead?.phone
      );
    });
  }

  openEditDialog(): void {
    if (!this.lead) return;

    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '600px',
      data: this.lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.updateLead(result);
        this.snackBar.open('Lead details updated successfully!', 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      }
    });
  }

  confirmDelete(): void {
    if (!this.lead) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Trial Lead',
        message: `Are you sure you want to delete the lead profile of "${this.lead.name}"? This action cannot be undone.`,
        confirmText: 'Delete Lead',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.gymService.deleteLead(this.leadId);
        this.snackBar.open('Lead profile deleted successfully.', 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
        this.router.navigate(['/leads']);
      }
    });
  }

  openConvertDialog(): void {
    if (!this.lead) return;

    const dialogRef = this.dialog.open(ConvertDialogComponent, {
      width: '650px',
      data: this.lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.convertLeadToMember(this.leadId, result);
        this.snackBar.open(`Lead ${this.lead?.name} successfully converted to member!`, 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'New': return 'new-badge';
      case 'Contacted': return 'contacted-badge';
      case 'Trial Scheduled': return 'trial-scheduled-badge';
      case 'Follow Up': return 'follow-up-badge';
      case 'Converted': return 'converted-badge';
      case 'Lost': return 'lost-badge';
      default: return '';
    }
  }
}
