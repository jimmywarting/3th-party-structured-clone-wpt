import { encode, toObject} from 'https://cdn.jsdelivr.net/npm/flatbuffers/mjs/flexbuffers.js/+esm'
import { runTestCases, getNpmVersion } from './test.js'

function clone(val) {
  const t1 = performance.now()
  const uint8 = encode(val)
  const t2 = performance.now()
  const result = toObject(uint8.buffer)
  const t3 = performance.now()

  return {
    buffer: uint8,
    result: result,
    encodeTime: t2 - t1,
    decodeTime: t3 - t2,
    totalTime : t3 - t1,
    encodedSize: uint8.byteLength
  }
}

runTestCases(clone)
getNpmVersion('flatbuffers')