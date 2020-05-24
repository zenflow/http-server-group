const { startHttpServerGroup } = require('../..')

startHttpServerGroup(JSON.parse(process.env.CONFIG))
