import mapStreamAsync from 'map-stream'
import { Duplex } from 'stream'

export function assert(value: any, message: string) {
  if (!value) {
    throw new Error(`http-server-group: ${message}`)
  }
}

export function mapStream(mapper: (arg0: string) => string): Duplex {
  return mapStreamAsync((string: string, cb: Function) =>
    cb(null, mapper(string))
  )
}

export function rightPad(string: string, length: number) {
  let result = string
  while (result.length < length) {
    result += ' '
  }
  return result
}
