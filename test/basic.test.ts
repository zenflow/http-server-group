// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  ServerGroupProcess,
  createServerGroupProcess,
  // @ts-ignore
} from './helpers/createServerGroupProcess'
import {
  waitUntilUsed,
  waitUntilFree,
  check as isPortUsed,
} from 'tcp-port-used'

const port = 3000

const simpleConfig = {
  servers: [
    {
      label: 'a',
      command: `node ${__dirname}/fixtures/server-a.js`,
      port: 3001,
      paths: ['/a'],
    },
    {
      label: 'b',
      command: `node ${__dirname}/fixtures/server-b.js`,
      port: 3002,
      paths: ['/b'],
    },
  ],
}

describe('basic', () => {
  jest.setTimeout(60 * 1000)
  let serverGroupProc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (serverGroupProc) {
      await serverGroupProc.destroy()
      await waitUntilFree(port, 100, 5000)
    }
  })
  it('starts and stops', async () => {
    expect(await isPortUsed(port)).toBe(false)
    serverGroupProc = createServerGroupProcess(port, simpleConfig)
    await waitUntilUsed(port, 100, 5000)
    expect(await isPortUsed(port)).toBe(true)
    await serverGroupProc.destroy()
    await waitUntilFree(port, 100, 5000)
    expect(await isPortUsed(port)).toBe(false)
  })
  it('works', async () => {
    serverGroupProc = createServerGroupProcess(port, simpleConfig)
    await waitUntilUsed(port, 100, 5000)
    const [aText, bText] = await Promise.all([
      fetchText(`http://localhost:${port}/a`),
      fetchText(`http://localhost:${port}/b`),
    ])
    expect(aText).toEqual('a')
    expect(bText).toEqual('b')
  })
})
