const bcrypt = require('bcrypt');
const msRestAzure = require('ms-rest-azure');
const { KeyVaultClient } = require('azure-keyvault');

const logger = require('../loggers/logger');
const config = require('../config');
const { createVaultCredentials } = require('./azure-local');


const keyVaultUri = config.keyVaultUrl;

function expireIn(seconds = 0) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);

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

async function createKeyVaultService() {
  const credentials = await getKeyVaultCredentials();
  const client = new KeyVaultClient(credentials);

  return {
    updateUserPassword: updateUserPassword(client),
    createUserInKeyVault: createUserInKeyVault(client),
    validateUser: checkUserInKeyVault(client),
  };
}


function keyVaultSecretSetter(client, opts = {}) {
  const attributes = {
    expires: expireIn(),
    notBefore: Date.today(),
    ...opts,
  };

  return (secretName, value) => client.setSecret(keyVaultUri, secretName, value, { contentType: 'user account', secretAttributes: attributes });
}

function keyVaultSecretGetter(client) {
  return (secretName, secretVersion = '') => client.getSecret(keyVaultUri, secretName, secretVersion);
}

function generatePasswordHash(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

function createUserInKeyVault(client, opts) {
  const setSecretClient = keyVaultSecretSetter(client, opts);

  return async (username, password) => {
    const hashedPassword = await generatePasswordHash(password);

    return setSecretClient(username, hashedPassword);
  };
}

function checkUserInKeyVault(client) {
  const getSecret = keyVaultSecretGetter(client);

  return async (username, password) => {
    try {
      logger.debug({ user: username }, 'Fetching user from vault');
      const { value: vaultPasswordHash, attributes } = await getSecret(username);

      logger.debug({ user: username }, 'Comparing password');

      const authenticated = await bcrypt.compare(password, vaultPasswordHash);
      const data = { expires: attributes.expires };

      return { ok: authenticated, data: (authenticated) ? data : null };
    } catch (error) {
      logger.error(error);
      return { ok: false, data: null };
    }
  };
}

function updateUserPassword(client) {
  return async (username, { currentPassword, newPassword }) => {
    const checkUser = checkUserInKeyVault(client);
    const userCredentials = await checkUser(username, currentPassword);

    if (!userCredentials.ok) {
      return {
        ok: false,
        errors: [{ type: 'credentialsInvalid', value: 'There was a problem authenticating this request. Please check that you\'ve entered all details correctly' }],
      };
    }

    const updateUser = createUserInKeyVault(client, {
      expires: expireIn(config.passwordExpirationDuration),
    });

    await updateUser(username, newPassword);

    return { ok: true, errors: [] };
  };
}


module.exports = {
  updateUserPassword,
  createKeyVaultService,
  generatePasswordHash,
  createUserInKeyVault,
  checkUserInKeyVault,
};
