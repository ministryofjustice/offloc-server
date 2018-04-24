const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');

const formatOut = bunyanFormat({ outputMode: 'short' });

const logger = bunyan.createLogger({ name: 'Offloc server', stream: formatOut, level: 'debug' });

module.exports = logger;
