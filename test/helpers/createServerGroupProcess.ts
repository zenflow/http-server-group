import { spawn /*, ChildProcess*/ } from 'child_process'
import { join } from 'path'
// import { once } from 'events'
import treeKill from 'tree-kill'
// @ts-ignore
import { Config } from '../..'
import { waitUntilFree, waitUntilUsed } from 'tcp-port-used'

export interface ServerGroupProcess {
  destroy(): Promise<void>
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
  for (const stream of [proc.stdout, proc.stderr]) {
    stream.on('data', line => console.log(line.toString('utf8')))
  }
  let destroyedPromise: Promise<void> | null = null
  const destroy = function destroyChildProcess(): Promise<void> {
    if (!destroyedPromise) {
      destroyedPromise = treeKillP(proc.pid).then(() =>
        /* Note on windows the following waitUntilFree call will resolve immediately, & is not really necessary.
        It seems this is because having no diff between SIGINT & SIGKILL [on windows] the first/only signal is like SIGKILL. */
        waitUntilFree(port, 100, 5000)
      )
    }
    return destroyedPromise
  }
  // TODO: assert `server[].port`s
  try {
    await waitUntilUsed(port, 100, 5000)
  } catch (error) {
    await destroy()
    throw error
  }
  return { destroy }
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
