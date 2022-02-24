const request = require('supertest');
const startOfTomorrow = require('date-fns/start_of_tomorrow');
const startOfYesterday = require('date-fns/start_of_yesterday');
const addMinutes = require('date-fns/add_minutes');
const formatDate = require('date-fns/format');

const { setupBasicApp } = require('../test-helpers');
const {
  authenticationMiddleWare,
  passwordExpiredMiddleWare,
  logout,
} = require('../../server/middleware/authentication');

const simpleRoute = (req, res) => {
  res.sendStatus(200);
};

describe('AuthenticationMiddleware', () => {
  describe('authentication using an auth service', () => {
    it('successfully authenticates a user when validation passes', () => {
      const authService = {
        getUser: sinon.stub().resolves({
          password: 'the-password',
          disabled: false,
          expires: startOfTomorrow(),
          validFrom: startOfYesterday(),
        }),
        validatePassword: sinon.stub().returns(true),
      };
      const app = setupBasicApp();
      app.get(
        '/',
        authenticationMiddleWare(authService),
        passwordExpiredMiddleWare,
        simpleRoute,
      );

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(200)
        .then(() => {
          expect(authService.getUser.calledWith('the-username'))
            .to.equal(true);

          expect(authService.validatePassword.calledWith('the-password'))
            .to.equal(true);
        });
    });

    it('force a user to reset their password when password is expired', () => {
      const authService = {
        getUser: sinon.stub().resolves({
          password: 'the-password',
          disabled: false,
          expires: startOfYesterday(),
          validFrom: startOfYesterday(),
        }),
        validatePassword: sinon.stub().returns(true),
      };
      const app = setupBasicApp();
      app.get(
        '/',
        authenticationMiddleWare(authService),
        passwordExpiredMiddleWare,
        simpleRoute,
      );

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('expired');
        });
    });

    it('returns 401 when authentication fails', () => {
      const authService = {
        validateUser: sinon.stub().resolves({ ok: false, data: null }),
        getUser: sinon.stub().rejects({
          password: 'the-password',
          disabled: false,
          expires: startOfYesterday(),
          validFrom: startOfYesterday(),
        }),
        validatePassword: sinon.stub().returns(false),
      };
      const app = setupBasicApp();

      app.get(
        '/',
        authenticationMiddleWare(authService),
        passwordExpiredMiddleWare,
        simpleRoute,
      );

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(401);
    });
  });

  it('returns a 403 when a disabled user logs in', () => {
    const authService = {
      getUser: sinon.stub().resolves({
        password: 'the-password',
        disabled: true,
        expires: startOfTomorrow(),
        validFrom: startOfYesterday(),
      }),
      validatePassword: sinon.stub().returns(true),
    };
    const app = setupBasicApp();

    app.get(
      '/',
      authenticationMiddleWare(authService),
      passwordExpiredMiddleWare,
      simpleRoute,
    );

    return request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(403);
  });

  it('returns a 403 after 3 failed login attempts for an existing account', async () => {
    const validFrom = addMinutes(Date.now(), 5);
    const prettyValidFrom = formatDate(validFrom, 'MM/DD/YYYY HH:mm:ss');
    const authService = {
      getUser: sinon.stub().resolves({
        password: 'the-password',
        disabled: false,
        expires: startOfTomorrow(),
        validFrom: startOfYesterday(),
      }),
      validatePassword: sinon.stub().returns(false),
      temporarilyLockUser: sinon.stub().resolves({ validFrom }),
    };
    const app = setupBasicApp();

    app.get(
      '/',
      authenticationMiddleWare(authService),
      passwordExpiredMiddleWare,
      simpleRoute,
    );

    // Make requests
    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(401);

    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(401);

    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(403)
      .then((response) => {
        expect(response.text).to.include('This account has been temporarily locked');
        expect(response.text).to.include(prettyValidFrom);
      });
  });

  it('returns a 403 after 3 failed login attempts with a non existent account', async () => {
    const authService = {
      getUser: sinon.stub().rejects({ status: 404 }),
      validatePassword: sinon.stub().returns(false),
      temporarilyLockUser: sinon.stub().rejects(null),
    };
    const app = setupBasicApp();

    app.get(
      '/',
      authenticationMiddleWare(authService),
      passwordExpiredMiddleWare,
      simpleRoute,
    );

    // Make requests
    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(401);

    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(401);

    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(403)
      .then((response) => {
        expect(response.text).to.include('Too many login attempts');
      });
  });

  it('returns a 403 after when the account is temporarily locked', async () => {
    const validFrom = addMinutes(Date.now(), 5);
    const prettyValidFrom = formatDate(validFrom, 'MM/DD/YYYY HH:mm:ss');
    const authService = {
      getUser: sinon.stub().resolves({
        password: 'the-password',
        disabled: false,
        expires: startOfTomorrow(),
        validFrom,
      }),
    };
    const app = setupBasicApp();

    app.get(
      '/',
      authenticationMiddleWare(authService),
      passwordExpiredMiddleWare,
      simpleRoute,
    );

    await request(app)
      .get('/')
      .auth('the-username', 'the-password')
      .expect(403)
      .then((response) => {
        expect(response.text).to.include('This account has been temporarily locked');
        expect(response.text).to.include(prettyValidFrom);
      });
  });

  describe('Logout', () => {
    it('returns a 401', async () => {
      const app = setupBasicApp();
      app.use('/logout', logout);

      await request(app)
        .get('/logout')
        .expect(401);
    });
  });
});
