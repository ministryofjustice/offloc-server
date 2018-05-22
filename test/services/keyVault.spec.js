const bcrypt = require('bcrypt');

const {
  createUserInKeyVault,
  checkUserInKeyVault,
  generatePasswordHash,
  updateUserPassword,
} = require('../../server/services/keyVault');


describe('Authentication', () => {
  describe('.createUserInKeyVault', () => {
    it('adds a new user to the azure key vault with an encrypted password', async () => {
      const client = { setSecret: sinon.stub().resolves(true) };
      const createUser = createUserInKeyVault(client);
      const username = 'foo';
      const password = 'foo-password';

      await createUser(username, password);

      const hashedPassword = client.setSecret.args[0][2];
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      expect(client.setSecret.args[0][1]).to.equal(username);
      expect(passwordMatch).to.equal(true);
    });

    describe('.checkUserInKeyVault', () => {
      it('returns true when authentication passes', async () => {
        const hashedPassword = await generatePasswordHash('foo-password');
        const client = {
          getSecret: sinon.stub().resolves({
            value: hashedPassword,
            attributes: {
              expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
            },
          }),
        };
        const checkUser = checkUserInKeyVault(client);

        const username = 'foo';
        const password = 'foo-password';

        const exists = await checkUser(username, password);

        expect(exists).to.eql({ ok: true, data: { expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)' } });
      });

      it('returns false when there is an error with authentication', async () => {
        const client = {
          getSecret: sinon.stub().rejects({ status: 404 }),
        };
        const checkUser = checkUserInKeyVault(client);

        const username = 'foo';
        const password = 'foo-password';

        const exists = await checkUser(username, password);

        expect(exists).to.eql({ ok: false, data: null });
      });
    });

    describe('.updateUserPassword', () => {
      it('updates a users password', async () => {
        const username = 'foo';
        const currentPassword = 'foo-password';
        const newPassword = 'new-password';
        const hashedPassword = await generatePasswordHash(currentPassword);

        const client = {
          setSecret: sinon.stub().resolves(true),
          getSecret: sinon.stub().resolves({
            value: hashedPassword,
            attributes: {
              expires: 'Mon May 21 2018 13:08:20 GMT+0100 (GMT)',
            },
          }),
        };

        const updatePassword = updateUserPassword(client);

        const result = await updatePassword(username, { currentPassword, newPassword });

        expect(result.ok).to.equal(true);
        expect(result.errors.length).to.equal(0);
      });

      it('does not update the password when the user does not exist', async () => {
        const username = 'foo';
        const currentPassword = 'foo-password';
        const newPassword = 'new-password';

        const client = {
          setSecret: sinon.stub().resolves(true),
          getSecret: sinon.stub().rejects({ status: 404 }),
        };

        const updatePassword = updateUserPassword(client);

        const result = await updatePassword(username, { currentPassword, newPassword });

        expect(result.ok).to.equal(false);
        expect(result.errors.length).to.equal(1);
      });
    });
  });
});
