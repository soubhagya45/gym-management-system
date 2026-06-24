import { NgModule, APP_INITIALIZER } from '@angular/core';
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

// Firebase Auth initializer — gates Angular bootstrapping until the Firebase SDK
// has recovered the authenticated user token from IndexedDB, eliminating the
// permission-denied race condition on browser refresh.
import { FirebaseService } from './data/repositories/firebase/firebase.service';
import { AuthState } from './presentation/state/auth.state';
import { AppConfigService, ProviderType } from './core/config/app-config';

/**
 * APP_INITIALIZER factory.
 *
 * Returns a function that Angular calls before completing bootstrapping.
 * For the Firebase provider, it awaits the first `onAuthStateChanged` event
 * so that all Firestore queries made by state services are guaranteed to run
 * with a valid (or absent) auth token — never in an indeterminate state.
 *
 * For Mock / REST / Supabase providers it resolves immediately, making the
 * initializer completely transparent in those environments.
 */
export function initializeFirebaseApp(
  configService: AppConfigService,
  firebaseService: FirebaseService,
  authState: AuthState
): () => Promise<void> {
  return () => {
    if (configService.provider !== ProviderType.Firebase) {
      // Non-Firebase provider: nothing to await — resolve immediately.
      return Promise.resolve();
    }

    if (!firebaseService.isInitialized()) {
      // Firebase was not configured (missing API key etc.) — resolve and let the
      // rest of the app surface a configuration error naturally.
      return Promise.resolve();
    }

    return authState.waitForAuthResolution();
  };
}

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
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    // ── Firebase Auth race-condition fix ───────────────────────────────────────
    // Delays Angular bootstrapping until the Firebase SDK has resolved the initial
    // auth state from IndexedDB. This ensures all state-service Firestore queries
    // run with a valid JWT token and are never rejected with permission-denied.
    {
      provide: APP_INITIALIZER,
      useFactory: initializeFirebaseApp,
      deps: [AppConfigService, FirebaseService, AuthState],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
