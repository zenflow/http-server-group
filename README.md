# http-server-group
Run multiple http servers as one

## Roadmap

-snapshot-*like* testing
- throw ServerProcessExitedError in createServerGroupProcess if `exited` resolves & not already exiting manager process
    - a.k.a. make sure we don't throw ServerProcessExitedError more than once
- inline TODOs
- /a (label:a) /b (label:b) / (label:default)
- increase test concurrency
- preflight port check
- use npm-run-path
- default `servers[].port` using port finder
- port finder utility to use with startHttpServerGroup

- examples & documentation

- fix character encoding (refer to next.js build output)
- more tests for various configurations

## Feature ideas

- `config.verbosity` 0 or 1, default 1
- `config.defaultPort` fallback when `process.env.PORT` not defined
- `config.server[].startupTimeout` milliseconds to wait for port to open before timeout error (currently it waits basically forever)
- for *nix: graceful shutdown & `config.server[].forceKillTimeout` option (milliseconds to wait before sending SIGKILL)
- `config.server[].scale`
    - maybe: number of workers in node cluster (support node servers only)
    - maybe: number of processes to start (requires configuring more port numbers & doing round-robin in proxy)
- `config.server[].dependencies`: array of labels of servers to wait for to be ready before starting this server
- `config.server[].handleExit` 'exit', 'restart', or function. Default 'exit' (which is only current behavior)
- option to log requests in `$proxy` server
