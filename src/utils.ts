import * as os from 'os'
import * as path from 'path'
import {globSync, statSync, existsSync} from 'node:fs'
import {isHelmChart} from './helm/helm.js'

export function getExecutableExtension(): string {
   if (getPlatform() === 'windows') {
      return '.exe'
   }
   return ''
}

export function getPlatform(): string {
   switch (os.type()) {
      case 'Windows_NT':
         return 'windows'
      case 'Darwin':
         return 'darwin'
      default:
         return 'linux'
   }
}

export function getArch(): string {
   const arch = os.arch()
   if (arch === 'x64') return 'amd64'
   return arch
}

export function getArchiveExtension(): string {
   return getPlatform() === 'windows' ? 'zip' : 'tar.gz'
}

const GLOB_CHARS_RE = /[*?[{}]/
const MANIFEST_EXT = '**/*.{yaml,yml,json}'

// Expand each raw path — glob patterns and directories are resolved to
// individual files; plain file paths pass through unchanged.
// Helm chart directories (containing Chart.yaml) are returned as-is
// so the caller can render them with helm template.
export function expandManifests(rawPaths: string[]): string[] {
   const seen = new Set<string>()
   const result: string[] = []

   for (const raw of rawPaths) {
      const trimmed = raw.trim()
      if (!trimmed) continue

      let files: string[]

      if (GLOB_CHARS_RE.test(trimmed)) {
         const matches = globSync(trimmed)
         if (matches.length === 0) {
            files = [trimmed]
         } else {
            files = []
            for (const match of matches) {
               try {
                  const stat = statSync(match)
                  if (stat.isDirectory()) {
                     if (isHelmChart(match)) {
                        files.push(match)
                     } else {
                        files.push(
                           ...globSync(MANIFEST_EXT, {cwd: match}).map((f) =>
                              path.join(match, f)
                           )
                        )
                     }
                  } else {
                     files.push(match)
                  }
               } catch {
                  files.push(match)
               }
            }
         }
      } else {
         try {
            const stat = statSync(trimmed)
            if (stat.isDirectory()) {
               if (isHelmChart(trimmed)) {
                  files = [trimmed]
               } else {
                  files = globSync(MANIFEST_EXT, {cwd: trimmed}).map((f) =>
                     path.join(trimmed, f)
                  )
               }
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
