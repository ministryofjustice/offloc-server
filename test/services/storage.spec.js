const { Readable } = require('stream');

const { createBlobServiceSuccess, createBlobServiceError } = require('../test-helpers');
const storageService = require('../../server/services/storage');

describe('storageService', () => {
  describe('.todaysFile', () => {
    it("returns the today's file", async () => {
      const entry = {
        name: 'foo.zip',
        lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
        exists: true,
      };

      const service = await storageService(createBlobServiceSuccess(entry));
      const file = await service.todaysFile();

      expect(file.name).to.equal('foo.zip');
      expect(file.lastModified).to.equal('Tue, 24 Apr 2018 17:39:38 GMT');
    });

    it('returns null when there is no file', async () => {
      const entry = { exists: false };
      const service = await storageService(createBlobServiceSuccess(entry));
      const file = await service.todaysFile();

      expect(file).to.equal(null);
    });

    it('returns null when there is an error', async () => {
      const service = await storageService(createBlobServiceError());
      const file = await service.todaysFile();

      expect(file).to.equal(null);
    });
  });

  describe('.downloadFile', () => {
    describe('When the requested file is available for download', () => {
      it('returns readable stream', async () => {
        const service = await storageService(createBlobServiceSuccess());

        const stream = await service.downloadFile('foo.zip');

        expect(stream).to.be.an.instanceof(Readable);
      });
    });
  });
});
