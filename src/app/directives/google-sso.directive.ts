import { Directive, HostListener } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { GoogleAuthProvider } from '@firebase/auth';

@Directive({
  selector: '[appGoogleSso]',
})
export class GoogleSsoDirective {
  constructor(private angularFireAuth: AngularFireAuth) {}
  @HostListener('click')
  async onClick() {
    const creds = await this.angularFireAuth.signInWithPopup(
      new GoogleAuthProvider()
    );
    const uid = creds.user?.uid;
    if (uid) {
      localStorage.setItem('uid', uid);
      console.log('Saved uid to local storage');
    }
  }
}
