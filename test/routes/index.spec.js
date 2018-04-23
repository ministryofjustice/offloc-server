const request = require('supertest');
const express = require('express');
const path = require('path');
const AdmZip = require('adm-zip');

const createIndexRouter = require('../../server/routes/index');

const fileService = { getLatestFileName: () => '20180418.zip' };
const logger = { info: sinon.spy() };
const router = createIndexRouter({ fileService, logger });

const app = express();
app.set('views', path.join(__dirname, '../../server/views'));
app.set('view engine', 'ejs');
app.use(router);

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

describe('GET /', () => {
  it('respond with a page displaying a file to download', () =>
    request(app)
      .get('/')
      .expect('Content-Type', /text\/html/)
      .expect(200)
      .then((response) => {
        expect(response.text).to.include('<td>20180418.zip</td>');
      }));

  it('downloads the latest file available', () =>
    request(app)
      .get('/20180418.zip')
      .expect('Content-Type', /zip/)
      .expect(200)
      .buffer()
      .parse(binaryParser)
      .then((response) => {
        const contents = new AdmZip(response.body);
        const zipContents = contents.getEntries();
        expect(response.headers['content-disposition']).to.match(/\d{8}.zip/);
        expect(zipContents.length).to.equal(1);
        expect(zipContents[0].entryName).to.equal('report.csv');
      }));
});
