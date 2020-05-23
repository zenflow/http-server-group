/*
  TODO: port option
  TODO: default `servers[].port` using port finder
  TODO: `config.server.command` alternative `config.server.script`
  TODO: crash if one of the child processes crashes
  TODO: ensure SIGTERM propagates to child processes
    https://github.com/Tapppi/async-exit-hook
  TODO: fix character encoding (refer to next.js build output)

  Feature ideas:
    - `config.server.scale` (positive integer) https://nodejs.org/docs/latest/api/cluster.html
    - `config.server.handleExit` ('exit', 'restart', or function)
      - buffer requests during downtime, and apply proxy middleware only once up again
    - `config.server.dependencies` (array of labels of servers to wait for to be ready before starting this server)
    - `config.server.readyTimeout`

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
    command: `node ${__dirname}/proxy.ts`,
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
  command: string
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

function createProcess(command: string, env: object) {
  const proc = spawn(command, {
    shell: true,
    env: { ...process.env, ...env },
  })
  const stdout = proc.stdout.pipe(splitStream())
  const stderr = proc.stderr.pipe(splitStream())
  const stdOutAndStdErr = mergeStream(
    stdout.pipe(mapStream(line => `[out] ${line}\n`)),
    stderr.pipe(mapStream(line => `[ERR] ${line}\n`))
  )
  return { proc, stdout, stderr, stdOutAndStdErr }
}
