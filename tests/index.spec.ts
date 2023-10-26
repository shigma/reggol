import { install, InstalledClock } from '@sinonjs/fake-timers'
import { expect } from 'chai'
import Logger from '../src/node'

describe('Reggol', () => {
  let logger: Logger
  let data: string
  let clock: InstalledClock

  before(() => {
    clock = install({ now: Date.now() })

    Logger.targets.push({
      showDiff: true,
      print(text) {
        data += text + '\n'
      },
    })
  })

  after(() => {
    Logger.targets.pop()
    clock.uninstall()
  })

  beforeEach(() => {
    data = ''
  })

  it('basic support', () => {
    logger = new Logger('test').extend('logger')
    expect(logger.name).to.equal('test:logger')
    logger = new Logger('test')
  })

  it('format error', () => {
    const inner = new Error('message')
    inner.stack = undefined
    const outer = new Error('outer')
    outer['errors'] = [inner]
    logger.error(outer)
    expect(data).to.equal('[E] test message +0ms\n')
  })

  it('format object', () => {
    clock.tick(2)
    const object = { foo: 'bar' }
    logger.success(object)
    expect(data).to.equal("[S] test { foo: 'bar' } +2ms\n")
  })

  it('custom formatter', () => {
    clock.tick(1)
    Logger.formatters.x = () => 'custom'
    logger.info('%x%%x')
    expect(data).to.equal('[I] test custom%x +1ms\n')
  })

  it('log levels', () => {
    logger.debug('%c', 'foo bar')
    expect(data).to.equal('')

    logger.level = Logger.SILENT
    logger.debug('%c', 'foo bar')
    expect(data).to.equal('')

    logger.level = Logger.DEBUG
    logger.debug('%c', 'foo bar')
    expect(data).to.be.ok
  })

  it('label style', () => {
    Logger.targets[1].label = { align: 'right', width: 10, margin: 2 }
    logger.info('message\nmessage')
    expect(data).to.equal([
      '      test  [I]  message\n',
      '                 message +0ms\n',
    ].join(''))
  })
})
