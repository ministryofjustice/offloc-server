const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');

const constants = require('../server/constants/app');

function binaryParser(res, callback) {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', (chunk) => {
    res.data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(res.data, 'binary'));
  });
}

async function* listBlobsFlat(entries) {
  // eslint-disable-next-line no-restricted-syntax
  for (const entry of entries) {
    yield entry;
  }
}

function createBlobServiceSuccess({ entry, entries = [] } = {}) {
  return {
    getBlobClient: (_blobName) => ({
      exists: () => Promise.resolve(!!entry),
      getProperties: () => Promise.resolve({ contentLength: 390 }),
      download: () => Promise.resolve({
        readableStreamBody: fs.createReadStream(path.resolve(__dirname, './resources/20181704.zip')),
      }),
    }),
    listBlobsFlat: (_options) => listBlobsFlat(entry ? [entry] : entries),
  };
}

function createBlobServiceError() {
  return {
    getBlobClient: (_blobName) => ({
      exists: () => Promise.reject(Error('Error!')),
      getProperties: () => Promise.reject(Error('Not found!')),
    }),
  };
}

function setupBasicApp({ admin } = { admin: false }) {
  const app = express();
  app.set('views', path.join(__dirname, '../server/views'));
  app.set('view engine', 'ejs');

  // Body parser
  app.use(bodyParser.urlencoded({ extended: true }));
  // Cookie parser
  app.use(cookieParser());
  // CSRF protection
  app.use(csurf({ cookie: true }));

  app.use((req, res, next) => {
    req.log = {
      info: () => {},
    };
    res.locals.user = {
      username: 'foo',
      accountType: admin ? constants.ADMIN_ACCOUNT : constants.USER_ACCOUNT,
    };
    res.locals.version = 'foo';
    res.locals.constants = constants;
    next();
  });
  return app;
}

function retrieveCsurfData(response) {
  const cookies = response.headers['set-cookie'];
  const $ = cheerio.load(response.text);
  const token = $('[name=_csrf]').val();

  return { cookies, token };
}

module.exports = {
  setupBasicApp,
  binaryParser,
  createBlobServiceSuccess,
  createBlobServiceError,
  retrieveCsurfData,
};
