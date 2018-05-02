const express = require('express');
const addRequestId = require('express-request-id')();
const helmet = require('helmet');
const hsts = require('hsts');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const compression = require('compression');
const sassMiddleware = require('node-sass-middleware');
const path = require('path');
const bunyanMiddleware = require('bunyan-middleware');

const logger = require('./loggers/logger.js');

const config = require('./config');
const authenticationMiddleWare = require('./middleware/authentication');

const createIndexRouter = require('./routes/index');
const createHealthRouter = require('./routes/health');

const version = Date.now().toString();

module.exports = function createApp({ fileService, appInfo, authenticationService }) { // eslint-disable-line max-len
  const app = express();

  app.set('json spaces', 2);

  // Configure Express for running behind proxies
  // https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', true);

  // View Engine Configuration
  app.set('views', path.join(__dirname, '../server/views'));
  app.set('view engine', 'ejs');

  // Server Configuration
  app.set('port', config.port);

  // Secure code best practice - see:
  // 1. https://expressjs.com/en/advanced/best-practice-security.html,
  // 2. https://www.npmjs.com/package/helmet
  app.use(helmet());

  app.use(hsts({
    maxAge: 15552000, // 180 days in seconds
    preload: true,
    includeSubDomains: true,
  })); // Strict-Transport-Security: max-age: 15552000; includeSubDomains

  app.use(addRequestId);

  // Request Processing Configuration
  app.use(bunyanMiddleware({ logger }));

  // Resource Delivery Configuration
  app.use(compression());

  // Cachebusting version string
  if (!config.dev) {
    // Version only changes on reboot
    app.locals.version = version;
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString();
      return next();
    });
  }

  if (config.dev) {
    app.use('/public', sassMiddleware({
      src: path.join(__dirname, '../assets/sass'),
      dest: path.join(__dirname, '../assets/stylesheets'),
      debug: true,
      outputStyle: 'compressed',
      prefix: '/stylesheets/',
      includePaths: [
        'node_modules/govuk_frontend_toolkit/stylesheets',
        'node_modules/govuk_template_jinja/assets/stylesheets',
        'node_modules/govuk-elements-sass/public/sass',
      ],
    }));
  }

  //  Static Resources Configuration
  const cacheControl = { maxAge: config.staticResourceCacheDuration * 1000 };

  [
    '../public',
    '../assets',
    '../assets/stylesheets',
    '../node_modules/govuk_template_jinja/assets',
    '../node_modules/govuk_frontend_toolkit',
  ].forEach((dir) => {
    app.use('/public', express.static(path.join(__dirname, dir), cacheControl));
  });

  [
    '../node_modules/govuk_frontend_toolkit/images',
  ].forEach((dir) => {
    app.use('/public/images/icons', express.static(path.join(__dirname, dir), cacheControl));
  });

  // GovUK Template Configuration
  app.locals.asset_path = '/public/';

  function addTemplateVariables(req, res, next) {
    res.locals.user = req.user;
    next();
  }

  app.use(addTemplateVariables);

  // Don't cache dynamic resources
  app.use(helmet.noCache());

  // Cookie parser
  app.use(cookieParser());

  // CSRF protection
  app.use(csurf({ cookie: true }));


  // Routing
  app.use('/health', createHealthRouter({ appInfo }));

  app.use('/', authenticationMiddleWare(authenticationService), createIndexRouter({ fileService }));

  app.use(renderErrors);

  return app;
};

function renderErrors(error, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(error);

  res.locals.error = error;
  res.locals.stack = !config.dev ? null : error.stack;
  res.locals.message = !config.dev ?
    'Something went wrong. The error has been logged. Please try again' : error.message;

  res.status(error.status || 500);

  res.render('pages/error');
}
