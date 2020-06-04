export function assert(value: any, message: string) {
  if (!value) {
    throw new Error(`composite-http-server: ${message}`)
  }
}
