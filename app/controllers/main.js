var casimir = global.casimir
var handler = casimir.handler
var logger = casimir.logger
var storage = casimir.storage

handler.on('error', (err) => {
  logger.error(err)
})

const getMetadata = function (req, res, next) {
  storage.getFile(req.data.torrentHash + '.dam', (err, data, t) => {
    if (!err) return res.send(JSON.parse(data.Body.toString()))
    logger.error('getMetadata - err = ', err)
    handler.getMetadata(req.data.torrentHash, req.data.sha2, (err, metadata) => {
      if (err) {
        logger.error('getMetadata - err = ', err)
        return next(['Can\'t get metadata, probably there is no file', 400])
      }
      try {
        const file = JSON.stringify(metadata)
        storage.saveFile(file, req.data.torrentHash + '.dam', function (err, data) {
          if (err) logger.error(err)
          else logger.info('Saved File')
        })
      } catch (e) {
        logger.error('getMetadata - e = ', e)
        return next(['Can\'t get metadata', 400])
      }
      return res.send(metadata)
    })
  })
}

const addMetadata = function (req, res, next) {
  handler.addMetadata(req.data.metadata, (err, result) => {
    if (err) return next(err)
    try {
      const file = JSON.stringify(req.data.metadata)
      storage.saveFile(file, result.torrentHash.toString('hex') + '.dam', (err, data) => {
        if (err) return next(err)
        return res.send(JSON.stringify({
          torrentHash: result.torrentHash.toString('hex'),
          sha2: result.sha2.toString('hex')
        }))
      })
    } catch (e) {
      logger.error('addMetadata - e = ', e)
      return next(['Can\'t add metadata', 400])
    }
  })
}

var shareMetadata = function (req, res, next) {
  handler.shareMetadata(req.data.torrentHash, (err) => {
    if (err) {
      logger.error('shareMetadata - err = ', err)
      return next(['Can\'t share metadata', 400])
    }
    logger.info('shareMetadata:', req.data.torrentHash)
    return res.sendStatus(200)
  })
}

var isRunning = function (req, res, next) {
  if (casimir.running) {
    res.send('OK')
  } else {
    next('Not running')
  }
}

module.exports = {
  getMetadata: getMetadata,
  addMetadata: addMetadata,
  shareMetadata: shareMetadata,
  isRunning: isRunning
}
