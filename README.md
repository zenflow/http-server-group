# http-server-group
Run multiple http servers as one

## Roadmap

- pass errors explicitly (no throw/reject)
- failure tests
    - ERROR_STARTUP_SYNC & ERROR_STARTUP_ASYNC -> EXIT_BEFORE_START
    - EXIT_AFTER_START
    - non-zero exit codes
    - snapshot tests

- /a (label:a) /b (label:b) / (label:default)
- increase test concurrency
- test
    - config options
    - user-defined server doesn't serve
    - user-defined server doesn't shut down(linux)
- preflight port check
- use npm-run-path
- default `servers[].port` using port finder
- port finder utility to use with startHttpServerGroup
- `config.server.handleExit` ('exit', 'restart', or function)
- examples & documentation

- fix character encoding (refer to next.js build output)

## Feature ideas:
- `config.showConfig` boolean
- `config.defaultPort` fallback when `process.env.PORT` not defined
- `config.server.readyTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- for *nix: graceful shutdown & `config.server.forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.server.scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- buffer requests during downtime, and apply proxy middleware only once up again
- `config.server.dependencies` (array of labels of servers to wait for to be ready before starting this server)
