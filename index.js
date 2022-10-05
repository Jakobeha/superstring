let binding

try {
  binding = require('./build/Release/superstring.node')
} catch (e1) {
  try {
    binding = require('./build/Debug/superstring.node')
  } catch (e2) {
    throw e1
  }
}

const {TextBuffer, TextWriter, TextReader} = binding

TextBuffer.prototype.load = function (source, options, progressCallback) {
  if (typeof options !== 'object') {
    progressCallback = options
    options = {}
  }

  const computePatch = options.patch === false ? false : true
  const discardChanges = options.force === true ? true : false
  const encoding = normalizeEncoding(options.encoding || 'UTF-8')

  return new Promise((resolve, reject) => {
    const completionCallback = (error, result) => {
      error ? reject(error) : resolve(result)
    }

    if (typeof source === 'string') {
      const filePath = source
      this._load(
        completionCallback,
        progressCallback,
        discardChanges,
        computePatch,
        filePath,
        encoding
      )
    } else {
      const stream = source
      const writer = new TextWriter(encoding)
      stream.on('data', (data) => writer.write(data))
      stream.on('error', reject)
      stream.on('end', () => {
        writer.end()
        this._load(
          completionCallback,
          progressCallback,
          discardChanges,
          computePatch,
          writer
        )
      })
    }
  })
}

TextBuffer.prototype.save = function (destination, encoding = 'UTF8') {
  const CHUNK_SIZE = 10 * 1024

  encoding = normalizeEncoding(encoding)

  return new Promise((resolve, reject) => {
    if (typeof destination === 'string') {
      const filePath = destination
      this._save(filePath, encoding, (error) => {
        error ? reject(error) : resolve()
      })
    } else {
      const stream = destination
      const reader = new TextReader(this, encoding)
      const buffer = Buffer.allocUnsafe(CHUNK_SIZE)
      writeToStream(null)

      stream.on('error', (error) => {
        reader.destroy()
        reject(error)
      })

      function writeToStream () {
        const bytesRead = reader.read(buffer)
        if (bytesRead > 0) {
          stream.write(buffer.slice(0, bytesRead), (error) => {
            if (!error) writeToStream()
          })
        } else {
          stream.end(() => {
            reader.end()
            resolve()
          })
        }
      }
    }
  })
}

TextBuffer.prototype.find = function (pattern) {
  return this.findInRange(pattern, null)
}

TextBuffer.prototype.findInRange = function (pattern, range) {
  return new Promise((resolve, reject) => {
    this._find(pattern, (error, result) => {
      error ? reject(error) : resolve(result.length > 0 ? interpretRange(result) : null)
    }, range)
  })
}

TextBuffer.prototype.findAll = function (pattern) {
  return this.findAllInRange(pattern, null)
}

TextBuffer.prototype.findAllInRange = function (pattern, range) {
  return new Promise((resolve, reject) => {
    this._findAll(pattern, (error, result) => {
      error ? reject(error) : resolve(interpretRangeArray(result))
    }, range)
  })
}

TextBuffer.prototype.findSync = function (pattern) {
  return this.findInRangeSync(pattern, null)
}

TextBuffer.prototype.findInRangeSync = function (pattern, range) {
  const result = this._findSync(pattern, range)
  return result.length > 0 ? interpretRange(result) : null
}

TextBuffer.prototype.findAllSync = function (pattern) {
  return interpretRangeArray(this._findAllSync(pattern, null))
}

TextBuffer.prototype.findAllInRangeSync = function (pattern, range) {
  return interpretRangeArray(this._findAllSync(pattern, range))
}

TextBuffer.prototype.findWordsWithSubsequence = function (query, extraWordCharacters, maxCount) {
  return this.findWordsWithSubsequenceInRange(query, extraWordCharacters, maxCount, {
    start: {row: 0, column: 0},
    end: this.getExtent()
  })
}

TextBuffer.prototype.findWordsWithSubsequenceInRange = function (query, extraWordCharacters, maxCount, range) {
  return new Promise(resolve =>
    this._findWordsWithSubsequenceInRange(query, extraWordCharacters, maxCount, range, (matches, positions) => {
      if (!matches) {
        resolve(null)
        return
      }

      let positionArrayIndex = 0
      for (let i = 0, n = matches.length; i < n; i++) {
        let positionCount = positions[positionArrayIndex++]
        matches[i].positions = interpretPointArray(positions, positionArrayIndex, positionCount)
        positionArrayIndex += 2 * positionCount
      }
      resolve(matches)
    })
  )
}

TextBuffer.prototype.baseTextMatchesFile = function (source, encoding = 'UTF8') {
  return new Promise((resolve, reject) => {
    const callback = (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    }

    if (typeof source === 'string') {
      this._baseTextMatchesFile(callback, source, encoding)
    } else {
      const stream = source
      const writer = new TextWriter(encoding)
      stream.on('data', (data) => writer.write(data))
      stream.on('error', reject)
      stream.on('end', () => {
        writer.end()
        this._baseTextMatchesFile(callback, writer)
      })
    }
  })
}

function interpretPointArray (rawData, startIndex, pointCount) {
  const points = []
  for (let i = 0; i < pointCount; i++) {
    points.push({row: rawData[startIndex++], column: rawData[startIndex++]})
  }
  return points
}

function interpretRangeArray (rawData) {
  const rangeCount = rawData.length / 4
  const ranges = new Array(rangeCount)
  let rawIndex = 0
  for (let rangeIndex = 0; rangeIndex < rangeCount; rangeIndex++) {
    ranges[rangeIndex] = interpretRange(rawData, rawIndex)
    rawIndex += 4
  }
  return ranges
}

function interpretRange (rawData, index = 0) {
  return {
    start: {
      row: rawData[index],
      column: rawData[index + 1]
    },
    end: {
      row: rawData[index + 2],
      column: rawData[index + 3]
    }
  }
  }

function normalizeEncoding(encoding) {
  return encoding.toUpperCase()
    .replace(/[^A-Z\d]/g, '')
    .replace(/^(UTF|UCS|ISO|WINDOWS|KOI8|EUC)(\w)/, '$1-$2')
    .replace(/^(ISO-8859)(\d)/, '$1-$2')
    .replace(/^(SHIFT)(\w)/, '$1_$2')
}

module.exports = {
  TextBuffer: binding.TextBuffer,
  Patch: binding.Patch,
  MarkerIndex: binding.MarkerIndex,
}
