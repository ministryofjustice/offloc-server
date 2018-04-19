const config = require('./config');
const createApp = require('./app');
const logger = require('../log');
const fileService = require('./services/file');
const appInfoService = require('./services/app-info');

// eslint-disable-next-line import/no-unresolved
const buildInfo = config.dev ? null : require('../build-info.json');

const app = createApp({
  logger,
  fileService: fileService(),
  appInfo: appInfoService(buildInfo),
});

module.exports = app;
