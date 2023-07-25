import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import {ToolRunner} from '@actions/exec/lib/toolrunner'
import {getExecutableExtension} from '../utils'

const TOOL_NAME = 'kubeconform'

export function getKubeconformArch(): string {
   const arch = os.arch()
   if (arch === 'x64') {
      return 'amd64'
   }
   return arch
}

export async function kubeconformLint(
   manifests: string[],
   kubeconformOptions: string
) {
   const toolPath =
      (await io.which(TOOL_NAME, false)) || (await downloadKubeconform())
   for (const manifest of manifests) {
      const toolRunner = new ToolRunner(toolPath, [
         kubeconformOptions,
         manifest
      ])
      const code = await toolRunner.exec()

      if (code != 0) {
         throw Error('Your manifest has errors')
      }
   }
}

export async function downloadKubeconform(): Promise<string> {
   const runnerArch = getKubeconformArch()
   const downloadPath = await toolCache.downloadTool(
      getKubeconformDownloadUrl(runnerArch)
   )

   // extract from download
   let extractedPath
   switch (os.type()) {
      case 'Linux':
      case 'Darwin':
         const newPath = path.join(path.dirname(downloadPath), 'tool.tar.gz')
         await io.cp(downloadPath, newPath)
         extractedPath = await toolCache.extractTar(newPath)
         break
      case 'Windows_NT':
      default:
         extractedPath = await toolCache.extractZip(downloadPath)
   }

   // get and make executable
   const kubeconformPath = path.join(
      extractedPath,
      TOOL_NAME + getExecutableExtension()
   )
   fs.chmodSync(kubeconformPath, '755')
   core.addPath(extractedPath)
   return kubeconformPath
}

export function getKubeconformDownloadUrl(arch: string): string {
   switch (os.type()) {
      case 'Linux':
         return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-${arch}.tar.gz`

      case 'Darwin':
         return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-darwin-${arch}.tar.gz`

      case 'Windows_NT':
      default:
         return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-windows-${arch}.zip`
   }
}
