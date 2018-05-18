
const basicAuth = require('basic-auth');
const logger = require('../loggers/logger.js');

module.exports = function authenticationMiddleWare(authenticationService) {
  return async function requireAuthentication(req, res, next) {
    const auth = basicAuth(req);

    if (!auth || !auth.name || !auth.pass) {
      req.log.info('No auth details included');
      return unauthorized(res);
    }

    try {
      const service = await authenticationService.createKeyVaultService();
      const userValid = await service.validateUser(auth.name, auth.pass);

      if (userValid) {
        res.locals.user = auth.name;
        return next();
      }
    } catch (expectation) {
      logger.error(expectation);
      return unauthorized(res);
    }

    return unauthorized(res);
  };
};

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm=Password Required');
  res.status(401);
  res.render('pages/denied');
}
