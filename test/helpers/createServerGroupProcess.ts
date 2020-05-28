import { spawn /*, ChildProcess*/ } from 'child_process'
import { join } from 'path'
import { once } from 'events'
import treeKill from 'tree-kill'
import mergeStream from 'merge-stream'
import splitStream from 'split'
// @ts-ignore
import { Config } from '../..'

export interface ServerGroupProcess {
  destroy(): Promise<void>
  output: string[]
}

export async function createServerGroupProcess(
  port: number,
  config: Config
): Promise<ServerGroupProcess> {
  const env = {
    ...process.env,
    PORT: String(port),
    CONFIG: JSON.stringify(config),
  }
  const script = join(__dirname, '../fixtures/server-group.js')
  const proc = spawn('node', [script], { env })
  const outputStream = mergeStream([
    proc.stdout.setEncoding('utf8').pipe(splitStream()),
    proc.stderr.setEncoding('utf8').pipe(splitStream()),
  ])
  let destroyedPromise: Promise<void> | null = null
  const destroy = function destroyChildProcess(): Promise<void> {
    if (!destroyedPromise) {
      destroyedPromise = Promise.all([
        once(outputStream, 'end'),
        treeKillP(proc.pid),
      ]).then(() => {})
    }
    return destroyedPromise
  }
  const result: ServerGroupProcess = { destroy, output: [] }
  outputStream.on('data', line => {
    console.log(line)
    result.output.push(line)
  })
  const readyPromise: Promise<void> = new Promise((resolve, reject) => {
    outputStream.on('error', error => reject(error))
    outputStream.on('end', () =>
      reject(new Error('Server process exited without becoming ready'))
    )
    outputStream.on('data', line => {
      if (line.match(/^\$manager +\| Ready$/)) {
        resolve()
      }
    })
  })
  await readyPromise
  return result
}

function treeKillP(pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    treeKill(pid, 'SIGINT', error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}
