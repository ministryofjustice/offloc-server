
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
      const user = await service.validateUser(auth.name, auth.pass);

      if (user.ok) {
        if (!isExpired(user.data.validFrom)) {
          return temporarilyLockedUser(res, { time: user.data.validFrom });
        }

        if (user.data.disabled) {
          return disabled(res);
        }

        if (isExpired(user.data.expires)) {
          res.locals.passwordExpired = true;
        }

        res.locals.user = { username: auth.name, accountType: user.data.accountType };

        clearFailedLoginAttemptsFor(auth.name);
        return next();
      }
    } catch (expectation) {
      logger.error(expectation);

      recordFailedLoginAttemptFor(auth.name);

      return unauthorized(res);
    }

    // For users that don't exist
    recordFailedLoginAttemptFor(auth.name);

    if (failedLoginAttempts[auth.name] === 3) {
      const lockedUser = await lockAccount(auth.name, service);

      if (lockedUser) {
        return temporarilyLockedUser(res, { time: lockedUser.attributes.notBefore });
      }
      return authenticationProblem(res);
    }

    return unauthorized(res);
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
  res.status(403);
  res.render('pages/authenticationProblem');
}

function temporarilyLockedUser(res, { time }) {
  res.status(403);
  res.render('pages/temporarily-locked-account', { time: formatDate(time, 'MM/DD/YYYY HH:mm:ss') });
}

function disabled(res) {
  res.status(403);
  res.render('pages/disabled');
}


module.exports = {
  passwordExpiredMiddleWare,
  authenticationMiddleWare,
};
