const appInsights = require('applicationinsights');
const config = require('../config');

appInsights.setup(config.appinsightsKey).start();

module.exports = appInsights;
