// Imports
const core = require("@actions/core");
const shell = require("shelljs");

// Exports
module.exports = {
  makeId,
  exec,
  getInputAsArray,
  getCondaInstallationPath,
  getCondaActivationScriptPath,
};

/**
 * Get the conda installation path used by the action.
 *
 * Users can override the default installation prefix by providing the
 * ``conda-installation-path`` input.
 *
 * @param {string} [customPath] - Optional path override.
 * @returns {string} The resolved conda installation path.
 */
function getCondaInstallationPath(customPath) {
  const inputPath = customPath ?? core.getInput("conda-installation-path");
  if (typeof inputPath === "string" && inputPath.trim() !== "") {
    return inputPath.trim();
  }
  return "~/.conda";
}

/**
 * Get the activation script for the selected conda installation.
 *
 * @param {string} [customPath] - Optional path override.
 * @returns {string} The path to ``conda.sh``.
 */
function getCondaActivationScriptPath(customPath) {
  return `${getCondaInstallationPath(customPath)}/etc/profile.d/conda.sh`;
}

/**
 * Generate a random hash.
 *
 * See https://stackoverflow.com/a/1349426
 *
 * and
 *
 * https://github.com/actions/cache/issues/432#issuecomment-740376179
 */
function makeId(length) {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Simple wrapper to execute a bash command, optionally in a log file group.
 *
 */
function exec_wrapper(cmd, group) {
  if (typeof group !== "undefined") {
    core.startGroup(group);
  }
  const result = shell.exec(cmd, { shell: "/bin/bash" });
  if (result.code != 0) {
    shell.echo(`Error: ${cmd}`);
    shell.exit(1);
  }
  if (typeof group !== "undefined") {
    core.endGroup();
  }
  return result;
}

/**
 * Ensure conda is setup for the shell and execute a command.
 *
 */
function exec(cmd, group) {
  const condaActivationScriptPath = getCondaActivationScriptPath();
  if (shell.test("-f", condaActivationScriptPath)) {
    return exec_wrapper(`. ${condaActivationScriptPath} && conda activate base && ${cmd}`, group);
  } else {
    return exec_wrapper(cmd, group);
  }
}

/**
 * Get a YAML input as an array.
 *
 */
function getInputAsArray(name) {
  return core
    .getInput(name)
    .split("\n")
    .map((s) => s.trim())
    .filter((x) => x !== "");
}
