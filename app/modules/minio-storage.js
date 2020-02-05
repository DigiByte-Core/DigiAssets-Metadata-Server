const Minio = require('minio')
const mime = require('mime')

const MinioStorage = function (properties) {
  this.bucket = properties.bucket
  this.minioClient = new Minio.Client({
    endPoint: properties.endPoint,
    port: properties.minioPort,
    useSSL: properties.minioSSL,
    accessKey: properties.accessKey,
    secretKey: properties.secretKey
  })
}

MinioStorage.prototype.listKeys = function (options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  const result = {
    done: true,
    keys: []
  }
  const stream = this.minioClient.listObjectsV2(this.bucket, '', true)
  stream.on('data', (obj) => {
    result.keys.push(obj.name)
  })
  stream.on('error', (err) => { return cb(err) })
  stream.on('end', () => {
    return cb(null, result)
  })
}

MinioStorage.prototype.saveFile = function (file, filename, cb) {
  const metaData = {
    'Content-Type': mime.lookup(filename),
  }  
  return this.minioClient.putObject(this.bucket, filename, file, cb)
}

MinioStorage.prototype.getFile = function (filename, cb) {
  return this.minioClient.getObject(this.bucket, filename, (err, stream) => {
    if (err) {
      return cb(err)
    }
    const bufs = []
    stream.on('data', (d) => { bufs.push(d) })
    stream.on('end', () => {
      const data  = {
        Body: Buffer.concat(bufs)
      }
      return cb(null, data)
    })
    stream.on('error', (err) => {
      return cb(err)
    })
  })
}

module.exports = MinioStorage