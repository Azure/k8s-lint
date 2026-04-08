import {beforeEach, describe, expect, test, vi} from 'vitest'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import * as io from '@actions/io'
import * as actionsExec from '@actions/exec'
import * as os from 'os'
import * as path from 'path'
import * as util from 'util'

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

const execMockState = vi.hoisted(() => {
   const state = {
      statusCode: 0,
      exec: vi.fn(async () => state.statusCode)
   }

   return state
})

const ioMockState = vi.hoisted(() => ({
   which: vi.fn(async () => ''),
   cp: vi.fn(async () => undefined)
}))

const toolCacheMockState = vi.hoisted(() => ({
   downloadTool: vi.fn(async () => ''),
   extractZip: vi.fn(async () => ''),
   extractTar: vi.fn(async () => '')
}))

const coreMockState = vi.hoisted(() => ({
   addPath: vi.fn()
}))

vi.mock('@actions/exec', () => {
   return {
      exec: execMockState.exec
   }
})

vi.mock('@actions/io', () => {
   return {
      which: ioMockState.which,
      cp: ioMockState.cp
   }
})

vi.mock('@actions/tool-cache', () => {
   return {
      downloadTool: toolCacheMockState.downloadTool,
      extractZip: toolCacheMockState.extractZip,
      extractTar: toolCacheMockState.extractTar
   }
})

vi.mock('@actions/core', () => {
   return {
      addPath: coreMockState.addPath
   }
})

import * as kubeconform from './kubeconform.js'

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
      toolCacheMockState.downloadTool.mockResolvedValue('pathToTool')
      toolCacheMockState.extractZip.mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      coreMockState.addPath.mockImplementation(() => {})

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
      toolCacheMockState.downloadTool.mockResolvedValue(
         path.join('pathToToolDir', 'tool')
      )
      ioMockState.cp.mockImplementation(async () => undefined)
      toolCacheMockState.extractTar.mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      coreMockState.addPath.mockImplementation(() => {})

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
      toolCacheMockState.downloadTool.mockRejectedValue(
         new Error('Unable to download')
      )

      await expect(kubeconform.downloadKubeconform()).rejects.toThrow()
      expect(os.type).toHaveBeenCalled()
      expect(toolCache.downloadTool).toHaveBeenCalled()
   })

   test('Gets path to kubeconform and uses it on manifests', async () => {
      ioMockState.which.mockResolvedValue('pathToTool')
      execMockState.statusCode = 0

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
      expect(actionsExec.exec).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(actionsExec.exec).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest2.yaml'
      ])
      expect(actionsExec.exec).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest3.yaml'
      ])
      expect(execMockState.exec).toHaveBeenCalledTimes(3)
   })

   test('check if kubeconform is already installed, else download, and use it on manifests', async () => {
      ioMockState.which.mockResolvedValue('')
      osMockState.type = 'Windows_NT'
      toolCacheMockState.downloadTool.mockResolvedValue('pathToTool')
      toolCacheMockState.extractZip.mockResolvedValue('pathToExtractedTool')
      fsMockState.chmodSync.mockImplementation(() => {})
      coreMockState.addPath.mockImplementation(() => {})
      execMockState.statusCode = 0

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
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest1.yaml']
      )
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest2.yaml']
      )
      expect(actionsExec.exec).toHaveBeenCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest3.yaml']
      )
      expect(execMockState.exec).toHaveBeenCalledTimes(3)
   })

   test('throw if kubeconform fails on a manifest', async () => {
      ioMockState.which.mockResolvedValue('pathToTool')
      execMockState.statusCode = 1

      const kubeconformOpts = '-summary'
      const sampleManifests = ['manifest1.yaml']
      await expect(
         kubeconform.kubeconformLint(sampleManifests, kubeconformOpts)
      ).rejects.toThrow()
      expect(io.which).toHaveBeenCalledWith('kubeconform', false)
      expect(actionsExec.exec).toHaveBeenCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(execMockState.exec).toHaveBeenCalledTimes(1)
   })
})
