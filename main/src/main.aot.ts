/**
 * Main Angular file for AOT compilation
 *
 * Created by Ilya Lagoshny (ilya@lagoshny.ru)
 *
 * Date: 09.11.2017 23:13
 */
import { platformBrowser } from '@angular/platform-browser';
import { AppModuleNgFactory } from './app/app.module.ngfactory';

import { enableProdMode } from '@angular/core';

enableProdMode();

platformBrowser()
    .bootstrapModuleFactory(AppModuleNgFactory);
