const request = require('supertest');
const cheerio = require('cheerio');
const formatDate = require('date-fns/format');
const startOfYesterday = require('date-fns/start_of_yesterday');
const startOfTomorrow = require('date-fns/start_of_tomorrow');

const { setupBasicApp, retrieveCsurfData } = require('../test-helpers');
const createAdminRouter = require('../../server/routes/admin');
const constants = require('../../server/constants/app');

const successService = {
  keyVaultService: {
    listUsers: sinon.stub().returns([
      {
        accountType: constants.ADMIN_ACCOUNT,
        username: 'foo-admin',
        expires: startOfTomorrow(),
        expiresPretty: formatDate(startOfTomorrow(), 'MM/DD/YYYY'),
      },
      {
        accountType: constants.USER_ACCOUNT,
        username: 'foo-user',
        expires: startOfYesterday(),
        expiresPretty: formatDate(startOfYesterday(), 'MM/DD/YYYY'),
      },
    ]),
    createUser: sinon.stub().returns(true),
  },
};

const errorService = {
  keyVaultService: {
    createUser: sinon.stub().rejects('some error'),
  },
};

describe('/admin', () => {
  it('redirects to the route path when the logged in user is not an admin', () => {
    const router = createAdminRouter(successService);
    const app = setupBasicApp();

    app.use('/admin', router);

    return request(app)
      .get('/admin')
      .expect(302)
      .then((response) => {
        expect(response.headers.location).to.equal('/');
      });
  });

  describe('/', () => {
    it('displays a list of users', () => {
      const router = createAdminRouter(successService);
      const app = setupBasicApp({ accountType: constants.ADMIN_ACCOUNT });

      app.use(router);

      return request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          const $ = cheerio.load(response.text);
          expect($('h1.heading-large').text()).to.equal('Dashboard');
          expect($('table > tbody > tr').length).to.equal(2);
          expect($('table > tbody > tr').text()).to.include('foo-admin');
          expect($('table > tbody > tr').text()).to.include('foo-user');
        });
    });

    it('displays some basic stats about users', () => {
      const router = createAdminRouter(successService);
      const app = setupBasicApp({ accountType: constants.ADMIN_ACCOUNT });

      app.use(router);

      return request(app)
        .get('/')
        .then((response) => {
          const $ = cheerio.load(response.text);

          expect($('#total-users-count').text()).to.equal('2');
          expect($('#admin-count').text()).to.equal('1');
          expect($('#users-count').text()).to.equal('1');
          expect($('#expired-count').text()).to.equal('1');
        });
    });
  });

  describe('/add-user', () => {
    describe('#GET', () => {
      it('displays a randomly generated password in the password input', () => {
        const router = createAdminRouter(successService);
        const app = setupBasicApp({ accountType: constants.ADMIN_ACCOUNT });

        app.use(router);

        return request(app)
          .get('/add-user')
          .expect('Content-Type', /text\/html/)
          .expect(200)
          .then((response) => {
            const $ = cheerio.load(response.text);
            const chars16Long = /^[\w]{0,16}$/;
            const autoGenPassword = $('input#password').val();

            expect($('h1.heading-large').text()).to.equal('Add user');
            expect($(autoGenPassword)).to.match(chars16Long);
            expect($('input[name="password"]').val()).to.equal(autoGenPassword);
          });
      });
    });

    describe('#POST', () => {
      let cookies;
      let token;
      const securePassword = 'bFvS966G0IQHpPya';
      function recordCSRF(response) {
        ({ cookies, token } = retrieveCsurfData(response));
      }
      describe('when a valid form is submitted', () => {
        let app;
        before(() => {
          app = setupBasicApp({ accountType: constants.ADMIN_ACCOUNT });

          app.use(createAdminRouter(successService));

          return request(app)
            .get('/add-user')
            .then(recordCSRF);
        });

        it('add a new user', () => request(app)
          .post('/add-user')
          .type('form')
          .set('Cookie', cookies)
          .send({
            _csrf: token,
            accountType: constants.ADMIN_ACCOUNT,
            username: 'foo-user',
            password: securePassword,
          })
          .expect(200)
          .then((response) => {
            const { createUser } = successService.keyVaultService;
            expect(createUser.lastCall.args[0])
              .to.eql({
                accountType: constants.ADMIN_ACCOUNT,
                username: 'foo-user',
                password: securePassword,
              });

            const $ = cheerio.load(response.text);

            expect($('.govuk-box-highlight').text()).to.include('User was successfully added');
            expect($('.govuk-box-highlight').text()).to.include('foo-user');
            expect($('.govuk-box-highlight').text()).to.include(securePassword);
          }));
      });

      describe('when something goes wrong with the service', () => {
        let app;
        before(() => {
          app = setupBasicApp({ accountType: constants.ADMIN_ACCOUNT });

          app.use(createAdminRouter(errorService));

          return request(app)
            .get('/add-user')
            .then(recordCSRF);
        });

        it('notifies the user with an error', () => request(app)
          .post('/add-user')
          .type('form')
          .set('Cookie', cookies)
          .send({
            _csrf: token,
            accountType: constants.ADMIN_ACCOUNT,
            username: 'foo-user',
            password: securePassword,
          })
          .expect(400)
          .then((response) => {
            expect(response.text).to.include('class="error-summary"');
          }));
      });
    });
  });
});
