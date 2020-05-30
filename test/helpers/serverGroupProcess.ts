import { spawn } from 'child_process'
import { join } from 'path'
import { once } from 'events'
import { Readable } from 'stream'
import mergeStream from 'merge-stream'
import splitStream from 'split'
// @ts-ignore
import { Config } from '../..'
import { killProcessTree } from '../../src/util/killProcessTree'

export interface ServerGroupProcess {
  output: string[]
  ready: Promise<void>
  kill(): Promise<void>
}

export class ServerGroupProcessExitedError extends Error {
  message = 'ServerGroupProcessExitedError'
}

export function createServerGroupProcess(
  port: number,
  config: Config
): ServerGroupProcess {
  const env = {
    ...process.env,
    PORT: String(port),
    CONFIG: JSON.stringify(config),
  }
  const script = join(__dirname, '../fixtures/server-group.js')
  const proc = spawn('node', [script], { env })
  const outputStream = (mergeStream([
    proc.stdout.setEncoding('utf8').pipe(splitStream()),
    proc.stderr.setEncoding('utf8').pipe(splitStream()),
  ]) as unknown) as Readable
  outputStream.on('data', line => console.log(line))
  const output: string[] = []
  outputStream.on('data', line => output.push(line))
  let didExit = false
  const exited: Promise<any> = once(outputStream, 'end').then(() => {
    didExit = true
  })
  let killedPromise: Promise<void> | null = null
  const kill = function killChildProcess(): Promise<void> {
    if (!killedPromise) {
      killedPromise = Promise.resolve().then(async () => {
        if (!didExit) {
          await killProcessTree(proc.pid)
        }
        await exited
      })
    }
    return killedPromise
  }
  const ready: Promise<void> = new Promise((resolve, reject) => {
    outputStream.on('end', () => reject(new ServerGroupProcessExitedError()))
    outputStream.on('data', line => {
      if (line.match(/^\$manager +\| Ready$/)) {
        resolve()
      }
    })
  })
    .catch(async error => {
      await kill()
      throw error
    })
    .then(() => {})
  return { output, ready, kill }
}

export async function getReadyServerGroupProcess(
  port: number,
  config: Config
): Promise<ServerGroupProcess> {
  const proc = createServerGroupProcess(port, config)
  await proc.ready
  return proc
}
