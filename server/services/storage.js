const { DefaultAzureCredential } = require('@azure/identity');
const { StorageManagementClient } = require('@azure/arm-storage');
const { BlobServiceClient } = require('@azure/storage-blob');

const subDays = require('date-fns/sub_days');
const subMonths = require('date-fns/sub_months');
const format = require('date-fns/format');
const getDate = require('date-fns/get_date');

const config = require('../config');
const logger = require('../loggers/logger');

function addHoursToTime(date, hours) {
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));

  return date;
}

function getStorageCredentials() {
  if (config.appSettingsWebsiteSiteName) {
    return new DefaultAzureCredential();
  }

  throw new Error('Cannot retrieve storage credentials - must run inside App Service');
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
    const credentials = getStorageCredentials();
    const client = new StorageManagementClient(credentials, subscriptionId);

    const { keys } = await client
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

    service = BlobServiceClient.fromConnectionString(connectionString)
      .getContainerClient(containerName);
  } else {
    service = blobServiceClient;
  }

  return {
    getFileProperties: getFileProperties(service),
    downloadFile: downloadFile(service),
    todaysFile: todaysFile(service),
    listFiles: listFiles(service),
  };
}

function getFileProperties(service) {
  return async (blobName) => service.getBlobClient(blobName).getProperties()
    .catch((error) => {
      logger.error(`Error fetching properties for blob: ${blobName}`, error);
      return null;
    });
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

async function getBlobsByPrefix(service, prefix) {
  const blobs = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const blob of service.listBlobsFlat({ prefix })) {
    blobs.push(blob);
  }
  return blobs;
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
    .filter((fileName) => !!fileList.find((file) => file.name === fileName))
    .map((name) => ({ name }));
}

function todaysFileName() {
  return format(new Date(), 'YYYYMMDD.zip');
}

function todaysFile(service) {
  return async () => {
    const blobName = todaysFileName();
    const exists = await service.getBlobClient(blobName)
      .exists()
      .catch((error) => {
        logger.error('Error checking for file existence', error);
        return false;
      });

    logger.debug({ todaysFile: blobName }, exists ? 'Found today\'s file' : 'Today\'s file not found');
    return exists ? blobName : null;
  };
}

function downloadFile(service) {
  return async (blobName) => {
    logger.debug({ file: blobName }, 'Downloading file');
    const download = await service.getBlobClient(blobName).download();
    return download.readableStreamBody;
  };
}

module.exports = createBlobServiceClient;
