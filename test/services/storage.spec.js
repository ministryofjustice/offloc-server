const { Readable } = require('stream');

const { createBlobServiceSuccess, createBlobServiceError } = require('../test-helpers');
const storageService = require('../../server/services/storage');

describe('storageService', () => {
  describe('.todaysFile', () => {
    it("returns the today's file", async () => {
      const entry = {
        name: 'foo.zip',
        lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
        contentLength: 390,
        exists: true,
      };

      const service = await storageService(createBlobServiceSuccess({ entry }));
      const file = await service.todaysFile();

      expect(file.name).to.equal('foo.zip');
      expect(file.lastModified).to.equal('Tue, 24 Apr 2018 17:39:38 GMT');
    });

    it('returns null when there is no file', async () => {
      const entry = { exists: false };
      const service = await storageService(createBlobServiceSuccess({ entry }));
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
        const entry = {
          name: '20181704.zip',
          lastModified: 'Tue, 24 Apr 2018 17:39:38 GMT',
          contentLength: 390,
          exists: true,
        };
        const service = await storageService(createBlobServiceSuccess({ entry }));

        const stream = await service.downloadFile('foo.zip');

        expect(stream).to.be.an.instanceof(Readable);
      });
    });
  });

  describe('.listFiles', () => {
    describe('when there are no file found in the last 14 days', () => {
      it('returns an empty list', async () => {
        const clock = sinon.useFakeTimers({
          now: 1524049200000, // Apr 18 2018
          shouldAdvanceTime: false,
        });
        const entries = [
          { name: '20180401.zip' },
          { name: '20180331.zip' },
          { name: '20180330.zip' },
          { name: '20180315.zip' },
        ];

        const service = await storageService(createBlobServiceSuccess({ entries }));
        const results = await service.listFiles();

        expect(results).to.eql([]);

        clock.restore();
      });
    });

    describe('when the current date is >= 15', () => {
      it('returns a list of files in the last 14 days of that month', async () => {
        const clock = sinon.useFakeTimers({
          now: 1524049200000, // Apr 18 2018
          shouldAdvanceTime: false,
        });
        const entries = [
          { name: '20180418.zip' },
          { name: '20180417.zip' },
          { name: '20180416.zip' },
          { name: '20180415.zip' },
        ];

        const service = await storageService(createBlobServiceSuccess({ entries }));
        const results = await service.listFiles();

        expect(results).to.eql([
          { name: '20180417.zip' },
          { name: '20180416.zip' },
          { name: '20180415.zip' },
        ]);

        clock.restore();
      });
    });

    describe('when the current date is < 15', () => {
      it('returns a list of files in the last 14 days of that month and the previous month', async () => {
        const clock = sinon.useFakeTimers({
          now: 1522753200000, // Apr 03 2018
          shouldAdvanceTime: false,
        });
        const entries = [
          { name: '20180402.zip' },
          { name: '20180401.zip' },
          { name: '20180331.zip' },
          { name: '20180330.zip' },
          { name: '20180315.zip' },
        ];

        const service = await storageService(createBlobServiceSuccess({ entries }));
        const results = await service.listFiles();

        expect(results).to.eql([
          { name: '20180402.zip' },
          { name: '20180401.zip' },
          { name: '20180331.zip' },
          { name: '20180330.zip' },
        ]);

        clock.restore();
      });
    });
  });
});
