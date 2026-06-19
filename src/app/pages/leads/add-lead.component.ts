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
import { MatDividerModule } from '@angular/material/divider';
import { SubmissionGuardService } from '../../services/submission-guard.service';

import { LeadState } from '../../presentation/state/lead.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { PTState } from '../../presentation/state/pt.state';
import { TrainerState } from '../../presentation/state/trainer.state';

import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { Employee } from '../../core/models/employee.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { Trainer } from '../../core/models/trainer.entity';

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
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './add-lead.component.html',
  styleUrls: ['./add-lead.component.scss']
})
export class AddLeadComponent implements OnInit {
  leadForm!: FormGroup;
  plans: MembershipPlan[] = [];
  employees: Employee[] = [];
  ptPlans: PTPlan[] = [];
  trainers: Trainer[] = [];

  fitnessGoalOptions: string[] = [
    'Weight Loss',
    'Muscle Gain',
    'Body Transformation',
    'General Fitness',
    'CrossFit',
    'MMA',
    'Boxing',
    'Personal Training',
    'Rehabilitation',
    'Other'
  ];

  ptGoalOptions: string[] = [
    'Weight Loss',
    'Muscle Gain',
    'Competition Prep',
    'Strength Training',
    'General Fitness',
    'Rehabilitation'
  ];

  lostReasonOptions: string[] = [
    'Too Expensive',
    'Joined Another Gym',
    'Location Too Far',
    'No Time',
    'Not Interested',
    'Medical Reasons',
    'Moved Location',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private leadState: LeadState,
    private planState: MembershipPlanState,
    private employeeState: EmployeeState,
    private ptState: PTState,
    private trainerState: TrainerState,
    private snackBar: MatSnackBar,
    private router: Router,
    public submissionGuard: SubmissionGuardService
  ) {}

  ngOnInit(): void {
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
      if (plans.length > 0 && !this.leadForm.get('interestedPlan')?.value) {
        const defaultPlan = plans[0];
        this.leadForm.patchValue({ 
          interestedPlan: defaultPlan.name,
          preferredPlan: defaultPlan.name
        });
      }
    });

    this.employeeState.employees$.subscribe(employees => {
      this.employees = employees.filter(e => e.accountStatus === 'Active');
    });

    this.ptState.ptPlans$.subscribe(plans => {
      this.ptPlans = plans.filter(p => p.isActive);
    });

    this.trainerState.trainers$.subscribe(trainers => {
      this.trainers = trainers.filter(t => t.status === 'active');
    });

    const today = new Date();
    const followUpDefault = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    this.leadForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      trialDate: [today, [Validators.required]],
      leadSource: ['Website', [Validators.required]],
      followUpDate: [followUpDefault, [Validators.required]],
      interestedPlan: ['', [Validators.required]],
      preferredPlan: ['', [Validators.required]],
      notes: [''],
      assignedEmployee: [''],
      status: ['New', [Validators.required]],
      
      // CRM Refined Fields
      leadTemperature: ['Hot', [Validators.required]],
      fitnessGoal: [['General Fitness'], [Validators.required]],
      referralSource: [''],
      trialStatus: ['Not Scheduled', [Validators.required]],
      lastFollowUp: [''],
      followUpStatus: ['Pending', [Validators.required]],
      followUpNotes: [''],
      reasonLost: [''],

      // PT Preferences
      interestedInPT: ['No', [Validators.required]],
      ptPlanId: [''],
      preferredTrainerId: [''],
      ptGoal: ['']
    });

    // PT Fields conditional validation
    this.leadForm.get('interestedInPT')?.valueChanges.subscribe(interested => {
      const ptPlanCtrl = this.leadForm.get('ptPlanId');
      const ptGoalCtrl = this.leadForm.get('ptGoal');
      if (interested === 'Yes') {
        ptPlanCtrl?.setValidators([Validators.required]);
        ptGoalCtrl?.setValidators([Validators.required]);
      } else {
        ptPlanCtrl?.clearValidators();
        ptPlanCtrl?.setValue('');
        ptGoalCtrl?.clearValidators();
        ptGoalCtrl?.setValue('');
        this.leadForm.get('preferredTrainerId')?.setValue('');
      }
      ptPlanCtrl?.updateValueAndValidity();
      ptGoalCtrl?.updateValueAndValidity();
    });

    // Sync interestedPlan and preferredPlan
    this.leadForm.get('interestedPlan')?.valueChanges.subscribe(planName => {
      this.leadForm.patchValue({ preferredPlan: planName }, { emitEvent: false });
    });

    this.leadForm.get('preferredPlan')?.valueChanges.subscribe(planName => {
      this.leadForm.patchValue({ interestedPlan: planName }, { emitEvent: false });
    });

    // Handle conditional validation for Lost Reason
    this.leadForm.get('status')?.valueChanges.subscribe(status => {
      const reasonCtrl = this.leadForm.get('reasonLost');
      if (status === 'Lost') {
        reasonCtrl?.setValidators([Validators.required]);
      } else {
        reasonCtrl?.clearValidators();
        reasonCtrl?.setValue('');
      }
      reasonCtrl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.leadForm.valid) {
      if (!this.submissionGuard.start('lead-create')) {
        return;
      }

      const formValue = this.leadForm.value;
      const assignedEmp = this.employees.find(e => e.id === formValue.assignedEmployee);
      
      const formattedLead = {
        ...formValue,
        trialDate: this.formatDate(formValue.trialDate),
        followUpDate: this.formatDate(formValue.followUpDate),
        nextFollowUp: this.formatDate(formValue.followUpDate),
        lastFollowUp: formValue.lastFollowUp ? this.formatDate(formValue.lastFollowUp) : '',
        assignedStaff: assignedEmp ? assignedEmp.fullName : '',
        assignedEmployeeName: assignedEmp ? assignedEmp.fullName : '',
        leadOwner: assignedEmp ? assignedEmp.id : '',
        assignedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        reasonLost: formValue.status === 'Lost' ? formValue.reasonLost : ''
      };

      this.leadState.addLead(formattedLead).subscribe({
        next: () => {
          this.submissionGuard.end('lead-create');
          this.snackBar.open('New lead registered successfully!', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
          this.router.navigate(['/leads']);
        },
        error: (err) => {
          this.submissionGuard.end('lead-create');
          this.snackBar.open(err.message || 'Failed to register lead', 'Dismiss', {
            duration: 3000
          });
        }
      });
    }
  }

  get selectedMembershipPlan(): MembershipPlan | undefined {
    const planName = this.leadForm?.get('preferredPlan')?.value;
    return this.plans.find(p => p.name === planName);
  }

  get selectedPTPlan(): PTPlan | undefined {
    if (this.leadForm?.get('interestedInPT')?.value !== 'Yes') return undefined;
    const ptId = this.leadForm?.get('ptPlanId')?.value;
    return this.ptPlans.find(p => p.id === ptId);
  }

  get pricingBreakdown() {
    const memPlan = this.selectedMembershipPlan;
    const ptPlan = this.selectedPTPlan;

    const memBase = memPlan ? memPlan.price : 0;
    const memTaxRate = memPlan ? memPlan.tax : 0;
    const memGST = memBase * (memTaxRate / 100);
    const memTotal = memBase + memGST;

    const ptBase = ptPlan ? ptPlan.price : 0;
    const ptTaxRate = ptPlan ? ptPlan.tax : 0;
    const ptGST = ptBase * (ptTaxRate / 100);
    const ptTotal = ptBase + ptGST;

    return {
      membershipBase: memBase,
      membershipGST: memGST,
      membershipTotal: memTotal,
      ptBase: ptBase,
      ptGST: ptGST,
      ptTotal: ptTotal,
      totalBase: memBase + ptBase,
      totalGST: memGST + ptGST,
      grandTotal: memTotal + ptTotal
    };
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
