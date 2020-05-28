const { createServer } = require('http')

const {
  ERROR_STARTUP_SYNC,
  ERROR_STARTUP_ASYNC,
  ERROR_POST_STARTUP,
} = process.env

const server = createServer(() => {})

if (ERROR_STARTUP_SYNC) {
  throw new Error('ERROR_STARTUP_SYNC')
} else if (ERROR_STARTUP_ASYNC) {
  setTimeout(() => {
    throw new Error('ERROR_STARTUP_ASYNC')
  }, 100)
} else if (ERROR_POST_STARTUP) {
  server.listen(process.env.PORT, error => {
    if (error) throw error
    setTimeout(() => {
      throw new Error('ERROR_POST_STARTUP')
    }, 100)
  })
}
