const { createServer } = require('http')

const server = createServer(() => {})

if (process.env.EXIT_PRE_START) {
  exit('EXIT_PRE_START')
} else if (process.env.EXIT_POST_START) {
  server.listen(process.env.PORT, error => {
    if (error) throw error
    exit('EXIT_POST_START')
  })
}

function exit(message) {
  setTimeout(() => {
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }, Number.parseInt(process.env.EXIT_DELAY || '0'))
}
