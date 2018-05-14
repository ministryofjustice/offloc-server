const express = require('express');

const logger = require('../loggers/logger');

module.exports = function ChangePassword({ keyVaultService, passwordValidationService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.render('pages/changePassword', {
      csrfToken: req.csrfToken(),
      errors: {
        type: null,
        list: null,
      },
    });
  });

  router.post('/', async (req, res, next) => {
    try {
      const passwordCheck = passwordValidationService.validateInput(req.body);

      if (!passwordCheck.ok) {
        logger.info(passwordCheck.errors, 'password requirements unmet');
        res.status(422);
        return res.render('pages/changePassword', {
          csrfToken: req.csrfToken(),
          errors: {
            type: 'password-invalid',
            list: passwordCheck.errors,
          },
        });
      }

      const service = await keyVaultService.createKeyVaultService();
      const result = await service.updateUserPassword(res.locals.user, req.body);

      if (!result.ok) {
        logger.info({ user: res.locals.user }, 'Invalid credentials');
        res.status(422);
        return res.render('pages/changePassword', {
          csrfToken: req.csrfToken(),
          errors: {
            type: 'invalid-credentials',
            list: result.errors,
          },
        });
      }

      return res.render('pages/confirmation', { headline: 'Your password was successfully updated' });
    } catch (error) {
      return next(error);
    }
  });

  return router;
};
