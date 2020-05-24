module.exports = {
  rollup(config, options) {
    if (config.input === 'src/proxy.ts') {
      config.output.file = config.output.file.replace(
        'http-server-group.',
        'http-server-group-proxy.'
      )
    }
    return config
  },
}
