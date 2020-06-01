// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

const basicConfig = (): Config => ({
  servers: [
    {
      label: 'other',
      env: { RESPONSE_TEXT: 'other' },
      command: ['node', 'test/fixtures/server-node.js'],
      port: 3001,
      paths: ['/other'],
    },
    {
      label: 'default',
      env: { RESPONSE_TEXT: 'default' },
      command: `node test/fixtures/server-node.js`,
      port: 3002,
      paths: ['/'],
    },
  ],
})

describe('basic', () => {
  jest.setTimeout(30 * 1000)
  let proc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  it('works', async () => {
    proc = await getReadyServerGroupProcess(3000, basicConfig())
    expect(await fetchText('http://localhost:3000/other')).toBe('other')
    expect(await fetchText('http://localhost:3000/other/foo')).toBe('other')
    expect(await fetchText('http://localhost:3000/')).toBe('default')
    expect(await fetchText('http://localhost:3000/foo')).toBe('default')
  })
  it('has consistent output', async () => {
    proc = await getReadyServerGroupProcess(3000, basicConfig())

    const initialOutput = proc.output.splice(0)
    expect(initialOutput[0]).toBe(`Starting server 'other'...`)
    expect(initialOutput[1]).toBe(`Starting server 'default'...`)
    const othOutStartedLine = initialOutput.indexOf(
      `other   | [out] Started 🚀`
    )
    expect(othOutStartedLine).toBeGreaterThan(1)
    const defOutStartedLine = initialOutput.indexOf(
      `default | [out] Started 🚀`
    )
    expect(defOutStartedLine).toBeGreaterThan(1)
    const startedOthLine = initialOutput.indexOf(
      `Started server 'other' @ http://localhost:3001`
    )
    expect(startedOthLine).toBeGreaterThan(othOutStartedLine)
    const startedDefLine = initialOutput.indexOf(
      `Started server 'default' @ http://localhost:3002`
    )
    expect(startedDefLine).toBeGreaterThan(defOutStartedLine)
    expect(Math.max(startedOthLine, startedDefLine)).toBe(5)
    expect(initialOutput[6]).toBe(`Starting server '$proxy'...`)
    expect(initialOutput[7]).toBe(
      `Started server '$proxy' @ http://localhost:3000`
    )
    expect(initialOutput[8]).toBe('Ready')
    expect(initialOutput[9]).toBeUndefined()

    await proc.kill()

    const finalOutput = proc.output.splice(0)
    expect(finalOutput[0]).toBe('')
    expect(finalOutput[1]).toBe('')
  })
})
