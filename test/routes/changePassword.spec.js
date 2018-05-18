const request = require('supertest');
const cheerio = require('cheerio');

const { setupBasicApp } = require('../test-helpers');
const createChangePasswordRouter = require('../../server/routes/changePassword');
const passwordValidationService = require('../../server/services/passwordValidation');

const updateUserPasswordStub = sinon.stub().resolves({ ok: true, errors: [] });

const successService = {
  keyVaultService: {
    createKeyVaultService: sinon.stub().resolves({
      updateUserPassword: updateUserPasswordStub,
    }),
  },
  passwordValidationService,
};

const passwordErrorService = {
  keyVaultService: {
    createKeyVaultService: sinon.stub().resolves({
      updateUserPassword: updateUserPasswordStub,
    }),
  },
  passwordValidationService,
};

const updateUserPasswordErrorService = {
  keyVaultService: {
    createKeyVaultService: sinon.stub().resolves({
      updateUserPassword: sinon.stub().resolves({ ok: false, errors: [{ type: 'foo', value: 'foo-error' }] }),
    }),
  },
  passwordValidationService,
};

describe('/change-password', () => {
  describe('#GET', () => {
    it('responds with a 200', () => {
      const router = createChangePasswordRouter(successService);
      const app = setupBasicApp();

      app.use(router);

      return request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          const $ = cheerio.load(response.text);
          expect($('h1.heading-large').text()).to.eql('Change Password');
        });
    });
  });

  describe('#POST', () => {
    let cookies;
    let token;
    function recordCSRF(response) {
      cookies = response.headers['set-cookie'];
      const $ = cheerio.load(response.text);
      token = $('[name=_csrf]').val();
    }

    describe('when a valid form is submitted', () => {
      let app;
      before(() => {
        app = setupBasicApp();

        app.use('/change-password', createChangePasswordRouter(successService));

        return request(app)
          .get('/change-password')
          .then(recordCSRF);
      });

      it('updates the users password', () => {
        const securePassword = 'bFvS966G0IQHpPya';

        return request(app)
          .post('/change-password')
          .type('form')
          .set('Cookie', cookies)
          .send({
            _csrf: token,
            currentPassword: 'foobar',
            newPassword: securePassword,
            confirmPassword: securePassword,
          })
          .expect(302)
          .then((response) => {
            expect(updateUserPasswordStub.lastCall.args[0]).to.equal('foo');
            expect(updateUserPasswordStub.lastCall.args[1]).to.eql({ currentPassword: 'foobar', newPassword: securePassword });
            expect(response.header.location).to.equal('/change-password/confirmation');
          });
      });
    });

    describe('when an invalid new password is submitted', () => {
      let app;
      before(() => {
        app = setupBasicApp();

        app.use('/change-password', createChangePasswordRouter(passwordErrorService));

        return request(app)
          .get('/change-password')
          .then(recordCSRF);
      });

      it('notifies the user with an error', () => {
        const insecurePassword = '123456';

        return request(app)
          .post('/change-password')
          .type('form')
          .set('Cookie', cookies)
          .send({
            _csrf: token,
            currentPassword: 'foobar',
            newPassword: insecurePassword,
            confirmPassword: insecurePassword,
          })
          .expect(400)
          .then((response) => {
            expect(response.text).to.include('class="error-summary"');
          });
      });
    });

    describe('when the user current password is invalid', () => {
      let app;
      before(() => {
        app = setupBasicApp();

        app.use('/change-password', createChangePasswordRouter(updateUserPasswordErrorService));

        return request(app)
          .get('/change-password')
          .then(recordCSRF);
      });

      it('notifies the user with an error', () => {
        const securePassword = 'bFvS966G0IQHpPya';

        return request(app)
          .post('/change-password')
          .type('form')
          .set('Cookie', cookies)
          .send({
            _csrf: token,
            currentPassword: 'invalidPassword',
            newPassword: securePassword,
            confirmPassword: securePassword,
          })
          .expect(401)
          .then((response) => {
            expect(response.text).to.include('class="error-summary"');
          });
      });
    });
  });
});
