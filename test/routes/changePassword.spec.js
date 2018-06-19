const request = require('supertest');
const cheerio = require('cheerio');

const { setupBasicApp, retrieveCsurfData } = require('../test-helpers');
const createChangePasswordRouter = require('../../server/routes/changePassword');
const passwordValidationService = require('../../server/services/passwordValidation');
const constants = require('../../server/constants/app');

const successService = {
  keyVaultService: {
    updatePassword: sinon.stub().resolves({ ok: true, errors: [] }),
  },
  passwordValidationService,
};

const passwordErrorService = {
  keyVaultService: {
    updatePassword: sinon.stub().resolves({ ok: true, errors: [] }),
  },
  passwordValidationService,
};

const updateUserPasswordErrorService = {
  keyVaultService: {
    updatePassword: sinon.stub().resolves({
      ok: false, errors: [{ type: 'foo', value: 'foo-error' }],
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
      ({ cookies, token } = retrieveCsurfData(response));
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
            const { updatePassword } = successService.keyVaultService;
            expect(updatePassword.lastCall.args[0])
              .to.eql({
                username: 'foo',
                accountType: constants.USER_ACCOUNT,
                currentPassword: 'foobar',
                newPassword: securePassword,
              });
            expect(response.header.location)
              .to.equal('/change-password/confirmation');
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
          .expect(400)
          .then((response) => {
            expect(response.text).to.include('class="error-summary"');
          });
      });
    });
  });
});
