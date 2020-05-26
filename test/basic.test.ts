// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  ServerGroupProcess,
  createServerGroupProcess,
  // @ts-ignore
} from './helpers/createServerGroupProcess'
import { check as isPortUsed } from 'tcp-port-used'

describe('basic', () => {
  jest.setTimeout(60 * 1000)
  let serverGroupProc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (serverGroupProc) {
      await serverGroupProc.destroy()
    }
  })
  it('starts and stops', async () => {
    const port = 3000
    const childPort = 3001
    expect(await isPortUsed(port)).toBe(false) // note that failure here is not a fault in the library
    serverGroupProc = await createServerGroupProcess(port, {
      servers: [
        {
          label: 'child',
          env: { KEY: 'child' },
          command: ['node', `${__dirname}/fixtures/server-node.js`],
          port: childPort,
          paths: ['/'],
        },
      ],
    })
    expect(await isPortUsed(port)).toBe(true)
    await serverGroupProc.destroy()
    expect(await isPortUsed(port)).toBe(false)
  })
  it('works', async () => {
    const port = 3000
    serverGroupProc = await createServerGroupProcess(port, {
      servers: [
        {
          label: 'a',
          env: { KEY: 'a' },
          command: ['node', `${__dirname}/fixtures/server-node.js`],
          port: 3001,
          paths: ['/a'],
        },
        {
          label: 'b',
          env: { KEY: 'b' },
          command: ['node', `${__dirname}/fixtures/server-node.js`],
          port: 3002,
          paths: ['/b'],
        },
      ],
    })
    const [aText, bText] = await Promise.all([
      fetchText(`http://localhost:${port}/a`),
      fetchText(`http://localhost:${port}/b`),
    ])
    expect(aText).toEqual('a')
    expect(bText).toEqual('b')
  })
  // it('fails on startup')
})
