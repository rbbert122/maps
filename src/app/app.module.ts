import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { HomeComponent } from './pages/home/home.component';
import { MapComponent } from './pages/map/map.component';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { environment } from '../environments/environment';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { FirebaseService } from './services/firebase.service';

import { GoogleSsoDirective } from './directives/google-sso.directive';

@NgModule({
  declarations: [AppComponent, HomeComponent, MapComponent, GoogleSsoDirective],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    AngularFireModule.initializeApp(environment.firebase, 'maps'),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
  ],
  providers: [provideAnimationsAsync(), FirebaseService],
  bootstrap: [AppComponent],
})
export class AppModule {}
