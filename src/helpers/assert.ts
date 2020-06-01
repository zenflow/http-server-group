export function assert(value: any, message: string) {
  if (!value) {
    throw new Error(`http-server-group: ${message}`)
  }
}
