# http-server-group
Run multiple http servers as one

## Roadmap

- clean up dist dir (no dev vs prod builds; simpler filenames)
- fix formatting & do snapshot testing
- it("doesn't work"): sync startup error, async startup error, crash, end, doesn't serve, doesn't shut down(linux)
- preflight port check
- use npm-run-path
- default `servers[].port` using port finder
- `config.server.command` alternative `config.server.script`
- `config.server.handleExit` ('exit', 'restart', or function)
- examples dir

- crash if one of the child processes crashes
- ensure SIGINT propagates to child processes
    - https://www.npmjs.com/package/execa
    - https://www.npmjs.com/package/signal-exit
    - https://www.npmjs.com/package/tree-kill

- fix character encoding (refer to next.js build output)

## Feature ideas:
- `config.defaultPort` fallback when `process.env.PORT` not defined
- `config.server.readyTimeout` milliseconds to wait for port to open before timeout error
- `config.server.forceKillTimeout` milliseconds to wait before sending SIGKILL (for OSes that support it)
- `config.server.scale` (positive integer) https://nodejs.org/docs/latest/api/cluster.html
- buffer requests during downtime, and apply proxy middleware only once up again
- `config.server.dependencies` (array of labels of servers to wait for to be ready before starting this server)
