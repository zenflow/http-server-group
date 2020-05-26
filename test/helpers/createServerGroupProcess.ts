import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import treeKill from 'tree-kill'
// @ts-ignore
import { Config } from '../..'

export interface ServerGroupProcess {
  destroy(): Promise<void>
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
  for (const stream of [proc.stdout, proc.stderr]) {
    stream.on('data', line => console.log(line.toString('utf8')))
  }
  const destroy = getChildProcessDestroyer(proc)
  return { destroy }
}

function getChildProcessDestroyer(proc: ChildProcess) {
  let destroyedPromise: Promise<void> | null = null
  return function destroyChildProcess(): Promise<void> {
    if (!destroyedPromise) {
      destroyedPromise = treeKillP(proc.pid)
    }
    return destroyedPromise
  }
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
