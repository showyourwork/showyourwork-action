// Imports
const core = require("@actions/core");
const shell = require("shelljs");
const artifact = require("@actions/artifact");

// Exports
module.exports = { publishOutput };


/**
 * Publish the article output.
 *
 */
async function publishOutput() {

  // Infer the manuscript name
  const GITHUB_WORKSPACE = shell.env["GITHUB_WORKSPACE"];
  const config = require(`${GITHUB_WORKSPACE}/.showyourwork/config.json`);
  const output = [config["ms_pdf"]];

  // Include the arxiv tarball?
  if (core.getInput("build-tarball") == "true") {
    output.push("arxiv.tar.gz");
  }

  // Upload an artifact
  const artifactClient = artifact.create();
  const uploadResponse = await artifactClient.uploadArtifact(
    "showyourwork-output", 
    output, 
    ".",
    {
      continueOnError: false
    }
  );

  // Force-push output to a separate branch
  core.startGroup("Uploading output");
  const GITHUB_SLUG = shell.env["GITHUB_REPOSITORY"];
  const GITHUB_REF = shell.env["GITHUB_REF"];
  const GITHUB_EVENT_NAME = shell.env["GITHUB_EVENT_NAME"];
  const GITHUB_TOKEN = core.getInput("github-token");
  const OUTPUT_BRANCH_SUFFIX = core.getInput("output-branch-suffix");
  const GITHUB_PR_NUMBER = shell.env["PULL_REQUEST_NUMBER"];
  const GITHUB_BRANCH = GITHUB_REF.split("/")[2];
  const TARGET_DIRECTORY = shell
    .exec("mktemp -d")
    .replace(/(\r\n|\n|\r)/gm, "");
  const TARGET_BRANCH = 
    (GITHUB_EVENT_NAME == 'pull_request_target') ? 
    `pull-request-${GITHUB_PR_NUMBER}-${OUTPUT_BRANCH_SUFFIX}` : 
    `${GITHUB_BRANCH}-${OUTPUT_BRANCH_SUFFIX}`;
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
