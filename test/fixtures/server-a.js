const { createServer } = require('http')

const server = createServer((_, res) => {
  res.write('a')
  res.end()
})

server.listen(process.env.PORT)
