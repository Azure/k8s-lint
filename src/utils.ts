import * as os from 'os'
import * as path from 'path'
import {globSync, statSync} from 'node:fs'

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}

const GLOB_CHARS_RE = /[*?[{}]/
const MANIFEST_EXT = '**/*.{yaml,yml,json}'

// Expand each raw path — glob patterns and directories are resolved to individual files; plain file paths pass through unchanged.
export function expandManifests(rawPaths: string[]): string[] {
   const seen = new Set<string>()
   const result: string[] = []

   for (const raw of rawPaths) {
      const trimmed = raw.trim()
      if (!trimmed) continue

      let files: string[]

      if (GLOB_CHARS_RE.test(trimmed)) {
         files = globSync(trimmed)
      } else {
         try {
            const stat = statSync(trimmed)
            if (stat.isDirectory()) {
               files = globSync(MANIFEST_EXT, {cwd: trimmed}).map((f) =>
                  path.join(trimmed, f)
               )
            } else {
               files = [trimmed]
            }
         } catch {
            files = [trimmed]
         }
      }

      for (const file of files) {
         if (!seen.has(file)) {
            seen.add(file)
            result.push(file)
         }
      }
   }

   return result
}
