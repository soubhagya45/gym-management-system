import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubmissionGuardService {
  private activeSubmissions = new Map<string, BehaviorSubject<boolean>>();

  isSubmitting(key: string): Observable<boolean> {
    return this.getOrCreateSubject(key).asObservable();
  }

  isSubmittingValue(key: string): boolean {
    return this.getOrCreateSubject(key).value;
  }

  start(key: string): boolean {
    const subject = this.getOrCreateSubject(key);
    if (subject.value) {
      return false; // Submission already in progress, reject duplicate click
    }
    subject.next(true);
    return true;
  }

  end(key: string): void {
    const subject = this.activeSubmissions.get(key);
    if (subject) {
      subject.next(false);
    }
  }

  private getOrCreateSubject(key: string): BehaviorSubject<boolean> {
    let subject = this.activeSubmissions.get(key);
    if (!subject) {
      subject = new BehaviorSubject<boolean>(false);
      this.activeSubmissions.set(key, subject);
    }
    return subject;
  }
}
