import SuperJSONatural from 'https://cdn.jsdelivr.net/npm/superjsonatural/+esm'
import { runTestCases, getNpmVersion } from './test.js'

const json = SuperJSONatural()
function clone(val) {
  const t1 = performance.now()
  const uint8 = json.pack(val)
  const t2 = performance.now()
  const result = json.unpack(uint8)
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
getNpmVersion('superjsonatural')
