import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('os')
vi.mock('node:fs', async (importOriginal) => ({
   ...(await importOriginal<typeof import('node:fs')>()),
   globSync: vi.fn(),
   statSync: vi.fn(),
   existsSync: vi.fn(),
   mkdtempSync: vi.fn(),
   writeFileSync: vi.fn()
}))
vi.mock('@actions/exec', () => ({
   getExecOutput: vi.fn()
}))

const os = await import('os')
const fs = await import('node:fs')
const exec = await import('@actions/exec')
const utils = await import('./utils.js')

describe('Get executable extension', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns .exe when os is Windows', () => {
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      expect(utils.getExecutableExtension()).toBe('.exe')
      expect(os.type).toHaveBeenCalled()
   })

   test('returns empty string for non-windows OS', () => {
      vi.mocked(os.type).mockReturnValue('Darwin')
      expect(utils.getExecutableExtension()).toBe('')
      expect(os.type).toHaveBeenCalled()

      vi.mocked(os.type).mockReturnValue('Other')
      expect(utils.getExecutableExtension()).toBe('')
      expect(os.type).toHaveBeenCalled()
   })
})

describe('isHelmChart', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns true when directory contains Chart.yaml', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(true)

      expect(utils.isHelmChart('charts/myapp')).toBe(true)
      expect(fs.statSync).toHaveBeenCalledWith('charts/myapp')
      expect(fs.existsSync).toHaveBeenCalledWith('charts/myapp/Chart.yaml')
   })

   test('returns false when directory does not contain Chart.yaml', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(utils.isHelmChart('manifests/')).toBe(false)
   })

   test('returns false for a file path', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => false} as any)

      expect(utils.isHelmChart('deployment.yaml')).toBe(false)
   })

   test('returns false when path does not exist', () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
         throw new Error('ENOENT')
      })

      expect(utils.isHelmChart('missing')).toBe(false)
   })
})

describe('expandManifests', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('passes literal file paths through unchanged', () => {
      const result = utils.expandManifests(['deployment.yaml', 'service.yaml'])
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })

   test('filters out empty lines', () => {
      const result = utils.expandManifests([
         'deployment.yaml',
         '',
         ' service.yaml '
      ])
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })

   test('expands glob patterns', () => {
      vi.mocked(fs.globSync).mockReturnValue([
         'deployment.yaml',
         'service.yaml'
      ] as any)

      const result = utils.expandManifests(['kubernetes/*.yaml'])
      expect(fs.globSync).toHaveBeenCalledWith('kubernetes/*.yaml')
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })

   test('expands regular directory into manifest files inside it', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(false) // not a Helm chart
      vi.mocked(fs.globSync).mockReturnValue([
         'deployment.yaml',
         'service.yaml'
      ] as any)

      const result = utils.expandManifests(['kubernetes/'])
      expect(fs.statSync).toHaveBeenCalledWith('kubernetes/')
      expect(fs.existsSync).toHaveBeenCalledWith('kubernetes/Chart.yaml')
      expect(fs.globSync).toHaveBeenCalledWith('**/*.{yaml,yml,json}', {
         cwd: 'kubernetes/'
      })
      expect(result).toEqual([
         'kubernetes/deployment.yaml',
         'kubernetes/service.yaml'
      ])
   })

   test('returns Helm chart directory as-is without expanding its contents', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(true) // Chart.yaml exists

      const result = utils.expandManifests(['charts/myapp'])
      expect(result).toEqual(['charts/myapp'])
      expect(fs.globSync).not.toHaveBeenCalled() // skipped for chart dirs
   })

   test('keeps non-existent literal paths as-is', () => {
      vi.mocked(fs.statSync).mockImplementation(() => {
         throw new Error('ENOENT')
      })

      const result = utils.expandManifests(['missing.yaml'])
      expect(result).toEqual(['missing.yaml'])
   })

   test('deduplicates overlapping glob results', () => {
      vi.mocked(fs.globSync).mockReturnValue([
         'deployment.yaml',
         'service.yaml'
      ] as any)

      const result = utils.expandManifests(['*.yaml', '*.yaml'])
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })
})

describe('renderHelmChart', () => {
   beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(os.tmpdir).mockReturnValue('/tmp')
      vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/k8s-lint-helm-abc')
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})
   })

   test('renders chart with helm template and returns path to temp file', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n',
         stderr: '',
         exitCode: 0
      })

      const result = await utils.renderHelmChart('charts/myapp')

      expect(exec.getExecOutput).toHaveBeenCalledWith(
         'helm',
         ['template', 'myapp', 'charts/myapp'],
         {silent: true}
      )
      expect(fs.mkdtempSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalledWith(
         '/tmp/k8s-lint-helm-abc/rendered.yaml',
         'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n'
      )
      expect(result).toBe('/tmp/k8s-lint-helm-abc/rendered.yaml')
   })

   test('passes --namespace when provided', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: '',
         stderr: '',
         exitCode: 0
      })

      await utils.renderHelmChart('charts/myapp', 'production')
      expect(exec.getExecOutput).toHaveBeenCalledWith(
         'helm',
         ['template', 'myapp', 'charts/myapp', '--namespace', 'production'],
         {silent: true}
      )
   })

   test('throws on helm template failure', async () => {
      vi.mocked(exec.getExecOutput).mockResolvedValue({
         stdout: '',
         stderr: 'Error: chart requires kubeVersion',
         exitCode: 1
      })

      await expect(utils.renderHelmChart('charts/myapp')).rejects.toThrow(
         'helm template failed for charts/myapp'
      )
   })
})
