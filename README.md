# http-server-group
Run multiple http servers as one

## What does it do?

Helps you to run multiple http server programs as a single http server program.

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

#### Configuration

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

#### Specs for generic 'http server program' (group server & child servers)

- should not exit; should run until killed by another process
- must serve over the port designated by the `PORT` environment variable

## Why?

## Features

## Roadmap

- main export `start` -> `startHttpServerGroup`
- use npm-run-path
- verify configured ports are available in "pre-flight check", & exit early/immediately if they are not
- examples & documentation
- publish
- export a port finder utility (to be used with `start`)
    - then it is possible to run tests concurrently (should we?)
    - use it internally to get default `servers[].port`
- perf optimization for tests on windows: when cleaning up & killing `proc`, don't wait whole time for proc to have `exited`
- more tests for various configurations
    - printConfig
    - omitting server[].labels, ...
    - config that fails validation
    - server with no `paths`
    - glob patterns in `paths`
    - proxyOptions & `server[].proxyOptions`
    - ...

## Feature ideas

- use same node binary that main process was started with
- `config.server[].handleExit` 'exit', 'restart', or function. Default 'exit' (which is only current behavior)
- `config.server[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- option to log requests in `$proxy` server
- for *nix: graceful shutdown & `config.server[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.server[].scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- `config.server[].dependencies`: array of labels of servers to wait for to be ready before starting this server
