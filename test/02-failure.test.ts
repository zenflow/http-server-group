import {
  createServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

function getErrorConfig(
  errorType: 'EXIT_DURING_STARTUP' | 'EXIT_AFTER_STARTUP'
): Config {
  return {
    servers: [
      {
        label: 'a',
        env: { [errorType]: '1' },
        command: ['node', 'test/fixtures/server-node-failure.js'],
        port: 3001,
        paths: ['/a'],
      },
      {
        label: 'b',
        env: { KEY: 'b' },
        command: `node test/fixtures/server-node-basic.js`,
        port: 3002,
        paths: ['/b'],
      },
    ],
  }
}

describe('failure', () => {
  jest.setTimeout(30 * 1000)
  let proc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  it('exits if a server exits during startup', async () => {
    proc = createServerGroupProcess(3000, getErrorConfig('EXIT_DURING_STARTUP'))
    const started = await Promise.race([
      proc.ready.then(() => true),
      proc.exited.then(() => false),
    ])
    expect(started).toBe(false)
    await proc.exited
    expect(proc.output.includes('a      | [ERR] EXIT_DURING_STARTUP')).toBe(
      true
    )
  })
  it('exits if a server exits after startup', async () => {
    proc = createServerGroupProcess(3000, getErrorConfig('EXIT_AFTER_STARTUP'))
    const started = await Promise.race([
      proc.ready.then(() => true),
      proc.exited.then(() => false),
    ])
    expect(started).toBe(true)
    await proc.exited
    expect(proc.output.includes('a      | [ERR] EXIT_AFTER_STARTUP')).toBe(true)
  })
})
