import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IBackgroundJobProvider } from '../core/interfaces/job-scheduler.interface';

export interface BackgroundJob {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  payload: any;
  progress: {
    total: number;
    processed: number;
    failed: number;
    duplicates: number;
    percentage: number;
    speed: number; // rows per second
    eta: number; // in seconds
    startTime: number;
    elapsedTime: number; // in milliseconds
  };
  errorDetails?: string;
  historyReport?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ClientBackgroundJobProvider implements IBackgroundJobProvider {
  private jobsSubject = new BehaviorSubject<BackgroundJob[]>([]);
  jobs$ = this.jobsSubject.asObservable();

  schedule(jobName: string, cronExpr: string, payload: any): Observable<string> {
    const id = 'job_' + Math.random().toString(36).substring(2, 9);
    const newJob: BackgroundJob = {
      id,
      name: jobName,
      status: 'running',
      payload,
      progress: {
        total: payload?.totalRows || 0,
        processed: 0,
        failed: 0,
        duplicates: 0,
        percentage: 0,
        speed: 0,
        eta: 9999,
        startTime: Date.now(),
        elapsedTime: 0
      }
    };
    const current = this.jobsSubject.value;
    this.jobsSubject.next([...current, newJob]);
    return of(id).pipe(delay(100));
  }

  cancel(jobId: string): Observable<void> {
    const current = this.jobsSubject.value;
    const match = current.find(j => j.id === jobId);
    if (match) {
      match.status = 'cancelled';
      this.jobsSubject.next([...current]);
    }
    return of(undefined).pipe(delay(100));
  }

  pause(jobId: string): void {
    const current = this.jobsSubject.value;
    const match = current.find(j => j.id === jobId);
    if (match && match.status === 'running') {
      match.status = 'paused';
      this.jobsSubject.next([...current]);
    }
  }

  resume(jobId: string): void {
    const current = this.jobsSubject.value;
    const match = current.find(j => j.id === jobId);
    if (match && match.status === 'paused') {
      match.status = 'running';
      match.progress.startTime = Date.now() - match.progress.elapsedTime; // adjust start time
      this.jobsSubject.next([...current]);
    }
  }

  updateProgress(jobId: string, processed: number, failed: number, duplicates: number, errorDetails?: string): void {
    const current = this.jobsSubject.value;
    const match = current.find(j => j.id === jobId);
    if (match) {
      const now = Date.now();
      const elapsed = now - match.progress.startTime;
      match.progress.processed = processed;
      match.progress.failed = failed;
      match.progress.duplicates = duplicates;
      match.progress.elapsedTime = elapsed;
      
      const total = match.progress.total;
      const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
      match.progress.percentage = pct;

      // Speed: rows per second
      const speed = elapsed > 0 ? (processed / (elapsed / 1000)) : 0;
      match.progress.speed = parseFloat(speed.toFixed(1));

      // ETA: remaining rows / speed
      const remaining = total - processed;
      match.progress.eta = speed > 0 ? Math.ceil(remaining / speed) : 0;

      if (errorDetails) {
        match.errorDetails = errorDetails;
      }

      if (processed >= total && match.status === 'running') {
        match.status = 'completed';
      }

      this.jobsSubject.next([...current]);
    }
  }

  markFailed(jobId: string, errorMsg: string): void {
    const current = this.jobsSubject.value;
    const match = current.find(j => j.id === jobId);
    if (match) {
      match.status = 'failed';
      match.errorDetails = errorMsg;
      this.jobsSubject.next([...current]);
    }
  }

  getJob(jobId: string): BackgroundJob | undefined {
    return this.jobsSubject.value.find(j => j.id === jobId);
  }
}
