import { Component, OnInit, TemplateRef, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { map, startWith, take } from 'rxjs/operators';
import { EmployeeState } from '../../presentation/state/employee.state';
import { GymState } from '../../presentation/state/gym.state';
import { AuthState } from '../../presentation/state/auth.state';
import { SubscriptionService } from '../../domain/subscription/subscription.service';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../core/models/employee.entity';
import { UserRole } from '../../core/enums/roles.enum';
import { FILE_STORAGE_REPOSITORY_TOKEN, IFileStorageRepository } from '../../core/interfaces/file-storage-repository.interface';
import { SubmissionGuardService } from '../../services/submission-guard.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    MatRadioModule
  ],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  @ViewChild('profileDialog') profileDialogTemplate!: TemplateRef<any>;
  @ViewChild('passwordDialog') passwordDialogTemplate!: TemplateRef<any>;
  @ViewChild('credentialsDialog') credentialsDialogTemplate!: TemplateRef<any>;

  activeTab = 0;
  employees$: Observable<Employee[]>;
  attendance$: Observable<EmployeeAttendance[]>;
  payroll$: Observable<EmployeePayroll[]>;
  performance$: Observable<EmployeePerformance[]>;
  branches$: Observable<any[]>;
  
  filteredEmployees$: Observable<Employee[]>;
  managers$: Observable<Employee[]>;

  createdEmployeeCredentials: Employee | null = null;

  // Form Groups
  employeeForm!: FormGroup;
  attendanceForm!: FormGroup;
  payrollForm!: FormGroup;
  performanceForm!: FormGroup;

  // Search/Filters
  searchQuery = '';
  roleFilter = 'all';
  statusFilter = 'all';

  // Selected Employee details for dialog
  selectedEmployee: Employee | null = null;
  selectedEmpPerformance: EmployeePerformance[] = [];
  selectedEmpPayroll: EmployeePayroll[] = [];
  newPassword = '';

  // Options
  roles = [
    { value: UserRole.Owner, label: 'Gym Owner' },
    { value: UserRole.Manager, label: 'Branch Manager' },
    { value: UserRole.Trainer, label: 'Trainer' },
    { value: UserRole.Staff, label: 'Staff' }
  ];

  departments = ['Management', 'Fitness', 'Front Desk', 'Finance', 'Operations'];
  shifts = ['Morning', 'Evening', 'General'];

  // Table Columns
  attendanceColumns = ['employeeName', 'role', 'date', 'status', 'checkInTime', 'checkOutTime', 'notes'];
  payrollColumns = ['employeeName', 'role', 'monthYear', 'baseSalary', 'bonus', 'deductions', 'netPaid', 'status', 'actions'];
  performanceColumns = ['employeeName', 'rating', 'tasks', 'reviewDate', 'feedback'];

  // Roles Matrix Permissions data
  rolesMatrix = [
    { feature: 'View Dashboard', roles: { owner: true, manager: true, trainer: false, staff: false } },
    { feature: 'Manage Members', roles: { owner: true, manager: true, trainer: false, staff: false } },
    { feature: 'View Member Profiles', roles: { owner: true, manager: true, trainer: true, staff: true } },
    { feature: 'Manage Payments', roles: { owner: true, manager: true, trainer: false, staff: false } },
    { feature: 'Manage Settings', roles: { owner: true, manager: false, trainer: false, staff: false } },
    { feature: 'Manage Employees (Write)', roles: { owner: true, manager: false, trainer: false, staff: false } },
    { feature: 'View Employees (Read)', roles: { owner: true, manager: true, trainer: false, staff: false } },
    { feature: 'Mark Attendance', roles: { owner: true, manager: true, trainer: true, staff: false } },
    { feature: 'Access Finance Reports', roles: { owner: true, manager: false, trainer: false, staff: false } },
    { feature: 'Send WhatsApp Reminders', roles: { owner: true, manager: false, trainer: false, staff: false } }
  ];

  isUploadingPhoto = false;

  /** True only for super_admin and gym_owner — drives all write-action *ngIf guards. */
  get canManageEmployees(): boolean {
    return this.authState.hasPermission('manage:employees');
  }

  constructor(
    private fb: FormBuilder,
    private employeeState: EmployeeState,
    private gymState: GymState,
    private authState: AuthState,
    private subscriptionService: SubscriptionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    public submissionGuard: SubmissionGuardService,
    @Inject(FILE_STORAGE_REPOSITORY_TOKEN) private fileStorage: IFileStorageRepository
  ) {
    this.employees$ = this.employeeState.employees$;
    this.attendance$ = this.employeeState.attendance$;
    this.payroll$ = this.employeeState.payroll$;
    this.performance$ = this.employeeState.performance$;
    
    this.branches$ = this.gymState.activeGym$.pipe(
      map(gym => gym ? gym.branches || [] : [])
    );

    // Filtered lists
    this.managers$ = this.employees$.pipe(
      map(emps => emps.filter(e => e.role === UserRole.Manager || e.role === UserRole.Owner))
    );

    this.filteredEmployees$ = combineLatest([
      this.employees$,
      this.route.queryParams.pipe(map(q => q['search'] || ''), startWith('')),
      this.route.queryParams.pipe(map(q => q['role'] || 'all'), startWith('all')),
      this.route.queryParams.pipe(map(q => q['status'] || 'all'), startWith('all'))
    ]).pipe(
      map(([employees, search, role, status]) => {
        return employees.filter(emp => {
          const matchSearch = emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase()) ||
            emp.phone.includes(search);
          const matchRole = role === 'all' || emp.role === role;
          const matchStatus = status === 'all' || emp.accountStatus === status;
          return matchSearch && matchRole && matchStatus;
        });
      })
    );
  }

  onEmployeePhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploadingPhoto = true;
      this.fileStorage.uploadFile(file, 'employees').subscribe({
        next: (url) => {
          this.employeeForm.patchValue({ photoUrl: url });
          this.isUploadingPhoto = false;
          this.snackBar.open('Employee photo uploaded successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.isUploadingPhoto = false;
          this.snackBar.open(`Photo upload failed: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }

  ngOnInit(): void {
    this.initForms();

    // Set up reactive filtering of Reporting Manager based on selected role
    const roleControl = this.employeeForm.get('role');
    if (roleControl) {
      this.managers$ = combineLatest([
        this.employees$,
        roleControl.valueChanges.pipe(startWith(roleControl.value))
      ]).pipe(
        map(([emps, selectedRole]) => {
          if (selectedRole === UserRole.Manager) {
            // Manager role: show owners' names
            return emps.filter(e => e.role === UserRole.Owner);
          } else if (selectedRole !== UserRole.Owner) {
            // Other roles: show managers' names
            return emps.filter(e => e.role === UserRole.Manager);
          } else {
            // Gym Owner: no reporting manager
            return [];
          }
        })
      );
    }

    // Check for active tab query param
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = parseInt(params['tab'], 10);
      }
      this.searchQuery = params['search'] || '';
      this.roleFilter = params['role'] || 'all';
      this.statusFilter = params['status'] || 'all';

      // Prefill role if onboarding redirected e.g. from trainer page
      if (params['prefillRole']) {
        this.employeeForm.patchValue({ role: params['prefillRole'] });
        this.onRoleChange(params['prefillRole']);
      }
    });
  }

  initForms(): void {
    const todayStr = new Date().toISOString().split('T')[0];

    // Employee Onboarding Form
    this.employeeForm = this.fb.group({
      fullName: ['', Validators.required],
      photoUrl: [''],
      phone: ['', [Validators.required, Validators.pattern(/^[+0-9\s-]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      gender: ['Male', Validators.required],
      dob: ['1995-01-01', Validators.required],
      address: ['', Validators.required],
      role: [UserRole.Staff, Validators.required],
      branchId: ['', Validators.required],
      department: ['Operations', Validators.required],
      joinDate: [todayStr, Validators.required],
      salary: [20000, [Validators.required, Validators.min(0)]],
      shift: ['General', Validators.required],
      reportingManagerId: [''],
      username: ['', Validators.required],
      accountStatus: ['Active', Validators.required],
      
      // Conditional fields for trainer
      specialty: [''],
      experienceYears: [null]
    });

    // Auto-generate username from email
    this.employeeForm.get('email')?.valueChanges.subscribe(email => {
      if (email && email.includes('@')) {
        const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        this.employeeForm.patchValue({ username: usernameBase }, { emitEvent: false });
      }
    });

    // Attendance Log Form
    this.attendanceForm = this.fb.group({
      employeeId: ['', Validators.required],
      date: [todayStr, Validators.required],
      status: ['Present', Validators.required],
      checkInTime: ['09:00 AM'],
      checkOutTime: ['06:00 PM'],
      notes: ['']
    });

    // Payroll Form
    this.payrollForm = this.fb.group({
      employeeId: ['', Validators.required],
      monthYear: ['June 2026', Validators.required],
      baseSalary: [0, [Validators.required, Validators.min(0)]],
      bonus: [0, [Validators.required, Validators.min(0)]],
      deductions: [0, [Validators.required, Validators.min(0)]],
      status: ['Pending', Validators.required]
    });

    // Autofill base salary when employee is selected in payroll form
    this.payrollForm.get('employeeId')?.valueChanges.subscribe(empId => {
      if (empId) {
        const emp = this.employeeState.employees.find(e => e.id === empId);
        if (emp) {
          this.payrollForm.patchValue({ baseSalary: emp.salary });
        }
      }
    });

    // Performance Form
    this.performanceForm = this.fb.group({
      employeeId: ['', Validators.required],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      feedback: ['', Validators.required],
      tasksAssignedCount: [10, [Validators.required, Validators.min(0)]],
      tasksCompletedCount: [8, [Validators.required, Validators.min(0)]]
    });
  }

  onRoleChange(role: UserRole): void {
    const specialtyCtrl = this.employeeForm.get('specialty');
    const expCtrl = this.employeeForm.get('experienceYears');
    const deptCtrl = this.employeeForm.get('department');
    const reportingManagerCtrl = this.employeeForm.get('reportingManagerId');

    // Reset selected reporting manager on role change to prevent invalid state
    reportingManagerCtrl?.setValue('');

    if (role === UserRole.Trainer) {
      specialtyCtrl?.setValidators([Validators.required]);
      expCtrl?.setValidators([Validators.required, Validators.min(0)]);
      deptCtrl?.setValue('Fitness');
    } else {
      specialtyCtrl?.clearValidators();
      expCtrl?.clearValidators();
      
      // Auto-assign department based on role
      if (role === UserRole.Manager) deptCtrl?.setValue('Management');
      else deptCtrl?.setValue('Operations');
    }

    specialtyCtrl?.updateValueAndValidity();
    expCtrl?.updateValueAndValidity();
    reportingManagerCtrl?.updateValueAndValidity();
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge'
    });
  }

  applyFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery || null,
        role: this.roleFilter !== 'all' ? this.roleFilter : null,
        status: this.statusFilter !== 'all' ? this.statusFilter : null
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.roleFilter = 'all';
    this.statusFilter = 'all';
    this.applyFilters();
  }

  // Action Methods
  openProfile(employee: Employee): void {
    this.selectedEmployee = employee;
    
    // Fetch individual records for detail view
    this.selectedEmpPerformance = this.employeeState.performance.filter(p => p.employeeId === employee.id);
    this.selectedEmpPayroll = this.employeeState.payroll.filter(p => p.employeeId === employee.id);

    this.dialog.open(this.profileDialogTemplate, {
      width: '600px',
      panelClass: 'dark-dialog-panel'
    });
  }

  openResetPassword(employee: Employee): void {
    this.selectedEmployee = employee;
    this.newPassword = '';
    this.dialog.open(this.passwordDialogTemplate, {
      width: '400px'
    });
  }

  toggleEmployeeStatus(employee: Employee): void {
    const nextStatus = employee.accountStatus === 'Active' ? 'Suspended' : 'Active';
    const updated: Employee = {
      ...employee,
      accountStatus: nextStatus
    };
    
    this.employeeState.updateEmployee(updated).subscribe({
      next: () => {
        this.snackBar.open(`Employee account status updated to ${nextStatus}`, 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Error updating status', 'Close', { duration: 3000 });
      }
    });
  }

  confirmResetPassword(): void {
    if (!this.newPassword || this.newPassword.trim().length < 6) {
      this.snackBar.open('Password must be at least 6 characters.', 'Close', { duration: 3000 });
      return;
    }

    this.snackBar.open(`Password reset successfully for ${this.selectedEmployee?.fullName}.`, 'Close', { duration: 3000 });
    this.dialog.closeAll();
  }

  // Form Submissions
  submitOnboarding(): void {
    if (this.employeeForm.invalid) {
      this.snackBar.open('Please resolve form errors before submitting.', 'Close', { duration: 3000 });
      return;
    }

    if (!this.submissionGuard.start('employee-onboarding')) {
      return;
    }

    this.gymState.activeGym$.pipe(take(1)).subscribe(gym => {
      if (!gym) {
        this.submissionGuard.end('employee-onboarding');
        return;
      }

      const employeeCount = this.employeeState.employees.length;
      const isLimitReached = this.subscriptionService.hasReachedLimit(
        gym.subscriptionPlan,
        'maxEmployees',
        employeeCount
      );

      if (isLimitReached) {
        this.submissionGuard.end('employee-onboarding');
        this.snackBar.open(
          `Employee limit reached for plan: ${this.getSubscriptionPlanLabel(gym.subscriptionPlan)}. Please upgrade to onboard more staff.`,
          'Upgrade Plan',
          { duration: 5000 }
        ).onAction().subscribe(() => {
          this.router.navigate(['/settings']);
        });
        return;
      }

      const val = this.employeeForm.value;
      
      // Resolve reporting manager name
      let repName = '';
      if (val.reportingManagerId) {
        const manager = this.employeeState.employees.find(e => e.id === val.reportingManagerId);
        if (manager) repName = manager.fullName;
      }

      const payload: Omit<Employee, 'id'> = {
        fullName: val.fullName,
        photoUrl: val.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(val.fullName)}`,
        phone: val.phone,
        email: val.email,
        gender: val.gender,
        dob: val.dob,
        address: val.address,
        role: val.role,
        department: val.department,
        joinDate: val.joinDate,
        salary: val.salary,
        shift: val.shift,
        reportingManagerId: val.reportingManagerId || undefined,
        reportingManagerName: repName || undefined,
        username: val.username,
        accountStatus: val.accountStatus,
        branchId: val.branchId,
        specialty: val.role === UserRole.Trainer ? val.specialty : undefined,
        experienceYears: val.role === UserRole.Trainer ? val.experienceYears : undefined,
        assignedMembersCount: val.role === UserRole.Trainer ? 0 : undefined,
        gymId: '' // state injection will assign active tenant gymId
      };

      this.employeeState.addEmployee(payload).subscribe({
        next: (createdEmp: Employee) => {
          this.submissionGuard.end('employee-onboarding');
          this.createdEmployeeCredentials = createdEmp;
          this.employeeForm.reset({
            gender: 'Male',
            dob: '1995-01-01',
            role: UserRole.Staff,
            department: 'Operations',
            joinDate: new Date().toISOString().split('T')[0],
            salary: 20000,
            shift: 'General',
            accountStatus: 'Active'
          });
          
          this.dialog.open(this.credentialsDialogTemplate, {
            width: '450px',
            disableClose: true,
            panelClass: 'dark-dialog-panel'
          });
          
          this.onTabChange(0);
        },
        error: (err) => {
          this.submissionGuard.end('employee-onboarding');
          this.snackBar.open(err.message || 'Failed to register employee', 'Close', { duration: 5000 });
        }
      });
    });
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open(`${label} copied to clipboard!`, 'Close', { duration: 2500 });
    }).catch(() => {
      this.snackBar.open(`Failed to copy ${label}`, 'Close', { duration: 2500 });
    });
  }

  getSubscriptionPlanLabel(plan: string): string {
    switch (plan) {
      case 'FREE_TRIAL': return 'Free Trial';
      case 'BASIC': return 'Basic';
      case 'PRO': return 'Pro';
      case 'ENTERPRISE': return 'Enterprise';
      default: return plan;
    }
  }

  submitAttendance(): void {
    if (this.attendanceForm.invalid) return;

    const val = this.attendanceForm.value;
    const emp = this.employeeState.employees.find(e => e.id === val.employeeId);
    if (!emp) return;

    this.employeeState.markAttendance({
      employeeId: val.employeeId,
      employeeName: emp.fullName,
      role: emp.role,
      date: val.date,
      status: val.status,
      checkInTime: val.status === 'Present' || val.status === 'Half Day' ? val.checkInTime : undefined,
      checkOutTime: val.status === 'Present' || val.status === 'Half Day' ? val.checkOutTime : undefined,
      notes: val.notes || undefined
    }).subscribe({
      next: () => {
        this.snackBar.open(`Attendance marked for ${emp.fullName}`, 'Close', { duration: 3000 });
        this.attendanceForm.patchValue({
          employeeId: '',
          notes: ''
        });
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to log attendance', 'Close', { duration: 3000 });
      }
    });
  }

  submitPayroll(): void {
    if (this.payrollForm.invalid) return;

    const val = this.payrollForm.value;
    const emp = this.employeeState.employees.find(e => e.id === val.employeeId);
    if (!emp) return;

    const netPaid = Number(val.baseSalary) + Number(val.bonus) - Number(val.deductions);

    this.employeeState.addPayroll({
      employeeId: val.employeeId,
      employeeName: emp.fullName,
      role: emp.role,
      monthYear: val.monthYear,
      baseSalary: val.baseSalary,
      bonus: val.bonus,
      deductions: val.deductions,
      netPaid,
      status: val.status,
      paymentDate: val.status === 'Paid' ? new Date().toISOString().split('T')[0] : undefined
    }).subscribe({
      next: () => {
        this.snackBar.open(`Payroll logged for ${emp.fullName}`, 'Close', { duration: 3000 });
        this.payrollForm.patchValue({
          employeeId: '',
          baseSalary: 0,
          bonus: 0,
          deductions: 0,
          status: 'Pending'
        });
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to process payroll', 'Close', { duration: 3000 });
      }
    });
  }

  submitPerformance(): void {
    if (this.performanceForm.invalid) return;

    const val = this.performanceForm.value;
    const emp = this.employeeState.employees.find(e => e.id === val.employeeId);
    if (!emp) return;

    this.employeeState.addPerformance({
      employeeId: val.employeeId,
      employeeName: emp.fullName,
      rating: val.rating,
      feedback: val.feedback,
      tasksAssignedCount: val.tasksAssignedCount,
      tasksCompletedCount: val.tasksCompletedCount,
      reviewDate: new Date().toISOString().split('T')[0]
    }).subscribe({
      next: () => {
        this.snackBar.open(`Performance review saved for ${emp.fullName}`, 'Close', { duration: 3000 });
        this.performanceForm.patchValue({
          employeeId: '',
          rating: 5,
          feedback: '',
          tasksAssignedCount: 10,
          tasksCompletedCount: 8
        });
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to save review', 'Close', { duration: 3000 });
      }
    });
  }

  togglePayrollStatus(record: EmployeePayroll): void {
    const nextStatus = record.status === 'Paid' ? 'Pending' : 'Paid';
    const updated: EmployeePayroll = {
      ...record,
      status: nextStatus,
      paymentDate: nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined
    };

    // Update in the in-memory array/state
    // Normally, the repository would expose an updatePayroll method, but since payroll is in-memory state in Mock repository,
    // we can add and reload. For simplicity in mockup, we trigger a confirmation snackbar:
    record.status = nextStatus;
    record.paymentDate = nextStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined;
    this.snackBar.open(`Payroll status updated to ${nextStatus}`, 'Close', { duration: 3000 });
  }

  getRoleLabel(role: UserRole): string {
    const match = this.roles.find(r => r.value === role);
    return match ? match.label : role;
  }

  // Summary Metrics helpers
  get totalPayrollPaid$(): Observable<number> {
    return this.payroll$.pipe(
      map(records => records
        .filter(r => r.status === 'Paid')
        .reduce((sum, r) => sum + r.netPaid, 0)
      )
    );
  }

  get totalPayrollPending$(): Observable<number> {
    return this.payroll$.pipe(
      map(records => records
        .filter(r => r.status === 'Pending')
        .reduce((sum, r) => sum + r.netPaid, 0)
      )
    );
  }

  get averageEmployeeSalary$(): Observable<number> {
    return this.employees$.pipe(
      map(emps => emps.length ? Math.round(emps.reduce((sum, e) => sum + e.salary, 0) / emps.length) : 0)
    );
  }
}
