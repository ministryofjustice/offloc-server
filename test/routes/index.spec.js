const request = require('supertest');
const express = require('express');
const path = require('path');
const createIndexRouter = require('../../server/routes/index');


const fileService = { getLatestFileName: () => '20180418.zip' };
const logger = { info: sinon.spy() };

const router = createIndexRouter({ fileService, logger });

const app = express();
app.set('views', path.join(__dirname, '../../server/views'));
app.set('view engine', 'ejs');
app.get('/', router);


describe('GET /', () => {
  it('respond with a page displaying a file to download', () =>
    request(app)
      .get('/')
      .expect('Content-Type', /text\/html/)
      .expect(200)
      .then((response) => {
        expect(response.text).to.include('<td>20180418.zip</td>');
      }));
});
