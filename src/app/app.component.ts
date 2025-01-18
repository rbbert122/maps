import { Component } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';

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
    {
      name: 'Sign In',
      link: '/sign-in',
    },
  ];

  activeTab = this.tabs[0].link;

  constructor(private router: Router) {
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
}
