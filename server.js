if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load(); // eslint-disable-line global-require
}

require('applicationinsights');

const app = require('./server/index');
const appInsights = require('./server/loggers/appInsights');
const logger = require('./server/loggers/logger');
const config = require('./server/config');

const start = Date.now();

logger.info({ config }, 'Starting app');

app.listen(app.get('port'), () => {
  const duration = Date.now() - start;
  appInsights.defaultClient.trackMetric({ name: 'SERVER_STARTUP_TIME', value: duration });

  logger.info(`Server listening on port ${app.get('port')}`);
});
