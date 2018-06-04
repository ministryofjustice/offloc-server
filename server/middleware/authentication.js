
const basicAuth = require('basic-auth');
const formatDate = require('date-fns/format');

const logger = require('../loggers/logger.js');
const { isExpired } = require('../../utils/index');


function authenticationMiddleWare(service) {
  const failedLoginAttempts = {};

  return async function requireAuthentication(req, res, next) {
    const auth = basicAuth(req);

    if (!auth || !auth.name || !auth.pass) {
      req.log.info('No auth details included');
      return unauthorized(res);
    }

    try {
      const user = await service.getUser(auth.name);

      if (!isExpired(user.validFrom)) {
        return temporarilyLockedUser(res, { time: user.validFrom });
      }

      const isAuthenticated = await service.validatePassword(auth.pass, user.password);

      if (isAuthenticated) {
        if (user.disabled) {
          return disabled(res);
        }

        if (isExpired(user.expires)) {
          res.locals.passwordExpired = true;
        }

        res.locals.user = { username: auth.name, accountType: user.accountType };

        clearFailedLoginAttemptsFor(auth.name);
        return next();
      }

      recordFailedLoginAttemptFor(auth.name);

      if (failedLoginAttempts[auth.name] >= 3) {
        await handleTooManyFailedAttempts(auth.name, res);
        return false;
      }

      return unauthorized(res);
    } catch (expectation) {
      logger.error(expectation);

      recordFailedLoginAttemptFor(auth.name);

      if (failedLoginAttempts[auth.name] >= 3) {
        await handleTooManyFailedAttempts(auth.name, res);
        return false;
      }

      return unauthorized(res);
    }
  };

  function recordFailedLoginAttemptFor(username) {
    if (failedLoginAttempts[username]) {
      // eslint-disable-next-line no-plusplus
      failedLoginAttempts[username]++;
    } else {
      failedLoginAttempts[username] = 1;
    }
  }

  function clearFailedLoginAttemptsFor(username) {
    if (failedLoginAttempts[username]) {
      failedLoginAttempts[username] = 0;
    }
  }

  async function handleTooManyFailedAttempts(username, res) {
    const lockedUser = await lockAccount(username, service);

    if (lockedUser) {
      return temporarilyLockedUser(res, { time: lockedUser.validFrom });
    }
    return authenticationProblem(res);
  }
}

async function lockAccount(username, service) {
  try {
    const user = await service.temporarilyLockUser(username);
    return user;
  } catch (error) {
    logger.error(error);
    return null;
  }
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

function authenticationProblem(res) {
  res.locals.reset = true;
  res.status(403);
  res.render('pages/authenticationProblem');
}

function temporarilyLockedUser(res, { time }) {
  res.locals.reset = true;
  res.status(403);
  res.render('pages/temporarily-locked-account', { time: formatDate(time, 'MM/DD/YYYY HH:mm:ss') });
}

function disabled(res) {
  res.locals.reset = true;
  res.status(403);
  res.render('pages/disabled');
}


module.exports = {
  passwordExpiredMiddleWare,
  authenticationMiddleWare,
};
