const express = require('express');
const logger = require('../loggers/logger');

module.exports = function Index({ storageService }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const file = await storageService.todaysFile();

      res.render('pages/index', { latestFileName: file && file.name });
    } catch (exception) {
      logger.error(exception);
      res.render('pages/index', { latestFileName: null });
    }
  });

  router.get('/historic-reports', async (req, res) => {
    try {
      const nomisReports = await storageService.listFiles();

      res.render('pages/historicNomisFiles', { nomisReports });
    } catch (exception) {
      logger.error(exception);
      res.render('pages/historicNomisFiles', { nomisReports: [] });
    }
  });


  router.get('/:fileName.zip', async (req, res, next) => {
    try {
      const fileName = `${req.params.fileName}.zip`;
      const stream = await storageService.downloadFile(fileName);

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
    } catch (exception) {
      next(exception);
    }
  });

  return router;
};
