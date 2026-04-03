import {beforeEach, describe, expect, test, vi} from 'vitest'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import * as io from '@actions/io'
import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import {ToolRunner} from '@actions/exec/lib/toolrunner'

const osMockState = vi.hoisted(() => ({
   arch: 'x64',
   type: 'Linux'
}))

const fsMockState = vi.hoisted(() => ({
   chmodSync: vi.fn()
}))

vi.mock('os', async () => {
   const actual = await vi.importActual<typeof import('os')>('os')
   return {
      ...actual,
      arch: vi.fn(() => osMockState.arch),
      type: vi.fn(() => osMockState.type)
   }
})

vi.mock('fs', async () => {
   const actual = await vi.importActual<typeof import('fs')>('fs')
   return {
      ...actual,
      chmodSync: fsMockState.chmodSync
   }
})

var mockStatusCode: number
const mockExecFn = vi.fn().mockImplementation(() => mockStatusCode)
vi.mock('@actions/exec/lib/toolrunner', () => {
   return {
      ToolRunner: vi.fn().mockImplementation(() => {
         return {
            exec: mockExecFn
         }
      })
   }
})

import * as kubeconform from './kubeconform'

describe('Kubeconform', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test.each([
      ['arm64', 'arm64'],
      ['x64', 'amd64']
   ])(
      'getKubeconformArch() - return on %s os arch %s kubeconform arch',
      (osArch, kubeconformArch) => {
         osMockState.arch = osArch

         expect(kubeconform.getKubeconformArch()).toBe(kubeconformArch)
         expect(os.arch).toHaveBeenCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Linux %s',
      (arch) => {
         osMockState.type = 'Linux'
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-%s.tar.gz',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toHaveBeenCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Darwin %s',
      (arch) => {
         osMockState.type = 'Darwin'
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-darwin-%s.tar.gz',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toHaveBeenCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Windows %s',
      (arch) => {
         osMockState.type = 'Windows_NT'
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-windows-%s.zip',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toHaveBeenCalled()
      }
   )

   test('downloads kubeconform, extract zip, and returns path to it', async () => {
      osMockState.type = 'Windows_NT'
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      vi.spyOn(core, 'addPath').mockImplementation(() => {})

      expect(await kubeconform.downloadKubeconform()).toBe(
         path.join('pathToExtractedTool', 'kubeconform.exe')
      )
      expect(os.type).toHaveBeenCalled()
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         '755'
      )
      expect(core.addPath).toHaveBeenCalledWith('pathToExtractedTool')
   })

   test('downloads kubeconform, extract tar, and returns path to it', async () => {
      osMockState.type = 'Linux'
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue(
         path.join('pathToToolDir', 'tool')
      )
      vi.spyOn(io, 'cp').mockImplementation(async () => undefined as never)
      vi.spyOn(toolCache, 'extractTar').mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      vi.spyOn(core, 'addPath').mockImplementation(() => {})

      expect(await kubeconform.downloadKubeconform()).toBe(
         path.join('pathToExtractedTool', 'kubeconform')
      )
      expect(os.type).toHaveBeenCalled()
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(io.cp).toHaveBeenCalledWith(
         path.join('pathToToolDir', 'tool'),
         path.join('pathToToolDir', 'tool.tar.gz')
      )
      expect(toolCache.extractTar).toHaveBeenCalledWith(
         path.join('pathToToolDir', 'tool.tar.gz')
      )
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform'),
         '755'
      )
      expect(core.addPath).toHaveBeenCalledWith('pathToExtractedTool')
   })

   test('throws error if download tool fails', async () => {
      osMockState.type = 'Windows_NT'
      vi.spyOn(toolCache, 'downloadTool').mockRejectedValue(
         new Error('Unable to download')
      )

      await expect(kubeconform.downloadKubeconform()).rejects.toThrow()
      expect(os.type).toHaveBeenCalled()
      expect(toolCache.downloadTool).toHaveBeenCalled()
   })

   test('Gets path to kubeconform and uses it on manifests', async () => {
      vi.spyOn(io, 'which').mockResolvedValue('pathToTool')
      mockStatusCode = 0

      const kubeconformOpts = '-summary'
      const sampleManifests = [
         'manifest1.yaml',
         'manifest2.yaml',
         'manifest3.yaml'
      ]
      expect(
         await kubeconform.kubeconformLint(sampleManifests, kubeconformOpts)
      ).toBeUndefined()
      expect(io.which).toHaveBeenCalledWith('kubeconform', false)
      expect(ToolRunner).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(ToolRunner).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest2.yaml'
      ])
      expect(ToolRunner).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest3.yaml'
      ])
      expect(mockExecFn).toHaveBeenCalledTimes(3)
   })

   test('check if kubeconform is already installed, else download, and use it on manifests', async () => {
      vi.spyOn(io, 'which').mockReturnValue(Promise.resolve(''))
      osMockState.type = 'Windows_NT'
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      vi.spyOn(core, 'addPath').mockImplementation(() => {})
      mockStatusCode = 0

      const kubeconformOpts = '-summary'
      const sampleManifests = [
         'manifest1.yaml',
         'manifest2.yaml',
         'manifest3.yaml'
      ]
      expect(
         await kubeconform.kubeconformLint(sampleManifests, kubeconformOpts)
      ).toBeUndefined()
      expect(io.which).toHaveBeenCalledWith('kubeconform', false)
      expect(ToolRunner).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest1.yaml']
      )
      expect(ToolRunner).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest2.yaml']
      )
      expect(ToolRunner).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest3.yaml']
      )
      expect(mockExecFn).toHaveBeenCalledTimes(3)
   })

   test('throw if kubeconform fails on a manifest', async () => {
      vi.spyOn(io, 'which').mockResolvedValue('pathToTool')
      mockStatusCode = 1

      const kubeconformOpts = '-summary'
      const sampleManifests = ['manifest1.yaml']
      await expect(
         kubeconform.kubeconformLint(sampleManifests, kubeconformOpts)
      ).rejects.toThrow()
      expect(io.which).toHaveBeenCalledWith('kubeconform', false)
      expect(ToolRunner).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(mockExecFn).toHaveBeenCalledTimes(1)
   })
})
