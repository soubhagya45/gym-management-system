import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ILeadRepository, LEAD_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Lead } from '../core/models/lead.entity';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  constructor(
    @Inject(LEAD_REPOSITORY_TOKEN) private leadRepository: ILeadRepository
  ) {}

  getLeads(gymId: string): Observable<Lead[]> {
    return this.leadRepository.getLeads(gymId);
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    return this.leadRepository.addLead(gymId, lead);
  }

  updateLead(gymId: string, lead: Lead): Observable<void> {
    return this.leadRepository.updateLead(gymId, lead);
  }

  deleteLead(gymId: string, id: string): Observable<void> {
    return this.leadRepository.deleteLead(gymId, id);
  }
}
