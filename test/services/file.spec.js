const azure = require('azure-storage');
const { Readable } = require('stream');

const { createBlobServiceSuccess, createBlobServiceError } = require('../test-helpers');
const fileService = require('../../server/services/file');


describe('FileService', () => {
  let service;

  before(() => {
    service = fileService();
  });
  describe('.todaysFile', () => {
    it("returns the today's file", async () => {
      const entry = {
        name: 'foo.zip',
        lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
        exists: true,
      };
      const blobService = createBlobServiceSuccess(entry);
      const stub = sinon.stub(azure, 'createBlobService').callsFake(blobService);

      const file = await service.todaysFile();

      expect(file.name).to.equal('foo.zip');
      expect(file.lastModified).to.equal('Tue, 24 Apr 2018 17:39:38 GMT');

      stub.restore();
    });

    it('returns null when there is no file', async () => {
      const entry = { exists: false };
      const blobService = createBlobServiceSuccess(entry);
      const stub = sinon.stub(azure, 'createBlobService').callsFake(blobService);
      const file = await service.todaysFile();

      expect(file).to.equal(null);

      stub.restore();
    });

    it('returns null when there is an error', async () => {
      const blobService = createBlobServiceError();
      const stub = sinon.stub(azure, 'createBlobService').callsFake(blobService);
      const file = await service.todaysFile();

      expect(file).to.equal(null);

      stub.restore();
    });
  });

  describe('.downloadFile', () => {
    describe('When the requested file is available for download', () => {
      it('returns readable stream', () => {
        const blobService = createBlobServiceSuccess();

        const stub = sinon.stub(azure, 'createBlobService').callsFake(blobService);

        const stream = service.downloadFile('foo.zip');

        expect(stream).to.be.an.instanceof(Readable);

        stub.restore();
      });
    });
  });
});
