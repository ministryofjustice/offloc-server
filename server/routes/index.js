const express = require('express');
const logger = require('../loggers/logger');

module.exports = function Index({ storageService }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const file = await storageService.todaysFile();

      res.render('pages/index', { latestFileName: file });
    } catch (ex) {
      next(ex);
    }
  });

  router.get('/historic-reports', async (req, res, next) => {
    try {
      const nomisReports = await storageService.listFiles();

      res.render('pages/historicNomisFiles', { nomisReports });
    } catch (ex) {
      logger.error(ex);
      next(ex);
    }
  });

  router.get('/:fileName.zip', async (req, res, next) => {
    try {
      const fileName = `${req.params.fileName}.zip`;
      const fileProperties = await storageService.getFileProperties(fileName);

      if (fileProperties == null) {
        res.status(404);
        res.render('pages/404');
        return;
      }

      res.set('content-length', fileProperties.contentLength);
      res.type('application/x-zip-compressed');
      const stream = await storageService.downloadFile(fileName);
      stream.pipe(res);
    } catch (exception) {
      next(exception);
    }
  });

  return router;
};
