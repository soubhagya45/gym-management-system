import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IMemberRepository, MEMBER_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Member } from '../core/models/member.entity';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepository: IMemberRepository
  ) {}

  getMembers(gymId: string): Observable<Member[]> {
    return this.memberRepository.getMembers(gymId);
  }

  getMemberById(gymId: string, id: string): Observable<Member | null> {
    return this.memberRepository.getMemberById(gymId, id);
  }

  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> {
    return this.memberRepository.addMember(gymId, member);
  }

  updateMember(gymId: string, member: Member): Observable<void> {
    return this.memberRepository.updateMember(gymId, member);
  }

  deleteMember(gymId: string, id: string): Observable<void> {
    return this.memberRepository.deleteMember(gymId, id);
  }
}
