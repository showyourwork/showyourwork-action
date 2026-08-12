const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getCondaInstallationPath,
  getCondaActivationScriptPath,
  getCondaPythonVersionSpec,
  getMinicondaInstallerUrl,
} = require('../src/utils');

test('uses the default conda prefix when no override is provided', () => {
  assert.equal(getCondaInstallationPath(), '~/.conda');
  assert.equal(getCondaActivationScriptPath(), '~/.conda/etc/profile.d/conda.sh');
});

test('uses a custom conda installation path when provided', () => {
  assert.equal(getCondaInstallationPath('/opt/conda'), '/opt/conda');
  assert.equal(getCondaActivationScriptPath('/opt/conda'), '/opt/conda/etc/profile.d/conda.sh');
});

test('pins the conda environment to a supported Python range', () => {
  assert.equal(getCondaPythonVersionSpec(), 'python>=3.11,<3.14');
});

test('uses the arm64 Miniconda installer on arm64 runners', () => {
  assert.match(getMinicondaInstallerUrl('arm64'), /aarch64/);
  assert.match(getMinicondaInstallerUrl('aarch64'), /aarch64/);
});

test('uses the x86_64 Miniconda installer on x86_64 runners', () => {
  assert.match(getMinicondaInstallerUrl('x86_64'), /x86_64/);
  assert.match(getMinicondaInstallerUrl('amd64'), /x86_64/);
});

