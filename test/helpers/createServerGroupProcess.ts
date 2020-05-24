import { spawn } from 'child_process'
import { join } from 'path'
import { once } from 'events'
// @ts-ignore
import { Config } from '../..'
import { waitUntilUsed } from 'tcp-port-used'

export async function createServerGroupProcess(port: number, config: Config) {
  const command = `node ${join(__dirname, '../fixtures/server-group.js')}`
  const env = {
    ...process.env,
    PORT: String(port),
    CONFIG: JSON.stringify(config),
  }
  const proc = spawn(command, { shell: true, env })
  for (const stream of [proc.stdout, proc.stderr]) {
    stream.on('data', line => console.log(line.toString('utf8')))
  }
  await waitUntilUsed(port, 100, 5000)
  const destroy = async () => {
    const finished = once(proc, 'exit')
    proc.kill()
    await finished
  }
  return { destroy }
}
