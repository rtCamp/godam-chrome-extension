// tiny wrapper with default env vars
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  GODAM_BASE_URL: process.env.GODAM_BASE_URL || 'https://app.godam.io',
  GODAM_UPLOAD_URL: process.env.GODAM_UPLOAD_URL || 'https://upload.godam.io',
  GODAM_OAUTH_CLIENT_ID: process.env.GODAM_OAUTH_CLIENT_ID || 'npicmvego1',
  GODAM_OAUTH_CLIENT_SECRET: process.env.GODAM_OAUTH_CLIENT_SECRET || '9151955431',
};
