const createApp = require('./app');
const logger = require('../log');
const fileService = require('./services/file');

const app = createApp({
  logger,
  fileService: fileService(),
});

module.exports = app;
