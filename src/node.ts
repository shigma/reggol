import { format, inspect } from 'util'
import { stdout } from 'supports-color'
import { Time } from 'cosmokit'

const c16 = [6, 2, 3, 4, 5, 1]
const c256 = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62,
  63, 68, 69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113,
  129, 134, 135, 148, 149, 160, 161, 162, 163, 164, 165, 166, 167, 168,
  169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200,
  201, 202, 203, 204, 205, 206, 207, 208, 209, 214, 215, 220, 221,
]

namespace Logger {
  export interface LevelConfig {
    base: number
    [K: string]: Level
  }

  export type Level = number | LevelConfig
  export type Function = (format: any, ...param: any[]) => void
  export type Type = 'success' | 'error' | 'info' | 'warn' | 'debug'

  export interface Target {
    colors?: number
    showDiff?: boolean
    showTime?: string
    space?: number
    padStart?: number
    print(text: string): void
  }
}

interface Logger extends Record<Logger.Type, Logger.Function> { }

class Logger {
  // log levels
  static readonly SILENT = 0
  static readonly SUCCESS = 1
  static readonly ERROR = 1
  static readonly INFO = 2
  static readonly WARN = 2
  static readonly DEBUG = 3

  // global config
  static timestamp = 0
  static instances: Record<string, Logger> = {}

  static targets: Logger.Target[] = [{
    colors: stdout && stdout.level,
    print(text: string) {
      process.stdout.write(text + '\n')
    },
  }]

  static formatters: Record<string, (value: any, target: Logger.Target, logger: Logger) => string> = {
    c: (value, target, logger) => Logger.color(target, Logger.code(logger.name, target), value),
    C: (value, target) => Logger.color(target, 15, value, ';1'),
    o: (value, target) => inspect(value, { colors: !!target.colors }).replace(/\s*\n\s*/g, ' '),
  }

  static levels: Logger.LevelConfig = {
    base: 2,
  }

  static color(target: Logger.Target, code: number, value: any, decoration = '') {
    if (!target.colors) return '' + value
    return `\u001b[3${code < 8 ? code : '8;5;' + code}${target.colors >= 2 ? decoration : ''}m${value}\u001b[0m`
  }

  static code(name: string, target: Logger.Target) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 3) - hash) + name.charCodeAt(i)
      hash |= 0
    }
    const colors = target.colors >= 2 ? c256 : target.colors >= 1 ? c16 : []
    return colors[Math.abs(hash) % colors.length]
  }

  constructor(public name: string) {
    if (name in Logger.instances) return Logger.instances[name]

    Logger.instances[name] = this
    this.createMethod('success', '[S]', Logger.SUCCESS)
    this.createMethod('error', '[E]', Logger.ERROR)
    this.createMethod('info', '[I]', Logger.INFO)
    this.createMethod('warn', '[W]', Logger.WARN)
    this.createMethod('debug', '[D]', Logger.DEBUG)
  }

  extend = (namespace: string) => {
    return new Logger(`${this.name}:${namespace}`)
  }

  createMethod(name: Logger.Type, prefix: string, minLevel: number) {
    this[name] = (...args) => {
      if (this.level < minLevel) return
      const now = Date.now()
      for (const target of Logger.targets) {
        const delim = ' '.repeat(target.space || 1)
        let indent = 4 + 2 * delim.length, output = ''
        if (target.showTime) {
          indent += target.showTime.length + delim.length
          output += Logger.color(target, 8, Time.template(target.showTime)) + delim
        }
        if (target.padStart) {
          indent += delim.length + target.padStart
          output += this.color(target, this.name.padStart(target.padStart), ';1') + delim
        }
        output += prefix + delim
        if (!target.padStart) {
          output += this.color(target, this.name, ';1') + delim
        }
        output += this.format(target, indent, ...args)
        if (target.showDiff) {
          const diff = Logger.timestamp && now - Logger.timestamp
          output += this.color(target, delim + '+' + Time.format(diff))
        }
        target.print(output)
      }
      Logger.timestamp = now
    }
  }

  private color(target: Logger.Target, value: any, decoration = '') {
    const code = Logger.code(this.name, target)
    return Logger.color(target, code, value, decoration)
  }

  private format(target: Logger.Target, indent: number, ...args: any[]) {
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message
    } else if (typeof args[0] !== 'string') {
      args.unshift('%O')
    }

    let index = 0
    args[0] = (args[0] as string).replace(/%([a-zA-Z%])/g, (match, format) => {
      if (match === '%%') return '%'
      index += 1
      const formatter = Logger.formatters[format]
      if (typeof formatter === 'function') {
        match = formatter(args[index], target, this)
        args.splice(index, 1)
        index -= 1
      }
      return match
    }).replace(/\n/g, '\n' + ' '.repeat(indent))

    return format(...args)
  }

  get level() {
    const paths = this.name.split(':')
    let config: Logger.Level = Logger.levels
    do {
      config = config[paths.shift()] ?? config['base']
    } while (paths.length && typeof config === 'object')
    return config as number
  }

  set level(value) {
    const paths = this.name.split(':')
    let config = Logger.levels
    while (paths.length > 1) {
      const name = paths.shift()
      const value = config[name]
      if (typeof value === 'object') {
        config = value
      } else {
        config = config[name] = { base: value ?? config.base }
      }
    }
    config[paths[0]] = value
  }
}

export = Logger
