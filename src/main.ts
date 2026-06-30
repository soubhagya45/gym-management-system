import { environment } from './environments/environment';

if (!environment.production) {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = '88023436-5deb-41f4-98ca-1f36dabfffe7';
}

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
