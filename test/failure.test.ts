import {
  createServerGroupProcess,
  ServerGroupProcess,
  ServerGroupProcessExitedError,
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
  let serverGroupProc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (serverGroupProc) {
      await serverGroupProc.kill()
    }
  })
  it('exits if a server exits during startup', async () => {
    serverGroupProc = createServerGroupProcess(
      3000,
      getErrorConfig('EXIT_DURING_STARTUP')
    )
    await expect(serverGroupProc.ready).rejects.toThrow(
      ServerGroupProcessExitedError.name
    )
    expect(
      serverGroupProc.output.includes(
        'a        | [ERR] Error: EXIT_DURING_STARTUP'
      )
    ).toBe(true)
  })
})
