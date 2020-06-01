import {
  getServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'
/*
function getFailureConfig(
  errorType: 'EXIT_PRE_START' | 'EXIT_POST_START'
): Config {
  return {
    servers: [
      {
        label: 'a',
        env: { [errorType]: '1', DELAY: '500' },
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
 */

function getFailureConfig(
  failureEnv: { [key: string]: string },
  basicEnv: { [key: string]: string } = {}
): Config {
  return {
    servers: [
      {
        label: 'a',
        env: failureEnv,
        command: ['node', 'test/fixtures/server-node-failure.js'],
        port: 3001,
        paths: ['/a'],
      },
      {
        label: 'b',
        env: basicEnv,
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
  describe('exits when any server exits', () => {
    // TODO: it('before any server comes up')
    // TODO: it('after that server comes up but before all servers are up')
    it('before that server comes up', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_PRE_START: '1', EXIT_DELAY: '500' })
      )
      const started = await Promise.race([
        proc.ready.then(() => true),
        proc.exited.then(() => false),
      ])
      expect(started).toBe(false)
      await proc.exited
      expect(proc.output.includes('a      | [ERR] EXIT_PRE_START')).toBe(true)
    })
    it('after all servers are up', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_POST_START: '1', EXIT_DELAY: '500' })
      )
      const started = await Promise.race([
        proc.ready.then(() => true),
        proc.exited.then(() => false),
      ])
      expect(started).toBe(true)
      await proc.exited
      expect(proc.output.includes('a      | [ERR] EXIT_POST_START')).toBe(true)
    })
  })
})
