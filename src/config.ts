import { Options as ProxyOptions } from 'http-proxy-middleware'
import { assert } from './helpers'

export { ProxyOptions }

export interface Config {
  printConfig?: boolean
  defaultPort?: number
  proxyOptions?: ProxyOptions
  servers: (ServerConfig | Falsy)[]
}

export type Falsy = false | null | undefined

export interface ServerConfig {
  label?: string
  env?: object
  command: string | string[]
  host?: string
  port: number
  paths?: string[]
  proxyOptions?: ProxyOptions
}

export interface NormalizedConfig {
  printConfig: boolean
  defaultPort: number
  proxyOptions: ProxyOptions
  servers: NormalizedServerConfig[]
}

export interface NormalizedServerConfig {
  label: string
  env: object
  command: string | string[]
  host: string
  port: number
  paths: string[]
  proxyOptions: ProxyOptions
}

export function validateAndNormalizeConfig(config: Config): NormalizedConfig {
  const printConfig = config.printConfig ?? false
  const defaultPort = config.defaultPort ?? 3000
  const proxyOptions = config.proxyOptions ?? {}
  const filteredServers = config.servers.filter(Boolean) as Array<ServerConfig>
  const servers = filteredServers.map((server: ServerConfig, index) => {
    const {
      label = String(index + 1),
      env = {},
      command,
      host = 'localhost',
      port,
      paths = [],
    } = server
    assert(command, `Server '${label}' is missing \`command\``)
    assert(port, `Server '${label}' is missing \`port\``)
    assert(
      paths.every(path => path[0] === '/'),
      `Server '${label}' has some path(s) that are not absolute`
    )
    const proxyOptions = { ...(server.proxyOptions ?? {}) }
    for (const forbiddenProxyOption of ['router', 'target']) {
      if (forbiddenProxyOption in proxyOptions) {
        console.warn(
          `Warning: Ignoring \`proxyOptions.${forbiddenProxyOption}\` for server '${label}'`
        )
        delete (proxyOptions as any)[forbiddenProxyOption]
      }
    }
    return { label, env, command, host, port, paths, proxyOptions }
  })
  assert(servers.length > 0, 'Must specify at least one server')
  return { printConfig, defaultPort, proxyOptions, servers }
}
