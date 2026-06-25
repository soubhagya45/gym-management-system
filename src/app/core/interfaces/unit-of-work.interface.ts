import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IUnitOfWork {
  begin(): void;
  commit(): Observable<void>;
  rollback(): Observable<void>;
  /** Called when an unrecoverable error occurs during a unit of work. Triggers rollback and cleans state. */
  failure(error: Error): void;
  registerAddition(collectionName: string, id: string): void;
}


export const UNIT_OF_WORK_TOKEN = new InjectionToken<IUnitOfWork>('UNIT_OF_WORK_TOKEN');
