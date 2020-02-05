const async = require('async')
const fs = require('fs')
const casimir = global.casimir
const storage = casimir.storage
const logger = casimir.logger
const EventEmitter = require('events').EventEmitter
EventEmitter.defaultMaxListeners = 0

const Seeder = function (properties) {
  logger.info('Seeder: properties =', properties)
  this.seedBulkSize = parseInt(properties.seedBulkSize, 10)
  this.seedBulkIntervalInMs = parseInt(properties.seedBulkIntervalInMs, 10)
  this.fromTorrentHash = properties.fromTorrentHash
  this.handler = casimir.handler
}

Seeder.prototype.seed = function () {
  // start marker for seeding can be given either from properties (file or environment variable) or last saved (as .txt file)
  const marker = this.fromTorrentHash ? (this.fromTorrentHash + '.dam') : null
  if (!marker && fs.existsSync('./localdata/marker.txt')) {
    marker = fs.readFileSync('./localdata/marker.txt', 'utf8')
  }
  async.forever((next) => {
    let done = false // did we iterate over all our storage keys
    let totalIndex = 0
    async.whilst(() => { return !done },
      (callback) => {
        storage.listKeys({ maxKeys: this.seedBulkSize, marker: marker }, (err, res) => {
          if (err) return callback(err)
          const keys = res.keys
          done = res.done
          fs.writeFileSync('./localdata/marker.txt', keys[0])
          logger.info('Seeding keys ' + totalIndex + ' - ' + (totalIndex + res.keys.length))
          logger.info('marker =', keys[0])
          marker = done ? null : keys[keys.length - 1]
          async.eachOf(keys, (key, index, cb) => {
            const torrentHash
            index += totalIndex
            async.waterfall([
              (cb) => {
                logger.debug('Getting file from S3, file name: ', key, ' - #', index)
                storage.getFile(key, cb)
              }, (data, cb) => {
                if (!data || !data.Body) {
                  return cb(new Error('get_file_from_s3: no data'))
                }
                logger.debug('Got file from S3, file name: ', key, ' - #', index)
                data = JSON.parse(data.Body.toString())
                this.handler.addMetadata(data, cb)
              }, (result, cb) => {
                torrentHash = result.torrentHash.toString('hex')
                logger.debug('Added file to BitTorrent network, torrentHash: ', torrentHash, ' - #', index)
                this.handler.shareMetadata(torrentHash, cb)
              }, (result, cb) => {
                logger.debug('Started seeding, torrentHash: ', torrentHash, ' - #', index)
                setTimeout(cb, this.seedBulkIntervalInMs)
              }, (cb) => {
                logger.debug('Remove torrent, torrentHash: ', torrentHash, ' - #', index)
                // stop seeding current files (otherwise they'll keep open I\O connections and re-announce)
                this.handler.removeMetadata(torrentHash, cb)
              }
            ], (err) => {
              if (err) {
                logger.error('Error while seeding torrentHash: ', err)
                return cb(err)
              }
              logger.debug('Finished for torrentHash: ', torrentHash, ' - #', index)
              cb()
            })
          }, (err) => {
            totalIndex += this.seedBulkSize
            callback(err)
          })
        })
      }, (err) => {
        if (err) {
          logger.error('Error received while seeding: ', err)
        } else {
          logger.info('Finished all metadata files Round-robin, starting over.')
        }
        next()
      }
    )
  })
}

module.exports = Seeder
