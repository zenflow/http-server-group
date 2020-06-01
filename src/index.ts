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
  if (config.printConfig) {
    logger.log(`config = ${JSON.stringify(normalizedConfig, null, 2)}`)
  }

  const serverProcesses: ServerProcess[] = []
  function getServerProcess(config: ServerProcessConfig) {
    const proc = createServerProcess(logger, config)
    serverProcesses.push(proc)
    output.add(labelStream(proc.label, proc.outputStream))
    proc.exited.then(() => exit(`Server '${proc.label}' exited`))
    return proc
  }

  let exiting = false
  function exit(message: string) {
    if (exiting) return
    exiting = true
    logger.log(message)
    logger.log('Stopping servers...')
    Promise.all(serverProcesses.map(({ kill }) => kill()))
      .then(() => logger.log('Stopped servers'))
      .catch(error =>
        logger.log(
          `Error stopping servers: ${
            error instanceof Error ? error.stack : error
          }`
        )
      )
      .then(() => process.exit(1))
  }

  doAsyncStartup(normalizedConfig, getServerProcess)
    .then(() => logger.log('Ready'))
    .catch(error => exit(`${error instanceof Error ? error.stack : error}`))
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

function createServerProcess(
  logger: Logger,
  config: ServerProcessConfig
): ServerProcess {
  const { label, env, command, host, port } = config
  logger.log(`Starting '${label}'...`)
  const { outputStream, exited, kill } = createProcess(command, {
    PORT: port,
    ...env,
  })
  const ready = waitUntilUsedOnHost(port, host, 500, 2147483647).then(() =>
    logger.log(`Started '${label}' @ http://${host}:${port}`)
  )
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
