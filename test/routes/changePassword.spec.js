const request = require('supertest');
const express = require('express');
const path = require('path');
const createChangePasswordRouter = require('../../server/routes/index');


const router = createChangePasswordRouter({ storageService: storageService() });

const app = express();
app.set('views', path.join(__dirname, '../../server/views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
  res.locals.version = 'foo';
  next();
});
app.use(router);

describe('GET /', () => {
  const entry = {
    name: '20180418.zip',
    lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
    exists: true,
  };
  let azureLocalStub;
  let azureStub;

  before(() => {
    azureLocalStub = sinon.stub(azureLocal, 'createBlobStorageCredentials').returns(null);
    azureStub = sinon.stub(azure, 'createStorageManagementClient').callsFake(() => ({
      storageAccounts: {
        listKeys: sinon.stub().returns({ keys: [{ value: 'foo' }] }),
      },
    }));
  });

  after(() => {
    azureLocalStub.restore();
    azureStub.restore();
  });

  describe('when there is a file available for download', () => {
    let stub;

    beforeEach(() => {
      const blobService = createBlobServiceSuccess(entry);
      stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
    });

    afterEach(() => {
      stub.restore();
    });

    it('respond with a page displaying a file to download', () =>
      request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('<td>20180418.zip</td>');
        }));
  });

  describe('when there isn\'t file available for download', () => {
    let stub;

    beforeEach(() => {
      const blobService = createBlobServiceError();
      stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
    });

    afterEach(() => {
      stub.restore();
    });

    it('respond with a page displaying the corresponding message', () =>
      request(app)
        .get('/')
        .expect('Content-Type', /text\/html/)
        .expect(200)
        .then((response) => {
          expect(response.text).to.include('No files found for download.');
        }));
  });

  describe('Successful download request', () => {
    let stub;

    beforeEach(() => {
      const blobService = createBlobServiceSuccess(entry);
      stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
    });

    afterEach(() => {
      stub.restore();
    });

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
          expect(zipContents.length).to.equal(1);
          expect(zipContents[0].entryName).to.equal('report.csv');
        }));
  });

  describe('Unsuccessful download request', () => {
    let stub;

    beforeEach(() => {
      const blobService = createBlobServiceError();
      stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
    });

    afterEach(() => {
      stub.restore();
    });

    it('returns a 404 when an error occurs with the download', () =>
      request(app)
        .get('/20180418.zip')
        .expect('Content-Type', /text\/html/)
        .expect(404)
        .then((response) => {
          expect(response.text).to.include('could not be found.');
        }));
  });
});
