// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

describe('basic configs', () => {
  jest.setTimeout(30 * 1000)
  let proc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  describe('defaultPort', () => {
    const defaultPortConfig: () => Config = () => ({
      defaultPort: 3002,
      servers: [
        {
          label: 'only',
          env: { RESPONSE_TEXT: 'only' },
          command: `node test/fixtures/server-node-basic.js`,
          port: 3001,
          paths: ['/'],
        },
      ],
    })
    it('works', async () => {
      proc = await getReadyServerGroupProcess(undefined, defaultPortConfig())
      expect(await fetchText('http://localhost:3002/')).toBe('only')
    })
    it('does not take precedence over PORT env var', async () => {
      proc = await getReadyServerGroupProcess(3000, defaultPortConfig())
      expect(await fetchText('http://localhost:3000/')).toBe('only')
    })
  })
})
