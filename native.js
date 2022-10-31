import { runTestCases  } from './test.js'

function clone (input) {
  const t1 = performance.now()
  const result = structuredClone(input)
  const t3 = performance.now()

  return {
    buffer: null,
    result: result,
    encodeTime: NaN,
    decodeTime: NaN,
    totalTime : t3 - t1,
    encodedSize: NaN
  }
}

runTestCases(clone)