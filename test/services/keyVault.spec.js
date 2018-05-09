const bcrypt = require('bcrypt');

const {
  createUserInKeyVault,
  checkUserInKeyVault,
  generatePasswordHash,
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

    it('returns true when authentication passes', async () => {
      const hashedPassword = await generatePasswordHash('foo-password');
      const client = {
        getSecret: sinon.stub().resolves({ value: hashedPassword }),
      };
      const checkUser = checkUserInKeyVault(client);

      const username = 'foo';
      const password = 'foo-password';

      const exists = await checkUser(username, password);

      expect(exists).to.equal(true);
    });

    it('returns false when there is an error with authentication', async () => {
      const client = {
        getSecret: sinon.stub().rejects({ status: 404 }),
      };
      const checkUser = checkUserInKeyVault(client);

      const username = 'foo';
      const password = 'foo-password';

      const exists = await checkUser(username, password);

      expect(exists).to.equal(false);
    });
  });
});
