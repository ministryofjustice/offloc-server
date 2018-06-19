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
      const { user } = res.locals;
      const passwordCheck = passwordValidationService.validateInput(req.body);
      if (!passwordCheck.ok) {
        logger.info(passwordCheck.errors, 'password requirements unmet');
        res.status(400);
        return res.render('pages/changePassword', {
          csrfToken: req.csrfToken(),
          errors: {
            type: 'password-invalid',
            list: passwordCheck.errors,
          },
        });
      }
      const result = await keyVaultService.updatePassword({
        username: user.username,
        accountType: user.accountType,
        ...passwordCheck.data,
      });

      if (!result.ok) {
        logger.info({ user: user.username }, 'Invalid credentials');
        res.status(400);
        return res.render('pages/changePassword', {
          csrfToken: req.csrfToken(),
          errors: {
            type: 'invalid-credentials',
            list: result.errors,
          },
        });
      }

      return res.redirect(302, '/change-password/confirmation');
    } catch (error) {
      return next(error);
    }
  });

  router.get('/confirmation', (req, res) => {
    res.render('pages/confirmation', { headline: 'Your password was successfully updated' });
  });

  return router;
};
