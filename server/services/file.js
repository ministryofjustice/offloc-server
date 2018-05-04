const azure = require('azure');
const msRestAzure = require('ms-rest-azure');
const azureStorage = require('azure-storage');

const config = require('../config');
const logger = require('../loggers/logger');
const azureLocal = require('./azure-local');


function addHoursToTime(date, hours) {
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));

  return date;
}

function getStorageCredentials() {
  if (config.appSettingsWebsiteSiteName) {
    return msRestAzure.loginWithAppServiceMSI();
  }

  return azureLocal.createBlobStorageCredentials(config.azureBlobStorageSubscriptionId);
}

async function createBlobServiceClient() {
  const credentials = await getStorageCredentials();
  const resourceGroup = 'offloc-stage';
  const accountName = 'offlocstagestorage';
  const subscriptionId = config.azureBlobStorageSubscriptionId;
  const containerName = config.azureBlobStorageContainerName;
  const permissions = 'rwd';
  const startDate = new Date().toUTCString();
  const endDate = addHoursToTime(new Date(), 1).toUTCString();

  const { keys } = await azure
    .createStorageManagementClient(credentials, subscriptionId)
    .storageAccounts
    .listKeys(
      resourceGroup,
      accountName,
      {
        canonicalizedResource: `/blob/${accountName}/${containerName}`,
        resource: 'b',
        permissions,
        sharedAccessStartTime: startDate,
        sharedAccessExpiryTime: endDate,
      },
    );

  const key = keys[0].value;
  const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${key};EndpointSuffix=core.windows.net`;
  const client = azureStorage.createBlobService(connectionString);

  return client;
}

// eslint-disable-next-line no-unused-vars
const listFiles = async () => {
  const blobService = await createBlobServiceClient();

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


const todaysFile = async () => {
  const blobService = await createBlobServiceClient();
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

const downloadFile = async (blobName) => {
  const blobService = await createBlobServiceClient();
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
