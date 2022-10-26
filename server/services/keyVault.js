const bcrypt = require('bcrypt');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const formatDate = require('date-fns/format');
const addMinutes = require('date-fns/add_minutes');

const logger = require('../loggers/logger');
const config = require('../config');
const constants = require('../constants/app');

const keyVaultUri = config.keyVaultUrl;

function expiresOn(ms) {
  const date = new Date();
  date.setTime(date.getTime() + ms);

  return date;
}

function getKeyVaultCredentials() {
  if (config.appSettingsWebsiteSiteName) {
    return new DefaultAzureCredential();
  }

  throw new Error('Cannot retrieve KeyVault credentials - must run inside App Service');
}

async function createKeyVaultService(override) {
  const client = override || new SecretClient(keyVaultUri, getKeyVaultCredentials());

  return {
    createUser,
    validatePassword,
    updatePassword,
    listUsers,
    deleteUser,
    getUser,
    disableUser,
    enableUser,
    temporarilyLockUser,
  };

  function createUser({ username, password, accountType }) {
    return setUser({
      username,
      password,
      expiry: 0,
      accountType,
    });
  }

  async function validateUser(username, password) {
    try {
      logger.debug({ user: username }, 'Fetching user from vault');
      const user = await getUser(username);

      logger.debug({ user: username }, 'Comparing password');
      const authenticated = await validatePassword(password, user.password);

      return {
        ok: authenticated,
        data: user,
      };
    } catch (error) {
      logger.error(error, 'Failed to validate user');
      return {
        ok: false,
        data: null,
      };
    }
  }

  async function validatePassword(password1, password2) {
    return bcrypt.compare(password1, password2);
  }

  async function updatePassword({
    username,
    currentPassword,
    newPassword,
    accountType,
  }) {
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

    await setUser({
      username,
      password: newPassword,
      expiry: config.passwordExpirationDuration,
      accountType,
    });

    return { ok: true, errors: [] };
  }

  async function getUser(name) {
    const user = await client.getSecret(name);

    return decorateUser(user);
  }

  function decorateUser(user) {
    const { value, properties } = user;
    const accountData = getContentType(properties.contentType);
    const getUserName = (str) => str.match(/\/([\w-_]+)$/);
    const username = getUserName(properties.name);

    return {
      password: value,
      username: (username) ? username[1] : username,
      accountType: accountData.accountType,
      disabled: accountData.disabled,
      version: properties.version,
      expires: properties.expiresOn,
      validFrom: properties.notBefore,
      expiresPretty: formatDate(properties.expiresOn, 'DD/MM/YYYY'),
    };
  }

  function deleteUser(name) {
    return client.beginDeleteSecret(name);
  }

  async function updateContentType(name, opts) {
    const { accountType, disabled, version } = await getUser(name);
    const updatedContentType = { accountType, disabled, ...opts };

    return client.updateSecretProperties(name, version, {
      contentType: JSON.stringify(updatedContentType),
    });
  }

  async function temporarilyLockUser(name) {
    const user = await client.getSecret(name);
    const properties = await client.updateSecretProperties(name, user.properties.version, {
      notBefore: addMinutes(Date.now(), 15),
    });

    return decorateUser({ ...user, properties });
  }

  function disableUser(name) {
    return updateContentType(name, { disabled: true });
  }

  async function enableUser(name) {
    return updateContentType(name, { disabled: false });
  }

  async function setUser({
    username, password, expiry, accountType,
  }) {
    const hashedPassword = await generatePasswordHash(password);

    return client.setSecret(username, hashedPassword, {
      contentType: JSON.stringify({
        accountType: accountType || constants.USER_ACCOUNT,
        disabled: false,
      }),
      expiresOn: expiresOn(expiry),
      notBefore: new Date(),
    });
  }

  async function listUsers() {
    const secrets = await getAllSecrets();
    const accounts = ({ accountType }) => accountType === constants.USER_ACCOUNT
      || accountType === constants.ADMIN_ACCOUNT;

    return secrets.filter(accounts);
  }

  async function getAllSecrets() {
    const secrets = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const property of client.listPropertiesOfSecrets()) {
      secrets.push(decorateUser({ property }));
    }

    return secrets;
  }
}

function getContentType(contentType) {
  try {
    return JSON.parse(contentType);
  } catch (exp) {
    if (contentType === constants.ADMIN_ACCOUNT) {
      return { accountType: constants.ADMIN_ACCOUNT, disabled: false };
    }
    if (contentType === constants.USER_ACCOUNT) {
      return { accountType: constants.USER_ACCOUNT, disabled: false };
    }

    return {};
  }
}

function generatePasswordHash(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

module.exports = createKeyVaultService;
