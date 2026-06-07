import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Member, Attendance, Payment, MembershipPlan, Trainer, ActivityLog } from '../interfaces/gym.model';

@Injectable({
  providedIn: 'root'
})
export class GymService {
  // 1. Initial Mock Data
  private initialPlans: MembershipPlan[] = [
    {
      id: 'plan-1',
      name: 'Essential Monthly',
      durationMonths: 1,
      price: 49,
      description: 'Access to standard gym facilities, weights, and cardio area.',
      features: ['Full gym access', '1 Fitness assessment', 'Locker room access'],
      activeMembersCount: 15
    },
    {
      id: 'plan-2',
      name: 'Premium Quarterly',
      durationMonths: 3,
      price: 129,
      description: 'Full access with trainer guidance, group classes, and sauna.',
      features: ['All Essential features', '10 Group fitness classes', 'Sauna & Steam room access', '2 Personal trainer sessions'],
      activeMembersCount: 24
    },
    {
      id: 'plan-3',
      name: 'Elite Annual Platinum',
      durationMonths: 12,
      price: 399,
      description: 'VIP access with unlimited classes, private trainer, nutrition plans.',
      features: ['24/7 Gym access', 'Unlimited group classes', 'Sauna, Steam & Ice bath', 'Monthly customized meal plans', '1 Private session weekly', 'Complimentary supplement kit'],
      activeMembersCount: 8
    }
  ];

  private initialTrainers: Trainer[] = [
    {
      id: 'trainer-1',
      name: 'Marcus Vance',
      specialty: 'Strength & Conditioning',
      rating: 4.9,
      membersCount: 14,
      avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150',
      status: 'active',
      email: 'marcus.v@apexfit.com',
      phone: '+1 (555) 382-9012'
    },
    {
      id: 'trainer-2',
      name: 'Serena Sterling',
      specialty: 'Yoga & Functional Mobility',
      rating: 4.8,
      membersCount: 18,
      avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=150',
      status: 'active',
      email: 'serena.s@apexfit.com',
      phone: '+1 (555) 723-4455'
    },
    {
      id: 'trainer-3',
      name: 'Alex Rivera',
      specialty: 'High Intensity Interval Training (HIIT)',
      rating: 4.7,
      membersCount: 12,
      avatarUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150',
      status: 'active',
      email: 'alex.r@apexfit.com',
      phone: '+1 (555) 901-2244'
    },
    {
      id: 'trainer-4',
      name: 'David Kove',
      specialty: 'Bodybuilding & Powerlifting',
      rating: 4.9,
      membersCount: 9,
      avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=150',
      status: 'on leave',
      email: 'david.k@apexfit.com',
      phone: '+1 (555) 124-7733'
    }
  ];

  private initialMembers: Member[] = [
    {
      id: 'mem-1',
      name: 'Jonathan Miller',
      email: 'jon.miller@gmail.com',
      phone: '+1 (555) 438-9011',
      status: 'active',
      planId: 'plan-2',
      planName: 'Premium Quarterly',
      startDate: '2026-04-10',
      endDate: '2026-07-10',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      attendanceCount: 18,
      balance: 0,
      gender: 'Male',
      age: 28,
      height: 182,
      weight: 79,
      fitnessGoal: 'Muscle Gain'
    },
    {
      id: 'mem-2',
      name: 'Sophia Chen',
      email: 'sophia.c@yahoo.com',
      phone: '+1 (555) 890-4322',
      status: 'active',
      planId: 'plan-3',
      planName: 'Elite Annual Platinum',
      startDate: '2026-01-15',
      endDate: '2027-01-15',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      attendanceCount: 42,
      balance: 0,
      gender: 'Female',
      age: 25,
      height: 165,
      weight: 58,
      fitnessGoal: 'Cardio Fitness'
    },
    {
      id: 'mem-3',
      name: 'Liam Neeson',
      email: 'liam.n@outlook.com',
      phone: '+1 (555) 123-9876',
      status: 'expiring',
      planId: 'plan-1',
      planName: 'Essential Monthly',
      startDate: '2026-05-08',
      endDate: '2026-06-08',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      attendanceCount: 11,
      balance: 49,
      gender: 'Male',
      age: 45,
      height: 193,
      weight: 88,
      fitnessGoal: 'Strength Training'
    },
    {
      id: 'mem-4',
      name: 'Olivia Martinez',
      email: 'olivia.m@gmail.com',
      phone: '+1 (555) 234-5678',
      status: 'active',
      planId: 'plan-2',
      planName: 'Premium Quarterly',
      startDate: '2026-05-01',
      endDate: '2026-08-01',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      attendanceCount: 8,
      balance: 0,
      gender: 'Female',
      age: 31,
      height: 168,
      weight: 62,
      fitnessGoal: 'Weight Loss'
    },
    {
      id: 'mem-5',
      name: 'Ethan Hunt',
      email: 'ethan.h@imf.org',
      phone: '+1 (555) 777-8888',
      status: 'inactive',
      planId: 'plan-1',
      planName: 'Essential Monthly',
      startDate: '2026-02-10',
      endDate: '2026-03-10',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      attendanceCount: 4,
      balance: 0,
      gender: 'Male',
      age: 38,
      height: 178,
      weight: 75,
      fitnessGoal: 'General Fitness'
    },
    {
      id: 'mem-6',
      name: 'Emma Watson',
      email: 'emma.w@academy.edu',
      phone: '+1 (555) 999-0000',
      status: 'active',
      planId: 'plan-3',
      planName: 'Elite Annual Platinum',
      startDate: '2026-03-20',
      endDate: '2027-03-20',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      attendanceCount: 29,
      balance: 0,
      gender: 'Female',
      age: 29,
      height: 165,
      weight: 54,
      fitnessGoal: 'Flexibility & Mobility'
    },
    {
      id: 'mem-7',
      name: 'Ryan Gosling',
      email: 'ryan.g@drive.net',
      phone: '+1 (555) 444-5555',
      status: 'expiring',
      planId: 'plan-2',
      planName: 'Premium Quarterly',
      startDate: '2026-03-10',
      endDate: '2026-06-10',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      attendanceCount: 22,
      balance: 129,
      gender: 'Male',
      age: 34,
      height: 184,
      weight: 82,
      fitnessGoal: 'Muscle Gain'
    }
  ];

  private initialPayments: Payment[] = [
    { id: 'pay-1', memberId: 'mem-2', memberName: 'Sophia Chen', amount: 399, date: '2026-01-15', status: 'paid', planName: 'Elite Annual Platinum' },
    { id: 'pay-2', memberId: 'mem-1', memberName: 'Jonathan Miller', amount: 129, date: '2026-04-10', status: 'paid', planName: 'Premium Quarterly' },
    { id: 'pay-3', memberId: 'mem-4', memberName: 'Olivia Martinez', amount: 129, date: '2026-05-01', status: 'paid', planName: 'Premium Quarterly' },
    { id: 'pay-4', memberId: 'mem-6', memberName: 'Emma Watson', amount: 399, date: '2026-03-20', status: 'paid', planName: 'Elite Annual Platinum' },
    { id: 'pay-5', memberId: 'mem-3', memberName: 'Liam Neeson', amount: 49, date: '2026-05-08', status: 'pending', planName: 'Essential Monthly' },
    { id: 'pay-6', memberId: 'mem-7', memberName: 'Ryan Gosling', amount: 129, date: '2026-03-10', status: 'overdue', planName: 'Premium Quarterly' },
    // Historical payments
    { id: 'pay-h1', memberId: 'mem-1', memberName: 'Jonathan Miller', amount: 129, date: '2026-01-10', status: 'paid', planName: 'Premium Quarterly' },
    { id: 'pay-h2', memberId: 'mem-2', memberName: 'Sophia Chen', amount: 399, date: '2025-01-15', status: 'paid', planName: 'Elite Annual Platinum' },
    { id: 'pay-h3', memberId: 'mem-3', memberName: 'Liam Neeson', amount: 49, date: '2026-04-08', status: 'paid', planName: 'Essential Monthly' },
    { id: 'pay-h4', memberId: 'mem-5', memberName: 'Ethan Hunt', amount: 49, date: '2026-02-10', status: 'paid', planName: 'Essential Monthly' },
    { id: 'pay-h5', memberId: 'mem-6', memberName: 'Emma Watson', amount: 399, date: '2025-03-20', status: 'paid', planName: 'Elite Annual Platinum' },
    { id: 'pay-h6', memberId: 'mem-7', memberName: 'Ryan Gosling', amount: 129, date: '2025-12-10', status: 'paid', planName: 'Premium Quarterly' }
  ];

  private initialAttendance: Attendance[] = [
    { id: 'att-1', memberId: 'mem-1', memberName: 'Jonathan Miller', date: '2026-06-04', timeIn: '08:15 AM', status: 'present' },
    { id: 'att-2', memberId: 'mem-2', memberName: 'Sophia Chen', date: '2026-06-04', timeIn: '07:30 AM', status: 'present' },
    { id: 'att-3', memberId: 'mem-4', memberName: 'Olivia Martinez', date: '2026-06-04', timeIn: '09:45 AM', status: 'present' },
    { id: 'att-4', memberId: 'mem-6', memberName: 'Emma Watson', date: '2026-06-04', timeIn: '06:05 AM', status: 'present' },
    { id: 'att-5', memberId: 'mem-3', memberName: 'Liam Neeson', date: '2026-06-04', timeIn: '', status: 'absent' },
    { id: 'att-6', memberId: 'mem-7', memberName: 'Ryan Gosling', date: '2026-06-04', timeIn: '10:00 AM', status: 'present' },
    // Historical attendance records
    { id: 'att-h1', memberId: 'mem-1', memberName: 'Jonathan Miller', date: '2026-06-03', timeIn: '08:00 AM', status: 'present' },
    { id: 'att-h2', memberId: 'mem-1', memberName: 'Jonathan Miller', date: '2026-06-02', timeIn: '08:10 AM', status: 'present' },
    { id: 'att-h3', memberId: 'mem-1', memberName: 'Jonathan Miller', date: '2026-06-01', timeIn: '08:05 AM', status: 'present' },
    { id: 'att-h4', memberId: 'mem-1', memberName: 'Jonathan Miller', date: '2026-05-31', timeIn: '', status: 'absent' },
    { id: 'att-h5', memberId: 'mem-2', memberName: 'Sophia Chen', date: '2026-06-03', timeIn: '07:45 AM', status: 'present' },
    { id: 'att-h6', memberId: 'mem-2', memberName: 'Sophia Chen', date: '2026-06-02', timeIn: '07:30 AM', status: 'present' },
    { id: 'att-h7', memberId: 'mem-2', memberName: 'Sophia Chen', date: '2026-06-01', timeIn: '07:25 AM', status: 'present' },
    { id: 'att-h8', memberId: 'mem-3', memberName: 'Liam Neeson', date: '2026-06-03', timeIn: '06:30 PM', status: 'present' },
    { id: 'att-h9', memberId: 'mem-3', memberName: 'Liam Neeson', date: '2026-06-02', timeIn: '06:15 PM', status: 'present' },
    { id: 'att-h10', memberId: 'mem-4', memberName: 'Olivia Martinez', date: '2026-06-03', timeIn: '10:00 AM', status: 'present' },
    { id: 'att-h11', memberId: 'mem-4', memberName: 'Olivia Martinez', date: '2026-06-02', timeIn: '09:30 AM', status: 'present' },
    { id: 'att-h12', memberId: 'mem-6', memberName: 'Emma Watson', date: '2026-06-03', timeIn: '06:10 AM', status: 'present' },
    { id: 'att-h13', memberId: 'mem-6', memberName: 'Emma Watson', date: '2026-06-02', timeIn: '06:00 AM', status: 'present' },
    { id: 'att-h14', memberId: 'mem-7', memberName: 'Ryan Gosling', date: '2026-06-03', timeIn: '10:15 AM', status: 'present' },
    { id: 'att-h15', memberId: 'mem-7', memberName: 'Ryan Gosling', date: '2026-06-02', timeIn: '10:05 AM', status: 'present' }
  ];

  private initialLogs: ActivityLog[] = [
    { id: 'log-1', text: 'Sophia Chen checked in today at 07:30 AM', time: '1 hour ago', type: 'attendance' },
    { id: 'log-2', text: 'Recorded payment of $399 from Emma Watson', time: '3 hours ago', type: 'payment' },
    { id: 'log-3', text: 'Olivia Martinez joined Apex Fit on Premium Quarterly Plan', time: '1 day ago', type: 'join' },
    { id: 'log-4', text: 'Jonathan Miller updated status to active', time: '2 days ago', type: 'plan-change' }
  ];

  // 2. RxJS Subjects to expose reactive state
  private membersSubject = new BehaviorSubject<Member[]>(this.initialMembers);
  private plansSubject = new BehaviorSubject<MembershipPlan[]>(this.initialPlans);
  private trainersSubject = new BehaviorSubject<Trainer[]>(this.initialTrainers);
  private paymentsSubject = new BehaviorSubject<Payment[]>(this.initialPayments);
  private attendanceSubject = new BehaviorSubject<Attendance[]>(this.initialAttendance);
  private logsSubject = new BehaviorSubject<ActivityLog[]>(this.initialLogs);

  // 3. Exposed Observables
  members$ = this.membersSubject.asObservable();
  plans$ = this.plansSubject.asObservable();
  trainers$ = this.trainersSubject.asObservable();
  payments$ = this.paymentsSubject.asObservable();
  attendance$ = this.attendanceSubject.asObservable();
  logs$ = this.logsSubject.asObservable();

  constructor() {}

  // --- Member Actions ---
  addMember(member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): void {
    const newMember: Member = {
      ...member,
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      attendanceCount: 0,
      balance: member.status === 'inactive' ? 0 : this.getPlanPrice(member.planId)
    };

    const currentMembers = this.membersSubject.value;
    this.membersSubject.next([newMember, ...currentMembers]);
    
    // Add activity log
    this.addLog(`New member ${newMember.name} joined Apex Fit!`, 'join');

    // Also insert a payment if status isn't inactive
    if (newMember.status !== 'inactive') {
      this.addPayment({
        memberId: newMember.id,
        memberName: newMember.name,
        amount: newMember.balance,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        planName: newMember.planName
      });
    }

    // Adjust plans counter
    this.updatePlanCounts();
  }

  updateMember(updatedMember: Member): void {
    const currentMembers = this.membersSubject.value;
    const index = currentMembers.findIndex(m => m.id === updatedMember.id);
    if (index !== -1) {
      const updated = [...currentMembers];
      updated[index] = updatedMember;
      this.membersSubject.next(updated);
      this.addLog(`Updated profile details for member: ${updatedMember.name}`, 'plan-change');
      this.updatePlanCounts();
    }
  }

  deleteMember(id: string): void {
    const currentMembers = this.membersSubject.value;
    const memberToDelete = currentMembers.find(m => m.id === id);
    if (memberToDelete) {
      this.membersSubject.next(currentMembers.filter(m => m.id !== id));
      this.addLog(`Deleted member profile: ${memberToDelete.name}`, 'plan-change');
      this.updatePlanCounts();
    }
  }

  // --- Plan Actions ---
  addPlan(plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): void {
    const newPlan: MembershipPlan = {
      ...plan,
      id: 'plan-' + Math.random().toString(36).substring(2, 9),
      activeMembersCount: 0
    };
    const current = this.plansSubject.value;
    this.plansSubject.next([...current, newPlan]);
    this.addLog(`Created new membership plan: ${newPlan.name}`, 'plan-change');
  }

  updatePlan(updatedPlan: MembershipPlan): void {
    const current = this.plansSubject.value;
    const index = current.findIndex(p => p.id === updatedPlan.id);
    if (index !== -1) {
      const updated = [...current];
      updated[index] = updatedPlan;
      this.plansSubject.next(updated);
      this.addLog(`Updated details for membership plan: ${updatedPlan.name}`, 'plan-change');
    }
  }

  deletePlan(id: string): void {
    const current = this.plansSubject.value;
    const planToDelete = current.find(p => p.id === id);
    if (planToDelete) {
      this.plansSubject.next(current.filter(p => p.id !== id));
      this.addLog(`Deleted membership plan: ${planToDelete.name}`, 'plan-change');
    }
  }

  // --- Trainer Actions ---
  addTrainer(trainer: Omit<Trainer, 'id' | 'membersCount'>): void {
    const newTrainer: Trainer = {
      ...trainer,
      id: 'trainer-' + Math.random().toString(36).substring(2, 9),
      membersCount: 0
    };
    const current = this.trainersSubject.value;
    this.trainersSubject.next([...current, newTrainer]);
    this.addLog(`Registered trainer: ${newTrainer.name}`, 'plan-change');
  }

  updateTrainer(updatedTrainer: Trainer): void {
    const current = this.trainersSubject.value;
    const index = current.findIndex(t => t.id === updatedTrainer.id);
    if (index !== -1) {
      const updated = [...current];
      updated[index] = updatedTrainer;
      this.trainersSubject.next(updated);
      this.addLog(`Updated details for trainer: ${updatedTrainer.name}`, 'plan-change');
    }
  }

  deleteTrainer(id: string): void {
    const current = this.trainersSubject.value;
    const trainer = current.find(t => t.id === id);
    if (trainer) {
      this.trainersSubject.next(current.filter(t => t.id !== id));
      this.addLog(`Removed trainer profile: ${trainer.name}`, 'plan-change');
    }
  }

  // --- Attendance Actions ---
  markAttendance(memberId: string, status: 'present' | 'absent'): void {
    const todayStr = new Date().toISOString().split('T')[0];
    const current = this.attendanceSubject.value;
    const existingIndex = current.findIndex(a => a.memberId === memberId && a.date === todayStr);

    let updated = [...current];
    const memberName = this.membersSubject.value.find(m => m.id === memberId)?.name || 'Unknown Member';

    if (existingIndex !== -1) {
      if (status === 'absent') {
        // Toggle/remove checkin or change to absent
        updated[existingIndex].status = 'absent';
        updated[existingIndex].timeIn = '';
        this.addLog(`${memberName} marked absent today`, 'attendance');
      } else {
        updated[existingIndex].status = 'present';
        updated[existingIndex].timeIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.addLog(`${memberName} checked in today at ${updated[existingIndex].timeIn}`, 'attendance');
      }
    } else {
      const timeIn = status === 'present' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const newAttendance: Attendance = {
        id: 'att-' + Math.random().toString(36).substring(2, 9),
        memberId,
        memberName,
        date: todayStr,
        timeIn,
        status
      };
      updated = [newAttendance, ...updated];
      this.addLog(`${memberName} checked in today at ${timeIn}`, 'attendance');

      // Increment attendance counter in Member
      if (status === 'present') {
        const members = [...this.membersSubject.value];
        const mIdx = members.findIndex(m => m.id === memberId);
        if (mIdx !== -1) {
          members[mIdx].attendanceCount += 1;
          this.membersSubject.next(members);
        }
      }
    }
    
    this.attendanceSubject.next(updated);
  }

  // --- Payment Actions ---
  addPayment(payment: Omit<Payment, 'id'>): void {
    const newPayment: Payment = {
      ...payment,
      id: 'pay-' + Math.random().toString(36).substring(2, 9)
    };
    
    const current = this.paymentsSubject.value;
    this.paymentsSubject.next([newPayment, ...current]);

    if (payment.status === 'paid') {
      this.addLog(`Recorded payment of $${payment.amount} from ${payment.memberName}`, 'payment');
      
      // Update member balance to 0 if paid
      const members = [...this.membersSubject.value];
      const mIdx = members.findIndex(m => m.id === payment.memberId);
      if (mIdx !== -1) {
        members[mIdx].balance = 0;
        this.membersSubject.next(members);
      }
    }
  }

  confirmPayment(paymentId: string): void {
    const current = this.paymentsSubject.value;
    const idx = current.findIndex(p => p.id === paymentId);
    if (idx !== -1) {
      const updated = [...current];
      updated[idx].status = 'paid';
      updated[idx].date = new Date().toISOString().split('T')[0];
      this.paymentsSubject.next(updated);

      this.addLog(`Confirmed pending payment of $${updated[idx].amount} from ${updated[idx].memberName}`, 'payment');

      // Set member balance to 0
      const members = [...this.membersSubject.value];
      const mIdx = members.findIndex(m => m.id === updated[idx].memberId);
      if (mIdx !== -1) {
        members[mIdx].balance = 0;
        this.membersSubject.next(members);
      }
    }
  }

  // --- Utility Actions ---
  private addLog(text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): void {
    const newLog: ActivityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      text,
      time: 'Just now',
      type
    };
    this.logsSubject.next([newLog, ...this.logsSubject.value.slice(0, 19)]); // Keep last 20 logs
  }

  private getPlanPrice(planId: string): number {
    return this.plansSubject.value.find(p => p.id === planId)?.price || 0;
  }

  private updatePlanCounts(): void {
    const members = this.membersSubject.value;
    const plans = [...this.plansSubject.value];

    plans.forEach(p => {
      p.activeMembersCount = members.filter(m => m.planId === p.id && m.status === 'active').length;
    });

    this.plansSubject.next(plans);
  }
}
