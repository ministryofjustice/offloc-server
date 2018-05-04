const { KeyVaultCredentials } = require('azure-keyvault');
const { exec } = require('child_process');

let cache = null;

function tokenExpired(tokenExpiryTime) {
  const expiryTime = new Date(tokenExpiryTime);
  const currentTime = new Date();
  const diff = currentTime - expiryTime;

  return diff >= 0;
}

function createSignedRequest(data) {
  return {
    signRequest(webResource, callback) {
      const authorization = `${data.tokenType} ${data.accessToken}`;

      webResource.headers.authorization = authorization; // eslint-disable-line no-param-reassign, max-len

      return callback(null);
    },
  };
}

function createVaultCredentials() {
  return new KeyVaultCredentials(authenticator);
}

function authenticator(challenge, callback) {
  getAzureAuthorizationFromCli(challenge.resource, (err, auth) => {
    if (err) return callback(err);
    return callback(null, `${auth.tokenType} ${auth.accessToken}`);
  });
}

function getAzureAuthorizationFromCli(resource, callback) {
  executeAzureCmd(`az account get-access-token --resource "${resource}"`, callback);
}

function createBlobStorageCredentials(subscriptionId) {
  return getBlobStorageCredentials(subscriptionId);
}

function getBlobStorageCredentials(subscriptionId) {
  return new Promise((resolve, reject) => {
    if (cache && !tokenExpired(cache.expiresOn)) {
      return resolve(createSignedRequest(cache));
    }

    return executeAzureCmd(`az account get-access-token -s "${subscriptionId}"`, (error, data) => {
      // update cache
      cache = data;

      if (error) {
        reject(error);
      } else {
        resolve(createSignedRequest(data));
      }
    });
  });
}

function executeAzureCmd(cmd, callback) {
  exec(
    cmd,
    (err, result) => {
      if (err) return callback(err);
      try {
        return callback(null, JSON.parse(result));
      } catch (ex) {
        return callback(ex);
      }
    },
  );
}


module.exports = {
  createVaultCredentials,
  createBlobStorageCredentials,
};
