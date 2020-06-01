// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { Config } from '..'

const basicConfig: Config = {
  servers: [
    {
      label: 'a',
      env: { KEY: 'a' },
      command: ['node', 'test/fixtures/server-node-basic.js'],
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

describe('basic', () => {
  jest.setTimeout(30 * 1000)
  let proc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (proc) {
      await proc.kill()
    }
  })
  it('works', async () => {
    proc = await getReadyServerGroupProcess(3000, basicConfig)
    const [aText, bText] = await Promise.all([
      fetchText('http://localhost:3000/a'),
      fetchText('http://localhost:3000/b'),
    ])
    expect(aText).toEqual('a')
    expect(bText).toEqual('b')
  })
  it('has consistent output', async () => {
    proc = await getReadyServerGroupProcess(3000, basicConfig)

    const initialOutput = proc.output.splice(0)
    expect(initialOutput[0]).toBe(`Starting server 'a'...`)
    expect(initialOutput[1]).toBe(`Starting server 'b'...`)
    const aOutStartedLine = initialOutput.indexOf(`a      | [out] Started`)
    expect(aOutStartedLine).toBeGreaterThan(1)
    const bOutStartedLine = initialOutput.indexOf(`b      | [out] Started`)
    expect(bOutStartedLine).toBeGreaterThan(1)
    const startedALine = initialOutput.indexOf(
      `Started server 'a' @ http://localhost:3001`
    )
    expect(startedALine).toBeGreaterThan(aOutStartedLine)
    const startedBLine = initialOutput.indexOf(
      `Started server 'b' @ http://localhost:3002`
    )
    expect(startedBLine).toBeGreaterThan(bOutStartedLine)
    expect(Math.max(startedALine, startedBLine)).toBe(5)
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
