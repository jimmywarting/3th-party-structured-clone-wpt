const { structuredClone } = await import('https://cdn.jsdelivr.net/npm/structured-clone-polyfill/dist/index.mjs')
const { runTestCases, getNpmVersion } = await import('./test.js')

runTestCases(function clone(input) {
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
})

getNpmVersion('structured-clone-polyfill')