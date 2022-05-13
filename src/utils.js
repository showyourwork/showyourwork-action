// Imports
const github = require("@actions/github");
const core = require("@actions/core");
const shell = require("shelljs");

// Exports
module.exports = {
  makeId,
  exec,
  getInputAsArray,
  createSafeToTestLabel,
  createPullRequestInstructionsComment,
  removeSafeToTestLabel,
  createPullRequestPDFComment,
};

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
  const context = github.context;
  const token = core.getInput("github-token");
  const octokit = github.getOctokit(token);
  const labels = await octokit.rest.issues
    .listLabelsForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
    .then((res) => res.data);
  if (!labels.some((e) => e.name == "safe to test")) {
    await octokit.rest.issues.createLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: "safe to test",
      color: "0e8a16",
      description: "PR can be tested with `pull_request_target`",
    });
  }
}

/**
 * Add a comment to the PR with instructions for the maintainers
 *
 */
async function createPullRequestInstructionsComment() {
  const context = github.context;
  const token = core.getInput("github-token");
  const octokit = github.getOctokit(token);
  const prNumber = github.context.payload.pull_request.number;
  const message =
    "Thank you for submitting a pull request to **" +
    context.repo.repo +
    "**. " +
    "For safety reasons, this pull request will only be built on GitHub " +
    "Actions after review by one of the repository maintainers.\n\n" +
    "**Maintainers:** please check this pull request for potential security " +
    "hazards. Note that pull requests to this repository that are built on " +
    "GitHub Actions are granted access to all repository secrets, including " +
    "the ``GITHUB_TOKEN``, which enables write access to this repository. " +
    "You can read more about potential exploits " +
    "[here](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/). " +
    "If the pull request is deemed safe, you can trigger a build by adding " +
    "the ``safe to test`` label. If the build completes successfully, a link " +
    "to the article PDF will be posted below. Note that if the pull request " +
    "is updated with new commits, maintainers must manually re-add the " +
    "``safe to test`` label each time they wish for it to be re-built.";
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    body: message,
  });
}

/**
 * Create the `safe to test` issue label.
 *
 */
async function removeSafeToTestLabel() {
  const context = github.context;
  const token = core.getInput("github-token");
  const octokit = github.getOctokit(token);
  const prNumber = context.payload.pull_request.number;
  await octokit.rest.issues.removeLabel({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    name: "safe to test",
  });
}

/**
 * Post a link to the compiled PDF in the PR comments.
 *
 */
async function createPullRequestPDFComment(output_info) {
  const context = github.context;
  const token = core.getInput("github-token");
  const octokit = github.getOctokit(token);
  const prNumber = context.payload.pull_request.number;
  const message =
    "Here is the compiled [article PDF](" +
    output_info.pdf_url +
    ") " +
    "for the above commit. You can find additional build output on the [" +
    output_info.output_branch +
    "](" +
    output_info.output_branch_url +
    ") branch.";

  // Search for an existing comment
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });
  comments.reverse();
  const comment = comments.find(
    (comment) =>
      comment.user.login == "github-actions[bot]" &&
      comment.body.includes("Here is the compiled [article PDF]")
  );

  // Post the comment
  if (comment) {
    await octokit.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: comment.id,
      body: message,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: message,
    });
  }
}
