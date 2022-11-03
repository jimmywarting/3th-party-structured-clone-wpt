import cbor from 'https://cdn.jsdelivr.net/npm/cbor-x/dist/index.js/+esm'
import { runTestCases, getNpmVersion } from './test.js'

const encoder = new cbor.Encoder({
  structuredClone: true,
  pack: true,
  mapsAsObjects: true
})

function clone (input) {
  const t1 = performance.now()
  const buffer = encoder.encode(input)
  const t2 = performance.now()
  const result = cbor.decode(buffer)
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

getNpmVersion('cbor-x')
