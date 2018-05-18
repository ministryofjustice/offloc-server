const request = require('supertest');

const { setupBasicApp } = require('../test-helpers');
const authenticationMiddleWare = require('../../server/middleware/authentication');

const simpleRoute = (req, res) => {
  res.sendStatus(200);
};

describe('AuthenticationMiddleware', () => {
  describe('authentication using an auth service', () => {
    it('successfully authenticates a user when validation passes', () => {
      const validateUserStub = sinon.stub().returns(true);
      const authService = {
        createKeyVaultService: sinon.stub().returns({
          validateUser: validateUserStub,
        }),
      };
      const app = setupBasicApp();
      app.get('/', authenticationMiddleWare(authService), simpleRoute);

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(200)
        .then(() => {
          expect(validateUserStub.calledWith('the-username', 'the-password')).to.equal(true);
        });
    });

    it('returns 401 when authentication fails', () => {
      const authService = {
        createKeyVaultService: sinon.stub().returns({
          validateUser: sinon.stub().returns(false),
        }),
      };
      const app = setupBasicApp();

      app.get('/', authenticationMiddleWare(authService), simpleRoute);

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(401);
    });
  });
});
