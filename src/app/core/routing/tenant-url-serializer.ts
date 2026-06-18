import { DefaultUrlSerializer, UrlTree } from '@angular/router';
import { Injectable, Injector } from '@angular/core';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class TenantUrlSerializer extends DefaultUrlSerializer {
  private activeTenantSlug: string | null = null;
  private reservedPaths = [
    'login', 'register', 'unauthorized', 'landing', 'profile', 
    'assets', 'settings', 'dashboard', 'members', 'leads', 
    'attendance', 'employees', 'payments', 'finance', 'plans', 
    'trainers', 'whatsapp', 'body-progress', 'tenant-not-found'
  ];

  constructor(private injector: Injector) {
    super();
  }

  private get tenantContext(): TenantContextService {
    return this.injector.get(TenantContextService);
  }

  private isReservedPath(segment: string): boolean {
    return this.reservedPaths.includes(segment.toLowerCase());
  }

  setTenantSlug(slug: string | null): void {
    this.activeTenantSlug = slug;
  }

  getTenantSlug(): string | null {
    return this.activeTenantSlug || this.tenantContext.getTenantId();
  }

  override parse(url: string): UrlTree {
    // Determine path-based tenant
    const path = url.startsWith('/') ? url : `/${url}`;
    const pathParts = path.split('/').filter(p => p.length > 0);
    
    if (pathParts.length > 0) {
      const firstSegment = pathParts[0].split('?')[0]; // strip query parameters
      
      // If it's a potential tenant slug (e.g. gym-a, gym-b) and not a reserved route
      if (!this.isReservedPath(firstSegment) && this.isValidSlug(firstSegment)) {
        this.activeTenantSlug = firstSegment;
        
        // Strip the tenant segment from the url so the router matches the base path
        const cleanedUrl = url.replace(`/${firstSegment}`, '') || '/';
        return super.parse(cleanedUrl);
      }
    }
    return super.parse(url);
  }

  override serialize(tree: UrlTree): string {
    const serialized = super.serialize(tree);
    const activeTenant = this.tenantContext.getTenantId() || this.activeTenantSlug;
    
    // If we have an active path-based tenant slug, prepend it to the serialized URL
    if (activeTenant && !this.isDomainBasedTenant()) {
      const path = serialized.startsWith('/') ? serialized : `/${serialized}`;
      const firstSegment = path.split('/')[1]?.split('?')[0];
      
      // Do not prepend if the path starts with a reserved route or already has the tenant slug
      if (firstSegment && !this.isReservedPath(firstSegment) && firstSegment !== activeTenant) {
        return `/${activeTenant}${path}`;
      } else if (!firstSegment || firstSegment === '') {
        return `/${activeTenant}`;
      }
    }
    return serialized;
  }

  private isValidSlug(segment: string): boolean {
    // A tenant slug is alphanumeric and optionally contains hyphens (e.g., gym-a, apexfit)
    return /^[a-zA-Z0-9-]+$/.test(segment);
  }

  private isDomainBasedTenant(): boolean {
    // If the hostname indicates a domain-based tenant, we don't need path-based prefixing
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check if it's a Firebase hosting domain (e.g. my-app.web.app or my-app.firebaseapp.com)
    const isFirebaseHosting = 
      (parts.length >= 3 && parts[parts.length - 2] === 'web' && parts[parts.length - 1] === 'app') ||
      (parts.length >= 3 && parts[parts.length - 2] === 'firebaseapp' && parts[parts.length - 1] === 'com');

    if (isFirebaseHosting) {
      return parts.length > 3;
    }

    // Ignore localhost, www, and apexfit.com base domain
    if (parts.length > 2) {
      const subdomain = parts[0];
      return subdomain !== 'www' && subdomain !== 'apexfit';
    }
    
    // E.g., gym-a.localhost
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0] !== 'www';
    }
    
    return false;
  }
}

