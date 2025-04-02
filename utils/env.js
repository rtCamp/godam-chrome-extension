// tiny wrapper with default env vars
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  GODAM_BASE_URL: process.env.GODAM_BASE_URL || 'https://frappe-transcoder-api.rt.gw',
  GODAM_UPLOAD_URL: process.env.GODAM_UPLOAD_URL || 'https://godam-upload.rt.gw'
};
