// @ts-ignore
import { fetchText } from './helpers/fetchText'
// @ts-ignore
import { createServerGroupProcess } from './helpers/createServerGroupProcess'

const port = 3000

describe('basic', () => {
  it('works', async () => {
    const proc = await createServerGroupProcess(port, {
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
    })
    const [aText, bText] = await Promise.all([
      fetchText(`http://localhost:${port}/a`),
      fetchText(`http://localhost:${port}/b`),
    ])
    expect(aText).toEqual('a')
    expect(bText).toEqual('b')
    await proc.destroy()
  })
})
