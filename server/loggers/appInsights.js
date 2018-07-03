const appInsights = require('applicationinsights');
const config = require('../config');

appInsights.setup(config.appInsightsKey).start();

appInsights.defaultClient.addTelemetryProcessor(attachUserId);
function attachUserId(envelope, context) {
  const res = context['http.ServerResponse'];
  if (res && res.locals && res.locals.user) {
    // eslint-disable-next-line no-param-reassign
    envelope.tags['ai.user.authUserId'] = res.locals.user.username;
  }
}

module.exports = appInsights;
