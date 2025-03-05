import { inspect } from 'util'
import { Factory } from './shared'

Factory.formatters['o'] = (value, target) => {
  return inspect(value, { colors: !!target.colors, depth: Infinity, compact: true, breakLength: Infinity })
}

export * from './shared'
