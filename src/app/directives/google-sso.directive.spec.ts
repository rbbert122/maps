import { GoogleSsoDirective } from './google-sso.directive';

describe('GoogleSsoDirective', () => {
  it('should create an instance', () => {
    const angularFireAuth = jasmine.createSpyObj('AngularFireAuth', [
      'authState',
    ]);
    const directive = new GoogleSsoDirective(angularFireAuth);
    expect(directive).toBeTruthy();
  });
});
