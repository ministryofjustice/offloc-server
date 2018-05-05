const request = require('supertest');
const express = require('express');

const authenticationMiddleWare = require('../../server/middleware/authentication');
const config = require('../../server/config');

const simpleRoute = (req, res) => {
  res.status(200).end();
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
      const app = express();
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
      const app = express();

      app.get('/', authenticationMiddleWare(authService), simpleRoute);

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(401);
    });
  });

  describe('When the skip authentication option active', () => {
    const { skipAuth } = config;

    before(() => {
      config.skipAuth = true;
    });

    after(() => {
      config.skipAuth = skipAuth;
    });

    it('successfully authenticates when username and password have length > 2 chars', () => {
      const authService = {
        createKeyVaultService: sinon.stub().returns({
          validateUser: sinon.stub().returns(true),
        }),
      };
      const app = express();

      app.get('/', authenticationMiddleWare(authService), simpleRoute);

      return request(app)
        .get('/')
        .auth('the-username', 'the-password')
        .expect(200)
        .then(() => {
          expect(authService.createKeyVaultService.callCount).to.equal(0);
        });
    });

    it('returns 401 when authentication fails', () => {
      const authService = {
        createKeyVaultService: sinon.stub().returns({
          validateUser: sinon.stub().returns(false),
        }),
      };
      const app = express();

      app.get('/', authenticationMiddleWare(authService), simpleRoute);

      return request(app)
        .get('/')
        .auth('th', 'th')
        .expect(401)
        .then(() => {
          expect(authService.createKeyVaultService.callCount).to.equal(0);
        });
    });
  });
});
