import { serialize, deserialize } from 'https://jspm.dev/structured-clone'
import { runTestCases, getNpmVersion } from './test.js'

function clone(value) {
  const t1 = performance.now()
  const buffer = serialize(value)
  const t2 = performance.now()
  const result = deserialize(buffer)
  const t3 = performance.now()

  return {
    buffer: buffer,
    result: result,
    encodeTime: t2 - t1,
    decodeTime: t3 - t2,
    totalTime: t3 - t1,
    encodedSize: buffer.byteLength,
  }
}

runTestCases(clone)

getNpmVersion('structured-clone')