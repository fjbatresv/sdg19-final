import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Avoid top-level await for compatibility with older targets. // NOSONAR
bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
});
