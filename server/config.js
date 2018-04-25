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
  staticResourceCacheDuration: production ? 864000000 : 0,
  appinsightsKey: get('APPINSIGHTS_INSTRUMENTATIONKEY', 'your-app-insights-key', { requireInProduction: true }),
};
