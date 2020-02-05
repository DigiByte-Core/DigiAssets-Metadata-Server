const S3Storage = require('./s3-storage')
const MinioStorage = require('./minio-storage')

const Storage = function (properties) {
  if (properties.storage.type === 's3') {
    const accessKeyId = properties.AWS.accessKeyId
    const secretAccessKey = properties.AWS.secretAccessKey
    const bucket = properties.AWS.S3bucket

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Missing parameters for AWS S3 storage')
    }

    this.s3Client = new S3Storage({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      bucket: bucket
    })
  } else if (properties.storage.type === 'minio') {
    const accessKey = properties.MINIO.accessKey
    const secretKey = properties.MINIO.secretKey
    const bucket = properties.MINIO.miniobucket
    const endPoint = properties.MINIO.endPoint
    const minioPort = properties.MINIO.minioPort
    const minioSSL = properties.MINIO.minioSSL

    if (!accessKey || !secretKey || !bucket || !endPoint || !minioSSL || !minioPort) {
      throw new Error('Missing parameters for MINIO storage')
    }

    this.minioClient = new MinioStorage({
      accessKey: accessKey,
      secretKey: secretKey,
      bucket: bucket,
      endPoint: endPoint,
      minioPort: Number(minioPort),
      minioSSL: minioSSL == 'false' ? false : true
    })
  }
}

Storage.prototype.listKeys = function (options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (this.s3Client) {
    return this.s3Client.listKeys(options, cb)
  } else if (this.minioClient) {
    return this.minioClient.listKeys(options, cb)
  }
  throw new Error('Storage type not configured')
}

Storage.prototype.saveFile = function (file, filename, cb) {
  if (this.s3Client) {
    return this.s3Client.saveFile(file, filename, cb)
  } else if (this.minioClient) {
    return this.minioClient.saveFile(file, filename, cb)
  }
  throw new Error('Storage type not configured')
}

Storage.prototype.getFile = function (filename, cb) {
  if (this.s3Client) {
    return this.s3Client.getFile(filename, cb)
  } else if (this.minioClient) {
    return this.minioClient.getFile(filename, cb)
  }
  throw new Error('Storage type not configured')
}

module.exports = Storage
