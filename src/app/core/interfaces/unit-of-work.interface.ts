import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IUnitOfWork {
  begin(): void;
  commit(): Observable<void>;
  rollback(): void;
}

export const UNIT_OF_WORK_TOKEN = new InjectionToken<IUnitOfWork>('UNIT_OF_WORK_TOKEN');
