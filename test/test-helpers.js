const fs = require('fs');
const { Readable } = require('stream');
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

function createBlobServiceSuccess(entry) {
  return {
    doesBlobExist: (containerName, blobName, callback) => callback(null, entry),
    createReadStream: () => fs.createReadStream(path.resolve(__dirname, './resources/20181704.zip')),
  };
}

function createBlobServiceError() {
  return {
    doesBlobExist: (containerName, blobName, callback) => callback('error', null),
    createReadStream: () => new Readable({
      read() {
        process.nextTick(() => this.emit('error', 'some error'));
      },
    }),
  };
}

function setupBasicApp({ accountType } = {}) {
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
    res.locals.user = {
      username: 'foo',
      accountType: accountType || constants.USER_ACCOUNT,
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
