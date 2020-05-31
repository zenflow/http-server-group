import { check as isPortUsed } from 'tcp-port-used'
// @ts-ignore
import { fetchText } from './helpers/fetchText'
import {
  getReadyServerGroupProcess,
  ServerGroupProcess,
  // @ts-ignore
} from './helpers/serverGroupProcess'
// @ts-ignore
import { sortLinesByLabel } from './helpers/sortLinesByLabel'
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
  let serverGroupProc: ServerGroupProcess | null = null
  afterEach(async () => {
    if (serverGroupProc) {
      await serverGroupProc.kill()
    }
  })
  it('starts and stops', async () => {
    const arePortsUsed = (ports: number[]) =>
      Promise.all(ports.map(port => isPortUsed(port)))
    const isSomePortUsed = async (ports: number[]) =>
      (await arePortsUsed(ports)).some(used => used)
    const isEveryPortUsed = async (ports: number[]) =>
      (await arePortsUsed(ports)).every(used => used)
    const ports = [3000, 3001, 3002]
    expect(await isSomePortUsed(ports)).toBe(false) // note that failure here is not a fault in the library
    serverGroupProc = await getReadyServerGroupProcess(3000, basicConfig)
    expect(await isEveryPortUsed(ports)).toBe(true)
    await serverGroupProc.kill()
    expect(await isSomePortUsed(ports)).toBe(false)
  })
  it('works', async () => {
    serverGroupProc = await getReadyServerGroupProcess(3000, basicConfig)
    const [aText, bText] = await Promise.all([
      fetchText('http://localhost:3000/a'),
      fetchText('http://localhost:3000/b'),
    ])
    expect(aText).toEqual('a')
    expect(bText).toEqual('b')
  })
  it('has consistent output', async () => {
    serverGroupProc = await getReadyServerGroupProcess(3000, basicConfig)

    const initialOutput = serverGroupProc.output.splice(0)
    const labels = ['$manager', '$proxy', 'a', 'b']
    const deterministicOutput = sortLinesByLabel(labels, initialOutput)
    // mutate `deterministicOutput`, so that it's deterministic, so that it can be snapshotted
    {
      // Either server (a or b) can start first
      const aStartedIndex = deterministicOutput.$manager.indexOf(
        `$manager | Started 'a' @ http://localhost:3001`
      )
      const bStartedIndex = deterministicOutput.$manager.indexOf(
        `$manager | Started 'b' @ http://localhost:3002`
      )
      expect(aStartedIndex).not.toBe(-1)
      expect(bStartedIndex).not.toBe(-1)
      expect(Math.abs(aStartedIndex - bStartedIndex)).toBe(1)
      const firstStartedIndex = Math.min(aStartedIndex, bStartedIndex)
      const secondStartedIndex = Math.max(aStartedIndex, bStartedIndex)
      const aStartedLine = deterministicOutput.$manager[aStartedIndex]
      const bStartedLine = deterministicOutput.$manager[bStartedIndex]
      deterministicOutput.$manager[firstStartedIndex] = aStartedLine
      deterministicOutput.$manager[secondStartedIndex] = bStartedLine
    }
    expect(deterministicOutput).toMatchSnapshot()

    // TODO: send some requests and check output, once proxy has logger

    await serverGroupProc.kill()

    const finalOutput = serverGroupProc.output.splice(0)
    expect(finalOutput).toMatchSnapshot()
  })
})
