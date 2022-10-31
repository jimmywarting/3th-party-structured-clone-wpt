
try {
  const root = await navigator.storage.getDirectory()
  globalThis.dirHandle = await root.getDirectoryHandle('structured-clone-bench', { create: true })
  globalThis.fileHandle = await root.getFileHandle('results.json', { create: true })
} catch (err) {
  console.error(err)
}

class TestRunner {
  #cloneFn
  #assertions = []
  #results = []
  #cloneResult
  #fn
  #errored

  constructor(cloneFn) {
    this.#cloneFn = cloneFn
  }

  assert(assertFn) {
    this.#assertions.push(assertFn)
    return this
  }

  runAssertions() {
    this.#assertions.forEach(assertFn => {
      try {
        if (this.#errored) throw this.#cloneResult
        const result = assertFn(this.#cloneResult.result, this.input)
        if (result === false) throw false
        this.#results.push({ ok: true })
      } catch (e) {
        this.#results.push({
          ok: false,
          message: e
        })
      }
    })
    // console.info('input', this.input)
    // console.info('output', this.#cloneResult)
    // console.info('assertions', this.#assertions.length)
    // console.info('results', this.#results.map(e => e.ok ?? e.message))
  }

  clone(fn) {
    this.#fn = fn.toString()
      // Only get the fn body
      .substring(fn.toString().indexOf('{') + 1, fn.toString().lastIndexOf('}')).trim()
    const tap = input => {
      this.input = input
      let t = performance.now()
      try {
        this.#cloneResult = this.#cloneFn(input)
      } catch (e) {
        this.#cloneResult = e
        this.#errored = true
      }
      this.time = performance.now() - t
      return this
    }
    fn(tap)
    return this
  }

  toJSON() {
    const assertionFns = this.#assertions
      .map(fn => fn.toString())
      .map(fn => fn.replace(/^(function\s*\w*\s*\(\w*\)\s*\{|\})$/g, ''))
      .map(fn => fn.split('\n').map(s => s.split('=>').slice(1).join('').trim()).join('\n'))

    return {
      input: this.input,
      output: this.#cloneResult,
      results: this.#results,
      time: this.time,
      fn: this.#fn,
      assertionFns
    }
  }
}

/**
 * Returns
 * encode time
 * - avg encode time in ms
 * - longest encode time in ms
 * - shortest encode time in ms
 * - total encode time in ms
 * decode
 * - avg decode time in ms
 * - longest decode time in ms
 * - shortest decode time in ms
 * total
 * - avg total time in ms
 * - longest total time in ms
 * - shortest total time in ms
 * - total time in ms
 * size
 * @param {*} structuredClone
 * @param {*} sampleData
 */
function benchTest(structuredClone, sampleData) {
  const result = []
  const runs = 1000
  for (let i = 0; i < runs; i++) {
    const {decodeTime, encodeTime, totalTime} = structuredClone(sampleData)
    result.push({decodeTime, encodeTime, totalTime})
  }
  const { encodedSize } = structuredClone(sampleData)

  const encodeTimes = result.map(e => e.encodeTime)
  const decodeTimes = result.map(e => e.decodeTime)
  const totalTimes = result.map(e => e.totalTime)
  return {
    name: globalThis.name,
    encode: {
      avg: encodeTimes.reduce((a, b) => a + b) / encodeTimes.length,
      longest: Math.max(...encodeTimes),
      shortest: Math.min(...encodeTimes),
      total: encodeTimes.reduce((a, b) => a + b)
    },
    decode: {
      avg: decodeTimes.reduce((a, b) => a + b) / decodeTimes.length,
      longest: Math.max(...decodeTimes),
      shortest: Math.min(...decodeTimes),
      total: decodeTimes.reduce((a, b) => a + b)
    },
    total: {
      avg: totalTimes.reduce((a, b) => a + b) / totalTimes.length,
      longest: Math.max(...totalTimes),
      shortest: Math.min(...totalTimes),
      total: totalTimes.reduce((a, b) => a + b)
    },
    size: encodedSize
  }
}

/** @param {string} pkg */
export async function getNpmVersion(pkg) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/${pkg}/package.json`)
  const v = await res.json().then(json => json.version)

  postMessage({
    type: 'npm-version',
    version: v,
    pkg
  })
}

export function runTestCases (clone) {
  globalThis.addEventListener('message', ({data, ports}) => {
    if (data.type === 'bench') {
      const results = benchTest(clone, data.sampleData)
      ports[0].postMessage(results)
    }
  })
  // console.groupCollapsed('test results')
  for (const [heading, test] of Object.entries(testCases)) {
    // console.group(heading)
    for (const [name, fn] of Object.entries(test).reverse()) {
      // console.groupCollapsed(name)
      const runner = new TestRunner(clone)
      runner.clone(fn)
      runner.runAssertions()
      postMessage({
        type: 'test',
        heading,
        name,
        ...runner.toJSON()
      })
      // console.groupEnd()
    }
    // console.groupEnd()
  }
  // console.groupEnd()
}

export const testCases = {
  'Nullish': {},
  'Strings': {},
  'Numbers': {},
  'BigInt': {},
  'Objects': {
    'property order matter': clone => {
      var input = {
        asc: { a: 1, b: 2, c: 3 },
        desc: { c: 3, b: 2, a: 1 }
      }

        clone(input)
          .assert(clone => Object.keys(clone.asc).join('') === 'abc')
          .assert(clone => Object.keys(clone.desc).join('') === 'cba')
    }
  },
  'Object Literals': {},
  'Arrays': {
    'Array property order matter': clone => {
      var input = [
        { a: 1, b: 2, c: 3 },
        { c: 3, b: 2, a: 1 }
      ]

      clone(input)
        .assert(clone => Object.keys(clone[0]).join('') === 'abc')
        .assert(clone => Object.keys(clone[1]).join('') === 'cba')
    }
  },
  'TypedArrays': {},
  'ArrayBuffers': {
    'ArrayBuffers are shared': clone => {
      var buffer = new ArrayBuffer(8)
      var input = [
        new Uint8Array(buffer),
        new Uint8Array(buffer, 4),
      ]

      clone(input)
        .assert(([a, b]) => a !== b)
        .assert(([a, b]) => a.buffer === b.buffer)
    }
  },
  'Dates': {},
  'Blobs': {},
  'Files': {},
  'Maps': {},
  'Sets': {},
  'Errors': {},
  'ImageBitmap': {},
  'Regular Expressions': {},
  'Circular Refs': {
    'var input = {}; input.input = input': clone => {
      var input = {}; input.input = input
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone.input === clone)
        .assert(clone => clone.input.input === clone)
    },
    'var input = [], input[0] = input': clone => {
      var input = []; input[0] = input
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone)
        .assert(clone => clone[0][0] === clone)
    },
    'var input = Array(2).fill({})': clone => {
      var input = Array(2).fill({})
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
    },
    'var a = {}, input = {a: a, b: a}': clone => {
      var a = {}, input = {a: a, b: a}
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone.a === clone.b)
        .assert(clone => clone.a !== input.a)
    },
    'var a = {}, b = {}, input = [a, b, a, b]': clone => {
      var a = {}, b = {}, input = [a, b, a, b]
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[2])
        .assert(clone => clone[1] === clone[3])
        .assert(clone => clone[0] !== input[0])
        .assert(clone => clone[1] !== input[1])
    },
    'var input = Array(2).fill(new Date)': clone => {
      var input = Array(2).fill(new Date)
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
    },
    'var input = Array(2).fill(new ArrayBuffer)': clone => {
      var input = Array(2).fill(new ArrayBuffer)
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
    },
    'var input = Array(2).fill(new Uint8Array())': clone => {
      var ta = new Uint8Array(), input = [ta, ta]
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
    },
    'var input = Array(2).fill(/a/)': clone => {
      var re = /a/, input = [re, re]
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
    },
    'var input = Array(2).fill(new String(""))': clone => {
      var input = Array(2).fill(new String(""))
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
        .assert(clone => typeof clone[0] === 'object')
        .assert(clone => clone[0].valueOf() === "")
    },
    'var input = Array(2).fill(new Number(2))': clone => {
      var input = Array(2).fill(new Number(2))
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
        .assert(clone => typeof clone[0] === 'object')
        .assert(clone => clone[0].valueOf() === 2)
    },
    'var input = Array(2).fill(new Boolean(true))': clone => {
      var input = Array(2).fill(new Boolean(true))
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
        .assert(clone => typeof clone[0] === 'object')
        .assert(clone => clone[0].valueOf() === true)
    },
    'var input = Array(2).fill(new BigInt(2n))': clone => {
      var input = Array(2).fill(Object(2n))
      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone[0] === clone[1])
        .assert(clone => clone[0] !== input[0])
        .assert(clone => typeof clone[0] === 'object')
        .assert(clone => clone[0].valueOf() === 2n)
    }
  },
  'Misc': {
    'ImageData': clone => {
      var input = new ImageData(1, 1)
      input.data[0] = 255

      clone(input)
        .assert(clone => clone.data[0] === 255)
        .assert(clone => clone !== input)
        .assert(clone => clone.data !== input.data)
        .assert(clone => clone.data.buffer !== input.data.buffer)
        .assert(clone => clone.data.buffer.byteLength === input.data.buffer.byteLength)
        .assert(clone => clone.data.buffer.byteLength === 4)
        .assert(clone => clone.width === input.width)
        .assert(clone => clone.height === input.height)
        .assert(clone => clone instanceof ImageData)
    },
    'ImageBitmap': clone => {
      var input = new OffscreenCanvas(1, 1).getContext('2d').canvas.transferToImageBitmap()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof ImageBitmap)
        .assert(clone => clone.width === input.width)
        .assert(clone => clone.height === input.height)
    },
    'DOMMatrix': clone => {
      var input = new DOMMatrix()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMMatrix)
        .assert(clone => clone.a === input.a)
        .assert(clone => clone.b === input.b)
        .assert(clone => clone.c === input.c)
        .assert(clone => clone.d === input.d)
        .assert(clone => clone.e === input.e)
        .assert(clone => clone.f === input.f)
    },
    'DOMMatrixReadOnly': clone => {
      var input = new DOMMatrixReadOnly()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMMatrixReadOnly)
        .assert(clone => clone.a === input.a)
        .assert(clone => clone.b === input.b)
        .assert(clone => clone.c === input.c)
        .assert(clone => clone.d === input.d)
        .assert(clone => clone.e === input.e)
        .assert(clone => clone.f === input.f)
    },
    'DOMPoint': clone => {
      var input = new DOMPoint()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMPoint)
        .assert(clone => clone.x === input.x)
        .assert(clone => clone.y === input.y)
        .assert(clone => clone.z === input.z)
        .assert(clone => clone.w === input.w)
    },
    'DOMPointReadOnly': clone => {
      var input = new DOMPointReadOnly()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMPointReadOnly)
        .assert(clone => clone.x === input.x)
        .assert(clone => clone.y === input.y)
        .assert(clone => clone.z === input.z)
        .assert(clone => clone.w === input.w)
    },
    'DOMQuad': clone => {
      var input = new DOMQuad()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMQuad)
        .assert(clone => clone.p1.x === input.p1.x)
        .assert(clone => clone.p1.y === input.p1.y)
        .assert(clone => clone.p2.x === input.p2.x)
        .assert(clone => clone.p2.y === input.p2.y)
        .assert(clone => clone.p3.x === input.p3.x)
        .assert(clone => clone.p3.y === input.p3.y)
        .assert(clone => clone.p4.x === input.p4.x)
        .assert(clone => clone.p4.y === input.p4.y)
    },
    'DOMRect': clone => {
      var input = new DOMRect()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMRect)
        .assert(clone => clone.x === input.x)
        .assert(clone => clone.y === input.y)
        .assert(clone => clone.width === input.width)
        .assert(clone => clone.height === input.height)
    },
    'DOMRectReadOnly': clone => {
      var input = new DOMRectReadOnly()

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof DOMRectReadOnly)
        .assert(clone => clone.x === input.x)
        .assert(clone => clone.y === input.y)
        .assert(clone => clone.width === input.width)
        .assert(clone => clone.height === input.height)
    },
    'FileSystemDirectoryHandle': clone => {
      var input = globalThis.dirHandle

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof FileSystemDirectoryHandle)
        .assert(clone => clone.name === input.name)
    },
    'FileSystemFileHandle': clone => {
      var input = globalThis.fileHandle

      clone(input)
        .assert(clone => clone !== input)
        .assert(clone => clone instanceof FileSystemFileHandle)
        .assert(clone => clone.name === input.name)
    }
  }
}

const now = '1666709071331';

[
  `-` + now, '-1e12', '-1e9', '-1e6', '-1e3',
  '0', 'NaN',
  '1e3', '1e6', '1e9', '1e12', '1e13', now
]
.forEach(v => testCases.Dates[`new Date(${v})`] = new Function('clone', `
var input = new Date(${v})
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof Date)
  .assert(clone => Object.is(clone.getTime(), ${v}))
`))

const numbers = [
  'NaN',
  'Number.EPSILON',
  '-Number.EPSILON',
  'Number.MAX_SAFE_INTEGER',
  'Number.MIN_SAFE_INTEGER',
  'Number.MIN_VALUE',
  '-Infinity',
  'Infinity',
  '-0xffffffff',
  '-0x80000000',
  '-0x7fffffff',
  '-2000',
  '-111.456',
  '-1',
  '-0',
  '0',
  '1',
  '111.456',
  '2000',
  '0x7fffffff',
  '0x80000000',
  '0xffffffff',
].forEach(v => testCases.Numbers[v.replace('Number.', '')] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => Object.is(clone, ${v}))
`))

const bigints = [
  '-111111111111111111111111111n', // extremely large above 64 bits
  '-12345678901234567890n', // Lowest negative int64
  '-9223372036n',
  '-1n',
  '0n',
  '1n',
  '9223372036n',
  '9223372036854775807n', // Highest positive int64
  '18446744073709551615n', // Highest positive Uint64
  '111111111111111111111111111n', // extremely large above 64 bits
]


bigints.forEach(v => testCases.BigInt[v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => clone === ${v})
`))

const Reg = [
'new RegExp()',
'/abc/',
'/abc/g',
'/abc/i',
'/abc/gi',
'/abc/m',
'/abc/mg',
'/abc/mi',
'/abc/mgi',
'/abc/gimsuy'
].forEach(v => {
  let res = eval(v)
  testCases['Regular Expressions'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof RegExp)
  .assert(clone => clone.source === '${res.source}')
  .assert(clone => clone.flags === '${res.flags}')
`)
})


// Array Buffer Views
const typedArrays = [
  'Uint8Array(new Uint8Array([0, 1, 2, 3, 4, 5]).buffer, 1, 3)',
  'Uint8Array([])',
  'Uint8Array([0, 1, 254, 255])',
  'Uint16Array([0x0000, 0x0001, 0xFFFE, 0xFFFF])',
  'Uint32Array([0x00000000, 0x00000001, 0xFFFFFFFE, 0xFFFFFFFF])',
  'Int8Array([0, 1, 254, 255])',
  'Int16Array([0x0000, 0x0001, 0xFFFE, 0xFFFF])',
  'Int32Array([0x00000000, 0x00000001, 0xFFFFFFFE, 0xFFFFFFFF])',
  'Uint8ClampedArray([0, 1, 254, 255])',
  'Float32Array([-Infinity, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, Infinity, NaN])',
  'Float64Array([-Infinity, -Number.MAX_VALUE, -Number.MIN_VALUE, 0, Number.MIN_VALUE, Number.MAX_VALUE, Infinity, NaN])'
]

typedArrays.forEach((v, i) => {
  const x = eval('new ' + v)
  testCases['TypedArrays'][`${v}`] = new Function('clone', `
var input = new ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof ${x.constructor.name})
  .assert(clone => clone.byteLength === ${x.byteLength})
  .assert(clone => clone.every((v, i) => Object.is(v, input[i])))
  .assert(clone => clone.byteOffset === ${x.byteOffset})
`)
})


// ArrayBuffer

const arrayBuffers = [
  'new ArrayBuffer(0)',
  'new Uint8Array([0, 1, 254, 255]).buffer',
]

arrayBuffers.forEach((v, i) => {
  const x = eval(v)
  testCases['ArrayBuffers'][`${v}`] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof ArrayBuffer)
  .assert(clone => clone.byteLength === ${x.byteLength})
`)
})


// Nullish
const nullish = [
  'null',
  'undefined',
]

nullish.forEach(v => {
  testCases['Nullish'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => Object.is(clone, ${v}))
`)
})

// Strings

const strings = [
  '""',
  '"primitive string"',
  '"this is a sample string"',
  '"null(\\x00)"',
  '"\\x00\\x00null\\x00\\x00"',
];

strings.forEach(v => {
  testCases['Strings'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => clone === input)
`)
})

// Arrays

const Arrays = {
  '[]': '[]',
  '[1, 2, 3]': '[1, 2, 3]',
  '[1, ,3]': '[1, ,3]',
  'Sparse Array - Array(100)': 'Array(100)',
  'Array with added properties': "Object.assign(['foo', 'bar'], {a: 'hello world', '': null})"
}

for (let [name, value] of Object.entries(Arrays)) {
testCases['Arrays'][name] = new Function('clone', `
var input = ${value}
var keys = ${JSON.stringify(Object.keys(eval(value)))}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => Array.isArray(clone))
  .assert(clone => clone.length === ${eval(value).length})
  .assert(clone => Object.keys(clone).length === ${Object.keys(eval(value)).length})
  .assert(clone => keys.every(key => key in clone && clone[key] === input[key]))
`)}

// Objects

const objects = [
  "{a: 'b'}",
  "{a: 1}",
  "{'': null}",
  "{'': ''}",
  "{'': undefined}",
  "{'': 0}",
  "{' ': 0}",
  "{'': false}",
  "{'\\x00': '\\x00'}",
]

objects.forEach(v => {
  testCases['Objects'][v] = new Function('clone', `
var input = ${v}
var keys = ${JSON.stringify(Object.keys(eval(`(${v})`)))}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof Object)
  .assert(clone => Object.keys(clone).length === ${Object.keys(eval(`(${v})`)).length})
  .assert(clone => keys.every(key => key in clone && clone[key] === input[key]))
`)
})

// Object literals

const objectLiterals = [
  'true',
  'false',
  '0',
  '1',
  '-1',
  '2n',
  '-2n',
  'NaN',
  '"string"',
]

objectLiterals.forEach(v => {
  testCases['Object Literals'][`Object(${v})`] = new Function('clone', `
var input = Object(${v})
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => typeof clone === 'object')
  .assert(clone => Object.getPrototypeOf(clone) === Object.getPrototypeOf(input))
  .assert(clone => Object.is(clone.valueOf(), ${v}))
`)
})

// Blobs

const blobs = [
  'new Blob(["Hello, world!"])',
  'new Blob(["Hello, world!"], {type: "text/plain"})',
]

blobs.forEach(v => {
  testCases['Blobs'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof Blob)
  .assert(clone => clone.type === input.type)
  .assert(clone => clone.size === input.size)
`)
})

// Files

const files = [
  'new File(["Hello, world!"], "hello.txt")',
  'new File(["Hello, world!"], "hello.txt", {type: "text/plain"})',
]

files.forEach(v => {
  testCases['Files'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof File)
  .assert(clone => clone.type === input.type)
  .assert(clone => clone.size === input.size)
  .assert(clone => clone.name === input.name)
`)
})

// Maps

const maps = [
  'new Map()',
  'new Map([["a", "b"]])',
  'new Map([["a", "b"], ["c", "d"]])',
  'new Map([[{}, "b"], [1, "d"]])',
]

maps.forEach(v => {
  testCases['Maps'][v] = new Function('clone', `
var input = ${v}
var firstExpectedType = typeof input.keys().next().value

clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof Map)
  .assert(clone => clone.size === input.size)
  .assert(clone => typeof clone.keys().next().value === firstExpectedType)
`)})

// Sets

const sets = [
  'new Set()',
  'new Set(["a", "b"])',
  'new Set(["a", "b", "c", "d"])',
  'new Set([{}, 1])',
]

sets.forEach(v => {
  testCases['Sets'][v] = new Function('clone', `
var input = ${v}
var firstExpectedType = typeof input.keys().next().value

clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof Set)
  .assert(clone => clone.size === input.size)
  .assert(clone => typeof clone.keys().next().value === firstExpectedType)
`)})

// Errors

const errors = [
  "new Error('Error')",
  "new EvalError('EvalError')",
  "new RangeError('RangeError')",
  "new ReferenceError('ReferenceError')",
  "new SyntaxError('SyntaxError')",
  "new TypeError('TypeError')",
  "new URIError('URIError')",
  "new DOMException('DOMException', 'AbortError')",
];

errors.forEach(v => {
  testCases['Errors'][v] = new Function('clone', `
var input = ${v}
clone(input)
  .assert(clone => input !== clone)
  .assert(clone => clone instanceof ${eval(v).constructor.name})
  .assert(clone => clone.name === input.name)
  .assert(clone => clone.message === input.message)
`)})