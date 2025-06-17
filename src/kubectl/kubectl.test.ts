import * as kubectl from './kubectl'
import * as io from '@actions/io'
import * as path from 'path'
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

describe('Kubectl', () => {
   test('throws if kubeconfig not set', async () => {
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test("throws if kubectl can't be found", async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      jest.spyOn(io, 'which').mockReturnValue(Promise.resolve(''))
      await expect(kubectl.kubectlLint([], 'default')).rejects.toThrow()
   })

   test('gets kubectl, validates kubeconfig, and lints the manifests', async () => {
      process.env['KUBECONFIG'] = 'kubeconfig'
      const pathToTool = 'pathToTool'
      jest
         .spyOn(io, 'which')
         .mockResolvedValue(path.join(pathToTool, 'kubectl.exe'))
      mockStatusCode = 0

      const sampleManifests = [
         'manifest1.yaml',
         'manifest2.yaml',
         'manifest3.yaml'
      ]
      expect(await kubectl.kubectlLint(sampleManifests, 'default'))
      expect(ToolRunner).toHaveBeenCalledWith(path.join(pathToTool, 'kubectl.exe'), [
         'apply',
         '-f',
         'manifest1.yaml',
         '--dry-run=server',
         '--namespace',
         'default'
      ])
      expect(ToolRunner).toHaveBeenCalledWith(path.join(pathToTool, 'kubectl.exe'), [
         'apply',
         '-f',
         'manifest2.yaml',
         '--dry-run=server',
         '--namespace',
         'default'
      ])
      expect(ToolRunner).toHaveBeenCalledWith(path.join(pathToTool, 'kubectl.exe'), [
         'apply',
         '-f',
         'manifest3.yaml',
         '--dry-run=server',
         '--namespace',
         'default'
      ])
      expect(mockExecFn).toHaveBeenCalledTimes(3)
   })
})
