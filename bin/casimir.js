const jwt = require('jwt-simple')
const path = require('path')
const casimirCore = require('casimircore')()
const properties = casimirCore.properties(path.join(__dirname, '/../config/'))

properties.torrent.seedBulkSize = process.env.SEED_BULK_SIZE || properties.torrent.seedBulkSize
properties.torrent.seedBulkIntervalInMs = process.env.SEED_BULK_INTERVAL_MS || properties.torrent.seedBulkIntervalInMs
properties.torrent.seed = process.env.SEED || properties.torrent.seed
properties.torrent.fromTorrentHash = process.env.FROM_TORRENT_HASH || properties.torrent.fromTorrentHash
properties.storage.type = process.env.storageType || properties.storage.storageType
properties.AWS.accessKeyId = process.env.AWS_ACCESS_KEY_ID || properties.AWS.accessKeyId
properties.AWS.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || properties.AWS.secretAccessKey
properties.AWS.S3bucket = process.env.AWS_S3_BUCKET || properties.AWS.S3bucket
properties.MINIO.accessKey = process.env.accessKey || properties.MINIO.accessKey
properties.MINIO.secretKey = process.env.secretKey || properties.MINIO.secretKey
properties.MINIO.miniobucket = process.env.miniobucket || properties.MINIO.miniobucket
properties.MINIO.endPoint = process.env.endPoint || properties.MINIO.endPoint
properties.MINIO.minioPort = process.env.minioPort || properties.MINIO.minioPort
properties.MINIO.minioSSL = process.env.minioSSL || properties.MINIO.minioSSL

const logSettings = {
  level: properties.log && properties.log.level,
  logentries_api_key: properties.log && properties.log.logentries_api_key,
  log_dir: path.join(__dirname, '/../app/log')
}

const logger = global.logger = casimirCore.logger(logSettings)
// Log console.log to logger.debug
console.log = logger.info
// Log console.error to logger.error
console.error = logger.error
// Log console.warn to logger.warn
console.warn = logger.warn

// //////// Routes Files /////// //
const routesDir = path.join(__dirname, '/../routes/')

const Storage = require(path.join(__dirname, '/../app/modules/storage.js'))
const storage = new Storage(properties)

const verifyCallback = function (jwtToken, req, res, next) {
  if (!properties.JWT.jwtTokenSecret) {
    return next()
  }
  try {
    const decoded = jwt.decode(jwtToken, properties.JWT.jwtTokenSecret)
    const expiration = Date.parse(decoded.exp)
    if (expiration > Date.now()) {
      req.user = decoded.iss
    }
  } catch (e) {
    // decoding failed, no req.user
  }
  next()
}

const accessCallback = function (req, res, next) {
  if (!properties.JWT.jwtTokenSecret) {
    return next() // if no JWT secret is provided, consider this a public end-point
  }
  next(['Unauthorized', 401])
}

const authentication = casimirCore.authentication(verifyCallback, accessCallback)

let requestid
let requestSettings
if (properties.JWT.jwtTokenSecret) {
  requestSettings = {
    secret: properties.JWT.jwtTokenSecret,
    namespace: properties.server.name
  }
  requestid = casimirCore.request_id(requestSettings)
}

// Add custom framwork modules for server
properties.modules = {
  router: casimirCore.router(routesDir, path.join(__dirname, '/../app/controllers/'), authentication),
  error: casimirCore.error(properties.ENV.type),
  logger: logger
}
if (requestid) {
  properties.modules.requestid = requestid
}

// handle relative path issue when running globally
properties.server.favicon = properties.server.favicon && path.join(__dirname, '..', properties.server.favicon)
properties.engine.view_folder = properties.engine.view_folder && path.join(__dirname, '..', properties.engine.view_folder)
properties.engine.static_folder = properties.engine.static_folder && path.join(__dirname, '..', properties.engine.static_folder)

// Set server and server port
const server = casimirCore.server(properties)

module.exports = {
  server: server,
  logger: logger,
  properties: properties,
  authentication: authentication,
  storage: storage
}
