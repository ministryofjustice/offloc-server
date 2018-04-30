const express = require('express');
const logger = require('../loggers/logger');

module.exports = function Index({ fileService }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const file = await fileService.todaysFile();

      res.render('pages/index', { latestFileName: file && file.name });
    } catch (error) {
      logger.error(error);
      res.render('pages/index', { latestFileName: null });
    }
  });


  router.get('/:fileName.zip', (req, res) => {
    const fileName = `${req.params.fileName}.zip`;
    const stream = fileService.downloadFile(fileName);

    stream
      .on('error', (error) => {
        logger.error(error);
        res.status(404);
        res.render('pages/404');
      });

    stream
      .once('data', () => {
        res.type('application/x-zip-compressed');
      });

    stream.pipe(res);
  });

  return router;
};
