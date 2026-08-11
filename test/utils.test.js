const test = require('node:test');
const assert = require('node:assert/strict');
const { getCondaInstallationPath, getCondaActivationScriptPath } = require('../src/utils');

test('uses the default conda prefix when no override is provided', () => {
  assert.equal(getCondaInstallationPath(), '~/.conda');
  assert.equal(getCondaActivationScriptPath(), '~/.conda/etc/profile.d/conda.sh');
});

test('uses a custom conda installation path when provided', () => {
  assert.equal(getCondaInstallationPath('/opt/conda'), '/opt/conda');
  assert.equal(getCondaActivationScriptPath('/opt/conda'), '/opt/conda/etc/profile.d/conda.sh');
});
