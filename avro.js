import avro from 'https://cdn.jsdelivr.net/npm/avsc/etc/browser/avsc.js/+esm'
import { getNpmVersion, runTestCases  } from './test.js'


function clone (input) {
  const t1 = performance.now()
  const type = avro.Type.forValue(input)
  const buffer = type.toBuffer(input)
  const t2 = performance.now()
  const result = type.fromBuffer(buffer)
  const t3 = performance.now()

  return {
    buffer: buffer,
    result,
    encodeTime: t2 - t1,
    decodeTime: t3 - t2,
    totalTime : t3 - t1,
    encodedSize: buffer.byteLength
  }
}

runTestCases(clone)

getNpmVersion('avsc')