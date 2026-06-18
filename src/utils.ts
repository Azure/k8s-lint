import * as os from 'os'
import * as path from 'path'
import {globSync, statSync, existsSync, mkdtempSync, writeFileSync} from 'node:fs'
import {getExecOutput} from '@actions/exec'

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}

export function isHelmChart(dir: string): boolean {
   try {
      const stat = statSync(dir)
      if (!stat.isDirectory()) return false
      return existsSync(path.join(dir, 'Chart.yaml'))
   } catch {
      return false
   }
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
         files = globSync(trimmed)
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

// Render a Helm chart to a temporary YAML file and return its path.
export async function renderHelmChart(
   chartDir: string,
   namespace?: string
): Promise<string> {
   const releaseName = path.basename(chartDir)
   const args = ['template', releaseName, chartDir]
   if (namespace) {
      args.push('--namespace', namespace)
   }
   const result = await getExecOutput('helm', args, {silent: true})
   if (result.exitCode !== 0) {
      throw new Error(
         `helm template failed for ${chartDir}:\n${result.stderr}`
      )
   }
   const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'k8s-lint-helm-'))
   const outPath = path.join(tmpDir, 'rendered.yaml')
   writeFileSync(outPath, result.stdout)
   return outPath
}
