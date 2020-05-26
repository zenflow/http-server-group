const { createServer } = require('http')

const server = createServer((_, res) => {
  res.write('b')
  res.end()
})

server.listen(process.env.PORT)
