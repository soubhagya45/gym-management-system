import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  constructor(private tenantContext: TenantContextService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = req.headers;
    
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      headers = headers
        .set('X-Tenant-ID', gymId)
        .set('gymId', gymId)
        .set('X-Gym-Id', gymId);
    }

    const branchId = this.tenantContext.getBranchId();
    if (branchId) {
      headers = headers.set('X-Branch-ID', branchId);
    }

    const subscription = this.tenantContext.getSubscription();
    if (subscription) {
      headers = headers.set('X-Subscription-Plan', subscription);
    }

    const modifiedReq = req.clone({ headers });
    return next.handle(modifiedReq);
  }
}
