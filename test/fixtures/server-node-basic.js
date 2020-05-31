const { createServer } = require('http')

const server = createServer((_, res) => {
  res.write(process.env.KEY)
  res.end()
})

console.log('Starting...')
server.listen(process.env.PORT, error => {
  if (error) throw error
  console.log('Started')
})
