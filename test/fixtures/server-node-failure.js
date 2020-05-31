const { createServer } = require('http')

const server = createServer(() => {})

if (process.env.EXIT_DURING_STARTUP) {
  setTimeout(() => exit('EXIT_DURING_STARTUP'), 200)
} else if (process.env.EXIT_AFTER_STARTUP) {
  server.listen(process.env.PORT, error => {
    if (error) throw error
    setTimeout(() => exit('EXIT_AFTER_STARTUP'), 200)
  })
}

function exit(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
