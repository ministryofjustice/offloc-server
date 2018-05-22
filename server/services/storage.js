const msRestAzure = require('ms-rest-azure');
const azureStorage = require('azure-storage');
const StorageManagementClient = require('azure-arm-storage');

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

async function createBlobServiceClient(blobServiceClient) {
  let service;

  if (!blobServiceClient) {
    const resourceGroup = config.azureBloStorageResourceGroup;
    const accountName = config.azureBlobStorageAccountName;
    const subscriptionId = config.azureBlobStorageSubscriptionId;
    const containerName = config.azureBlobStorageContainerName;
    const permissions = 'r';
    const startDate = new Date().toUTCString();
    const endDate = addHoursToTime(new Date(), 1).toUTCString();
    const credentials = await getStorageCredentials();
    const client = new StorageManagementClient(credentials, subscriptionId);

    const { keys } =
      await client
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

    service = azureStorage.createBlobService(connectionString);
  } else {
    service = blobServiceClient;
  }

  return {
    downloadFile: downloadFile(service),
    todaysFile: todaysFile(service),
  };
}

// eslint-disable-next-line no-unused-vars
function listFiles(service) {
  return new Promise((resolve, reject) => {
    service.listBlobsSegmented(config.azureBlobStorageContainerName, null, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

function todaysFileName() {
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
}


function todaysFile(service) {
  const blobName = todaysFileName();

  logger.debug({ todaysFile: blobName }, 'Fetching todays file');

  return () => new Promise((resolve) => {
    service.doesBlobExist(config.azureBlobStorageContainerName, blobName, (error, result) => {
      if (error) logger.error(error);

      if (result && result.exists) {
        logger.debug({ todaysFile: blobName }, 'Found today\'s file');

        return resolve(result);
      }
      logger.debug({ todaysFile: blobName }, 'Today\'s file not found');
      return resolve(null);
    });
  });
}

function downloadFile(service) {
  return async (blobName) => {
    const downloadOptions = { useTransactionalMD5: true, parallelOperationThreadCount: 5 };

    logger.debug({ file: blobName }, 'Downloading file');

    return service
      .createReadStream(config.azureBlobStorageContainerName, blobName, downloadOptions);
  };
}


module.exports = createBlobServiceClient;
