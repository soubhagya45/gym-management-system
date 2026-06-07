import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GymService } from '../../services/gym.service';
import { MembershipPlan, Trainer } from '../../interfaces/gym.model';

@Component({
  selector: 'app-add-lead',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './add-lead.component.html',
  styleUrls: ['./add-lead.component.scss']
})
export class AddLeadComponent implements OnInit {
  leadForm!: FormGroup;
  plans: MembershipPlan[] = [];
  trainers: Trainer[] = [];

  constructor(
    private fb: FormBuilder,
    private gymService: GymService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load plans and trainers
    this.gymService.plans$.subscribe(plans => this.plans = plans);
    this.gymService.trainers$.subscribe(trainers => this.trainers = trainers);

    const today = new Date();
    const followUpDefault = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    this.leadForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      trialDate: [today, [Validators.required]],
      leadSource: ['Website', [Validators.required]],
      followUpDate: [followUpDefault, [Validators.required]],
      interestedPlan: [this.plans[0]?.name || '', [Validators.required]],
      notes: [''],
      assignedStaff: [''],
      status: ['New', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.leadForm.valid) {
      const formValue = this.leadForm.value;
      const formattedLead = {
        ...formValue,
        trialDate: this.formatDate(formValue.trialDate),
        followUpDate: this.formatDate(formValue.followUpDate)
      };

      this.gymService.addLead(formattedLead);
      this.snackBar.open('New lead registered successfully!', 'Dismiss', {
        duration: 3000,
        panelClass: ['premium-snack']
      });
      this.router.navigate(['/leads']);
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
