import { encode, decode } from 'https://cdn.jsdelivr.net/npm/cborg/+esm'
import { runTestCases, getNpmVersion } from './test.js'

function clone (input) {
  const t1 = performance.now()
  const buffer = encode(input)
  const t2 = performance.now()
  const result = decode(buffer)
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

getNpmVersion('cborg')
