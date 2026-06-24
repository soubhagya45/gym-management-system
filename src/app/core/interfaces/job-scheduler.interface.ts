import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IBackgroundJobProvider {
  schedule(jobName: string, cronExpr: string, payload: any): Observable<string>;
  cancel(jobId: string): Observable<void>;
}

export const BACKGROUND_JOB_PROVIDER_TOKEN = new InjectionToken<IBackgroundJobProvider>('BACKGROUND_JOB_PROVIDER_TOKEN');
