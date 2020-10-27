import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { enableProdMode } from '@angular/core';
import * as environment from '../../configs/evironment';

if (environment.isProduction()) enableProdMode();

platformBrowserDynamic()
    .bootstrapModule(AppModule);
