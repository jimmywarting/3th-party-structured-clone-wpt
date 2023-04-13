import { sia, desia, Sia, DeSia, constructors } from 'https://cdn.jsdelivr.net/npm/sializer/+esm'
import { runTestCases, getNpmVersion } from './test.js'

function clone (input) {
  const t1 = performance.now()
  const buffer = sia(input)
  const t2 = performance.now()
  const result = desia(buffer)
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

getNpmVersion('sializer')
