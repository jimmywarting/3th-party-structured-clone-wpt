import { BSON } from 'https://cdn.jsdelivr.net/npm/bson@5.0.0/lib/bson.min.mjs'
import { getNpmVersion, runTestCases  } from './test.js'

function clone (val) {
  val = {val} // Must always be a object...
  const t1 = performance.now()
  const buffer = BSON.serialize(val)
  const t2 = performance.now()
  const result = BSON.deserialize(buffer)
  const t3 = performance.now()

  return {
    buffer: buffer,
    result: result.val,
    encodeTime: t2 - t1,
    decodeTime: t3 - t2,
    totalTime : t3 - t1,
    encodedSize: buffer.byteLength
  }
}

runTestCases(clone)


getNpmVersion('bson')