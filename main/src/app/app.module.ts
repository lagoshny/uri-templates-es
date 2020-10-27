import {
    LOCALE_ID,
    NgModule
} from '@angular/core';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import {
    HttpClientModule
} from '@angular/common/http';

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule
    ],
    declarations: [
        AppComponent
    ],
    providers: [
        {
            provide: LOCALE_ID,
            useValue: 'ru-RU'
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {

}
