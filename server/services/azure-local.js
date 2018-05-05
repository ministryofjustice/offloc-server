const { KeyVaultCredentials } = require('azure-keyvault');
const { exec } = require('child_process');

let blobStorageCache = null;
let keyVaultCache = null;

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
      // eslint-disable-next-line no-param-reassign, max-len
      webResource.headers.authorization = authorization;

      return callback(null);
    },
  };
}

function createVaultCredentials() {
  return new KeyVaultCredentials(authenticator);
}

function authenticator(challenge, callback) {
  if (keyVaultCache && !tokenExpired(keyVaultCache.expiresOn)) {
    return callback(null, `${keyVaultCache.tokenType} ${keyVaultCache.accessToken}`);
  }

  return getAzureAuthorizationFromCli(challenge.resource, (err, auth) => {
    if (err) return callback(err);

    // update keyVaultCache
    keyVaultCache = auth;

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
    if (blobStorageCache && !tokenExpired(blobStorageCache.expiresOn)) {
      return resolve(createSignedRequest(blobStorageCache));
    }

    return executeAzureCmd(`az account get-access-token -s "${subscriptionId}"`, (error, data) => {
      // update blobStorageCache
      blobStorageCache = data;

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
