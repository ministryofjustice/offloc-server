const appInsights = require('applicationinsights');
const config = require('../config');

appInsights.setup(config.appInsightsKey).start();

module.exports = appInsights;
