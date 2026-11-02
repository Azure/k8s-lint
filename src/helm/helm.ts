import * as os from 'os'
import * as path from 'path'
import {existsSync, mkdtempSync, writeFileSync, statSync} from 'node:fs'
import {getExecOutput} from '@actions/exec'
import * as core from '@actions/core'
import * as io from '@actions/io'

const TOOL_NAME = 'helm'

export function isHelmChart(dir: string): boolean {
   try {
      const stat = statSync(dir)
      if (!stat.isDirectory()) return false
      return existsSync(path.join(dir, 'Chart.yaml'))
   } catch {
      return false
   }
}

export async function renderHelmChart(
   chartDir: string,
   namespace?: string
): Promise<string> {
   const helmPath = await io.which(TOOL_NAME, true)
   const releaseName = path.basename(chartDir)
   const args = ['template', releaseName, chartDir]

   if (namespace) {
      args.push('--namespace', namespace)
   }
   const result = await getExecOutput(helmPath, args, {silent: true})
   if (result.exitCode !== 0) {
      throw new Error(`helm template failed for ${chartDir}:\n${result.stderr}`)
   }
   const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'k8s-lint-helm-'))
   const outPath = path.join(tmpDir, 'rendered.yaml')
   writeFileSync(outPath, result.stdout)
   return outPath
}
