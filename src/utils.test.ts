import {describe, expect, test, vi} from 'vitest'
import * as os from 'os'

const osMockState = vi.hoisted(() => ({
   type: 'Linux'
}))

vi.mock('os', async () => {
   const actual = await vi.importActual<typeof import('os')>('os')
   return {
      ...actual,
      type: vi.fn(() => osMockState.type)
   }
})

import * as utils from '../src/utils'

describe('Get executable extension', () => {
   test('returns .exe when os is Windows', () => {
      osMockState.type = 'Windows_NT'
      expect(utils.getExecutableExtension()).toBe('.exe')
      expect(os.type).toHaveBeenCalled()
   })

   test('returns empty string for non-windows OS', () => {
      osMockState.type = 'Darwin'
      expect(utils.getExecutableExtension()).toBe('')
      expect(os.type).toHaveBeenCalled()

      osMockState.type = 'Other'
      expect(utils.getExecutableExtension()).toBe('')
      expect(os.type).toHaveBeenCalled()
   })
})
