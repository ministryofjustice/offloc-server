const bcrypt = require('bcrypt');
const msRestAzure = require('ms-rest-azure');
const { KeyVaultClient } = require('azure-keyvault');
const formatDate = require('date-fns/format');

const logger = require('../loggers/logger');
const config = require('../config');
const constants = require('../constants/app');
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
    listUsers,
    deleteUser,
    getUser,
    disableUser,
    enableUser,
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
      const { value: existingHash, attributes, contentType } = await getUser(username);

      logger.debug({ user: username }, 'Comparing password');

      const authenticated = await bcrypt.compare(password, existingHash);
      const accountData = getContentType(contentType);
      let data = null;

      if (authenticated) {
        data = {
          expires: attributes.expires,
          accountType: accountData.accountType,
          disabled: accountData.disabled,
        };
      }

      return {
        ok: authenticated,
        data,
      };
    } catch (error) {
      logger.error(error, 'Failed to validate user');
      return {
        ok: false,
        data: null,
      };
    }
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

  function getUser(name) {
    return client.getSecret(keyVaultUri, name, '');
  }

  function deleteUser(name) {
    return client.deleteSecret(keyVaultUri, name);
  }

  async function updateContentType(name, opts) {
    const user = await getUser(name);

    const contentType = getContentType(user.contentType);
    const updatedContentType = { ...contentType, ...opts };

    return client.updateSecret(keyVaultUri, name, '', {
      contentType: JSON.stringify(updatedContentType),
    });
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

    const attributes = {
      expires: expireIn(expiry),
      notBefore: new Date(),
    };

    return client.setSecret(keyVaultUri, username, hashedPassword, {
      contentType: JSON.stringify({
        accountType: accountType || constants.USER_ACCOUNT,
        disabled: false,
      }),
      secretAttributes: attributes,
    });
  }

  async function listUsers() {
    const secrets = await client.getSecrets(keyVaultUri);
    const accounts = ({ contentType }) => {
      const { accountType } = getContentType(contentType);
      return accountType === constants.USER_ACCOUNT || accountType === constants.ADMIN_ACCOUNT;
    };
    const getUserName = str => str.match(/\/([\w-_]+)$/);

    return secrets
      .filter(accounts)
      .map((account) => {
        const username = getUserName(account.id);
        const { accountType, disabled } = getContentType(account.contentType);

        return {
          disabled,
          accountType,
          username: (username) ? username[1] : username,
          expires: account.attributes.expires,
          expiresPretty: formatDate(account.attributes.expires, 'DD/MM/YYYY'),
        };
      });
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
