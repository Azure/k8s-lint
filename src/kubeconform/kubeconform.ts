import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as actionsExec from '@actions/exec'
import {
   getExecutableExtension,
   getPlatform,
   getArch,
   getArchiveExtension
} from '../utils.js'

const TOOL_NAME = 'kubeconform'

export async function kubeconformLint(
   manifests: string[],
   kubeconformOptions: string
) {
   const toolPath =
      (await io.which(TOOL_NAME, false)) || (await downloadKubeconform())
   for (const manifest of manifests) {
      const code = await actionsExec.exec(toolPath, [
         ...kubeconformOptions.split(/\s+/).filter(Boolean),
         manifest
      ])

      if (code != 0) {
         throw Error('Your manifest has errors')
      }
   }
}

export async function downloadKubeconform(): Promise<string> {
   const downloadPath = await toolCache.downloadTool(
      getKubeconformDownloadUrl()
   )

   let extractedPath: string
   if (getPlatform() === 'windows') {
      extractedPath = await toolCache.extractZip(downloadPath)
   } else {
      const archivePath = path.join(path.dirname(downloadPath), 'tool.tar.gz')
      await io.cp(downloadPath, archivePath)
      extractedPath = await toolCache.extractTar(archivePath)
   }

   const kubeconformPath = path.join(
      extractedPath,
      TOOL_NAME + getExecutableExtension()
   )
   fs.chmodSync(kubeconformPath, '755')
   core.addPath(extractedPath)
   return kubeconformPath
}

export function getKubeconformDownloadUrl(): string {
   const platform = getPlatform()
   const arch = getArch()
   return `https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-${platform}-${arch}.${getArchiveExtension()}`
}
