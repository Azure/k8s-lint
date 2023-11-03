import core from '@actions/core';

import * as run from '../src/run.js';
import * as kubeconform from '../src/kubeconform/index.js';
import * as kubectl from '../src/kubectl/index.js';

describe('run', () => {
  test('runs kubectl dry run based on input', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((input) => {
      if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
      if (input == 'lint-type') return 'dry-run';
      if (input == 'namespace') return 'sample-namespace';
      throw 'Unexpected input';
    });
    jest.spyOn(kubectl, 'kubectlLint').mockImplementation();

    expect(await run.run()).toBeUndefined();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(kubectl.kubectlLint).toHaveBeenCalledWith(
      ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
      'sample-namespace'
    );
  });

  test('uses default namespace if input not given', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((input) => {
      if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
      if (input == 'lint-type') return 'dry-run';
      if (input == 'namespace') return '';
      throw 'Unexpected input';
    });
    jest.spyOn(kubectl, 'kubectlLint').mockImplementation();

    expect(await run.run()).toBeUndefined();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(kubectl.kubectlLint).toHaveBeenCalledWith(['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'], 'default');
  });

  test('runs kubeconform on manifests based on input', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((input) => {
      if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
      if (input == 'lint-type') return 'kubeconform';
      if (input == 'kubeconform-options') return '-summary';
      throw 'Unexpected input';
    });
    jest.spyOn(kubeconform, 'kubeconformLint').mockImplementation();

    expect(await run.run()).toBeUndefined();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
      ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
      '-summary'
    );
  });

  test('uses -summary option if input not given', async () => {
    jest.spyOn(core, 'getInput').mockImplementation((input) => {
      if (input == 'manifests') return 'manifest1.yaml\nmanifest2.yaml\nmanifest3.yaml';
      if (input == 'lint-type') return 'kubeconform';
      if (input == 'kubeconform-options') return '';
      throw 'Unexpected input';
    });
    jest.spyOn(kubeconform, 'kubeconformLint').mockImplementation();

    expect(await run.run()).toBeUndefined();
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(kubeconform.kubeconformLint).toHaveBeenCalledWith(
      ['manifest1.yaml', 'manifest2.yaml', 'manifest3.yaml'],
      '-summary'
    );
  });
});
