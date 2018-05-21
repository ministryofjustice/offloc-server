const bcrypt = require('bcrypt');

const createKeyVaultService = require('../../server/services/keyVault');
const config = require('../../server/config');

function generatePasswordHash(password) {
  // Fixed salt with low number of rounds so things go faster
  return bcrypt.hashSync(password, '$2b$04$Hh1KRFVlAxhbFCganFbgnu');
}

describe('services/keyVault', () => {
  let client;
  let service;
  beforeEach(async () => {
    client = { getSecret: sinon.stub(), setSecret: sinon.stub() };
    service = await createKeyVaultService(client);
  });

  describe('.createUser', () => {
    let args;
    beforeEach(async () => {
      client.setSecret.resolves(true);

      await service.createUser('foo', 'foo-password');

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
  });

  describe('.validateUser', () => {
    it('returns true when authentication passes', async () => {
      const hashedPassword = generatePasswordHash('foo-password');
      client.getSecret.resolves({
        value: hashedPassword,
        attributes: {
          expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
        },
      });

      const exists = await service.validateUser('foo', 'foo-password');

      expect(exists).to.eql({ ok: true, data: { expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)' } });
    });

    it('returns false when there is an error with authentication', async () => {
      client.getSecret.rejects({ status: 404 });

      const exists = await service.validateUser('foo', 'foo-password');

      expect(exists).to.eql({ ok: false, data: null });
    });

    it('returns false when the password is wrong', async () => {
      const hashedPassword = generatePasswordHash('other-password');
      client.getSecret.resolves({
        value: hashedPassword,
        attributes: {
          expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
        },
      });

      const exists = await service.validateUser('foo', 'foo-password');

      expect(exists).to.eql({ ok: false, data: null });
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
          attributes: {
            expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
          },
        });
        client.setSecret.resolves(true);

        result = await service.updatePassword('foo', {
          currentPassword: 'foo-password',
          newPassword: 'new-password',
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

      const result = await service.updatePassword('foo', {
        currentPassword: 'foo-password',
        newPassword: 'new-password',
      });

      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.equal(1);

      expect(client.setSecret.callCount).to.equal(0);
    });

    it('does not update the password when the password is wrong', async () => {
      const hashedPassword = generatePasswordHash('other-password');
      client.getSecret.resolves({
        value: hashedPassword,
        attributes: {
          expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
        },
      });
      client.setSecret.resolves(true);

      const result = await service.updatePassword('foo', {
        currentPassword: 'foo-password',
        newPassword: 'new-password',
      });

      expect(result.ok).to.equal(false);
      expect(result.errors.length).to.equal(1);

      expect(client.setSecret.callCount).to.equal(0);
    });
  });
});
