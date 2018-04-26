const azure = require('azure-storage');
const config = require('../config');
const logger = require('../loggers/logger');

// eslint-disable-next-line no-unused-vars
const listFiles = () => {
  const blobService = azure.createBlobService(config.azureStorageConnectionString);

  return new Promise((resolve, reject) => {
    blobService.listBlobsSegmented(config.azureBlobStorageContainerName, null, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const todaysFileName = () => {
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();

  if (day < 10) {
    day = `0${day}`;
  }

  if (month < 10) {
    month = `0${month}`;
  }

  return `${year}${month}${day}.zip`;
};


const todaysFile = () => {
  const blobService = azure.createBlobService(config.azureStorageConnectionString);
  const blobName = todaysFileName();

  return new Promise((resolve) => {
    blobService.doesBlobExist(config.azureBlobStorageContainerName, blobName, (error, result) => {
      if (error) logger.error(error);

      if (result && result.exists) {
        return resolve(result);
      }

      return resolve(null);
    });
  });
};

const downloadFile = (blobName) => {
  const blobService = azure.createBlobService(config.azureStorageConnectionString);
  const downloadOptions = { useTransactionalMD5: true, parallelOperationThreadCount: 5 };

  return blobService
    .createReadStream(config.azureBlobStorageContainerName, blobName, downloadOptions);
};


module.exports = function fileService() {
  return {
    downloadFile,
    todaysFile,
  };
};
