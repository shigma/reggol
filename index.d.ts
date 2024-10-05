declare namespace Logger {
  export interface LevelConfig {
    base: number
    [K: string]: Level
  }

  export type Level = number | LevelConfig
  export type Function = (format: any, ...param: any[]) => void
  export type Type = 'success' | 'error' | 'info' | 'warn' | 'debug'
  export type Formatter = (this: Logger, value: any) => string

  export interface LabelStyle {
    width?: number
    margin?: number
    align?: 'left' | 'right'
  }

  export interface Record {
    id: number
    meta: Meta
    name: string
    type: Type
    level: number
    content: string
    timestamp: number
  }

  export interface Meta {}

  export interface Target {
    /**
     * - 0: no color support
     * - 1: 16 color support
     * - 2: 256 color support
     * - 3: truecolor support
     */
    colors?: number
    showDiff?: boolean
    showTime?: string
    label?: LabelStyle
    record?(record: Record): void
    print?(text: string): void
    levels?: LevelConfig
    timestamp?: number
  }
}

declare interface Logger extends Record<Logger.Type, Logger.Function> {}

declare class Logger {
  // log levels
  static readonly SILENT = 0
  static readonly SUCCESS = 1
  static readonly ERROR = 1
  static readonly INFO = 2
  static readonly WARN = 2
  static readonly DEBUG = 3

  // global config
  static colors: number[]
  static instances: Record<string, Logger>
  static targets: Logger.Target[]
  static levels: Logger.LevelConfig
  static formatters: Record<string, Logger.Formatter>

  static color(code: number, value: any, decoration?: string): string
  static code(name: string, target: Logger.Target): number

  public name: string
  public level: number

  private code: number

  constructor(name: string, meta?: any)

  extend(namespace: string): Logger
}

export = Logger
