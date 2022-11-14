const request = require('supertest');
const AdmZip = require('adm-zip');

const createIndexRouter = require('../../server/routes/index');
const storageService = require('../../server/services/storage');

const {
  createBlobServiceSuccess,
  createBlobServiceError,
  binaryParser,
  setupBasicApp,
} = require('../test-helpers');

const entry = {
  name: '20180418.zip',
  lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
  contentLength: 390,
  exists: true,
};

const entries = [
  { name: '20180417.zip' },
  { name: '20180416.zip' },
  { name: '20180415.zip' },
];

describe('GET /', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: 1524049200000, shouldAdvanceTime: false });
  });

  afterEach(() => {
    clock.restore();
  });
  describe('when there is a file available for download', () => {
    it('respond with a page displaying a file to download', async () => {
      const app = setupBasicApp();
      const service = await storageService(createBlobServiceSuccess({ entry }));

      app.use(createIndexRouter({
        storageService: service,
      }));

      return request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('<td>20180418.zip</td>');
        });
    });
  });

  describe('when there are files in the last 14 days available', () => {
    it('display files from the last 14 days', async () => {
      const app = setupBasicApp();
      const service = await storageService(createBlobServiceSuccess({ entries }));

      app.use(createIndexRouter({
        storageService: service,
      }));

      return request(app)
        .get('/historic-reports')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('<td>20180417.zip</td>');
          expect(response.text).to.include('<td>20180416.zip</td>');
          expect(response.text).to.include('<td>20180415.zip</td>');
        });
    });
  });

  describe('when there isn\'t file available for download', () => {
    it('respond with a page displaying the corresponding message', async () => {
      const app = setupBasicApp();
      const noEntries = {};
      const service = await storageService(createBlobServiceSuccess(noEntries));

      app.use(createIndexRouter({
        storageService: service,
      }));

      return request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('No files found for download.');
        });
    });
  });

  describe('Successful download request', () => {
    it('downloads the latest file available', async () => {
      const app = setupBasicApp();
      const service = await storageService(createBlobServiceSuccess({ entry }));

      app.use(createIndexRouter({
        storageService: service,
      }));

      return request(app)
        .get('/20180418.zip')
        .expect('Content-Type', /zip/)
        .expect('Content-Length', /390/)
        .expect(200)
        .buffer()
        .parse(binaryParser)
        .then((response) => {
          const contents = new AdmZip(response.body);
          const zipContents = contents.getEntries();
          expect(zipContents.length).to.equal(1);
          expect(zipContents[0].entryName).to.equal('report.csv');
        });
    });
  });

  describe('Unsuccessful download request', () => {
    it('returns a 404 when an error occurs with the download', async () => {
      const app = setupBasicApp();
      const service = await storageService(createBlobServiceError());

      app.use(createIndexRouter({
        storageService: service,
      }));

      return request(app)
        .get('/20180418.zip')
        .expect('Content-Type', /text\/html/)
        .expect(404)
        .then((response) => {
          expect(response.text).to.include('could not be found.');
        });
    });
  });
});
