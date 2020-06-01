# http-server-group
Run multiple http servers as one

## Roadmap

- examples & documentation
- `config.defaultPort` fallback when `process.env.PORT` not defined
- verify configured ports are available in "pre-flight check", & exit early/immediately if they are not
- port finder utility to use with startHttpServerGroup
    - then it is possible to run tests concurrently (should we?)
- default `servers[].port` using port finder
- use npm-run-path
- use same node binary that "manager" process was started with
- fix character encoding? (refer to next.js build output)
- more tests for various configurations
    - server with no `paths`
    - string (indicating "use shell") for server `command`
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
