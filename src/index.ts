/*
 */
import { spawn } from 'child_process'
import { PassThrough, Readable } from 'stream'
import splitStream from 'split'
import mergeStream from 'merge-stream'
import { waitUntilUsedOnHost } from 'tcp-port-used'
import {
  Config,
  ProxyOptions,
  ServerConfig,
  validateAndNormalizeConfig,
} from './config'
import { assert, mapStream, rightPad } from './util'

export { Config, ProxyOptions, ServerConfig }

const pkg = require('../package.json')

const dummyMergedStream = mergeStream()
type MergedStream = typeof dummyMergedStream

let started: boolean = false

export async function startHttpServerGroup(config: Config): Promise<void> {
  assert(!started, 'Cannot start more than once')
  started = true

  const host = 'localhost'
  const port = parseInt(process.env.PORT as string, 10)
  const normalizedConfig = validateAndNormalizeConfig(config)

  const managerLabel = '$manager'
  const proxyLabel = '$proxy'
  const maxLabelLength = Math.max(
    managerLabel.length,
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
  output.add(labelStream(managerLabel, logger))
  logger.log(`\
http-server-group version ${pkg.version}
http-server-group config ${JSON.stringify(normalizedConfig, null, 2)}`)

  const serverProcesses = normalizedConfig.servers.map(serverConfig =>
    createServerProcess(logger, serverConfig)
  )
  output.add(
    serverProcesses.map(proc => labelStream(proc.label, proc.outputStream))
  )

  await Promise.all(serverProcesses.map(proc => proc.ready))

  const proxyProcess = createServerProcess(logger, {
    label: '$proxy',
    env: { HTTP_SERVER_GROUP_CONFIG: JSON.stringify(normalizedConfig) },
    command: ['node', `${__dirname}/proxy.js`],
    host,
    port,
  })
  output.add(labelStream(proxyProcess.label, proxyProcess.outputStream))

  await proxyProcess.ready

  logger.log('Ready')
}

// TODO: move everything below this line to separate modules

interface ServerProcessConfig {
  label: string
  env: object
  command: string | Array<string>
  host: string
  port: number
}

function createServerProcess(logger: Logger, config: ServerProcessConfig) {
  const { label, env, command, host, port } = config

  // TODO: assert that port is free

  logger.log(`Starting '${config.label}'...`)

  const proc = createProcess(command, { PORT: port, ...env })
  const outputStream = proc.stdOutAndStdErr

  const ready = waitUntilUsedOnHost(port, host, 500, 2147483647).then(() =>
    logger.log(`Started '${label}' @ http://${host}:${port}`)
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
  const stdOutAndStdErr = mergeStream(
    proc.stdout
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[out] ${line}\n`)),
    proc.stderr
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[ERR] ${line}\n`))
  )
  return { stdOutAndStdErr }
}
