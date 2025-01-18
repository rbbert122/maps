import { Component } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface ITab {
  name: string;
  link: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'maps';

  tabs: ITab[] = [
    {
      name: 'Home',
      link: '/home',
    },
    {
      name: 'Map',
      link: '/map',
    },
  ];

  activeTab = this.tabs[0].link;

  constructor(private router: Router, public angularFireAuth: AngularFireAuth) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        console.log(event);
      }
    });
  }

  // See app.component.html
  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
  }

  logOut() {
    this.angularFireAuth.signOut();
  }
}
