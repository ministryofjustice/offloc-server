
const basicAuth = require('basic-auth');
const config = require('../config');
const logger = require('../loggers/logger.js');

module.exports = function authenticationMiddleWare(authenticationService) {
  return async function requireAuthentication(req, res, next) {
    const auth = basicAuth(req);

    if (!auth || !auth.name || !auth.pass) {
      req.log.info('No auth details included');
      return unauthorized(res);
    }

    if (config.skipAuth) {
      const lengthGreaterThan3 = val => (/.{3,}/.test(val));
      if (lengthGreaterThan3(auth.name) && lengthGreaterThan3(auth.pass)) {
        return next();
      }
      return unauthorized(res);
    }

    try {
      const service = await authenticationService.createKeyVaultService();
      const userValid = await service.validateUser(auth.name, auth.pass);

      if (userValid) return next();
    } catch (expectation) {
      logger.error(expectation);
      return unauthorized(res);
    }

    return unauthorized(res);
  };
};

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm=Password Required');
  return res.sendStatus(401);
}
