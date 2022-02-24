const bcrypt = require('bcrypt');
const formatDate = require('date-fns/format');
const startOfToday = require('date-fns/start_of_today');
const startOfTomorrow = require('date-fns/start_of_tomorrow');
const startOfYesterday = require('date-fns/start_of_yesterday');
const addMinutes = require('date-fns/add_minutes');

const createKeyVaultService = require('../../server/services/keyVault');
const config = require('../../server/config');
const constants = require('../../server/constants/app');

function generatePasswordHash(password) {
  // Fixed salt with low number of rounds so things go faster
  return bcrypt.hashSync(password, '$2b$04$Hh1KRFVlAxhbFCganFbgnu');
}

const defaultContentType = JSON.stringify({
  accountType: constants.ADMIN_ACCOUNT,
  disabled: false,
});
const userContentType = JSON.stringify({
  accountType: constants.USER_ACCOUNT,
  disabled: false,
});

describe('services/keyVault', () => {
  let client;
  let service;

  beforeEach(async () => {
    client = {
      getSecret: sinon.stub(),
      setSecret: sinon.stub(),
      getSecrets: sinon.stub(),
      getSecretsNext: sinon.stub(),
      deleteSecret: sinon.stub(),
      updateSecret: sinon.stub(),
    };
    service = await createKeyVaultService(client);
  });

  describe('.createUser', () => {
    let args;
    beforeEach(async () => {
      client.setSecret.resolves(true);

      await service.createUser({
        username: 'foo',
        password: 'foo-password',
        accountType: 'admin account',
      });

      ({ args } = client.setSecret.lastCall);
    });
    it('adds a new user to the azure key vault', () => {
      expect(client.setSecret.callCount).to.eql(1);
      expect(args[1]).to.equal('foo');
    });
    it('sets a hashed password', () => {
      expect(bcrypt.compareSync('foo-password', args[2])).to.equal(true);
    });
    it('sets expired password', () => {
      const expires = new Date(args[3].secretAttributes.expires);
      expect(+expires).to.be.closeTo(+new Date(), 20 * 1000);
    });

    it('sets the account type', () => {
      expect(args[3].contentType).to.equal(defaultContentType);
    });
  });

  describe('.getUser', () => {
    it('returns a user for a given user name', async () => {
      client.getSecret.resolves({
        value: 'some hashed password',
        contentType: defaultContentType,
        attributes: {
          notBefore: startOfYesterday(),
          expires: startOfTomorrow(),
        },
      });

      const result = await service.getUser('foo-user');

      expect(client.getSecret.lastCall.args[1]).to.equal('foo-user');

      expect(result).to.eql({
        password: 'some hashed password',
        accountType: constants.ADMIN_ACCOUNT,
        disabled: false,
        expires: startOfTomorrow(),
        validFrom: startOfYesterday(),
      });
    });
  });

  describe('.updatePassword', () => {
    describe('when valid', () => {
      let result;
      let args;
      beforeEach(async () => {
        config.passwordExpirationDuration = 90 * 24 * 3600 * 1000;
        client.getSecret.resolves({
          value: generatePasswordHash('foo-password'),
          contentType: defaultContentType,
          attributes: {
            expires: startOfTomorrow(),
          },
        });
        client.setSecret.resolves(true);

        result = await service.updatePassword({
          username: 'foo',
          currentPassword: 'foo-password',
          newPassword: 'new-password',
          accountType: 'admin account',
        });

        ({ args } = client.setSecret.lastCall);
      });
      it('returns ok', () => {
        expect(result.ok).to.equal(true);
        expect(result.errors.length).to.equal(0);
      });
      it('updates user', () => {
        expect(client.setSecret.callCount).to.eql(1);
        expect(args[1]).to.equal('foo');
      });
      it('sets new password hash', async () => {
        expect(bcrypt.compareSync('new-password', args[2])).to.equal(true);
      });

      it('sets the account type', () => {
        expect(args[3].contentType).to.eql(defaultContentType);
      });
      it('resets password expiry time', async () => {
        const expires = new Date(args[3].secretAttributes.expires);
        expect(+expires).to.be.closeTo(
          Number(new Date()) + config.passwordExpirationDuration,
          1000,
        );
      });
    });

    it('does not update the password when the user does not exist', async () => {
      client.getSecret.rejects({ status: 404 });
      client.setSecret.resolves(true);

      const result = await service.updatePassword({
        username: 'foo',
        currentPassword: 'foo-password',
        newPassword: 'new-password',
        accountType: 'admin account',
      });

      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.equal(1);

      expect(client.setSecret.callCount).to.equal(0);
    });

    it('does not update the password when the password is wrong', async () => {
      const hashedPassword = generatePasswordHash('other-password');
      client.getSecret.resolves({
        value: hashedPassword,
        contentType: defaultContentType,
        attributes: {
          expires: startOfTomorrow(),
        },
      });
      client.setSecret.resolves(true);

      const result = await service.updatePassword({
        username: 'foo',
        currentPassword: 'foo-password',
        newPassword: 'new-password',
        accountType: 'admin account',
      });

      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.equal(1);

      expect(client.setSecret.callCount).to.equal(0);
    });
  });

  describe('.listUsers', () => {
    it('returns a list of users', async () => {
      client.getSecrets.resolves([
        {
          id: 'http://vault.com/secrets/foo-user',
          contentType: defaultContentType,
          attributes: {
            expires: startOfToday(),
          },
        },
        {
          id: 'http://vault.com/secrets/bar-user',
          contentType: JSON.stringify({
            accountType: constants.USER_ACCOUNT,
            disabled: true,
          }),
          attributes: {
            expires: startOfToday(),
          },
        },
      ]);

      const result = await service.listUsers();
      expect(result).eql([
        {
          accountType: constants.ADMIN_ACCOUNT,
          username: 'foo-user',
          expires: startOfToday(),
          expiresPretty: formatDate(startOfToday(), 'DD/MM/YYYY'),
          disabled: false,
        },
        {
          accountType: constants.USER_ACCOUNT,
          username: 'bar-user',
          expires: startOfToday(),
          expiresPretty: formatDate(startOfToday(), 'DD/MM/YYYY'),
          disabled: true,
        },
      ]);
    });

    it('returns a list of users if it needs multiple api calls', async () => {
      const page1 = [
        {
          id: 'http://vault.com/secrets/foo-user',
          contentType: defaultContentType,
          attributes: {
            expires: startOfToday(),
          },
        },
        {
          id: 'http://vault.com/secrets/bar-user',
          contentType: userContentType,
          attributes: {
            expires: startOfToday(),
          },
        },
      ];
      page1.nextLink = 'next.page.url';

      client.getSecrets.resolves(page1);
      client.getSecretsNext.withArgs('next.page.url').resolves([
        {
          id: 'http://vault.com/secrets/baz-user',
          contentType: userContentType,
          attributes: {
            expires: startOfToday(),
          },
        },
      ]);

      const result = await service.listUsers();
      expect(result).eql([
        {
          accountType: constants.ADMIN_ACCOUNT,
          username: 'foo-user',
          expires: startOfToday(),
          expiresPretty: formatDate(startOfToday(), 'DD/MM/YYYY'),
          disabled: false,
        },
        {
          accountType: constants.USER_ACCOUNT,
          username: 'bar-user',
          expires: startOfToday(),
          expiresPretty: formatDate(startOfToday(), 'DD/MM/YYYY'),
          disabled: false,
        },
        {
          accountType: constants.USER_ACCOUNT,
          username: 'baz-user',
          expires: startOfToday(),
          expiresPretty: formatDate(startOfToday(), 'DD/MM/YYYY'),
          disabled: false,
        },
      ]);
    });
  });

  describe('.deleteUser', () => {
    it('removes a user form from the keyVault', async () => {
      client.deleteSecret.returns({
        id: 'https://service.vault.azure.net/secrets/test2/62e45c37593b400f8415db21a0a4557b',
        contentType: 'user account',
        attributes: { },
      });

      await service.deleteUser('foo-user');

      expect(client.deleteSecret.args[0][1]).to.equal('foo-user');
    });
  });

  describe('.disableUser', () => {
    it('disables a user', async () => {
      client.getSecret.returns({
        id: 'https://service.vault.azure.net/secrets/test2',
        contentType: defaultContentType,
        attributes: { },
      });

      const expectedContentType = {
        contentType: JSON.stringify({
          ...JSON.parse(defaultContentType),
          disabled: true,
        }),
      };

      await service.disableUser('foo-user');

      expect(client.updateSecret.lastCall.args[1]).to.equal('foo-user');
      expect(client.updateSecret.lastCall.args[3]).to.eql(expectedContentType);
    });
  });

  describe('.enableUser', () => {
    it('enables a user', async () => {
      client.getSecret.returns({
        id: 'https://service.vault.azure.net/secrets/test2',
        contentType: JSON.stringify({
          accountType: constants.ADMIN_ACCOUNT,
          disabled: true,
        }),
        attributes: { },
      });

      const expectedContentType = {
        contentType: defaultContentType,
      };

      await service.enableUser('foo-user');

      expect(client.updateSecret.lastCall.args[1]).to.equal('foo-user');
      expect(client.updateSecret.lastCall.args[3]).to.eql(expectedContentType);
    });
  });

  describe('.temporarilyLockUser', () => {
    it('locks a user for 15 mins', async () => {
      const clock = sinon.useFakeTimers({
        now: 1483228800000,
        shouldAdvanceTime: false,
      });

      const expectedNotBefore = addMinutes(Date.now(), 15);

      const expectedAttributes = {
        secretAttributes: {
          notBefore: expectedNotBefore,
        },
      };

      client.updateSecret.resolves({
        value: generatePasswordHash('foo-password'),
        contentType: defaultContentType,
        attributes: {
          expires: startOfTomorrow(),
          notBefore: expectedNotBefore,
        },
      });

      await service.temporarilyLockUser('foo-user');

      expect(client.updateSecret.lastCall.args[1]).to.equal('foo-user');
      expect(client.updateSecret.lastCall.args[3]).to.eql(expectedAttributes);

      clock.restore();
    });
  });
});
