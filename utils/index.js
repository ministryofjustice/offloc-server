/* eslint-disable consistent-return */

const fs = require('fs');
const { dirname } = require('path');
const mkdirp = require('mkdirp');

module.exports.isExpired = function isExpired(dateTimeString) {
  const expiryTime = new Date(dateTimeString);
  const currentTime = new Date();
  const diff = currentTime - expiryTime;

  return diff >= 0;
};

module.exports.recordBuildInfoTo = function recordBuildInfoTo(target, contents, callback) {
  writeFile(target, JSON.stringify(contents, null, 2), callback);
};

function writeFile(path, contents, callback) {
  mkdirp(dirname(path), (err) => {
    if (err) return callback(err);

    fs.writeFile(path, contents, callback);
  });
}
