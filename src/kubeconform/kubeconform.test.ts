import * as kubeconform from './kubeconform'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import * as io from '@actions/io'
import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import {ToolRunner} from '@actions/exec/lib/toolrunner'

var mockStatusCode: number
const mockExecFn = jest.fn().mockImplementation(() => mockStatusCode)
jest.mock('@actions/exec/lib/toolrunner', () => {
   return {
      ToolRunner: jest.fn().mockImplementation(() => {
         return {
            exec: mockExecFn
         }
      })
   }
})

describe('Kubeconform', () => {
   beforeEach(() => {
      jest.clearAllMocks()
   })

   test.each([
      ['arm64', 'arm64'],
      ['x64', 'amd64']
   ])(
      'getKubeconformArch() - return on %s os arch %s kubeconform arch',
      (osArch, kubeconformArch) => {
         jest.spyOn(os, 'arch').mockReturnValue(osArch)

         expect(kubeconform.getKubeconformArch()).toBe(kubeconformArch)
         expect(os.arch).toBeCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Linux %s',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Linux')
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-%s.tar.gz',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toBeCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Darwin %s',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Darwin')
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-darwin-%s.tar.gz',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toBeCalled()
      }
   )

   test.each([['arm64'], ['amd64']])(
      'returns url to download kubeconform for Windows %s',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
         const kubeconformLinuxUrl = util.format(
            'https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-windows-%s.zip',
            arch
         )
         expect(kubeconform.getKubeconformDownloadUrl(arch)).toBe(
            kubeconformLinuxUrl
         )
         expect(os.type).toBeCalled()
      }
   )

   test('downloads kubeconform, extract zip, and returns path to it', async () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToExtractedTool')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'addPath').mockImplementation()

      expect(await kubeconform.downloadKubeconform()).toBe(
         path.join('pathToExtractedTool', 'kubeconform.exe')
      )
      expect(os.type).toBeCalled()
      expect(toolCache.downloadTool).toBeCalled()
      expect(toolCache.extractZip).toBeCalledWith('pathToTool')
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         '755'
      )
      expect(core.addPath).toBeCalledWith('pathToExtractedTool')
   })

   test('downloads kubeconform, extract tar, and returns path to it', async () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockResolvedValue(path.join('pathToToolDir', 'tool'))
      jest.spyOn(io, 'cp').mockImplementation()
      jest
         .spyOn(toolCache, 'extractTar')
         .mockResolvedValue('pathToExtractedTool')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'addPath').mockImplementation()

      expect(await kubeconform.downloadKubeconform()).toBe(
         path.join('pathToExtractedTool', 'kubeconform')
      )
      expect(os.type).toBeCalled()
      expect(toolCache.downloadTool).toBeCalled()
      expect(io.cp).toBeCalledWith(
         path.join('pathToToolDir', 'tool'),
         path.join('pathToToolDir', 'tool.tar.gz')
      )
      expect(toolCache.extractTar).toBeCalledWith(
         path.join('pathToToolDir', 'tool.tar.gz')
      )
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToExtractedTool', 'kubeconform'),
         '755'
      )
      expect(core.addPath).toBeCalledWith('pathToExtractedTool')
   })

   test('throws error if download tool fails', async () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockRejectedValue(new Error('Unable to download'))

      await expect(kubeconform.downloadKubeconform()).rejects.toThrow()
      expect(os.type).toBeCalled()
      expect(toolCache.downloadTool).toBeCalled()
   })

   test('Gets path to kubeconform and uses it on manifests', async () => {
      jest.spyOn(io, 'which').mockResolvedValue('pathToTool')
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
      expect(io.which).toBeCalledWith('kubeconform', false)
      expect(ToolRunner).toBeCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(ToolRunner).toBeCalledWith('pathToTool', [
         '-summary',
         'manifest2.yaml'
      ])
      expect(ToolRunner).toBeCalledWith('pathToTool', [
         '-summary',
         'manifest3.yaml'
      ])
      expect(mockExecFn).toBeCalledTimes(3)
   })

   test('check if kubeconform is already installed, else download, and use it on manifests', async () => {
      jest.spyOn(io, 'which').mockReturnValue(Promise.resolve(''))
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToExtractedTool')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'addPath').mockImplementation()
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
      expect(io.which).toBeCalledWith('kubeconform', false)
      expect(ToolRunner).toBeCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest1.yaml']
      )
      expect(ToolRunner).toBeCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest2.yaml']
      )
      expect(ToolRunner).toBeCalledWith(
         path.join('pathToExtractedTool', 'kubeconform.exe'),
         ['-summary', 'manifest3.yaml']
      )
      expect(mockExecFn).toBeCalledTimes(3)
   })

   test('throw if kubeconform fails on a manifest', async () => {
      jest.spyOn(io, 'which').mockResolvedValue('pathToTool')
      mockStatusCode = 1

      const kubeconformOpts = '-summary'
      const sampleManifests = ['manifest1.yaml']
      await expect(
         kubeconform.kubeconformLint(sampleManifests, kubeconformOpts)
      ).rejects.toThrow()
      expect(io.which).toBeCalledWith('kubeconform', false)
      expect(ToolRunner).toBeCalledWith('pathToTool', [
         '-summary',
         'manifest1.yaml'
      ])
      expect(mockExecFn).toBeCalledTimes(1)
   })
})
