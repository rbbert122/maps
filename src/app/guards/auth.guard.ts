import { inject } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = async (route, state) => {
  const angularFireAuth = inject(AngularFireAuth);
  const user = await angularFireAuth.currentUser;
  // coerce to boolean
  const isLoggedIn = !!user;
  if (!isLoggedIn) {
    window.alert('You need to be signed in to access this page');
  }
  return isLoggedIn;
};
