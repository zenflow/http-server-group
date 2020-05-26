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
  proxyOptions: ProxyOptions
  servers: Array<NormalizedServerConfig>
}

export function validateAndNormalizeConfig(config: Config): NormalizedConfig {
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
    return { label, command, host, port, env, paths, proxyOptions }
  })
  assert(servers.length > 0, 'Must specify at least one server')
  return { proxyOptions, servers }
}

export function formatConfig(config: NormalizedConfig): string {
  const result = []
  if (Object.entries(config.proxyOptions).length) {
    result.push(`  proxyOptions: ${JSON.stringify(config.proxyOptions)}`)
  }
  result.push('  servers:')
  config.servers.forEach(
    ({ label, env, command, host, port, paths, proxyOptions }) => {
      result.push(`    - ${label}:`)
      if (Object.entries(env).length) {
        result.push(`        env: ${JSON.stringify(env)}`)
      }
      result.push(`        command: ${command}`)
      result.push(`        origin: http://${host}:${port}`)
      result.push(
        `        paths: ${paths.length ? paths.join(', ') : '(none)'}`
      )
      if (Object.entries(proxyOptions).length) {
        result.push(`        proxyOptions: ${JSON.stringify(proxyOptions)}`)
      }
    }
  )
  return result.join('\n')
}
