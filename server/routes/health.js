const express = require('express');


module.exports = function Health({ appInfo }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(appInfo.getBuildInfo());
  });

  return router;
};
