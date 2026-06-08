import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {
  private activeGymIdSubject = new BehaviorSubject<string | null>(null);
  activeGymId$: Observable<string | null> = this.activeGymIdSubject.asObservable();

  setTenantId(gymId: string | null): void {
    this.activeGymIdSubject.next(gymId);
  }

  getTenantId(): string | null {
    return this.activeGymIdSubject.value;
  }
}
