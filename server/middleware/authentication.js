
const basicAuth = require('basic-auth');
const logger = require('../loggers/logger.js');
const { isExpired } = require('../../utils/index');


function authenticationMiddleWare(service) {
  return async function requireAuthentication(req, res, next) {
    const auth = basicAuth(req);

    if (!auth || !auth.name || !auth.pass) {
      req.log.info('No auth details included');
      return unauthorized(res);
    }

    try {
      const user = await service.validateUser(auth.name, auth.pass);

      if (user.ok) {
        if (isExpired(user.data.expires)) {
          res.locals.passwordExpired = true;
        }
        res.locals.user = { username: auth.name, accountType: user.data.accountType };

        return next();
      }
    } catch (expectation) {
      logger.error(expectation);
      return unauthorized(res);
    }

    return unauthorized(res);
  };
}


function passwordExpiredMiddleWare(req, res, next) {
  if (res.locals.passwordExpired) {
    res.render('pages/changePassword', {
      csrfToken: req.csrfToken(),
      errors: {
        type: null,
        list: null,
      },
    });
  } else {
    next();
  }
}

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm=Password Required');
  res.status(401);
  res.render('pages/denied');
}


module.exports = {
  passwordExpiredMiddleWare,
  authenticationMiddleWare,
};
