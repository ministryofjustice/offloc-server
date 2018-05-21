const request = require('supertest');

const { setupBasicApp } = require('../test-helpers');
const {
  authenticationMiddleWare,
  passwordExpiredMiddleWare,
} = require('../../server/middleware/authentication');

const simpleRoute = (req, res) => {
  res.sendStatus(200);
};

describe('AuthenticationMiddleware', () => {
  describe('authentication using an auth service', () => {
    it('successfully authenticates a user when validation passes', () => {
      const authService = {
        validateUser: sinon.stub().resolves({
          ok: true,
          data: { expires: 'Mon May 21 2100 13:08:20 GMT+0100 (BST)' },
        }),
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
          expect(authService.validateUser.calledWith('the-username', 'the-password'))
            .to.equal(true);
        });
    });

    it('force a user to reset their password when password is expired', () => {
      const authService = {
        validateUser: sinon.stub().resolves({
          ok: true,
          data: { expires: 'Mon May 1 1980 13:08:20 GMT+0100 (BST)' },
        }),
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
});
