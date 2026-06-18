import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('os')
vi.mock('node:fs', async (importOriginal) => ({
   ...(await importOriginal<typeof import('node:fs')>()),
   globSync: vi.fn(),
   statSync: vi.fn()
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

describe('expandManifests', () => {
   beforeEach(() => {
      vi.clearAllMocks()
   })

   test('passes literal file paths through unchanged', () => {
      const result = utils.expandManifests([
         'deployment.yaml',
         'service.yaml'
      ])
      expect(result).toEqual(['deployment.yaml', 'service.yaml'])
   })

   test('filters out empty lines', () => {
      const result = utils.expandManifests(['deployment.yaml', '', ' service.yaml '])
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

   test('expands directory into manifest files inside it', () => {
      vi.mocked(fs.statSync).mockReturnValue({isDirectory: () => true} as any)
      vi.mocked(fs.globSync).mockReturnValue([
         'deployment.yaml',
         'service.yaml'
      ] as any)

      const result = utils.expandManifests(['kubernetes/'])
      expect(fs.statSync).toHaveBeenCalledWith('kubernetes/')
      expect(fs.globSync).toHaveBeenCalledWith('**/*.{yaml,yml,json}', {
         cwd: 'kubernetes/'
      })
      expect(result).toEqual([
         'kubernetes/deployment.yaml',
         'kubernetes/service.yaml'
      ])
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
