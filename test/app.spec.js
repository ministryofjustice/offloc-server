const request = require('supertest');

const startOfTomorrow = require('date-fns/start_of_tomorrow');
const startOfYesterday = require('date-fns/start_of_yesterday');

const config = require('../server/config');
const createApp = require('../server/app');

describe('app', () => {
  // TODO: stub less? maybe use nock?
  const storageService = {};
  const appInfo = {
    getBuildInfo: sinon.stub(),
  };
  const keyVaultService = {
    getUser: sinon.stub().resolves({
      password: 'passwordhash',
      disabled: false,
      expires: startOfTomorrow(),
      validFrom: startOfYesterday(),
    }),
    validatePassword: sinon.stub().resolves(true),
  };
  const passwordValidationService = {};

  config.dev = false;

  const app = createApp({
    storageService,
    appInfo,
    keyVaultService,
    passwordValidationService,
  });

  const req = request(app);

  it('returns 401 with no auth', () =>
    req
      .get('/')
      .expect(401));

  it('lets you in with auth', () =>
    req
      .get('/')
      .auth('user', 'thecorrectpassword')
      .expect(200));

  it('allows access to /health with no auth', () =>
    req
      .get('/health')
      .expect(200));

  it('sets secure CSRF stuff', () =>
    req
      .get('/change-password')
      .set('X-Forwarded-Proto', 'https')
      .auth('user', 'thecorrectpassword')
      .expect(200)
      .expect((res) => {
        const csrfCookie = res.headers['set-cookie'][0];
        expect(csrfCookie)
          .to.contain('_csrf')
          .and.to.contain('Secure')
          .and.to.contain('HttpOnly');
      }));

  it('denies POST requests without CSRF stuff', () =>
    req
      .post('/change-password')
      .auth('user', 'thecorrectpassword')
      .expect(403)
      .expect((res) => {
        expect(res.text).to.contain('invalid csrf token');
      }));

  it('hides the stack trace on error pages');
});
