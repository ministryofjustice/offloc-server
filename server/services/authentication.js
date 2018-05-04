const bcrypt = require('bcrypt');
const msRestAzure = require('ms-rest-azure');
const { KeyVaultClient } = require('azure-keyvault');

const logger = require('../loggers/logger');
const config = require('../config');
const { createVaultCredentials } = require('./azure-local');


const keyVaultUri = config.keyVaultUrl;


function getKeyVaultCredentials() {
  if (config.appSettingsWebsiteSiteName) {
    return msRestAzure.loginWithAppServiceMSI();
  }

  return Promise.resolve(createVaultCredentials());
}

async function createKeyVaultService() {
  const credentials = await getKeyVaultCredentials();
  const client = new KeyVaultClient(credentials);

  return {
    validateUser: checkUserInKeyVault(client),
  };
}


function keyVaultSecretSetter(client) {
  const attributes = {
    expires: new Date('2050-02-02T08:00:00.000Z'),
    notBefore: Date.today(),
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

function createUserInKeyVault(client) {
  const setSecretClient = keyVaultSecretSetter(client);

  return async (username, password) => {
    const hashedPassword = await generatePasswordHash(password);

    return setSecretClient(username, hashedPassword);
  };
}

function checkUserInKeyVault(client) {
  const getSecret = keyVaultSecretGetter(client);

  return async (username, password) => {
    try {
      const { value: vaultPasswordHash } = await getSecret(username);

      return bcrypt.compare(password, vaultPasswordHash);
    } catch (error) {
      logger.error(error);
      return false;
    }
  };
}

module.exports = {
  createKeyVaultService,
  generatePasswordHash,
  createUserInKeyVault,
  checkUserInKeyVault,
};
