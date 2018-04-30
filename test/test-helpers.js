const fs = require('fs');
const { Readable } = require('stream');
const path = require('path');

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
  return () => ({
    doesBlobExist: (containerName, blobName, callback) => callback(null, entry),
    createReadStream: () => fs.createReadStream(path.resolve(__dirname, './resources/20181704.zip')),
  });
}

function createBlobServiceError() {
  return () => ({
    doesBlobExist: (containerName, blobName, callback) => callback('error', null),
    createReadStream: () => new Readable({
      read() {
        process.nextTick(() => this.emit('error', 'some error'));
      },
    }),
  });
}


module.exports = {
  binaryParser,
  createBlobServiceSuccess,
  createBlobServiceError,
};
