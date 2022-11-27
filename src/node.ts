import { inspect } from 'util'
import Logger from './shared'

Logger.format('o', (value, target) => {
  return inspect(value, { colors: !!target.colors }).replace(/\s*\n\s*/g, ' ')
})

export = Logger
