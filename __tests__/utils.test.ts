import * as utils from '../src/utils';
import * as os from 'os';

describe('Testing all functions in utils file.', () => {
    test('getExecutableExtension() - return .exe when os is Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(utils.getExecutableExtension()).toBe('.exe');
        expect(os.type).toBeCalled();         
    });

    test('getExecutableExtension() - return empty string for non-windows OS', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');

        expect(utils.getExecutableExtension()).toBe('');         
        expect(os.type).toBeCalled();         
    });
}) 