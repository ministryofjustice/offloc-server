const express = require('express');
const path = require('path');

module.exports = function Index({ logger, fileService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    logger.info('GET index');

    const latestFileName = fileService.getLatestFileName();

    res.render('pages/index', { latestFileName });
  });

  router.get('/:fileName.zip', (req, res) => {
    // This mime type appears to be allowed by Quantum
    res.type('application/x-zip-compressed');
    res.download(path.join(__dirname, '../../reportDownload/20181704.zip'));
  });

  return router;
};
