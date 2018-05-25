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
      res.redirect('/');
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

      res.render('pages/admin', { accounts, stats });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  });


  router.get('/add-user', (req, res) => {
    res.render('pages/adminAddUser', {
      randomPassword: generateRandomPassword(),
      error: false,
      success: false,
      csrfToken: req.csrfToken(),
    });
  });

  router.post('/add-user', async (req, res) => {
    const data = req.body;

    logger.debug(data);

    try {
      await keyVaultService.createUser({
        username: data.username,
        accountType: data.accountType,
        password: data.password,
      });

      res.render('pages/adminAddUser', {
        randomPassword: generateRandomPassword(),
        error: false,
        success: true,
        csrfToken: req.csrfToken(),
        newUser: {
          username: data.username,
          password: data.password,
        },
      });
    } catch (error) {
      logger.error(error);
      res.status(400);
      res.render('pages/adminAddUser', {
        randomPassword: generateRandomPassword(),
        success: false,
        error: true,
        csrfToken: req.csrfToken(),
      });
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
