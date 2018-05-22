const bcrypt = require('bcrypt');
const msRestAzure = require('ms-rest-azure');
const { KeyVaultClient } = require('azure-keyvault');

const logger = require('../loggers/logger');
const config = require('../config');
const { createVaultCredentials } = require('./azure-local');

const keyVaultUri = config.keyVaultUrl;

function expireIn(ms) {
  const date = new Date();
  date.setTime(date.getTime() + ms);

  return date;
}

function getKeyVaultCredentials() {
  if (config.appSettingsWebsiteSiteName) {
    return msRestAzure.loginWithAppServiceMSI({
      resource: 'https://vault.azure.net',
    });
  }

  return Promise.resolve(createVaultCredentials());
}

async function createKeyVaultService(override) {
  const client = override || new KeyVaultClient(await getKeyVaultCredentials());

  return {
    createUser,
    validateUser,
    updatePassword,
  };

  async function createUser(username, password) {
    return setUser(username, password, 0);
  }

  async function validateUser(username, password) {
    try {
      logger.debug({ user: username }, 'Fetching user from vault');
      const { value: existingHash, attributes } = await getUser(username);

      logger.debug({ user: username }, 'Comparing password');

      const authenticated = await bcrypt.compare(password, existingHash);

      return {
        ok: authenticated,
        data: (authenticated) ? { expires: attributes.expires } : null,
      };
    } catch (error) {
      logger.error(error, 'Failed to validate user');
      return {
        ok: false,
        data: null,
      };
    }
  }

  async function updatePassword(username, { currentPassword, newPassword }) {
    const result = await validateUser(username, currentPassword);
    if (!result.ok) {
      return {
        ok: false,
        errors: [{
          type: 'credentialsInvalid',
          value: 'Failed to verify username & password',
        }],
      };
    }

    await setUser(username, newPassword, config.passwordExpirationDuration);

    return { ok: true, errors: [] };
  }

  async function getUser(name) {
    return client.getSecret(keyVaultUri, name, '');
  }

  async function setUser(username, password, expiry) {
    const hashedPassword = await generatePasswordHash(password);

    const attributes = {
      expires: expireIn(expiry),
      notBefore: new Date(),
    };

    return client.setSecret(keyVaultUri, username, hashedPassword, {
      contentType: 'user account',
      secretAttributes: attributes,
    });
  }
}

function generatePasswordHash(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

module.exports = createKeyVaultService;
