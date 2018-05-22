const config = require('./config');
const createApp = require('./app');
const storageService = require('./services/storage');
const appInfoService = require('./services/app-info');
const keyVaultService = require('./services/keyVault');
const passwordValidationService = require('./services/passwordValidation');

const buildInfo = config.dev ? null : require('../build-info.json'); // eslint-disable-line import/no-unresolved

const app = async () => createApp({
  keyVaultService: await keyVaultService(),
  storageService: storageService(),
  appInfo: appInfoService(buildInfo),
  passwordValidationService,
});

module.exports = app;
