import {
  getReadyServerGroupProcess,
  getServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

function getFailureConfig(
  failureEnv: { [key: string]: string },
  basicEnv: { [key: string]: string }
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
    it('before any server is ready', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_PRE_START: '1' }, { START_DELAY: '2000' })
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting 'a'...`)
      expect(proc.output[1]).toBe(`Starting 'b'...`)
      expect(proc.output.slice(2, 4).sort()).toStrictEqual([
        'a      | [ERR] ',
        'a      | [out] ',
      ])
      expect(proc.output[4]).toBe(`Server 'a' exited`)
      // doesn't start $proxy
      // stops other server before it becomes ready
      expect(proc.output[5]).toBe('Stopping servers...')
      expect(proc.output.slice(6, 8).sort()).toStrictEqual([
        'b      | [ERR] ',
        'b      | [out] ',
      ])
      expect(proc.output[8]).toBe('Stopped servers')
      expect(proc.output[9]).toBe('')
      expect(proc.output[10]).toBe('')
      expect(proc.output[11]).toBeUndefined()
    })
    it('before that server is ready & after other server is ready', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_PRE_START: '1', EXIT_DELAY: '500' }, {})
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting 'a'...`)
      expect(proc.output[1]).toBe(`Starting 'b'...`)
      expect(proc.output[2]).toBe(`b      | [out] Started`)
      expect(proc.output[3]).toBe(`Started 'b' @ http://localhost:3002`)
      expect(proc.output.slice(4, 6).sort()).toStrictEqual([
        'a      | [ERR] ',
        'a      | [out] ',
      ])
      expect(proc.output[6]).toBe(`Server 'a' exited`)
      // doesn't start $proxy
      // stops other server
      expect(proc.output[7]).toBe('Stopping servers...')
      expect(proc.output.slice(8, 10).sort()).toStrictEqual([
        'b      | [ERR] ',
        'b      | [out] ',
      ])
      expect(proc.output[10]).toBe('Stopped servers')
      expect(proc.output[11]).toBe('')
      expect(proc.output[12]).toBe('')
      expect(proc.output[13]).toBeUndefined()
    })
    it('after that server is ready & before other server is ready', async () => {
      proc = getServerGroupProcess(
        3000,
        getFailureConfig(
          { EXIT_POST_START: '1', EXIT_DELAY: '500' },
          { START_DELAY: '2000' }
        )
      )
      await proc.exited
      expect(proc.output[0]).toBe(`Starting 'a'...`)
      expect(proc.output[1]).toBe(`Starting 'b'...`)
      expect(proc.output[2]).toBe(`a      | [out] Started`)
      expect(proc.output[3]).toBe(`Started 'a' @ http://localhost:3001`)
      expect(proc.output.slice(4, 6).sort()).toStrictEqual([
        'a      | [ERR] ',
        'a      | [out] ',
      ])
      expect(proc.output[6]).toBe(`Server 'a' exited`)
      // doesn't start $proxy
      // stops other server before it becomes ready
      expect(proc.output[7]).toBe('Stopping servers...')
      expect(proc.output.slice(8, 10).sort()).toStrictEqual([
        'b      | [ERR] ',
        'b      | [out] ',
      ])
      expect(proc.output[10]).toBe('Stopped servers')
      expect(proc.output[11]).toBe('')
      expect(proc.output[12]).toBe('')
      expect(proc.output[13]).toBeUndefined()
    })
    it('after all servers are up', async () => {
      proc = await getReadyServerGroupProcess(
        3000,
        getFailureConfig({ EXIT_POST_START: '1', EXIT_DELAY: '1000' }, {})
      )
      const initialOutput = proc.output.splice(0)
      expect(initialOutput[0]).toBe(`Starting 'a'...`)
      expect(initialOutput[1]).toBe(`Starting 'b'...`)
      const aOutStartedLine = initialOutput.indexOf(`a      | [out] Started`)
      expect(aOutStartedLine).toBeGreaterThan(1)
      const bOutStartedLine = initialOutput.indexOf(`b      | [out] Started`)
      expect(bOutStartedLine).toBeGreaterThan(1)
      const startedALine = initialOutput.indexOf(
        `Started 'a' @ http://localhost:3001`
      )
      expect(startedALine).toBeGreaterThan(aOutStartedLine)
      const startedBLine = initialOutput.indexOf(
        `Started 'b' @ http://localhost:3002`
      )
      expect(startedBLine).toBeGreaterThan(bOutStartedLine)
      expect(Math.max(startedALine, startedBLine)).toBe(5)
      expect(initialOutput[6]).toBe(`Starting '$proxy'...`)
      expect(initialOutput[7]).toBe(`Started '$proxy' @ http://localhost:3000`)
      expect(initialOutput[8]).toBe('Ready')
      expect(initialOutput[9]).toBeUndefined()
      await proc.exited
      const finalOutput = proc.output.splice(0)
      expect(finalOutput.slice(0, 2).sort()).toStrictEqual([
        'a      | [ERR] ',
        'a      | [out] ',
      ])
      expect(finalOutput[2]).toBe(`Server 'a' exited`)
      expect(finalOutput[3]).toBe('Stopping servers...')
      expect(finalOutput.slice(4, 8).sort()).toStrictEqual([
        '$proxy | [ERR] ',
        '$proxy | [out] ',
        'b      | [ERR] ',
        'b      | [out] ',
      ])
      expect(finalOutput[8]).toBe('Stopped servers')
      expect(finalOutput[9]).toBe('')
      expect(finalOutput[10]).toBe('')
      expect(finalOutput[11]).toBeUndefined()
    })
  })
})
