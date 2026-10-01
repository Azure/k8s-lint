import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('os')
vi.mock('node:fs', async (importOriginal) => ({
   ...(await importOriginal<typeof import('node:fs')>()),
   globSync: vi.fn(),
   statSync: vi.fn(),
   existsSync: vi.fn()
}))

const os = await import('os')
const fs = await import('node:fs')
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

describe('getPlatform', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns windows for Windows_NT', () => {
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      expect(utils.getPlatform()).toBe('windows')
   })

   test('returns darwin for Darwin', () => {
      vi.mocked(os.type).mockReturnValue('Darwin')
      expect(utils.getPlatform()).toBe('darwin')
   })

   test('returns linux for Linux', () => {
      vi.mocked(os.type).mockReturnValue('Linux')
      expect(utils.getPlatform()).toBe('linux')
   })

   test('defaults to linux for unknown OS', () => {
      vi.mocked(os.type).mockReturnValue('FreeBSD')
      expect(utils.getPlatform()).toBe('linux')
   })
})

describe('getArch', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns amd64 for x64', () => {
      vi.mocked(os.arch).mockReturnValue('x64')
      expect(utils.getArch()).toBe('amd64')
   })

   test('passes through arm64', () => {
      vi.mocked(os.arch).mockReturnValue('arm64')
      expect(utils.getArch()).toBe('arm64')
   })
})

describe('getArchiveExtension', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('returns zip for windows', () => {
      vi.mocked(os.type).mockReturnValue('Windows_NT')
      expect(utils.getArchiveExtension()).toBe('zip')
   })

   test('returns tar.gz for darwin', () => {
      vi.mocked(os.type).mockReturnValue('Darwin')
      expect(utils.getArchiveExtension()).toBe('tar.gz')
   })

   test('returns tar.gz for linux', () => {
      vi.mocked(os.type).mockReturnValue('Linux')
      expect(utils.getArchiveExtension()).toBe('tar.gz')
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
      // statSync throws (vi.fn() returns undefined), catch preserves each match
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })

   test('preserves unmatched glob pattern rather than dropping it silently', () => {
      vi.mocked(fs.globSync).mockReturnValue([])

      const result = utils.expandManifests(['no-match/*.yaml'])
      expect(result).toEqual(['no-match/*.yaml'])
   })

   test('expands directory matched by a glob', () => {
      vi.mocked(fs.globSync)
         .mockReturnValueOnce(['mydir/'] as any)
         .mockReturnValue(['a.yaml', 'b.yaml'] as any)
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = utils.expandManifests(['kubernetes/*'])
      expect(result).toEqual(['mydir/a.yaml', 'mydir/b.yaml'])
   })

   test('passes Helm chart directory matched by a glob through as-is', () => {
      vi.mocked(fs.globSync).mockReturnValue(['charts/myapp'] as any)
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.existsSync).mockReturnValue(true) // Chart.yaml exists

      const result = utils.expandManifests(['charts/*'])
      expect(result).toEqual(['charts/myapp'])
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
