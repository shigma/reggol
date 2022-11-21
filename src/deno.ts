import Logger from './shared'

declare namespace Deno {
    export function inspect(value: unknown, options?: Record<string, any>): string
    export const noColor: boolean
}

Logger.format('o', (value, target) => {
    return Deno.inspect(value, { colors: !!target.colors }).replace(/\s*\n\s*/g, ' ')
})

Logger.targets[0].colors = !Deno.noColor && 3

export = Logger