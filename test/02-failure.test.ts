import {
  getServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

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
    // TODO: it('after that server comes up but before all servers are up')
    it('before any server comes up', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_PRE_START: '1' }, { START_DELAY: '500' })
      )
      const started = await Promise.race([
        proc.ready.then(() => true),
        proc.exited.then(() => false),
      ])
      expect(started).toBe(false)
      const initialOutput = proc.output.splice(0)
      expect(initialOutput[0]).toBe(`Starting 'a'...`)
      expect(initialOutput[1]).toBe(`Starting 'b'...`)
      expect(initialOutput.slice(2, 4).sort()).toStrictEqual([
        'a      | [ERR] ',
        'a      | [out] ',
      ])
      expect(initialOutput[4]).toBe(
        `ServerProcessExitedError: Server 'a' exited`
      )
      expect(initialOutput[5]).toBe('Exiting...')
      expect(initialOutput.slice(6, 8).sort()).toStrictEqual([
        'b      | [ERR] ',
        'b      | [out] ',
      ])
      expect(initialOutput[8]).toBe('Exited')
      expect(initialOutput[9]).toBe('')
      expect(initialOutput[10]).toBe('')
      expect(initialOutput[11]).toBeUndefined()
      await proc.exited
      expect(proc.output).toStrictEqual([])
    })
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
    })
  })
})
