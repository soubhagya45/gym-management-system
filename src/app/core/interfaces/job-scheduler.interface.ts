import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IBackgroundJobProvider {
  /** Queue and start a new background job. Returns the job ID. */
  schedule(jobName: string, cronExpr: string, payload: any): Observable<string>;
  /** Cancel a running or paused job. */
  cancel(jobId: string): Observable<void>;
  /** Pause a running job. */
  pause(jobId: string): void;
  /** Resume a paused job. */
  resume(jobId: string): void;
  /** Update progress counters for a running job. */
  updateProgress(jobId: string, processed: number, failed: number, duplicates: number, errorDetails?: string): void;
  /** Mark a job as failed with an error message. */
  markFailed(jobId: string, errorMsg: string): void;
  /** Retrieve the current snapshot of a job by ID. Returns undefined if not found. */
  getJob(jobId: string): any;
}


export const BACKGROUND_JOB_PROVIDER_TOKEN = new InjectionToken<IBackgroundJobProvider>('BACKGROUND_JOB_PROVIDER_TOKEN');
