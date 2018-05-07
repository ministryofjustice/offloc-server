const config = require('./config');
const createApp = require('./app');
const fileService = require('./services/file');
const appInfoService = require('./services/app-info');
const authenticationService = require('./services/authentication');

const buildInfo = config.dev ? null : require('../build-info.json'); // eslint-disable-line import/no-unresolved

const app = createApp({
  authenticationService,
  fileService: fileService(),
  appInfo: appInfoService(buildInfo),
});

module.exports = app;
