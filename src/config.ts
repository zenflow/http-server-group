import { Options as ProxyOptions } from 'http-proxy-middleware'
import { assert } from './util'

export { ProxyOptions }
export type Falsy = false | null | undefined
export interface ServerConfig {
  label?: string
  env?: object
  command: string | Array<string>
  host?: string
  port: number
  paths?: Array<string>
  proxyOptions?: ProxyOptions
}
export interface Config {
  printConfig?: boolean
  proxyOptions?: ProxyOptions
  servers: Array<ServerConfig | Falsy>
}
export interface NormalizedServerConfig {
  label: string
  env: object
  command: string | Array<string>
  host: string
  port: number
  paths: Array<string>
  proxyOptions: ProxyOptions
}
export interface NormalizedConfig {
  printConfig: boolean
  proxyOptions: ProxyOptions
  servers: Array<NormalizedServerConfig>
}

export function validateAndNormalizeConfig(config: Config): NormalizedConfig {
  const printConfig = config.printConfig ?? false
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
      proxyOptions = {},
    } = server
    assert(command, `Missing \`command\` for '${label}' server`)
    assert(port, `Missing \`port\` for '${label}' server`)
    return { label, env, command, host, port, paths, proxyOptions }
  })
  assert(servers.length > 0, 'Must specify at least one server')
  return { printConfig, proxyOptions, servers }
}
