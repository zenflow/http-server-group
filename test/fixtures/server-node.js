const { createServer } = require('http')

const { KEY } = process.env

const server = createServer((_, res) => {
  res.write(KEY)
  res.end()
})

console.log('Starting...')
server.listen(process.env.PORT, error => {
  if (error) throw error
  console.log('Started')
})
