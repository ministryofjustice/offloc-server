require('applicationinsights');

const app = require('./server/index');
const appInsights = require('./server/loggers/appInsights');
const logger = require('./server/loggers/logger');

const start = Date.now();

app.listen(app.get('port'), () => {
  const duration = Date.now() - start;
  appInsights.defaultClient.trackMetric({ name: 'SERVER_STARTUP_TIME', value: duration });

  logger.info(`Server listening on port ${app.get('port')}`);
});
