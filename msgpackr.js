import { Packr, encode, decode } from 'https://cdn.jsdelivr.net/npm/msgpackr/index.js/+esm'
import { runTestCases, getNpmVersion } from './test.js'

const packr = new Packr({
  bundleStrings: true,
  pack: true,
  moreTypes: true,
  structuredClone: true,
  // useFloat32: true
  copyBuffers: true,
  // sequential: true
})


function clone (input) {
  const t1 = performance.now()
  const buffer = packr.encode(input)
  const t2 = performance.now()
  const result = packr.decode(buffer)
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

getNpmVersion('msgpackr')