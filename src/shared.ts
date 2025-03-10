import supportsColor, { ColorSupportLevel } from 'supports-color'
import { Time } from 'cosmokit'

const c16 = [6, 2, 3, 4, 5, 1]
const c256 = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62,
  63, 68, 69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113,
  129, 134, 135, 148, 149, 160, 161, 162, 163, 164, 165, 166, 167, 168,
  169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200,
  201, 202, 203, 204, 205, 206, 207, 208, 209, 214, 215, 220, 221,
]

function isAggregateError(error: any): error is Error & { errors: Error[] } {
  return error instanceof Error && Array.isArray((error as any)['errors'])
}

export type Method = (format: any, ...param: any[]) => void
export type Formatter = (value: any, exporter: Exporter, logger: Logger) => any

export type Type = 'success' | 'error' | 'info' | 'warn' | 'debug'

export interface Message {
  sn: number
  ts: number
  name: string
  type: Type
  level: Level
  body: string
}

export interface Logger extends Record<Type, Method> {}

export const enum Level {
  SILENT = 0,
  SUCCESS = 1,
  ERROR = 1,
  INFO = 2,
  WARN = 2,
  DEBUG = 3,
}

export class Logger {
  static color(exporter: Exporter, code: number, value: any, decoration = '') {
    if (!exporter.colors) return '' + value
    return `\u001b[3${code < 8 ? code : '8;5;' + code}${exporter.colors >= 2 ? decoration : ''}m${value}\u001b[0m`
  }

  static code(name: string, level?: false | ColorSupportLevel) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 3) - hash) + name.charCodeAt(i) + 13
      hash |= 0
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16
    return colors[Math.abs(hash) % colors.length]
  }

  constructor(public name: string, private _meta: any, private _factory: Factory) {
    this.success = this._method('success', Level.SUCCESS)
    this.error = this._method('error', Level.ERROR)
    this.info = this._method('info', Level.INFO)
    this.warn = this._method('warn', Level.WARN)
    this.debug = this._method('debug', Level.DEBUG)
  }

  private _method(type: Type, level: Level) {
    return (...args: any[]) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) {
          this[type](args[0].cause)
        } else if (isAggregateError(args[0])) {
          args[0].errors.forEach(error => this[type](error))
          return
        }
      }

      const sn = ++this._factory._snMessage
      const ts = Date.now()
      for (const exporter of this._factory.exporters.values()) {
        const targetLevel = exporter.levels?.[this.name] ?? exporter.levels?.default ?? Level.INFO
        if (targetLevel < level) continue
        const body = this._format(exporter, args.slice())
        const message: Message = { ...this._meta, sn, ts, type, level, name: this.name, body }
        exporter.export(message)
      }
    }
  }

  private _format(exporter: Exporter, args: any[]) {
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message
      args.unshift('%s')
    } else if (typeof args[0] !== 'string') {
      args.unshift('%o')
    }

    let format: string = args.shift()
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === '%%') return '%'
      const formatter = this._factory.formatters[char]
      if (typeof formatter === 'function') {
        const value = args.shift()
        return formatter(value, exporter, this)
      }
      return match
    })

    for (let arg of args) {
      if (typeof arg === 'object' && arg) {
        arg = this._factory.formatters['o'](arg, exporter, this)
      }
      format += ' ' + arg
    }

    const { maxLength = 10240 } = exporter
    return format.split(/\r?\n/g).map(line => {
      return line.slice(0, maxLength) + (line.length > maxLength ? '...' : '')
    }).join('\n')
  }
}

export class Factory {
  static formatters: Record<string, Formatter> = {
    s: (value) => value,
    d: (value, exporter) => Logger.color(exporter, 3, value),
    j: (value) => JSON.stringify(value),
    c: (value, exporter, logger) => {
      return Logger.color(exporter, Logger.code(logger.name, exporter.colors), value)
    },
  }

  _snMessage = 0
  _snExporter = 0

  exporters = new Map<number, Exporter>()
  formatters = Object.create(Factory.formatters)

  createLogger(name: string, meta: any = {}) {
    return new Logger(name, meta, this)
  }

  addExporter(exporter: Exporter) {
    this.exporters.set(++this._snExporter, exporter)
    return () => this.exporters.delete(this._snExporter)
  }
}

export interface Exporter extends Exporter.Options {
  export(message: Message): void
}

export namespace Exporter {
  export interface Options {
    colors?: false | ColorSupportLevel
    maxLength?: number
    levels?: Record<string, number>
  }

  export interface Console extends Console.Options {}

  export class Console implements Exporter {
    constructor(options?: Console.Options) {
      Object.assign(this, {
        colors: supportsColor.stdout ? supportsColor.stdout.level : 0,
        showTime: 'yyyy-MM-dd hh:mm:ss ',
        showDiff: false,
        ...options,
      })
    }

    export(message: Message) {
      console.log(this.render(message))
    }

    render(message: Message) {
      const prefix = `[${message.type[0].toUpperCase()}]`
      const space = ' '.repeat(this.label?.margin ?? 1)
      let indent = 3 + space.length, output = ''
      if (this.showTime) {
        indent += this.showTime.length
        output += Logger.color(this, 8, Time.template(this.showTime))
      }
      const code = Logger.code(message.name, this.colors)
      const label = Logger.color(this, code, message.name, ';1')
      const padLength = (this.label?.width ?? 0) + label.length - message.name.length
      if (this.label?.align === 'right') {
        output += label.padStart(padLength) + space + prefix + space
        indent += (this.label.width ?? 0) + space.length
      } else {
        output += prefix + space + label.padEnd(padLength) + space
      }
      output += message.body.replace(/\n/g, '\n' + ' '.repeat(indent))
      if (this.showDiff && this.timestamp) {
        const diff = message.ts - this.timestamp
        output += Logger.color(this, code, ' +' + Time.format(diff))
      }
      this.timestamp = message.ts
      return output
    }
  }

  export namespace Console {
    export interface Options extends Exporter.Options {
      showDiff?: boolean
      showTime?: string
      label?: LabelStyle
      timestamp?: number
    }

    export interface LabelStyle {
      width?: number
      margin?: number
      align?: 'left' | 'right'
    }
  }
}
