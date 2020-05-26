import connect, { HandleFunction } from 'connect'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { NormalizedConfig } from './config'

const config: NormalizedConfig = JSON.parse(
  process.env.HTTP_SERVER_GROUP_CONFIG as string
)

const app = connect()

config.servers
  .filter(serverConfig => serverConfig.paths.length > 0)
  .map(serverConfig =>
    createProxyMiddleware(serverConfig.paths, {
      logLevel: 'warn',
      ...config.proxyOptions,
      ...serverConfig.proxyOptions,
      target: `http://${serverConfig.host}:${serverConfig.port}`,
    })
  )
  .forEach(middleware => app.use(middleware as HandleFunction))

app.listen(process.env.PORT as string)
