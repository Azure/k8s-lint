import os from 'node:os';

export function getExecutableExtension(): string {
  if (os.type().match(/^Win/)) {
    return '.exe';
  }

  return '';
}
