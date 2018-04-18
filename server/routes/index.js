const express = require('express');

module.exports = function Index({ logger, fileService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    logger.info('GET index');

    const latestFileName = fileService.getLatestFileName();

    res.render('pages/index', { latestFileName });
  });

  return router;
};
