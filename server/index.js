const config = require('./config');
const createApp = require('./app');
const logger = require('./loggers/logger');
const fileService = require('./services/file');
const appInfoService = require('./services/app-info');

const buildInfo = config.dev ? null : require('../build-info.json'); // eslint-disable-line import/no-unresolved

const app = createApp({
  logger,
  fileService: fileService(),
  appInfo: appInfoService(buildInfo),
});

module.exports = app;
