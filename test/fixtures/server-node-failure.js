const { createServer } = require('http')

const server = createServer(() => {})

if (process.env.EXIT_PRE_START) {
  exit()
} else if (process.env.EXIT_POST_START) {
  server.listen(process.env.PORT, error => {
    if (error) throw error
    exit()
  })
}

function exit() {
  setTimeout(
    () => process.exit(1),
    Number.parseInt(process.env.EXIT_DELAY || '0', 10)
  )
}
