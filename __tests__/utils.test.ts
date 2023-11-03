import os from 'node:os';

import * as utils from '../src/utils.js';

describe('Get executable extension', () => {
  test('returns .exe when os is Windows', () => {
    jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
    expect(utils.getExecutableExtension()).toBe('.exe');
    expect(os.type).toHaveBeenCalled();
  });

  test('returns empty string for non-windows OS', () => {
    jest.spyOn(os, 'type').mockReturnValue('Darwin');
    expect(utils.getExecutableExtension()).toBe('');
    expect(os.type).toHaveBeenCalled();

    jest.spyOn(os, 'type').mockReturnValue('Other');
    expect(utils.getExecutableExtension()).toBe('');
    expect(os.type).toHaveBeenCalled();
  });
});
