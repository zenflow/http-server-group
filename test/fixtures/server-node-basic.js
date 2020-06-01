const { createServer } = require('http')

const server = createServer((_, res) => {
  res.write(process.env.RESPONSE_TEXT || '')
  res.end()
})

setTimeout(
  () =>
    server.listen(process.env.PORT, error => {
      if (error) throw error
      console.log('Started')
    }),
  Number.parseInt(process.env.START_DELAY || '0', 10)
)
