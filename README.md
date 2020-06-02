# http-server-group

Helps you to compose multiple http server programs into a single http server program.

Given a declarative configuration, including a description of a collection of `servers`, it will:
- Start and manage child server processes, printing the stdout/stderr from each
- Run a proxy server which forward requests to the designated child server

Define your server group in a script like this one...

```js
// server-group.js

const { start } = require('http-server-group')

start({
  defaultPort: 3000,
  servers: [
    {
      label: 'my-service',
      command: 'node my-service/server.js',
      port: 3001,
      paths: ['/api/my-service'],
    },
    {
      label: 'web',
      command: 'node web/server.js',
      port: 3002,
      paths: ['/'],
    },
  ],
})
```

Run it...

```
$ node server-group.js
Starting server 'my-service'...
Starting server 'web'...
my-service | [out] Started 🚀
web        | [out] Started 🚀
Started server 'web' @ http://localhost:3002
Started server 'my-service' @ http://localhost:3001
Starting server '$proxy'...
Started server '$proxy' @ http://localhost:3000
Ready
```

Now you have an http server running at http://localhost:3000 which proxies requests
to either of two underlying "child" servers:
- all requests with URL under `/api/my-service` go to "my-service"
- all other requests with URL under `/` go to "web"

### Features

- The group server starts gracefully; It doesn't accept requests until every child server is accepting requests.
- If any child server exits (i.e. crashes) the group server will kill the remaining children and exit.
- You can define a server with **no** `paths`, if it is meant to be used only by other child servers in the group.

### Specs for generic 'http server program'

This describes behavior which is expected of the child servers you define, and which you can expect of the group server.

- should not exit; should run until killed by another process
- must serve over the port designated by the `PORT` environment variable

### Configuration

- `config.printConfig` (type: `boolean`; optional; default: `false`) If set to `true`, the effective configuration will be printed before starting the server group. Useful for debugging server groups that have dynamic configuration.
- `config.defaultPort` (type: `number`; optional; default: `3000`) *Default* port for proxy to listen on. This is *only* used if the `PORT` environment variable is not defined.
- `config.proxyOptions` (type: `ProxyOptions`; optional; default: `{}`) [http-proxy-middleware options](https://github.com/chimurai/http-proxy-middleware#options) (without `target` or `router`) to be used when proxying to *any* server. You can also set these options per-server with `config.servers[].proxyOptions`.
- `config.servers[]` (required) Description of child servers. Must contain one or more elements.
- `config.servers[].label` (type: `string`; optional; default: server's index in the array) Name used to identify this server in the console output.
- `config.servers[].env` (type: `object`; optional; default: `{}`) Environment variables to use for this server process. The child server process will already inherit all the environment variables of it's parent, so there's no need to explicity propagate environment variables from the parent process. The server process will also already have `PORT` defined appropriately.
- `config.servers[].command` (type: `string | string[]`; required) Command used to run the server. If it's a single string, it will be run with the system shell. If it's an array of strings, no shell is used, the first element is used as the binary, and the remaining elements are used as arguments. The server should behave according to "Specs for generic 'http server program'" (below).
- `config.servers[].host` (type: `string`; optional; default: `'localhost'`) Hostname that http-server-group should expect server to serve on.
- `config.servers[].port` (type: `number`; required) Port number that http-server-group should expect server to serve on. This is passed to the server process as the `PORT` environment variable for convenience.
- `config.servers[].paths` (type: `string[]`; optional; default: `[]`) Paths to check when determining which server to proxy a request to. Each path must be absolute (i.e. start with `/`). Each request is proxied to first server that has a path that the request path is within. You may configure a server with *no* paths, meaning no requests will be proxied to it.
- `config.servers[].proxyOptions` (type: `ProxyOptions`; optional; default: `{}`) [http-proxy-middleware options](https://github.com/chimurai/http-proxy-middleware#options) (without `target` or `router`) to be used when proxying to this server. You can also set these options globally with `config.proxyOptions`.

## Motivation

Sometimes we may want to use some open-source (or just reusable) http server as a *component* of our app or service.
If we are thinking of that server as a *component* of our overall server, then we might want to include it *in* our
overall server, rather than deploying it as its own independent service.

Advantages of the "single server" (or "monolith") approach:
1. simplifies deployments & devops
2. allows us to deploy to basically any PaaS provider
3. allows us to effectively use PaaS features like [Heroku's Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps)
4. with some PaaS providers (e.g. Heroku, render) saves the cost of hosting additional "apps" or "services"

There some real advantages of the "multiple servers" (or "microservices") approach too, which you should research for
yourself. I think you will find that these benefits generally apply more to large-scale projects with many services,
and maybe multiple teams. For smaller projects, it seems that the "single service" approach provides more advantage.
Bear in mind that serious projects can often benefit from *starting out* small, and splitting out into separate
services only as needed.

If you are unable to *actually* build everything into a single http server program (by calling the server code from
your own code) for whatever reason (maybe the composed server is written in a different language than the rest of the
project, maybe it's source code is not available, maybe something else) then you can use http-server-group to do it virtually.

**Alternate explanation** This package is intended to provide a painless and (provided your image already requires
nodejs) lightweight way to [run multiple services in a Docker container](https://docs.docker.com/config/containers/multi-service_container/).

## Roadmap

- main export `start` -> `startHttpServerGroup`
- publish
- use `npm-run-path` package
- verify configured ports are available in "pre-flight check", & exit early/immediately if they are not
- export a port finder utility (to be used with `start`)
    - then it is possible to run tests concurrently (should we?)
    - use it internally to get default `servers[].port`
- perf optimization for tests on windows: when cleaning up & killing `proc`, don't wait whole time for proc to have `exited`
- more tests for various configurations
    - printConfig
    - omitting server[].labels, ...
    - config that fails validation (also, in source, handle: same port used twice, same label used twice, etc.)
    - server with no `paths`
    - glob patterns in `paths`
    - proxyOptions & `server[].proxyOptions`
    - ...

## Feature ideas

- `config.server[].handleExit` 'exit', 'restart', or function. Default 'exit' (which is only current behavior)
- `config.server[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- option to log requests in `$proxy` server
- for *nix: graceful shutdown & `config.server[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.server[].scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- `config.server[].dependencies`: array of labels of servers to wait for to be ready before starting this server
- use same node binary that main process was started with
