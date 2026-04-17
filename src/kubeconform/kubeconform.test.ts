import {beforeEach, describe, expect, test, vi} from 'vitest'
import * as path from 'path'
import * as util from 'util'

vi.mock('os')
vi.mock('fs')
vi.mock('@actions/exec')
vi.mock('@actions/io')
vi.mock('@actions/tool-cache')
vi.mock('@actions/core')

const os = await import('os')
const fs = await import('fs')
const actionsExec = await import('@actions/exec')
const io = await import('@actions/io')
const toolCache = await import('@actions/tool-cache')
const core = await import('@actions/core')
const kubeconform = await import('./kubeconform.js')

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
         vi.mocked(os.arch).mockReturnValue(osArch)
         expect(kubeconform.getKubeconformArch()).toBe(kubeconformArch)
         expect(os.arch).toHaveBeenCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Linux %s',
      (arch) => {
         vi.mocked(os.type).mockReturnValue('Linux')
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
         vi.mocked(os.type).mockReturnValue('Darwin')
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
         vi.mocked(os.type).mockReturnValue('Windows_NT')
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
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      vi.mocked(toolCache.extractZip).mockResolvedValue('pathToExtractedTool')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(core.addPath).mockImplementation(() => {})

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
      vi.mocked(os.type).mockReturnValue('Linux')
      vi.mocked(toolCache.downloadTool).mockResolvedValue(
         path.join('pathToToolDir', 'tool')
      )
      vi.mocked(io.cp).mockResolvedValue()
      vi.mocked(toolCache.extractTar).mockResolvedValue('pathToExtractedTool')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(core.addPath).mockImplementation(() => {})

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
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      vi.mocked(toolCache.downloadTool).mockRejectedValue(
         new Error('Unable to download')
      )

      await expect(kubeconform.downloadKubeconform()).rejects.toThrow()
      expect(os.type).toHaveBeenCalled()
      expect(toolCache.downloadTool).toHaveBeenCalled()
   })

   test('Gets path to kubeconform and uses it on manifests', async () => {
      vi.mocked(io.which).mockResolvedValue('pathToTool')
      vi.mocked(actionsExec.exec).mockResolvedValue(0)

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
      expect(actionsExec.exec).toHaveBeenCalledTimes(3)
   })

   test('check if kubeconform is already installed, else download, and use it on manifests', async () => {
      vi.mocked(io.which).mockResolvedValue('')
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      vi.mocked(toolCache.extractZip).mockResolvedValue('pathToExtractedTool')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(core.addPath).mockImplementation(() => {})
      vi.mocked(actionsExec.exec).mockResolvedValue(0)

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
      expect(actionsExec.exec).toHaveBeenCalledTimes(3)
   })

   test('throw if kubeconform fails on a manifest', async () => {
      vi.mocked(io.which).mockResolvedValue('pathToTool')
      vi.mocked(actionsExec.exec).mockResolvedValue(1)

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
      expect(actionsExec.exec).toHaveBeenCalledTimes(1)
   })
})
