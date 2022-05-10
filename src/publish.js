// Imports
const core = require("@actions/core");
const shell = require("shelljs");

// Exports
module.exports = { publishOutput };

// Get repo info
var GITHUB_SLUG;
var TARGET_BRANCH;
const EVENT_NAME = shell.env["GITHUB_EVENT_NAME"];
const GITHUB_TOKEN = core.getInput("github-token");
const GITHUB_WORKSPACE = shell.env["GITHUB_WORKSPACE"];
const GITHUB_REF = shell.env["GITHUB_REF"];
const OUTPUT_BRANCH_SUFFIX = core.getInput("output-branch-suffix");
if (EVENT_NAME == 'pull_request') {

  // This is a pull request, so we'll force-push the output
  // to `pull-request-<number>-pdf` on the author's repo
  GITHUB_SLUG = core.getInput("head-repo-slug");
  const PULL_REQUEST_NUMBER = GITHUB_REF.split("/")[2];
  TARGET_BRANCH = `pull-request-${PULL_REQUEST_NUMBER}-pdf`;

} else {

  // Not a pull request, so we'll force-push the output
  // to `<branch_name>-pdf` on the same repo
  GITHUB_SLUG = shell.env["GITHUB_REPOSITORY"];
  const GITHUB_BRANCH = GITHUB_REF.split("/")[2];
  TARGET_BRANCH = `${GITHUB_BRANCH}-${OUTPUT_BRANCH_SUFFIX}`;

}


/**
 * Publish the article output.
 *
 */
async function publishOutput() {

  // Infer the manuscript name
  const config = require(`${GITHUB_WORKSPACE}/.showyourwork/config.json`);
  const output = [config["ms_pdf"]];

  // Upload the arxiv tarball?
  if (core.getInput("build-tarball") == "true") {
    output.push("arxiv.tar.gz");
  }

  // Force-push output to a separate branch
  core.startGroup("Uploading output");
  const TARGET_DIRECTORY = shell
    .exec("mktemp -d")
    .replace(/(\r\n|\n|\r)/gm, "");
  shell.cp("-R", ".", `${TARGET_DIRECTORY}`);
  shell.cd(`${TARGET_DIRECTORY}`);
  shell.exec(`git checkout --orphan ${TARGET_BRANCH}`);
  shell.exec("git rm --cached -rf .", {silent: true});
  for (const out of output) {
    shell.exec(`git add -f ${out}`);
  }
  shell.exec(
    "git -c user.name='showyourwork' -c user.email='showyourwork' " +
      "commit -m 'force-push article output'"
  );
  shell.exec(
    "git push --force " +
      `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_SLUG} ` +
      `${TARGET_BRANCH}`
  );
  shell.cd(GITHUB_WORKSPACE);
  core.endGroup();

  // Set an action output containing the link to the PDF
  core.setOutput("pdf-url", `https://github.com/${GITHUB_SLUG}/raw/${TARGET_BRANCH}/${config["ms_pdf"]}`);
}
