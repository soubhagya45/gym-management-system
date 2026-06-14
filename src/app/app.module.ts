import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { UrlSerializer } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Angular Material Imports for layout shell
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

// Clean Architecture Repository Providers
import { REPOSITORY_PROVIDERS } from './data/providers/repository.providers';

// Interceptor & Routing Imports
import { ApiInterceptor } from './core/interceptors/api.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { TenantInterceptor } from './core/interceptors/tenant.interceptor';
import { TenantUrlSerializer } from './core/routing/tenant-url-serializer';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  providers: [
    ...REPOSITORY_PROVIDERS,
    { provide: UrlSerializer, useClass: TenantUrlSerializer },
    { provide: HTTP_INTERCEPTORS, useClass: TenantInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

