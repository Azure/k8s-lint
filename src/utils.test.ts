import {describe, expect, test, vi, beforeEach} from 'vitest'

vi.mock('os')

const os = await import('os')
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
