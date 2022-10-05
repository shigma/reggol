import inspect from 'object-inspect'
import Logger from './shared'

Logger.format('o', (value, target) => {
  return inspect(value).replace(/\s*\n\s*/g, ' ')
})

export = Logger
