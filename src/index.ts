/*
 */
import { spawn } from 'child_process'
import { PassThrough, Readable } from 'stream'
import splitStream from 'split'
import mergeStream from 'merge-stream'
import { waitUntilUsedOnHost } from 'tcp-port-used'
import {
  validateAndNormalizeConfig,
  formatConfig,
  Config,
  ProxyOptions,
  ServerConfig,
} from './config'
import { assert, mapStream, rightPad } from './util'

export { Config, ProxyOptions, ServerConfig }

const { version } = require('../package.json')

const dummyMergedStream = mergeStream()
type MergedStream = typeof dummyMergedStream

let started: boolean = false

export async function startHttpServerGroup(config: Config): Promise<void> {
  assert(!started, 'Cannot start more than once')
  started = true

  const normalizedConfig = validateAndNormalizeConfig(config)

  const proxyLabel = '$proxy'
  const maxLabelLength = Math.max(
    proxyLabel.length,
    ...normalizedConfig.servers.map(({ label }) => label.length)
  )
  // TODO: Move this to util.ts (and rename file to streams.ts)
  const labelStream = (label: string, stream: Readable | MergedStream) =>
    stream.pipe(
      mapStream(line => `${rightPad(label, maxLabelLength)} | ${line}`)
    )

  const output = mergeStream()
  output.pipe(process.stdout)

  const logger = new Logger()
  output.add(logger)
  logger.log(`\
http-server-group version: ${version}
http-server-group config:
${formatConfig(normalizedConfig)}
`)

  const serverProcesses = normalizedConfig.servers.map(createServerProcess)
  output.add(
    serverProcesses.map(proc => labelStream(proc.label, proc.outputStream))
  )

  await Promise.all(serverProcesses.map(proc => proc.ready))

  const proxyProcess = createServerProcess({
    label: '$proxy',
    env: { HTTP_SERVER_GROUP_CONFIG: JSON.stringify(normalizedConfig) },
    command: [
      'node',
      `${__dirname}/http-server-group-proxy.cjs.development.js`,
    ],
    host: 'localhost',
    port: parseInt(process.env.PORT as string, 10),
  })
  output.add(labelStream(proxyProcess.label, proxyProcess.outputStream))

  await proxyProcess.ready
}

// TODO: move everything below this line to separate modules

interface ServerProcessConfig {
  label: string
  env: object
  command: string | Array<string>
  host: string
  port: number
}

function createServerProcess(config: ServerProcessConfig) {
  const { label, env, command, host, port } = config
  const outputStream = mergeStream()

  const logger = new Logger()
  outputStream.add(logger)

  // TODO: assert that port is free

  Promise.resolve().then(() => logger.log('Starting...'))

  const proc = createProcess(command, { PORT: port, ...env })
  outputStream.add(proc.stdOutAndStdErr)

  const ready = waitUntilUsedOnHost(port, host, 500, 2147483647).then(() =>
    logger.log(`Ready!`)
  )

  return { label, outputStream, ready }
}

class Logger extends PassThrough {
  log(string: string) {
    string.split('\n').forEach(line => {
      this.write(`${line}\n`, 'utf8')
    })
  }
}

function createProcess(command: string | Array<string>, env: object) {
  const proc = Array.isArray(command)
    ? spawn(command[0], command.slice(1), {
        env: { ...process.env, ...env },
      })
    : spawn(command, {
        shell: true,
        env: { ...process.env, ...env },
      })
  const stdout = proc.stdout.pipe(splitStream())
  const stderr = proc.stderr.pipe(splitStream())
  const stdOutAndStdErr = mergeStream(
    stdout.pipe(mapStream(line => `[out] ${line}\n`)),
    stderr.pipe(mapStream(line => `[ERR] ${line}\n`))
  )
  return { stdOutAndStdErr }
}
