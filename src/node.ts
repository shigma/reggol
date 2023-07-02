import { inspect } from 'util'
import Logger from './shared'

Logger.format('o', (value, target) => {
  return inspect(value, { colors: !!target.colors, depth: Infinity }).replace(/\s*\n\s*/g, ' ')
})

export = Logger
