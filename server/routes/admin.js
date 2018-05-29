const express = require('express');
const passwordGenerator = require('generate-password');
const constants = require('../constants/app');

const { isExpired } = require('../../utils/index');
const logger = require('../loggers/logger');

function generateRandomPassword() {
  return passwordGenerator.generate({
    length: 16,
    numbers: true,
  });
}

module.exports = function Index({ keyVaultService }) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (res.locals.user.accountType === constants.ADMIN_ACCOUNT) {
      next();
    } else {
      res.status(403);
      next(new Error('You do not have permission to view this page'));
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const accounts = await keyVaultService.listUsers();
      const stats = {
        users: countOccurrencesOf('accountType', constants.USER_ACCOUNT, accounts),
        admin: countOccurrencesOf('accountType', constants.ADMIN_ACCOUNT, accounts),
        expired: countExpired(accounts),
      };

      res.render('pages/admin', { accounts, stats, csrfToken: req.csrfToken() });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  });


  router.get('/add-user', (req, res) => {
    res.render('pages/adminAddUser', {
      error: false,
      success: false,
      csrfToken: req.csrfToken(),
    });
  });

  router.post('/add-user', async (req, res) => {
    const data = req.body;
    const password = generateRandomPassword();

    try {
      await keyVaultService.createUser({
        username: data.username,
        accountType: data.accountType,
        password,
      });

      res.render('pages/adminAddUser', {
        randomPassword: generateRandomPassword(),
        error: false,
        success: true,
        csrfToken: req.csrfToken(),
        newUser: {
          username: data.username,
          password,
        },
      });
    } catch (error) {
      logger.error(error);
      res.status(400);
      res.render('pages/adminAddUser', {
        success: false,
        error: true,
        csrfToken: req.csrfToken(),
      });
    }
  });

  router.post('/delete-user', async (req, res, next) => {
    try {
      const { username } = req.body;
      logger.info({ username }, 'Deleting');
      await keyVaultService.deleteUser(req.body.username);
      logger.info({ username }, 'deleted');
      res.redirect('/admin');
    } catch (error) {
      logger.error(error);
      next(error);
    }
  });

  return router;
};

function countOccurrencesOf(key, value, data) {
  return data.filter(el => el[key] === value).length;
}

function countExpired(data) {
  return data.filter(el => isExpired(el.expires)).length;
}
