import { inspect } from 'util'
import sc from 'supports-color'
import Logger from './shared'

Logger.format('o', (value, target) => {
  return inspect(value, { colors: !!target.colors }).replace(/\s*\n\s*/g, ' ')
})

Logger.targets[0].colors = sc.stdout && sc.stdout.level

export = Logger
