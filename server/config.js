const production = process.env.NODE_ENV === 'production';

function get(name, fallback, options = {}) {
  if (process.env[name]) {
    return process.env[name];
  }
  if (fallback !== undefined && (!production || !options.requireInProduction)) {
    return fallback;
  }
  throw new Error(`Missing env var ${name}`);
}

module.exports = {
  dev: !production,
  port: get('PORT', 3000, { requireInProduction: true }),
  staticResourceCacheDuration: production ? 24 * 3600 * 1000 : 0, // 24 hours
  passwordExpirationDuration: get('PASSWORD_EXPIRATION_MS', 90 * 24 * 3600 * 1000), // 90 days
  appInsightsKey: get('APPINSIGHTS_INSTRUMENTATIONKEY', 'your-app-insights-key', { requireInProduction: true }),
  azureBlobStorageContainerName: get('AZURE_STORAGE_CONTAINER_NAME', 'cde'),
  azureBlobStorageAccountName: get('AZURE_STORAGE_ACCOUNT_NAME', 'your-account-name', { requireInProduction: true }),
  azureBloStorageResourceGroup: get('AZURE_STORAGE_RESOURCE_GROUP', 'your-resource-group', { requireInProduction: true }),
  azureBlobStorageSubscriptionId: get('AZURE_STORAGE_SUBSCRIPTION_ID', 'your-key', { requireInProduction: true }),
  keyVaultUrl: get('KEY_VAULT_URL', 'your-key', { requireInProduction: true }),

  /**
   * The APPSETTING_WEBSITE_SITE_NAME is a default environment variable provided by Azure App
   * Service:
   *
   * https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings?tabs=kudu%2Cdotnet#app-environment
   */
  appSettingsWebsiteSiteName: get('APPSETTING_WEBSITE_SITE_NAME', null, { requireInProduction: true }),
};
