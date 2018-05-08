const config = require('./config');
const createApp = require('./app');
const storageService = require('./services/storage');
const appInfoService = require('./services/app-info');
const authenticationService = require('./services/authentication');

const buildInfo = config.dev ? null : require('../build-info.json'); // eslint-disable-line import/no-unresolved

const app = createApp({
  authenticationService,
  storageService: storageService(),
  appInfo: appInfoService(buildInfo),
});

module.exports = app;
