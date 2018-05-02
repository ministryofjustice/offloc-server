const auth = require('http-auth');

const config = require('../config');
const logger = require('../loggers/logger.js');

module.exports = function authenticationMiddleWare(authenticationService) {
  const basic = auth.basic({
    realm: 'offloc-app',
  }, async (username, password, callback) => {
    if (config.skipAuth) {
      callback(/.{3,}/.test(username) && /.{3,}/.test(password));
      return;
    }

    try {
      const service = await authenticationService.createKeyVaultService();
      const userValid = await service.validateUser(username, password);

      callback(userValid);
    } catch (expectation) {
      logger.error(expectation);
      callback(false);
    }
  });

  return auth.connect(basic);
};
