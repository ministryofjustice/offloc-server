const azure = require('azure');
const azureStorage = require('azure-storage');
const { Readable } = require('stream');

const { createBlobServiceSuccess, createBlobServiceError } = require('../test-helpers');
const fileService = require('../../server/services/file');
const azureLocal = require('../../server/services/azure-local');

describe('FileService', () => {
  let service;
  let azureLocalStub;
  let azureStub;

  before(() => {
    azureLocalStub = sinon.stub(azureLocal, 'createBlobStorageCredentials').returns(null);
    azureStub = sinon.stub(azure, 'createStorageManagementClient').callsFake(() => ({
      storageAccounts: {
        listKeys: sinon.stub().returns({ keys: [{ value: 'foo' }] }),
      },
    }));
    service = fileService();
  });

  after(() => {
    azureLocalStub.restore();
    azureStub.restore();
  });

  describe('.todaysFile', () => {
    it("returns the today's file", async () => {
      const entry = {
        name: 'foo.zip',
        lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
        exists: true,
      };
      const blobService = createBlobServiceSuccess(entry);
      const stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);

      const file = await service.todaysFile();

      expect(file.name).to.equal('foo.zip');
      expect(file.lastModified).to.equal('Tue, 24 Apr 2018 17:39:38 GMT');

      stub.restore();
    });

    it('returns null when there is no file', async () => {
      const entry = { exists: false };
      const blobService = createBlobServiceSuccess(entry);
      const stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
      const file = await service.todaysFile();

      expect(file).to.equal(null);

      stub.restore();
    });

    it('returns null when there is an error', async () => {
      const blobService = createBlobServiceError();
      const stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);
      const file = await service.todaysFile();

      expect(file).to.equal(null);

      stub.restore();
    });
  });

  describe('.downloadFile', () => {
    describe('When the requested file is available for download', () => {
      it('returns readable stream', async () => {
        const blobService = createBlobServiceSuccess();

        const stub = sinon.stub(azureStorage, 'createBlobService').callsFake(blobService);

        const stream = await service.downloadFile('foo.zip');

        expect(stream).to.be.an.instanceof(Readable);

        stub.restore();
      });
    });
  });
});
