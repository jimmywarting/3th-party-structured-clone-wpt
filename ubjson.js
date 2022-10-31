import x from 'https://cdn.jsdelivr.net/npm/@shelacek/ubjson/dist/ubjson.js/+esm'
import { runTestCases, getNpmVersion } from './test.js'

function clone (input) {
  const t1 = performance.now()
  const buffer = x.encode(input)
  const t2 = performance.now()
  const result = x.decode(buffer)
  const t3 = performance.now()

  return {
    buffer: buffer,
    result: result,
    encodeTime: t2 - t1,
    decodeTime: t3 - t2,
    totalTime : t3 - t1,
    encodedSize: buffer.byteLength
  }
}

runTestCases(clone)
getNpmVersion('@shelacek/ubjson')