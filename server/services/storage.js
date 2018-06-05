const msRestAzure = require('ms-rest-azure');
const azureStorage = require('azure-storage');
const StorageManagementClient = require('azure-arm-storage');

const subDays = require('date-fns/sub_days');
const subMonths = require('date-fns/sub_months');
const format = require('date-fns/format');
const getDate = require('date-fns/get_date');

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
    listFiles: listFiles(service),
  };
}

function listFiles(service) {
  return async () => {
    const date = new Date();
    const dateToday = getDate(date);
    const prefix = format(date, 'YYYYMM');

    if (dateToday < 15) {
      const lastMonth = subMonths(date, 1);
      const lastMonthPrefix = format(lastMonth, 'YYYYMM');

      const [lastMonthBlobs, thisMonthsBlobs] = await Promise.all([
        getBlobsByPrefix(service, lastMonthPrefix),
        getBlobsByPrefix(service, prefix),
      ]);

      return getFilesWithinLast14DaysIn([...lastMonthBlobs, ...thisMonthsBlobs]);
    }

    const blobs = await getBlobsByPrefix(service, prefix);

    return getFilesWithinLast14DaysIn(blobs);
  };
}

function getBlobsByPrefix(service, prefix) {
  return new Promise((resolve, reject) => {
    service.listBlobsSegmentedWithPrefix(
      config.azureBlobStorageContainerName,
      prefix,
      null,
      (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data.entries);
        }
      },
    );
  });
}

function getFilesNamesInTheLast(daysLeft, date = new Date(), dates = []) {
  if (daysLeft === 0) return dates;

  const previousDay = subDays(date, 1);
  const fileName = format(previousDay, 'YYYYMMDD.zip');

  return getFilesNamesInTheLast(daysLeft - 1, previousDay, [...dates, fileName]);
}

function getFilesWithinLast14DaysIn(fileList) {
  const filesInTheLast14Days = getFilesNamesInTheLast(14);

  return filesInTheLast14Days
    .filter(fileName => !!fileList.find(file => file.name === fileName))
    .map(name => ({ name }));
}

function todaysFileName() {
  return format(new Date(), 'YYYYMMDD.zip');
}


function todaysFile(service) {
  return () => new Promise((resolve) => {
    const blobName = todaysFileName();

    logger.debug({ todaysFile: blobName }, 'Fetching todays file');

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
