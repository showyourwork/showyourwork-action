// Imports
const github = require("@actions/github");
const core = require("@actions/core");
const shell = require("shelljs");

// Exports
module.exports = { makeId, exec, getInputAsArray };

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
  if (shell.test("-f", "~/.conda/etc/profile.d/conda.sh")) {
    return exec_wrapper(`. ~/.conda/etc/profile.d/conda.sh && ${cmd}`, group);
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

/**
 * Create the `safe to test` issue label.
 *
 */
async function createSafeToTestLabel() {
  const labels = await github.rest.issues
    .listLabelsForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
    .then((res) => res.data);
  if (!labels.some((e) => e.name == "safe to test")) {
    await github.rest.issues.createLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: "safe to test",
      color: "0e8a16",
      description: "PR can be tested with `pull_request_target`",
    });
  }
}
