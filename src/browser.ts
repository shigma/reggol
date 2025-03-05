import inspect from 'object-inspect'
import { Factory } from './shared'

Factory.formatters['o'] = (value, target) => {
  return inspect(value, { depth: Infinity })
}

export * from './shared'
