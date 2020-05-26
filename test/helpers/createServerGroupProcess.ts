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
  const script = join(__dirname, '../fixtures/server-group.js')
  const proc = spawn('node', [script], { env })
  for (const stream of [proc.stdout, proc.stderr]) {
    stream.on('data', line => console.log(line.toString('utf8')))
  }
  await waitUntilUsed(port, 100, 5000)
  const destroy = async () => {
    const finished = Promise.all([
      once(proc, 'exit'),
      once(proc.stdout, 'close'),
      once(proc.stderr, 'close'),
    ])
    proc.kill('SIGTERM')
    proc.stdout.destroy()
    proc.stderr.destroy()
    await finished
  }
  return { destroy }
}
