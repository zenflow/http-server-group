/*
 */
import { spawn } from 'child_process'
import { PassThrough, Readable } from 'stream'
import { once } from 'events'
import splitStream from 'split'
import mergeStream from 'merge-stream'
import { waitUntilUsedOnHost } from 'tcp-port-used'
import {
  Config,
  NormalizedConfig,
  ProxyOptions,
  ServerConfig,
  validateAndNormalizeConfig,
} from './config'
import { assert, mapStream, rightPad } from './util'
import { killProcessTree } from './util/killProcessTree'

export { Config, ProxyOptions, ServerConfig }

const pkg = require('../package.json')

const dummyMergedStream = mergeStream()
type MergedStream = typeof dummyMergedStream

class Logger extends PassThrough {
  log(string: string) {
    string.split('\n').forEach(line => {
      this.write(`${line}\n`, 'utf8')
    })
  }
}

let started: boolean = false

export function startHttpServerGroup(config: Config): void {
  assert(!started, 'Cannot start more than once')
  started = true

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

  const serverProcesses: ServerProcess[] = []
  function getServerProcess(config: ServerProcessConfig) {
    const proc = createServerProcess(logger, config)
    output.add(labelStream(proc.label, proc.outputStream))
    serverProcesses.push(proc)
    return proc
  }

  doAsyncStartup(normalizedConfig, getServerProcess)
    .then(async () => {
      logger.log('Ready')
      const label = await Promise.race(
        serverProcesses.map(({ exited, label }) => exited.then(() => label))
      )
      throw new ServerProcessExitedError(label)
    })
    .catch(async error => {
      logger.log(`${error}`)
      logger.log('Exiting...')
      await Promise.all(serverProcesses.map(({ kill }) => kill()))
      logger.log('Exited')
      process.exit(1)
    })
}

async function doAsyncStartup(
  config: NormalizedConfig,
  getServerProcess: (config: ServerProcessConfig) => ServerProcess
): Promise<void> {
  const userServerProcesses = config.servers.map(getServerProcess)
  await Promise.all(userServerProcesses.map(({ ready }) => ready))

  const proxyProcess = getServerProcess({
    label: '$proxy',
    env: { HTTP_SERVER_GROUP_CONFIG: JSON.stringify(config) },
    command: ['node', `${__dirname}/proxy.js`],
    host: 'localhost',
    port: parseInt(process.env.PORT as string, 10),
  })
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

interface ServerProcess {
  label: string
  outputStream: Readable
  exited: Promise<void>
  kill(): Promise<void>
  ready: Promise<void>
}

class ServerProcessExitedError extends Error {
  label: string
  constructor(label: string) {
    super()
    this.name = 'ServerProcessExitedError'
    this.label = label
    this.message = `Server '${label}' exited`
  }
}

function createServerProcess(
  logger: Logger,
  config: ServerProcessConfig
): ServerProcess {
  const { label, env, command, host, port } = config

  // TODO: assert that port is free

  logger.log(`Starting '${label}'...`)

  const { outputStream, exited, kill } = createProcess(command, {
    PORT: port,
    ...env,
  })

  const ready = Promise.race([
    exited.then(() => Promise.reject(new ServerProcessExitedError(label))),
    waitUntilUsedOnHost(port, host, 500, 2147483647),
  ]).then(() => logger.log(`Started '${label}' @ http://${host}:${port}`))

  return { label, outputStream, exited, kill, ready }
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
  const outputStream = (mergeStream(
    proc.stdout
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[out] ${line}\n`)),
    proc.stderr
      .setEncoding('utf8')
      .pipe(splitStream())
      .pipe(mapStream(line => `[ERR] ${line}\n`))
  ) as unknown) as Readable
  let didExit = false
  const exited = once(outputStream, 'end').then(() => {
    didExit = true
  })
  let killPromise: Promise<void> | null = null
  function kill(): Promise<void> {
    if (!killPromise) {
      killPromise = Promise.resolve().then(async () => {
        if (!didExit) {
          await killProcessTree(proc.pid)
        }
        await exited
      })
    }
    return killPromise
  }
  return { outputStream, exited, kill }
}
