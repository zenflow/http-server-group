const { createServer } = require('http')

const { KEY } = process.env

const server = createServer((_, res) => {
  res.write(KEY)
  res.end()
})

server.listen(process.env.PORT)
