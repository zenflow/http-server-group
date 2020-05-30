const { createServer } = require('http')

const { EXIT_DURING_STARTUP, EXIT_AFTER_STARTUP } = process.env

const server = createServer(() => {})

if (EXIT_DURING_STARTUP) {
  setTimeout(() => {
    throw new Error('EXIT_DURING_STARTUP')
  }, 100)
} else if (EXIT_AFTER_STARTUP) {
  server.listen(process.env.PORT, error => {
    if (error) throw error
    setTimeout(() => {
      throw new Error('EXIT_AFTER_STARTUP')
    }, 100)
  })
}
