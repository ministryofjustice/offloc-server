const appInsights = require('applicationinsights');
const config = require('../config');

appInsights.setup(config.appInsightsKey).start();

appInsights.defaultClient.addTelemetryProcessor(attachUserId);
function attachUserId(envelope, context) {
  const req = context['http.ServerRequest'];
  if (req && req.user) {
    // eslint-disable-next-line no-param-reassign
    envelope.tags['ai.user.authUserId'] = req.user;
  }
}

module.exports = appInsights;
