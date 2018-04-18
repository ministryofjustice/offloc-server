const fileService = require('../../server/services/file');

describe('FileService', () => {
  it('returns the latest filename', () => {
    const service = fileService();

    expect(service.getLatestFileName()).to.match(/\d{4}\d{2}\d{2}.zip/);
  });
});
